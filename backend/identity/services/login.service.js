/*
 * Login orchestration — ties authentication (Phase 5), MFA (Phase 7), and sessions
 * (Phase 6) into the full flow with NO bypass:
 *   login(password) → authenticated (tokens)  OR  mfa_required (challenge, no tokens)
 *   completeMfa(challenge, code) → authenticated (tokens)
 * Tokens are issued ONLY after every required factor is satisfied.
 */
const { withTransaction } = require('../db/pool')
const repos = require('../repositories')
const auth = require('./auth.service')
const session = require('./session.service')
const mfa = require('./mfa.service')
const { AuthenticationError } = require('../errors')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))

async function login(exec, { organizationId, email, password, context = {} }) {
  return inTx(exec, async (client) => {
    const res = await auth.authenticatePassword(client, { organizationId, email, password, context })

    if (res.status === 'authenticated') {
      const started = await session.start(client, { principalId: res.principalId, organizationId, kind: res.kind, ip: context.ip, userAgent: context.userAgent })
      return { status: 'authenticated', subject: res.subject, sessionId: started.session.id, accessToken: started.accessToken, refreshToken: started.refreshToken, tokenType: started.tokenType, expiresIn: started.expiresIn }
    }

    // MFA required → issue a pending challenge only (no tokens).
    const pending = await session.startPending(client, { principalId: res.principalId, organizationId })
    return { status: 'mfa_required', challengeId: pending.id }
  })
}

async function completeMfa(exec, { organizationId, challengeId, code, context = {} }) {
  return inTx(exec, async (client) => {
    const s = await repos.sessions.findById(client, challengeId, organizationId)
    if (!s || s.status !== 'pending_mfa' || new Date(s.expires_at) <= new Date()) {
      throw new AuthenticationError('invalid or expired MFA challenge')
    }
    const user = await repos.users.findByPrincipalId(client, s.principal_id, organizationId)
    if (!user) throw new AuthenticationError()

    const ok = await mfa.verifyForUser(client, { user, code })
    if (!ok) {
      await repos.audit.record(client, { organizationId, actorPrincipalId: s.principal_id, event: 'auth.mfa', resource: 'auth', action: 'mfa', decision: 'deny', reason: 'bad_code', ip: context.ip || null })
      throw new AuthenticationError('invalid MFA code')
    }

    const tokens = await session.activateAfterMfa(client, { session: s, kind: 'user' })
    await repos.audit.record(client, { organizationId, actorPrincipalId: s.principal_id, event: 'auth.mfa', resource: 'auth', action: 'mfa', decision: 'ok', ip: context.ip || null })
    return { status: 'authenticated', sessionId: s.id, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: tokens.tokenType, expiresIn: tokens.expiresIn }
  })
}

module.exports = { login, completeMfa }
