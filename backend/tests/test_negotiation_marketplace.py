import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.core.database import init_db
from backend.core.auth import create_access_token
from backend.core.privacy import scan_for_private_number_leak, strip_structured_amounts_from_text


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_demo_login_and_token_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Valid login
        res = await client.post("/api/auth/demo-login", json={"user_id": "client_alice", "role": "client"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user_id"] == "client_alice"
        assert data["role"] == "client"
        token = data["access_token"]

        # 2. Forged token rejected
        res = await client.get("/api/jobs/some_id/applications", headers={"Authorization": "Bearer forged_invalid_token"})
        assert res.status_code == 401
        assert "Invalid or forged" in res.json()["detail"]


@pytest.mark.asyncio
async def test_leak_scanner_true_leak_vs_allowed_agreed_price():
    # Test (a): A true leak is caught
    secret_budget = 1500.0
    leak_text_1 = "I am aware your budget ceiling is 1500 USD, so I counter."
    assert scan_for_private_number_leak(leak_text_1, secret_budget) is True

    leak_text_2 = "We know the private limit is 1.5k"
    assert scan_for_private_number_leak(leak_text_2, secret_budget) is True

    # Test (b): An agreed price equal to the opposing private limit is allowed
    agreed_text = "I accept the proposed contract amount of $1,500.00 across all milestones."
    assert scan_for_private_number_leak(agreed_text, secret_budget, allowed_structured_amounts=[1500.0]) is False

    # But if the text ALSO mentions the limit elsewhere in a leak sentence:
    sneaky_text = "I propose $1,500.00 because your max budget is 1500"
    assert scan_for_private_number_leak(sneaky_text, secret_budget, allowed_structured_amounts=[1500.0]) is True


@pytest.mark.asyncio
async def test_privacy_and_role_access_boundaries():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create client tokens
        client_a_token = create_access_token("client_a", "client")
        client_b_token = create_access_token("client_b", "client")
        freelancer_1_token = create_access_token("freelancer_1", "freelancer")
        freelancer_2_token = create_access_token("freelancer_2", "freelancer")

        # 1. Client A creates a job with private max_budget $1,200
        job_res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {client_a_token}"},
            json={
                "title": "Confidential Security Audit",
                "description": "Perform smart contract audit",
                "max_budget": 1200.00,
                "public_budget_estimate": "$900 - $1,300",
                "deadline": "2026-12-01",
                "priorities": "quality",
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # 2. Freelancer 1 browses jobs -> max_budget MUST be None, sees public_budget_estimate
        f_job_res = await client.get(f"/api/opportunities/{job_id}", headers={"Authorization": f"Bearer {freelancer_1_token}"})
        assert f_job_res.status_code == 200
        assert "max_budget" not in f_job_res.json() or f_job_res.json().get("max_budget") is None
        assert f_job_res.json()["public_budget_estimate"] == "$900 - $1,300"

        # 3. Freelancer 1 applies with private min_price $850
        app1_res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {freelancer_1_token}"},
            json={
                "freelancer_name": "Freelancer One",
                "min_price": 850.00,
                "preferred_price": 1100.00,
                "time_needed_days": 10,
                "skills": "Solidity, Slither",
            },
        )
        assert app1_res.status_code == 201
        app1_id = app1_res.json()["id"]

        # 4. Client A views application -> min_price MUST NOT be leaked
        c_app_res = await client.get(f"/api/applications/{app1_id}", headers={"Authorization": f"Bearer {client_a_token}"})
        assert c_app_res.status_code == 200
        assert "min_price" not in c_app_res.json()

        # 5. Cross-Client access denied: Client B cannot view Client A's job applications
        cross_res = await client.get(f"/api/jobs/{job_id}/applications", headers={"Authorization": f"Bearer {client_b_token}"})
        assert cross_res.status_code == 403
        assert "Cross-client access denied" in cross_res.json()["detail"]

        # 6. Freelancer cannot read another freelancer's application
        f2_access = await client.get(f"/api/applications/{app1_id}", headers={"Authorization": f"Bearer {freelancer_2_token}"})
        assert f2_access.status_code == 403

        # 7. Freelancer cannot fund an application
        f_fund_res = await client.post(f"/api/applications/{app1_id}/fund/create-order", headers={"Authorization": f"Bearer {freelancer_1_token}"})
        assert f_fund_res.status_code == 403


@pytest.mark.asyncio
async def test_no_deal_when_ranges_do_not_overlap():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client_token = create_access_token("client_low", "client")
        freelancer_token = create_access_token("freelancer_high", "freelancer")

        # Client max_budget is $800
        job_res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "title": "Low Budget Task",
                "description": "Fix minor css issue",
                "max_budget": 800.00,
                "deadline": "2026-12-01",
            },
        )
        job_id = job_res.json()["id"]

        # Freelancer min_price is $1,200 (no overlap!)
        app_res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {freelancer_token}"},
            json={
                "min_price": 1200.00,
                "preferred_price": 1400.00,
                "time_needed_days": 5,
            },
        )
        app_id = app_res.json()["id"]
        assert app_res.json()["status"] == "no_deal"

        # State machine: negotiating on a no_deal application is rejected with 409
        subsequent = await client.post(
            f"/api/applications/{app_id}/negotiate",
            headers={"Authorization": f"Bearer {client_token}"},
        )
        assert subsequent.status_code == 409
        assert "Cannot negotiate" in subsequent.json()["detail"]


