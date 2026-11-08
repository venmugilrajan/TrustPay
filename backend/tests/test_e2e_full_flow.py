import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.config import settings


@pytest.mark.asyncio
async def test_full_autonomous_escrow_lifecycle():
    """
    End-to-End integration test validating the entire TrustPay lifecycle:
    1. Create Job with budget & deadline
    2. Multi-turn AI Agent negotiation until agreement
    3. Both Client and Freelancer approve the contract
    4. Backend creates PayPal Order with intent AUTHORIZE
    5. Order authorized and funds held in escrow
    6. Freelancer submits verified code deliverable
    7. AI Judge evaluates criteria and executes full milestone capture via PayPal
    8. Complete timeline verification with PayPal transaction IDs
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Health & Mode Check
        health = (await client.get("/api/health")).json()
        assert health["status"] == "healthy"

        # Step 2: Create Job
        job_payload = {
            "title": "Decentralized Zero-Knowledge Proof Engine",
            "description": "Construct high-performance ZK verifier module with Rust and WebAssembly.",
            "max_budget": 1500.00,
            "currency": "USD",
            "deadline": "2026-12-15",
        }
        create_res = await client.post("/api/jobs", json=job_payload)
        assert create_res.status_code == 201
        job_id = create_res.json()["id"]

        # Step 3: Run AI Negotiation
        neg_res = await client.post(f"/api/jobs/{job_id}/negotiate?run_all=true")
        assert neg_res.status_code == 200
        assert neg_res.json()["status"] == "awaiting_approval"

        # Step 4: Mutual Approvals
        app1 = await client.post(f"/api/jobs/{job_id}/approve", json={"role": "client"})
        assert app1.json()["client_approved"] is True

        app2 = await client.post(f"/api/jobs/{job_id}/approve", json={"role": "freelancer"})
        assert app2.json()["freelancer_approved"] is True
        assert app2.json()["status"] == "approved"

        # Step 5: PayPal Funding (intent: AUTHORIZE)
        fund_res = await client.post(f"/api/jobs/{job_id}/fund")
        assert fund_res.status_code == 200
        order_id = fund_res.json()["order_id"]
        assert order_id

        # Step 6: Authorize the Order
        auth_res = await client.post(f"/api/jobs/{job_id}/authorize", json={"order_id": order_id})
        assert auth_res.status_code == 200
        auth_id = auth_res.json()["authorization_id"]
        assert auth_id
        assert auth_res.json()["paypal_status"] == "AUTHORIZED"

        # Step 7: Submit Passing Milestone Deliverable
        detail = (await client.get(f"/api/jobs/{job_id}")).json()
        milestones = detail["contract"]["milestones"]
        assert len(milestones) >= 2
        m1 = milestones[0]

        sub_res = await client.post(
            f"/api/jobs/{job_id}/milestones/{m1['id']}/submit",
            data={
                "submission_type": "code",
                "content_text": "def verify_proof(proof): return True\ndef compute_witness(): return 42\n",
            },
        )
        assert sub_res.status_code == 200
        eval_data = sub_res.json()
        assert eval_data["verdict"] == "pass"
        assert eval_data["overall_score"] >= 0.85
        assert eval_data["amount_captured"] == m1["amount"]

        # Step 8: Verify PayPal Payment Timeline
        timeline_res = await client.get(f"/api/jobs/{job_id}/timeline")
        assert timeline_res.status_code == 200
        events = timeline_res.json()
        event_types = [e["event_type"] for e in events]

        assert "JOB_CREATED" in event_types
        assert "CONTRACT_AGREED_BY_AGENTS" in event_types
        assert "CONTRACT_MUTUALLY_APPROVED" in event_types
        assert "PAYPAL_ORDER_CREATED" in event_types
        assert "PAYPAL_ORDER_AUTHORIZED" in event_types
        assert "JUDGE_EVALUATION_COMPLETED" in event_types
        assert "PAYPAL_PAYMENT_CAPTURED" in event_types

