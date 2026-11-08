#!/usr/bin/env python3
"""
TrustPay PayPal Sandbox Smoke Test Script.
Runs the complete lifecycle:
  1. Create Order with intent AUTHORIZE
  2. Authorize the Order
  3. Perform a Partial Capture ($40 of $100) with final_capture=False
  4. Void the remaining Authorization ($60)

Usage:
  python scripts/paypal_smoke_test.py [--mock]
"""

import sys
import os
import asyncio
import logging

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.core.config import settings
from backend.services.paypal_service import PayPalService, PayPalServiceError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("smoke_test")


async def run_smoke_test(force_mock: bool = False):
    logger.info("==================================================")
    logger.info(" TrustPay PayPal Sandbox Smoke Test")
    logger.info("==================================================")

    service = PayPalService(force_mock=force_mock)
    mode_str = "SIMULATED / MOCK SANDBOX" if service.is_mock_mode else f"LIVE SANDBOX ({service.base_url})"
    logger.info(f"Running mode: {mode_str}")

    total_amount = 100.00
    partial_amount = 40.00
    currency = "USD"
    reference_id = "smoke_job_001"

    # Step 1: Create Order with intent: AUTHORIZE
    logger.info(f"[1/4] Creating Order with intent AUTHORIZE for {currency} {total_amount:.2f}...")
    order = await service.create_order_authorize(
        amount=total_amount,
        currency=currency,
        reference_id=reference_id,
        custom_id="test_smoke_custom_id",
    )
    order_id = order.get("id")
    assert order_id, "Order creation failed: missing order ID"
    logger.info(f"  ✓ Order Created: ID = {order_id}, Status = {order.get('status')}")

    # Step 2: Authorize the Order
    logger.info(f"[2/4] Authorizing Order {order_id}...")
    auth_res = await service.authorize_order(order_id)
    auth_id = auth_res.get("authorization_id")
    assert auth_id, "Authorize failed: missing authorization_id"
    logger.info(f"  ✓ Order Authorized: Authorization ID = {auth_id}")

    # Step 3: Partial Capture ($40 of $100)
    logger.info(f"[3/4] Executing Partial Capture of {currency} {partial_amount:.2f} (final_capture=False)...")
    capture_res = await service.capture_authorization(
        authorization_id=auth_id,
        amount=partial_amount,
        final_capture=False,
        currency=currency,
    )
    capture_id = capture_res.get("id")
    assert capture_id, "Capture failed: missing capture ID"
    logger.info(f"  ✓ Partial Capture Success: Capture ID = {capture_id}, Status = {capture_res.get('status')}")

    # Step 4: Void remaining authorization
    logger.info(f"[4/4] Voiding remaining authorization {auth_id}...")
    void_res = await service.void_authorization(authorization_id=auth_id)
    assert void_res.get("status") == "VOIDED", "Void failed"
    logger.info(f"  ✓ Authorization Successfully Voided: Status = {void_res.get('status')}")

    logger.info("==================================================")
    logger.info("🎉 Smoke Test PASSED: Full PayPal lifecycle verified!")
    logger.info("==================================================")
    return True


if __name__ == "__main__":
    force_mock = "--mock" in sys.argv
    try:
        success = asyncio.run(run_smoke_test(force_mock=force_mock))
        sys.exit(0 if success else 1)
    except Exception as exc:
        logger.error(f"❌ Smoke Test FAILED: {exc}", exc_info=True)
        sys.exit(1)
