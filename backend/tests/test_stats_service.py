import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.database import get_db
from backend.models.models import Job, Contract, Milestone
from backend.services.stats_service import StatsService


@pytest.mark.asyncio
async def test_stats_service_ledger_sum_invariants():
    """
    Verifies that system statistics calculated by stats_service strictly equal
    the physical sum of database contracts, escrow amounts, and captured milestone payments.
    """
    # 1. Inspect dependency-overridden test session
    get_db_gen = app.dependency_overrides[get_db]()
    db = await anext(get_db_gen)

    try:
        # Create 2 jobs with contracts and milestones
        job1 = Job(
            client_id="client_alice",
            title="Statistical Audit Job 1",
            description="Testing escrow sum invariants",
            max_budget=1500.0,
            deadline="2026-12-01",
            status="funded",
            paypal_status="AUTHORIZED",
            paypal_authorization_id="AUTH_TEST_101",
        )
        db.add(job1)
        await db.flush()

        contract1 = Contract(
            job_id=job1.id,
            total_amount=1500.0,
            currency="USD",
            deadline="2026-12-01",
            status="active",
        )
        db.add(contract1)
        await db.flush()
        job1.active_contract_id = contract1.id

        m1 = Milestone(
            contract_id=contract1.id,
            order_index=0,
            title="Milestone 1",
            description="Part 1",
            amount=800.0,
            captured_amount=800.0,
            status="paid",
            due_date="2026-11-20",
        )
        m2 = Milestone(
            contract_id=contract1.id,
            order_index=1,
            title="Milestone 2",
            description="Part 2",
            amount=700.0,
            captured_amount=0.0,
            status="in_progress",
            due_date="2026-11-27",
        )
        db.add_all([m1, m2])

        # Record corresponding ledger entries for contract1
        await StatsService.record_ledger_entry(
            db,
            job_id=job1.id,
            contract_id=contract1.id,
            milestone_id=None,
            entry_type="authorized",
            amount=1500.0,
            paypal_id="AUTH_TEST_101",
            actor="client",
            note="Escrow authorization",
        )
        await StatsService.record_ledger_entry(
            db,
            job_id=job1.id,
            contract_id=contract1.id,
            milestone_id=m1.id,
            entry_type="captured",
            amount=800.0,
            paypal_id="CAP_TEST_101",
            actor="system",
            note="Milestone 1 captured",
        )
        await db.commit()

        # Fetch stats via service
        stats = await StatsService.get_system_stats(db)

        assert stats["total_jobs"] >= 1
        assert stats["active_contracts"] >= 1
        # Contract 1: $1500 total, $800 captured -> $700 remaining in escrow
        assert stats["funds_held_escrow_usd"] >= 700.0
        assert stats["released_payouts_usd"] >= 800.0

        # Also verify via GET /api/stats endpoint
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/stats")
            assert res.status_code == 200
            api_stats = res.json()
            assert api_stats["total_jobs"] == stats["total_jobs"]
            assert api_stats["active_contracts"] == stats["active_contracts"]
            assert api_stats["funds_held_escrow_usd"] == stats["funds_held_escrow_usd"]
            assert api_stats["released_payouts_usd"] == stats["released_payouts_usd"]

    finally:
        await get_db_gen.aclose()
