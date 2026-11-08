from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


def _migrate_sqlite_columns(connection):
    """Auto-migrates SQLite tables when schema columns are added."""
    inspector = inspect(connection)
    tables = inspector.get_table_names()
    if "jobs" in tables:
        cols = {c["name"] for c in inspector.get_columns("jobs")}
        if "client_id" not in cols:
            connection.execute(text("ALTER TABLE jobs ADD COLUMN client_id VARCHAR(100) DEFAULT 'client_default'"))
        if "deliverables" not in cols:
            connection.execute(text("ALTER TABLE jobs ADD COLUMN deliverables TEXT"))
        if "public_budget_estimate" not in cols:
            connection.execute(text("ALTER TABLE jobs ADD COLUMN public_budget_estimate VARCHAR(100)"))
        if "priorities" not in cols:
            connection.execute(text("ALTER TABLE jobs ADD COLUMN priorities VARCHAR(50) DEFAULT 'quality'"))
        if "must_haves" not in cols:
            connection.execute(text("ALTER TABLE jobs ADD COLUMN must_haves TEXT"))
        if "active_contract_id" not in cols:
            connection.execute(text("ALTER TABLE jobs ADD COLUMN active_contract_id VARCHAR(36)"))

    if "contracts" in tables:
        indexes = connection.execute(text("PRAGMA index_list(contracts)")).fetchall()
        has_unique_non_pk = any(idx[2] == 1 and idx[3] == "u" for idx in indexes)
        if has_unique_non_pk:
            cols = {c["name"] for c in inspector.get_columns("contracts")}
            app_col = "application_id" if "application_id" in cols else "NULL as application_id"
            connection.execute(text("""
                CREATE TABLE contracts_new (
                    id VARCHAR(36) PRIMARY KEY,
                    job_id VARCHAR(36) NOT NULL,
                    application_id VARCHAR(36),
                    total_amount FLOAT NOT NULL,
                    currency VARCHAR(10) NOT NULL,
                    deadline VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE,
                    FOREIGN KEY(application_id) REFERENCES applications (id) ON DELETE SET NULL
                )
            """))
            connection.execute(text(f"""
                INSERT INTO contracts_new (id, job_id, application_id, total_amount, currency, deadline, status, created_at, updated_at)
                SELECT id, job_id, {app_col}, total_amount, currency, deadline, status, created_at, updated_at FROM contracts
            """))
            connection.execute(text("DROP TABLE contracts"))
            connection.execute(text("ALTER TABLE contracts_new RENAME TO contracts"))
        else:
            cols = {c["name"] for c in inspector.get_columns("contracts")}
            if "application_id" not in cols:
                connection.execute(text("ALTER TABLE contracts ADD COLUMN application_id VARCHAR(36)"))

    if "negotiation_turns" in tables:
        cols = {c["name"] for c in inspector.get_columns("negotiation_turns")}
        if "application_id" not in cols:
            connection.execute(text("ALTER TABLE negotiation_turns ADD COLUMN application_id VARCHAR(36)"))


async def get_db():
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initializes database tables and applies lightweight SQLite migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_sqlite_columns)

