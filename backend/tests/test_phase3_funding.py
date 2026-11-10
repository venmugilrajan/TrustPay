import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.auth import create_access_token


@pytest.mark.asyncio
async def test_funding_and_authorization_lifecycle():
    """Tests the full flow from job creation to contract approval and PayPal authorization under new spec."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client_token = create_access_token("client_maya", "client", "Maya Patel")
        freelancer_token = create_access_token("freelancer_arjun", "freelancer", "Arjun Kumar")
        c_headers = {"Authorization": f"Bearer {client_token}"}
        f_headers = {"Authorization": f"Bearer {freelancer_token}"}

        # 1. Create Job
        res = await client.post(
            "/api/jobs",
            headers=c_headers,
            json={
                "title": "Data Pipeline Engineering",
                "description": "Design an automated ETL data pipeline with Kafka and SQLite.",
                "deliverables": "Working ETL pipeline script",
                "max_budget": 1500.00,
                "currency": "USD",
                "deadline": "2026-12-15",
                "priorities": "quality",
            },
        )
        assert res.status_code == 201
        job_id = res.json()["id"]

        # 2. Freelancer applies
        res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers=f_headers,
            json={
                "min_price": 900.00,
                "preferred_price": 1300.00,
                "time_needed_days": 14,
                "skills": "Python, Kafka, SQL",
                "notes": "Experienced data engineer ready to deliver.",
            },
        )
        assert res.status_code == 201
        app_id = res.json()["id"]

        # 3. Complete negotiation
        res = await client.post(f"/api/applications/{app_id}/negotiate?run_all=true", headers=c_headers)
        assert res.status_code == 200
        assert res.json()["status"] == "awaiting_decision"

        # 4. Decide (accept as both client and freelancer)
        await client.post(f"/api/applications/{app_id}/decide", headers=c_headers, json={"role": "client", "action": "accept"})
        res = await client.post(f"/api/applications/{app_id}/decide", headers=f_headers, json={"role": "freelancer", "action": "accept"})
        assert res.status_code == 200
        assert res.json()["status"] == "approved"

        # 5. Create PayPal funding order (intent AUTHORIZE)
        res = await client.post(f"/api/applications/{app_id}/fund/create-order", headers=c_headers)
        assert res.status_code == 200
        fund_data = res.json()
        assert "order_id" in fund_data
        assert fund_data["order_id"].startswith("ORDER-MOCK-")
        assert fund_data["amount"] > 0
        assert fund_data["status"].lower() == "order_created"

        # 6. Authorize the PayPal order
        res = await client.post(
            f"/api/applications/{app_id}/fund/authorize",
            headers=c_headers,
            json={"order_id": fund_data["order_id"]},
        )
        assert res.status_code == 200
        auth_data = res.json()
        assert "authorization_id" in auth_data
        assert auth_data["status"] == "funded"
