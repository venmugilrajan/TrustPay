import asyncio
import os
import httpx
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\ruthr\.gemini\antigravity\brain\993894da-a4e0-4096-b7e5-7d4658144e63"
BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:8000/api"

async def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    # 1. Ensure backend has seeded demo job
    demo_job_id = None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{API_URL}/demo/seed")
            if res.status_code == 200:
                demo_job = res.json()
                demo_job_id = demo_job.get("id")
                print(f"Seeded demo job: {demo_job_id}")
            else:
                jobs_res = await client.get(f"{API_URL}/jobs")
                jobs = jobs_res.json()
                if jobs:
                    demo_job_id = jobs[0]["id"]
                    print(f"Using existing job: {demo_job_id}")
    except Exception as e:
        print(f"Backend seed check warning: {e}")

    if not demo_job_id:
        demo_job_id = "test-job-id"

    pages_to_capture = [
        {"name": "01_role_selection_landing", "path": "/"},
        {"name": "02_client_dashboard", "path": "/client"},
        {"name": "03_client_post_job_wizard", "path": "/client/jobs/new"},
        {"name": "04_client_contract_detail", "path": f"/client/jobs/{demo_job_id}"},
        {"name": "05_client_negotiation_chat", "path": f"/client/jobs/{demo_job_id}/negotiate"},
        {"name": "06_client_fund_escrow", "path": f"/client/jobs/{demo_job_id}/fund"},
        {"name": "07_client_payments_ledger", "path": "/client/payments"},
        {"name": "08_client_disputes", "path": "/client/disputes"},
        {"name": "09_freelancer_dashboard", "path": "/freelancer"},
        {"name": "10_freelancer_opportunities", "path": "/freelancer/opportunities"},
        {"name": "11_freelancer_work_detail", "path": f"/freelancer/work/{demo_job_id}"},
        {"name": "12_freelancer_negotiation", "path": f"/freelancer/work/{demo_job_id}/negotiate"},
        {"name": "13_freelancer_earnings", "path": "/freelancer/earnings"},
        {"name": "14_freelancer_disputes", "path": "/freelancer/disputes"},
        {"name": "15_demo_hub", "path": "/demo"},
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for page_info in pages_to_capture:
            url = f"{BASE_URL}{page_info['path']}"
            name = page_info["name"]

            # 1. Desktop (1440px)
            desktop_page = await browser.new_page(viewport={"width": 1440, "height": 900})
            try:
                await desktop_page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(0.5)
                desktop_shot_path = os.path.join(ARTIFACT_DIR, f"{name}_desktop_1440.png")
                await desktop_page.screenshot(path=desktop_shot_path, full_page=True)
                print(f"Captured Desktop (1440px): {desktop_shot_path}")
            except Exception as ex:
                print(f"Failed {name} desktop: {ex}")
            finally:
                await desktop_page.close()

            # 2. Mobile (390px)
            mobile_page = await browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True)
            try:
                await mobile_page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(0.5)
                mobile_shot_path = os.path.join(ARTIFACT_DIR, f"{name}_mobile_390.png")
                await mobile_page.screenshot(path=mobile_shot_path, full_page=True)
                print(f"Captured Mobile (390px): {mobile_shot_path}")
            except Exception as ex:
                print(f"Failed {name} mobile: {ex}")
            finally:
                await mobile_page.close()

        await browser.close()
        print("All redesign screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
