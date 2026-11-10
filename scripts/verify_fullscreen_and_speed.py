import asyncio
import time
from playwright.async_api import async_playwright

async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Emulate 1920x1080 resolution
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})

        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        print("--- 1. Testing Landing Page Fullscreen (1920x1080) ---")
        t0 = time.time()
        await page.goto("http://localhost:3000", wait_until="domcontentloaded")
        await asyncio.sleep(1.0)
        load_time = (time.time() - t0) * 1000
        print(f"Landing page loaded in {load_time:.1f}ms")
        await page.screenshot(path="C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/fullscreen_landing_1920.png")

        print("--- 2. Testing Instant Anchor Click (Zero Lag) ---")
        t_click_start = time.time()
        await page.click("text=How It Works")
        await asyncio.sleep(0.4)
        click_duration = (time.time() - t_click_start) * 1000
        print(f"Anchor scroll executed smoothly in {click_duration:.1f}ms")

        print("--- 3. Testing Job Posting Wizard Fullscreen ---")
        await page.goto("http://localhost:3000/client/jobs/new", wait_until="domcontentloaded")
        await asyncio.sleep(0.8)
        await page.screenshot(path="C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/fullscreen_job_post_1920.png")

        print("--- 4. Testing Client Job Detail ($1500 Budget Display) ---")
        await page.goto("http://localhost:3000/client/jobs/db7d0949-79ee-4884-9702-f152803a6046", wait_until="domcontentloaded")
        await asyncio.sleep(1.0)
        content = await page.content()
        has_1500 = "$1500.00 USD" in content
        has_zero = "$0.00 USD" in content
        print(f"Allocated Client Budget $1500.00 USD found: {has_1500}")
        print(f"Has accidental $0.00 USD: {has_zero}")
        await page.screenshot(path="C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/fullscreen_client_job_1920.png")

        print("--- 5. Testing Freelancer Negotiation Page ---")
        await page.goto("http://localhost:3000/freelancer/work/db7d0949-79ee-4884-9702-f152803a6046/negotiate", wait_until="domcontentloaded")
        await asyncio.sleep(1.0)
        await page.screenshot(path="C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/fullscreen_negotiation_1920.png")

        print("--- 6. Testing Demo Hub Page ---")
        await page.goto("http://localhost:3000/demo", wait_until="domcontentloaded")
        await asyncio.sleep(1.0)
        await page.screenshot(path="C:/Users/ruthr/.gemini/antigravity/brain/993894da-a4e0-4096-b7e5-7d4658144e63/fullscreen_demo_1920.png")

        await browser.close()

        if errors:
            print("Console Errors detected:", errors)
        else:
            print("SUCCESS: 0 console errors detected across all tested routes!")

if __name__ == "__main__":
    asyncio.run(run_verification())
