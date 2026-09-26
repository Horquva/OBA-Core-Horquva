/**
 * AI-6 — Change → Impact persistence: the scan, the baseline, and the reads.
 *
 * domain/changeImpact.js is the pure engine; this is the only file that talks
 * to the database on its behalf. Design, and every decision it follows:
 * docs/superpowers/specs/2026-09-21-ai-6-change-impact-persistence-design.md
 *
 * The Supabase client is passed IN, never required here — the same convention
 * as derived.loadRoots(supabase) — so the tests hand it an in-memory fake and
 * run offline.
 *
 * Two properties matter most, and both are tested:
 *
 *   Fail-closed (§6). The baseline only advances after every event has been
 *   written. If a write fails, the baseline stays put and the next scan finds
 *   the same changes again. Advancing it after a failed write would lose those
 *   changes for good, and history is the one thing AI-7 depends on. This
 *   deliberately differs from audit_log's fail-open: an audit write sits on a
 *   user's login; a scan sits on nobody's request.
 *
 *   Idempotent (§6). Every event carries a dedup_key derived from the change
 *   and the baseline it was detected against. If events are written but the
 *   baseline update then fails, the retry produces identical keys and the
 *   duplicates are ignored.
 */

const crypto = require('crypto')
const derived = require('../domain/derived')
const simulations = require('../domain/simulations')
const changeImpact = require('../domain/changeImpact')

const EVENTS = 'change_events'
const BASELINE = 'change_baseline'

const TARGET_TYPES = ['agent', 'employee', 'platform']
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

// ─── The baseline (§5) ───────────────────────────────────────────────────────

/**
 * The watched fields only — not a copy of the 21 root tables. These are
 * exactly the fields detectChanges() compares.
 */
function takeBaseline(roots) {
  return {
    agents: (roots.agents || []).map((a) => ({ id: a.id, owner_id: a.owner_id == null ? null : a.owner_id })),
    owners: (roots.owners || [])
      .filter((o) => o.employee_id != null)
      .map((o) => ({ employee_id: o.employee_id, backup_owner: o.backup_owner == null ? null : o.backup_owner })),
    tool_backups: (roots.tool_backups || []).map((b) => ({ primary_platform: b.primary_platform, backup_platform: b.backup_platform })),
    agent_platform: (roots.agent_platform || []).map((ap) => ({ agent_id: ap.agent_id, platform_id: ap.platform_id })),
    ai_platforms: (roots.ai_platforms || []).map((p) => ({ id: p.id, vendor: p.vendor == null ? null : p.vendor })),
  }
}

/**
 * The "before" roots: today's roots with the watched fields laid back to their
 * baseline values. Anything that changed but is NOT watched — a renamed
 * workflow, a new dependency — is identical on both sides, so it cannot leak
 * into a watched change's impact.
 *
 * Entities created since the baseline keep their current values (nothing to
 * roll back to) and so produce no change; entities deleted since cannot be
 * reconstructed and are skipped. Neither is one of the five tracked types.
 */
function overlayBaseline(roots, snapshot) {
  const prev = simulations.cloneRoots(roots)

  const ownerByAgent = new Map((snapshot.agents || []).map((a) => [a.id, a.owner_id]))
  for (const agent of prev.agents || []) {
    if (ownerByAgent.has(agent.id)) agent.owner_id = ownerByAgent.get(agent.id)
  }

  const backupByEmployee = new Map((snapshot.owners || []).map((o) => [o.employee_id, o.backup_owner]))
  for (const row of prev.owners || []) {
    if (backupByEmployee.has(row.employee_id)) row.backup_owner = backupByEmployee.get(row.employee_id)
  }

  // Link tables are captured whole, so they are restored whole.
  prev.tool_backups = (snapshot.tool_backups || []).map((b) => ({ ...b }))
  prev.agent_platform = (snapshot.agent_platform || []).map((ap) => ({ ...ap }))

  const vendorByPlatform = new Map((snapshot.ai_platforms || []).map((p) => [p.id, p.vendor]))
  for (const platform of prev.ai_platforms || []) {
    if (vendorByPlatform.has(platform.id)) platform.vendor = vendorByPlatform.get(platform.id)
  }

  return simulations.recount(prev)
}

