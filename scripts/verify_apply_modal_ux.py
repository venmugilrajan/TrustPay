import os
import json
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\ruthr\.gemini\antigravity\brain\f7c5cf12-9891-438f-97d6-e40583cdcf48"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # 1. Test on 1280x800 (standard laptop screen where cutoff was happening)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto("http://localhost:3000/freelancer/opportunities", wait_until="networkidle")
    
    # Setup freelancer identity
    page.evaluate("""() => {
        localStorage.setItem('trustpay_demo_user_freelancer', JSON.stringify({
            id: 'freelancer_arjun',
            name: 'Arjun Kumar',
            role: 'freelancer',
            email: 'arjun@example.com'
        }));
    }""")
    page.reload(wait_until="networkidle")
    
    # Look for "Apply Now" button
    apply_btn = page.query_selector("button:has-text('Apply Now')")
    if not apply_btn:
        print("No Apply Now button directly on page, checking View Details -> Apply for this Work")
        view_btn = page.query_selector("button:has-text('View Details')")
        if view_btn:
            view_btn.click()
            page.wait_for_timeout(400)
            apply_from_details = page.wait_for_selector("button:has-text('Apply for this Work')", timeout=5000)
            apply_from_details.click()
    else:
        apply_btn.click()
        
    page.wait_for_timeout(500)
    
    # Check inputs in the modal
    min_input = page.wait_for_selector("input[placeholder='250']")
    pref_input = page.wait_for_selector("input[placeholder='400']")
    days_input = page.wait_for_selector("input[placeholder='14']")
    
    print("Initial min price value:", repr(min_input.input_value()))
    print("Initial preferred price value:", repr(pref_input.input_value()))
    print("Initial days value:", repr(days_input.input_value()))
    
    # Test typing into min_input and pref_input: backspace and retype to test leading zero prevention
    min_input.fill("")
    min_input.type("0250") # Simulate user typing 0250 or leading zero
    print("Value after typing '0250' into min price:", repr(min_input.input_value()))
    
    pref_input.fill("")
    pref_input.type("0400") # Simulate user typing 0400
    print("Value after typing '0400' into preferred price:", repr(pref_input.input_value()))
    
    # Capture screenshot of Apply Modal on 1280x800
    screenshot_1280 = os.path.join(ARTIFACT_DIR, "freelancer_apply_modal_fixed_1280.png")
    page.screenshot(path=screenshot_1280)
    print("Saved screenshot:", screenshot_1280)
    
    # Check visibility of action buttons
    submit_btn = page.wait_for_selector("button:has-text('Submit & Start Negotiation')")
    cancel_btn = page.wait_for_selector("button:has-text('Cancel')")
    
    box = submit_btn.bounding_box()
    viewport = page.viewport_size
    print(f"Submit button bounding box: {box}")
    print(f"Viewport height: {viewport['height']}")
    
    if box and box['y'] + box['height'] <= viewport['height']:
        print("PASS: Submit button is 100% inside the viewport, NOT cut off!")
    else:
        print("WARNING: Submit button might be cut off!")
        
    # Test Dark Theme
    page.evaluate("document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark');")
    page.wait_for_timeout(300)
    screenshot_dark = os.path.join(ARTIFACT_DIR, "freelancer_apply_modal_fixed_dark.png")
    page.screenshot(path=screenshot_dark)
    print("Saved dark screenshot:", screenshot_dark)
    
    browser.close()

