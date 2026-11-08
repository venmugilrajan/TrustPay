import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.models.models import (
    Job,
    Contract,
    Milestone,
    AcceptanceCriterion,
    NegotiationTurn,
    AuditLog,
)
from backend.schemas.schemas import (
    JobCreateRequest,
    JobResponse,
    ContractSchema,
    ApprovalRequest,
    NegotiationTurnSchema,
)
from backend.agents.client_agent import run_client_agent_turn
from backend.agents.freelancer_agent import run_freelancer_agent_turn
from backend.services.paypal_service import paypal_service, PayPalServiceError

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


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


async def load_job_with_relations(db: AsyncSession, job_id: str) -> Optional[Job]:
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.acceptance_criteria),
            selectinload(Job.contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.submissions),
            selectinload(Job.contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.disputes),
            selectinload(Job.negotiation_turns),
            selectinload(Job.audit_logs),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_job(request: JobCreateRequest, db: AsyncSession = Depends(get_db)):
    """
    Creates a new freelance job posting and initializes negotiation state.
    """
    job = Job(
        title=request.title,
        description=request.description,
        max_budget=request.max_budget,
        currency=request.currency,
        deadline=request.deadline,
        status="negotiating",
    )
    db.add(job)
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "JOB_CREATED",
        "client",
        {
            "title": job.title,
            "max_budget": job.max_budget,
            "deadline": job.deadline,
        },
    )
    await db.commit()

    return {"id": job.id, "status": job.status, "message": "Job created. AI agents ready to negotiate."}


@router.get("", response_model=List[dict])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """
    Lists all jobs with summary metrics.
    """
    stmt = select(Job).order_by(Job.created_at.desc())
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "max_budget": j.max_budget,
            "currency": j.currency,
            "deadline": j.deadline,
            "status": j.status,
            "client_approved": j.client_approved,
            "freelancer_approved": j.freelancer_approved,
            "paypal_status": j.paypal_status,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@router.get("/{job_id}", response_model=dict)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Retrieves full details of a job, including contract, milestones, turns, and audit logs.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    contract_data = None
    if job.contract:
        contract_data = {
            "id": job.contract.id,
            "job_id": job.contract.job_id,
            "total_amount": job.contract.total_amount,
            "currency": job.contract.currency,
            "deadline": job.contract.deadline,
            "status": job.contract.status,
            "milestones": [
                {
                    "id": m.id,
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
                        {"id": c.criterion_key, "text": c.text, "weight": c.weight}
                        for c in m.acceptance_criteria
                    ],
                    "submissions": [
                        {
                            "id": s.id,
                            "version": s.version,
                            "submission_type": s.submission_type,
                            "file_path": s.file_path,
                            "content_text": s.content_text,
                            "submitted_at": s.submitted_at.isoformat(),
                        }
                        for s in m.submissions
                    ],
                    "disputes": [
                        {
                            "id": d.id,
                            "raised_by": d.raised_by,
                            "reason": d.reason,
                            "status": d.status,
                            "ruling": d.ruling,
                            "amount_to_capture": d.amount_to_capture,
                            "amount_to_refund": d.amount_to_refund,
                            "reasoning": d.reasoning,
                        }
                        for d in m.disputes
                    ],
                }
                for m in job.contract.milestones
            ],
        }

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "max_budget": job.max_budget,
        "currency": job.currency,
        "deadline": job.deadline,
        "status": job.status,
        "client_approved": job.client_approved,
        "freelancer_approved": job.freelancer_approved,
        "paypal_order_id": job.paypal_order_id,
        "paypal_authorization_id": job.paypal_authorization_id,
        "paypal_status": job.paypal_status,
        "authorization_expires_at": job.authorization_expires_at,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
        "contract": contract_data,
        "negotiation_turns": [
            {
                "id": t.id,
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "contract_draft": t.contract_draft,
                "agreed": t.agreed,
                "timestamp": t.timestamp.isoformat(),
            }
            for t in job.negotiation_turns
        ],
        "audit_logs": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "actor": a.actor,
                "details": a.details,
                "timestamp": a.timestamp.isoformat(),
            }
            for a in job.audit_logs
        ],
    }


