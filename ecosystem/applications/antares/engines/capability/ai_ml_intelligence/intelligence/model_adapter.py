import os
import time
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

# BUGFIX (Kamil, review pass): python-dotenv was listed in requirements.txt
# and the README told the user to "Add your Gemini key to .env", but nothing
# in the codebase ever called load_dotenv(). That meant .env was silently
# inert -- GEMINI_API_KEY only worked if the user manually exported it in
# their shell, which is not what the Setup instructions say to do. Anyone
# following the README exactly (pip install -r requirements.txt, edit .env,
# python demo_end_to_end.py) would get an empty api_key and a fake
# "No GEMINI_API_KEY found" warning even with a real key sitting in .env.
load_dotenv()


class ModelAdapter:
    def __init__(self, model: str = "gemini-2.5-flash", max_tokens: int = 1000):
        self.model = model
        self.max_tokens = max_tokens
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )

    def run(self, prompt: str, system: str = None) -> dict:
        start = time.time()
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        payload = {"contents": contents, "generationConfig": {"maxOutputTokens": self.max_tokens}}
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        try:
            req = urllib.request.Request(
                self.endpoint, data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            text = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts)
            latency_ms = (time.time() - start) * 1000
            return {"text": text, "latency_ms": latency_ms, "error": None, "raw": data}
        except urllib.error.HTTPError as e:
            latency_ms = (time.time() - start) * 1000
            body = e.read().decode(errors="replace")[:300]
            return {"text": None, "latency_ms": latency_ms, "error": f"HTTP {e.code}: {body}"}
        except Exception as e:
            latency_ms = (time.time() - start) * 1000
            return {"text": None, "latency_ms": latency_ms, "error": str(e)}
