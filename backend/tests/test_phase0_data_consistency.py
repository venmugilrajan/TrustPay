import pytest
import pytest_asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from backend.models.models import Base, Job, Contract, Application
from backend.services.stats_service import StatsService


@pytest_asyncio.fixture(loop_scope="function")
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    
    await engine.dispose()


def make_job(client_id: str, title: str, max_budget: float, status: str, is_demo: bool = False) -> Job:
    return Job(
        id=str(uuid.uuid4()),
        client_id=client_id,
        title=title,
        description=f"Description for {title}",
        deadline="2026-12-31",
        deliverables="Clean code deliverables",
        max_budget=max_budget,
        status=status,
        is_demo=is_demo,
    )


@pytest.mark.asyncio(loop_scope="function")
async def test_escrow_math_calculation(db_session: AsyncSession):
    """
    Test 1 — Escrow math:
    Funds held in escrow must equal authorized - captured - voided - refunded
    Strictly asserted dynamically against fixture values (no hardcoded amounts).
    """
    client_id = f"client_{uuid.uuid4().hex[:8]}"
    job = make_job(client_id=client_id, title="Test Escrow Job", max_budget=500.0, status="funded")
    db_session.add(job)
    await db_session.flush()

    auth_amt = 450.0
    cap_amt = 150.0
    void_amt = 50.0
    ref_amt = 25.0
    expected_held = auth_amt - cap_amt - void_amt - ref_amt

    await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=None, milestone_id=None,
        entry_type="authorized", amount=auth_amt, paypal_id="TEST-AUTH-1",
        source="paypal_sandbox_live"
    )
    await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=None, milestone_id=None,
        entry_type="captured", amount=cap_amt, paypal_id="TEST-CAP-1",
        source="paypal_sandbox_live"
    )
    await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=None, milestone_id=None,
        entry_type="voided", amount=void_amt, paypal_id="TEST-VOID-1",
        source="paypal_sandbox_live"
    )
    await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=None, milestone_id=None,
        entry_type="refunded", amount=ref_amt, paypal_id="TEST-REF-1",
        source="paypal_sandbox_live"
    )

    stats = await StatsService.get_client_stats(db_session, client_id=client_id)
    assert stats["funds_held_escrow_usd"] == round(expected_held, 2)
    assert stats["released_to_freelancers_usd"] == round(cap_amt, 2)


@pytest.mark.asyncio(loop_scope="function")
async def test_active_vs_negotiating_separation(db_session: AsyncSession):
    """
    Test 2 — Active vs Negotiating separation:
    Active contracts count only funded/in_progress contracts.
    Negotiating/awaiting approval are counted separately.
    """
    client_id = f"client_{uuid.uuid4().hex[:8]}"
    
    j1 = make_job(client_id, "Funded Job", 300.0, "funded")
    j2 = make_job(client_id, "In Progress Job", 400.0, "in_progress")
    j3 = make_job(client_id, "Negotiating Job", 200.0, "negotiating")
    j4 = make_job(client_id, "Approval Job", 250.0, "awaiting_approval")

    db_session.add_all([j1, j2, j3, j4])
    await db_session.commit()

    stats = await StatsService.get_client_stats(db_session, client_id=client_id)
    assert stats["active_contracts"] == 2
    assert stats["negotiating_count"] == 2
    assert stats["total_jobs_posted"] == 4


@pytest.mark.asyncio(loop_scope="function")
async def test_demo_source_exclusion_from_real_stats(db_session: AsyncSession):
    """
    Test 3 — Demo exclusion:
    Payments ledger entries marked source='demo' or is_demo=True are excluded
    from live client/freelancer stats by default.
    """
    client_id = f"client_{uuid.uuid4().hex[:8]}"
    job = make_job(client_id, "Live Job", 600.0, "funded", is_demo=False)
    demo_job = make_job(client_id, "Demo Job", 999.0, "funded", is_demo=True)
    db_session.add_all([job, demo_job])
    await db_session.flush()

    await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=None, milestone_id=None,
        entry_type="authorized", amount=500.0, paypal_id="REAL-AUTH-1",
        source="paypal_sandbox_live"
    )
    await StatsService.record_ledger_entry(
        db_session, job_id=demo_job.id, contract_id=None, milestone_id=None,
        entry_type="authorized", amount=999.0, paypal_id="DEMO-AUTH-1",
        is_demo=True, source="demo"
    )

    stats = await StatsService.get_client_stats(db_session, client_id=client_id, include_demo=False)
    assert stats["funds_held_escrow_usd"] == 500.0
    assert stats["total_jobs_posted"] == 1

    stats_with_demo = await StatsService.get_client_stats(db_session, client_id=client_id, include_demo=True)
    assert stats_with_demo["funds_held_escrow_usd"] == 1499.0
    assert stats_with_demo["total_jobs_posted"] == 2


