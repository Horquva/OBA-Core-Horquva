# W-F: Tenancy & Auth Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `app_users` onto one org and make a future violation a hard boot failure (D-01); delete the decorative `requireRole` (D-05); close public registration and replace it with an admin CLI tool (D-13).

**Architecture:** Six tasks, ordered so the destructive data fix (D-01's migration) lands before the code that would refuse to boot without it. Each backend deletion is proven by the existing test suite either still passing (nothing calls the deleted thing) or a new/updated test asserting the removal. Three touched files carry unrelated pre-existing WIP — each gets its own "isolate first" step before this plan's edit, per the design doc §6.

**Tech Stack:** Express (backend), Next.js/React (frontend), hand-rolled `node` test scripts, Supabase JS client (no raw-SQL runner in this repo — the `.sql` file is the durable record, the JS client is what actually executes it, same as every other write path in this codebase).

**Spec:** [docs/superpowers/specs/2026-08-25-w-f-tenancy-auth-cleanup-design.md](../specs/2026-08-25-w-f-tenancy-auth-cleanup-design.md)

## Global Constraints

- The owner already chose (design doc §1): rewrite `org` → `'horquva'` for all 5 rows (not delete the 3 stragglers); `process.exit(1)` on a boot-time violation (not a soft 503).
- `lib/search.ts` is **not** touched — D-33, its `role` field is an unrelated employee job title.
- Before staging any file that already had uncommitted changes at session start (`index.js`, `middleware/auth.js`, `AppShell.tsx`), commit that pre-existing content alone first, named as pre-existing and unrelated, then this plan's edit on top as a separate commit. Never blanket `git add` these three files.
- Full backend suite (`node tests/run-all.js`) green before every backend commit; `tsc --noEmit` clean before every frontend commit.
- Any write against the live database (the org-consolidation UPDATE) needs an explicit go-ahead at the moment it runs — the general plan approval does not stand in for it.
- Commit messages name the responsible decision (D-01, D-05, D-13, D-33…D-36).

---

### Task 1: D-01 data — consolidate `app_users` onto `org = 'horquva'`

**Files:**
- Create: `backend/sql/12_consolidate_single_tenant.sql`

**Interfaces:**
- Produces: `app_users` with a single `org` value — Task 2's hard-exit boot gate depends on this already being true before it lands (otherwise every subsequent server start in this plan crashes on the fix meant to catch *future* drift).

- [ ] **Step 1: Write the migration record**

```sql
-- 12_consolidate_single_tenant.sql — D-01: consolidate app_users onto one org.
--
-- WHY THIS EXISTS
-- app_users held 4 distinct org values (horquva, Horquva QA, pp, yy) despite
-- OBA Core being single-tenant by design (no business table carries an org
-- column — see lib/orgGuard.js). Three of the four are QA/test-account
-- stragglers from before ORG_SLUG existed as an env var; every registration
-- since has landed on 'horquva'. Owner reviewed all 5 rows on 2026-08-25 and
-- chose to rewrite org rather than delete the non-'horquva' accounts, so
-- every existing login keeps working.

update public.app_users set org = 'horquva' where org <> 'horquva';
```

- [ ] **Step 2: Get explicit go-ahead, then run it**

State the exact statement above and wait for an explicit yes before running anything — this is the destructive action D-01 itself flags, distinct from the general plan approval. Once confirmed, run it through the same Supabase JS client every other write path in this repo uses (there is no raw-SQL runner):

```bash
node -e "
const supabase = require('./supabase');
(async () => {
  const { data, error } = await supabase
    .from('app_users')
    .update({ org: 'horquva' })
    .neq('org', 'horquva')
    .select('id, email, org');
  if (error) { console.error('ERROR', error.message); process.exit(1); }
  console.log('Updated', data.length, 'rows:', JSON.stringify(data, null, 2));
})();
"
```
(Run from `backend/`.) Expected: `Updated 3 rows` — the `Horquva QA`, `pp`, and `yy` rows, each now showing `"org": "horquva"`.

- [ ] **Step 3: Verify with a fresh read**

```bash
node -e "
const supabase = require('./supabase');
(async () => {
  const { data, error } = await supabase.from('app_users').select('org');
  if (error) { console.error('ERROR', error.message); process.exit(1); }
  console.log([...new Set(data.map(r => r.org))]);
})();
"
```
Expected: `[ 'horquva' ]` — exactly one org value across all rows.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/12_consolidate_single_tenant.sql
git commit -m "$(cat <<'EOF'
D-01: consolidate app_users onto org='horquva'

Owner reviewed all 5 rows on 2026-08-25 and chose to rewrite org rather
than delete the 3 non-'horquva' stragglers (QA-test accounts predating
ORG_SLUG as an env var) -- every existing login keeps working. Verified
live: a single org value across app_users after the update.
EOF
)"
```

---

### Task 2: D-01 code — hard boot failure on a future single-tenant violation

**Files:**
- Modify: `backend/lib/orgGuard.js` (docstring only)
- Modify: `backend/index.js`
- Create: `backend/tests/orgGuard.unit.test.js`

**Interfaces:**
- Consumes: `require('./lib/orgGuard').assertSingleTenant()` → `Promise<{ok: boolean, orgs: string[], reason?: string}>` (unchanged — `backend/lib/orgGuard.js:31-49`).
- Produces: `index.js` now calls `process.exit(1)` instead of silently continuing when `assertSingleTenant()` resolves `{ok: false}`.

- [ ] **Step 1: Isolate `index.js`'s pre-existing WIP**

`git diff backend/index.js` at session start showed an unrelated CORS-allowlist hardening change (already reviewed in the design doc §6) sitting in the working tree before this task touches anything. Commit it alone first, named as pre-existing:

```bash
git add backend/index.js
git commit -m "$(cat <<'EOF'
Pre-existing WIP: restrict CORS to an allowlisted origin (not part of W-F)

