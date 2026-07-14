# Horquva OBA Core — Backend API & Integration Guide

> Organizational Brain Platform — REST API reference for frontend integration.
> Backend: Node.js + Express. Storage: Supabase (PostgreSQL). Hosting: Vercel.

---

## 1. What this backend is

The backend is a **stateless JSON REST API** that exposes the Organizational Brain
(55 constitutional intelligence modules) and its supporting services. It has **no user
interface of its own** — the frontend is a separate application that consumes these
endpoints over HTTPS and renders the data as a website/dashboard.

- All requests and responses are `application/json`.
- Cross-origin requests are enabled (CORS open), so the frontend can call the API from a different domain.
- The Brain boots on server start and registers all 55 modules, their capabilities, and the knowledge graph.

---

## 2. Base URLs

| Environment | Base URL |
|-------------|----------|
| Production  | `https://horquva-oba-core.vercel.app` |
| Local dev   | `http://localhost:3000` |

The frontend should read the base URL from an environment variable (e.g. `VITE_API_BASE_URL`
or `NEXT_PUBLIC_API_BASE_URL`) rather than hard-coding it, so the same code works in dev and production.

---

## 3. Health check / service root

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Service metadata + endpoint hints (confirms the API is live). |
| GET | `/api/brain/boot-report` | Full boot report: 55/55 modules, capabilities, graph validation. Best single call to verify system health. |
| GET | `/api/brain/status` | Lightweight runtime status. |

A `200` from `/api/brain/boot-report` with `"accepted": true` means the whole system is healthy.

---

## 4. Authentication (JWT)

Authentication uses **stateless JSON Web Tokens (HS256)**. There are no sessions to manage on the server.

### Endpoints

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/api/auth/login` | `{ "email", "password" }` | `{ token, user }` |
| POST | `/api/auth/register` | `{ "email", "password", "name?", "role?", "org?" }` | `{ token, user }` |
| GET | `/api/auth/me` | — (Bearer token) | `{ user }` |

### How the frontend uses it

1. Call `POST /api/auth/login` with the user's credentials.
2. Store the returned `token` (in memory or `localStorage`).
3. Attach it to every protected request as a header:
   ```
   Authorization: Bearer <token>
   ```
4. The token payload contains `sub` (user id), `email`, `role`, and `org` (tenant/organization), and an expiry (`exp`).

### Roles

`role` may be `member`, `admin`, or `executive`. Protected routes can additionally require a specific role.

### Which endpoints require a token?

- **Public (no token):** read/analytics endpoints used for the dashboard and demo — Brain, Health, and the domain module reads. This keeps the demo and visualizations simple.
- **Protected (token required):** any sensitive or write/delete operation. These use the auth middleware and, where needed, a role check.

This split is intentional for the MVP (see Section 8).

---

## 5. Response & error conventions

- **Success:** `200`/`201` with a JSON body.
- **Client error:** `400` (bad input), `401` (missing/invalid token), `403` (insufficient role), `404` (not found), `409` (already exists).
- **Server error:** `500` with `{ "error": "<message>" }`.

Error shape is always:
```json
{ "error": "human-readable message" }
```

---

## 6. Organizational Brain endpoints (`/api/brain`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/brain/boot-report` | Full boot report (modules, capabilities, graph). |
| GET | `/api/brain/status` | Runtime status. |
| GET | `/api/brain/signals` | Active organizational signals. |
| GET | `/api/brain/registry/modules` | List all modules. Optional `?owner=<name>`. |
| GET | `/api/brain/registry/capabilities` | List capabilities. Optional `?discover=<term>`. |
| GET | `/api/brain/graph/entities` | Knowledge-graph entities. Optional `?type=<type>`. |
| GET | `/api/brain/graph/traverse/:id` | Traverse the graph from an entity. |
| GET | `/api/brain/graph/dependency-path/:id` | Dependency path for an entity. |
| GET | `/api/brain/graph/validate` | Validate graph integrity. |
| POST | `/api/brain/ask` | Run a reasoning request: `{ modules \| need, context }`. |
| POST | `/api/brain/plan` | Produce an execution plan: `{ modules }`. |

---

## 7. Domain module APIs

Each capability area is mounted under `/api/...`. All return JSON. For exact sub-routes and
field-level schemas, see `API_REFERENCE.md` and `DATA_MODEL.md` in the backend folder.

| Base path | Capability area |
|-----------|-----------------|
| `/api/agents` | AI agents registry |
| `/api/ownership` | Ownership intelligence |
| `/api/dependencies` | Dependency mapping |
| `/api/risks` | Risk intelligence |
| `/api/dashboard` | Aggregated dashboard data |
| `/api/data-quality` | Data quality metrics |
| `/api/simulations/employee-leaves` | What-if: key person leaves |
| `/api/simulations/agent-fails` | What-if: agent failure |
| `/api/simulations/platform-down` | What-if: platform outage |
| `/api/simulations/workflow-disruption` | What-if: workflow disruption |
| `/api/human-agent-map` | Human–agent dependency map |
| `/api/tools` | AI tool intelligence |
| `/api/tool-intelligence` | Tool intelligence details |
| `/api/tool-impact` | Tool impact analysis |
| `/api/workflows` | Workflow intelligence |
| `/api/knowledge/intelligence` | Knowledge intelligence |
| `/api/knowledge/impact` | Knowledge impact |
| `/api/knowledge/gaps` | Knowledge gaps / risk |
| `/api/memory` | Organizational memory |
| `/api/intelligence/truth` | Truth verification |
| `/api/verification` | Verification intelligence |
| `/api/intelligence/brain-core` | Brain core logic |
| `/api/orchestration` | Workflow orchestration |
| `/api/decisions` | Decision intelligence |
| `/api/continuity` | Business continuity |
| `/api/learning` | Organizational learning |
| `/api/governance` | Governance |
| `/api/predictive-risk` | Predictive risk |
| `/api/forecast` | Forecasting |
| `/api/collaboration` | Human–AI collaboration |
| `/api/accountability` | Accountability |
| `/api/executive` | Executive avatar |
| `/api/voice` | Voice intelligence |
| `/api/briefing` | Executive briefing |
| `/api/decision-support` | Decision support |
| `/api/executive-memory` | Executive memory |
| `/api/context` | Executive context |
| `/api/intelligence/orchestrator` | Meta-orchestrator |

