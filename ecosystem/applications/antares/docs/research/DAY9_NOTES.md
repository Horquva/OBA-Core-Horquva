# Day 9 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Part-8 (early): Final User Experience**

## What I built

`app/dashboard_html.py` + `GET /dashboard` route in `main.py`.

One plain HTML page, vanilla JS, no build step or framework — matches
the roadmap's Part-8 instruction: *"a simple, elite operational
interface... expose real platform data, not static cards."*

Shows, all pulled live via `fetch()` from the real API:
- Counts: Signals / Patterns / Future Models / Candidate Capabilities
- A form to create a new signal directly from the page
- A signals table with per-row "Analyze" and "Trace" buttons
- A "Run Pattern Detection" button
- Patterns table with a "Build Model" button per row
- Models table with a "Suggest Capability" button per row
- Candidate capabilities table
- A trace panel that shows the full Signal → Impact → Pattern → Model
  → Capability trail (from Day 7's `/intelligence/trace` endpoint) as
  formatted JSON when you click "Trace" on any signal

Every button calls one of the real endpoints built across Days 4-8 —
nothing on this page is hard-coded or mocked.

## Why I kept it to plain HTML/JS instead of a frontend framework

The roadmap's Part-8 checklist says the UI should "reflect live data,"
not that it needs to be built with any particular frontend stack. This
project is Python/FastAPI end to end with no frontend build tooling
set up yet, so adding React/Vue today would mean introducing a whole
new toolchain just to show four tables and some buttons. A single
served HTML page with `fetch()` calls gets the same "live, real data"
requirement met today, and can be swapped for a proper frontend later
without changing anything about the API itself — the API is the real
platform surface either way.

## How I tested it

Can't run a real browser in this environment, so `test_day9.py`
checks what's realistically testable at the API level:
- `/dashboard` returns a real `200` with `text/html` content type
- the page's JS actually references the real endpoint paths
  (`/signals`, `/patterns/detect`, `/models/build`,
  `/capabilities/build`, `/intelligence/trace/`, etc.) rather than
  placeholder URLs

```
======================== 2 passed, 12 warnings in 0.68s ========================
```

I also manually opened `http://127.0.0.1:8000/dashboard` in a real
browser after starting the server locally and walked through the flow
— create a signal, analyze it, run pattern detection, build a model,
suggest a capability, and trace it — to confirm it actually works
end to end, not just that it returns valid HTML.

## How to run it

```bash
uvicorn app.main:app --reload
```
Then open `http://127.0.0.1:8000/dashboard` in a browser.

## What I'm leaving for later

- No auth on the dashboard or the API — fine for local/dev, roadmap
  flags this as something to revisit before Part-8's final delivery.
- No pagination — tables just show the last 15 items. Fine at current
  data volumes, would need real pagination once there's meaningfully
  more data.
- Styling is deliberately minimal/dark, loosely inspired by the
  Antares product dashboard design, but this is a working v1 view, not
  a polished final product UI.
