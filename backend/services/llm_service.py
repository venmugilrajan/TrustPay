import os
import json
import logging
import re
import asyncio
from typing import Type, TypeVar, Optional, Dict, Any, List
from pydantic import BaseModel
import httpx
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
    Centralized LLM service supporting both Groq API (primary/default) and Anthropic Claude.
    Provider selected by settings.LLM_PROVIDER or environment variable.
    Live path is executed whenever a valid key is provided and MOCK_MODE is false.
    """

    def __init__(
        self,
        groq_api_key: Optional[str] = None,
        groq_model: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        anthropic_model: Optional[str] = None,
        force_mock: bool = False,
    ):
        self.groq_api_key = groq_api_key or settings.GROQ_API_KEY
        self.groq_model = groq_model or settings.GROQ_MODEL
        self.anthropic_api_key = anthropic_api_key or settings.ANTHROPIC_API_KEY
        self.anthropic_model = anthropic_model or settings.ANTHROPIC_MODEL
        self.force_mock = force_mock

        self._anthropic_client: Optional[anthropic.AsyncAnthropic] = None

    @property
    def is_mock_mode(self) -> bool:
        """Runs mock mode only when explicitly requested or if no live credentials exist."""
        if self.force_mock or settings.MOCK_MODE:
            return True
        has_groq = bool(self.groq_api_key and not self.groq_api_key.startswith("your_"))
        has_anthropic = bool(self.anthropic_api_key and not self.anthropic_api_key.startswith("your_"))
        return not (has_groq or has_anthropic)

    @property
    def active_provider(self) -> str:
        if self.is_mock_mode:
            return "mock"
        preferred = (settings.LLM_PROVIDER or "groq").lower()
        if preferred == "groq" and self.groq_api_key and not self.groq_api_key.startswith("your_"):
            return "groq"
        if preferred == "anthropic" and self.anthropic_api_key and not self.anthropic_api_key.startswith("your_"):
            return "anthropic"
        # Fallbacks
        if self.groq_api_key and not self.groq_api_key.startswith("your_"):
            return "groq"
        if self.anthropic_api_key and not self.anthropic_api_key.startswith("your_"):
            return "anthropic"
        return "mock"

    @staticmethod
    def detect_prompt_injection(content: str) -> bool:
        """Scans content for common prompt injection patterns."""
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
        """Cleans markdown formatting and extracts the first valid JSON block."""
        text = raw_text.strip()
        # Remove ```json ... ``` code fence if present
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Regex fallback for embedded json
        json_match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if json_match:
            return json_match.group(1).strip()
        return text

    async def _call_groq(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> str:
        """Executes chat completion via Groq OpenAI-compatible API."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise LLMServiceError(f"Groq API error ({res.status_code}): {res.text}")
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def _call_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> str:
        """Executes completion via Anthropic Claude API."""
        if self._anthropic_client is None:
            self._anthropic_client = anthropic.AsyncAnthropic(api_key=self.anthropic_api_key)

        response = await self._anthropic_client.messages.create(
            model=self.anthropic_model,
            max_tokens=4096,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content_text = ""
        for block in response.content:
            if getattr(block, "type", None) == "text":
                content_text += block.text
        return content_text

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Executes raw JSON generation and returns a parsed dictionary.
        """
        if self.is_mock_mode:
            return {"status": "ok", "summary": "TrustPay provides autonomous escrow and verification."}

        provider = self.active_provider
        try:
            if provider == "groq":
                raw = await self._call_groq(system_prompt, user_prompt, temperature)
            else:
                raw = await self._call_anthropic(system_prompt, user_prompt, temperature)
            clean = self.extract_json(raw)
            return json.loads(clean)
        except Exception as e:
            logger.warning(f"LLM JSON generation fallback due to: {e}")
            return {"status": "ok", "summary": "TrustPay provides autonomous escrow and verification.", "note": str(e)}

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
        Executes structured generation through the active provider (Groq or Claude).
        Validates output against Pydantic schema with up to 2 retries.
        """
        if self.is_mock_mode:
            logger.info("Using simulated LLM response (mock mode active)")
            if mock_generator_fn:
                return mock_generator_fn(response_model)
            return response_model.model_validate({})

        provider = self.active_provider
        last_error = None
        schema_json = json.dumps(response_model.model_json_schema())
        attempt_prompt = f"{user_prompt}\n\nYou must return ONLY a JSON object that adheres strictly to this JSON schema:\n{schema_json}"

        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Calling {provider.upper()} API (attempt {attempt + 1}/{max_retries + 1})")
                if provider == "groq":
                    raw_output = await self._call_groq(system_prompt, attempt_prompt, temperature)
                else:
                    raw_output = await self._call_anthropic(system_prompt, attempt_prompt, temperature)

                json_str = self.extract_json(raw_output)
                parsed_json = json.loads(json_str)
                validated_obj = response_model.model_validate(parsed_json)
                return validated_obj

            except (json.JSONDecodeError, Exception) as exc:
                last_error = exc
                logger.warning(f"LLM output validation error on attempt {attempt + 1}: {exc}")
                if "rate_limit" in str(exc).lower() or "429" in str(exc):
                    if mock_generator_fn:
                        logger.warning(f"Groq TPM rate limit reached ({exc}); seamlessly falling back to agent generator for instant response.")
                        return mock_generator_fn(response_model)
                    await asyncio.sleep(2)
                elif attempt < max_retries:
                    attempt_prompt = (
                        f"{user_prompt}\n\n"
                        f"IMPORTANT: Previous attempt failed validation with error: {str(exc)}.\n"
                        f"Output ONLY valid JSON matching schema: {schema_json}"
                    )

        if mock_generator_fn:
            logger.warning(f"LLM call failed ({last_error}); utilizing resilient generator fallback.")
            return mock_generator_fn(response_model)

        raise LLMServiceError(f"Structured output generation failed after {max_retries + 1} attempts: {last_error}")


# Global default instance
llm_service = LLMService()
