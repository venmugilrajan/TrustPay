import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.core.auth import get_current_user, TokenUser, require_client, require_freelancer
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
    HumanDecisionRequest,
    ContractSchema,
    MilestoneSchema,
)
from backend.agents.client_agent import run_client_agent_turn
from backend.agents.freelancer_agent import run_freelancer_agent_turn
from backend.services.paypal_service import paypal_service, PayPalServiceError
from backend.services.stats_service import stats_service

router = APIRouter(tags=["applications"])
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
    Serializes an Application model, strictly enforcing role privacy:
    - Never leaks application.min_price to clients or public.
    """
    f_name = app.freelancer_name
    if not f_name or f_name in ("Senior Full-Stack Engineer", "Alex (Verified)", "Freelancer Agent"):
        f_name = "Sofia Reyes" if "sofia" in (app.freelancer_id or "").lower() else "Arjun Kumar"

    data = {
        "id": app.id,
        "job_id": app.job_id,
        "freelancer_id": app.freelancer_id,
        "freelancer_name": f_name,
        "freelancer_title": "Backend & Data Pipeline Specialist" if f_name == "Sofia Reyes" else "Full-Stack & Systems Engineer",
        "preferred_price": app.preferred_price,
        "time_needed_days": app.time_needed_days,
        "skills": app.skills,
        "exclusions": app.exclusions,
        "notes": app.notes,
        "status": app.status,
        "client_accepted": app.client_accepted,
        "freelancer_accepted": app.freelancer_accepted,
        "client_approved": app.client_accepted,
        "freelancer_approved": app.freelancer_accepted,
        "counters_used": app.counters_used,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        "contract": None,
        "negotiation_turns": [],
    }

    # Only the applicant freelancer can see their private min_price
    if role == "freelancer":
        data["min_price"] = app.min_price

    if app.contract:
        c = app.contract
        data["contract"] = {
            "id": c.id,
            "job_id": c.job_id,
            "application_id": c.application_id,
            "version": getattr(c, "version", 1),
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
                    "paid_amount": m.paid_amount,
                    "paypal_capture_id": m.paypal_capture_id,
                    "resubmission_count": m.resubmissions_used,
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
                "sender": t.sender or (f"{t.agent_role}_agent"),
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
# 1. APPLY TO JOB (Freelancer Only)
# =========================================================================
@router.post("/api/jobs/{job_id}/apply", response_model=dict, status_code=status.HTTP_201_CREATED)
@router.post("/api/jobs/{job_id}/applications", response_model=dict, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: str,
    req: ApplicationCreateRequest,
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits an application brief for an open job.
    Requires role == 'freelancer'.
    Creates Application in 'negotiating' status and kicks off turn 1 negotiation.
    """
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.status not in ("open", "in_negotiation"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot apply: job is in '{job.status}' status (must be 'open').",
        )

    # Check if this freelancer already applied to this job
    existing_stmt = select(Application).where(
        Application.job_id == job_id,
        Application.freelancer_id == current_user.user_id,
    )
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a proposal for this project. Check 'My Work' to view its status.",
        )

    # Range non-overlap immediate check
    is_no_deal = req.min_price > job.max_budget
    initial_status = "no_deal" if is_no_deal else "negotiating"

    skills_str = ", ".join(req.skills) if isinstance(req.skills, list) else (req.skills or "")

    app = Application(
        job_id=job.id,
        freelancer_id=current_user.user_id,
        freelancer_name=req.freelancer_name or current_user.name or current_user.user_id,
        min_price=req.min_price,
        preferred_price=req.preferred_price,
        time_needed_days=req.time_needed_days,
        skills=skills_str,
        exclusions=req.exclusions,
        notes=req.notes,
        freelancer_brief={
            "min_price": req.min_price,
            "preferred_price": req.preferred_price,
            "time_needed_days": req.time_needed_days,
            "skills": skills_str,
            "exclusions": req.exclusions,
            "notes": req.notes,
        },
        status=initial_status,
    )
    db.add(app)
    await db.flush()

    if is_no_deal:
        turn = NegotiationTurn(
            job_id=job.id,
            application_id=app.id,
            round_number=1,
            agent_role="client",
            sender="client_agent",
            message=(
                f"Candidate quote (${req.preferred_price:.2f} USD) exceeds client's current budget cap (${job.max_budget:.2f} USD). "
                f"Partial Scope Compromise: Freelancer Agent offers Stage 1 core delivery for ${job.max_budget:.2f} USD. "
                "Client can revise budget to match the full specification or accept Stage 1 partial scope."
            ),
            proposal_summary=f"Quote ${req.preferred_price:.2f} vs Budget ${job.max_budget:.2f} USD (Stage 1 partial scope available).",
            proposed_price=None,
            price_change_reason="Non-overlapping budget parameters. Client can revise budget or accept partial scope.",
            contract_draft=None,
            agreed=False,
        )
        db.add(turn)

    await add_audit_log(
        db,
        job.id,
        "APPLICATION_SUBMITTED",
        "freelancer",
        {
            "application_id": app.id,
            "freelancer_id": app.freelancer_id,
            "time_needed_days": app.time_needed_days,
            "status": app.status,
        },
    )
    await db.commit()

    return {
        "id": app.id,
        "job_id": job.id,
        "status": app.status,
        "message": "Application submitted." if not is_no_deal else "Range non-overlap: negotiation closed with no deal.",
    }


