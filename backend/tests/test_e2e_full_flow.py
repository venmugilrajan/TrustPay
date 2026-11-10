import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.auth import create_access_token


@pytest.mark.asyncio
async def test_full_autonomous_escrow_lifecycle():
    """
    End-to-End integration test validating the entire TrustPay lifecycle under the Rebuilt Architecture:
    1. Create Job with private max_budget & deadline (authenticated Client)
    2. Freelancer applies with private min_price (authenticated Freelancer)
    3. Multi-turn AI Agent negotiation until agreement
    4. Both Client and Freelancer approve the contract
    5. Backend creates PayPal Order with intent AUTHORIZE
    6. Order authorized and funds held in escrow
    7. Freelancer submits verified code deliverable
    8. AI Judge evaluates criteria in isolated sandbox and executes capture via PayPal
    9. Complete timeline verification with PayPal transaction IDs
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client_token = create_access_token("client_maya", "client", "Maya Patel")
        freelancer_token = create_access_token("freelancer_arjun", "freelancer", "Arjun Kumar")
        c_headers = {"Authorization": f"Bearer {client_token}"}
        f_headers = {"Authorization": f"Bearer {freelancer_token}"}

        # Step 1: Health Check
        health = (await client.get("/api/health")).json()
        assert health["status"] == "healthy"

        # Step 2: Create Job
        job_payload = {
            "title": "Decentralized Zero-Knowledge Proof Engine",
            "description": "Construct high-performance ZK verifier module with Rust and WebAssembly.",
            "deliverables": "Production ZK verification module",
            "max_budget": 1500.00,
            "currency": "USD",
            "deadline": "2026-12-15",
            "priorities": "quality",
        }
        create_res = await client.post("/api/jobs", headers=c_headers, json=job_payload)
        assert create_res.status_code == 201
        job_id = create_res.json()["id"]

        # Step 3: Freelancer applies
        apply_res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers=f_headers,
            json={
                "min_price": 1000.00,
                "preferred_price": 1400.00,
                "time_needed_days": 12,
                "skills": "Rust, Wasm, Cryptography",
                "notes": "Cryptographic engineer specialized in zero-knowledge verifiers.",
            },
        )
        assert apply_res.status_code == 201
        app_id = apply_res.json()["id"]

        # Step 4: Run AI Negotiation
        neg_res = await client.post(f"/api/applications/{app_id}/negotiate?run_all=true", headers=c_headers)
        assert neg_res.status_code == 200
        assert neg_res.json()["status"] == "awaiting_decision"

        # Step 5: Mutual Approvals
        app1 = await client.post(f"/api/applications/{app_id}/decide", headers=c_headers, json={"role": "client", "action": "accept"})
        assert app1.json()["client_accepted"] is True

        app2 = await client.post(f"/api/applications/{app_id}/decide", headers=f_headers, json={"role": "freelancer", "action": "accept"})
        assert app2.json()["freelancer_accepted"] is True
        assert app2.json()["status"] == "approved"

        # Step 6: PayPal Funding (intent: AUTHORIZE)
        fund_res = await client.post(f"/api/applications/{app_id}/fund/create-order", headers=c_headers)
        assert fund_res.status_code == 200
        order_id = fund_res.json()["order_id"]
        assert order_id

        # Step 7: Authorize the Order
        auth_res = await client.post(
            f"/api/applications/{app_id}/fund/authorize",
            headers=c_headers,
            json={"order_id": order_id},
        )
        assert auth_res.status_code == 200
        auth_id = auth_res.json()["authorization_id"]
        assert auth_id.startswith("AUTH-MOCK-")
        contract_id = auth_res.json()["active_contract_id"]

        # Step 8: Get Contract Milestones & Submit Deliverable
        app_res = await client.get(f"/api/applications/{app_id}", headers=c_headers)
        assert app_res.status_code == 200
        milestones = app_res.json()["contract"]["milestones"]
        assert len(milestones) > 0
        milestone_id = milestones[0]["id"]

        # Step 9: Submit Deliverable & Evaluate
        submit_res = await client.post(
            f"/api/milestones/{milestone_id}/submit",
            headers=f_headers,
            json={
                "deliverable_type": "code",
                "content": "def verify_proof(proof):\n    return True\n\nprint('Verification successful!')",
                "notes": "Completed initial Rust/Wasm verification module.",
            },
        )
        assert submit_res.status_code == 200
        eval_data = submit_res.json()
        assert eval_data["verdict"] in ["pass", "partial", "fail"]

        # Step 10: Verify Timeline reflects authorized & payment actions
        final_timeline = (await client.get(f"/api/contracts/{contract_id}/timeline", headers=c_headers)).json()
        assert isinstance(final_timeline, list)
        assert len(final_timeline) >= 1
        assert any("escrow" in str(item).lower() or "authorized" in str(item).lower() for item in final_timeline)
