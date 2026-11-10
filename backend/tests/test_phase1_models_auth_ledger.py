import pytest
from datetime import datetime, timezone, timedelta
import jwt
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.database import get_db
from backend.core.auth import create_access_token, decode_access_token, ALGORITHM, SECRET_KEY
from backend.models.models import Job, Application, Contract, Milestone, PaymentLedgerEntry, User
from backend.services.stats_service import StatsService


@pytest.mark.asyncio
async def test_auth_token_claims_and_validation():
    # 1. Valid token
    token = create_access_token(user_id="client-maya", role="client", name="Maya Patel")
    payload = decode_access_token(token)
    assert payload["sub"] == "client-maya"
    assert payload["role"] == "client"
    assert payload["name"] == "Maya Patel"

    # 2. Forged token should raise 401
    fake_token = jwt.encode({"sub": "hacker", "role": "client"}, "wrong-secret", algorithm="HS256")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/me", headers={"Authorization": f"Bearer {fake_token}"})
        assert res.status_code == 401

    # 3. Missing token should raise 401 on protected endpoint
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/me")
        assert res.status_code == 401

    # 4. Valid token succeeds on /api/me
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "client-maya"
        assert data["role"] == "client"


@pytest.mark.asyncio
async def test_demo_login_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Client login
        res = await client.post("/api/auth/demo-login", json={"role": "client", "user_id": "client-maya"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["role"] == "client"
        assert data["user_id"] == "client-maya"

        # Freelancer login
        res2 = await client.post("/api/auth/demo-login", json={"role": "freelancer", "user_id": "freelancer-arjun"})
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["role"] == "freelancer"
        assert data2["user_id"] == "freelancer-arjun"


@pytest.mark.asyncio
async def test_payments_ledger_exact_math():
    """
    Ensures dashboard statistics strictly compute from the payments_ledger table:
    funds_held_escrow = authorized - captured - voided - refunded
    released_payouts = captured
    """
    get_db_gen = app.dependency_overrides[get_db]()
    db = await anext(get_db_gen)

    try:
        job = Job(
            client_id="client-test-math",
            title="Ledger Math Verification Job",
            description="Testing ledger single source of truth",
            max_budget=2000.0,
            deadline="2026-12-31",
            status="funded",
        )
        db.add(job)
        await db.flush()

        contract = Contract(
            job_id=job.id,
            total_amount=2000.0,
            currency="USD",
            deadline="2026-12-31",
            status="funded",
        )
        db.add(contract)
        await db.flush()
        job.active_contract_id = contract.id

        # Record ledger entries:
        # 1. Authorized $2000
        await StatsService.record_ledger_entry(
            db, job.id, contract.id, None, "authorized", 2000.0, "AUTH_123", actor="client"
        )
        # 2. Captured milestone 1: $800
        await StatsService.record_ledger_entry(
            db, job.id, contract.id, None, "captured", 800.0, "CAP_123", actor="judge"
        )
        # 3. Partial capture milestone 2: $600
        await StatsService.record_ledger_entry(
            db, job.id, contract.id, None, "captured", 600.0, "CAP_124", actor="judge"
        )
        # 4. Refund milestone 2 dispute: $100
        await StatsService.record_ledger_entry(
            db, job.id, contract.id, None, "refunded", 100.0, "REF_123", actor="dispute"
        )
        # 5. Void remaining unneeded hold: $500
        await StatsService.record_ledger_entry(
            db, job.id, contract.id, None, "voided", 500.0, "VOID_123", actor="system"
        )

        client_stats = await StatsService.get_client_stats(db, "client-test-math")
        # Authorized (2000) - Captured (800 + 600 = 1400) - Refunded (100) - Voided (500) = 0 remaining in escrow
        assert client_stats["funds_held_escrow_usd"] == 0.0
        assert client_stats["released_to_freelancers_usd"] == 1400.0
    finally:
        await get_db_gen.aclose()

