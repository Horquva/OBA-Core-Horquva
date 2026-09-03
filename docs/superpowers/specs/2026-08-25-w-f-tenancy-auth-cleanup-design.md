# W-F: Tenancy & Auth Cleanup — Design

Date: 2026-08-25
Decisions covered: D-01, D-05, D-13 (existing) plus D-33…D-36 (new, decided during this
workstream's tracing phase, the same way D-22…D-27 and D-28…D-32 closed gaps left by earlier
decisions).

Owner context: run live, with the owner present — D-01's org-consolidation migration is explicitly
owner-gated ("show the rows to the owner before touching them"), so this workstream did not run
unattended the way W-G did. The 5 `app_users` rows were read (with explicit approval — the sandbox
classifier blocks unapproved DB reads) and shown to the owner before any decision below was locked
in. Two open calls — how to consolidate the 4 org values, and whether the boot violation is a hard
`process.exit(1)` or a soft 503 — were put to the owner directly rather than decided on their
behalf; both are recorded as answered, not assumed.

---

## 1. The owner's calls

**Consolidation:** rewrite `org` → `'horquva'` for all 5 rows, not delete the 3 non-`'horquva'`
rows. Every account keeps working; only the org label changes. (`ORG_SLUG` already defaults to
`'horquva'`, so every registration since that env var existed has landed there — the other three
are stragglers from before it did.)

**Boot violation:** `process.exit(1)` — matches D-01's literal text ("hard boot failure, not a
warning") rather than a softer 503-everything-except-health compromise.

## 2. D-33 · `lib/search.ts` is not a D-05 file — corrected

D-05's affected-file list named three frontend files where `role` "survives as UI personalization
only": `Sidebar.tsx`, `app/account/page.tsx`, `lib/search.ts`. Traced each individually rather than
trusting the list, per §5's standing rule.

`Sidebar.tsx:64` and `account/page.tsx:77` both read `user.role` from `useAuth()` — the
authentication role (`admin`/`member`/`cto`/…) that used to gate `requireRole()` server-side and
still gates which nav items render client-side. Both are genuine D-05 files.

`lib/search.ts:57` has exactly one `role` reference, and it is `e.role` on an `employees` array
entry — an organizational job title (e.g. "Engineer", "Manager") pulled from the company dataset,
never `useAuth()`'s auth role, never touched by `requireRole` or any RBAC path. Same word, two
unrelated vocabularies — the same class of mistake the log's own criticality-vocabulary section (§1)
already warns about, just in a different pair of fields. **No change needed in `lib/search.ts`.**
Correcting the affected-file list rather than adding a comment to a file the decision never actually
applied to.

## 3. D-34 · `provision-user.js` shape

D-13's default (owner may override, not overridden here): a CLI script in `backend/tools/`,
matching `export-company.js`/`sweep.js` — plain `node script.js <args>`, no framework, no npm bin
entry. `DEFAULT_USER_ROLE` and `ORG_SLUG` (`routes/auth/auth.js:56,72`) are used **only** inside the
`POST /register` handler being deleted — both become dead code with it, not carried into the tool.
The provisioning script takes role as an explicit argument instead: an admin creating an account on
purpose should say what it is, not inherit an env default meant for self-service signup.

```
node backend/tools/provision-user.js <email> <password> [name] [role=member]
```

Reuses `lib/password.hash()` (the same hashing `/register` used) and inserts directly into
`app_users` with `org: 'horquva'` hardcoded — not read from an env var — because after D-01 there is
exactly one org value and a provisioning tool asking an operator to also get the org string right is
one more way to reintroduce the drift D-01 just fixed.

## 4. D-35 · Boot-sequence change, and how much of it is testable

`backend/index.js:68` currently fires `assertSingleTenant()` and ignores the result
(`.catch(() => {})`) — routes mount and `app.listen()` runs regardless. The fix keeps the call in
its current position (so the console banner still prints where it always has, before the route
mounts that follow it in the file) but captures the promise, and gates the **existing** `app.listen()`
call at the bottom of the file on its result:

```js
orgGuardCheck.then((result) => {
  if (!result.ok) {
    console.error('Refusing to start — see the SINGLE-TENANT ASSUMPTION VIOLATED banner above.')
    process.exit(1)
  }
  app.listen(PORT, () => { console.log("Server running on port", PORT) })
})
```

`orgGuard.js` itself is unchanged in behavior — `checkSingleTenant()` still never throws, still just
reports `{ok, orgs}`. Only its caller's response to a bad result changes. The module's docstring
("It WARNS rather than refusing to boot, deliberately") is now describing the *previous* caller, not
the current one — updated to say the check itself still just reports, but `index.js` now refuses to
boot on a bad result.

