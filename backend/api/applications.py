import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.core.auth import get_current_user, get_optional_user
from backend.models.models import (
    Job,
    Application,
    Contract,
    Milestone,
    AcceptanceCriterion,
    NegotiationTurn,
    AuditLog,
)
from backend.schemas.schemas import (
    ApplicationCreateRequest,
    ApplicationResponse,
    HumanDecisionRequest,
    ContractSchema,
    MilestoneSchema,
)
from backend.agents.client_agent import run_client_agent_turn
from backend.agents.freelancer_agent import run_freelancer_agent_turn
from backend.services.paypal_service import paypal_service, PayPalServiceError

router = APIRouter(prefix="/api", tags=["applications"])
logger = logging.getLogger("trustpay.api.applications")


async def add_audit_log(
    db: AsyncSession,
    job_id: str,
    event_type: str,
    actor: str,
    details: dict,
):
    log = AuditLog(
        job_id=job_id,
        event_type=event_type,
        actor=actor,
        details=details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)


def serialize_application(app: Application, role: str) -> dict:
    """
    Serializes an Application model, strictly enforcing privacy:
    - Never leaks application.min_price to clients or public.
    """
    data = {
        "id": app.id,
        "job_id": app.job_id,
        "freelancer_id": app.freelancer_id,
        "freelancer_name": app.freelancer_name,
        "preferred_price": app.preferred_price,
        "time_needed_days": app.time_needed_days,
        "skills": app.skills,
        "exclusions": app.exclusions,
        "notes": app.notes,
        "status": app.status,
        "client_approved": app.client_approved,
        "freelancer_approved": app.freelancer_approved,
        "counters_used": app.counters_used,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        "contract": None,
        "negotiation_turns": [],
    }

    # Only the applicant itself can see their own private min_price
    if role == "freelancer":
        data["min_price"] = app.min_price

    if app.contract:
        c = app.contract
        data["contract"] = {
            "id": c.id,
            "job_id": c.job_id,
            "application_id": c.application_id,
            "total_amount": c.total_amount,
            "currency": c.currency,
            "deadline": c.deadline,
            "status": c.status,
            "milestones": [
                {
                    "id": m.id,
                    "contract_id": m.contract_id,
                    "order_index": m.order_index,
                    "title": m.title,
                    "description": m.description,
                    "amount": m.amount,
                    "due_date": m.due_date,
                    "status": m.status,
                    "captured_amount": m.captured_amount,
                    "paypal_capture_id": m.paypal_capture_id,
                    "resubmission_count": m.resubmission_count,
                    "acceptance_criteria": [
                        {"id": ac.criterion_key, "text": ac.text, "weight": ac.weight}
                        for ac in m.acceptance_criteria
                    ],
                }
                for m in (c.milestones or [])
            ],
        }

    if app.negotiation_turns:
        data["negotiation_turns"] = [
            {
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "proposed_price": t.proposed_price,
                "price_change_reason": t.price_change_reason,
                "contract_draft": t.contract_draft,
                "agreed": t.agreed,
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            }
            for t in app.negotiation_turns
        ]

    return data


