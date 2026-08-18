from google import genai
from dotenv import load_dotenv
import os

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("🔍 Scanning API for available Embedding Models...")
print("-" * 50)
found = False
for m in client.models.list():
    # Har model ka naam check karo jisme 'embed' shamil ho
    if 'embed' in m.name.lower():
        print(f"✅ FOUND: {m.name}")
        found = True
        
if not found:
    print("❌ No models with 'embed' in the name were found.")
print("-" * 50)
