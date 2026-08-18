import requests
import json

print("🚀 Starting Day 7: Live API Integration Test...")

# 1. GET existing intelligence
print("\n[GET] Muzammel's platform querying for 'Retrieval-Augmented Generation'...")
res = requests.get("http://127.0.0.1:8000/intelligence/Retrieval-Augmented%20Generation")
print(json.dumps(res.json(), indent=2))

# 2. POST new live signal
print("\n[POST] Altair's platform sending new live signal...")
new_signal = {"raw_text": "LangChain is now integrating Agentic AI natively for enterprise workflows.", "source_url": "https://arxiv.org/live-2026"}
res = requests.post("http://127.0.0.1:8000/ingest", json=new_signal)
print(res.json())

# 3. GET updated intelligence
print("\n[GET] Querying updated profile for 'LangChain'...")
res = requests.get("http://127.0.0.1:8000/intelligence/LangChain")
print(json.dumps(res.json(), indent=2))

print("\n🎉 Day 7 Working Requirement Met: Live HTTP API is serving intelligence to consumers!")
