# Git Workflow — Branching, Commits & PR Protocol

**Arcturus Simulation Engineering Governance Platform**

---

## Branch Structure

```
main
 └── initiative/arcturus          ← The integration branch for all Arcturus work
       └── feature/<platform>     ← Your per-platform feature branch
```

**Never commit directly to `initiative/arcturus` or `main`.**

---

## Starting Work

```bash
# 1. Switch to the integration branch
git checkout initiative/arcturus

# 2. Pull latest (fast-forward only — never create merge commits here)
git pull --ff-only origin initiative/arcturus

# 3. Create your feature branch
git checkout -b feature/<your-platform-name>
# Examples:
# git checkout -b feature/enterprise-generator
# git checkout -b feature/scenario-adapters
```

---

## Staging Files (Selective Staging Only)

**Do NOT use `git add .`** — this will stage log files, cache files, `.pyc` files, and other junk.

Stage only the files that belong to your platform:

```bash
git status --short   # review what's changed first

git add ecosystem/applications/arcturus/contracts/<your-platform>/
git add ecosystem/applications/arcturus/schemas/<your-platform>/
git add ecosystem/applications/arcturus/src/<your-platform>/
git add ecosystem/applications/arcturus/tests/<your-platform>/
```

---

## Writing Commit Messages

Use the **Conventional Commits** format:

```
<type>(arcturus): <short description>

[optional body]
```

| Type | When to Use |
|---|---|
| `feat` | New feature or platform capability |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't add a feature or fix a bug |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build process, config, maintenance |

**Good commit messages:**
```bash
git commit -m "feat(arcturus): implement EnterpriseGenerator with structural validation"
git commit -m "test(arcturus): add negative tests for ScenarioDSLPayload constraints"
git commit -m "fix(arcturus): correct subseed namespace in workforce materialize_agents"
git commit -m "refactor(arcturus): move ontology to src/control_plane per governance blueprint"
```

**Bad commit messages (don't do this):**
```bash
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "wip"
```

---

## Pushing & Opening a PR

```bash
# Push your branch
git push -u origin feature/<your-platform-name>

# Then open a Pull Request against initiative/arcturus (not main)
```

---

## PR Checklist

Before requesting a review, verify these are all true:

- [ ] All tests pass: `pytest ecosystem/applications/arcturus/tests/ -q`
- [ ] Governance tests pass: `pytest ecosystem/applications/arcturus/tests/governance/ -v`
- [ ] No forbidden imports (§2.1): `pytest ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py -v`
- [ ] Contract stability not broken: `pytest ecosystem/applications/arcturus/tests/shared/test_contract_stability.py -v`
- [ ] No files staged outside `ecosystem/applications/arcturus/`
- [ ] No `.pyc`, `__pycache__`, or `.env` files in the diff
- [ ] Every line of AI-assisted code has been read, understood, and you can explain it in review

---

## What the Reviewer Checks

The reviewer will look at:
1. **Contract correctness** — does the Pydantic model correctly capture the payload?
2. **Deterministic behavior** — is `context.subseed()` used everywhere randomness appears?
3. **Test evidence** — are there both positive (happy path) and negative (failure injection) tests?
4. **Import hygiene** — no cross-platform `src/` imports
5. **Explainability** — can you defend every line?

---

## What Gets Auto-Blocked by CI

The `arcturus-governance-gate.yml` GitHub Actions workflow will block a PR if:
- Any forbidden cross-platform imports are detected
- Any files are in the wrong path (singular `application/` instead of plural `applications/`)
- Any potential hardcoded secrets are found in committed files
