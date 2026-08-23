# Antares — Real, Live Integration

This replaces the old static-JSON dashboard. Now 6 of the team's actual
services run as real HTTP servers, and a gateway pulls live data from
all of them on every request. No fake numbers, no static file.

## What's new

| File | What it does |
|---|---|
| `services/lifecycle-service/src/server.js` | HTTP wrapper around Kamil's engineering-ops engine (port 4001) |
| `services/integration-service/src/server.js` | HTTP wrapper around the capability registry (port 4002) |
| `governance/engine/server.js` | HTTP wrapper that runs live governance decisions (port 4003) |
| `services/capability-service/api.py` | FastAPI wrapper around the org/workflow/audit demo (port 4004) |
| `services/validation-service/app/api.py` | Already existed — Zara's real FastAPI service (port 4005) |
| `services/research-service/server.py` | Serves the research team's real signal data (port 4006) |
| `gateway.js` | Calls all 6 live, merges the result, serves the dashboard (port 4000) |
| `apps/web/dashboard/index.html` | Now fetches live from the gateway every 15s — no static data.js |
| `start-all.sh` / `stop-all.sh` | Boots / stops the whole stack with one command |

## How to run it (on your machine)

```bash
cd ecosystem/applications/antares
./start-all.sh
```

This installs the Python deps (first run only), starts all 6 services,
starts the gateway, health-checks everything, and prints:

```
Antares is live: http://localhost:4000
```

Open that URL in a browser — the dashboard fetches real, live data from
all 6 running services and refreshes every 15 seconds.

To stop everything:

```bash
./stop-all.sh
```

## If start-all.sh ever hangs or misbehaves

Run the same commands by hand, each in its own terminal tab:

```bash
cd services/lifecycle-service   && PORT=4001 node src/server.js
cd services/integration-service && PORT=4002 node src/server.js
cd governance/engine            && PORT=4003 node server.js
cd services/capability-service  && uvicorn api:app --port 4004
cd services/validation-service  && uvicorn app.api:app --port 4005
cd services/research-service    && uvicorn server:app --port 4006
# then, from the antares/ folder:
node gateway.js
```

Then open `http://localhost:4000`.

## Notes

- `intelligence-service` and `operationalization-service` still have no
  code, so they're not wired in yet — add them the same way (a small
  HTTP wrapper + register it in `gateway.js`'s `SERVICES` object) once
  their code lands.
- `research-service`'s live discovery pipeline (`api_server.py`) needs a
  Gemini API key we don't have here, so `server.py` serves the real
  signal data the research team already generated and committed
  (`apps/research-dashboard/dashboard/data.json`) instead of re-running
  the pipeline live. Swap it in once a key is available.
- `integration-service` still has no `package.json` — add one before
  adding any external npm dependency to it.
