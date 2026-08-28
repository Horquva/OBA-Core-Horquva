# Horquva OBA Core — Backend API & Integration Guide

> Organizational Brain Platform — REST API reference for frontend integration.
> Backend: Node.js + Express on **Render**. Frontend: Next.js on **Vercel**.
> Storage: Supabase (PostgreSQL).

---

## 1. What this backend is

The backend is a **stateless JSON REST API** that exposes the Organizational Brain
analyses and its supporting services. It has **no user interface of its own** — the
frontend is a separate application that consumes these endpoints over HTTPS and renders
the data as a dashboard.

- All requests and responses are `application/json`.
- **Every `/api/*` route except `POST /api/auth/login` requires a bearer token.** See §4.
- **CORS is an allowlist, not open.** The backend only answers browsers whose `Origin`
  is listed in `CORS_ORIGINS`. See §4.3.
- The platform is **single-tenant**: no business table carries an org column, so a second
  organization in `app_users` would silently share one dataset. The server refuses to boot
  if it finds one (D-01, see `backend/lib/orgGuard.js`).
- The Brain is a **library, not a service** — there is no `/api/brain` mount. Routes call
  `brain.run(code)` directly. Its knowledge graph loads asynchronously from Supabase on
  boot; until it lands, the analysis routes answer `503` rather than serving stand-in data
  (D-40, see `backend/brain/README.md`).

---

## 2. Base URLs

| Environment | Component | Base URL |
|-------------|-----------|----------|
| Production  | Backend API | `https://oba-core-backend.onrender.com` |
| Production  | Frontend    | `https://frontend-nu-flame-caju58241a.vercel.app` |
| Local dev   | Backend API | `http://localhost:3000` |
| Local dev   | Frontend    | `http://localhost:3001` |