@pytest.mark.asyncio
async def test_counter_limit_enforced_and_unmet_counter_handling():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        c_token = create_access_token("client_c", "client")
        f_token = create_access_token("freelancer_f", "freelancer")

        job_res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {c_token}"},
            json={"title": "Counter Test Job", "description": "Test counter limits", "max_budget": 1000.00, "deadline": "2026-12-01"},
        )
        job_id = job_res.json()["id"]

        app_res = await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {f_token}"},
            json={"min_price": 600.00, "preferred_price": 900.00, "time_needed_days": 7},
        )
        app_id = app_res.json()["id"]

        # Negotiate to agreement
        await client.post(f"/api/applications/{app_id}/negotiate?run_all=true", headers={"Authorization": f"Bearer {c_token}"})
        app_data = (await client.get(f"/api/applications/{app_id}", headers={"Authorization": f"Bearer {c_token}"})).json()
        assert app_data["status"] in ("awaiting_decision", "awaiting_approval")

        # Counter 1: Request an unmet price (e.g. client demands price below freelancer's min_price of $600)
        c1_res = await client.post(
            f"/api/applications/{app_id}/decide",
            headers={"Authorization": f"Bearer {c_token}"},
            json={"role": "client", "action": "counter", "message": "I will only pay $300"},
        )
        assert c1_res.status_code == 200
        assert c1_res.json()["counters_used"] == 1

        # Verify the agent refused to change price below minimum and consumed counter 1
        app_data2 = (await client.get(f"/api/applications/{app_id}", headers={"Authorization": f"Bearer {c_token}"})).json()
        assert app_data2["counters_used"] == 1
        assert app_data2["contract"]["total_amount"] >= 600.00

        # Counter 2: Reasonable request
        c2_res = await client.post(
            f"/api/applications/{app_id}/decide",
            headers={"Authorization": f"Bearer {f_token}"},
            json={"role": "freelancer", "action": "counter", "message": "Add 2 days to milestone 1"},
        )
        assert c2_res.status_code == 200
        assert c2_res.json()["counters_used"] == 2

        # Counter 3: Rejected by code with 409 (max 2 exceeded)
        c3_res = await client.post(
            f"/api/applications/{app_id}/decide",
            headers={"Authorization": f"Bearer {c_token}"},
            json={"role": "client", "action": "counter", "message": "Third counter attempt"},
        )
        assert c3_res.status_code in (400, 409)
        assert "Maximum of 2 counter-offers" in c3_res.json()["detail"]


