/*
 * F3 — provision an M2M service credential for a consumer platform (e.g. AI Security's
 * agent_identity_service). Creates a machine identity in the target organization,
 * activates it, and prints the clientId + clientSecret ONCE. The secret is stored only
 * as a scrypt hash and cannot be retrieved again — capture it now.
 *
 * Runs against whatever IDENTITY_DATABASE_URL points at (local or deployed), so it
 * completes step 5 of F3 without needing an admin bearer token.
 *
 * Usage:
 *   node identity/deploy/provision-ai-security-client.js [--name <name>] [--org <slug>] [--role <roleName>]
 * Defaults: name "agent_identity_service", org "horquva", no role (least privilege).
 */
const crypto = require('crypto')
const { pool } = require('../db/pool')
const repos = require('../repositories')
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const secrets = require('../services/secrets')

function arg(flag, def) {
  const i = process.argv.indexOf(flag)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def
}

async function main() {
  const name = arg('--name', 'agent_identity_service')
  const orgSlug = arg('--org', 'horquva')
  const roleName = arg('--role', null)

  const org = await repos.organizations.findBySlug(pool, orgSlug)
  if (!org) throw new Error(`organization "${orgSlug}" not found — seed it first (npm run identity:seed)`)

  const clientId = `mch_${crypto.randomBytes(8).toString('hex')}`
  const clientSecret = secrets.generateClientSecret()

  const machine = await svc.createMachine(pool, {
    organizationId: org.id,
    name,
    clientId,
    clientSecretHash: secrets.hash(clientSecret),
  })
  await life.transitionIdentity(pool, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })

  if (roleName) {
    await svc.assignRole(pool, { organizationId: org.id, principalId: machine.principal_id, roleName })
  }

  console.log('\n=== M2M service credential provisioned ===')
  console.log('  platform      :', name)
  console.log('  organization  :', orgSlug, `(${org.id})`)
  console.log('  machine id    :', machine.id)
  console.log('  role          :', roleName || '(none — grant explicitly per least privilege)')
  console.log('  CLIENT_ID     :', clientId)
  console.log('  CLIENT_SECRET :', clientSecret)
  console.log('\n  Store CLIENT_SECRET securely now — it is not retrievable again.')
  console.log('  The service authenticates via: POST /api/v1/auth/token { clientId, clientSecret }\n')

  await pool.end()
}

main().catch(async (err) => {
  console.error('provisioning failed:', err.message)
  try { await pool.end() } catch (_) {}
  process.exit(1)
})
