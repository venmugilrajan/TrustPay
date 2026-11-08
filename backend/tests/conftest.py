import pytest_asyncio
from backend.core.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    """Initializes tables in database before tests run."""
    await init_db()
