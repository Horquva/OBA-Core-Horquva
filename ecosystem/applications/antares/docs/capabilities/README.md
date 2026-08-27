# Capability Validation Platform — Complete Package

This package contains the full verification and release-acceptance cycle for
the Capability Validation Platform, plus the original delivered source,
unmodified.

## Contents

- **`INDEPENDENT_VERIFICATION_ADDENDUM.md`** — a second, independent
  re-verification of this entire package: every test, demo run, live API
  call, and failure-injection check was re-executed from a freshly
  extracted copy of the source (not copy-pasted from the evidence log
  below), and one documentation-precision issue was found and fixed
  (Decision States list was missing `SUBMITTED`). Read this alongside
  the main report.

- **`Capability_Validation_Platform_Complete_Report.md`** — the single,
  combined report covering the entire cycle: existing-implementation
  verification, interface freeze, runtime integration, lifecycle proof,
  unified-product state contract, deliberate failure injection, and final
  release acceptance. Start here.

- **`sections/`** — the same seven sections as standalone files, for anyone
  who wants to reference one phase on its own.

- **`FULL_EVIDENCE_LOG.txt`** — the complete, unedited raw output of a
  single continuous run: the full test suite, a live health check, a live
  upstream→validation→downstream integration run, and a live
  failure-injection run. Every claim in the report traces back to this file.

- **`scripts/`** — the runnable verification scripts built during this
  cycle:
  - `scripts/integration/upstream_candidate_producer.py` and
    `downstream_result_consumer.py` — simulate a real upstream and
    downstream caller against the live HTTP API.
  - `scripts/failure_injection/test_failure_injection.py` — deliberately
    broken inputs, confirming the system fails honestly rather than
    reporting false success.

  To re-run them: start the service (`uvicorn app.api:app --port 8123`
  from inside `master_source/antares-extracted/services/validation-service`),
  then run each script with Python.

- **`master_source/`** — the original delivered package, unmodified:
  - `antares-capability-validation-FIXED__2_.zip` — the exact original zip
    file, kept as the master/source-of-truth archive.
  - `antares-extracted/` — the same contents, already unzipped for
    convenience (build caches removed).

## How to Verify This Yourself

1. Install dependencies from
   `master_source/antares-extracted/services/validation-service/requirements.txt`.
2. Run `pytest tests/` from that directory — expect `21 passed`.
3. Start the API with `uvicorn app.api:app --port 8123`.
4. Run the two integration scripts, then the failure-injection script, from
   `scripts/`, pointed at `http://127.0.0.1:8123`.

All of this was already done once, live, to produce `FULL_EVIDENCE_LOG.txt`
— this package lets anyone reproduce the same result independently.
