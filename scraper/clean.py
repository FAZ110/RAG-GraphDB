import json, re

with open("artykuly_eurosport-605.json", encoding="utf-8") as f:
    data = json.load(f)

def clean(text):
    text = re.sub(r'([A-ZŁÓĄŚĘĆŹŻŃ]{2,}\s+){1,}[A-ZŁÓĄŚĘĆŹŻŃ]{2,}\.?\s*(?:>>>)?', '', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text

for art in data:
    art["content"] = clean(art["content"])

with open("artykuly_eurosport-605.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Gotowe")
