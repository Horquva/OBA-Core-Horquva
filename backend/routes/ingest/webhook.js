const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { parse: parseCsv } = require('csv-parse')
const { recordAudit } = require('../../lib/audit')
const { isUuid } = require('../../lib/uuid')

// Phase 4.3 — the generic ingestion receiver + CSV roster importer.
// ============================================================================
//
// POST /api/ingest/webhook/:source — Stage 1 of the blueprint's 4-stage
// pipeline. Verifies the sender's HMAC, stages the raw payload VERBATIM into
// raw_vendor_payloads, answers 202, then processes asynchronously (identity
// resolution via identity_bridge → mutations). The receiver NEVER translates
// inline: staging first is what makes replays and schema drift survivable.
//
// Signature schemes per source (fail closed when the source's secret is not
// configured):
//   github / slack — the vendor-native schemes:
//     github: x-hub-signature-256: sha256=HMAC_SHA256(rawBody, secret)
//     slack:  v0:ts:body over x-slack-request-timestamp, 5-minute replay window
//   everything else (zapier, n8n, agentforce, jira, hr_csv, generic) — the
//     Standard Webhooks convention (standardwebhooks.com):
//     webhook-signature: t=<ts>,v1=HMAC_SHA256(`<id>.<ts>.<body>`, secret)
//
// ORG BINDING: webhooks are machine calls — no user token. A deployment
// ingests into its PRIMARY org (PRIMARY_ORG_SLUG env, else the bootstrap
// slug) resolved once per request via lib/tenant. Per-org ingest secrets are
// the multi-org connector workstream.
//
// RATE LIMITING: per-source fixed-window counter, in-process — consistent
// with the deployment's single-instance posture (Gate 3 stays deferred);
// the counter exists to blunt accidental loops, not to stop adversaries.
//
// POST /api/ingest/roster/csv — the HR/Workday path (Blueprint §7): a CSV
// roster (name,email,role,department) staged and processed through the same
// identity bridge + mutation layer as webhooks.

const SOURCES = ['jira', 'slack', 'github', 'zapier', 'n8n', 'agentforce', 'hr_csv', 'generic']

const secretFor = (source) => {
  const envKey = `INGEST_SECRET_${source.toUpperCase()}`
  return process.env[envKey] || null
}

// ── per-source rate limiting (in-process fixed window) ──────────────────────
const RATE = { windowMs: 60_000, max: 120 }
const rateCounters = new Map() // source -> { windowStart, count }
function rateLimited(source) {
  const now = Date.now()
  const cur = rateCounters.get(source)
  if (!cur || now - cur.windowStart > RATE.windowMs) {
    rateCounters.set(source, { windowStart: now, count: 1 })
    return false
  }
  cur.count += 1
  return cur.count > RATE.max
}

// ── signature verification ───────────────────────────────────────────────────
function timingSafeEq(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function verifyGithub(rawBody, secret, header) {
  if (!header || !header.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEq(expected, header)
}

function verifySlack(rawBody, secret, headers) {
  const ts = headers['x-slack-request-timestamp']
  const sig = headers['x-slack-signature']
  if (!ts || !sig) return false
  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(age) || age > 300) return false // 5-minute replay window
  const expected = 'v0=' + crypto.createHmac('sha256', secret).update(`v0:${ts}:${rawBody}`).digest('hex')
  return timingSafeEq(expected, sig)
}

function verifyStandardWebhook(rawBody, secret, headers) {
  const sigHeader = headers['webhook-signature']
  const ts = headers['webhook-timestamp']
  const id = headers['webhook-id']
  if (!sigHeader || !ts || !id) return false
  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(age) || age > 300) return false
  const signedContent = `${id}.${ts}.${rawBody}`
  // header may carry multiple comma/space-separated v1 signatures
  const candidates = sigHeader.split(',').map((p) => p.trim()).filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  if (!candidates.length) return false
  const expected = crypto.createHmac('sha256', secret).update(signedContent).digest('hex')
  return candidates.some((c) => timingSafeEq(expected, c))
}

