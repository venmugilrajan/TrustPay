import logging
from typing import Dict, Any, Set
from fastapi import APIRouter, Request, Header, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.database import get_db
from backend.models.models import Job, AuditLog
from backend.services.paypal_service import paypal_service

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
logger = logging.getLogger("trustpay.webhooks")

# In-memory deduplication set for idempotency
_processed_events: Set[str] = set()


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
    Idempotent PayPal Webhook listener with cryptographic signature verification.
    """
    body_bytes = await request.body()
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_id = event.get("id") or paypal_transmission_id
    if event_id in _processed_events:
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
        # In non-mock mode, reject invalid signatures
        if not paypal_service.is_mock_mode:
            raise HTTPException(status_code=400, detail="Invalid PayPal signature")

    _processed_events.add(event_id)
    event_type = event.get("event_type", "UNKNOWN")
    resource = event.get("resource", {})

    logger.info(f"Processing verified PayPal webhook: {event_type}")

    # Identify matching job from custom_id or reference_id if present
    custom_id = resource.get("custom_id")
    target_job = None
    if custom_id:
        stmt = select(Job).where(Job.id == custom_id)
        res = await db.execute(stmt)
        target_job = res.scalar_one_or_none()

    # Log webhook event
    if target_job:
        log = AuditLog(
            job_id=target_job.id,
            event_type=f"WEBHOOK_{event_type}",
            actor="paypal",
            details={"event_id": event_id, "summary": event.get("summary")},
        )
        db.add(log)
        await db.commit()

    return {"status": "success", "event_id": event_id, "event_type": event_type}

