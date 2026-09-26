# RESEARCH INDEX — Papers, Repositories & Libraries

> **Scope**: Every external grounding used (or planned) by the revamp phases. Split into (A) already-consumed by the landed risk-engine rework, (B) validated this session for Phases 1–4, (C) standards/references with no code dependency.
> **Verification**: GitHub repos were verified live (stars/maintenance) on 2026-09-26; arXiv IDs verified via search this session.

---

## A. Consumed by the Risk-Engine Rework (already implemented)

| Source | Role | Where it landed |
|---|---|---|
| **arXiv:2608.08073** — eIRWR: Enhanced Iterative Random Walk with Restart (Khan & Farea, 2026) | Engine A: cascade probabilities, blast radius, anomaly-conditioned resilience, backward edges + self-loops, power iteration | `backend/domain/riskEngine/eirwr.js`; digest: `docs/risk_engine_research/PAPER_1_*.md` |
| **arXiv:0906.3968** — Bayesian Networks Approach to Operational Risk (Aquaro et al., 2009) | Engine B: causal DAG + ordered-logit CPT for operational failure probability | `backend/domain/riskEngine/bayes.js`; digest: `PAPER_2_*.md` |
| **arXiv:2505.06281** — Data-Driven Probabilistic Framework for Cascading Urban Risk (Kumar et al., 2025) | Engine B extension: cascade exposure variable U, data-driven CPT calibration framing | `backend/domain/riskEngine/bayes.js`; digest: `PAPER_3_*.md` |
| **pgmpy/pgmpy** (GitHub) | Python ground truth: DiscreteBayesianNetwork, TabularCPD, VariableElimination — parity validation of the JS engine | `backend/risk_engine/bbn_model.py`, `test_risk_engines.py` |
| **scikit-network/scikit-network** (GitHub) | Python reference for sparse power iteration / random walks | `backend/risk_engine/eirwr_model.py` |

## B. Validated for Phases 1–4 (this session)

### Phase 1 — Foundation
| Source | Type | Role |
|---|---|---|
| PostgreSQL `pgcrypto` / `gen_random_uuid()` | Built-in | UUID migration PKs (Supabase ships pgcrypto) |
| Node `crypto.randomUUID()` | Built-in | App-side UUIDs, zero deps |
| Supabase RLS docs + `current_setting('app.current_org')` GUC pattern | Docs/pattern | RLS policies + per-request tenant binding (`set_config(..., true)`) |
| **Nodeshift/opossum** — 1.7k★, active | Library | Circuit breaker around `loadFromSupabase` (Phase 1.7) |
| W3C **PROV-O** data model | Standard | Reference shape for evidence envelopes / evidence_records (no runtime dep) |

### Phase 2 — Replaceability & Concentration
| Source | Type | Role |
|---|---|---|
| **arXiv:2202.01523** — Bus Factor In Practice (Jabrayilzade et al.) | Paper | Empirical grounding for bench-depth risk modeling (S_bench) |
| **arXiv:2403.08038** — Bus Factor Explorer (Klimov et al.) | Paper | Minimal-hitter-set algorithm for bus-factor computation |
| **arXiv:2508.09828** — Fast and Accurate Heuristics for Bus-Factor Estimation (Piccolo, 2025) | Paper | NP-hardness formalization + validated fast heuristics → our S_bench heuristic |
| **arXiv:2305.08506** — A Knowledge Graph Perspective on Supply Chain Resilience (Liu et al., 2023) | Paper | Class-level concentration framing over an organizational KG |
| DOJ/FTC **Horizontal Merger Guidelines** HHI bands | Standard | 1500/2500 concentration banding (Blueprint §9.2) |
| Gini coefficient / Shannon entropy | Standard | Secondary concentration metrics (shape beyond top-share) |

### Phase 3 — Change→Impact & Volatility
| Source | Type | Role |
|---|---|---|
| Event sourcing / route-level CDC practice | Pattern | `mutations.js` captures mutations at the single write path; Debezium named as future hardening |
| Postgres trigger functions (Supabase pattern) | Pattern | Out-of-band SQL change backstop writing `OUT_OF_BAND` rows |
| NIST/SEMATECH e-Handbook §6.3.2 — **EWMA & CUSUM** control charts | Standard | Churn-velocity drift detection (closed-form, explainable) |
| **arXiv:2007.01229** — Laplacian Change Point Detection for Dynamic Graphs (Huang et al.) | Paper | Academic framing for structural churn/change-point in org topology |
| **timgit/pg-boss** — 4k★, active | Library | Postgres-backed job queue if webhook processing needs async scale (no Redis) |

### Phase 4 — Ingestion & Identity
| Source | Type | Role |
|---|---|---|
| **Standard Webhooks spec** (standardwebhooks.com, svix-led) | Spec | Generic HMAC webhook verification scheme (implement natively, no dep) |
| GitHub `x-hub-signature-256` / Slack `x-slack-signature` schemes | Vendor docs | Source-native signature verification |
| **moj-analytical-services/splink** — 2.4k★, active (UK MoJ) | Library | Fellegi–Sunter probabilistic identity linkage (DuckDB backend) in the Python sidecar pattern |
| **arXiv:1911.01874** — Revisiting the probabilistic method of record linkage (Dasylva et al.) | Paper | Statistical grounding + error-rate estimation for the identity bridge |
| **animir/node-rate-limiter-flexible** — 3.6k★, active | Library | Per-source rate limiting; Postgres insurance store (no Redis required) |
| `csv-parse` | Library | Roster CSV import (streaming, battle-tested) |
| zod (optional) | Library | Write-body validation on CRUD routes |
| Gemini **explicit context caching** (`cachedContent`) / Anthropic **prompt caching** (`cache_control: ephemeral`) | Vendor docs | Phase 4.4 static-prefix caching (~90% prefix-cost reduction) |

## C. Search Notes
- Bus Factor Explorer's standalone tool repo is not public — the *algorithm* (from the paper) is what we implement; no dependency.
- `goldenmatch` (entity-resolution newcomer, 132★, Fellegi-Sunter + Postgres) was reviewed and rejected for now: immature vs Splink; Splink's DuckDB backend fits the existing Python-sidecar pattern.
- Dedupe (dedupeio) considered; Splink preferred (active maintenance, SQL backends, transparency of match weights).

## Maintenance
When a phase lands, tick its row into the module header's provenance block (the convention used by `backend/domain/riskEngine/index.js`) and add any newly-found sources here with the same verification discipline.