function verify(source, rawBody, headers) {
  const secret = secretFor(source)
  if (!secret) return { ok: false, reason: `ingest source '${source}' is not configured (missing ${`INGEST_SECRET_${source.toUpperCase()}`})`, status: 503 }
  if (source === 'github') return { ok: verifyGithub(rawBody, secret, headers['x-hub-signature-256']) }
  if (source === 'slack') return { ok: verifySlack(rawBody, secret, headers) }
  return { ok: verifyStandardWebhook(rawBody, secret, headers) }
}

// ── primary-org binding ──────────────────────────────────────────────────────
async function resolveIngestOrg() {
  const tenant = require('../../lib/tenant')
  const supabase = require('../../supabase')
  const slug = process.env.PRIMARY_ORG_SLUG || tenant.BOOTSTRAP_ORG_SLUG
  const { mode, orgId } = await tenant.resolveOrgId(supabase, slug)
  if (mode === 'resolved' && orgId) return orgId
  return null
}

// ── staging + async processing ───────────────────────────────────────────────
async function stage(orgId, source, rawBody, externalEventId) {
  const supabase = require('../../supabase')
  let payload = null
  try {
    payload = JSON.parse(rawBody)
  } catch (_) {
    payload = { raw: String(rawBody).slice(0, 100_000) }
  }
  const { data, error } = await supabase
    .from('raw_vendor_payloads')
    .insert({ org_id: orgId, source, external_event_id: externalEventId || null, payload, status: 'pending' })
    .select('id')
    .maybeSingle()
  if (error) throw new Error(`staging insert failed: ${error.message}`)
  return data.id
}

/** Identity resolution — the exact path (email / SSO subject) runs inline in
 *  JS. The probabilistic path (Fellegi–Sunter via the Splink sidecar) is the
 *  offline matcher; below its confidence floor nothing auto-links. */
async function resolveEmployeeId(orgId, externalSystem, externalUserId, email) {
  const supabase = require('../../supabase')
  // 1. exact email match against the employee directory (the anchor column
  //    added in sql/24); case-insensitive, full-match
  if (email) {
    const { data: byEmail } = await supabase
      .from('employees').select('id').eq('org_id', orgId).ilike('email', email).maybeSingle()
    if (byEmail?.id) {
      await upsertBridge(orgId, externalSystem, externalUserId, byEmail.id, email, 'exact_email', 1.0)
      return byEmail.id
    }
  }
  // 2. an existing bridge entry (set earlier by the probabilistic matcher or
  //    a manual confirmation)
  const { data: bridged } = await supabase
    .from('identity_bridge').select('employee_id').eq('org_id', orgId)
    .eq('external_system', externalSystem).eq('external_user_id', externalUserId).maybeSingle()
  if (bridged?.employee_id) return bridged.employee_id
  return null
}

async function upsertBridge(orgId, externalSystem, externalUserId, employeeId, email, method, confidence) {
  const supabase = require('../../supabase')
  await supabase.from('identity_bridge').upsert(
    { org_id: orgId, external_system: externalSystem, external_user_id: externalUserId, employee_id: employeeId, verified_email: email || null, match_method: method, match_confidence: confidence },
    { onConflict: 'org_id,external_system,external_user_id' },
  )
}

/** Async processor: translates a staged row into mutations. v1 translates the
 *  roster path (hr_csv employee records); connector-specific primitives keep
 *  their staged 'pending' status for their adapters (next engagement) — the
 *  receiver is deliberately conservative about inventing graph facts. */
