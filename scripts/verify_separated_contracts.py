from playwright.sync_api import sync_playwright
import os
import urllib.request

OUTPUT_DIR = os.path.abspath("docs/screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

with urllib.request.urlopen("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js") as resp:
    axe = resp.read().decode("utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    # Authenticate as freelancer_arjun
    page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded")
    page.evaluate("""
        async () => {
            try {
                const res = await fetch('http://127.0.0.1:8000/api/demo-login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ user_id: 'freelancer_arjun', role: 'freelancer', name: 'Arjun Kumar' })
                });
                const data = await res.json();
                localStorage.setItem('trustpay_auth_token', data.access_token);
                localStorage.setItem('trustpay_freelancer_token', data.access_token);
                localStorage.setItem('trustpay_freelancer_user', JSON.stringify({
                    id: 'freelancer_arjun', name: 'Arjun Kumar', role: 'freelancer'
                }));
            } catch(e) {
                console.error('Login error', e);
            }
        }
    """)
    page.wait_for_timeout(500)

    # 1. Load Freelancer Dashboard
    page.goto("http://127.0.0.1:3000/freelancer", wait_until="domcontentloaded")
    page.evaluate("document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light');")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUTPUT_DIR, "freelancer_separated_all_tab.png"))
    print("Screenshot saved: freelancer_separated_all_tab.png")
    all_rows = page.locator("tbody tr").all_inner_texts()
    print(f"All tab rows count: {len(all_rows)}")

    # Run axe check
    page.evaluate(axe)
    v_all = page.evaluate("axe.run({ runOnly: ['wcag2a', 'wcag2aa'] }).then(r => r.violations.length)")
    print(f"Axe violations on 'All' tab: {v_all}")

    # 2. Click "Active Delivery" tab
    active_tab = page.locator("button:has-text('Active Delivery')").first
    if active_tab.is_visible():
        active_tab.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "freelancer_separated_active_tab.png"))
        print("Screenshot saved: freelancer_separated_active_tab.png")
        rows = page.locator("tbody tr").all_inner_texts()
        print(f"Active tab rows count: {len(rows)}")

    # 3. Click "Completed & Paid" tab
    comp_tab = page.locator("button:has-text('Completed & Paid')").first
    if comp_tab.is_visible():
        comp_tab.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "freelancer_separated_completed_tab.png"))
        print("Screenshot saved: freelancer_separated_completed_tab.png")
        rows = page.locator("tbody tr").all_inner_texts()
        print(f"Completed tab rows count: {len(rows)}")

    # 4. Click "In Dispute" tab
    disp_tab = page.locator("button:has-text('In Dispute')").first
    if disp_tab.is_visible():
        disp_tab.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "freelancer_separated_dispute_tab.png"))
        print("Screenshot saved: freelancer_separated_dispute_tab.png")
        rows = page.locator("tbody tr").all_inner_texts()
        print(f"Dispute tab rows count: {len(rows)}")

    # 5. Check Freelancer Work page as well
    page.goto("http://127.0.0.1:3000/freelancer/work", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUTPUT_DIR, "freelancer_work_separated_tabs.png"))
    print("Screenshot saved: freelancer_work_separated_tabs.png")

    # 6. Check Client Dashboard with separated tabs
    page.goto("http://127.0.0.1:3000/client", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUTPUT_DIR, "client_separated_all_tab.png"))
    print("Screenshot saved: client_separated_all_tab.png")

    browser.close()
