# Synthetic Data Platform

**Owner:** Ahmed Raza (`@4hmad69`)  
**Source:** `src/synthetic_data/`  
**Contracts:** `contracts/synthetic_data/`  
**Tests:** `tests/synthetic_data/`

---

## Purpose

The Synthetic Data Platform generates structured, deterministic data artifacts — reports, documents, meeting records — that populate the simulation with realistic content. All artifacts are provenance-tracked with a SHA-256 fingerprint that guarantees reproducibility: the same seed always produces the same artifacts.

---

## Key Contracts

| Contract | Description |
|---|---|
| `SyntheticGenerationRequest` | What to generate: artifact types, count, context |
| `SyntheticArtifactContract` | A single generated artifact with provenance metadata |
| `SyntheticGenerationResult` | The complete output with all artifacts and provenance hash |

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/synthetic_data/base_models.py` | Core synthetic data contracts |
| `src/synthetic_data/generation_service.py` | `SyntheticGenerationService.generate_snapshot()` |
| `src/synthetic_data/generation_adapters.py` | Contract translation |
| `src/integration/synthetic_data_chain.py` | `run_synthetic_data_chain()` — integration entry point |

---

## Determinism

The provenance hash is a SHA-256 fingerprint of the full generation result. The same seed must always produce the same hash:

```python
result_a, evidence_a = run_synthetic_data_chain(context=ctx, ...)
result_b, evidence_b = run_synthetic_data_chain(context=ctx, ...)
assert evidence_a["deterministic_fingerprint"] == evidence_b["deterministic_fingerprint"]
```

---

## Inbound → Outbound

**Inbound:** `SimulationContext` (carries `global_seed` for determinism)  
**Outbound:** `SyntheticGenerationResult` → Maaz's `initialize_run()`

---

## Running Synthetic Data Tests

```bash
pytest ecosystem/applications/arcturus/tests/synthetic_data/ -v
```
