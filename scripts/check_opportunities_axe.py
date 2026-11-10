from playwright.sync_api import sync_playwright
import urllib.request

with urllib.request.urlopen("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js") as resp:
    axe = resp.read().decode("utf-8")

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:3000/freelancer/opportunities", wait_until="domcontentloaded")
    page.wait_for_timeout(800)

    # Click view details modal
    page.locator("button:has-text('View Details')").first.click()
    page.wait_for_timeout(500)
    page.evaluate(axe)
    count = page.evaluate("axe.run({ runOnly: ['wcag2a', 'wcag2aa'] }).then(r => r.violations.length)")
    print(f"Modal WCAG AA violations count: {count}")
    b.close()
