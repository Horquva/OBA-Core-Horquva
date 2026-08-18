"""
Model Adapter — clean interface between the intelligence layer and any
underlying LLM. Swappable so experiments can compare models later (Part-5).

Owner: Muhammad Hasnain Ajmal

Default provider: Google Gemini (FREE tier — no credit card needed).
Get a free key at: https://aistudio.google.com/apikey
Then: export GEMINI_API_KEY=your_key_here
"""

import os
import time
import json
import urllib.request
import urllib.error

try:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(usecwd=True))
except ImportError:
    pass  # dotenv not installed yet — fall back to real environment variables


class ModelAdapter:
    """
    Adapter around the Gemini API (free tier friendly).
    Swap `model` to compare models later (Part-5 optimization work).
    Requires GEMINI_API_KEY in the environment.
    Get a free key: https://aistudio.google.com/apikey
    """

    def __init__(self, model: str = "gemini-2.5-flash", max_tokens: int = 1000):
        self.model = model
        self.max_tokens = max_tokens
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )

    def run(self, prompt: str, system: str = None) -> dict:
        """
        Executes one inference call. Returns structured result with timing.
        Never raises silently — errors are captured and returned, not hidden.
        """
        start = time.time()
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        payload = {
            "contents": contents,
            "generationConfig": {"maxOutputTokens": self.max_tokens},
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        try:
            req = urllib.request.Request(
                self.endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
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