The frontend reads the backend base URL from **`NEXT_PUBLIC_API_URL`** (set in the Vercel
project's Production environment, and in `frontend/.env.local` for local work). Every
caller resolves it the same way:

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
```

Because `NEXT_PUBLIC_*` is inlined at build time, **changing it requires a rebuild**, not
just a restart.

---

## 3. Health check / service root

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | none | Service metadata — confirms the API is live. |
| GET | `/api/health/summary` | Bearer | Org health index + dimensions. |
| GET | `/api/intelligence/graph/status` | Bearer | Whether the Brain's knowledge graph has loaded. |

`GET /` is the only unauthenticated route besides `POST /api/auth/login`, and it is what
Render's `healthCheckPath` pings. A `200` from it means the process is up; a `200` from
`/api/intelligence/graph/status` with a ready graph means the Brain is actually usable.

---

## 4. Authentication (JWT)

Authentication uses **stateless JSON Web Tokens (HS256)**, signed and verified with Node's
built-in `crypto` (scrypt for password hashing) — no `jsonwebtoken` / `bcrypt` dependency.

### 4.1 Endpoints

| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/api/auth/login` | none | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | Bearer | — | `{ user }` |
| POST | `/api/auth/logout` | Bearer | — | `{ ok: true }` |
| POST | `/api/auth/change-password` | Bearer | `{ currentPassword, newPassword }` | `{ ok: true }` |

There is **no `POST /api/auth/register`** and **no password-reset endpoint**. Both were
removed:

- *Register* — self-service signup into a single-tenant dataset had no meaning; accounts
  are provisioned in Supabase directly.
- *Reset-password* — the old endpoint took `{ email, password }` and overwrote that
  account's hash with no proof the caller owned the mailbox, so knowing any registered
  address was enough to take the account over. `change-password` replaces it and names
  no subject at all: the account changed is `req.user.sub`, read from the verified token.
  Forgotten-password recovery needs a real email-delivery flow and does not exist yet; an
  admin resets a locked-out user in Supabase.

`logout` revokes that specific token by `jti`, so it cannot be reused, without killing the
user's other sessions.

### 4.2 How the frontend uses it

1. `POST /api/auth/login` with the user's credentials.
2. Store the returned `token` in `localStorage` under the key **`horquva-token`**
   (`frontend/lib/AuthContext.tsx` owns this key; `frontend/lib/authFetch.ts` reads it).
3. Attach it to **every** other request:
   ```
   Authorization: Bearer <token>
   ```

The token payload carries `sub` (user id), `email`, `role`, `org`, `jti`, and `exp`.
`role` is one of `member`, `admin`, or `executive`. Token lifetime comes from `TOKEN_TTL`
(seconds, default 3600).

The header is the **only** accepted carrier. A `?token=` query fallback was removed —
query strings land in access logs, proxy logs and `Referer` headers, which turns every
logged request into a credential leak.

### 4.3 Which endpoints require a token?

**All of them**, apart from `GET /` and `POST /api/auth/login`. `backend/index.js` mounts
a single global gate:

```js
app.use('/api', requireAuth)
```

before every domain router. There is no "public read endpoints, protected writes" split —
an earlier revision of this document described one, and it no longer exists. A request
without a valid token gets `401` regardless of whether the path is even mounted.

### 4.4 CORS

`CORS_ORIGINS` is a comma-separated allowlist, read at boot. Unset, it falls back to
`http://localhost:3001,http://localhost:3000` so local dev works out of the box; a
production deployment **must** set it to the real frontend origin.

A default open `cors()` would send `Access-Control-Allow-Origin: *` on every response,
letting any site read an authenticated response from a browser holding a token. Requests
with no `Origin` header (server-to-server, curl, Render's health check) are not a browser
CORS scenario and pass through.

Practical consequence: only the **aliased** frontend origin listed in `CORS_ORIGINS` can
talk to the API. Vercel's per-deployment URLs (`frontend-<hash>-….vercel.app`) change
every deploy and are **not** in the allowlist — use the stable alias, or add the new origin
to `CORS_ORIGINS` in the Render dashboard.

---

## 5. Response & error conventions

- **Success:** `200`/`201` with a JSON body.
- **Client error:** `400` (bad input), `401` (missing/invalid/revoked token), `403`
  (insufficient role), `404` (not found), `409` (already exists).
- **Brain not ready:** `503` — the knowledge graph has not finished loading from Supabase.
  Retry; nothing is served from stand-in data.
- **Server error:** `500` with `{ "error": "<message>" }`.

Error shape is always:

```json
{ "error": "human-readable message" }
```

---

## 6. Mounted route groups

Every group below is an `app.use()` line in `backend/index.js`. All require a bearer token.
For exact sub-routes and field-level schemas see `backend/API_REFERENCE.md` and
`backend/DATA_MODEL.md`.

### Reality layer

| Base path | Capability area |
|-----------|-----------------|
| `/api/agents` | AI agents registry |
| `/api/employees` | Employee registry |
| `/api/ownership` | Ownership intelligence |
| `/api/dependencies` | Dependency mapping |
| `/api/network` | Network centrality |
| `/api/risks` | Risk intelligence |
| `/api/dashboard` | Aggregated dashboard data |
| `/api/data-quality` | Data quality metrics |
| `/api/human-agent-map` | Human–agent dependency map |
| `/api/tools` | AI tool registry |
| `/api/tool-intelligence` | Tool intelligence details |
| `/api/tool-impact` | Tool impact analysis |
| `/api/workflows` | Workflow intelligence (`/intelligence`, `/spof`, `/failures`) |
| `/api/knowledge/intelligence` | Knowledge intelligence |
| `/api/knowledge/impact` | Knowledge impact |
| `/api/knowledge/gaps` | Knowledge gaps / risk |
| `/api/memory` | Organizational memory |
| `/api/continuity` | Business continuity |

### Simulation

| Base path | Capability area |
|-----------|-----------------|
| `/api/simulations/employee-leaves` | What-if: key person leaves |
| `/api/simulations/agent-fails` | What-if: agent failure |
| `/api/simulations/platform-down` | What-if: platform outage |
| `/api/simulations/workflow-disruption` | What-if: workflow disruption |
| `/api/simulations/rank` | Cross-scenario ranking |

### Interaction & decisioning

| Base path | Capability area |
|-----------|-----------------|
| `/api/verification` | Verification intelligence |
| `/api/orchestration` | Workflow orchestration |
| `/api/decisions` | Decision trail |
| `/api/decision-intelligence` | Decision intelligence |
| `/api/learning` | Organizational learning |
| `/api/collaboration` | Human–AI collaboration |
| `/api/accountability` | Accountability |
| `/api/forecast` | Forecasting |
| `/api/predictive-risk` | Predictive risk |

### Executive

| Base path | Capability area |
|-----------|-----------------|
| `/api/executive` | Executive avatar Q&A |
| `/api/voice` | Voice intelligence |
| `/api/briefing` | Executive briefing |
| `/api/decision-support` | Decision support |
| `/api/health` | Organizational health index |
| `/api/executive-memory` | Executive memory |
| `/api/context` | Executive context |

### Constitutional intelligence

| Base path | Capability area |
|-----------|-----------------|
| `/api/intelligence` | Prediction + constitutional analyses (M37–M45, advisor, DNA, culture, maturity, …) |
| `/api/intelligence/truth` | Truth verification |
| `/api/intelligence/brain-core` | Brain core posture, signals, explanation |
| `/api/intelligence/orchestrator` | Meta-orchestrator |
| `/api/intelligence/graph/status` · `/reload` | Knowledge-graph readiness (GET) and reload (POST) |
| `/api/signals` | Signal drilldown |

### Automation

| Base path | Capability area |
|-----------|-----------------|
| `/api/avatar` | Executive avatar escalations |
| `/api/self-healing` | Self-healing detect / run |
| `/api/automation` | Governance + continuity automation |

> **Not mounted:** `/api/brain/*` (the Brain is a library — D-40) and `/api/governance`
> (governance is served at `/api/intelligence/governance`). Earlier revisions of this
> document listed both.

### Health module (`/api/health`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health/summary` | Current org health index + dimensions. |
| GET | `/api/health/dimensions` | Per-dimension scores, weakest first. |
| GET | `/api/health/departments` | Department-level health. |
| GET | `/api/health/trend` | Trend vs baseline. |
| GET | `/api/health/history` | Historical snapshots. |
| GET | `/api/health/critical` | Live critical signals. |

> `/api/health` (bare) has no handler by design; call a sub-path such as `/api/health/summary`.

---

## 7. Frontend integration examples

**Login and store the token:**

```js
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const { token, user } = await res.json()
localStorage.setItem('horquva-token', token)
```

**Call any other endpoint (all require the token):**

```js
import { authHeader } from '@/lib/authFetch'

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`, {
  headers: { 'Content-Type': 'application/json', ...authHeader() },
})
const data = await res.json()
```

In practice components should go through `frontend/lib/api.ts`, which wraps `fetch`,
injects the auth header, and throws a typed `ApiError` on non-2xx:

```ts
import { briefing } from '@/lib/api'

const today = await briefing.latest() // GET /api/briefing/today
```

---

## 8. Local verification

```bash
cd backend
npm install
npm test           # tests/run-all.js — expect ALL TEST SUITES PASSED
npm start          # starts the API on port 3000
```

```bash
cd frontend
npm install
npm run build      # Next.js production build
npm run dev        # dev server on port 3001
```

Node **22 or newer is required** for the backend: `@supabase/realtime-js` needs native
`WebSocket`, which Node only ships from v22 onward.

---

## 9. MVP scope & rationale

The current design is deliberately scoped for a working MVP:

- **PostgreSQL-backed knowledge graph** instead of a dedicated graph database. The graph
  (nodes, edges, traversal, shortest-path) is fully functional on Postgres, which the
  platform already uses — no additional infrastructure to operate.
- **Stateless JWT auth** instead of a full identity provider. Simple, horizontally
  scalable, and sufficient for the MVP's access-control needs.
- **Single-tenant.** No business table carries an org column, so multi-tenancy is a schema
  change, not a config flag. The boot guard makes the assumption explicit rather than
  letting two orgs silently share a dataset.
- **Everything behind auth.** The earlier "public reads for frictionless demos" split
  leaked authenticated org data to any origin; the demo convenience was not worth it.
- **No external caching/queue layer yet.** Current data volumes are handled directly by
  the database within acceptable latency.

---

## 10. Future enhancements (post-MVP)

Planned for later phases, intentionally **not** in the MVP because each is a substantial
effort on its own:

- Multi-tenancy: org columns on the business tables, and row-level scoping to match.
- Forgotten-password recovery with real email delivery (signed token → mailbox → verify).
- Dedicated graph database (e.g. Neo4j) for very large / highly connected graphs.
- Redis caching layer for hot reads.
- Vector database for semantic search and embeddings.
- Event bus replay, retry, and dead-letter handling.
- Observability: metrics, tracing, dashboards, and alerting.
- API gateway features: rate limiting beyond the auth routes, request quotas, versioning.
- Auto-scaling and disaster-recovery strategy.

---

## 11. Deployment architecture (frontend + backend)

The product is **two separately deployed applications** that talk to each other over HTTPS:

```
[ Browser ]
     │  loads the website
     ▼
[ Frontend on Vercel ]  ── HTTPS + Bearer token ──▶  [ Backend API on Render ]
  (Next.js UI)                                          (Express + Brain library)
  project: frontend                                     service: oba-core-backend
                                                                 │
                                                                 ▼
                                                          [ Supabase / PostgreSQL ]
```

- **Backend deployment:** Render web service `oba-core-backend`, defined in `render.yaml`
  at the repo root. Root directory `backend`, build `npm install`, start `npm start`,
  health check `/`. It tracks the **`ocos/develop`** branch, so a push to that branch
  redeploys the API.
- **Frontend deployment:** Vercel project `frontend`, deployed from `frontend/` with
  `vercel --prod`. The project is **not** connected to the Git repo, so a push does **not**
  redeploy the UI — it has to be pushed from the CLI.
- **Connection:** `NEXT_PUBLIC_API_URL` on Vercel points at the Render base URL, baked into
  the client bundle at build time.
- **CORS:** `CORS_ORIGINS` on Render lists the frontend origin. Both env vars have to be
  updated together whenever either side's URL changes — see §4.4.

**Keeping the two coherent:** the backend redeploys on push, the frontend only on
`vercel --prod`. After changing anything that crosses the boundary, do both, in that order,
from the same commit.

**Data flow for a typical screen:** the browser opens the frontend URL → the frontend calls
one or more backend endpoints with a Bearer token → the backend queries Supabase and/or runs
the Brain → returns JSON → the frontend renders it as charts, tables, and views.
