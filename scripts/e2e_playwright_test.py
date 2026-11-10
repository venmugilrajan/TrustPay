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
    print(" TrustPay Rebuild End-to-End Visual Audit & Capture")
    print("==================================================")

    # 1. Seed demo scenarios
    async with httpx.AsyncClient() as client:
        try:
            seed_res = await client.post("http://127.0.0.1:8000/api/demo/seed")
            if seed_res.status_code == 200:
                print("  ✓ Seeded 3 pristine demonstration scenarios.")
        except Exception as e:
            print(f"  Note: Backend not running or unreachable: {e}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # Desktop Context
        desktop_ctx = await browser.new_context(viewport={"width": 1440, "height": 950})
        page = await desktop_ctx.new_page()

        # Step 1: Landing Page Desktop (1440px)
        print("\n[1/8] Capturing Landing Page (Desktop 1440px)...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p1 = os.path.join(SCREENSHOTS_DIR, "01_landing_page_desktop.png")
        await page.screenshot(path=p1, full_page=True)
        print(f"  ✓ Saved: {p1}")

        # Step 2: Client Dashboard
        print("\n[2/8] Capturing Client Dashboard (1440px)...")
        await page.goto("http://localhost:3000/client", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p2 = os.path.join(SCREENSHOTS_DIR, "02_client_dashboard.png")
        await page.screenshot(path=p2, full_page=True)
        print(f"  ✓ Saved: {p2}")

        # Step 3: Post Job Wizard
        print("\n[3/8] Capturing Post Job Wizard...")
        await page.goto("http://localhost:3000/client/jobs/new", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p3 = os.path.join(SCREENSHOTS_DIR, "03_post_job_wizard.png")
        await page.screenshot(path=p3, full_page=True)
        print(f"  ✓ Saved: {p3}")

        # Step 4: Client Payments Ledger
        print("\n[4/8] Capturing Client Payments Ledger...")
        await page.goto("http://localhost:3000/client/payments", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p4 = os.path.join(SCREENSHOTS_DIR, "04_client_payments_ledger.png")
        await page.screenshot(path=p4, full_page=True)
        print(f"  ✓ Saved: {p4}")

        # Step 5: Freelancer Opportunities
        print("\n[5/8] Capturing Freelancer Opportunities...")
        await page.goto("http://localhost:3000/freelancer/opportunities", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p5 = os.path.join(SCREENSHOTS_DIR, "05_freelancer_opportunities.png")
        await page.screenshot(path=p5, full_page=True)
        print(f"  ✓ Saved: {p5}")

        # Step 6: Freelancer Work List
        print("\n[6/8] Capturing Freelancer Work List...")
        await page.goto("http://localhost:3000/freelancer/work", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p6 = os.path.join(SCREENSHOTS_DIR, "06_freelancer_work.png")
        await page.screenshot(path=p6, full_page=True)
        print(f"  ✓ Saved: {p6}")

        # Step 7: Demo Hub
        print("\n[7/8] Capturing Demo Hub...")
        await page.goto("http://localhost:3000/demo", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        p7 = os.path.join(SCREENSHOTS_DIR, "07_demo_hub.png")
        await page.screenshot(path=p7, full_page=True)
        print(f"  ✓ Saved: {p7}")

        # Step 8: Mobile Landing Page (390px iPhone viewport)
        print("\n[8/8] Capturing Mobile Landing Page (390px)...")
        mobile_ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        mobile_page = await mobile_ctx.new_page()
        await mobile_page.goto("http://localhost:3000", wait_until="networkidle")
        await mobile_page.wait_for_timeout(1000)
        p8 = os.path.join(SCREENSHOTS_DIR, "08_landing_page_mobile.png")
        await mobile_page.screenshot(path=p8, full_page=True)
        print(f"  ✓ Saved: {p8}")

        await browser.close()

    print("\n==================================================")
    print("🎉 All 8 visual audit screenshots captured successfully!")
    print(f"Screenshots directory: {SCREENSHOTS_DIR}")


if __name__ == "__main__":
    asyncio.run(run_e2e_test())
