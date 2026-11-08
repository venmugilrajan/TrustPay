import asyncio
from playwright.async_api import async_playwright

async def inspect():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda m: print("CONSOLE:", m.text))
        page.on("response", lambda r: print("RESP:", r.status, r.url))

        await page.goto("http://localhost:3000/client/jobs/new")
        await page.fill("input[placeholder*='PostgreSQL']", "Smart Contract Auditor")
        await page.fill("textarea", "Audit ERC20 token implementation with comprehensive unit tests")
        await page.click("button:has-text('Continue to Budget')")
        await asyncio.sleep(0.5)
        await page.click("button:has-text('Review Project')")
        await asyncio.sleep(0.5)

        print("Clicking Launch AI Negotiation...")
        await page.click("button:has-text('Launch AI Negotiation')")
        await asyncio.sleep(4)

        print("FINAL URL:", page.url)
        content = await page.content()
        if "Not Found" in content:
            print(">>> ERROR: Still contains 'Not Found'!")
        elif "error" in content.lower():
            print(">>> Found other error in HTML")
        else:
            print(">>> No errors found!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect())
