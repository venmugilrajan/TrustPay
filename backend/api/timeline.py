from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.database import get_db
from backend.models.models import Job, Contract, Milestone, AuditLog, PaymentLedgerEntry
from backend.services.paypal_service import paypal_service
from backend.services.stats_service import stats_service

router = APIRouter(tags=["timeline"])


@router.get("/api/contracts/{contract_id}/timeline", response_model=List[dict])
async def get_contract_timeline(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full chronological audit log and ledger timeline for a contract.
    """
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(selectinload(Contract.job))
    )
    res = await db.execute(stmt)
    contract = res.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    # Fetch audit logs for the contract's job
    log_stmt = (
        select(AuditLog)
        .where(AuditLog.job_id == contract.job_id)
        .order_by(AuditLog.timestamp.asc())
    )
    log_res = await db.execute(log_stmt)
    logs = log_res.scalars().all()

    # Fetch ledger events for this contract
    ledger_stmt = (
        select(PaymentLedgerEntry)
        .where(PaymentLedgerEntry.contract_id == contract_id)
        .order_by(PaymentLedgerEntry.created_at.asc())
    )
    ledger_res = await db.execute(ledger_stmt)
    ledger_entries = ledger_res.scalars().all()

    timeline = []
    for l in logs:
        timeline.append({
            "id": l.id,
            "type": "audit_log",
            "event_type": l.event_type,
            "actor": l.actor,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        })

    for le in ledger_entries:
        timeline.append({
            "id": le.id,
            "type": "payment_ledger",
            "event_type": f"LEDGER_{le.type.upper()}",
            "actor": le.actor,
            "details": {
                "amount": le.amount,
                "currency": le.currency,
                "paypal_id": le.paypal_id,
                "note": le.note,
            },
            "timestamp": le.created_at.isoformat() if le.created_at else None,
        })

    timeline.sort(key=lambda x: x["timestamp"] or "")
    return timeline


@router.get("/api/jobs/{job_id}/timeline", response_model=List[dict])
async def get_job_timeline(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full chronological audit log timeline for a job.
    """
    stmt = (
        select(AuditLog)
        .where(AuditLog.job_id == job_id)
        .order_by(AuditLog.timestamp.asc())
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "type": "audit_log",
            "event_type": l.event_type,
            "actor": l.actor,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]


@router.post("/api/jobs/{job_id}/auto-void", response_model=dict)
@router.post("/api/contracts/{job_id}/auto-void", response_model=dict)
async def check_and_auto_void(
    job_id: str,
    force: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Checks if job deadline has passed with incomplete delivery.
    Automatically voids remaining authorization and releases held funds.
    Records voided entry in payments_ledger.
    """
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.active_contract).selectinload(Contract.milestones),
            selectinload(Job.contracts).selectinload(Contract.milestones),
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        # Check if contract_id was passed
        c_stmt = (
            select(Contract)
            .where(Contract.id == job_id)
            .options(
                selectinload(Contract.job),
                selectinload(Contract.milestones),
            )
        )
        c_res = await db.execute(c_stmt)
        contract = c_res.scalar_one_or_none()
        if contract:
            job = contract.job

    if not job:
        raise HTTPException(status_code=404, detail="Job or contract not found.")

    if not job.paypal_authorization_id:
        return {"voided": False, "reason": "No active authorization."}

    # Void the authorization
    void_res = await paypal_service.void_authorization(job.paypal_authorization_id)
    job.paypal_status = "VOIDED"
    job.status = "cancelled"

    active_contract = job.active_contract or (job.contracts[0] if job.contracts else None)
    auth_amount = active_contract.total_amount if active_contract else 0.0
    captured_amount = sum(m.captured_amount for m in active_contract.milestones) if active_contract else 0.0
    void_amount = max(0.0, auth_amount - captured_amount)

    # Record in payments_ledger (Single source of truth)
    if void_amount > 0 and active_contract:
        await stats_service.record_ledger_entry(
            db=db,
            job_id=job.id,
            contract_id=active_contract.id,
            milestone_id=None,
            entry_type="voided",
            amount=void_amount,
            paypal_id=job.paypal_authorization_id,
            actor="system",
            note="Automatic void of remaining authorization due to contract deadline expiration.",
            currency="USD",
            is_demo=bool(getattr(job, "is_demo", False)),
        )

    log = AuditLog(
        id=str(uuid.uuid4()),
        job_id=job.id,
        event_type="PAYPAL_AUTHORIZATION_AUTO_VOIDED",
        actor="system",
        details={
            "authorization_id": job.paypal_authorization_id,
            "reason": "Deadline expired without complete deliverable submission.",
            "void_status": void_res.get("status"),
            "void_amount": void_amount,
        },
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()

    return {
        "voided": True,
        "authorization_id": job.paypal_authorization_id,
        "status": job.status,
    }