# =========================================================================
# 1. APPLY TO JOB (Freelancer)
# =========================================================================
@router.post("/jobs/{job_id}/applications", response_model=dict, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: str,
    req: ApplicationCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits an application brief for an open job.
    Requires role == 'freelancer'.
    Creates Application in 'negotiating' status.
    """
    if current_user["role"] != "freelancer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can apply to jobs.",
        )

    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.status not in ("open", "negotiating"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot apply: job is in '{job.status}' status (must be 'open').",
        )

    app = Application(
        job_id=job.id,
        freelancer_id=current_user["user_id"],
        freelancer_name=req.freelancer_name or current_user["user_id"],
        min_price=req.min_price,
        preferred_price=req.preferred_price,
        time_needed_days=req.time_needed_days,
        skills=req.skills,
        exclusions=req.exclusions,
        notes=req.notes,
        freelancer_brief={
            "min_price": req.min_price,
            "preferred_price": req.preferred_price,
            "time_needed_days": req.time_needed_days,
            "skills": req.skills,
            "exclusions": req.exclusions,
            "notes": req.notes,
        },
        status="negotiating",
    )
    db.add(app)
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "APPLICATION_SUBMITTED",
        "freelancer",
        {
            "application_id": app.id,
            "freelancer_id": app.freelancer_id,
            "time_needed_days": app.time_needed_days,
        },
    )
    await db.commit()

    return {
        "id": app.id,
        "job_id": job.id,
        "status": app.status,
        "message": "Application submitted. Autonomous agents ready to negotiate.",
    }


# =========================================================================
# 2. LIST APPLICATIONS FOR JOB (Client Owner Only)
# =========================================================================
@router.get("/jobs/{job_id}/applications", response_model=List[dict])
async def list_job_applications(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all applications submitted for a job.
    Ownership check: Only the job's client owner can view this list.
    """
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.applications).selectinload(Application.contract).selectinload(Contract.milestones),
            selectinload(Job.applications).selectinload(Application.negotiation_turns),
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if current_user["role"] != "client" or current_user["user_id"] != job.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-client access denied: Only the client owner can view applications.",
        )

    return [serialize_application(a, role=current_user["role"]) for a in job.applications]