@router.post("/{job_id}/negotiate", response_model=dict)
async def advance_negotiation(
    job_id: str,
    run_all: bool = Query(default=False, description="If true, runs rounds until agreement or limit"),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes one negotiation turn (or runs to completion if run_all=True).
    Client Agent and Freelancer Agent alternate turns up to 6 rounds.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "negotiating":
        return {"status": job.status, "message": f"Job is already in status '{job.status}'."}

    async def step_turn() -> bool:
        """Executes a single turn. Returns True if agreement reached or negotiation halted."""
        nonlocal job
        turns = job.negotiation_turns
        turn_count = len(turns)

        # Determine next role and round number
        if turn_count == 0:
            round_num = 1
            role = "client"
        else:
            last_turn = turns[-1]
            if last_turn.agent_role == "client":
                round_num = last_turn.round_number
                role = "freelancer"
            else:
                round_num = last_turn.round_number + 1
                role = "client"

        if round_num > 6:
            job.status = "no_deal"
            await add_audit_log(
                db,
                job.id,
                "NEGOTIATION_NO_DEAL",
                "system",
                {"message": "Negotiation exceeded 6 rounds limit without consensus."},
            )
            await db.commit()
            return True

        # Build turn history representation
        history = [
            {
                "round_number": t.round_number,
                "agent_role": t.agent_role,
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "contract_draft": t.contract_draft,
                "agreed": t.agreed,
            }
            for t in turns
        ]

        if role == "client":
            agent_res = await run_client_agent_turn(
                job_title=job.title,
                job_description=job.description,
                max_budget=job.max_budget,
                deadline=job.deadline,
                round_number=round_num,
                history=history,
            )
        else:
            agent_res = await run_freelancer_agent_turn(
                job_title=job.title,
                job_description=job.description,
                max_budget=job.max_budget,
                deadline=job.deadline,
                round_number=round_num,
                history=history,
            )

        # Save turn
        new_turn = NegotiationTurn(
            job_id=job.id,
            round_number=round_num,
            agent_role=role,
            message=agent_res.message,
            proposal_summary=agent_res.proposal_summary,
            contract_draft=agent_res.contract.model_dump(),
            agreed=agent_res.agreed,
        )
        db.add(new_turn)
        job.negotiation_turns.append(new_turn)

        await add_audit_log(
            db,
            job.id,
            f"AGENT_TURN_{role.upper()}",
            f"{role}_agent",
            {
                "round": round_num,
                "agreed": agent_res.agreed,
                "summary": agent_res.proposal_summary,
            },
        )

        if agent_res.agreed:
            # Finalize contract into database
            contract_dict = agent_res.contract.model_dump()
            contract = Contract(
                job_id=job.id,
                total_amount=contract_dict["total_amount"],
                currency=contract_dict["currency"],
                deadline=contract_dict["deadline"],
                status="agreed",
            )
            db.add(contract)
            await db.flush()

            for idx, m_data in enumerate(contract_dict["milestones"]):
                milestone = Milestone(
                    contract_id=contract.id,
                    order_index=idx,
                    title=m_data["title"],
                    description=m_data["description"],
                    amount=m_data["amount"],
                    due_date=m_data["due_date"],
                    status="pending",
                )
                db.add(milestone)
                await db.flush()

                for c_data in m_data["acceptance_criteria"]:
                    crit = AcceptanceCriterion(
                        milestone_id=milestone.id,
                        criterion_key=c_data["id"],
                        text=c_data["text"],
                        weight=c_data["weight"],
                    )
                    db.add(crit)

            job.status = "awaiting_approval"
            await add_audit_log(
                db,
                job.id,
                "CONTRACT_AGREED_BY_AGENTS",
                "system",
                {"total_amount": contract.total_amount, "milestones_count": len(contract_dict["milestones"])},
            )
            await db.commit()
            return True

        await db.commit()
        return False

    if run_all:
        done = False
        steps = 0
        while not done and steps < 12:
            done = await step_turn()
            steps += 1
    else:
        await step_turn()

    # Reload fresh state
    updated_job = await load_job_with_relations(db, job_id)
    return {
        "status": updated_job.status,
        "turns_count": len(updated_job.negotiation_turns),
        "last_message": updated_job.negotiation_turns[-1].message if updated_job.negotiation_turns else None,
    }


@router.post("/{job_id}/approve", response_model=dict)
async def approve_contract(
    job_id: str,
    request: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Allows the human Client or Freelancer role to approve the negotiated contract.
    When both approve, the job is ready for PayPal funding.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ("awaiting_approval", "negotiating"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve contract when job status is '{job.status}'"
        )

    if request.role == "client":
        job.client_approved = True
        await add_audit_log(db, job.id, "CONTRACT_APPROVED_CLIENT", "client", {"message": "Client approved contract."})
    elif request.role == "freelancer":
        job.freelancer_approved = True
        await add_audit_log(db, job.id, "CONTRACT_APPROVED_FREELANCER", "freelancer", {"message": "Freelancer approved contract."})

    # If both approved
    if job.client_approved and job.freelancer_approved:
        if job.status == "awaiting_approval":
            job.status = "approved"
        await add_audit_log(
            db,
            job.id,
            "CONTRACT_MUTUALLY_APPROVED",
            "system",
            {"message": "Both parties approved. Ready for PayPal funding authorization."},
        )

    await db.commit()
    return {
        "job_id": job.id,
        "client_approved": job.client_approved,
        "freelancer_approved": job.freelancer_approved,
        "status": job.status,
    }


@router.post("/{job_id}/fund", response_model=dict)
async def fund_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a PayPal order with intent AUTHORIZE for the total agreed contract amount.
    Amounts are read STRICTLY from the database contract, never from client input.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not (job.client_approved and job.freelancer_approved):
        raise HTTPException(
            status_code=400,
            detail="Both Client and Freelancer must approve the contract before funding."
        )

    if not job.contract:
        raise HTTPException(status_code=400, detail="No agreed contract found for this job.")

    amount = job.contract.total_amount
    currency = job.contract.currency

    try:
        order = await paypal_service.create_order_authorize(
            amount=amount,
            currency=currency,
            reference_id=f"job_{job.id}",
            custom_id=job.id,
        )
    except PayPalServiceError as exc:
        raise HTTPException(status_code=502, detail=f"PayPal API error: {str(exc)}")

    order_id = order.get("id")
    job.paypal_order_id = order_id
    job.paypal_status = "ORDER_CREATED"

    # Find approve URL for the client popup/redirect
    approve_url = None
    for link in order.get("links", []):
        if link.get("rel") == "approve":
            approve_url = link.get("href")
            break

    await add_audit_log(
        db,
        job.id,
        "PAYPAL_ORDER_CREATED",
        "paypal",
        {
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "intent": "AUTHORIZE",
        },
    )
    await db.commit()

    return {
        "job_id": job.id,
        "order_id": order_id,
        "approve_url": approve_url,
        "amount": amount,
        "currency": currency,
        "status": job.paypal_status,
    }


@router.post("/{job_id}/authorize", response_model=dict)
async def authorize_job_payment(
    job_id: str,
    payload: Optional[dict] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Authorizes the PayPal order after the client completes approval.
    Stores authorization_id and updates job status to 'funded' / 'in_progress'.
    Money is held, not captured.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    order_id = (payload or {}).get("order_id") or job.paypal_order_id
    if not order_id:
        raise HTTPException(status_code=400, detail="No PayPal order ID associated with this job.")

    try:
        auth_data = await paypal_service.authorize_order(order_id)
    except PayPalServiceError as exc:
        raise HTTPException(status_code=502, detail=f"PayPal authorization error: {str(exc)}")

    auth_id = auth_data.get("authorization_id")
    if not auth_id:
        # Fallback check inside purchase_units if present
        try:
            auth_id = auth_data["purchase_units"][0]["payments"]["authorizations"][0]["id"]
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to retrieve authorization ID from PayPal response.")

    job.paypal_authorization_id = auth_id
    job.paypal_status = "AUTHORIZED"
    job.status = "in_progress"

    # Read expiration time if provided by PayPal
    exp_time = None
    if "authorization" in auth_data and "expiration_time" in auth_data["authorization"]:
        exp_time = auth_data["authorization"]["expiration_time"]
    job.authorization_expires_at = exp_time

    # Update contract status
    if job.contract:
        job.contract.status = "active"

    await add_audit_log(
        db,
        job.id,
        "PAYPAL_ORDER_AUTHORIZED",
        "paypal",
        {
            "order_id": order_id,
            "authorization_id": auth_id,
            "status": "AUTHORIZED",
            "expiration_time": exp_time,
            "note": "Funds are held in escrow via PayPal authorization. Not yet captured.",
        },
    )
    await db.commit()

    return {
        "job_id": job.id,
        "authorization_id": auth_id,
        "paypal_status": job.paypal_status,
        "job_status": job.status,
        "expiration_time": exp_time,
        "is_expiring_soon": paypal_service.is_authorization_expiring_soon(exp_time),
    }

