import os
import tempfile
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.core.database import Base, get_db
from backend.core.config import settings
from backend.main import app


@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    """
    Initializes isolated tables in a temporary test database for every test session,
    ensuring live trustpay.db is NEVER touched or corrupted by pytest.
    """
    settings.MOCK_MODE = True
    settings.SANDBOX_PROVIDER = "mock"

    fd, temp_db_path = tempfile.mkstemp(suffix="_test_trustpay.db")
    os.close(fd)
    test_db_url = f"sqlite+aiosqlite:///{temp_db_path}"

    test_engine = create_async_engine(test_db_url, echo=False)
    test_sessionmaker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with test_sessionmaker() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    yield

    app.dependency_overrides.pop(get_db, None)
    await test_engine.dispose()
    try:
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)
    except Exception:
        pass
