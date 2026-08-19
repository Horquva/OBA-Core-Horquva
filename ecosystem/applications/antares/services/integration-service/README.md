# Capability Operationalization Platform — Abbas Raza

Implements Din 1–10 of the platform roadmap. This is the code layer sitting on top of
the earlier reviewed spec/data-model docs and the 4 corrected sample records
(`COP-0001`–`COP-0004`), which now live in `docs/`.

## What's here

- `src/models.js` — data model + contract shape validation (Din 2)
- `src/contracts.js` — authorized-submitter check (Din 7 handoff contract)
- `src/persistence.js` — Submit → Register → Persist → Retrieve (Din 2)
- `src/dependencyEngine.js` — programmatic dependency graph resolution, circular
  dependency detection, version compatibility, timeout handling, readiness evaluation
  (Din 5)
- `src/packaging.js` — builds the machine-readable operational package (Din 6)
- `src/pipeline.js` — the 9-step Operationalization Pipeline (Din 3–4):
  Intake → Identity Verification → Validation Reference Check → Metadata
  Normalization → Dependency Resolution → Readiness Evaluation → Transformation →
  Record Creation → Status Publish
- `seed.js` — registers COP-0001–0004 so the dependency engine has real data to
  resolve against
- `demo.js` — Din 10 final demo: submits a new capability, resolves its dependency
  on COP-0001, evaluates readiness, builds the package, and shows a consumer
  discovering it by readiness state
- `tests/pipeline.test.js` — Din 8–9 edge cases (see below)

## Running it

```bash
node seed.js        # registers the 4 known capabilities
node demo.js         # end-to-end walkthrough
node tests/pipeline.test.js   # edge-case test suite
```

No external dependencies — pure Node.js (v18+), so `npm install` isn't needed.

## Edge cases covered (Din 8–9)

- missing dependency
- circular dependency (multi-hop, via graph traversal — not just direct self-reference)
- incompatible dependency version
- malformed contract (rejected before it ever becomes a record)
- duplicate submission (same ID twice)
- timeout during a dependency lookup (pipeline degrades to `Failed`, does not crash)
- unauthorized request (wrong token, and unknown submitter entirely)
- missing validation reference (this is a *valid* pipeline outcome — lands on the
  `Validation Reference Missing` readiness state, it's not treated as malformed)

## What this platform still does NOT do (by design — out of scope per the spec)

- Does not re-validate capabilities — validation is trusted as already complete
  when a contract arrives with a `validationReference`.
- Does not perform discovery/research.
- Does not do engineering operations on the underlying capability itself.
- Does not yet have a real live event-bus hook for "Status Publish" — Step 9
  currently means "discoverable via `persistence.findByReadiness()`"; wiring
  that to Antares' real event bus is an integration-phase task, not this
  platform's own responsibility per the spec's Integration boundary.

## Repo placement

Per the confirmed Antares repo/branch mapping, this code belongs under
`services/integration-service/` and `integration/` on branch
`antares/abbas-integration`; `contracts.js`'s allowed-submitter list belongs
conceptually under `contracts/ocos/` once real service-auth exists to replace
the mock tokens here. The `docs/` folder (spec, data model, corrected template
and records, readiness log) fits under `registry/submission-registry/` or
`docs/` alongside it.
