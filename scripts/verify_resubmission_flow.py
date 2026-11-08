import asyncio
import os
import sys
from playwright.async_api import async_playwright
import httpx

async def run():
    print("Testing deliverable resubmission flow...")
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api", timeout=60.0) as client:
        # 1. Reset demo data & seed demo job
        print("Resetting and seeding demo scenarios...")
        reset_res = await client.post("/seed/reset")
        assert reset_res.status_code == 200, f"Reset failed: {reset_res.text}"

        seed_res = await client.post("/seed")
        assert seed_res.status_code == 200, f"Seed failed: {seed_res.text}"
        scenarios = seed_res.json()["scenarios"]
        job_id = scenarios["partial_job_id"]
        print(f"Seeded job ID (partial scenario): {job_id}")

        # Fetch job to get first milestone ID
        job_data = (await client.get(f"/jobs/{job_id}")).json()
        milestone = job_data["contract"]["milestones"][0]
        milestone_id = milestone["id"]
        print(f"Target milestone ID: {milestone_id}, title: {milestone['title']}")

        # Submit Revision 1 with 'asdfg'
        print("Submitting Revision 1 ('asdfg')...")
        sub1_res = await client.post(
            f"/jobs/{job_id}/milestones/{milestone_id}/submit",
            data={"submission_type": "code", "content_text": "asdfg placeholder string"}
        )
        assert sub1_res.status_code == 200, f"Submission 1 failed: {sub1_res.text}"
        print("Revision 1 submitted successfully.")

        # Submit Revision 2 with genuine Python code
        print("Submitting Revision 2 (valid code implementation)...")
        valid_code = '''
def calculate_fee(amount: float) -> float:
    """Computes escrow service fee."""
    return round(amount * 0.025, 2)

def verify_payload(payload: dict) -> bool:
    """Verifies deliverable checksum and structure."""
    return "id" in payload and payload.get("status") == "ready"
'''
        sub2_res = await client.post(
            f"/jobs/{job_id}/milestones/{milestone_id}/submit",
            data={"submission_type": "code", "content_text": valid_code}
        )
        assert sub2_res.status_code == 200, f"Submission 2 failed: {sub2_res.text}"
        print("Revision 2 submitted successfully.")

    # Now verify in browser via Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        work_url = f"http://localhost:3000/freelancer/work/{job_id}"
        print(f"Navigating to {work_url}...")
        await page.goto(work_url, wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Take screenshot of default view
        screenshot_path = "C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/resubmission_verified_v2_latest.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Captured screenshot at {screenshot_path}")

        # Verify Revision #3 (the latest submission) is selected by default
        body_text = await page.inner_text("body")
        assert "Revision #3" in body_text, f"Expected Revision #3 in body text, got: {body_text[:300]}"
        assert "calculate_fee" in body_text, "Expected Revision #3 code ('calculate_fee') to be shown in the deliverable preview"
        print("SUCCESS: Revision #3 (Latest) is selected by default, displaying genuine code instead of old 'asdfg'!")

        # Verify clicking Revision #2 button switches view to Revision 2 ('asdfg')
        rev2_btn = page.locator("button:has-text('v2')")
        assert await rev2_btn.count() > 0, "Expected v2 revision button to be present"
        print("Clicking v2 revision button...")
        await rev2_btn.first.click()
        await page.wait_for_timeout(500)
        
        body_v2 = await page.inner_text("body")
        assert "asdfg placeholder string" in body_v2, "Expected v2 deliverable text ('asdfg') when v2 is selected"
        print("SUCCESS: Clicking v2 correctly shows historical 'asdfg' submission!")

        # Click back to v3 (Latest)
        rev3_btn = page.locator("button:has-text('v3')")
        assert await rev3_btn.count() > 0, "Expected v3 revision button to be present"
        print("Clicking v3 revision button...")
        await rev3_btn.first.click()
        await page.wait_for_timeout(500)
        body_v3 = await page.inner_text("body")
        assert "calculate_fee" in body_v3, "Expected v3 code when v3 is clicked again"
        print("SUCCESS: Clicking back to v3 correctly restores newest submission details!")

        await browser.close()
        print("ALL RESUBMISSION TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(run())