Carried over from before this session started; committing as-is so W-F's
own index.js edit (the D-01 hard-exit boot gate) can be isolated in its
own commit on top of this.
EOF
)"
```

- [ ] **Step 2: Write the pure-logic test**

Create `backend/tests/orgGuard.unit.test.js`:

```js
/*
 * OBA Core — orgGuard unit test (D-01, D-35).
 *
 * Pure, offline: stubs backend/supabase.js the same way authRoutes.test.js
 * and graphRoutes.test.js do, so checkSingleTenant()'s logic is exercised
 * without a live database. This is the half of the D-01 boot-gate change
 * that's actually testable — see the design doc §4 for why the
 * process.exit(1) wiring in index.js itself is verified by code review and
 * a live happy-path check instead.
 *
 * Run from backend/:  node tests/orgGuard.unit.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

let rows = []
const fakeSupabase = {
	from: () => ({
		select: async () => ({ data: rows, error: null }),
	}),
}
const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase }

const { checkSingleTenant } = require('../lib/orgGuard')

async function main() {
	console.log('\n=== OBA Core — orgGuard Unit Test ===\n')

	console.log('A single org:')
	rows = [{ org: 'horquva' }, { org: 'horquva' }, { org: 'horquva' }]
	{
		const r = await checkSingleTenant()
		check('ok is true', r.ok === true, r)
		check('orgs has exactly one value', r.orgs.length === 1 && r.orgs[0] === 'horquva', r.orgs)
	}

	console.log('\nMultiple orgs (the violation D-01 exists for):')
	rows = [{ org: 'horquva' }, { org: 'pp' }, { org: 'yy' }]
	{
		const r = await checkSingleTenant()
		check('ok is false', r.ok === false, r)
		check('orgs lists all distinct values, sorted', JSON.stringify(r.orgs) === JSON.stringify(['horquva', 'pp', 'yy']), r.orgs)
	}

	console.log('\nNo rows at all:')
	rows = []
	{
		const r = await checkSingleTenant()
		check('an empty table is not a violation', r.ok === true, r)
		check('orgs is empty', r.orgs.length === 0, r.orgs)
	}

	console.log('\nNull/duplicate org values do not distort the count:')
	rows = [{ org: 'horquva' }, { org: null }, { org: 'horquva' }]
	{
		const r = await checkSingleTenant()
		check('nulls are filtered, duplicates collapse — still single-org', r.ok === true, r)
		check('orgs is just the one real value', JSON.stringify(r.orgs) === JSON.stringify(['horquva']), r.orgs)
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'ORGGUARD UNIT TESTS PASSED ✅' : 'ORGGUARD UNIT TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
```

- [ ] **Step 2b: Run it to confirm the existing logic already passes**

Run: `cd backend && node tests/orgGuard.unit.test.js`
Expected: `ORGGUARD UNIT TESTS PASSED ✅` — `checkSingleTenant()`'s logic isn't changing in this task, only its caller's response to a bad result, so this test documents/locks existing behavior rather than driving a fix.

- [ ] **Step 3: Register the test in run-all.js**

In `backend/tests/run-all.js`, add `'orgGuard.unit.test.js',` immediately after `'graphRoutes.test.js', // HTTP-level; stubs brain, so it runs offline`:

```js
	'graphRoutes.test.js', // HTTP-level; stubs brain, so it runs offline
	'orgGuard.unit.test.js', // pure; asserts checkSingleTenant()'s logic offline
]
```

- [ ] **Step 4: Update `orgGuard.js`'s docstring**

The module's behavior is unchanged; only its caller's response changes. Update the paragraph that's now describing the old caller:

```js
 * It WARNS rather than refusing to boot, deliberately. A hard exit fails in the
 * wrong direction: it would take down a working deployment over a data
 * condition, and would also kill local development whenever Supabase happens to
 * be unreachable. The condition needs an operator, not an outage.
```
becomes:
```js
 * This module itself never throws or exits — it only reports. `index.js` is
 * the one that decides what to do with a bad result, and as of D-01 that
 * decision is process.exit(1): a genuine violation means two organizations
 * are silently sharing one dataset, which is worse than a deployment that
 * refuses to start. Supabase being merely unreachable is not this condition —
 * checkSingleTenant() returns {ok: true, reason: 'no-supabase'} or the error
 * message for that case, not a violation, so local development without a
 * configured database still boots.
```

In `backend/lib/orgGuard.js`, replace exactly that paragraph (currently lines 14-17).

- [ ] **Step 5: Gate `app.listen()` on the check result**

In `backend/index.js`, replace:

```js
// OBA Core is single-tenant and no business table carries an org column, so a
// second organization in app_users would silently share one dataset. Report it
// loudly at boot; see lib/orgGuard.js for why this warns rather than exits.
require('./lib/orgGuard').assertSingleTenant().catch(() => {})
```

with:

```js
// OBA Core is single-tenant and no business table carries an org column, so a
// second organization in app_users would silently share one dataset. D-01:
// this is now a hard boot failure, not a warning — see the gate on
// app.listen() at the bottom of this file, and lib/orgGuard.js for why the
// check itself still only reports rather than exiting.
const orgGuardCheck = require('./lib/orgGuard').assertSingleTenant()
```

Then, at the very end of the file, replace:

```js
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})
```

with:

```js
const PORT = process.env.PORT || 3000
orgGuardCheck.then((result) => {
  if (!result.ok) {
    console.error('Refusing to start — see the SINGLE-TENANT ASSUMPTION VIOLATED banner above.')
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log("Server running on port", PORT)
  })
})
```

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅`.

- [ ] **Step 7: Commit**

```bash
git add backend/lib/orgGuard.js backend/index.js backend/tests/orgGuard.unit.test.js backend/tests/run-all.js
git commit -m "$(cat <<'EOF'
D-01: hard boot failure on a single-tenant violation

app.listen() now waits on assertSingleTenant() and process.exit(1)s on a
bad result, instead of firing the check and ignoring it. orgGuard.js's own
logic is unchanged (still never throws/exits) -- only index.js's response
to a bad result changes; docstring updated to say so. checkSingleTenant()'s
pure logic gets a new offline test (D-35); the process.exit(1) wiring
itself is verified by code review + a live happy-path check (Task 6) --
recorded as a known verification gap in the design doc §4 rather than
claimed as covered, since proving the failure path would mean deliberately
reintroducing a bad org value into the now-consolidated production data.
EOF
)"
```

---

### Task 3: D-05 — delete `requireRole`; document role as cosmetic in the UI

**Files:**
- Modify: `backend/middleware/auth.js`
- Modify: `frontend/components/layout/Sidebar.tsx`
- Modify: `frontend/app/account/page.tsx`

**Interfaces:**
- Produces: `middleware/auth.js` exports only `{ requireAuth, optionalAuth, orgContext, extractToken }` — `requireRole` no longer exists. (Already confirmed zero route files call it — grep found only comment references, which stay as history, not live code.)

- [ ] **Step 1: Isolate `middleware/auth.js`'s pre-existing WIP**

`git diff backend/middleware/auth.js` at session start showed an unrelated change extracting the JWT secret into `lib/authSecret.js` (already reviewed, design doc §6). Commit it alone first:

```bash
git add backend/middleware/auth.js
git commit -m "$(cat <<'EOF'
Pre-existing WIP: centralize the JWT secret in lib/authSecret.js (not part of W-F)

Carried over from before this session started; committing as-is so W-F's
own middleware/auth.js edit (deleting requireRole, D-05) can be isolated
in its own commit on top of this.
EOF
)"
```

- [ ] **Step 2: Delete `requireRole`**

In `backend/middleware/auth.js`, remove the usage-example line from the top docstring:

```js
 *   router.delete('/x', requireAuth, requireRole('admin'), handler)
```

Remove the function itself:

```js
function requireRole(...roles) {
	return (req, res, next) => {
		if (!req.user) return res.status(401).json({ error: 'Authentication required' })
		if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden — insufficient role' })
		next()
	}
}

```

And drop it from the exports:

```js
module.exports = { requireAuth, optionalAuth, requireRole, orgContext, extractToken }
```
becomes:
```js
module.exports = { requireAuth, optionalAuth, orgContext, extractToken }
```

- [ ] **Step 3: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅` — nothing imports `requireRole`, so nothing breaks.

- [ ] **Step 4: Document role as cosmetic in the frontend**

In `frontend/components/layout/Sidebar.tsx`, the existing comment:
```ts
// Role gating for the Role-Based Executive Experience.
```
becomes:
```ts
// Role gating for the Role-Based Executive Experience. Presentation only —
// D-05 deleted requireRole() server-side, so every authenticated user can
// still reach any endpoint directly; this only decides which nav items
// render for a given role, not what that role is allowed to do.
```

In `frontend/app/account/page.tsx`, immediately above the line displaying `user.role`:
```tsx
            {user.role ? ` · ${user.role}` : ''}
```
add a one-line comment above it:
```tsx
            {/* Display only (D-05) — role no longer gates anything server-side. */}
            {user.role ? ` · ${user.role}` : ''}
