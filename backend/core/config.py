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

    # Mock mode flag: default False so live path is primary
    MOCK_MODE: bool = False

    DATABASE_URL: str = "sqlite+aiosqlite:///./trustpay.db"

    # Groq API Configuration
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    # Anthropic API Configuration
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-5-5"

    # PayPal Sandbox Configuration
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_WEBHOOK_ID: str = ""

    # Sandbox Configuration
    SANDBOX_MODE: str = "docker"
    SANDBOX_TIMEOUT_SECONDS: int = 30
    ALLOW_LOCAL_SANDBOX_FALLBACK: bool = False
    HUMAN_OVERRIDE_ENABLED: bool = False


settings = Settings()
