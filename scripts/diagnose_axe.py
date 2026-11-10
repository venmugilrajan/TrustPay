from playwright.sync_api import sync_playwright
import urllib.request
import json

with urllib.request.urlopen("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js") as resp:
    axe = resp.read().decode("utf-8")

with sync_playwright() as p:
    b = p.chromium.launch()
    for path in ["/", "/client/jobs/new", "/demo"]:
        page = b.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"http://127.0.0.1:3000{path}", wait_until="domcontentloaded")
        page.evaluate("document.documentElement.setAttribute('data-theme', 'light')")
        page.wait_for_timeout(600)
        page.evaluate(axe)
        violations = page.evaluate("""
            async () => {
                const r = await axe.run({ runOnly: ['wcag2aa'] });
                return r.violations.map(v => ({
                    id: v.id,
                    nodes: v.nodes.map(n => ({
                        html: n.html,
                        target: n.target,
                        failureSummary: n.failureSummary
                    }))
                }));
            }
        """)
        print(f"=== {path} ===")
        for v in violations:
            for n in v['nodes']:
                print(f"  Target: {n['target']}")
                print(f"  HTML: {n['html']}")
                print(f"  Failure: {n['failureSummary']}")
        page.close()
    b.close()