@pytest.mark.asyncio(loop_scope="function")
async def test_freelancer_funded_contract_visibility(db_session: AsyncSession):
    """
    Test 4 — Freelancer active contract visibility:
    A funded contract must reflect as active in freelancer stats and have correct awaiting release amount.
    """
    freelancer_id = f"free_{uuid.uuid4().hex[:8]}"
    job = make_job("client_1", "Web App", 700.0, "funded")
    app = Application(
        id=str(uuid.uuid4()), job_id=job.id, freelancer_id=freelancer_id,
        freelancer_name="Arjun", min_price=600.0, preferred_price=650.0,
        time_needed_days=7, status="funded"
    )
    contract = Contract(
        id=str(uuid.uuid4()), job_id=job.id, application_id=app.id,
        total_amount=650.0, currency="USD", status="funded", deadline="2026-12-31"
    )
    db_session.add_all([job, app, contract])
    await db_session.flush()

    await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=contract.id, milestone_id=None,
        entry_type="authorized", amount=650.0, paypal_id="AUTH-FREE-1",
        source="paypal_sandbox_live"
    )

    free_stats = await StatsService.get_freelancer_stats(db_session, freelancer_id=freelancer_id)
    assert free_stats["active_contracts"] == 1
    assert free_stats["awaiting_release_usd"] == 650.0
    assert free_stats["total_earned_usd"] == 0.0


@pytest.mark.asyncio(loop_scope="function")
async def test_payments_and_earnings_ledger_match(db_session: AsyncSession):
    """
    Test 5 — Client Payments and Freelancer Earnings read the same ledger rows:
    Both endpoints derive from payments_ledger and isolate demo from sandbox_live.
    """
    client_id = "client_alpha"
    free_id = "free_beta"
    job = make_job(client_id, "Platform Sync Job", 800.0, "funded")
    app = Application(
        id=str(uuid.uuid4()), job_id=job.id, freelancer_id=free_id,
        freelancer_name="Arjun", min_price=750.0, preferred_price=800.0,
        time_needed_days=10, status="funded"
    )
    contract = Contract(
        id=str(uuid.uuid4()), job_id=job.id, application_id=app.id,
        total_amount=800.0, currency="USD", status="funded", deadline="2026-12-31"
    )
    db_session.add_all([job, app, contract])
    await db_session.flush()

    e1 = await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=contract.id, milestone_id=None,
        entry_type="authorized", amount=800.0, paypal_id="LIVE-AUTH-100",
        source="paypal_sandbox_live"
    )
    e2 = await StatsService.record_ledger_entry(
        db_session, job_id=job.id, contract_id=contract.id, milestone_id=None,
        entry_type="captured", amount=400.0, paypal_id="LIVE-CAP-100",
        source="paypal_sandbox_live"
    )

    client_stats = await StatsService.get_client_stats(db_session, client_id=client_id)
    free_stats = await StatsService.get_freelancer_stats(db_session, freelancer_id=free_id)

    # Both read the same reality:
    # Client funds held = 800 - 400 = 400
    # Freelancer awaiting release = 800 - 400 = 400
    assert client_stats["funds_held_escrow_usd"] == free_stats["awaiting_release_usd"] == 400.0
    # Client released = Freelancer earned = 400
    assert client_stats["released_to_freelancers_usd"] == free_stats["total_earned_usd"] == 400.0