```

- [ ] **Step 5: Type-check the frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add backend/middleware/auth.js frontend/components/layout/Sidebar.tsx frontend/app/account/page.tsx
git commit -m "$(cat <<'EOF'
D-05: delete requireRole; document role as cosmetic in the two UI files that use it

Deleted, not left dormant -- a security primitive that protects nothing
reads as protection. Zero route files called it (grep-confirmed before and
after). Sidebar.tsx and account/page.tsx read the real auth role and now
say explicitly that it's presentation-only; lib/search.ts was in D-05's
original file list but its only 'role' reference is an unrelated employee
job title (D-33) -- left untouched.
EOF
)"
```

---

### Task 4: D-13 backend — close registration, add the provisioning CLI

**Files:**
- Modify: `backend/routes/auth/auth.js`
- Modify: `backend/tests/authRoutes.test.js`
- Create: `backend/tools/provision-user.js`

**Interfaces:**
- Produces: `POST /api/auth/register` no longer routed (404). `node backend/tools/provision-user.js <email> <password> [name] [role=member]` creates an `app_users` row with `org: 'horquva'`, hashed via `lib/password.hash()` (same hashing `/register` used).

- [ ] **Step 1: Write the failing test — assert `/register` is gone**

In `backend/tests/authRoutes.test.js`, remove the two setup lines that only existed for the registration tests:
```js
process.env.ORG_SLUG = 'test-org'
process.env.DEFAULT_USER_ROLE = 'member'
```

