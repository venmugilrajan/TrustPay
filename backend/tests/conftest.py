import pytest_asyncio
from backend.core.database import init_db
from backend.core.config import settings


@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    """Initializes tables in database before tests run and enables mock mode for offline safety."""
    await init_db()
    # Ensure offline test suite runs with simulated sandbox and local process isolation
    settings.MOCK_MODE = True
    settings.ALLOW_LOCAL_SANDBOX_FALLBACK = True
