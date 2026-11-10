import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from backend.core.config import settings
from backend.services.sandbox_service import (
    sandbox_service,
    DisabledSandboxProvider,
    MockSandboxProvider,
    DockerSandboxProvider,
    E2BSandboxProvider,
)
from backend.agents.judge_agent import run_judge_agent_evaluation


@pytest.mark.asyncio
async def test_provider_selection():
    """Verifies that SandboxService correctly selects the configured provider."""
    orig_mock = settings.MOCK_MODE
    try:
        settings.MOCK_MODE = False

        provider_disabled = sandbox_service.get_provider("disabled")
        assert isinstance(provider_disabled, DisabledSandboxProvider)

        provider_mock = sandbox_service.get_provider("mock")
        assert isinstance(provider_mock, MockSandboxProvider)

        provider_docker = sandbox_service.get_provider("docker")
        assert isinstance(provider_docker, DockerSandboxProvider)

        provider_e2b = sandbox_service.get_provider("e2b")
        assert isinstance(provider_e2b, E2BSandboxProvider)
    finally:
        settings.MOCK_MODE = orig_mock


@pytest.mark.asyncio
async def test_disabled_provider_execution():
    """Verifies that disabled provider returns executed=False with clear labeling."""
    provider = DisabledSandboxProvider()
    result = await provider.execute(
        code_content="def solution(): return 42",
        test_script="def test_solution(): assert True",
    )

    assert result["success"] is True
    assert result["executed"] is False
    assert result["runner_mode"] == "disabled"
    assert result["message"] == "Tests were not executed"
    assert result["needs_manual_review"] is False
    assert len(result["tests"]) == 0


@pytest.mark.asyncio
async def test_mock_provider_execution():
    """Verifies that mock provider returns deterministic test execution results labeled as mock."""
    provider = MockSandboxProvider()
    result = await provider.execute(
        code_content="def solution(): return 42",
        test_script="def test_solution(): assert True",
    )

    assert result["success"] is True
    assert result["executed"] is True
    assert result["runner_mode"] == "mock"
    assert result["needs_manual_review"] is False
    assert len(result["tests"]) >= 2
    assert all(t["passed"] for t in result["tests"])


@pytest.mark.asyncio
async def test_docker_provider_fails_closed_when_unavailable():
    """
    Verifies that DockerSandboxProvider strictly FAILS CLOSED when Docker daemon is not running:
    never falls back to host execution, flags needs_manual_review=True.
    """
    provider = DockerSandboxProvider()
    with patch.object(DockerSandboxProvider, "is_docker_available", return_value=False):
        result = await provider.execute(code_content="import sys; sys.exit(0)")

        assert result["success"] is False
        assert result["executed"] is False
        assert result["runner_mode"] == "docker_failed_closed"
        assert result["needs_manual_review"] is True
        assert "DOCKER SECURITY ERROR" in result["stderr"]
        assert len(result["tests"]) == 0


@pytest.mark.asyncio
async def test_e2b_provider_fails_closed_without_api_key():
    """
    Verifies that E2BSandboxProvider strictly FAILS CLOSED when E2B_API_KEY is not configured:
    never falls back to host execution, flags needs_manual_review=True.
    """
    provider = E2BSandboxProvider(api_key=None)
    with patch.dict(os.environ, {}, clear=True):
        with patch.object(settings, "E2B_API_KEY", ""):
            result = await provider.execute(code_content="print('test')")

            assert result["success"] is False
            assert result["executed"] is False
            assert result["runner_mode"] == "e2b_failed_closed"
            assert result["needs_manual_review"] is True
            assert "E2B SECURITY ERROR" in result["stderr"]
            assert len(result["tests"]) == 0


@pytest.mark.asyncio
async def test_e2b_sandbox_cleanup_on_error():
    """
    Verifies that E2BSandboxProvider guarantees sandbox destruction (sandbox.kill())
    in a try/finally block even when commands error out.
    """
    mock_sandbox = MagicMock()
    mock_sandbox.commands.run.side_effect = RuntimeError("Simulated execution failure in cloud VM")

    provider = E2BSandboxProvider(api_key="e2b_test_fake_key")

    with patch("e2b.Sandbox.create", return_value=mock_sandbox):
        result = await provider.execute(
            code_content="print('hello')",
            test_script="def test_fail(): assert True",
        )

        # Assert sandbox.kill() was called in finally
        mock_sandbox.kill.assert_called_once()

        # Assert fail-closed state was captured
        assert result["success"] is False
        assert result["executed"] is False
        assert result["needs_manual_review"] is True
        assert result["runner_mode"] == "e2b_failed_closed"
        assert "Simulated execution failure" in result["stderr"]


@pytest.mark.asyncio
async def test_judge_agent_disabled_sandbox_labeling():
    """
    Verifies that Judge Agent properly evaluates when tests were not executed,
    and reports evidence stating automated tests were not executed.
    """
    criteria = [
        {"id": "c1", "text": "Endpoint returns 200 OK", "weight": 1.0},
        {"id": "c2", "text": "Code contains robust error handling", "weight": 1.0},
    ]

    disabled_sandbox_result = {
        "success": True,
        "executed": False,
        "exit_code": 0,
        "stdout": "",
        "stderr": "",
        "tests": [],
        "runner_mode": "disabled",
        "provider": "disabled",
        "message": "Tests were not executed",
        "needs_manual_review": False,
    }

    eval_output = await run_judge_agent_evaluation(
        milestone_title="Build API endpoint",
        milestone_description="Create FastAPI router for payments",
        acceptance_criteria=criteria,
        submission_type="code",
        deliverable_content="def app(): return {'status': 'ok'}",
        sandbox_results=disabled_sandbox_result,
    )

    assert eval_output.overall_score > 0.0
    for crit in eval_output.per_criterion_results:
        assert "automated tests were not executed" in crit.evidence.lower() or "tests were not executed" in crit.evidence.lower()