Remove the entire "Registration cannot grant privilege" block:
```js
	// ── Registration cannot grant privilege ─────────────────────────────────
	console.log('\nRegistration:')
	{
		rows = []
		const r = await call('POST', '/api/auth/register', {
			body: { email: 'climber@example.com', password: 'correct-horse', name: 'C', role: 'admin', org: 'somewhere-else' },
		})
		check('register succeeds', r.status === 201, r.json)
		check('role from the request body is ignored', r.json?.user?.role === 'member', r.json?.user?.role)
		check('org from the request body is ignored', r.json?.user?.org === 'test-org', r.json?.user?.org)
		check('stored row also carries the safe role', rows[0] && rows[0].role === 'member', rows[0] && rows[0].role)
	}
	{
		const r = await call('POST', '/api/auth/register', {
			body: { email: 'short@example.com', password: 'abc' },
		})
		check('register rejects a password under the minimum', r.status === 400, r.status)
	}
```

Replace it with the same "removed endpoint" pattern the file already uses for `reset-password` (right above it):

```js
	// ── Public registration is closed (D-13) ────────────────────────────────
	// Replaced by backend/tools/provision-user.js — an admin creates accounts
	// directly now, the same way the old reset-password endpoint was replaced
	// by an authenticated change-password flow rather than patched in place.
	console.log('\nThe closed registration endpoint:')
	{
		rows = []
		const r = await call('POST', '/api/auth/register', {
			body: { email: 'climber@example.com', password: 'correct-horse', name: 'C' },
		})
		check('POST /register is unrouted', r.status === 404, r.status)
		check('...and answers with no handler body', r.json.error === undefined, r.json)
		check('...and no account was created', rows.length === 0, rows)
	}
```