### Health module (`/api/health`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health/summary` | Current org health index + dimensions. |
| GET | `/api/health/dimensions` | Per-dimension scores, weakest first. |
| GET | `/api/health/departments` | Department-level health. |
| GET | `/api/health/trend` | Trend vs baseline. |
| GET | `/api/health/history` | Historical snapshots. |
| GET | `/api/health/critical` | Live critical signals. |

> Note: `/api/health` (bare) has no handler by design; call a sub-path such as `/api/health/summary`.

---

## 8. Frontend integration examples

**Login and store the token:**
```js
const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const { token, user } = await res.json()
localStorage.setItem('token', token)
```

**Call a public endpoint (dashboard data):**
```js
const report = await fetch(`${API_BASE_URL}/api/brain/boot-report`).then(r => r.json())
```

**Call a protected endpoint:**
```js
const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
})
const { user } = await res.json()
```

**Run a reasoning request:**
```js
const answer = await fetch(`${API_BASE_URL}/api/brain/ask`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modules: ['M01', 'M03', 'M50', 'M55'],
    context: { role: 'CEO', question: 'What are our biggest organizational risks?' },
  }),
}).then(r => r.json())
```

---

## 9. What changed in this update

| Area | Change | Why |
|------|--------|-----|
| **Authentication** | Added JWT-based auth (`/api/auth/login`, `/register`, `/me`), auth + role + organization-context middleware, and a users table schema. | The platform needs identity and access control before it can serve real organizations. |
| **Security implementation** | JWT signing/verification and password hashing implemented with Node's built-in `crypto` (HS256 + scrypt). | **Zero new dependencies** — no `jsonwebtoken`/`bcrypt` to install, so it deploys on Vercel without extra build steps and reduces supply-chain surface. |
| **Service root** | Added `GET /` returning service metadata. | Previously the root returned "Cannot GET /"; now it returns a clear JSON status, which is expected behavior for an API. |
| **Automated tests** | Added a test suite: brain smoke test, intelligence-services verification, auth unit test, and a live-API smoke test, plus a single runner. | Provides repeatable validation (currently 30/30 checks passing) so integration changes can be verified quickly. |

### How to verify (local)
```bash
cd backend
npm install
node brain/boot.js          # expect 55/55, Accepted: YES
node tests/run-all.js       # expect ALL TEST SUITES PASSED
node index.js               # starts API on port 3000
```

---

## 10. MVP scope & rationale

The current design is deliberately scoped for a working MVP:

- **PostgreSQL-backed knowledge graph** instead of a dedicated graph database. The graph
  (nodes, edges, traversal, shortest-path) is fully functional on Postgres, which the platform
  already uses — no additional infrastructure to operate for the MVP.
- **Stateless JWT auth** instead of a full identity provider. Simple, horizontally scalable,
  and sufficient for the MVP's access-control needs.
- **Public read endpoints / protected writes.** Keeps dashboards and demos frictionless while
  still protecting sensitive operations.
- **No external caching/queue layer yet.** The current data volumes are handled directly by the
  database within acceptable latency.

These choices minimize moving parts, keep the system easy to deploy and demo, and still deliver
the full 55-module intelligence surface.

---

## 11. Future enhancements (post-MVP)

Planned for later phases (production hardening), intentionally **not** in the MVP because each is
a substantial effort on its own:

- Dedicated graph database (e.g. Neo4j) for very large / highly connected graphs.
- Redis caching layer for hot reads.
- Vector database for semantic search and embeddings.
- Event bus replay, retry, and dead-letter handling.
- Full CI/CD pipeline and automated deployments.
- Observability: metrics, tracing, dashboards, and alerting.
- API gateway features: rate limiting, request quotas, and API versioning.
- Auto-scaling and disaster-recovery strategy.

---

## 12. Deployment architecture (frontend + backend)

The product is **two separately deployed applications** that talk to each other over HTTPS:

```
[ Browser ]
     │  loads the website
     ▼
[ Frontend app on Vercel ]  ── HTTPS (fetch/axios) ──▶  [ Backend API on Vercel ]
  (React/Next UI)                                          (Express + Brain)
                                                                 │
                                                                 ▼
                                                          [ Supabase / PostgreSQL ]
```

- **Backend deployment:** already live. Serves only JSON at `/api/...`. No HTML.
- **Frontend deployment:** a separate Vercel project built from the frontend code. It renders
  the UI and calls the backend endpoints above.
- **Connection:** the frontend is configured with an environment variable pointing at the backend
  base URL (e.g. `NEXT_PUBLIC_API_BASE_URL=https://horquva-oba-core.vercel.app`). All data shown
  in the UI is fetched from the backend at runtime.
- **CORS:** the backend already allows cross-origin requests, so the frontend domain can call it.

**Data flow for a typical screen:** the browser opens the frontend URL → the frontend calls one or
more backend endpoints (with a Bearer token if the endpoint is protected) → the backend queries
Supabase and/or runs the Brain → returns JSON → the frontend renders it as charts, tables, and views.
