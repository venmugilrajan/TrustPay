import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    DEMO_TOOLS: bool = True

    # Mock mode flag: default False so live path is primary
    MOCK_MODE: bool = False

    DATABASE_URL: str = "sqlite+aiosqlite:///./trustpay.db"

    # LLM Provider selection: "groq" (default) or "anthropic"
    LLM_PROVIDER: str = "groq"

    # Groq API Configuration
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Anthropic API Configuration
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # PayPal Sandbox Configuration
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_WEBHOOK_ID: str = ""

    # Sandbox Configuration: "e2b" | "docker" | "disabled" | "mock"
    SANDBOX_PROVIDER: str = "disabled"
    SANDBOX_TIMEOUT_SECONDS: int = 30
    E2B_API_KEY: str = ""
    HUMAN_OVERRIDE_ENABLED: bool = False

    # Security & Auth
    SECRET_KEY: str = "trustpay-super-secret-jwt-key-hackathon-2026-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days


settings = Settings()