- [ ] **Step 2: Run the test to verify it fails for the right reason**

Run: `cd backend && node tests/authRoutes.test.js`
Expected: FAIL — `POST /register is unrouted` fails because the route still exists and returns `201`, not `404`.

- [ ] **Step 3: Delete the route and its now-dead consts**

In `backend/routes/auth/auth.js`, remove:
```js
// OBA Core is single-tenant. Every account created through this router belongs
// to this one organization; `org` is not accepted from callers. See
// lib/orgGuard.js for the startup check that reports drift.
const ORG_SLUG = process.env.ORG_SLUG || process.env.ADMIN_ORG || 'horquva'
```
and:
```js
// The role every self-registered account gets. Read from the environment, NOT
// from the request — that distinction is the entire point. The signup form used
// to offer an "Executive role" dropdown whose value became the token's role
// claim, which the sidebar reads to decide which sections to show, so anyone
// could hand themselves the executive experience by picking CEO.
//
// It stays configurable because a demo deployment needs new sign-ups to land
// somewhere useful, and a shared operator-set default is not a privilege
// escalation: the person choosing it already controls the deployment.
const DEFAULT_USER_ROLE = process.env.DEFAULT_USER_ROLE || 'member'
```
and the entire route:
```js
// -- REGISTER --------------------------------------------------
// `role` and `org` are NOT read from the request. They used to be, which meant
// POST /register {..., role:'admin'} minted an administrator on demand and made
// any future requireRole() check decorative. Registration now creates an account
// at the operator-configured DEFAULT_USER_ROLE in the single tenant; the sole
// path to `admin` is the ADMIN_EMAIL/ADMIN_PASSWORD env fallback below.
router.post('/register', authRateLimit, async (req, res) => {
	const { email, password: pass, name } = req.body || {}
	if (!email || !pass) return res.status(400).json({ error: 'email and password are required' })
	if (String(pass).length < MIN_PASSWORD_LENGTH) {
		return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
	}
	if (!supabase) return res.status(503).json({ error: 'User store not configured. Set up the Supabase app_users table.' })

	try {
		const existing = await findUserByEmail(email)
		if (existing) return res.status(409).json({ error: 'User already exists' })

		const { data, error } = await supabase
			.from('app_users')
			.insert([{ email, name: name || null, role: DEFAULT_USER_ROLE, org: ORG_SLUG, password_hash: password.hash(pass) }])
			.select('*')
			.single()
		if (error) throw new Error(error.message)

		const token = sign({ sub: data.id, email: data.email, role: data.role, org: data.org }, SECRET, TTL)
		return res.status(201).json({ token, user: publicUser(data) })
	} catch (err) {
		return res.status(500).json({ error: err.message })
	}
})

```

