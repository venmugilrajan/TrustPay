import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_funding_and_authorization_lifecycle():
    """Tests the full flow from job creation to contract approval and PayPal authorization."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Job
        res = await client.post(
            "/api/jobs",
            json={
                "title": "Data Pipeline Engineering",
                "description": "Design an automated ETL data pipeline with Kafka and SQLite.",
                "max_budget": 1500.00,
                "currency": "USD",
                "deadline": "2026-12-15",
            },
        )
        assert res.status_code == 201
        job_id = res.json()["id"]

        # 2. Complete negotiation
        res = await client.post(f"/api/jobs/{job_id}/negotiate?run_all=true")
        assert res.status_code == 200

        # 3. Approve contract as both client and freelancer
        await client.post(f"/api/jobs/{job_id}/approve", json={"role": "client"})
        res = await client.post(f"/api/jobs/{job_id}/approve", json={"role": "freelancer"})
        assert res.status_code == 200
        assert res.json()["status"] == "approved"

        # 4. Create PayPal funding order (intent AUTHORIZE)
        res = await client.post(f"/api/jobs/{job_id}/fund")
        assert res.status_code == 200
        fund_data = res.json()
        assert "order_id" in fund_data
        assert fund_data["order_id"].startswith("ORDER-MOCK-")
        assert fund_data["amount"] > 0
        assert fund_data["status"] == "ORDER_CREATED"

        # 5. Authorize the PayPal order
        res = await client.post(
            f"/api/jobs/{job_id}/authorize",
            json={"order_id": fund_data["order_id"]},
        )
        assert res.status_code == 200
        auth_data = res.json()
        assert "authorization_id" in auth_data
        assert auth_data["authorization_id"].startswith("AUTH-MOCK-")
        assert auth_data["paypal_status"] == "AUTHORIZED"
        assert auth_data["job_status"] == "in_progress"

        # 6. Check job detail and audit timeline
        res = await client.get(f"/api/jobs/{job_id}")
        assert res.status_code == 200
        job_detail = res.json()
        assert job_detail["paypal_authorization_id"] == auth_data["authorization_id"]
        assert job_detail["status"] == "in_progress"

        event_types = [log["event_type"] for log in job_detail["audit_logs"]]
        assert "PAYPAL_ORDER_CREATED" in event_types
        assert "PAYPAL_ORDER_AUTHORIZED" in event_types

