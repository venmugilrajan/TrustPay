import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.core.auth import get_current_user, TokenUser
from backend.models.models import (
    Job,
    Contract,
    Milestone,
    DeliverableSubmission,
    DisputeRecord,
    AuditLog,
)
from backend.schemas.schemas import DisputeCreateRequest
from backend.agents.dispute_agent import run_dispute_agent_arbitration
from backend.services.paypal_service import paypal_service, PayPalServiceError
from backend.services.stats_service import stats_service

router = APIRouter(tags=["disputes"])


async def add_audit_log(db: AsyncSession, job_id: str, event_type: str, actor: str, details: dict):
    log = AuditLog(
        job_id=job_id,
        event_type=event_type,
        actor=actor,
        details=details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)


async def _handle_dispute_creation_and_arbitration(
    milestone_id: str,
    request: DisputeCreateRequest,
    current_user: TokenUser,
    db: AsyncSession,
) -> dict:
    stmt = (
        select(Milestone)
        .where(Milestone.id == milestone_id)
        .options(
            selectinload(Milestone.acceptance_criteria),
            selectinload(Milestone.submissions).selectinload(DeliverableSubmission.evaluations),
            selectinload(Milestone.contract).selectinload(Contract.job),
            selectinload(Milestone.contract).selectinload(Contract.application),
        )
    )
    res = await db.execute(stmt)
    milestone = res.scalar_one_or_none()
    if not milestone or not milestone.contract:
        raise HTTPException(status_code=404, detail="Milestone or contract not found.")

    contract = milestone.contract
    job = contract.job

    is_client = current_user.role == "client" and current_user.user_id == job.client_id
    is_freelancer = current_user.role == "freelancer" and contract.application and current_user.user_id == contract.application.freelancer_id

    if not is_client and not is_freelancer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not a party to this contract.")

    # Get latest evaluation for context
    latest_eval = {}
    if milestone.submissions and milestone.submissions[0].evaluations:
        ev = milestone.submissions[0].evaluations[0]
        latest_eval = {
            "verdict": ev.verdict,
            "overall_score": ev.overall_score,
            "feedback_for_freelancer": ev.feedback_for_freelancer,
            "per_criterion_results": ev.per_criterion_results,
        }

    # 1. Create Dispute Record
    dispute = DisputeRecord(
        id=str(uuid.uuid4()),
        contract_id=contract.id,
        milestone_id=milestone.id,
        raised_by=current_user.role,
        initiator_id=current_user.user_id,
        reason=request.reason,
        client_statement=request.reason if current_user.role == "client" else None,
        freelancer_statement=request.reason if current_user.role == "freelancer" else None,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(dispute)
    milestone.status = "disputed"
    job.status = "in_progress"
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "DISPUTE_RAISED",
        current_user.role,
        {"milestone_id": milestone.id, "reason": request.reason},
    )

    # 2. Invoke Dispute Agent
    criteria_list = [
        {"id": c.criterion_key, "text": c.text, "weight": c.weight}
        for c in milestone.acceptance_criteria
    ]

    ruling_data = await run_dispute_agent_arbitration(
        milestone_title=milestone.title,
        milestone_amount=milestone.amount,
        acceptance_criteria=criteria_list,
        judge_evaluation=latest_eval,
        raised_by=current_user.role,
        dispute_reason=request.reason,
    )

    # 3. Save Ruling
    dispute.status = "resolved"
    dispute.ruling = ruling_data.ruling
    dispute.amount_to_capture = ruling_data.amount_to_capture
    dispute.amount_to_refund = ruling_data.amount_to_refund
    dispute.reasoning = ruling_data.reasoning
    dispute.resolved_at = datetime.now(timezone.utc)

    auth_id = contract.paypal_authorization_id or job.paypal_authorization_id

    # 4. Execute Financial Actions via PayPal & record in ledger
    # If refund requested and funds were already captured
    if ruling_data.amount_to_refund > 0 and milestone.paypal_capture_id:
        try:
            refund_res = await paypal_service.refund_capture(
                capture_id=milestone.paypal_capture_id,
                amount=ruling_data.amount_to_refund,
                currency=contract.currency,
                note_to_payer=f"TrustPay dispute resolution refund: {ruling_data.reasoning[:100]}",
            )
            refund_id = refund_res.get("id") or f"REF_{uuid.uuid4().hex[:8]}"

            # Record in payments_ledger (Single source of truth)
            await stats_service.record_ledger_entry(
                db=db,
                job_id=job.id,
                contract_id=contract.id,
                milestone_id=milestone.id,
                entry_type="refunded",
                amount=ruling_data.amount_to_refund,
                paypal_id=refund_id,
                actor="dispute",
                note=f"Dispute refund issued to client: {ruling_data.reasoning[:120]}",
                currency=contract.currency,
                is_demo=bool(getattr(job, "is_demo", False)),
            )

            await add_audit_log(
                db,
                job.id,
                "PAYPAL_REFUND_EXECUTED",
                "paypal",
                {
                    "refund_id": refund_id,
                    "amount": ruling_data.amount_to_refund,
                    "capture_id": milestone.paypal_capture_id,
                },
            )
        except PayPalServiceError as exc:
            await add_audit_log(
                db,
                job.id,
                "PAYPAL_REFUND_FAILED",
                "paypal",
                {"error": str(exc)},
            )

    # If capture requested and not yet captured
    if ruling_data.amount_to_capture > (milestone.captured_amount or 0.0) and auth_id:
        net_to_capture = round(ruling_data.amount_to_capture - (milestone.captured_amount or 0.0), 2)
        try:
            cap_res = await paypal_service.capture_authorization(
                authorization_id=auth_id,
                amount=net_to_capture,
                final_capture=False,
                currency=contract.currency,
            )
            cap_id = cap_res.get("id") or f"CAP_{uuid.uuid4().hex[:8]}"
            milestone.captured_amount = (milestone.captured_amount or 0.0) + net_to_capture
            milestone.paid_amount = milestone.captured_amount
            milestone.paypal_capture_id = cap_id

            await stats_service.record_ledger_entry(
                db=db,
                job_id=job.id,
                contract_id=contract.id,
                milestone_id=milestone.id,
                entry_type="captured",
                amount=net_to_capture,
                paypal_id=cap_id,
                actor="dispute",
                note=f"Dispute payout capture awarded to freelancer: {ruling_data.reasoning[:120]}",
                currency=contract.currency,
                is_demo=bool(getattr(job, "is_demo", False)),
            )

            await add_audit_log(
                db,
                job.id,
                "PAYPAL_DISPUTE_CAPTURE_EXECUTED",
                "paypal",
                {"amount": net_to_capture, "capture_id": cap_id},
            )
        except PayPalServiceError as exc:
            await add_audit_log(
                db,
                job.id,
                "PAYPAL_DISPUTE_CAPTURE_FAILED",
                "paypal",
                {"error": str(exc)},
            )

    milestone.status = "completed"
    await db.commit()

    return {
        "dispute_id": dispute.id,
        "ruling": ruling_data.ruling,
        "amount_to_capture": ruling_data.amount_to_capture,
        "amount_to_refund": ruling_data.amount_to_refund,
        "reasoning": ruling_data.reasoning,
        "status": dispute.status,
    }