Also update the file's top-of-file endpoint list (lines 3-8) to drop the `POST /api/auth/register` line, and the header comment block right above where `MIN_PASSWORD_LENGTH` is defined still applies (that constant is still used by `/change-password` — leave it).

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && node tests/authRoutes.test.js`
Expected: `AUTH ROUTE TESTS PASSED ✅`.

- [ ] **Step 5: Write the provisioning CLI**

Create `backend/tools/provision-user.js`:

```js
// Creates an app_users account directly. Replaces the public POST /register
// endpoint closed under D-13 — registration used to be self-service; now an
// admin runs this instead. Matches export-company.js/sweep.js's style: a
// plain `node script.js <args>` tool, no framework, no npm bin entry.
//
// Usage:
//   node backend/tools/provision-user.js <email> <password> [name] [role=member]
//
// org is hardcoded to 'horquva' rather than read from an env var — after
// D-01 there is exactly one org value, and asking an operator to also get an
// org string right on every account creation is one more way to reintroduce
// the drift D-01 just fixed.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabase = require('../supabase')
const password = require('../lib/password')

const MIN_PASSWORD_LENGTH = 8
const ORG = 'horquva'

async function main() {
	const [email, pass, name, role] = process.argv.slice(2)
	if (!email || !pass) {
		console.error('Usage: node backend/tools/provision-user.js <email> <password> [name] [role=member]')
		process.exit(1)
	}
	if (pass.length < MIN_PASSWORD_LENGTH) {
		console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
		process.exit(1)
	}

	const { data: existing } = await supabase.from('app_users').select('id').eq('email', email).limit(1).single()
	if (existing) {
		console.error(`A user with email ${email} already exists (id ${existing.id})`)
		process.exit(1)
	}

	const { data, error } = await supabase
		.from('app_users')
		.insert([{ email, name: name || null, role: role || 'member', org: ORG, password_hash: password.hash(pass) }])
		.select('id, email, name, role, org')
		.single()
	if (error) {
		console.error('Failed to create account:', error.message)
		process.exit(1)
	}

	console.log('Account created:', JSON.stringify(data, null, 2))
}

main().catch((err) => {
	console.error('Unexpected error:', err.message)
	process.exit(1)
})
```

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅`.

- [ ] **Step 7: Commit**

```bash
git add backend/routes/auth/auth.js backend/tests/authRoutes.test.js backend/tools/provision-user.js
git commit -m "$(cat <<'EOF'
D-13: close public registration; add backend/tools/provision-user.js

POST /api/auth/register is deleted, not merely locked down further --
DEFAULT_USER_ROLE and ORG_SLUG go with it, since both existed only for
this route. authRoutes.test.js's registration block is replaced with the
same "removed endpoint, assert 404" pattern already used for
reset-password. provision-user.js is the CLI replacement, matching
export-company.js/sweep.js's no-framework style; org is hardcoded to
'horquva' rather than env-configurable, since D-01 leaves exactly one
valid value.
EOF
)"
```