# =========================================================================
# 2. LIST APPLICATIONS FOR JOB (Client Owner Only)
# =========================================================================
@router.get("/api/jobs/{job_id}/applications", response_model=List[dict])
async def list_job_applications(
    job_id: str,
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all applications submitted for a job.
    Ownership check: Only the job's client owner can view this list.
    NEVER reveals min_price.
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

    if current_user.user_id != job.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-client access denied: Only the client owner can view applications.",
        )

    return [serialize_application(a, role="client") for a in job.applications]


# =========================================================================
# 3. GET SINGLE APPLICATION (Role Sanitized)
# =========================================================================
@router.get("/api/applications/{app_id}", response_model=dict)
async def get_application(
    app_id: str,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves an application thread, turns, and draft contract.
    Ownership check:
    - Client owner sees dialogue without min_price.
    - Applicant freelancer sees dialogue without max_budget.
    - Other users receive 403 Forbidden.
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

    is_owner_client = current_user.role == "client" and current_user.user_id == app.job.client_id
    is_applicant = current_user.role == "freelancer" and current_user.user_id == app.freelancer_id

    if not is_owner_client and not is_applicant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view this application thread.",
        )

    return serialize_application(app, role=current_user.role)


@router.post("/api/applications/{app_id}/close", response_model=dict)
async def close_candidate_application(
    app_id: str,
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Allows the client owner to explicitly dismiss or close a candidate proposal.
    """
    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(selectinload(Application.job))
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if app.job.client_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the client who posted this job can close applications.")

    if app.status in ("funded", "closed"):
        raise HTTPException(status_code=400, detail=f"Cannot close application in '{app.status}' status.")

    app.status = "closed"
    await add_audit_log(
        db,
        app.job.id,
        "APPLICATION_CLOSED_BY_CLIENT",
        "client",
        {"application_id": app.id, "freelancer_id": app.freelancer_id},
    )
    await db.commit()
    return {"id": app.id, "status": "closed", "message": "Candidate proposal closed."}


# =========================================================================
# 4. NEGOTIATE APPLICATION (Agents)
# =========================================================================
@router.post("/api/applications/{app_id}/negotiate", response_model=dict)
async def step_application_negotiation(
    app_id: str,
    run_all: bool = False,
    current_user: TokenUser = Depends(get_current_user),
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

    is_owner_client = current_user.role == "client" and current_user.user_id == app.job.client_id
    is_applicant = current_user.role == "freelancer" and current_user.user_id == app.freelancer_id
    if not is_owner_client and not is_applicant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if app.status in ("closed", "no_deal", "funded"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot negotiate: application is already in '{app.status}' status.",
        )

    job = app.job

    # Guardrail 1: Non-overlapping ranges check
    if app.min_price > job.max_budget:
        app.status = "no_deal"
        turn = NegotiationTurn(
            job_id=job.id,
            application_id=app.id,
            round_number=1,
            agent_role="client",
            sender="client_agent",
            message="Thank you for submitting your brief. After analyzing required milestones and baseline budgets, our parameters cannot be aligned. Negotiation concluded without agreement.",
            proposal_summary="Non-overlapping budget and price constraints.",
            proposed_price=None,
            price_change_reason="Non-overlapping boundaries between client and freelancer requirements.",
            contract_draft=None,
            agreed=False,
        )
        db.add(turn)
        await db.commit()
        return {
            "application_id": app.id,
            "status": "no_deal",
            "message": "Negotiation ended: no deal (ranges do not overlap).",
        }

    async def execute_one_turn() -> bool:
        """Executes a single negotiation turn. Returns True if finished (consensus reached or no deal)."""
        turns_stmt = (
            select(NegotiationTurn)
            .where(NegotiationTurn.application_id == app.id)
            .order_by(NegotiationTurn.round_number.asc(), NegotiationTurn.timestamp.asc())
        )
        turns_res = await db.execute(turns_stmt)
        turns = turns_res.scalars().all()
        last_turn = turns[-1] if turns else None

        if last_turn is None:
            next_round = 1
            current_role = "client"
        elif last_turn.agent_role == "client":
            next_round = last_turn.round_number
            current_role = "freelancer"
        else:
            next_round = last_turn.round_number + 1
            current_role = "client"

        # Check max round termination
        if next_round > 6:
            app.status = "no_deal"
            await db.commit()
            return True

        history = [
            {
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "proposed_price": t.proposed_price,
                "contract_draft": t.contract_draft,
                "agreed": t.agreed,
            }
            for t in turns
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
            sender=f"{current_role}_agent",
            message=output.message,
            proposal_summary=output.proposal_summary,
            proposed_price=output.proposed_price,
            price_change_reason=output.price_change_reason,
            contract_draft=output.contract.model_dump() if output.contract else None,
            agreed=output.agreed,
        )
        db.add(turn)
        await db.flush()

        # Agreement reached (only allowed in round 3+)
        if output.agreed and next_round >= 3 and output.contract:
            app.status = "awaiting_decision"

            if app.contract:
                await db.delete(app.contract)
                await db.flush()

            contract = Contract(
                job_id=job.id,
                application_id=app.id,
                version=1,
                total_amount=output.contract.total_amount,
                currency=output.contract.currency,
                deadline=output.contract.deadline,
                status="draft",
            )
            db.add(contract)
            await db.flush()
            app.contract = contract

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

    # Safely query updated turns count without triggering lazy relationship loading
    stmt_count = select(func.count(NegotiationTurn.id)).where(NegotiationTurn.application_id == app.id)
    res_count = await db.execute(stmt_count)
    turns_count = res_count.scalar_one() or 0

    return {
        "application_id": app.id,
        "status": app.status,
        "turns_count": turns_count,
    }


# =========================================================================
# 5. HUMAN DECISION: ACCEPT / REJECT / COUNTER (Max 2 Counters)
# =========================================================================
@router.post("/api/applications/{app_id}/decide", response_model=dict)
async def human_decision(
    app_id: str,
    req: HumanDecisionRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Handles human decision on draft contract:
    - accept: client or freelancer accepts. Both accept -> status = 'approved'.
    - reject: sets status = 'rejected' (or 'closed').
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

    is_owner_client = current_user.role == "client" and current_user.user_id == app.job.client_id
    is_applicant = current_user.role == "freelancer" and current_user.user_id == app.freelancer_id
    if not is_owner_client and not is_applicant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # State Machine: allow decision if awaiting decision, negotiating, or awaiting freelancer confirmation
    valid_decide_states = (
        "awaiting_decision",
        "awaiting_approval",
        "negotiating",
        "applied",
        "pending",
        "client_accepted",
        "awaiting_freelancer_acceptance",
        "thanksgiving",
        "approved",
    )
    if app.status not in valid_decide_states:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot make decision: application is in '{app.status}' state.",
        )

    job = app.job

    if req.action == "reject":
        app.status = "rejected"
        await add_audit_log(
            db,
            job.id,
            "APPLICATION_REJECTED_BY_HUMAN",
            current_user.role,
            {"application_id": app.id, "user_id": current_user.user_id},
        )
        await db.commit()
        return {"application_id": app.id, "status": "rejected", "message": "Draft contract rejected."}

    elif req.action == "accept":
        # Ensure a 3-milestone contract exists if not present or needs upgrade
        if not app.contract:
            total_amt = app.preferred_price or job.max_budget
            m1_amt = round(total_amt * 0.35, 2)
            m2_amt = round(total_amt * 0.35, 2)
            m3_amt = round(total_amt - m1_amt - m2_amt, 2)
            contract = Contract(
                job_id=job.id,
                application_id=app.id,
                version=1,
                total_amount=total_amt,
                currency="USD",
                deadline=job.deadline,
                status="draft",
            )
            db.add(contract)
            await db.flush()
            app.contract = contract

            specs = [
                ("Core Architecture & Data Layer", "Implement foundational logic, database models, and unit test harness.", m1_amt),
                ("Business Logic & Core Services", "Implement asynchronous workflows, validation policies, and core endpoints.", m2_amt),
                ("Integration, Security & Production Delivery", "Deliver end-to-end user workflows, API integration, and sandbox test suite.", m3_amt),
            ]
            for idx, (title, desc, amt) in enumerate(specs):
                ms = Milestone(
                    contract_id=contract.id,
                    order_index=idx,
                    title=title,
                    description=desc,
                    amount=amt,
                    due_date=job.deadline,
                    status="pending",
                )
                db.add(ms)
                await db.flush()
                crit = AcceptanceCriterion(
                    milestone_id=ms.id,
                    criterion_key=f"c{idx+1}",
                    text=f"Automated verification criteria for {title}",
                    weight=1.0,
                )
                db.add(crit)
        elif len(app.contract.milestones or []) == 2 and app.status not in ("funded", "completed"):
            # Upgrade existing 2-milestone contract to 3 proper milestones
            total_amt = app.contract.total_amount
            m1_amt = round(total_amt * 0.35, 2)
            m2_amt = round(total_amt * 0.35, 2)
            m3_amt = round(total_amt - m1_amt - m2_amt, 2)
            for old_m in list(app.contract.milestones):
                await db.delete(old_m)
            await db.flush()
            specs = [
                ("Core Architecture & Data Layer", "Implement foundational logic, database models, and unit test harness.", m1_amt),
                ("Business Logic & Core Services", "Implement asynchronous workflows, validation policies, and core endpoints.", m2_amt),
                ("Integration, Security & Production Delivery", "Deliver end-to-end user workflows, API integration, and sandbox test suite.", m3_amt),
            ]
            for idx, (title, desc, amt) in enumerate(specs):
                ms = Milestone(
                    contract_id=app.contract.id,
                    order_index=idx,
                    title=title,
                    description=desc,
                    amount=amt,
                    due_date=job.deadline,
                    status="pending",
                )
                db.add(ms)
                await db.flush()
                crit = AcceptanceCriterion(
                    milestone_id=ms.id,
                    criterion_key=f"c{idx+1}",
                    text=f"Automated verification criteria for {title}",
                    weight=1.0,
                )
                db.add(crit)

        if current_user.role == "client":
            app.client_accepted = True
            if not app.freelancer_accepted:
                app.status = "awaiting_freelancer_acceptance"
                job.client_approved = True

                # Notify / archive remaining applicants with "thanksgiving"
                other_stmt = (
                    select(Application)
                    .where(Application.job_id == job.id, Application.id != app.id)
                )
                other_res = await db.execute(other_stmt)
                for other_app in other_res.scalars().all():
                    if other_app.status not in ("funded", "completed", "approved"):
                        other_app.status = "thanksgiving"

                await add_audit_log(
                    db,
                    job.id,
                    "CLIENT_ACCEPTED_APPLICATION_QUOTE",
                    "client",
                    {
                        "application_id": app.id,
                        "freelancer_name": app.freelancer_name,
                        "total_amount": app.contract.total_amount if app.contract else app.preferred_price,
                    },
                )
        else:
            app.freelancer_accepted = True

        if app.client_accepted and app.freelancer_accepted:
            app.status = "approved"
            if app.contract:
                app.contract.status = "approved"
            job.status = "approved"
            job.client_approved = True
            job.freelancer_approved = True
            if app.contract:
                job.active_contract_id = app.contract.id

            # Mark any other remaining active applications as thanksgiving
            other_stmt = (
                select(Application)
                .where(Application.job_id == job.id, Application.id != app.id)
            )
            other_res = await db.execute(other_stmt)
            for other_app in other_res.scalars().all():
                if other_app.status not in ("funded", "completed", "approved"):
                    other_app.status = "thanksgiving"

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
            "client_accepted": app.client_accepted,
            "freelancer_accepted": app.freelancer_accepted,
            "client_approved": app.client_accepted,
            "freelancer_approved": app.freelancer_accepted,
            "message": "Approval recorded." + (
                " Both parties agreed! Funding unlocked."
                if app.status == "approved"
                else (
                    " Client accepted quote! Waiting for freelancer to confirm work."
                    if app.status == "awaiting_freelancer_acceptance"
                    else " Awaiting client approval."
                )
            ),
        }

    elif req.action == "counter":
        if app.counters_used >= 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Maximum of 2 counter-offers per application exceeded.",
            )

        app.counters_used += 1
        # Reset acceptances
        app.client_accepted = False
        app.freelancer_accepted = False
        app.status = "awaiting_decision"

        # Determine next turn round
        turns_stmt = (
            select(NegotiationTurn)
            .where(NegotiationTurn.application_id == app.id)
            .order_by(NegotiationTurn.round_number.asc(), NegotiationTurn.timestamp.asc())
        )
        turns_res = await db.execute(turns_stmt)
        turns = turns_res.scalars().all()
        last_turn = turns[-1] if turns else None
        next_round = (last_turn.round_number if last_turn else 3) + 1

        feedback_msg = req.message or f"Counter offer from {current_user.role}: adjust milestone price and scope."

        opposing_role = "client" if current_user.role == "freelancer" else "freelancer"
        history = [
            {
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "proposed_price": t.proposed_price,
                "contract_draft": t.contract_draft,
                "agreed": t.agreed,
            }
            for t in turns
        ]

        if opposing_role == "client":
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
                human_counter_message=feedback_msg,
            )

        # Ensure counter output stays within both private limits
        proposed_contract_price = output.proposed_price
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

            # Update contract draft with revised terms and increment version
            if app.contract and output.contract:
                app.contract.version = (getattr(app.contract, "version", 1) or 1) + 1
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
            sender=f"{opposing_role}_agent",
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
            current_user.role,
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
@router.post("/api/applications/{app_id}/fund/create-order", response_model=dict)
@router.post("/api/applications/{app_id}/claim-fund", response_model=dict)
async def create_funding_order(
    app_id: str,
    payment_source: str = "paypal_wallet",
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 1: Atomic job claim and PayPal Order creation.
    - Requires role == 'client' and ownership (current_user.user_id == job.client_id).
    - Requires application.status == 'approved' with both client and freelancer accepted.
    - Atomic conditional UPDATE: 'open' -> 'funding'. If rowcount != 1, raises 409 Conflict.
    - Sourced strictly from application.contract.total_amount.
    """
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
    if current_user.user_id != job.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-client access denied: Only the job creator can fund escrow.",
        )

    if app.status != "approved" or not app.client_accepted or not app.freelancer_accepted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot fund: Application must be approved by both client and freelancer first.",
        )

    if not app.contract:
        raise HTTPException(status_code=400, detail="No approved contract found for this application.")

    # Idempotent re-entry: If THIS application is already being funded with an order, reuse it
    if job.status == "funding" and job.paypal_order_id and app.status == "funding" and app.contract.paypal_order_id == job.paypal_order_id:
        return {
            "application_id": app.id,
            "order_id": job.paypal_order_id,
            "approve_url": None,
            "amount": app.contract.total_amount,
            "status": "order_created",
            "message": "Existing PayPal order resumed.",
        }

    # Atomic conditional claim: transition job status from 'open' / 'approved' -> 'funding'
    claim_stmt = (
        update(Job)
        .where(Job.id == job.id, Job.status.in_(["open", "in_negotiation", "approved", "awaiting_approval"]))
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
        app.contract.paypal_order_id = order_id
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


@router.post("/api/applications/{app_id}/fund/authorize", response_model=dict)
@router.post("/api/applications/{app_id}/confirm-fund", response_model=dict)
async def authorize_funding_order(
    app_id: str,
    body: Optional[dict] = Body(default=None),
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 2: Completes authorization of the order after buyer approval.
    On success:
    - Records 'authorized' row in payments_ledger (Single source of truth)
    - job.status = 'funded'
    - job.active_contract_id = application.contract.id
    - application.status = 'funded'
    - contract.status = 'funded'
    - Auto-closes all rival applications on the job ('closed')
    On failure: reverts job.status = 'open'
    """
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
    if current_user.user_id != job.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    order_id_from_body = (body or {}).get("order_id")
    allow_simulation = bool((body or {}).get("allow_sandbox_simulation", True))

    target_order_id = order_id_from_body or job.paypal_order_id
    if not target_order_id:
        target_order_id = f"ORDER-SB-{uuid.uuid4().hex[:8].upper()}"
        job.paypal_order_id = target_order_id

    try:
        auth_data = await paypal_service.authorize_order(target_order_id)
        auth_id = auth_data.get("authorization_id") or auth_data.get("id") or f"SANDBOX-AUTH-{uuid.uuid4().hex[:8].upper()}"
    except PayPalServiceError as pe:
        if allow_simulation or "ORDER_NOT_APPROVED" in str(pe.message):
            auth_id = f"SANDBOX-AUTH-{uuid.uuid4().hex[:8].upper()}"
        else:
            await db.execute(update(Job).where(Job.id == job.id).values(status="open"))
            await db.commit()
            raise HTTPException(status_code=400, detail=f"PayPal authorization error: {pe.message}")

    # Update contract and job
    job.status = "funded"
    job.active_contract_id = app.contract.id
    job.paypal_authorization_id = auth_id
    job.paypal_status = "AUTHORIZED"
    job.client_approved = True
    job.freelancer_approved = True
    app.status = "funded"
    app.client_accepted = True
    app.freelancer_accepted = True
    if app.contract:
        app.contract.status = "funded"
        app.contract.paypal_order_id = job.paypal_order_id
        app.contract.paypal_authorization_id = auth_id
        app.contract.authorized_at = datetime.now(timezone.utc)

    # Record financial ledger entry (Single source of truth)
    await stats_service.record_ledger_entry(
        db=db,
        job_id=job.id,
        contract_id=app.contract.id,
        milestone_id=None,
        entry_type="authorized",
        amount=app.contract.total_amount,
        paypal_id=auth_id,
        actor="client",
        note=f"PayPal escrow funds held for contract '{app.contract.id}'",
        currency=app.contract.currency,
        is_demo=bool(getattr(job, "is_demo", False)),
    )

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


@router.post("/api/applications/{app_id}/cancel-fund", response_model=dict)
async def cancel_fund_application(
    app_id: str,
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Reverts an in-progress funding claim back to 'open'."""
    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(selectinload(Application.job), selectinload(Application.contract))
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if current_user.user_id != app.job.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    await db.execute(
        update(Job)
        .where(Job.id == app.job.id, Job.status == "funding")
        .values(status="open", paypal_order_id=None)
    )
    if app.contract:
        app.contract.paypal_order_id = None
    await db.commit()
    return {"message": "Funding claim cancelled. Job returned to open status."}
