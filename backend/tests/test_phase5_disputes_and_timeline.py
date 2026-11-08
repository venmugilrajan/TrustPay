import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_dispute_resolution_and_refund():
    """Tests dispute filing, agent arbitration, and PayPal refund/capture execution."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Setup job and submit milestone with partial result
        res = await client.post(
            "/api/jobs",
            json={
                "title": "Build Graph Search",
                "description": "Construct Neo4j graph search engine.",
                "max_budget": 900.00,
                "currency": "USD",
                "deadline": "2026-12-01",
            },
        )
        job_id = res.json()["id"]
        await client.post(f"/api/jobs/{job_id}/negotiate?run_all=true")
        await client.post(f"/api/jobs/{job_id}/approve", json={"role": "client"})
        await client.post(f"/api/jobs/{job_id}/approve", json={"role": "freelancer"})
        fund_res = await client.post(f"/api/jobs/{job_id}/fund")
        await client.post(f"/api/jobs/{job_id}/authorize", json={"order_id": fund_res.json()["order_id"]})

        detail = (await client.get(f"/api/jobs/{job_id}")).json()
        m1_id = detail["contract"]["milestones"][0]["id"]

        # Submit code
        await client.post(
            f"/api/jobs/{job_id}/milestones/{m1_id}/submit",
            data={"submission_type": "code", "content_text": "def graph_search(): return []"},
        )

        # Client disputes verdict
        dispute_res = await client.post(
            f"/api/jobs/{job_id}/milestones/{m1_id}/dispute",
            json={
                "raised_by": "client",
                "reason": "The search function returns an empty list and did not implement indexing.",
            },
        )
        assert dispute_res.status_code == 200
        data = dispute_res.json()
        assert data["status"] == "resolved"
        assert data["ruling"] in ("split", "client_favor", "freelancer_favor")
        assert (data["amount_to_capture"] + data["amount_to_refund"]) > 0


@pytest.mark.asyncio
async def test_deadline_auto_void_and_timeline():
    """Tests deadline expiration auto-void and audit timeline API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/jobs",
            json={
                "title": "Mobile UI Prototypes",
                "description": "Design SwiftUI and Compose screens.",
                "max_budget": 500.00,
                "currency": "USD",
                "deadline": "2026-11-01",  # Past deadline
            },
        )
        job_id = res.json()["id"]
        await client.post(f"/api/jobs/{job_id}/negotiate?run_all=true")
        await client.post(f"/api/jobs/{job_id}/approve", json={"role": "client"})
        await client.post(f"/api/jobs/{job_id}/approve", json={"role": "freelancer"})
        fund_res = await client.post(f"/api/jobs/{job_id}/fund")
        await client.post(f"/api/jobs/{job_id}/authorize", json={"order_id": fund_res.json()["order_id"]})

        # Trigger auto-void
        void_res = await client.post(f"/api/jobs/{job_id}/auto-void", params={"force": True})
        assert void_res.status_code == 200
        assert void_res.json()["voided"] is True
        assert void_res.json()["status"] == "voided_expired"

        # Check timeline endpoint
        timeline_res = await client.get(f"/api/jobs/{job_id}/timeline")
        assert timeline_res.status_code == 200
        events = timeline_res.json()
        assert len(events) >= 5
        types = [e["event_type"] for e in events]
        assert "PAYPAL_AUTHORIZATION_AUTO_VOIDED" in types


@pytest.mark.asyncio
async def test_paypal_webhook_idempotency():
    """Verifies webhook reception and duplicate ignoring."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "id": "WH-EVT-10001",
            "event_type": "PAYMENT.CAPTURE.COMPLETED",
            "summary": "Capture completed for USD 150.00",
            "resource": {"custom_id": "none"},
        }
        res1 = await client.post("/api/webhooks/paypal", json=payload)
        assert res1.status_code == 200
        assert res1.json()["status"] == "success"

        # Duplicate event
        res2 = await client.post("/api/webhooks/paypal", json=payload)
        assert res2.status_code == 200
        assert res2.json()["note"] == "duplicate_ignored"
