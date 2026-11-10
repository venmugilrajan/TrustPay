import logging
import uuid
from typing import Dict, Any, Set
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Header, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.database import get_db
from backend.models.models import Job, AuditLog, WebhookEvent
from backend.services.paypal_service import paypal_service

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
logger = logging.getLogger("trustpay.webhooks")


@router.post("/paypal")
async def handle_paypal_webhook(
    request: Request,
    paypal_auth_algo: str = Header(default=""),
    paypal_cert_url: str = Header(default=""),
    paypal_transmission_id: str = Header(default=""),
    paypal_transmission_sig: str = Header(default=""),
    paypal_transmission_time: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotent PayPal Webhook listener with cryptographic signature verification
    and database-persisted deduplication in webhook_events.
    """
    body_bytes = await request.body()
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_id = event.get("id") or paypal_transmission_id or str(uuid.uuid4())

    # Persistent deduplication check
    existing_stmt = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        logger.info(f"Duplicate webhook event received: {event_id}. Skipping.")
        return {"status": "success", "note": "duplicate_ignored"}

    # Signature verification
    is_valid = await paypal_service.verify_webhook_signature(
        transmission_id=paypal_transmission_id,
        transmission_time=paypal_transmission_time,
        cert_url=paypal_cert_url,
        auth_algo=paypal_auth_algo,
        transmission_sig=paypal_transmission_sig,
        webhook_event=event,
    )

    if not is_valid:
        logger.warning("PayPal webhook signature verification failed.")
        if not paypal_service.is_mock_mode:
            raise HTTPException(status_code=400, detail="Invalid PayPal signature")

    # Persist processed event
    webhook_record = WebhookEvent(
        id=str(uuid.uuid4()),
        event_id=event_id,
        event_type=event.get("event_type", "UNKNOWN"),
        payload=event,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(webhook_record)

    event_type = event.get("event_type", "UNKNOWN")
    resource = event.get("resource", {})

    logger.info(f"Processing verified PayPal webhook: {event_type}")

    # Identify matching job from custom_id if present
    custom_id = resource.get("custom_id")
    target_job = None
    if custom_id:
        # custom_id format e.g. job_{id}_app_{id} or raw job_id
        raw_job_id = custom_id.split("_")[1] if "job_" in custom_id else custom_id
        stmt = select(Job).where(Job.id == raw_job_id)
        res = await db.execute(stmt)
        target_job = res.scalar_one_or_none()

    # Log webhook event
    if target_job:
        log = AuditLog(
            id=str(uuid.uuid4()),
            job_id=target_job.id,
            event_type=f"WEBHOOK_{event_type}",
            actor="paypal",
            details={"event_id": event_id, "summary": event.get("summary")},
            timestamp=datetime.now(timezone.utc),
        )
        db.add(log)

    await db.commit()
    return {"status": "success", "event_id": event_id, "event_type": event_type}
