from sqlalchemy import inspect, text, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False, "timeout": 30} if "sqlite" in settings.DATABASE_URL else {}
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
            connection.execute(text("ALTER TABLE jobs ADD COLUMN client_id VARCHAR(100) DEFAULT 'client-maya'"))
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

    if "milestones" in tables:
        cols = {c["name"] for c in inspector.get_columns("milestones")}
        if "paid_amount" not in cols:
            connection.execute(text("ALTER TABLE milestones ADD COLUMN paid_amount FLOAT DEFAULT 0.0"))
        if "resubmissions_used" not in cols:
            connection.execute(text("ALTER TABLE milestones ADD COLUMN resubmissions_used INTEGER DEFAULT 0"))

    if "applications" in tables:
        cols = {c["name"] for c in inspector.get_columns("applications")}
        if "client_accepted" not in cols:
            connection.execute(text("ALTER TABLE applications ADD COLUMN client_accepted BOOLEAN DEFAULT 0"))
        if "freelancer_accepted" not in cols:
            connection.execute(text("ALTER TABLE applications ADD COLUMN freelancer_accepted BOOLEAN DEFAULT 0"))
        if "counters_used" not in cols:
            connection.execute(text("ALTER TABLE applications ADD COLUMN counters_used INTEGER DEFAULT 0"))


async def get_db():
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initializes database tables, creates demo user profiles if absent."""
    from backend.models.models import User, DEFAULT_DEMO_USERS

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_sqlite_columns)

    # Ensure default user accounts exist for demo login
    async with AsyncSessionLocal() as session:
        for u_data in DEFAULT_DEMO_USERS:
            existing = await session.get(User, u_data["id"])
            if not existing:
                user = User(
                    id=u_data["id"],
                    name=u_data["name"],
                    email=u_data["email"],
                    role=u_data["role"],
                    title=u_data["title"],
                )
                session.add(user)
        await session.commit()

        # If database has zero jobs on startup (e.g. freshly provisioned or restarted container),
        # automatically seed the 3 rich demo contracts so the app is always fully populated.
        from backend.models.models import Job
        from sqlalchemy import func
        job_count = (await session.execute(select(func.count(Job.id)))).scalar() or 0
        if job_count == 0:
            try:
                from backend.api.demo import seed_demo_scenarios
                await seed_demo_scenarios(db=session)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Auto-seed on startup skipped: {e}")
