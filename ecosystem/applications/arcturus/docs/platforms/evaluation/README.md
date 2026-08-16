# Validation & Evaluation Platform

**Owner:** Amina Khan (`@Amina-Khan380`)  
**Source:** `src/evaluation_plane/`  
**Contracts:** `contracts/evaluation/`  
**Tests:** `tests/evaluation/`

---

## Purpose

The Validation & Evaluation Platform is the scientific quality gate of Arcturus. It receives execution evidence from the Simulation Runtime and evaluates it against predefined rules to produce a final, auditable pass/fail verdict.

---

## Key Contracts

| Contract | Description |
|---|---|
| `ValidationRun` | A complete validation session binding evidence to rules |
| `EvidenceContract` | A single observed value from the simulation with expected baseline |
| `ValidationRuleContract` | A rule (logic or consistency) to evaluate evidence against |
| `ValidationResultContract` | The final pass/fail result with per-rule breakdown |

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/evaluation/base_models.py` | Core validation contracts |
| `src/evaluation_plane/validation_engine.py` | `ValidationEngine.run_validation()` |
| `src/evaluation_plane/validation_adapters.py` | Contract translation |

---

## Inbound → Outbound

**Inbound:** `ExperimentResultPackage` from Maaz (Runtime)  
**Outbound:** `ValidationResultContract` (status: `"validated"` or `"failed"`)

---

## Running Evaluation Tests

```bash
pytest ecosystem/applications/arcturus/tests/evaluation/ -v
```
