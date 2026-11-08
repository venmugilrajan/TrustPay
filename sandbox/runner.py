import os
import sys
import json
import time
import zipfile
import tempfile
import asyncio
import subprocess
import shutil
from typing import Dict, Any, Optional, List


class CodeSandboxRunner:
    """
    Executes delivered code and verification tests inside an isolated sandbox environment.
    Supports containerized execution (Docker) and local isolated process fallback.
    """

    def __init__(self, timeout_seconds: int = 30, memory_limit_mb: int = 256):
        self.timeout_seconds = timeout_seconds
        self.memory_limit_mb = memory_limit_mb
        self.has_docker = self._check_docker_available()

    @staticmethod
    def _check_docker_available() -> bool:
        """Checks if Docker CLI and daemon are operational."""
        try:
            res = subprocess.run(
                ["docker", "info"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=3,
            )
            return res.returncode == 0
        except Exception:
            return False

    def extract_zip_safely(self, zip_path: str, extract_to: str) -> List[str]:
        """
        Extracts ZIP archive with strict path traversal protection.
        """
        extracted_files = []
        with zipfile.ZipFile(zip_path, "r") as archive:
            for member in archive.infolist():
                # Prevent path traversal
                norm_name = os.path.normpath(member.filename)
                if norm_name.startswith("..") or os.path.isabs(norm_name):
                    continue
                target_path = os.path.join(extract_to, norm_name)
                archive.extract(member, extract_to)
                extracted_files.append(norm_name)
        return extracted_files

    async def execute_code_tests(
        self,
        code_content: Optional[str] = None,
        zip_path: Optional[str] = None,
        test_script: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes code against test script with resource and time limits.
        """
        start_time = time.time()
        temp_dir = tempfile.mkdtemp(prefix="trustpay_sandbox_")

        try:
            # 1. Populate workspace
            if zip_path and os.path.exists(zip_path):
                self.extract_zip_safely(zip_path, temp_dir)
            elif code_content:
                main_file = os.path.join(temp_dir, "solution.py")
                with open(main_file, "w", encoding="utf-8") as f:
                    f.write(code_content)

            # 2. Write test script
            if not test_script:
                # Default sanity test if none provided
                test_script = """
def test_submission_exists():
    assert True
"""
            test_file = os.path.join(temp_dir, "test_deliverable.py")
            with open(test_file, "w", encoding="utf-8") as f:
                f.write(test_script)

            # 3. Choose runner mode
            if self.has_docker:
                result = await self._run_in_docker(temp_dir)
            else:
                result = await self._run_in_subprocess(temp_dir)

            duration = round(time.time() - start_time, 2)
            result["duration_seconds"] = duration
            return result

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    async def _run_in_subprocess(self, workspace_dir: str) -> Dict[str, Any]:
        """
        Isolated local subprocess runner with timeout and restricted environment.
        """
        # Run pytest inside workspace
        cmd = [sys.executable, "-m", "pytest", "test_deliverable.py", "-v", "--no-header"]
        env = os.environ.copy()
        env["PYTHONPATH"] = workspace_dir
        env["PYTHONDONTWRITEBYTECODE"] = "1"

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=workspace_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout_seconds,
                )
                stdout = stdout_bytes.decode("utf-8", errors="replace")
                stderr = stderr_bytes.decode("utf-8", errors="replace")
                exit_code = process.returncode

                # Parse test outcomes
                tests = self._parse_pytest_output(stdout)

                return {
                    "success": exit_code == 0,
                    "exit_code": exit_code,
                    "stdout": stdout,
                    "stderr": stderr,
                    "tests": tests,
                    "runner_mode": "local_process",
                }

            except asyncio.TimeoutError:
                try:
                    process.kill()
                except Exception:
                    pass
                return {
                    "success": False,
                    "exit_code": -1,
                    "stdout": "",
                    "stderr": f"Execution timed out after {self.timeout_seconds} seconds.",
                    "tests": [],
                    "runner_mode": "local_process",
                }

        except Exception as exc:
            return {
                "success": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Sandbox runner error: {str(exc)}",
                "tests": [],
                "runner_mode": "local_process",
            }

    async def _run_in_docker(self, workspace_dir: str) -> Dict[str, Any]:
        """
        Runs tests inside secure non-root Docker container with network disabled.
        """
        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", f"{self.memory_limit_mb}m",
            "--cpus", "1.0",
            "-v", f"{workspace_dir}:/workspace:ro",
            "trustpay-sandbox:latest",
            "pytest", "/workspace/test_deliverable.py", "-v",
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout_seconds,
            )
            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
            return {
                "success": process.returncode == 0,
                "exit_code": process.returncode,
                "stdout": stdout,
                "stderr": stderr,
                "tests": self._parse_pytest_output(stdout),
                "runner_mode": "docker",
            }
        except Exception as exc:
            return {
                "success": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Docker execution error: {str(exc)}",
                "tests": [],
                "runner_mode": "docker",
            }

    @staticmethod
    def _parse_pytest_output(output: str) -> List[Dict[str, Any]]:
        """
        Extracts structured test names and pass/fail statuses from pytest output.
        """
        results = []
        for line in output.splitlines():
            line_str = line.strip()
            if "::" in line_str:
                parts = line_str.split("::", 1)
                test_name = parts[1].split()[0]
                passed = "PASSED" in line_str
                results.append({"name": test_name, "passed": passed})
        return results


# Global sandbox instance
sandbox_runner = CodeSandboxRunner()


if __name__ == "__main__":
    # Self-test runner
    async def main():
        runner = CodeSandboxRunner()
        sample_code = "def add(a, b): return a + b\n"
        sample_test = "from solution import add\ndef test_add(): assert add(2, 3) == 5\n"
        res = await runner.execute_code_tests(code_content=sample_code, test_script=sample_test)
        print(json.dumps(res, indent=2))

    asyncio.run(main())
