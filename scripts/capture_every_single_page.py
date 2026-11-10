import os
import sys
import asyncio
import httpx
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screenshots"))
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


async def capture_all():
    print("=" * 70)
    print(" TRUSTPAY COMPREHENSIVE VISUAL AUDIT: ALL PAGES @ 1440px & 390px")
    print("=" * 70)

    # 1. Seed pristine demo scenarios to have rich data across all views
    async with httpx.AsyncClient() as client:
        seed_res = await client.post("http://127.0.0.1:8000/api/demo/seed")
        assert seed_res.status_code == 200, f"Seed failed: {seed_res.text}"
        seed_data = seed_res.json()
        scenarios = seed_data["scenarios"]
        job_success_id = scenarios[0]["job_id"]   # Complete success with passed verdicts & capture
        job_partial_id = scenarios[1]["job_id"]   # In progress with partial verdict
        job_dispute_id = scenarios[2]["job_id"]   # Disputed milestone
        print(f"  ✓ Seeded scenarios. Success Job: {job_success_id}, Partial: {job_partial_id}, Dispute: {job_dispute_id}")

    # Set of pages to capture with their human labels
    pages_to_capture = [
        # General & Home
        ("01_landing_page", "http://localhost:3000/"),
        ("02_demo_hub", "http://localhost:3000/demo"),

        # Client Portal
        ("03_client_dashboard", "http://localhost:3000/client"),
        ("04_client_post_job_wizard", "http://localhost:3000/client/jobs/new"),
        ("05_client_contract_milestones_verdict", f"http://localhost:3000/client/jobs/{job_success_id}"),
        ("06_client_negotiation_thread", f"http://localhost:3000/client/jobs/{job_partial_id}/negotiate"),
        ("07_client_fund_escrow_page", f"http://localhost:3000/client/jobs/{job_partial_id}/fund"),
        ("08_client_payments_ledger", "http://localhost:3000/client/payments"),
        ("09_client_disputes", "http://localhost:3000/client/disputes"),

        # Freelancer Portal
        ("10_freelancer_dashboard", "http://localhost:3000/freelancer"),
        ("11_freelancer_opportunities", "http://localhost:3000/freelancer/opportunities"),
        ("12_freelancer_my_work", "http://localhost:3000/freelancer/work"),
        ("13_freelancer_contract_workspace", f"http://localhost:3000/freelancer/work/{job_partial_id}"),
        ("14_freelancer_negotiation_thread", f"http://localhost:3000/freelancer/work/{job_partial_id}/negotiate"),
        ("15_freelancer_earnings_ledger", "http://localhost:3000/freelancer/earnings"),
        ("16_freelancer_disputes", "http://localhost:3000/freelancer/disputes"),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for name, url in pages_to_capture:
            # 1. Desktop 1440px
            desktop_ctx = await browser.new_context(viewport={"width": 1440, "height": 950})
            d_page = await desktop_ctx.new_page()
            try:
                await d_page.goto(url, wait_until="networkidle", timeout=15000)
                await d_page.wait_for_timeout(800)
            except Exception:
                await d_page.wait_for_timeout(1500)
            d_path = os.path.join(SCREENSHOTS_DIR, f"{name}_1440px.png")
            await d_page.screenshot(path=d_path, full_page=True)
            await desktop_ctx.close()
            print(f"  ✓ Captured (1440px): {name}_1440px.png")

            # 2. Mobile 390px (iPhone viewport)
            mobile_ctx = await browser.new_context(viewport={"width": 390, "height": 844})
            m_page = await mobile_ctx.new_page()
            try:
                await m_page.goto(url, wait_until="networkidle", timeout=15000)
                await m_page.wait_for_timeout(800)
            except Exception:
                await m_page.wait_for_timeout(1500)
            m_path = os.path.join(SCREENSHOTS_DIR, f"{name}_390px.png")
            await m_page.screenshot(path=m_path, full_page=True)
            await mobile_ctx.close()
            print(f"  ✓ Captured (390px):  {name}_390px.png")

        await browser.close()

    print("\n" + "=" * 70)
    print(f"🎉 Successfully captured all 32 screenshots in: {SCREENSHOTS_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(capture_all())

