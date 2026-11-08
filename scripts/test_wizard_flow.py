import asyncio
from playwright.async_api import async_playwright

async def test_post_job():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print("CONSOLE:", msg.text))

        print("Navigating to /client/jobs/new...")
        await page.goto("http://localhost:3000/client/jobs/new")
        await asyncio.sleep(1)

        # Type in title and description
        print("Typing title and description...")
        await page.fill("input[placeholder*='PostgreSQL']", "Smart Contract Auditor")
        await page.fill("textarea", "Audit ERC20 token implementation with comprehensive unit tests")
        await asyncio.sleep(0.5)

        # Step 1: Click Continue to Budget
        print("Clicking Continue to Budget...")
        await page.click("button:has-text('Continue to Budget')")
        await asyncio.sleep(0.5)

        # Step 2: Click Review Project
        print("Clicking Review Project...")
        await page.click("button:has-text('Review Project')")
        await asyncio.sleep(0.5)

        # Step 3: Click Launch AI Negotiation
        print("Clicking Launch AI Negotiation...")
        await page.click("button:has-text('Launch AI Negotiation')")

        # Wait for redirect to contract page (NOT /new)
        await page.wait_for_url(lambda u: "/client/jobs/" in u and not u.endswith("/new"), timeout=25000)
        print("SUCCESS! Navigated to:", page.url)

        await asyncio.sleep(1)
        screenshot_path = r"C:\Users\ruthr\.gemini\antigravity\brain\993894da-a4e0-4096-b7e5-7d4658144e63\post_job_success_verified.png"
        await page.screenshot(path=screenshot_path)
        print("Saved success screenshot:", screenshot_path)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_post_job())
