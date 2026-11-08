import pytest
from pydantic import BaseModel
from backend.services.llm_service import LLMService
from backend.services.paypal_service import PayPalService
from sandbox.runner import CodeSandboxRunner
from backend.core.config import settings


class GroqTestOutput(BaseModel):
    message: str
    status: str


@pytest.mark.asyncio
async def test_live_groq_api_completion():
    """Verifies that live Groq API key generates valid structured Pydantic output."""
    orig_mock = settings.MOCK_MODE
    try:
        settings.MOCK_MODE = False
        llm = LLMService(force_mock=False)
        result = await llm.generate_structured(
            system_prompt="You are a helpful JSON assistant. Always return valid JSON.",
            user_prompt="Say Hello TrustPay with status active",
            response_model=GroqTestOutput,
        )
        assert result.status == "active"
        assert "TrustPay" in result.message
    finally:
        settings.MOCK_MODE = orig_mock


@pytest.mark.asyncio
async def test_live_paypal_sandbox_oauth_and_order():
    """Verifies live PayPal sandbox token generation and order creation with intent AUTHORIZE."""
    orig_mock = settings.MOCK_MODE
    try:
        settings.MOCK_MODE = False
        service = PayPalService(force_mock=False)
        token = await service.get_access_token()
        assert token and len(token) > 20

        order = await service.create_order_authorize(
            amount=25.00,
            currency="USD",
            reference_id="live_test_ref_01",
        )
        assert "id" in order
        assert order["status"] == "CREATED"
        assert len(order.get("links", [])) > 0
    finally:
        settings.MOCK_MODE = orig_mock


@pytest.mark.asyncio
async def test_sandbox_runner_fails_closed_without_docker():
    """Verifies that sandbox runner strictly fails closed when Docker is absent and fallback is disabled."""
    runner = CodeSandboxRunner()
    settings.ALLOW_LOCAL_SANDBOX_FALLBACK = False
    runner.has_docker = False

    res = await runner.execute_code_tests(code_content="print('hello')")
    assert res["success"] is False
    assert res["runner_mode"] == "docker_failed_closed"
    assert "SANDBOX SECURITY ERROR" in res["stderr"]
    assert res.get("security_error") is True
