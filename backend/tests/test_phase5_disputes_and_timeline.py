import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.auth import create_access_token


@pytest.mark.asyncio
async def test_dispute_resolution_and_refund():
    """Tests dispute filing, agent arbitration, and PayPal refund/capture execution."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        c_token = create_access_token("client-maya", "client", "Maya Patel")
        f_token = create_access_token("freelancer-arjun", "freelancer", "Arjun Kumar")

        # Setup job and submit milestone with partial result
        res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {c_token}"},
            json={
                "title": "Build Graph Search",
                "description": "Construct Neo4j graph search engine.",
                "max_budget": 900.00,
                "currency": "USD",
                "deadline": "2026-12-01",
            },
        )
        job_id = res.json()["id"]

        app_res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {f_token}"},
            json={"min_price": 600.0, "preferred_price": 850.0, "time_needed_days": 8},
        )
        app_id = app_res.json()["id"]

        await client.post(f"/api/applications/{app_id}/negotiate?run_all=true", headers={"Authorization": f"Bearer {c_token}"})
        await client.post(f"/api/applications/{app_id}/decide", headers={"Authorization": f"Bearer {c_token}"}, json={"role": "client", "action": "accept"})
        await client.post(f"/api/applications/{app_id}/decide", headers={"Authorization": f"Bearer {f_token}"}, json={"role": "freelancer", "action": "accept"})

        await client.post(f"/api/applications/{app_id}/fund/create-order", headers={"Authorization": f"Bearer {c_token}"})
        await client.post(f"/api/applications/{app_id}/fund/authorize", headers={"Authorization": f"Bearer {c_token}"})

        detail = (await client.get(f"/api/applications/{app_id}", headers={"Authorization": f"Bearer {c_token}"})).json()
        m1_id = detail["contract"]["milestones"][0]["id"]

        # Submit code
        await client.post(
            f"/api/milestones/{m1_id}/submit",
            headers={"Authorization": f"Bearer {f_token}"},
            data={"submission_type": "code", "content_text": "def graph_search(): return []"},
        )

        # Client disputes verdict
        dispute_res = await client.post(
            f"/api/milestones/{m1_id}/dispute",
            headers={"Authorization": f"Bearer {c_token}"},
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

        # Check dispute appears in disputes list
        list_res = await client.get("/api/disputes", headers={"Authorization": f"Bearer {c_token}"})
        assert list_res.status_code == 200
        disputes = list_res.json()
        assert len(disputes) >= 1
        assert any(d["id"] == data["dispute_id"] for d in disputes)


@pytest.mark.asyncio
async def test_deadline_auto_void_and_timeline():
    """Tests deadline expiration auto-void and audit timeline API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        c_token = create_access_token("client-maya", "client", "Maya Patel")
        f_token = create_access_token("freelancer-arjun", "freelancer", "Arjun Kumar")

        res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {c_token}"},
            json={
                "title": "Mobile UI Prototypes",
                "description": "Design SwiftUI and Compose screens.",
                "max_budget": 500.00,
                "currency": "USD",
                "deadline": "2026-11-01",  # Past deadline
            },
        )
        job_id = res.json()["id"]

        app_res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {f_token}"},
            json={"min_price": 350.0, "preferred_price": 450.0, "time_needed_days": 5},
        )
        app_id = app_res.json()["id"]

        await client.post(f"/api/applications/{app_id}/negotiate?run_all=true", headers={"Authorization": f"Bearer {c_token}"})
        await client.post(f"/api/applications/{app_id}/decide", headers={"Authorization": f"Bearer {c_token}"}, json={"role": "client", "action": "accept"})
        await client.post(f"/api/applications/{app_id}/decide", headers={"Authorization": f"Bearer {f_token}"}, json={"role": "freelancer", "action": "accept"})

        await client.post(f"/api/applications/{app_id}/fund/create-order", headers={"Authorization": f"Bearer {c_token}"})
        await client.post(f"/api/applications/{app_id}/fund/authorize", headers={"Authorization": f"Bearer {c_token}"})

        # Trigger auto-void
        void_res = await client.post(f"/api/jobs/{job_id}/auto-void", params={"force": True})
        assert void_res.status_code == 200
        assert void_res.json()["voided"] is True

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

        # Duplicate event ignored idempotently
        res2 = await client.post("/api/webhooks/paypal", json=payload)
        assert res2.status_code == 200
        assert res2.json()["note"] == "duplicate_ignored"