**What's tested and what isn't:** `checkSingleTenant()`'s pure logic (offline, stubbed Supabase —
1 org → `ok:true`, 2+ → `ok:false`) is unit-testable and gets a new test. The actual `process.exit(1)`
wiring in `index.js` is not — `index.js` is a script, not an exported function, and there is no
existing precedent in this repo for spawning it as a child process to test its exit code. Verifying
the failure path would mean deliberately reintroducing a second org value into the now-consolidated
production `app_users` table just to watch the crash — a live-data action taken purely for a test
assertion, which is exactly the kind of thing this remediation's own §5 already flagged as refused-
and-correctly-so (W-D's blocked `DELETE` against `orchestrator_snapshots`). The happy path (single
org, server starts and listens normally) is verified live in Task 4. The failure path is verified by
code review only — five lines, mirrors the existing `brain.loadGraph()` `.then()/.catch()` pattern
two lines above it in the same file, and is explicitly named here as a known verification gap rather
than silently claimed as covered.

## 5. D-36 · Deleting `/register` breaks its own test file — the test moves, doesn't disappear

`backend/tests/authRoutes.test.js` already has a "Registration cannot grant privilege" block
(lines 144-161) exercising the endpoint being deleted, plus two lines of setup
(`process.env.ORG_SLUG`, `process.env.DEFAULT_USER_ROLE`) that only existed for it. Both go. In
their place: the same file already has a precedent for testing a *removed* endpoint — "The removed
endpoint" (`reset-password`, from the auth-hardening workstream) asserts a 404 with no handler body.
`POST /register` gets the identical treatment: seed nothing, POST to it, assert 404 — proving the
route is gone rather than merely proving nothing calls it.

## 6. Files touched

Backend:
- `backend/lib/orgGuard.js` — docstring update only (§4); `checkSingleTenant`/`assertSingleTenant`
  logic unchanged.
- `backend/index.js` — gate `app.listen()` on the org-guard result (§4).
- `backend/middleware/auth.js` — delete `requireRole` and its export; drop the docstring's
  `requireRole('admin')` usage example.
- `backend/routes/auth/auth.js` — delete `POST /register`, `DEFAULT_USER_ROLE`, `ORG_SLUG`.
- `backend/tools/provision-user.js` — new (§3).
- `backend/sql/12_consolidate_single_tenant.sql` — new, one-line data migration (§1); run once
  against the live database with the owner present, same approval flow as the read in §1.
- `backend/tests/authRoutes.test.js` — remove the registration block + its env setup; add the
  removed-endpoint 404 test (§5).
- `backend/tests/orgGuard.unit.test.js` — new, pure, offline (§4).

Frontend:
- `frontend/app/signup/page.tsx` — delete.
- `frontend/app/login/page.tsx` — remove the "Create one" link/footer.
- `frontend/components/layout/AppShell.tsx` — remove `'/signup'` from `AUTH_ROUTES`. This file
  carries unrelated pre-existing WIP (a command-bar feature, `CommandBar`/`DeepLinkFocus` imports) —
  isolate per §5's established practice: commit the pre-existing WIP alone first, then this one-line
  edit on top, as its own commit.
- `frontend/lib/AuthContext.tsx` — delete `register` (type, implementation, context value) — its
  only caller is the signup page being deleted.
- `frontend/components/layout/Sidebar.tsx` — one-line addition to the existing "Role gating for the
  Role-Based Executive Experience" comment, making explicit that this is presentation-only now that
  `requireRole` no longer exists server-side (D-05).
- `frontend/app/account/page.tsx` — one-line comment on the role display, same reason.
- ~~`frontend/lib/search.ts`~~ — **not touched**, per D-33.

Also carrying unrelated pre-existing WIP that this workstream must not touch or bundle into its own
commits: `backend/.env.example` (CORS_ORIGINS), `backend/index.js` itself (the CORS-hardening block
at the top of the file — my own edit is at the bottom, near `app.listen()`, non-overlapping but the
same tracked file), `backend/middleware/auth.js` (the `authSecret.js` extraction — my edit removes
`requireRole` further down the same file). Same isolation approach as `AppShell.tsx`: diff-review
each file first, commit its existing WIP alone and named as such, then my edit on top as a separate
commit — matching what W-D actually did and what W-G's Task 1 didn't need to (no pre-existing WIP
touched `prediction.js`).

## 7. Explicitly not done here

| Item | Why deferred |
|---|---|
| Real multi-tenancy (`org_id` across the schema, scoped queries) | D-01 chose single-tenant; `orgGuard.js`'s own docstring already names this as its own future workstream if a second customer appears |
| Forgotten-password recovery | Unrelated to D-01/D-05/D-13; `auth.js`'s own comment already documents this as a deliberate gap (no email-delivery flow exists) |
| Removing `ORG_SLUG`/`ADMIN_ORG` env vars from `.env.example` | Neither var appears there today (checked) — nothing to remove |
