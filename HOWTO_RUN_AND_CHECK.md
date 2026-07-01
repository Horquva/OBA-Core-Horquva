# OBA Core — How to Run & Check (Phase 6, M01–M55)

This guide shows how to (1) run the intelligence engine, and (2) start the backend
and check that every route works.

---

## 1. Run the Python Intelligence Engine (all modules M01–M55)

The project uses [`uv`](https://github.com/astral-sh/uv).

```bash
# from the repo root (where main.py lives)
uv sync            # installs dependencies (rich, etc.) from uv.lock
uv run main.py     # runs every module; Phase 6 (M36–M55) prints at the very end
```

Don't have `uv`? Use plain Python:

```bash
pip install rich
python main.py
```

At the end you will see the Phase 6 sections:
M36 Signal → M39 Capability → M38 Opportunity → M40 Alignment → **M46 Truth**
→ **M48 Advisor** → **M50 Brain Core** → **M54 Simulation Universe** → **M55 Orchestrator**
(verdict + Organizational Intelligence Score).

---

## 2. Run the Backend API

```bash
cd backend
npm install                 # installs express, cors, dotenv, @supabase/supabase-js
cp .env.example .env        # then fill SUPABASE_URL / SUPABASE_KEY (see below)
node index.js               # server starts on http://localhost:3000
```

Expected startup log:

```
1. File started
2. Packages loaded
3. Middlewares added
4. Routes loaded
Server running on port 3000
```

> **Security:** never commit `.env`. It is git-ignored. If a key ever leaks,
> rotate it in Supabase immediately.

---

## 3. Check the routes work

### 3a. Phase 6 constitutional routes (no Supabase needed)

These read the local dataset, so they answer even before `.env` is set:

```bash
curl http://localhost:3000/api/intelligence                     # lists all Phase 6 endpoints
curl http://localhost:3000/api/intelligence/orchestrator        # M55 — org intelligence score
curl http://localhost:3000/api/intelligence/truth               # M46 — verified truths
curl http://localhost:3000/api/intelligence/advisor             # M48 — recommendations
curl http://localhost:3000/api/intelligence/signals             # M36
curl http://localhost:3000/api/intelligence/capability          # M39
curl http://localhost:3000/api/intelligence/opportunities       # M38
curl http://localhost:3000/api/intelligence/alignment           # M40
curl http://localhost:3000/api/intelligence/brain-core          # M50
curl http://localhost:3000/api/intelligence/simulation-universe # M54
```

A healthy response is JSON (HTTP 200). Example (`/orchestrator`):

```json
{ "organizationalIntelligenceScore": 60, "grade": "C", "posture": "STABILIZE",
  "topPriority": "Assign and train backup owners for every critical asset" }
```

### 3b. Supabase-backed routes (need a valid .env)

```bash
curl http://localhost:3000/api/memory/health
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/risks
```

If these return `{"error": "..."}` check that `SUPABASE_URL` and `SUPABASE_KEY`
in `.env` are correct and the schema is seeded.

### 3c. Quick check of ALL routes

```bash
# prints HTTP status for each GET route
for p in agents ownership dependencies risks dashboard human-agent-map tools \
         tool-intelligence tool-impact memory/health continuity/... \
         intelligence intelligence/orchestrator intelligence/truth; do
  echo -n "$p -> "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/$p
done
```

---

## 4. Frontend (optional)

```bash
cd frontend
npm install
npm run dev        # Next.js dev server (default http://localhost:3001)
```
