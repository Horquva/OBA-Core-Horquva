/*
 * F3 — post-deploy verification. Smoke-tests a deployed identity service over HTTP:
 * readiness, JWKS, a full login, and an authorization check. Exits non-zero on any
 * failure so it can gate a deploy pipeline.
 *
 * Usage:
 *   BASE_URL=https://identity.staging.internal/api/v1 \
 *   ADMIN_EMAIL=admin@horquva.io ADMIN_PASSWORD=... ADMIN_ORG=horquva \
 *   node identity/deploy/verify-deployment.js
 */
const BASE = (process.env.BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL || 'admin@horquva.io'
const PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe_Admin123'
const ORG = process.env.ADMIN_ORG || 'horquva'

let failures = 0
const ok = (name, cond, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}
const j = async (res) => { try { return await res.json() } catch (_) { return null } }

async function main() {
  console.log(`Verifying identity deployment at ${BASE}\n`)

  const ready = await fetch(`${BASE}/health/ready`).then(j).catch(() => null)
  ok('readiness (DB reachable)', ready && ready.status === 'ready' && ready.database === true, JSON.stringify(ready))

  const jwks = await fetch(`${BASE}/.well-known/jwks.json`).then(j).catch(() => null)
  ok('JWKS endpoint serves', jwks && Array.isArray(jwks.keys), `${jwks ? jwks.keys.length : '?'} key(s) [empty is expected under HS256]`)

  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orgSlug: ORG, email: EMAIL, password: PASSWORD }),
  }).then(j).catch(() => null)
  const token = login && login.accessToken
  ok('admin login issues tokens', !!token, login && login.status)

  if (token) {
    const me = await fetch(`${BASE}/auth/me`, { headers: { authorization: `Bearer ${token}` } }).then(j)
    ok('GET /auth/me resolves identity', me && me.kind && Array.isArray(me.permissions), me && `${me.kind}/${me.permissions.length} perms`)

    const check = await fetch(`${BASE}/authz/check`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ resource: 'org', action: 'create' }),
    }).then(j)
    ok('POST /authz/check returns a decision', check && ['allow', 'deny'].includes(check.decision), check && check.decision)

    const forged = await fetch(`${BASE}/auth/me`, { headers: { authorization: 'Bearer forged.token.here' } })
    ok('forged token rejected (401)', forged.status === 401, `status ${forged.status}`)
  }

  console.log(`\n${failures ? `FAILED — ${failures} check(s) failed` : 'All deployment checks passed.'}`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => { console.error('verification error:', e.message); process.exit(1) })