@pytest.mark.asyncio
async def test_atomic_claim_concurrency():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        c_token = create_access_token("client_atomic", "client")
        f1_token = create_access_token("freelancer_a1", "freelancer")
        f2_token = create_access_token("freelancer_a2", "freelancer")

        job_res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {c_token}"},
            json={"title": "Atomic Race Job", "description": "Concurrency check", "max_budget": 1200.00, "deadline": "2026-12-01"},
        )
        job_id = job_res.json()["id"]

        # Application 1
        a1 = (await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {f1_token}"},
            json={"min_price": 700.00, "preferred_price": 950.00, "time_needed_days": 8},
        )).json()
        a1_id = a1["id"]

        # Application 2
        a2 = (await client.post(
            f"/api/jobs/{job_id}/apply",
            headers={"Authorization": f"Bearer {f2_token}"},
            json={"min_price": 750.00, "preferred_price": 900.00, "time_needed_days": 8},
        )).json()
        a2_id = a2["id"]

        # Negotiate both to agreement
        await client.post(f"/api/applications/{a1_id}/negotiate?run_all=true", headers={"Authorization": f"Bearer {c_token}"})
        await client.post(f"/api/applications/{a2_id}/negotiate?run_all=true", headers={"Authorization": f"Bearer {c_token}"})

        # Both accept A1
        await client.post(f"/api/applications/{a1_id}/decide", headers={"Authorization": f"Bearer {c_token}"}, json={"role": "client", "action": "accept"})
        await client.post(f"/api/applications/{a1_id}/decide", headers={"Authorization": f"Bearer {f1_token}"}, json={"role": "freelancer", "action": "accept"})

        # Both accept A2
        await client.post(f"/api/applications/{a2_id}/decide", headers={"Authorization": f"Bearer {c_token}"}, json={"role": "client", "action": "accept"})
        await client.post(f"/api/applications/{a2_id}/decide", headers={"Authorization": f"Bearer {f2_token}"}, json={"role": "freelancer", "action": "accept"})

        # Client claims A1 -> Succeeds
        claim1 = await client.post(f"/api/applications/{a1_id}/fund/create-order", headers={"Authorization": f"Bearer {c_token}"})
        assert claim1.status_code == 200
        assert claim1.json()["status"] == "order_created"

        # Concurrently attempting to claim A2 -> Fails with 409 Conflict (job status is 'funding')
        claim2 = await client.post(f"/api/applications/{a2_id}/fund/create-order", headers={"Authorization": f"Bearer {c_token}"})
        assert claim2.status_code == 409
        assert "already being funded" in claim2.json()["detail"]

        # Cancel funding on A1 -> Releases job back to 'open'
        cancel_res = await client.post(f"/api/applications/{a1_id}/cancel-fund", headers={"Authorization": f"Bearer {c_token}"})
        assert cancel_res.status_code == 200

        # Now A2 can be claimed successfully!
        claim2_retry = await client.post(f"/api/applications/{a2_id}/fund/create-order", headers={"Authorization": f"Bearer {c_token}"})
        assert claim2_retry.status_code == 200


@pytest.mark.asyncio
async def test_full_regression_3_applications_active_contract_and_judge():
    """
    Regression Test:
    Job with 3 applications:
    - 1 funded
    - 2 rival applications
    Only the funded contract becomes active_contract and drives milestones and payments.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        c_token = create_access_token("client_reg", "client")
        f1_token = create_access_token("freelancer_winner", "freelancer")
        f2_token = create_access_token("freelancer_rival1", "freelancer")
        f3_token = create_access_token("freelancer_rival2", "freelancer")

        # Create job
        j_res = await client.post(
            "/api/jobs",
            headers={"Authorization": f"Bearer {c_token}"},
            json={"title": "3-Way Multi-Bid Contract", "description": "Select best bid", "max_budget": 1500.00, "deadline": "2026-12-01"},
        )
        job_id = j_res.json()["id"]

        # Submit 3 applications
        a1_id = (await client.post(f"/api/jobs/{job_id}/apply", headers={"Authorization": f"Bearer {f1_token}"}, json={"min_price": 900.0, "preferred_price": 1200.0})).json()["id"]
        a2_id = (await client.post(f"/api/jobs/{job_id}/apply", headers={"Authorization": f"Bearer {f2_token}"}, json={"min_price": 800.0, "preferred_price": 1100.0})).json()["id"]
        a3_id = (await client.post(f"/api/jobs/{job_id}/apply", headers={"Authorization": f"Bearer {f3_token}"}, json={"min_price": 950.0, "preferred_price": 1300.0})).json()["id"]

        # Negotiate App 1 (Winner)
        await client.post(f"/api/applications/{a1_id}/negotiate?run_all=true", headers={"Authorization": f"Bearer {c_token}"})
        await client.post(f"/api/applications/{a1_id}/decide", headers={"Authorization": f"Bearer {c_token}"}, json={"role": "client", "action": "accept"})
        await client.post(f"/api/applications/{a1_id}/decide", headers={"Authorization": f"Bearer {f1_token}"}, json={"role": "freelancer", "action": "accept"})

        # Fund Winner
        claim_res = await client.post(f"/api/applications/{a1_id}/fund/create-order", headers={"Authorization": f"Bearer {c_token}"})
        assert claim_res.status_code == 200

        fund_res = await client.post(f"/api/applications/{a1_id}/fund/authorize", headers={"Authorization": f"Bearer {c_token}"})
        assert fund_res.status_code == 200
        assert fund_res.json()["status"] == "funded"

        # Check that rivals A2 and A3 were automatically closed
        a2_data = (await client.get(f"/api/applications/{a2_id}", headers={"Authorization": f"Bearer {c_token}"})).json()
        a3_data = (await client.get(f"/api/applications/{a3_id}", headers={"Authorization": f"Bearer {c_token}"})).json()
        assert a2_data["status"] == "closed"
        assert a3_data["status"] == "closed"

        # Job active_contract is set to winner's contract
        job_data = (await client.get(f"/api/client/jobs/{job_id}", headers={"Authorization": f"Bearer {c_token}"})).json()
        assert job_data["status"] == "funded"
        assert job_data["contract"] is not None
        assert job_data["contract"]["status"] == "funded"
