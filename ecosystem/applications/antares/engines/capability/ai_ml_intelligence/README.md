# Antares AI/ML Intelligence Layer

**Owner:** Muhammad Hasnain Ajmal — AI/ML Intelligence Engineer, AI Agents & Autonomous Organizations Platform (owned by Zeeshan Farooq)

**Exact location in the real repo:**
```
OBA-Core-Horquva/
  ecosystem/
    applications/
      antares/
        engines/
          capability/            <-- likely spot (confirm with Zeeshan)
            ai_ml_intelligence/  <-- put everything from this zip here
```
If Zeeshan says a different folder (e.g. `services/capability-service/`), put it
there instead — same idea, just a different parent folder. Do not put this in
the top-level `modules/` folder at the repo root — that's a separate,
pre-existing library unrelated to your team's per-person folders.

This is the AI/ML intelligence layer for Antares: experiment tracking, model
evaluation, and the agent reasoning/planning loop. It does **not** own agent
orchestration, platform architecture, governance, or organizational modeling —
those belong to Zeeshan, Kanwal, Muhammad Muzammel, etc. This layer produces
validated capabilities that their platforms consume.

## Setup (uses Google Gemini — FREE, no credit card)

1. Get a free API key: https://aistudio.google.com/apikey (sign in with any Google account, click "Create API key")
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Open the file named **`.env`** in this folder. Replace `paste_your_key_here`
   with your real key, so the line looks like:
   ```
   GEMINI_API_KEY=AIzaSyD4xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Save the file. That's it — no terminal commands needed to set the key,
   the code reads `.env` automatically.

The `.gitignore` file in this folder already makes sure `.env` (and your key
inside it) never gets uploaded to GitHub. You don't need to touch `.gitignore`.

Free tier limits (as of 2026): ~15 requests/minute, up to ~1,000 requests/day
on `gemini-2.5-flash`. Plenty for this project — don't run big batch loops
against it.


## Run it

```bash
# Run unit tests (no API key needed)
python -m pytest tests/ -v

# Run a single experiment
python experiments/engine.py

# Run the reasoning/planning engine standalone
python intelligence/reasoning_engine.py

# Run the full end-to-end demo (Part-8 style demonstration)
python demo_end_to_end.py
```

## What's here and what roadmap Part it covers

| File | Roadmap Part | What it does |
|---|---|---|
| `intelligence/models.py` | Part-2 | Domain models: ExperimentConfig/Result/Record, Plan, PlanStep, IntelligenceCapability — all typed, versioned, traceable |
| `intelligence/model_adapter.py` | Part-2/5 | Swappable adapter to call the LLM; captures latency + errors, never fails silently |
| `intelligence/evaluator.py` | Part-2/3 | Scoring functions (exact match, similarity, keyword) + aggregate metrics (pass rate, avg score, error rate) |
| `experiments/engine.py` | Part-3 | Experiment Definition → Model Execution → Evaluation → Metrics → persisted Result Record (JSON in `results/`) |
| `intelligence/reasoning_engine.py` | Part-4 | The agent intelligence loop: `plan()`, `evaluate_plan()`, `replan()` — Goal→Plan→Reason→Evaluate→Replan |
| `intelligence/capability_registry.py` | Part-6 | Registry + promotion gate — this is the integration boundary the Agent layer calls to discover validated capabilities |
| `tests/test_intelligence.py` | Part-7 | 18 unit tests, no API key required, covering evaluator, JSON parsing, plan evaluation, registry promotion/rejection |
| `demo_end_to_end.py` | Part-8 | Full chain: Goal → Plan → Evaluate → Experiment → Register → Promote → Agent-layer discovery |

## What's NOT done yet (be upfront about this in your demo)

- **Part-1 doc**: You still need to write the short "AI/ML Intelligence System
  Map" doc (who you are, boundaries, what enters/exits your layer). This is
  mostly writing — use your roadmap PDF's Part-1 section as the outline.
- **Part-5 optimization**: latency is captured but no real optimization
  (caching, batching, prompt tuning) has been done yet — add if time allows.
- **Part-6 live integration**: the registry is the *interface* Zeeshan's
  agent layer would call. You still need to actually sit with Zeeshan (or
  whoever owns that repo folder) and wire one real call from his code into
  `CapabilityRegistry.get_promoted()`.
- **Adversarial/failure tests**: current tests cover clean logic paths; add
  a few tests for malformed model output, timeout simulation, etc. if time
  allows (Part-7 asks for this).

## Honest scope note

This gives you real, working, tested Parts 2–4 and 6–8 scaffolding — not
placeholder code. Part-1 (the understanding/mapping document) and deeper
Part-5 optimization work are intentionally left for you to do next, since
they require your own repo/architecture research and can't be faked
credibly. Use this as your working core and spend remaining days on
integration + the write-up.
