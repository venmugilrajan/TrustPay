from playwright.sync_api import sync_playwright
import os
import urllib.request

OUTPUT_DIR = os.path.abspath("docs/screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

with urllib.request.urlopen("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js") as resp:
    axe = resp.read().decode("utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 1. Desktop 1440x900
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:3000/freelancer/opportunities", wait_until="domcontentloaded")
    page.evaluate("document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light');")
    
    view_btn = page.wait_for_selector("button:has-text('View Details')", timeout=15000)
    view_btn.click()
    page.wait_for_timeout(600)
    
    page.screenshot(path=os.path.join(OUTPUT_DIR, "opportunities_details_modal_fixed_1440.png"))
    print("Screenshot saved: opportunities_details_modal_fixed_1440.png")

    # Run axe check
    page.evaluate(axe)
    v = page.evaluate("axe.run({ runOnly: ['wcag2a', 'wcag2aa'] }).then(r => r.violations.length)")
    print(f"Modal WCAG AA violations: {v}")
    page.close()

    # 2. Laptop 1280x800
    page_laptop = browser.new_page(viewport={"width": 1280, "height": 800})
    page_laptop.goto("http://127.0.0.1:3000/freelancer/opportunities", wait_until="domcontentloaded")
    view_btn2 = page_laptop.wait_for_selector("button:has-text('View Details')", timeout=15000)
    view_btn2.click()
    page_laptop.wait_for_timeout(600)
    page_laptop.screenshot(path=os.path.join(OUTPUT_DIR, "opportunities_details_modal_fixed_1280.png"))
    print("Screenshot saved: opportunities_details_modal_fixed_1280.png")
    page_laptop.close()

    # 3. Dark Theme 1440x900
    page_dark = browser.new_page(viewport={"width": 1440, "height": 900})
    page_dark.goto("http://127.0.0.1:3000/freelancer/opportunities", wait_until="domcontentloaded")
    page_dark.evaluate("document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark');")
    view_btn3 = page_dark.wait_for_selector("button:has-text('View Details')", timeout=15000)
    view_btn3.click()
    page_dark.wait_for_timeout(600)
    page_dark.screenshot(path=os.path.join(OUTPUT_DIR, "opportunities_details_modal_fixed_dark.png"))
    print("Screenshot saved: opportunities_details_modal_fixed_dark.png")
    page_dark.close()

    browser.close()
