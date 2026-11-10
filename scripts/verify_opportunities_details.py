from playwright.sync_api import sync_playwright
import os

OUTPUT_DIR = os.path.abspath("docs/screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    # 1. Opportunities page
    page.goto("http://127.0.0.1:3000/freelancer/opportunities", wait_until="domcontentloaded")
    page.evaluate("document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light');")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUTPUT_DIR, "opportunities_table_with_view_details.png"))
    print("Screenshot 1 saved: opportunities_table_with_view_details.png")

    # 2. Click "View Details" button
    view_btn = page.locator("button:has-text('View Details')").first
    if view_btn.is_visible():
        view_btn.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "opportunities_details_modal.png"))
        print("Screenshot 2 saved: opportunities_details_modal.png")

        # 3. Click "Apply for this Work" inside details modal
        apply_btn = page.locator("button:has-text('Apply for this Work')").first
        if apply_btn.is_visible():
            apply_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "opportunities_apply_modal_transition.png"))
            print("Screenshot 3 saved: opportunities_apply_modal_transition.png")
        else:
            print("Apply for this Work button not found in modal")
    else:
        print("View Details button not found on page")

    browser.close()

