import pytest
from datetime import datetime, timezone, timedelta
from backend.services.paypal_service import PayPalService, PayPalServiceError


@pytest.mark.asyncio
async def test_paypal_mock_token_caching():
    service = PayPalService(force_mock=True)
    token1 = await service.get_access_token()
    token2 = await service.get_access_token()
    assert token1.startswith("mock_access_token")
    assert token1 == token2


@pytest.mark.asyncio
async def test_create_order_authorize():
    service = PayPalService(force_mock=True)
    order = await service.create_order_authorize(
        amount=500.00,
        currency="USD",
        reference_id="job_ref_42",
        custom_id="custom_user_1",
    )
    assert order["id"].startswith("ORDER-MOCK-")
    assert order["status"] == "CREATED"
    assert order["intent"] == "AUTHORIZE"
    assert order["purchase_units"][0]["amount"]["value"] == "500.00"
    assert len(order["links"]) > 0
    assert "checkoutnow" in order["links"][0]["href"]


@pytest.mark.asyncio
async def test_authorize_order():
    service = PayPalService(force_mock=True)
    order = await service.create_order_authorize(amount=300.00, reference_id="job_300")
    order_id = order["id"]

    auth_result = await service.authorize_order(order_id)
    assert auth_result["id"] == order_id
    assert auth_result["status"] == "COMPLETED"
    assert "authorization_id" in auth_result
    auth_id = auth_result["authorization_id"]
    assert auth_id.startswith("AUTH-MOCK-")
    assert auth_result["authorization"]["amount"]["value"] == "300.00"


@pytest.mark.asyncio
async def test_partial_and_final_capture():
    service = PayPalService(force_mock=True)
    order = await service.create_order_authorize(amount=1000.00, reference_id="job_1000")
    auth_result = await service.authorize_order(order["id"])
    auth_id = auth_result["authorization_id"]

    # Milestone 1: Partial Capture ($400)
    capture1 = await service.capture_authorization(
        authorization_id=auth_id,
        amount=400.00,
        final_capture=False,
    )
    assert capture1["id"].startswith("CAPTURE-MOCK-")
    assert capture1["status"] == "COMPLETED"
    assert capture1["amount"]["value"] == "400.00"
    assert capture1["final_capture"] is False

    # Milestone 2: Final Capture ($600)
    capture2 = await service.capture_authorization(
        authorization_id=auth_id,
        amount=600.00,
        final_capture=True,
    )
    assert capture2["status"] == "COMPLETED"
    assert capture2["amount"]["value"] == "600.00"
    assert capture2["final_capture"] is True


@pytest.mark.asyncio
async def test_void_authorization():
    service = PayPalService(force_mock=True)
    order = await service.create_order_authorize(amount=200.00, reference_id="job_200")
    auth_res = await service.authorize_order(order["id"])
    auth_id = auth_res["authorization_id"]

    void_res = await service.void_authorization(auth_id)
    assert void_res["status"] == "VOIDED"
    assert void_res["authorization_id"] == auth_id


@pytest.mark.asyncio
async def test_refund_capture():
    service = PayPalService(force_mock=True)
    refund = await service.refund_capture(capture_id="CAPTURE-12345", amount=50.00)
    assert refund["id"].startswith("REFUND-MOCK-")
    assert refund["status"] == "COMPLETED"
    assert refund["amount"]["value"] == "50.00"


@pytest.mark.asyncio
async def test_reauthorize():
    service = PayPalService(force_mock=True)
    reauth = await service.reauthorize(authorization_id="AUTH-12345", amount=500.00)
    assert reauth["id"].startswith("REAUTH-MOCK-")
    assert reauth["parent_authorization_id"] == "AUTH-12345"
    assert reauth["amount"]["value"] == "500.00"


def test_is_authorization_expiring_soon():
    now = datetime.now(timezone.utc)

    # 10 hours remaining -> expiring soon (< 24h threshold)
    exp_soon = (now + timedelta(hours=10)).isoformat()
    assert PayPalService.is_authorization_expiring_soon(exp_soon, threshold_hours=24) is True

    # 48 hours remaining -> not expiring soon (> 24h threshold)
    exp_later = (now + timedelta(hours=48)).isoformat()
    assert PayPalService.is_authorization_expiring_soon(exp_later, threshold_hours=24) is False

    # None or invalid format returns False gracefully
    assert PayPalService.is_authorization_expiring_soon(None) is False
    assert PayPalService.is_authorization_expiring_soon("invalid-date") is False

