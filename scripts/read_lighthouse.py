import json

with open("docs/lighthouse_report.json", encoding="utf-8") as f:
    d = json.load(f)

for cat in d.get("categories", {}).values():
    title = cat.get("title")
    score = int(cat.get("score", 0) * 100)
    print(f"{title}: {score}")

