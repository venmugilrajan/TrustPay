import os
import sys
import time
import asyncio
import httpx
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screenshots"))
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


async def run_e2e_test():
    print("==================================================")
    print(" TrustPay End-to-End Playwright Automation & Visual Audit")
    print("==================================================")

    # 1. Seed demo scenarios and retrieve job IDs
    async with httpx.AsyncClient() as client:
        seed_res = await client.post("http://127.0.0.1:8000/api/seed")
        assert seed_res.status_code == 200, f"Seed failed: {seed_res.text}"
        seed_data = seed_res.json()
        pass_job_id = seed_data["scenarios"]["pass_job_id"]
        partial_job_id = seed_data["scenarios"]["partial_job_id"]
        fail_job_id = seed_data["scenarios"]["fail_dispute_job_id"]
        print(f"  ✓ Seeded scenarios. Pass Job: {pass_job_id}, Fail Job: {fail_job_id}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 950})
        page = await context.new_page()

        # Step 1: Landing Page
        print("\n[1/7] Capturing Landing Page...")
        await page.goto("http://localhost:3000", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        p1 = os.path.join(SCREENSHOTS_DIR, "01_landing_page.png")
        await page.screenshot(path=p1, full_page=True)
        print(f"  ✓ Saved: {p1}")

        # Step 2: Dashboard
        print("\n[2/7] Capturing Dashboard...")
        await page.goto("http://localhost:3000/dashboard", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        p2 = os.path.join(SCREENSHOTS_DIR, "02_dashboard.png")
        await page.screenshot(path=p2, full_page=True)
        print(f"  ✓ Saved: {p2}")

        # Step 3: New Job Form
        print("\n[3/7] Capturing New Job Form...")
        await page.goto("http://localhost:3000/jobs/new", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        p3 = os.path.join(SCREENSHOTS_DIR, "03_new_job_form.png")
        await page.screenshot(path=p3, full_page=True)
        print(f"  ✓ Saved: {p3}")

        # Step 4: Live Job Detail - Milestones & Judge Verdict
        print(f"\n[4/7] Capturing Milestones & AI Judge Scoring (Job: {pass_job_id})...")
        await page.goto(f"http://localhost:3000/jobs/{pass_job_id}", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        p4 = os.path.join(SCREENSHOTS_DIR, "04_milestones_and_judge_verdict.png")
        await page.screenshot(path=p4, full_page=True)
        print(f"  ✓ Saved: {p4}")

        # Step 5: Live Job Detail - Negotiation View
        print(f"\n[5/7] Capturing Job Negotiation View...")
        tab_btn = page.locator("button", has_text="AI Agent Dialogue")
        if await tab_btn.count() > 0:
            await tab_btn.click()
            await page.wait_for_timeout(1000)
        p5 = os.path.join(SCREENSHOTS_DIR, "05_negotiation_chat.png")
        await page.screenshot(path=p5, full_page=True)
        print(f"  ✓ Saved: {p5}")

        # Step 6: PayPal Payment & Audit Timeline
        print("\n[6/7] Capturing PayPal Payment & Audit Timeline...")
        timeline_btn = page.locator("button", has_text="PayPal & Audit Timeline")
        if await timeline_btn.count() > 0:
            await timeline_btn.click()
            await page.wait_for_timeout(1000)
        p6 = os.path.join(SCREENSHOTS_DIR, "06_paypal_payment_timeline.png")
        await page.screenshot(path=p6, full_page=True)
        print(f"  ✓ Saved: {p6}")

        # Step 7: Dispute Arbitration Case
        print(f"\n[7/7] Capturing Dispute Arbitration Case (Job: {fail_job_id})...")
        await page.goto(f"http://localhost:3000/jobs/{fail_job_id}", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        dispute_btn = page.locator("button", has_text="Dispute Arbitration")
        if await dispute_btn.count() > 0:
            await dispute_btn.click()
            await page.wait_for_timeout(1000)
        p7 = os.path.join(SCREENSHOTS_DIR, "07_dispute_arbitration.png")
        await page.screenshot(path=p7, full_page=True)
        print(f"  ✓ Saved: {p7}")

        await browser.close()

    print("\n==================================================")
    print("🎉 All 7 high-resolution screenshots captured successfully!")
    print(f"Screenshots directory: {SCREENSHOTS_DIR}")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_e2e_test())
