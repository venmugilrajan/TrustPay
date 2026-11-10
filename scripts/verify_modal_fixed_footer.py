import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\ruthr\.gemini\antigravity\brain\f7c5cf12-9891-438f-97d6-e40583cdcf48"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Test 1: View Details Modal on small laptop viewport (1024x640)
    page = browser.new_page(viewport={"width": 1024, "height": 640})
    page.goto("http://localhost:3000/freelancer/opportunities", wait_until="networkidle")
    page.evaluate("""() => {
        localStorage.setItem('trustpay_demo_user_freelancer', JSON.stringify({
            id: 'freelancer_arjun',
            name: 'Arjun Kumar',
            role: 'freelancer',
            email: 'arjun@example.com'
        }));
    }""")
    page.reload(wait_until="networkidle")

    # Click View Details
    view_btn = page.wait_for_selector("button:has-text('View Details')")
    view_btn.click()
    page.wait_for_timeout(500)

    # Take screenshot of View Details modal
    details_img = os.path.join(ARTIFACT_DIR, "details_modal_fixed_640.png")
    page.screenshot(path=details_img)
    print("Saved details screenshot:", details_img)

    # Verify buttons in footer
    close_btn = page.wait_for_selector("button:has-text('Close')")
    apply_work_btn = page.wait_for_selector("button:has-text('Apply for this Work')")
    box_apply = apply_work_btn.bounding_box()
    print("Apply for this Work bounding box:", box_apply)
    print("Viewport height:", page.viewport_size['height'])
    if box_apply and box_apply['y'] + box_apply['height'] <= page.viewport_size['height']:
        print("PASS: Apply for this Work button is 100% visible inside viewport on 640px height!")
    else:
        print("FAIL: Apply for this Work button is outside viewport!")

    # Now click "Apply for this Work" from details
    apply_work_btn.click()
    page.wait_for_timeout(500)

    # Take screenshot of Apply Modal
    apply_img = os.path.join(ARTIFACT_DIR, "apply_modal_fixed_640.png")
    page.screenshot(path=apply_img)
    print("Saved apply screenshot:", apply_img)

    # Verify Apply modal submit button in footer
    submit_btn = page.wait_for_selector("button:has-text('Submit & Start Negotiation')")
    box_submit = submit_btn.bounding_box()
    print("Submit & Start Negotiation bounding box:", box_submit)
    if box_submit and box_submit['y'] + box_submit['height'] <= page.viewport_size['height']:
        print("PASS: Submit & Start Negotiation button is 100% visible inside viewport on 640px height!")
    else:
        print("FAIL: Submit & Start Negotiation button is outside viewport!")

    # Test Dark Mode on 1280x800
    page_dark = browser.new_page(viewport={"width": 1280, "height": 800})
    page_dark.goto("http://localhost:3000/freelancer/opportunities", wait_until="networkidle")
    page_dark.evaluate("""() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('trustpay_demo_user_freelancer', JSON.stringify({
            id: 'freelancer_arjun',
            name: 'Arjun Kumar',
            role: 'freelancer',
            email: 'arjun@example.com'
        }));
    }""")
    page_dark.reload(wait_until="networkidle")

    view_btn_dark = page_dark.wait_for_selector("button:has-text('View Details')")
    view_btn_dark.click()
    page_dark.wait_for_timeout(500)

    dark_details_img = os.path.join(ARTIFACT_DIR, "details_modal_fixed_dark.png")
    page_dark.screenshot(path=dark_details_img)
    print("Saved dark details screenshot:", dark_details_img)

    apply_dark = page_dark.wait_for_selector("button:has-text('Apply for this Work')")
    apply_dark.click()
    page_dark.wait_for_timeout(500)

    dark_apply_img = os.path.join(ARTIFACT_DIR, "apply_modal_fixed_dark.png")
    page_dark.screenshot(path=dark_apply_img)
    print("Saved dark apply screenshot:", dark_apply_img)

    browser.close()

