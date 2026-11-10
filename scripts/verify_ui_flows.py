import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\ruthr\.gemini\antigravity\brain\993894da-a4e0-4096-b7e5-7d4658144e63"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("[1] Opening client job creation page...")
        await page.goto("http://localhost:3000/client/jobs/new")
        await page.wait_for_selector("text=Step 1: Describe the Work", timeout=10000)

        # Fill Step 1
        await page.fill("#project-title", "Zero-Knowledge Rollup Settlement Contract")
        await page.fill("textarea", "Implement EVM smart contract and verification circuits for optimistic rollup state transitions and proof validation.")
        await page.wait_for_timeout(300)

        # Click Continue to Step 2
        await page.click("button:has-text('Continue to Budget')")
        await page.wait_for_selector("text=Step 2: Budget & Target Deadline", timeout=5000)
        await page.wait_for_timeout(300)

        # Fill Step 2
        await page.fill("input[type='number']", "1500")
        await page.wait_for_timeout(300)

        # Click Continue to Step 3
        await page.click("button:has-text('Review Project')")
        await page.wait_for_selector("text=Step 3: Review & Initiate AI Negotiation", timeout=5000)
        await page.wait_for_timeout(300)

        step3_path = os.path.join(ARTIFACT_DIR, "step3_review_verified.png")
        await page.screenshot(path=step3_path)
        print(f"Saved Step 3 review screenshot: {step3_path}")

        # Click Launch AI Negotiation
        print("[2] Submitting job creation...")
        await page.click("button:has-text('Launch AI Negotiation')")
        await page.wait_for_url(lambda url: "/client/jobs/" in url and not url.endswith("/new"), timeout=15000)
        await page.wait_for_timeout(1000)

        client_job_url = page.url
        print(f"Redirected to: {client_job_url}")

        job_detail_path = os.path.join(ARTIFACT_DIR, "client_job_budget_verified.png")
        await page.screenshot(path=job_detail_path)
        print(f"Saved client job screenshot: {job_detail_path}")

        content = await page.content()
        assert "$1500.00 USD" in content or "$1,500.00 USD" in content, "Error: budget did not show $1500.00!"
        assert "$0.00 USD" not in content, "Error: still showing $0.00 USD!"
        print("PASS: Client job view verified showing $1500.00 USD and NOT $0.00 USD!")

        # Check Freelancer view
        print("[3] Checking freelancer opportunities...")
        await page.goto("http://localhost:3000/freelancer/opportunities")
        await page.wait_for_selector("text=Open Freelance Opportunities", timeout=10000)
        await page.wait_for_timeout(1000)

        opp_path = os.path.join(ARTIFACT_DIR, "freelancer_opportunities_verified.png")
        await page.screenshot(path=opp_path)
        print(f"Saved freelancer opportunities screenshot: {opp_path}")

        opp_content = await page.content()
        assert "$0.00 USD" not in opp_content, "Error: Freelancer opportunities table showed $0.00 USD!"
        print("PASS: Freelancer opportunities verified with accurate public estimates!")

        # Negotiate job
        job_id = client_job_url.split("/")[-1]
        print(f"[4] Testing negotiation on job {job_id}...")
        await page.goto(f"http://localhost:3000/client/jobs/{job_id}/negotiate")
        await page.wait_for_selector("button:has-text('Start Autonomous Dialogue')", timeout=10000)
        await page.wait_for_timeout(500)

        # Click start autonomous dialogue
        await page.click("button:has-text('Start Autonomous Dialogue')")
        # Wait for turns to appear
        await page.wait_for_selector("text=Client Agent", timeout=30000)
        await page.wait_for_timeout(3000)

        negotiate_path = os.path.join(ARTIFACT_DIR, "negotiation_turns_verified.png")
        await page.screenshot(path=negotiate_path)
        print(f"Saved negotiation turns screenshot: {negotiate_path}")

        await browser.close()
        print("ALL UI FLOWS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
