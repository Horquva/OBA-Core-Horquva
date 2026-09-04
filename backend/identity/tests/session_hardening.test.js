/*
 * Set A — Part 2.3/2.4 hardening: signing-key rotation lifecycle and the
 * concurrent-session cap. These make two previously-untested guarantees explicit:
 *   - a RETIRED key cannot silently remain trusted once removed from the keyring;
 *   - the concurrent-session cap (IDENTITY_MAX_CONCURRENT_SESSIONS) actually
 *     evicts the oldest sessions instead of merely existing as dormant config.
 */
const config = require('../config')
const token = require('../services/token')
const { createKeyring } = require('../services/keyring')
const session = require('../services/session.service')
const svc = require('../services/identity.service')
const password = require('../services/password')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const headerOf = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url').toString('utf8'))
const activeUser = (c, orgId, email) =>
  svc.createUser(c, { organizationId: orgId, email, passwordHash: password.hash('Secret_123'), status: 'active' })

// ── Part 2.3: Active Key → New Key → Rotation → Verify-compat → Old-Key Retirement ──
async function keyRotationLifecycle() {
  // Phase 1: only k1 is active. Tokens issued now are signed under k1.
  const k1Only = createKeyring([{ kid: 'k1', secret: 'secret-k1', active: true }])
  const tokenA = token.issueAccess(
    { principalId: 'p', organizationId: 'o', kind: 'user', sessionId: 's' },
    { keyring: k1Only }
  )
  assertEqual(headerOf(tokenA).kid, 'k1', 'tokenA signed under active k1')
  assert(token.verify(tokenA, { keyring: k1Only }), 'k1 token verifies while k1 active')

  // Phase 2: rotate. k2 becomes active; k1 is retained (retired) for verification.
  const rotated = createKeyring([
    { kid: 'k2', secret: 'secret-k2', active: true },
    { kid: 'k1', secret: 'secret-k1', active: false },
  ])
  const tokenB = token.issueAccess(
    { principalId: 'p', organizationId: 'o', kind: 'user', sessionId: 's' },
    { keyring: rotated }
  )
  assertEqual(headerOf(tokenB).kid, 'k2', 'new tokens sign under the new active key')
  assert(token.verify(tokenB, { keyring: rotated }), 'k2 token verifies')
  // Verification compatibility: tokens issued before rotation still verify.
  assert(token.verify(tokenA, { keyring: rotated }), 'pre-rotation k1 token still verifies during overlap')

  // Phase 3: retire k1 fully. Its tokens must NOT silently remain trusted.
  const k2Only = createKeyring([{ kid: 'k2', secret: 'secret-k2', active: true }])
  await assertThrows(() => token.verify(tokenA, { keyring: k2Only }), 'invalid_token')
  assert(token.verify(tokenB, { keyring: k2Only }), 'k2 token still valid after k1 retirement')
}

// A key whose secret was rotated (compromise) must reject tokens minted under the old secret.
async function compromisedKeyCannotBeReused() {
  const original = createKeyring([{ kid: 'k1', secret: 'old-compromised', active: true }])
  const stolenTok = token.sign({ sub: 'attacker', typ: 'access' }, { keyring: original, ttlSec: 60 })
  // Operator rotates the secret behind the SAME kid after a compromise.
  const rekeyed = createKeyring([{ kid: 'k1', secret: 'new-strong-secret', active: true }])
  await assertThrows(() => token.verify(stolenTok, { keyring: rekeyed }), 'invalid_token')
}

// ── Part 2.4: concurrent-session cap evicts the oldest beyond the limit ──
async function concurrentSessionCapEvictsOldest() {
  const original = config.session.maxConcurrent
  config.session.maxConcurrent = 2
  try {
    await withRollback(async (c) => {
      const u = Date.now()
      const org = await svc.createOrganization(c, { name: 'O', slug: `cap-${u}` })
      const user = await activeUser(c, org.id, `cap-${u}@o.io`)
      const started = []
      for (let i = 0; i < 4; i++) {
        started.push(await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' }))
      }
      const active = await repos.sessions.listActiveForPrincipal(c, user.principal_id, org.id)
      assertEqual(active.length, 2, 'active sessions capped at the configured limit')
      const all = await repos.sessions.listForPrincipal(c, user.principal_id, org.id)
      assertEqual(all.length, 4, 'all four sessions exist')
      assertEqual(all.filter((s) => s.status === 'revoked').length, 2, 'two oldest sessions were revoked')
    })
  } finally {
    config.session.maxConcurrent = original
  }
}

// With the cap disabled (default 0), sessions are unlimited — no accidental eviction.
async function unlimitedWhenCapDisabled() {
  const original = config.session.maxConcurrent
  config.session.maxConcurrent = 0
  try {
    await withRollback(async (c) => {
      const u = Date.now()
      const org = await svc.createOrganization(c, { name: 'O', slug: `nocap-${u}` })
      const user = await activeUser(c, org.id, `nocap-${u}@o.io`)
      for (let i = 0; i < 3; i++) {
        await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })
      }
      const active = await repos.sessions.listActiveForPrincipal(c, user.principal_id, org.id)
      assertEqual(active.length, 3, 'no eviction when the cap is disabled')
    })
  } finally {
    config.session.maxConcurrent = original
  }
}

module.exports = {
  'key rotation lifecycle: retired key cannot silently remain trusted': keyRotationLifecycle,
  'compromised key: token under the old secret is rejected after re-key': compromisedKeyCannotBeReused,
  'concurrent-session cap evicts the oldest beyond the limit': concurrentSessionCapEvictsOldest,
  'sessions unlimited when the cap is disabled': unlimitedWhenCapDisabled,
}