# =========================================================================
# 3. GET SINGLE APPLICATION (Client Owner or Applicant Freelancer)
# =========================================================================
@router.get("/applications/{app_id}", response_model=dict)
async def get_application(
    app_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves an application thread, dialogue history, and contract draft.
    Ownership check: Only the applicant freelancer or the job's client can access.
    """
    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(
            selectinload(Application.job),
            selectinload(Application.contract).selectinload(Contract.milestones).selectinload(Milestone.acceptance_criteria),
            selectinload(Application.negotiation_turns),
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    is_owner_client = current_user["role"] == "client" and current_user["user_id"] == app.job.client_id
    is_applicant = current_user["role"] == "freelancer" and current_user["user_id"] == app.freelancer_id

    if not is_owner_client and not is_applicant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view this application thread.",
        )

    return serialize_application(app, role=current_user["role"])


# =========================================================================
# 4. NEGOTIATE APPLICATION (Agents)
# =========================================================================
@router.post("/applications/{app_id}/negotiate", response_model=dict)
async def step_application_negotiation(
    app_id: str,
    run_all: bool = False,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Steps agent negotiation for this application.
    Enforces state machine: Rejects if status is closed, no_deal, or funded.
    Enforces overlap check: If min_price > max_budget -> status = 'no_deal'.
    Enforces round 6 timeout: If round 6 ends without agreement -> status = 'no_deal'.
    """
    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(
            selectinload(Application.job),
            selectinload(Application.contract).selectinload(Contract.milestones),
            selectinload(Application.negotiation_turns),
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    is_owner_client = current_user["role"] == "client" and current_user["user_id"] == app.job.client_id
    is_applicant = current_user["role"] == "freelancer" and current_user["user_id"] == app.freelancer_id
    if not is_owner_client and not is_applicant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # State Machine check
    if app.status in ("closed", "no_deal", "funded", "approved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot negotiate: application is already in '{app.status}' state.",
        )

    job = app.job

    # 1. Immediate Overlap Check
    if app.min_price > job.max_budget:
        app.status = "no_deal"
        turn = NegotiationTurn(
            job_id=job.id,
            application_id=app.id,
            round_number=len(app.negotiation_turns) + 1,
            agent_role="client",
            message="Negotiation concluded with No Deal: The freelancer's minimum required compensation exceeds the client's allocated budget ceiling.",
            proposal_summary="No overlap between client budget ceiling and freelancer minimum price.",
            agreed=False,
        )
        db.add(turn)
        await db.commit()
        return {
            "application_id": app.id,
            "status": "no_deal",
            "message": "No deal: ranges do not overlap.",
            "turns_count": len(app.negotiation_turns) + 1,
        }

    async def execute_one_turn():
        nonlocal app
        turns_count = len(app.negotiation_turns)
        next_round = (turns_count // 2) + 1
        current_role = "client" if turns_count % 2 == 0 else "freelancer"

        # Round 6 timeout check: if starting beyond round 6 without agreement
        if next_round > 6:
            app.status = "no_deal"
            turn = NegotiationTurn(
                job_id=job.id,
                application_id=app.id,
                round_number=next_round,
                agent_role=current_role,
                message="Negotiation concluded with No Deal: Reached the maximum limit of 6 rounds without mutual agreement on scope and milestone pricing.",
                proposal_summary="Negotiation timed out after 6 rounds.",
                agreed=False,
            )
            db.add(turn)
            await db.commit()
            return True  # Done

        history = [
            {
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposed_price": t.proposed_price,
                "proposal_summary": t.proposal_summary,
                "price_change_reason": t.price_change_reason,
                "agreed": t.agreed,
            }
            for t in app.negotiation_turns
        ]

        if current_role == "client":
            output = await run_client_agent_turn(
                job_title=job.title,
                job_description=job.description,
                max_budget=job.max_budget,
                deadline=job.deadline,
                round_number=next_round,
                history=history,
                priorities=job.priorities,
                must_haves=job.must_haves,
            )
        else:
            output = await run_freelancer_agent_turn(
                job_title=job.title,
                job_description=job.description,
                min_price=app.min_price,
                preferred_price=app.preferred_price,
                deadline=job.deadline,
                round_number=next_round,
                history=history,
                skills=app.skills,
                exclusions=app.exclusions,
                notes=app.notes,
            )

        turn = NegotiationTurn(
            job_id=job.id,
            application_id=app.id,
            round_number=next_round,
            agent_role=current_role,
            message=output.message,
            proposal_summary=output.proposal_summary,
            proposed_price=output.proposed_price,
            price_change_reason=output.price_change_reason,
            contract_draft=output.contract.model_dump() if output.contract else None,
            agreed=output.agreed,
        )
        db.add(turn)
        app.negotiation_turns.append(turn)

        # Consensus reached or round 6 conclusion
        if output.agreed and next_round >= 3:
            app.status = "awaiting_approval"

            # Create or update Application Contract
            if not app.contract:
                contract = Contract(
                    job_id=job.id,
                    application_id=app.id,
                    total_amount=output.contract.total_amount,
                    currency=output.contract.currency,
                    deadline=output.contract.deadline,
                    status="draft",
                )
                db.add(contract)
                await db.flush()
                app.contract = contract
            else:
                app.contract.total_amount = output.contract.total_amount
                app.contract.deadline = output.contract.deadline
                # Clear existing milestones
                for m in list(app.contract.milestones):
                    await db.delete(m)
                await db.flush()

            # Attach milestones
            for idx, ms in enumerate(output.contract.milestones):
                milestone = Milestone(
                    contract_id=app.contract.id,
                    order_index=idx,
                    title=ms.title,
                    description=ms.description,
                    amount=ms.amount,
                    due_date=ms.due_date,
                    status="pending",
                )
                db.add(milestone)
                await db.flush()
                for c_item in ms.acceptance_criteria:
                    crit = AcceptanceCriterion(
                        milestone_id=milestone.id,
                        criterion_key=c_item.id,
                        text=c_item.text,
                        weight=c_item.weight,
                    )
                    db.add(crit)

            await add_audit_log(
                db,
                job.id,
                "CONTRACT_CONSENSUS_REACHED",
                "agents",
                {
                    "application_id": app.id,
                    "total_amount": output.contract.total_amount,
                    "rounds": next_round,
                },
            )
            await db.commit()
            return True

        # Check if this was round 6 and turn was freelancer (end of round 6) with no agreement
        if next_round == 6 and current_role == "freelancer" and not output.agreed:
            app.status = "no_deal"
            await db.commit()
            return True

        await db.commit()
        return False

    if run_all:
        for _ in range(12):  # up to 6 rounds = 12 turns
            done = await execute_one_turn()
            if done:
                break
    else:
        await execute_one_turn()

    return {
        "application_id": app.id,
        "status": app.status,
        "turns_count": len(app.negotiation_turns),
    }


# =========================================================================
# 5. HUMAN DECISION: ACCEPT / REJECT / COUNTER (Max 2 Counters)
# =========================================================================
@router.post("/applications/{app_id}/decide", response_model=dict)
async def human_decision(
    app_id: str,
    req: HumanDecisionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Handles human decision on draft contract:
    - accept: client or freelancer accepts. Both accept -> status = 'approved'.
    - reject: sets status = 'closed'.
    - counter: increments counters_used (max 2). Re-runs 1 agent round to revise terms.
    """
    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(
            selectinload(Application.job),
            selectinload(Application.contract).selectinload(Contract.milestones),
            selectinload(Application.negotiation_turns),
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    is_owner_client = current_user["role"] == "client" and current_user["user_id"] == app.job.client_id
    is_applicant = current_user["role"] == "freelancer" and current_user["user_id"] == app.freelancer_id
    if not is_owner_client and not is_applicant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # State Machine: must be in awaiting_approval
    if app.status != "awaiting_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot make decision: application is in '{app.status}' state (must be 'awaiting_approval').",
        )

    job = app.job

    if req.action == "reject":
        app.status = "closed"
        await add_audit_log(
            db,
            job.id,
            "APPLICATION_REJECTED_BY_HUMAN",
            current_user["role"],
            {"application_id": app.id, "user_id": current_user["user_id"]},
        )
        await db.commit()
        return {"application_id": app.id, "status": "closed", "message": "Application rejected and closed."}

    elif req.action == "accept":
        if current_user["role"] == "client":
            app.client_approved = True
        else:
            app.freelancer_approved = True

        if app.client_approved and app.freelancer_approved:
            app.status = "approved"
            if app.contract:
                app.contract.status = "agreed"
            await add_audit_log(
                db,
                job.id,
                "CONTRACT_APPROVED_BY_BOTH",
                "system",
                {"application_id": app.id, "total_amount": app.contract.total_amount if app.contract else 0},
            )

        await db.commit()
        return {
            "application_id": app.id,
            "status": app.status,
            "client_approved": app.client_approved,
            "freelancer_approved": app.freelancer_approved,
            "message": "Approval recorded." + (" Both parties agreed!" if app.status == "approved" else ""),
        }

    elif req.action == "counter":
        if app.counters_used >= 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum of 2 counter-offers per application exceeded.",
            )

        app.counters_used += 1
        app.client_approved = False
        app.freelancer_approved = False
        feedback_msg = req.message or "Please revise price and milestone distribution."

        # Dispatch 1 extra agent round to produce revised draft
        history = [
            {
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposed_price": t.proposed_price,
                "proposal_summary": t.proposal_summary,
                "price_change_reason": t.price_change_reason,
                "agreed": t.agreed,
            }
            for t in app.negotiation_turns
        ]

        next_round = (len(app.negotiation_turns) // 2) + 1
        opposing_role = "freelancer" if current_user["role"] == "client" else "client"

        if opposing_role == "freelancer":
            output = await run_freelancer_agent_turn(
                job_title=job.title,
                job_description=job.description,
                min_price=app.min_price,
                preferred_price=app.preferred_price,
                deadline=job.deadline,
                round_number=next_round,
                history=history,
                skills=app.skills,
                exclusions=app.exclusions,
                notes=app.notes,
                human_counter_message=feedback_msg,
            )
        else:
            output = await run_client_agent_turn(
                job_title=job.title,
                job_description=job.description,
                max_budget=job.max_budget,
                deadline=job.deadline,
                round_number=next_round,
                history=history,
                priorities=job.priorities,
                must_haves=job.must_haves,
                human_counter_message=feedback_msg,
            )

        proposed_contract_price = output.proposed_price if output.contract else (app.contract.total_amount if app.contract else 0)
        cannot_be_met = (proposed_contract_price < app.min_price) or (proposed_contract_price > job.max_budget)

        if cannot_be_met:
            turn_msg = "I evaluated your counter-offer; however, we cannot modify the financial scope further due to baseline project constraints. The terms remain as previously proposed."
            proposed_price = app.contract.total_amount if app.contract else app.min_price
            price_reason = "Counter request falls outside technical and budget constraints; baseline terms retained."
            contract_draft = app.contract.model_dump() if hasattr(app.contract, "model_dump") else None
        else:
            turn_msg = output.message
            proposed_price = output.proposed_price
            price_reason = output.price_change_reason
            contract_draft = output.contract.model_dump() if output.contract else None

            # Update contract draft with revised terms only if can be met
            if app.contract and output.contract:
                app.contract.total_amount = output.contract.total_amount
                for m in list(app.contract.milestones):
                    await db.delete(m)
                await db.flush()

                for idx, ms in enumerate(output.contract.milestones):
                    milestone = Milestone(
                        contract_id=app.contract.id,
                        order_index=idx,
                        title=ms.title,
                        description=ms.description,
                        amount=ms.amount,
                        due_date=ms.due_date,
                        status="pending",
                    )
                    db.add(milestone)
                    await db.flush()
                    for c_item in ms.acceptance_criteria:
                        crit = AcceptanceCriterion(
                            milestone_id=milestone.id,
                            criterion_key=c_item.id,
                            text=c_item.text,
                            weight=c_item.weight,
                        )
                        db.add(crit)

        turn = NegotiationTurn(
            job_id=job.id,
            application_id=app.id,
            round_number=next_round,
            agent_role=opposing_role,
            message=turn_msg,
            proposal_summary="Evaluated counter-offer." if cannot_be_met else output.proposal_summary,
            proposed_price=proposed_price,
            price_change_reason=price_reason,
            contract_draft=contract_draft,
            agreed=False,
        )
        db.add(turn)

        await add_audit_log(
            db,
            job.id,
            "HUMAN_COUNTER_SUBMITTED",
            current_user["role"],
            {
                "application_id": app.id,
                "counters_used": app.counters_used,
                "message": feedback_msg,
            },
        )
        await db.commit()
        return {
            "application_id": app.id,
            "status": app.status,
            "counters_used": app.counters_used,
            "message": f"Counter submitted ({app.counters_used}/2). Revised draft contract ready for review.",
        }


# =========================================================================
# 6. TWO-STAGE FUNDING: CLAIM (Create Order) & CONFIRM (Authorize)
# =========================================================================
@router.post("/applications/{app_id}/claim-fund", response_model=dict)
async def claim_fund_application(
    app_id: str,
    payment_source: str = "paypal_wallet",
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 1: Atomic job claim and PayPal Order creation.
    - Requires role == 'client' and ownership (current_user['user_id'] == job.client_id).
    - Requires application.status == 'approved' with both client_approved and freelancer_approved.
    - Atomic conditional UPDATE: 'open' -> 'funding'. If rowcount != 1, raises 409 Conflict.
    - Sourced strictly from application.contract.total_amount.
    """
    if current_user["role"] != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can fund escrow contracts.",
        )

    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(
            selectinload(Application.job),
            selectinload(Application.contract).selectinload(Contract.milestones),
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = app.job
    if current_user["user_id"] != job.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-client access denied: Only the job creator can fund escrow.",
        )

    if app.status != "approved" or not app.client_approved or not app.freelancer_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot fund: Application must be approved by both client and freelancer first.",
        )

    if not app.contract:
        raise HTTPException(status_code=400, detail="No approved contract found for this application.")

    # Atomic conditional claim: transition job status from 'open' -> 'funding'
    claim_stmt = (
        update(Job)
        .where(Job.id == job.id, Job.status == "open")
        .values(status="funding")
    )
    claim_res = await db.execute(claim_stmt)
    if claim_res.rowcount != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job is already being funded by another process or is no longer open.",
        )

    contract_amount = app.contract.total_amount

    # Create PayPal Order with intent AUTHORIZE
    try:
        order = await paypal_service.create_order_authorize(
            amount=contract_amount,
            currency=app.contract.currency,
            custom_id=f"job_{job.id}_app_{app.id}",
        )
        order_id = order.get("id") or order.get("order_id")
        job.paypal_order_id = order_id
        approve_url = None
        for link in order.get("links", []):
            if link.get("rel") == "approve":
                approve_url = link.get("href")
                break

        await db.commit()
        return {
            "application_id": app.id,
            "order_id": order_id,
            "approve_url": approve_url,
            "amount": contract_amount,
            "status": "order_created",
            "message": "Job claimed atomically. Complete PayPal authorization.",
        }
    except PayPalServiceError as e:
        # Revert claim
        await db.execute(update(Job).where(Job.id == job.id).values(status="open"))
        await db.commit()
        raise HTTPException(status_code=400, detail=f"PayPal order creation failed: {e.message}")


@router.post("/applications/{app_id}/confirm-fund", response_model=dict)
async def confirm_fund_application(
    app_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 2: Completes authorization of the order.
    On success:
    - job.status = 'funded'
    - job.active_contract_id = application.contract.id
    - application.status = 'funded'
    - Auto-closes all other applications on the job ('closed')
    On failure: reverts job.status = 'open'
    """
    if current_user["role"] != "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clients can confirm funding.")

    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(
            selectinload(Application.job),
            selectinload(Application.contract).selectinload(Contract.milestones),
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = app.job
    if current_user["user_id"] != job.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not job.paypal_order_id:
        raise HTTPException(status_code=400, detail="No pending PayPal order found to confirm.")

    try:
        auth_data = await paypal_service.authorize_order(job.paypal_order_id)
        auth_id = auth_data.get("authorization_id") or auth_data.get("id") or "AUTH_MOCK_DEMO"

        # Link active contract and mark funded
        job.status = "funded"
        job.active_contract_id = app.contract.id
        job.paypal_authorization_id = auth_id
        job.paypal_status = "AUTHORIZED"
        app.status = "funded"
        if app.contract:
            app.contract.status = "active"

        # Auto-close rival applications
        close_rivals_stmt = (
            update(Application)
            .where(Application.job_id == job.id, Application.id != app.id)
            .values(status="closed")
        )
        await db.execute(close_rivals_stmt)

        await add_audit_log(
            db,
            job.id,
            "PAYPAL_ESCROW_FUNDED",
            "paypal",
            {
                "application_id": app.id,
                "contract_id": app.contract.id,
                "authorization_id": auth_id,
                "amount": app.contract.total_amount,
            },
        )
        await db.commit()

        return {
            "application_id": app.id,
            "job_id": job.id,
            "status": "funded",
            "authorization_id": auth_id,
            "active_contract_id": job.active_contract_id,
            "message": "PayPal authorization locked in escrow. Contract activated. Rival applications closed.",
        }

    except PayPalServiceError as e:
        # Revert claim on failure
        await db.execute(update(Job).where(Job.id == job.id).values(status="open"))
        await db.commit()
        raise HTTPException(status_code=400, detail=f"PayPal authorization failed: {e.message}")


@router.post("/applications/{app_id}/cancel-fund", response_model=dict)
async def cancel_fund_application(
    app_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reverts an in-progress funding claim back to 'open'."""
    stmt = select(Application).where(Application.id == app_id).options(selectinload(Application.job))
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if current_user["role"] != "client" or current_user["user_id"] != app.job.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    await db.execute(update(Job).where(Job.id == app.job.id, Job.status == "funding").values(status="open"))
    await db.commit()
    return {"message": "Funding claim cancelled. Job returned to open status."}
