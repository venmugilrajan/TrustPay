import json

with open("docs/lighthouse_report.json", encoding="utf-8") as f:
    d = json.load(f)

print("Accessibility items failing:")
for audit_id, audit in d.get("audits", {}).items():
    if audit.get("score") is not None and audit.get("score") < 1:
        if "accessibility" in str(audit.get("tags", [])):
            print(f"- {audit.get('title')}: {audit.get('score')} ({audit.get('id')})")