---

### Task 5: D-13 frontend — remove signup

**Files:**
- Delete: `frontend/app/signup/page.tsx`
- Modify: `frontend/app/login/page.tsx`
- Modify: `frontend/components/layout/AppShell.tsx`
- Modify: `frontend/lib/AuthContext.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AuthContextValue` no longer has a `register` field — nothing outside `AuthContext.tsx` referenced it besides the deleted signup page (confirmed by grep before writing this plan).

- [ ] **Step 1: Isolate `AppShell.tsx`'s pre-existing WIP**

`git diff frontend/components/layout/AppShell.tsx` at session start showed an unrelated command-bar feature (`CommandBar`, `DeepLinkFocus` — already reviewed, design doc §6). Commit it alone first:

```bash
git add frontend/components/layout/AppShell.tsx
git commit -m "$(cat <<'EOF'
Pre-existing WIP: add CommandBar and DeepLinkFocus to AppShell (not part of W-F)

Carried over from before this session started; committing as-is so W-F's
own AppShell.tsx edit (removing /signup from AUTH_ROUTES, D-13) can be
isolated in its own commit on top of this.
EOF
)"
```

- [ ] **Step 2: Delete the signup page**

```bash
git rm frontend/app/signup/page.tsx
```

- [ ] **Step 3: Remove the signup link from the login page**

In `frontend/app/login/page.tsx`, remove the `Link` import (no longer used anywhere else in this file):
```tsx
import Link from 'next/link';
```

And change:
```tsx
      footer={<>Don&apos;t have an account? <Link href="/signup" style={{ color: 'var(--accent)' }}>Create one</Link></>}
    >
```
to:
```tsx
    >
```
(dropping the `footer` prop entirely — `AuthLayout` treats it as optional; confirm this by checking `frontend/components/auth/AuthLayout.tsx`'s prop type before assuming, since a required prop would need a different fix.)

- [ ] **Step 4: Remove `/signup` from `AppShell.tsx`'s auth-route list**

In `frontend/components/layout/AppShell.tsx`:
```tsx
const AUTH_ROUTES = ['/login', '/signup'];
```
becomes:
```tsx
const AUTH_ROUTES = ['/login'];
```

- [ ] **Step 5: Remove `register` from `AuthContext`**

In `frontend/lib/AuthContext.tsx`, remove from the interface:
```ts
  register: (payload: { email: string; password: string; name?: string }) => Promise<void>;
```

Remove the implementation:
```ts
  // `role` and `org` are intentionally absent. The server ignores them now —
  // it always creates a plain member of the single tenant — so accepting them
  // here would only advertise a choice the caller does not have.
  const register = useCallback(async (payload: { email: string; password: string; name?: string }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Registration failed');
    persist(data.token, data.user);
  }, [persist]);

```

And drop it from the provider value:
```tsx
    <AuthContext.Provider value={{ user, token, loading, login, register, changePassword, logout }}>
```
becomes:
```tsx
    <AuthContext.Provider value={{ user, token, loading, login, changePassword, logout }}>
```

- [ ] **Step 6: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors. If `AuthLayout`'s `footer` prop turns out to be required (Step 3's caveat), this is where it would surface — fix by making it optional in `AuthLayout.tsx` if so, rather than leaving a placeholder footer.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/signup/page.tsx frontend/app/login/page.tsx frontend/components/layout/AppShell.tsx frontend/lib/AuthContext.tsx
git commit -m "$(cat <<'EOF'
D-13: remove the signup page and AuthContext.register

Self-service registration is closed server-side (Task 4); this is the
matching frontend removal. register's only caller was the deleted signup
page (confirmed by grep before this plan was written), so it comes out
rather than staying dormant.
EOF
)"
```

---

### Task 6: Full-suite and live verification

**Files:** none (verification only).

- [ ] **Step 1: Full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅`.

