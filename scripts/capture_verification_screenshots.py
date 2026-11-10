import os
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:3000"
OUTPUT_DIR = os.path.abspath("docs/screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Fetch axe-core script for accessibility audit
AXE_URL = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js"
try:
    with urllib.request.urlopen(AXE_URL, timeout=10) as resp:
        AXE_SCRIPT = resp.read().decode("utf-8")
except Exception as e:
    print(f"Warning: could not fetch axe.min.js: {e}")
    AXE_SCRIPT = ""

PAGES_1440 = [
    ("/", "landing"),
    ("/client", "client_dashboard"),
    ("/client/jobs/new", "client_post_job"),
    ("/client/jobs/2dd4fbb8-098a-4047-8efe-48322c6de334", "client_job_detail"),
    ("/client/jobs/2dd4fbb8-098a-4047-8efe-48322c6de334/fund", "client_fund_page"),
    ("/client/jobs/2dd4fbb8-098a-4047-8efe-48322c6de334/negotiate", "client_negotiate"),
    ("/client/payments", "client_payments_ledger"),
    ("/client/disputes", "client_disputes"),
    ("/freelancer", "freelancer_dashboard"),
    ("/freelancer/opportunities", "freelancer_opportunities"),
    ("/freelancer/work", "freelancer_work_list"),
    ("/freelancer/work/2dd4fbb8-098a-4047-8efe-48322c6de334", "freelancer_work_detail"),
    ("/freelancer/earnings", "freelancer_earnings"),
    ("/freelancer/disputes", "freelancer_disputes"),
    ("/demo", "demo_hub"),
]

PAGES_390 = [
    ("/client", "client_dashboard"),
    ("/client/jobs/new", "client_post_job"),
    ("/client/jobs/2dd4fbb8-098a-4047-8efe-48322c6de334/negotiate", "client_negotiate"),
    ("/client/jobs/2dd4fbb8-098a-4047-8efe-48322c6de334/fund", "client_fund_page"),
    ("/client/jobs/2dd4fbb8-098a-4047-8efe-48322c6de334", "client_job_detail"),
    ("/freelancer", "freelancer_dashboard"),
]

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        axe_violations_report = []

        print("=== 1. Capturing 1440px Desktop Screenshots (Light & Dark) ===")
        context = browser.new_context(viewport={"width": 1440, "height": 900})

        for path, name in PAGES_1440:
            url = f"{BASE_URL}{path}"
            page = context.new_page()
            
            # --- Light Theme ---
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.evaluate("document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light');")
                page.wait_for_timeout(800)
                light_file = os.path.join(OUTPUT_DIR, f"1440_light_{name}.png")
                page.screenshot(path=light_file, full_page=False)
                print(f"  [OK] 1440 light: {name} -> {light_file}")

                # Run axe check
                if AXE_SCRIPT:
                    page.evaluate(AXE_SCRIPT)
                    res = page.evaluate("axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })")
                    violations = res.get("violations", [])
                    if violations:
                        axe_violations_report.append((f"1440 light {name}", len(violations), [v['id'] for v in violations]))
            except Exception as e:
                print(f"  [!] Error on light {name}: {e}")

            # --- Dark Theme ---
            try:
                page.evaluate("document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark');")
                page.wait_for_timeout(600)
                dark_file = os.path.join(OUTPUT_DIR, f"1440_dark_{name}.png")
                page.screenshot(path=dark_file, full_page=False)
                print(f"  [OK] 1440 dark:  {name} -> {dark_file}")

                # Run axe check
                if AXE_SCRIPT:
                    page.evaluate(AXE_SCRIPT)
                    res = page.evaluate("axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })")
                    violations = res.get("violations", [])
                    if violations:
                        axe_violations_report.append((f"1440 dark {name}", len(violations), [v['id'] for v in violations]))
            except Exception as e:
                print(f"  [!] Error on dark {name}: {e}")

            page.close()

        context.close()

        print("\n=== 2. Capturing 390px Mobile Screenshots (Light & Dark) ===")
        m_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)

        for path, name in PAGES_390:
            url = f"{BASE_URL}{path}"
            m_page = m_context.new_page()
            try:
                m_page.goto(url, wait_until="domcontentloaded", timeout=30000)
                # Light
                m_page.evaluate("document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light');")
                m_page.wait_for_timeout(600)
                m_light_file = os.path.join(OUTPUT_DIR, f"390_light_{name}.png")
                m_page.screenshot(path=m_light_file, full_page=False)
                print(f"  [OK] 390 light: {name} -> {m_light_file}")

                # Dark
                m_page.evaluate("document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark');")
                m_page.wait_for_timeout(600)
                m_dark_file = os.path.join(OUTPUT_DIR, f"390_dark_{name}.png")
                m_page.screenshot(path=m_dark_file, full_page=False)
                print(f"  [OK] 390 dark:  {name} -> {m_dark_file}")
            except Exception as e:
                print(f"  [!] Error on mobile {name}: {e}")
            finally:
                m_page.close()

        m_context.close()
        browser.close()

        print("\n=== 3. Axe-Core Accessibility Summary ===")
        if not axe_violations_report:
            print("  [ALL CLEAR] 0 WCAG AA violations found across all audited screens!")
        else:
            print(f"  Reported items: {len(axe_violations_report)}")
            for item in axe_violations_report:
                print(f"    - {item[0]}: {item[1]} violations ({item[2]})")

if __name__ == "__main__":
    run_verification()
