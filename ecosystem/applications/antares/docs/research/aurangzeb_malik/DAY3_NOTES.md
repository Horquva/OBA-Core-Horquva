# Day 3 — Discovery Pipeline v1 (Part-3)
## What the roadmap asked
Core pipeline: Sources → Ingestion → Detection → Entity Normalization → Evidence
Extraction → Classification → Profile Update. Deterministic identifiers so multiple
sources referring to the same technology map to the same entity.
## What I built
discovery_pipeline.py v1: taxonomy-based detection, deterministic normalization
('rag' → 'Retrieval-Augmented Generation'), exact evidence-sentence extraction,
MD5(normalized name) deterministic tech_id, domain classification.
## How I tested
test_pipeline.py: one raw enterprise article automatically produced 5 structured
intelligence records with evidence and confidence.
## Honest notes
v1 was intentionally rule-based — the roadmap's loop says build a working pipeline
first, then layer AI/ML as a measured iteration. The LLM/embeddings iteration landed
on Day 9.