async function readBaseline(supabase) {
  const { data, error } = await supabase.from(BASELINE).select('taken_at, snapshot').eq('id', 1).maybeSingle()
  if (error) throw new Error(`changeImpactStore: could not read the baseline — ${error.message}`)
  return data || null
}

async function writeBaseline(supabase, snapshot, takenAt) {
  const { error } = await supabase
    .from(BASELINE)
    .upsert({ id: 1, taken_at: takenAt, snapshot }, { onConflict: 'id' })
  if (error) throw new Error(`changeImpactStore: could not write the baseline — ${error.message}`)
}

// ─── Turning a diff into a row ───────────────────────────────────────────────

function targetOf(change) {
  switch (change.type) {
    case 'owner_changed':
    case 'model_swapped':
      return { type: 'agent', id: change.agentId }
    case 'backup_removed':
      return { type: 'employee', id: change.employeeId }
    case 'tool_backup_removed':
    case 'vendor_changed':
      return { type: 'platform', id: change.platformId }
    default:
      throw new Error(`changeImpactStore: no target for change type "${change.type}"`)
  }
}

/** Same change against the same baseline -> same key, so a retry cannot duplicate. */
function dedupKey(change, baselineTakenAt) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ baselineTakenAt, change }))
    .digest('hex')
}

/**
 * The stored row is the engine's output verbatim — no re-scoring, no rule
 * about what the change "means" (handout §7). Deliberately no actor, email,
 * endpoint, IP or user-agent field: who made a change is audit_log's job (§3).
 */
function toRow(diff, scanId, baselineTakenAt) {
  const target = targetOf(diff.change)
  return {
    scan_id: scanId,
    change_type: diff.change.type,
    target_type: target.type,
    target_id: String(target.id),
    change: diff.change,
    description: diff.description,
    priced: diff.priced,
    health_before: diff.health.before,
    health_after: diff.health.after,
    health_delta: diff.health.delta,
    impact: {
      note: diff.note,
      agents: diff.agents,
      people: diff.people,
      spofChanges: diff.spofChanges,
      downstream: diff.downstream,
    },
    dedup_key: dedupKey(diff.change, baselineTakenAt),
  }
}

// ─── The scan (§6) ───────────────────────────────────────────────────────────

/**
 * Detect every tracked change since the baseline, store each one's impact,
 * then advance the baseline — in that order, so a failure anywhere leaves the
 * baseline where it was.
 *
 * @param supabase   a Supabase client
 * @param options.loadRoots  injectable for tests; defaults to derived.loadRoots
 * @param options.now        injectable clock for tests
 * @param options.dryRun     detect and diff, write nothing
 */
async function scanForChanges(supabase, { loadRoots = derived.loadRoots, now = () => new Date(), dryRun = false } = {}) {
  const roots = await loadRoots(supabase)
  const baseline = await readBaseline(supabase)
  const takenAt = now().toISOString()

  // First run: nothing to compare against. History starts when tracking
  // starts; nothing earlier can be reconstructed.
  if (!baseline) {
    if (!dryRun) await writeBaseline(supabase, takeBaseline(roots), takenAt)
    return { firstScan: true, dryRun, scanId: null, previousBaselineAt: null, baselineTakenAt: takenAt, detected: 0, written: 0, events: [] }
  }

  const before = overlayBaseline(roots, baseline.snapshot)
  const diffs = changeImpact.diffSnapshots(before, roots)
  const scanId = crypto.randomUUID()
  const rows = diffs.map((diff) => toRow(diff, scanId, baseline.taken_at))

  if (!dryRun) {
    if (rows.length) {
      const { error } = await supabase.from(EVENTS).upsert(rows, { onConflict: 'dedup_key', ignoreDuplicates: true })
      if (error) {
        throw new Error(`changeImpactStore: could not write change events — ${error.message}. The baseline was not advanced, so the next scan will find these changes again.`)
      }
    }
    await writeBaseline(supabase, takeBaseline(roots), takenAt)
  }

  return {
    firstScan: false,
    dryRun,
    scanId: rows.length ? scanId : null,
    previousBaselineAt: baseline.taken_at,
    baselineTakenAt: dryRun ? baseline.taken_at : takenAt,
    detected: rows.length,
    written: dryRun ? 0 : rows.length,
    events: rows.map((r) => ({ changeType: r.change_type, description: r.description, priced: r.priced, healthDelta: r.health_delta })),
  }
}

