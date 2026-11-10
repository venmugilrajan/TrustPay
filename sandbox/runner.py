import os
import sys
from typing import Dict, Any, Optional, List

from backend.core.config import settings
from backend.services.sandbox_service import sandbox_service, DockerSandboxProvider, parse_pytest_output


class SandboxSecurityError(RuntimeError):
    """Raised when sandbox security requirements cannot be satisfied."""
    pass


class CodeSandboxRunner:
    """
    Executes delivered code and verification tests inside a secure Docker container or delegates
    to the pluggable SandboxService.
    Strictly FAIL CLOSED: Never falls back to host execution.
    """

    def __init__(self, timeout_seconds: int = 30, memory_limit_mb: int = 256):
        self.timeout_seconds = timeout_seconds
        self.memory_limit_mb = memory_limit_mb
        self._docker_provider = DockerSandboxProvider(memory_limit_mb=memory_limit_mb)
        self.has_docker = DockerSandboxProvider.is_docker_available()

    async def execute_code_tests(
        self,
        code_content: Optional[str] = None,
        zip_path: Optional[str] = None,
        test_script: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes code using sandbox_service. If Docker provider is chosen and Docker is absent,
        it strictly fails closed without executing on the host.
        """
        return await sandbox_service.execute_submission_tests(
            code_content=code_content,
            zip_path=zip_path,
            test_script=test_script,
            timeout_seconds=self.timeout_seconds,
        )


# Global instance
sandbox_runner = CodeSandboxRunner()
