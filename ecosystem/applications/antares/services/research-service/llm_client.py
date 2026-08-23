import os
import re
import time
import json
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")
logger = logging.getLogger("antares.llm")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
# Correct Embedding Model based on API scan
EMBEDDING_MODEL = "models/gemini-embedding-001"

FALLBACK_CHAIN = list(dict.fromkeys([PRIMARY_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"]))
MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 1.5

class GeminiClient:
    def __init__(self):
        self.available = bool(GEMINI_API_KEY) and genai is not None
        self.audit_log: List[Dict[str, Any]] = []
        self.client = None
        if self.available:
            try:
                self.client = genai.Client(api_key=GEMINI_API_KEY)
                logger.info("GeminiClient initialized. Primary LLM: %s | Embeddings: %s", PRIMARY_MODEL, EMBEDDING_MODEL)
            except Exception as e:
                logger.error("Failed to initialize Gemini Client: %s", e)
                self.available = False

    def _audit(self, operation: str, model: str, success: bool, latency: float, error: Optional[str] = None):
        record = {"operation": operation, "model": model, "success": success,
                  "latency_s": round(latency, 3), "error": error, "ts": time.time()}
        self.audit_log.append(record)
        logger.info("AUDIT | %s", json.dumps(record))

    @staticmethod
    def _extract_json(raw: str) -> Optional[dict]:
        if not raw: return None
        raw = raw.strip()
        fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        candidate = fence.group(1) if fence else raw
        start, end = candidate.find("{"), candidate.rfind("}")
        if start == -1 or end <= start: return None
        try: return json.loads(candidate[start:end + 1])
        except json.JSONDecodeError: return None

    def generate_json(self, prompt: str) -> Optional[dict]:
        if not self.available or not self.client: return None
        for model_name in FALLBACK_CHAIN:
            for attempt in range(MAX_RETRIES + 1):
                t0 = time.time()
                try:
                    response = self.client.interactions.create(model=model_name, input=prompt)
                    raw_text = response.output_text or ""
                    data = self._extract_json(raw_text)
                    self._audit("generate_json", model_name, data is not None, time.time() - t0)
                    if data is not None: return data
                except Exception as e:
                    err = str(e)
                    self._audit("generate_json", model_name, False, time.time() - t0, err)
                    if "404" in err or "not found" in err.lower(): break
                    if attempt < MAX_RETRIES: time.sleep(RETRY_DELAY_SECONDS)
        return None

    def embed(self, texts: List[str]) -> Optional[List[List[float]]]:
        if not self.available or not self.client or not texts: return None
        t0 = time.time()
        try:
            # Using the correct model and task_type config for semantic similarity
            response = self.client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
            )
            vectors = [emb.values for emb in response.embeddings]
            self._audit("embed", EMBEDDING_MODEL, True, time.time() - t0)
            return vectors
        except Exception as e:
            self._audit("embed", EMBEDDING_MODEL, False, time.time() - t0, str(e))
            return None

    @staticmethod
    def cosine_similarity(a: List[float], b: List[float]) -> float:
        try:
            import numpy as np
            va, vb = np.array(a), np.array(b)
            return float(np.dot(va, vb) / ((np.linalg.norm(va) * np.linalg.norm(vb)) or 1.0))
        except Exception: return 0.0
