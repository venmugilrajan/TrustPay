from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.models.models import (
    Job,
    Contract,
    Milestone,
    DisputeRecord,
    AuditLog,
)
from backend.schemas.schemas import DisputeCreateRequest
from backend.agents.dispute_agent import run_dispute_agent_arbitration
from backend.services.paypal_service import paypal_service, PayPalServiceError

router = APIRouter(prefix="/api/jobs/{job_id}/milestones/{milestone_id}/dispute", tags=["disputes"])


async def add_audit_log(db: AsyncSession, job_id: str, event_type: str, actor: str, details: dict):
    log = AuditLog(
        job_id=job_id,
        event_type=event_type,
        actor=actor,
        details=details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)


@router.post("", response_model=dict)
async def raise_and_arbitrate_dispute(
    job_id: str,
    milestone_id: str,
    request: DisputeCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Raises a dispute on a milestone verdict.
    The Dispute Agent conducts binding arbitration and executes PayPal capture/refund/void.
    """
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.acceptance_criteria),
            selectinload(Job.contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.submissions)
            .selectinload(Milestone.submissions.property.mapper.class_.evaluations),
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job or not job.contract:
        raise HTTPException(status_code=404, detail="Job not found.")

    milestone = next((m for m in job.contract.milestones if m.id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

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
        milestone_id=milestone.id,
        raised_by=request.raised_by,
        reason=request.reason,
        status="pending",
    )
    db.add(dispute)
    milestone.status = "disputed"
    job.status = "disputed"
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "DISPUTE_RAISED",
        request.raised_by,
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
        raised_by=request.raised_by,
        dispute_reason=request.reason,
    )

    # 3. Save Ruling
    dispute.status = "resolved"
    dispute.ruling = ruling_data.ruling
    dispute.amount_to_capture = ruling_data.amount_to_capture
    dispute.amount_to_refund = ruling_data.amount_to_refund
    dispute.reasoning = ruling_data.reasoning
    dispute.resolved_at = datetime.now(timezone.utc)

    # 4. Execute Financial Actions via PayPal
    # If amount_to_refund > 0 and funds were already captured
    refund_res = None
    if ruling_data.amount_to_refund > 0 and milestone.paypal_capture_id:
        try:
            refund_res = await paypal_service.refund_capture(
                capture_id=milestone.paypal_capture_id,
                amount=ruling_data.amount_to_refund,
                currency=job.contract.currency,
                note_to_payer=f"TrustPay dispute resolution refund: {ruling_data.reasoning[:100]}",
            )
            await add_audit_log(
                db,
                job.id,
                "PAYPAL_REFUND_EXECUTED",
                "paypal",
                {
                    "refund_id": refund_res.get("id"),
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

    # If amount_to_capture > 0 and not yet captured
    if ruling_data.amount_to_capture > milestone.captured_amount and job.paypal_authorization_id:
        net_to_capture = round(ruling_data.amount_to_capture - milestone.captured_amount, 2)
        try:
            cap_res = await paypal_service.capture_authorization(
                authorization_id=job.paypal_authorization_id,
                amount=net_to_capture,
                final_capture=False,
                currency=job.contract.currency,
            )
            milestone.captured_amount += net_to_capture
            milestone.paypal_capture_id = cap_res.get("id")
            await add_audit_log(
                db,
                job.id,
                "PAYPAL_DISPUTE_CAPTURE_EXECUTED",
                "paypal",
                {"amount": net_to_capture, "capture_id": cap_res.get("id")},
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
    job.status = "in_progress"

    await add_audit_log(
        db,
        job.id,
        "DISPUTE_RESOLVED_BY_AGENT",
        "dispute_agent",
        {
            "ruling": ruling_data.ruling,
            "captured": ruling_data.amount_to_capture,
            "refunded": ruling_data.amount_to_refund,
            "reasoning": ruling_data.reasoning,
        },
    )
    await db.commit()

    return {
        "dispute_id": dispute.id,
        "ruling": ruling_data.ruling,
        "amount_to_capture": ruling_data.amount_to_capture,
        "amount_to_refund": ruling_data.amount_to_refund,
        "reasoning": ruling_data.reasoning,
        "status": dispute.status,
    }