@router.post("/api/milestones/{milestone_id}/dispute", response_model=dict)
async def raise_dispute_direct(
    milestone_id: str,
    request: DisputeCreateRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Raises and arbitrates a dispute on a milestone directly by milestone ID."""
    return await _handle_dispute_creation_and_arbitration(
        milestone_id=milestone_id,
        request=request,
        current_user=current_user,
        db=db,
    )


@router.post("/api/jobs/{job_id}/milestones/{milestone_id}/dispute", response_model=dict)
async def raise_dispute_nested(
    job_id: str,
    milestone_id: str,
    request: DisputeCreateRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Backwards-compatible nested dispute endpoint."""
    return await _handle_dispute_creation_and_arbitration(
        milestone_id=milestone_id,
        request=request,
        current_user=current_user,
        db=db,
    )


@router.get("/api/disputes", response_model=List[dict])
async def list_disputes(
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists disputes accessible to the current authenticated user."""
    stmt = (
        select(DisputeRecord)
        .options(
            selectinload(DisputeRecord.milestone).selectinload(Milestone.contract).selectinload(Contract.job),
            selectinload(DisputeRecord.milestone).selectinload(Milestone.contract).selectinload(Contract.application),
        )
        .order_by(DisputeRecord.created_at.desc())
    )
    res = await db.execute(stmt)
    disputes = res.scalars().all()

    out = []
    for d in disputes:
        m = d.milestone
        c = m.contract if m else None
        j = c.job if c else None
        a = c.application if c else None

        # Filter by user role and ownership
        if current_user.role == "client" and j and j.client_id == current_user.user_id:
            pass
        elif current_user.role == "freelancer" and a and a.freelancer_id == current_user.user_id:
            pass
        else:
            continue

        out.append({
            "id": d.id,
            "milestone_id": d.milestone_id,
            "milestone_title": m.title if m else "",
            "contract_id": c.id if c else None,
            "job_id": j.id if j else None,
            "job_title": j.title if j else "",
            "raised_by": d.raised_by,
            "reason": d.reason,
            "status": d.status,
            "ruling": d.ruling,
            "amount_to_capture": d.amount_to_capture,
            "amount_to_refund": d.amount_to_refund,
            "reasoning": d.reasoning,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
        })
    return out


@router.get("/api/disputes/{dispute_id}", response_model=dict)
async def get_dispute(
    dispute_id: str,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full details of a single dispute record."""
    stmt = (
        select(DisputeRecord)
        .where(DisputeRecord.id == dispute_id)
        .options(
            selectinload(DisputeRecord.milestone).selectinload(Milestone.contract).selectinload(Contract.job),
            selectinload(DisputeRecord.milestone).selectinload(Milestone.contract).selectinload(Contract.application),
        )
    )
    res = await db.execute(stmt)
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found.")

    m = d.milestone
    c = m.contract if m else None
    j = c.job if c else None
    a = c.application if c else None

    is_client = current_user.role == "client" and j and j.client_id == current_user.user_id
    is_freelancer = current_user.role == "freelancer" and a and a.freelancer_id == current_user.user_id

    if not is_client and not is_freelancer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return {
        "id": d.id,
        "milestone_id": d.milestone_id,
        "milestone_title": m.title if m else "",
        "contract_id": c.id if c else None,
        "job_id": j.id if j else None,
        "job_title": j.title if j else "",
        "raised_by": d.raised_by,
        "reason": d.reason,
        "client_statement": d.client_statement,
        "freelancer_statement": d.freelancer_statement,
        "status": d.status,
        "ruling": d.ruling,
        "amount_to_capture": d.amount_to_capture,
        "amount_to_refund": d.amount_to_refund,
        "reasoning": d.reasoning,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
    }
