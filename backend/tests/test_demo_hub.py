import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.auth import create_access_token


@pytest.mark.asyncio
async def test_demo_hub_seed_reset_and_ledger_metrics():
    """
    Tests the demo hub seeding, single-source-of-truth ledger calculation,
    and clean idempotent reset.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Reset any existing demo data
        reset_res = await client.post("/api/demo/reset")
        assert reset_res.status_code == 200

        # 2. Seed 3 scenarios
        seed_res = await client.post("/api/demo/seed")
        assert seed_res.status_code == 200
        seed_data = seed_res.json()
        assert seed_data["status"] == "seeded"
        assert len(seed_data["scenarios"]) == 3

        # 3. Check public/admin stats are derived accurately from payments_ledger
        stats_res = await client.get("/api/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_authorized_usd"] >= 3600.00  # 1200 + 1500 + 900
        assert stats["total_captured_usd"] >= 2000.00   # 1200 + 500 + 300
        assert stats["funds_held_escrow_usd"] > 0

        # 4. Check scenarios endpoint
        scenarios_res = await client.get("/api/demo/scenarios")
        assert scenarios_res.status_code == 200
        scenarios = scenarios_res.json()
        assert len(scenarios) == 3

        # 5. Reset demo data cleanly
        clean_res = await client.post("/api/demo/reset")
        assert clean_res.status_code == 200

        # 6. Scenarios should now be empty
        empty_res = await client.get("/api/demo/scenarios")
        assert empty_res.status_code == 200
        assert len(empty_res.json()) == 0

