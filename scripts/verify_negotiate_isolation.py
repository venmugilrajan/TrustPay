import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\ruthr\.gemini\antigravity\brain\f7c5cf12-9891-438f-97d6-e40583cdcf48"
JOB_ID = "4d3f8eec-04c4-4629-a379-2795ae728f60"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 1. Test Arjun Kumar (Applicant who has 0 turns and has not negotiated yet)
    page_arjun = browser.new_page(viewport={"width": 1280, "height": 800})
    page_arjun.goto("http://localhost:3000/freelancer", wait_until="networkidle")
    page_arjun.evaluate("""() => {
        localStorage.setItem('trustpay_demo_user_freelancer', JSON.stringify({
            id: 'freelancer_arjun',
            name: 'Arjun Kumar',
            role: 'freelancer',
            email: 'arjun@example.com'
        }));
    }""")
    page_arjun.goto(f"http://localhost:3000/freelancer/work/{JOB_ID}/negotiate", wait_until="networkidle")
    page_arjun.wait_for_timeout(600)

    # Verify right side does NOT show Sofia's agreed contract
    content_arjun = page_arjun.content()
    has_agreed_escrow = "$288.75" in content_arjun
    print("Arjun Kumar sees $288.75?", has_agreed_escrow)
    if has_agreed_escrow:
        print("FAIL: Arjun Kumar leaked Sofia's contract!")
    else:
        print("PASS: Arjun Kumar does NOT see Sofia's contract!")

    # Check NextStepCard text
    next_step = page_arjun.query_selector("div.border-accent-blue\\/20")
    if next_step:
        print("NextStep text for Arjun:", next_step.inner_text().strip())

    arjun_screenshot = os.path.join(ARTIFACT_DIR, "arjun_isolated_negotiate.png")
    page_arjun.screenshot(path=arjun_screenshot)
    print("Saved Arjun screenshot:", arjun_screenshot)
    page_arjun.close()

    # 2. Test Sofia Reyes (Applicant who negotiated and reached agreement)
    page_sofia = browser.new_page(viewport={"width": 1280, "height": 800})
    page_sofia.goto("http://localhost:3000/freelancer", wait_until="networkidle")
    page_sofia.evaluate("""() => {
        localStorage.setItem('trustpay_demo_user_freelancer', JSON.stringify({
            id: 'freelancer_sofia',
            name: 'Sofia Reyes',
            role: 'freelancer',
            email: 'sofia@example.com'
        }));
    }""")
    page_sofia.goto(f"http://localhost:3000/freelancer/work/{JOB_ID}/negotiate", wait_until="networkidle")
    page_sofia.wait_for_timeout(600)

    content_sofia = page_sofia.content()
    has_sofia_contract = "$288.75" in content_sofia
    print("Sofia Reyes sees $288.75?", has_sofia_contract)
    if has_sofia_contract:
        print("PASS: Sofia Reyes sees her agreed contract!")
    else:
        print("FAIL: Sofia Reyes should see her agreed contract!")

    sofia_screenshot = os.path.join(ARTIFACT_DIR, "sofia_isolated_negotiate.png")
    page_sofia.screenshot(path=sofia_screenshot)
    print("Saved Sofia screenshot:", sofia_screenshot)
    page_sofia.close()

    browser.close()

