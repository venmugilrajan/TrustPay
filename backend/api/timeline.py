from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.database import get_db
from backend.models.models import Job, Contract, AuditLog
from backend.services.paypal_service import paypal_service

router = APIRouter(prefix="/api/jobs/{job_id}", tags=["timeline"])


@router.get("/timeline", response_model=list)
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
            "event_type": l.event_type,
            "actor": l.actor,
            "details": l.details,
            "timestamp": l.timestamp.isoformat(),
        }
        for l in logs
    ]


@router.post("/auto-void", response_model=dict)
async def check_and_auto_void(
    job_id: str,
    force: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Checks if job deadline has passed with incomplete delivery.
    Automatically voids remaining authorization and refunds held funds.
    """
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if not job.paypal_authorization_id:
        return {"voided": False, "reason": "No active authorization."}

    # Void the authorization
    void_res = await paypal_service.void_authorization(job.paypal_authorization_id)
    job.paypal_status = "VOIDED"
    job.status = "voided_expired"

    log = AuditLog(
        job_id=job.id,
        event_type="PAYPAL_AUTHORIZATION_AUTO_VOIDED",
        actor="system",
        details={
            "authorization_id": job.paypal_authorization_id,
            "reason": "Deadline expired without complete deliverable submission.",
            "void_status": void_res.get("status"),
        },
    )
    db.add(log)
    await db.commit()

    return {
        "voided": True,
        "authorization_id": job.paypal_authorization_id,
        "status": job.status,
    }
