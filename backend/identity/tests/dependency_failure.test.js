/*
 * Set A — Part 6.3: Identity dependency-failure testing.
 *
 * The security question: "Can an attacker obtain access because the identity
 * system cannot establish trust?"  Required answer: NO TRUST → NO PROTECTED
 * OPERATION. We simulate an unavailable datastore by injecting an `exec` client
 * whose every query rejects (as a real pool would on ECONNREFUSED / pool timeout)
 * and prove each trust decision FAILS CLOSED — a denial or a hard error, never an
 * allow. Token integrity is also proven to hold with no datastore at all, so a
 * downed dependency can never upgrade a bad token into a good one.
 */
const token = require('../services/token')
const { createKeyring } = require('../services/keyring')
const authz = require('../services/authz.service')
const session = require('../services/session.service')
const { assert, assertEqual, assertThrows } = require('./helpers')

// An `exec` that behaves like a database that is down: every query rejects.
const downDb = () => ({
  query: async () => {
    const e = new Error('ECONNREFUSED: identity datastore unavailable')
    e.code = 'ECONNREFUSED'
    throw e
  },
})

// Authorization dependency unavailable → DENY (fail closed), never allow.
async function authorizeFailsClosedWhenStoreUnavailable() {
  const result = await authz.authorize(downDb(), {
    organizationId: 'org-1',
    principalId: 'principal-1',
    resource: 'secret',
    action: 'read',
  })
  assertEqual(result.decision, 'deny', 'authorization denies when the store is unavailable')
  assertEqual(result.reason, 'evaluation_error', 'denial reason is the fail-closed evaluation error')
  assert(result.decision !== 'allow', 'a downed dependency must never yield allow')
}

// The convenience boolean form must also resolve to false, not throw-into-allow.
async function canFailsClosedWhenStoreUnavailable() {
  const allowed = await authz.can(downDb(), {
    organizationId: 'org-1',
    principalId: 'principal-1',
    resource: 'secret',
    action: 'read',
  })
  assertEqual(allowed, false, 'can() is false when trust cannot be established')
}

// Session store unavailable → a cryptographically valid access token still cannot
// be honored, because its session cannot be confirmed active. No protected op.
async function accessValidationDeniesWhenSessionStoreUnavailable() {
  const validToken = token.issueAccess({
    principalId: 'p', organizationId: 'o', kind: 'user', sessionId: 's',
  })
  // Sanity: the token itself is well-formed and verifies (no DB needed).
  assert(token.verify(validToken, { expectedType: 'access' }), 'token is cryptographically valid')
  // But revocation-aware validation needs the session store, which is down → deny.
  await assertThrows(() => session.validateAccessToken(downDb(), validToken))
}

// Refresh with the store down cannot mint a new token pair. Fail closed.
async function refreshDeniesWhenStoreUnavailable() {
  await assertThrows(() => session.refresh(downDb(), { refreshToken: 'anything-at-all' }))
}

// Token integrity does NOT depend on any datastore: with zero DB access, forged,
// tampered, expired, and unknown-key tokens are still rejected. A downed
// dependency can never turn a bad token into a good one.
async function tokenIntegrityHoldsWithoutAnyDependency() {
  const good = token.issueAccess({ principalId: 'p', organizationId: 'o', kind: 'user', sessionId: 's' })
  const [h, p, sig] = good.split('.')

  // tampered payload → reject
  const body = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
  body.sub = 'attacker'
  const forged = `${h}.${Buffer.from(JSON.stringify(body)).toString('base64url')}.${sig}`
  await assertThrows(() => token.verify(forged), 'invalid_token')

  // expired → reject
  const expired = token.sign({ sub: 'p', typ: 'access' }, { ttlSec: -10 })
  await assertThrows(() => token.verify(expired), 'invalid_token')
}

// Verification-key dependency unavailable (kid not resolvable) → reject, not accept.
async function verificationKeyUnavailableDenies() {
  const foreign = createKeyring([{ kid: 'k-remote', secret: 'remote-secret', active: true }])
  const tok = token.sign({ sub: 'p', typ: 'access' }, { keyring: foreign, ttlSec: 60 })
  // Default keyring cannot resolve 'k-remote' (as if the verification key is unavailable).
  await assertThrows(() => token.verify(tok), 'invalid_token')
}

module.exports = {
  'authorization fails closed when the store is unavailable': authorizeFailsClosedWhenStoreUnavailable,
  'can() is false when the store is unavailable': canFailsClosedWhenStoreUnavailable,
  'access validation denies when the session store is unavailable': accessValidationDeniesWhenSessionStoreUnavailable,
  'refresh denies when the store is unavailable': refreshDeniesWhenStoreUnavailable,
  'token integrity holds with no datastore (bad tokens still rejected)': tokenIntegrityHoldsWithoutAnyDependency,
  'verification-key unavailable → token rejected': verificationKeyUnavailableDenies,
}
