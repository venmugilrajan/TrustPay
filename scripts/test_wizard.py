import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        page.on("console", lambda msg: print("BROWSER LOG:", msg.text))
        await page.goto("http://localhost:3000/client/jobs/new")
        await page.fill("#project-title", "Zero-Knowledge Rollup Settlement Contract")
        await page.fill("textarea", "Implement EVM smart contract and verification circuits.")
        await page.click("button:has-text('Continue to Budget')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="after_click_step1.png")
        print("Error on page:", await page.locator(".text-danger").all_text_contents())
        content = await page.content()
        print("Has Step 2 in content:", "Step 2" in content)
        await b.close()

if __name__ == "__main__":
    asyncio.run(check())
