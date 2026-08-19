# Day 9 — AI-Native Iteration: LLM + Embeddings (Parts 3, 4, 5, 7)
## What the roadmap asked
LLM-based extraction, embedding-based similarity, semantic technology matching; every
AI inference carries evidence + confidence metadata; retry/failure handling/audit.
## What I built
- llm_client.py: Google GenAI Interactions API (gemini-3.1-flash-lite) +
  gemini-embedding-001; retries with backoff; model fallback chain; robust JSON
  extraction; audit log (operation/model/latency/success); graceful degradation.
- discovery_pipeline.py v2: LLM extraction replaces taxonomy; semantic dedup at
  cosine ≥ 0.92; auto EvolutionEvents (EMERGENCE vs ADOPTION_SIGNAL) with
  evidence_refs + llm_interpretation; ConfidenceMetadata on every evidence.
- maturity_engine.py v2 (event-driven), relationship_engine.py v2 (semantic edges),
  intelligence_registry.py v2 (JSON persistence + event merging).
- list_models.py: scanned the API to discover the correct embedding model
  (text-embedding-004 returned 404 → gemini-embedding-001).
## How I tested
test_llm_connectivity.py: live extraction OK; embeddings dims=3072.
test_ai_pipeline.py: proved 'RAG' semantically matched 'Retrieval-Augmented
Generation' (score 0.897) and merged into one profile with combined evidence.
## Bugs I caught myself (kept honest)
- Over-merging at 0.80 (Milvus/Vector Databases merged into RAG) → threshold 0.92.
- .title() destroyed acronyms ('Agentic AI' → 'Agentic Ai') → removed.
- Mock side_effect overrides return_value → adversarial test leaked; mock made
  prompt-aware.
- Registry state leaked between tests → autouse fixture deleting STATE_FILE.