- [ ] **Step 2: Frontend type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Start both dev servers and verify live**

Follow the decision log §5 process: `.claude/launch.json`'s `backend`/`frontend` entries (autoPort — don't assume 3000/3001 are free), retarget `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` to whatever port the backend actually started on and restart the frontend dev server, then revert `.env.local` afterward (gitignored local config).

1. **Boot happy-path (D-01):** confirm the backend's startup log shows `Server running on port <N>` and does **not** show the `SINGLE-TENANT ASSUMPTION VIOLATED` banner — Task 1's consolidation should mean `orgGuardCheck` resolves `{ok: true}` and `app.listen()` runs normally.
2. **Registration is closed (D-13):** `curl -i -X POST http://localhost:<backend-port>/api/auth/register -H 'Content-Type: application/json' -d '{"email":"x@example.com","password":"whatever1"}'` → expect `404`.
3. **`/signup` is gone (D-13):** navigate to `http://localhost:3001/signup` in the browser → expect a 404 page (no route left to render it) or a redirect to `/login` (via `AppShell`'s `isAuthRoute` check no longer matching `/signup`, falling through to the "no token → redirect to /login" effect) — confirm which one it actually does and that it isn't a broken/blank page.
4. **Login still works (D-05, D-13):** log in through the real UI with `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `backend/.env`, confirm it succeeds and lands on the dashboard.
5. **Role is still shown (D-05):** open `/account`, confirm the role still displays next to the email (the comment added in Task 3 only annotates the code, doesn't change behavior).
6. **Provisioning CLI works (D-13):** with the owner's go-ahead (this creates a real row), run `node backend/tools/provision-user.js w-f-verify@example.com verify1234 "W-F Verify" member` from `backend/`, confirm it prints the created account, then confirm the new account can log in through the real UI.

Record what was actually observed (terminal output, screenshots) rather than asserting success without checking.

- [ ] **Step 4: Update the decision log**

In `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md`:
- Status line: add "D-33…D-36 decided and closed during W-F's brainstorming phase 2026-08-25" and move W-F from the workstream map's "not started" row to done, with the commit range.
- Add a `### D-33…D-36 — decided during W-F's brainstorming phase (2026-08-25)` section, mirroring the D-22…D-27 / D-28…D-32 sections already in the file, summarizing: D-33 (the `lib/search.ts` correction), D-34 (provisioning script shape), D-35 (boot-sequence change and its real test boundary), D-36 (the `authRoutes.test.js` update).
- §5: this workstream ran **with the owner present** (unlike W-G) — note the two decisions the owner made directly (consolidation approach, boot-failure mode) rather than folding them into "decided during brainstorming" as if unattended.
- Update the "Quality bar, concretely" paragraph to include the W-F plan and commit range.

- [ ] **Step 5: Commit the decision log update**

```bash
git add docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md
git commit -m "$(cat <<'EOF'
decision log: mark W-F done, record D-33..D-36

Ran with the owner present -- the org-consolidation approach and the
boot-failure mode (Task 1, Task 2) were the owner's calls, not decided
on their behalf the way W-G's D-28..D-32 were.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (owner's calls) → Task 1 & 2. §2/D-33 → Task 3 (search.ts explicitly left alone) & the design doc citation in Task 3's commit message. §3/D-34 → Task 4. §4/D-35 → Task 2. §5/D-36 → Task 4. §6 (files touched, WIP isolation) → each task's Step 1 where applicable (Task 2, 3, 5).
- **Placeholder scan:** none — every step has literal code, literal SQL, or literal verification commands.
- **Type consistency:** `checkSingleTenant()`'s return shape (`{ok, orgs, reason?}`) matches between the design doc, `orgGuard.js` (unchanged), Task 2's test, and Task 2's `index.js` usage (`result.ok`). `provision-user.js`'s CLI signature in Task 4 matches its description in the design doc §3 and its invocation in Task 6 Step 3.6.
