import os
import json
import logging
import re
from typing import Type, TypeVar, Optional, Dict, Any, List
from pydantic import BaseModel
import anthropic

from backend.core.config import settings

logger = logging.getLogger("trustpay.llm")

T = TypeVar("T", bound=BaseModel)

# Prompt injection markers to safeguard against malicious deliverables/submissions
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"system\s*:\s*override",
    r"you\s+must\s+(give|award|assign)\s+(a\s+)?score\s+(of\s+)?(1\.0|100%|pass)",
    r"judge\s+verdict\s*:\s*pass",
    r"disregard\s+(the\s+)?criteria",
    r"bypass\s+verification",
    r"new\s+system\s+prompt",
]


class LLMServiceError(Exception):
    """Raised when LLM call or JSON parsing fails after retries."""
    pass


class LLMService:
    """
    Centralized LLM service interface.
    All agent prompts and Claude API interactions execute strictly through this service.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL
        self._client: Optional[anthropic.AsyncAnthropic] = None

    @property
    def is_mock_mode(self) -> bool:
        if not self.api_key or self.api_key.startswith("your_") or "placeholder" in self.api_key.lower():
            return True
        return False

    def _get_client(self) -> anthropic.AsyncAnthropic:
        if self._client is None:
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
        return self._client

    @staticmethod
    def detect_prompt_injection(content: str) -> bool:
        """
        Scans content for common prompt injection patterns.
        """
        if not content:
            return False
        content_lower = content.lower()
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, content_lower):
                logger.warning(f"Prompt injection detected matching pattern: {pattern}")
                return True
        return False

    @staticmethod
    def extract_json(raw_text: str) -> str:
        """
        Cleans markdown formatting and extracts the first valid JSON block.
        """
        text = raw_text.strip()
        # Remove ```json ... ``` code fence if present
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Regex fallback for any embedded json object
        json_match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if json_match:
            return json_match.group(1).strip()
        return text

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.2,
        max_retries: int = 2,
        mock_generator_fn: Optional[Any] = None,
    ) -> T:
        """
        Calls Claude API and enforces strict Pydantic JSON parsing with up to 2 retries.
        """
        if self.is_mock_mode:
            logger.info("Using simulated LLM response (mock mode active)")
            if mock_generator_fn:
                return mock_generator_fn(response_model)
            # Default empty/default instantiation if no mock generator provided
            try:
                return response_model.model_validate({})
            except Exception:
                raise LLMServiceError("Mock generator required for response_model with non-default fields")

        client = self._get_client()
        last_error = None
        attempt_prompt = user_prompt

        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Calling Claude ({self.model}), attempt {attempt + 1}/{max_retries + 1}")
                response = await client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    temperature=temperature,
                    system=system_prompt,
                    messages=[{"role": "user", "content": attempt_prompt}],
                )

                response_text = ""
                for block in response.content:
                    if getattr(block, "type", None) == "text":
                        response_text += block.text

                json_str = self.extract_json(response_text)
                parsed_json = json.loads(json_str)
                validated_obj = response_model.model_validate(parsed_json)
                return validated_obj

            except (json.JSONDecodeError, Exception) as exc:
                last_error = exc
                logger.warning(f"LLM output parsing failed on attempt {attempt + 1}: {exc}")
                if attempt < max_retries:
                    attempt_prompt = (
                        f"{user_prompt}\n\n"
                        f"IMPORTANT: Your previous output failed JSON validation with error: {str(exc)}.\n"
                        f"Output ONLY valid JSON matching the exact schema."
                    )

        raise LLMServiceError(f"Failed to obtain valid structured JSON from LLM after {max_retries + 1} attempts: {last_error}")


# Global default instance
llm_service = LLMService()
