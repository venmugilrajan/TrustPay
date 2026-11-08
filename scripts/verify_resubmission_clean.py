import asyncio
from playwright.async_api import async_playwright
import httpx

async def run():
    print("Testing deliverable resubmission on a clean new job...")
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api", timeout=60.0) as client:
        # Create a fresh job
        job_res = await client.post("/jobs", json={
            "title": "Payment Verification Service",
            "description": "Build high-throughput escrow callback handler",
            "max_budget": 500.0,
            "deadline": "2026-12-31"
        })
        assert job_res.status_code in (200, 201), f"Create job failed: {job_res.text}"
        job_id = job_res.json()["id"]
        print(f"Created job: {job_id}")

        # Advance negotiation to completion (creates contract & milestones)
        neg_res = await client.post(f"/jobs/{job_id}/negotiate?run_all=true")
        assert neg_res.status_code == 200, f"Negotiation failed: {neg_res.text}"
        print("Negotiation reached agreement.")

        # Both approve contract
        await client.post(f"/jobs/{job_id}/approve", json={"role": "client"})
        await client.post(f"/jobs/{job_id}/approve", json={"role": "freelancer"})
        print("Contract approved by both client and freelancer.")

        # Fund escrow
        fund_res = await client.post(f"/jobs/{job_id}/fund", json={"payment_source": "paypal_wallet"})
        assert fund_res.status_code == 200, f"Funding failed: {fund_res.text}"
        print("Contract funded into escrow.")

        # Get milestone 1
        job_data = (await client.get(f"/jobs/{job_id}")).json()
        m1 = job_data["contract"]["milestones"][0]
        m1_id = m1["id"]
        print(f"Milestone 1: {m1_id} - '{m1['title']}'")

        # Submit Revision 1 with 'asdfg' (bad submission that will score low/fail)
        print("Submitting Revision 1 ('asdfg')...")
        sub1 = await client.post(
            f"/jobs/{job_id}/milestones/{m1_id}/submit",
            data={"submission_type": "code", "content_text": "asdfg placeholder code"}
        )
        assert sub1.status_code == 200, f"Sub 1 failed: {sub1.text}"
        print(f"Revision 1 score: {sub1.json().get('overall_score')}, verdict: {sub1.json().get('verdict')}")

        # Submit Revision 2 with valid code
        print("Submitting Revision 2 (valid implementation)...")
        valid_code = "def process_payout(account_id, amount):\n    return {'status': 'processed', 'account': account_id, 'amount': amount}"
        sub2 = await client.post(
            f"/jobs/{job_id}/milestones/{m1_id}/submit",
            data={"submission_type": "code", "content_text": valid_code}
        )
        assert sub2.status_code == 200, f"Sub 2 failed: {sub2.text}"
        print(f"Revision 2 score: {sub2.json().get('overall_score')}, verdict: {sub2.json().get('verdict')}")

    # Now verify UI in browser
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})

        url = f"http://localhost:3000/freelancer/work/{job_id}"
        print(f"Opening freelancer work page: {url}")
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_timeout(1000)

        screenshot_path = "C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/resubmission_success_verified.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to: {screenshot_path}")

        body = await page.inner_text("body")
        
        # 1. Verify Revision #2 is selected and shows valid code
        assert "Revision #2" in body, "Expected Revision #2 to be visible"
        assert "process_payout" in body, "Expected Revision #2 code ('process_payout') to be displayed"
        print("VERIFIED: Revision #2 (Latest) is selected by default and shows the new submission!")

        # 2. Verify v1 button is available and switches to Revision 1 ('asdfg')
        v1_btn = page.locator("button:has-text('v1')")
        assert await v1_btn.count() > 0, "Expected v1 button in submission history"
        await v1_btn.first.click()
        await page.wait_for_timeout(500)

        body_v1 = await page.inner_text("body")
        assert "asdfg placeholder code" in body_v1, "Expected v1 submission text when v1 is selected"
        print("VERIFIED: Clicking v1 button successfully displays historical Revision #1 ('asdfg')!")

        # 3. Verify v2 button switches back to Revision 2
        v2_btn = page.locator("button:has-text('v2')")
        assert await v2_btn.count() > 0, "Expected v2 button in submission history"
        await v2_btn.first.click()
        await page.wait_for_timeout(500)

        body_v2 = await page.inner_text("body")
        assert "process_payout" in body_v2, "Expected v2 code restored when v2 clicked"
        print("VERIFIED: Clicking v2 button restores Revision #2 details!")

        await browser.close()
        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run())