// ─── Reading the history (§8) ────────────────────────────────────────────────

function badRequest(message) {
  const err = new Error(message)
  err.status = 400
  return err
}

function isoOrThrow(name, value) {
  const t = Date.parse(value)
  if (Number.isNaN(t)) throw badRequest(`"${name}" must be an ISO timestamp`)
  return new Date(t).toISOString()
}

/**
 * Validates every filter up front and throws a 400-shaped error on a bad one —
 * an invalid filter returns 400, not a silently empty list (same convention
 * as SEC-4's GET /api/audit-log).
 */
function parseFilters(query = {}) {
  const f = {}

  if (query.change_type !== undefined) {
    if (!changeImpact.CHANGE_TYPES.includes(query.change_type)) {
      throw badRequest(`"change_type" must be one of ${changeImpact.CHANGE_TYPES.join(', ')}`)
    }
    f.change_type = query.change_type
  }

  if (query.target_type !== undefined) {
    if (!TARGET_TYPES.includes(query.target_type)) throw badRequest(`"target_type" must be one of ${TARGET_TYPES.join(', ')}`)
    f.target_type = query.target_type
  }
  if (query.target_id !== undefined) {
    if (f.target_type === undefined) throw badRequest('"target_id" needs "target_type"')
    f.target_id = String(query.target_id)
  }

  if (query.priced !== undefined) {
    if (query.priced !== 'true' && query.priced !== 'false') throw badRequest('"priced" must be true or false')
    f.priced = query.priced === 'true'
  }

  if (query.from !== undefined) f.from = isoOrThrow('from', query.from)
  if (query.to !== undefined) f.to = isoOrThrow('to', query.to)

  f.limit = DEFAULT_LIMIT
  if (query.limit !== undefined) {
    const n = Number(query.limit)
    if (!Number.isInteger(n) || n < 1) throw badRequest('"limit" must be a positive integer')
    f.limit = Math.min(n, MAX_LIMIT)
  }

  if (query.before_id !== undefined) {
    const n = Number(query.before_id)
    if (!Number.isInteger(n) || n < 1) throw badRequest('"before_id" must be a positive integer')
    f.before_id = n
  }

  return f
}

async function listEvents(supabase, query) {
  const f = parseFilters(query)

  let q = supabase.from(EVENTS).select('*')
  if (f.change_type !== undefined) q = q.eq('change_type', f.change_type)
  if (f.target_type !== undefined) q = q.eq('target_type', f.target_type)
  if (f.target_id !== undefined) q = q.eq('target_id', f.target_id)
  if (f.priced !== undefined) q = q.eq('priced', f.priced)
  if (f.from !== undefined) q = q.gte('detected_at', f.from)
  if (f.to !== undefined) q = q.lte('detected_at', f.to)
  if (f.before_id !== undefined) q = q.lt('id', f.before_id)

  const { data, error } = await q.order('id', { ascending: false }).limit(f.limit)
  if (error) throw new Error(`changeImpactStore: could not read change events — ${error.message}`)

  const baseline = await readBaseline(supabase)
  const events = data || []
  return {
    events,
    next_before_id: events.length === f.limit ? events[events.length - 1].id : null,
    baseline_taken_at: baseline ? baseline.taken_at : null,
  }
}

module.exports = {
  scanForChanges,
  listEvents,
  parseFilters,
  // exported for tests
  takeBaseline,
  overlayBaseline,
  toRow,
  dedupKey,
  MAX_LIMIT,
}