async function processStaged(stagingId) {
  const supabase = require('../../supabase')
  try {
    const { data: row, error } = await supabase.from('raw_vendor_payloads').select('*').eq('id', stagingId).maybeSingle()
    if (error || !row) throw new Error(error ? error.message : 'staged row vanished')
    if (row.status !== 'pending') return

    const orgId = row.org_id
    let translated = 0
    let note = 'no translator for this source yet — staged for its adapter'

    const people = row.payload?.people || row.payload?.roster || null
    if (Array.isArray(people)) {
      // processStaged runs from setImmediate — OUTSIDE any request's tenant
      // context. The mutation layer refuses unscoped writes, so the batch
      // runs inside the staged row's own org context explicitly.
      const tenant = require('../../lib/tenant')
      await tenant.runAsOrg(orgId, async () => {
        for (const person of people) {
          if (!person || !person.name) continue
          const employeeId = await resolveEmployeeId(orgId, row.source, person.external_id || person.email || person.name, person.email || null)
          const idempotencyKey = `${stagingId}:${person.email || person.external_id || person.name}`
          if (employeeId) {
            await require('../../domain').mutations.applyMutation({
              mutationType: 'EMPLOYEE_UPDATED',
              targetType: 'employee',
              targetId: employeeId,
              payload: { patch: { name: person.name, role: person.role ?? null, department: person.department ?? null } },
              actorId: `ingest:${row.source}`,
              idempotencyKey,
            })
          } else {
            await require('../../domain').mutations.applyMutation({
              mutationType: 'EMPLOYEE_CREATED',
              targetType: 'employee',
              targetId: null,
              payload: { row: { name: person.name, role: person.role ?? null, department: person.department ?? null } },
              actorId: `ingest:${row.source}`,
              idempotencyKey,
            })
          }
          translated++
        }
      })
      note = `translated ${translated} roster record(s) through the mutation layer`
    }

    await supabase.from('raw_vendor_payloads')
      .update({ status: 'processed', processed_at: new Date().toISOString(), error_message: translated === 0 ? note : null })
      .eq('id', stagingId)
  } catch (err) {
    const supabase = require('../../supabase')
    await supabase.from('raw_vendor_payloads')
      .update({ status: 'failed', processed_at: new Date().toISOString(), error_message: String(err.message).slice(0, 500) })
      .eq('id', stagingId)
  }
}

// ── routes ───────────────────────────────────────────────────────────────────
router.post('/webhook/:source', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const source = req.params.source
  if (!SOURCES.includes(source)) return res.status(404).json({ error: `Unknown ingest source '${source}'` })
  if (rateLimited(source)) return res.status(429).json({ error: 'Rate limit exceeded for this source' })

  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body || '')
  const verdict = verify(source, rawBody, req.headers)
  if (!verdict.ok) {
    await recordAudit(req, { action: 'ingest.webhook', outcome: 'failure', reason: verdict.reason || 'signature_verification_failed', targetType: 'ingest', targetId: source })
    return res.status(verdict.status || 401).json({ error: verdict.reason || 'Signature verification failed' })
  }

  try {
    const orgId = await resolveIngestOrg()
    if (!orgId) return res.status(503).json({ error: 'Ingest org could not be resolved — is migration 20 applied?' })
    const stagingId = await stage(orgId, source, rawBody, req.headers['x-github-delivery'] || req.headers['webhook-id'] || null)
    await recordAudit(req, { action: 'ingest.webhook', outcome: 'success', targetType: 'ingest', targetId: source })
    // 202: staged, not yet translated. Processing is async and idempotent
    // per record (status transitions guard re-entry).
    setImmediate(() => { processStaged(stagingId) })
    res.status(202).json({ ok: true, stagingId, status: 'staged' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── CSV roster importer (HR/Workday path) ───────────────────────────────────
router.post('/roster/csv', express.text({ type: '*/*', limit: '2mb' }), async (req, res) => {
  try {
    const orgId = await resolveIngestOrg()
    if (!orgId) return res.status(503).json({ error: 'Ingest org could not be resolved — is migration 20 applied?' })
    const csv = typeof req.body === 'string' ? req.body : String(req.body || '')
    if (!csv.trim()) return res.status(400).json({ error: 'CSV body is required' })

    const records = await new Promise((resolve, reject) => {
      parseCsv(csv, { columns: (h) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true }, (err, out) => {
        if (err) reject(err)
        else resolve(out)
      })
    })
    if (!Array.isArray(records) || !records.length) return res.status(400).json({ error: 'No CSV rows parsed' })

    const people = records
      .filter((r) => r.name || r.full_name)
      .map((r) => ({
        name: r.name || r.full_name,
        email: r.email || null,
        role: r.role || r.title || null,
        department: r.department || r.dept || null,
        external_id: r.email || r.employee_id || r.name,
      }))
    if (!people.length) return res.status(400).json({ error: 'No rows with a name column found (expected: name,email,role,department)' })

    const stagingId = await stage(orgId, 'hr_csv', JSON.stringify({ people, importedAt: new Date().toISOString() }), null)
    setImmediate(() => { processStaged(stagingId) })
    res.status(202).json({ ok: true, stagingId, people: people.length, status: 'staged' })
  } catch (err) {
    res.status(400).json({ error: `CSV parse failed: ${err.message}` })
  }
})

module.exports = router
