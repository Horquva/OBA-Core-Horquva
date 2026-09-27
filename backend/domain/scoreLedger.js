/**
 * SPEC 1 (Phase 2.3) — Score & Evidence Ledger.
 * ============================================================================
 *
 * Persists every changed agent risk score with the facts that justify it, so
 * an executive or auditor can inspect what the org's risk posture WAS at a
 * point in time and verify a stored score against its stored evidence.
 *
 * Contract (from the blueprint's Ironclad Evidence Rule):
 *   - writes are BEST-EFFORT: a persistence failure never fails the read
 *     path — scores are still computed live (Invariant 1);
 *   - rows are append-only; a DELTA GUARD keeps unchanged scores from
 *     flooding the ledger (a score is persisted only when its value or
 *     threat band differs from the agent's latest persisted row);
 *   - org scoping: runs inside a tenant context, org_id set explicitly.
 *
 * `evidence` on the score row is the exact O/D/S/U tuple Engine B consumed —
 * the CPT evaluated at that tuple reproduces the stored score. The linked
 * evidence_records ground each tuple variable in its real source rows
 * (owners / knowledge_assets / agents / dependencies), re-derived from the
 * same roots bundle the score was computed over.
 */

const supabaseRef = () => require('../supabase')

// The risk model identity persisted with every score. Bump when the CPT
// coefficients, evidence rules or bands change — a stored score is only
// replayable under the model version that produced it.
const RISK_MODEL_VERSION = 'bbn-cpt-v1'

/**
 * Row-level backing facts for one agent's O/D/S/U evidence. Same rules the
 * evidence extraction reads (riskEngine/index.js) — grounded in rows, capped
 * so a hub agent with hundreds of edges stays bounded.
 */
function buildEvidenceRefs(roots, agent) {
  const refs = []
  if (!agent) return refs

  // O — ownership
  if (agent.owner_id != null) {
    const ownerRow = (roots.owners || []).find((o) => o.employee_id === agent.owner_id)
    refs.push({
      fact: ownerRow
        ? `owner has ${ownerRow.backup_owner ? 'a' : 'NO'} recorded backup`
        : 'owner has no owners row (no backup recorded)',
      sourceTable: 'owners',
      sourceRowId: ownerRow ? String(ownerRow.id) : null,
    })
    refs.push({ fact: `owned by employee ${agent.owner_id}`, sourceTable: 'agents', sourceRowId: String(agent.id) })
  } else {
    refs.push({ fact: 'unowned — no owner_id recorded', sourceTable: 'agents', sourceRowId: String(agent.id) })
  }

  // D — documentation (the knowledge_assets rows the doc state was computed over)
  let docRows = 0
  for (const ka of roots.knowledge_assets || []) {
    if (ka.asset_type !== 'agent' || ka.asset_id !== agent.id) continue
    docRows++
    refs.push({
      fact: ka.is_documented ? 'knowledge asset documented' : 'knowledge asset undocumented',
      sourceTable: 'knowledge_assets',
      sourceRowId: String(ka.id),
    })
    if (refs.length >= 12) break
  }
  if (docRows === 0) {
    refs.push({ fact: 'no knowledge assets recorded — reads as undocumented', sourceTable: 'agents', sourceRowId: String(agent.id) })
  }

  // S — runtime state
  refs.push({ fact: `runtime status: ${agent.status ?? 'unknown'}`, sourceTable: 'agents', sourceRowId: String(agent.id) })

  // U — cascade exposure: the incoming dependency edges feeding the Engine A graph
  let incoming = 0
  for (const d of roots.dependencies || []) {
    if (d.target_type !== 'agent' || d.target_id !== agent.id) continue
    incoming++
    if (incoming > 5) {
      refs.push({ fact: '…additional incoming dependency edges (capped)', sourceTable: 'dependencies', sourceRowId: null })
      break
    }
    refs.push({
      fact: `incoming dependency: ${d.source_type} depends on this agent (${d.dependency_type})`,
      sourceTable: 'dependencies',
      sourceRowId: String(d.id),
    })
  }
  if (incoming === 0) {
    refs.push({ fact: 'no incoming dependency edges — cascade exposure is structural only', sourceTable: 'dependencies', sourceRowId: null })
  }

  return refs
}

/**
 * Persists changed agent scores + their evidence. Returns a summary; throws
 * only on database errors (the caller decides whether to swallow them — the
 * read path must never fail because of this).
 */
async function persistScoreRun(supabase, roots, predictiveRiskResult) {
  const { currentOrgId } = require('../lib/tenant')
  const orgId = currentOrgId()
  if (!orgId) return { skipped: 'no-org-context' }
  const scores = predictiveRiskResult?.scores || []
  if (!scores.length) return { persisted: 0, evidence: 0 }

  // Delta guard: latest persisted row per agent (most recent first scan).
  const { data: recent, error: recentErr } = await supabase
    .from('score_history')
    .select('entity_id, score, threat_level')
    .eq('entity_type', 'agent')
    .order('recorded_at', { ascending: false })
    .limit(500)
  if (recentErr) throw new Error(`score_history read: ${recentErr.message}`)

  const latestByEntity = new Map()
  for (const row of recent || []) {
    if (!latestByEntity.has(row.entity_id)) latestByEntity.set(row.entity_id, row)
  }

  const rows = []
  const refsByEntity = new Map()
  for (const s of scores) {
    const latest = latestByEntity.get(s.agentId)
    if (latest && Number(latest.score) === s.predictedScore && latest.threat_level === s.threatLevel) continue
    rows.push({
      org_id: orgId,
      entity_type: 'agent',
      entity_id: s.agentId,
      score: s.predictedScore,
      threat_level: s.threatLevel,
      model_version: RISK_MODEL_VERSION,
      evidence: s.evidence ?? null,
    })
    refsByEntity.set(s.agentId, s)
  }
  if (!rows.length) return { persisted: 0, evidence: 0, skipped: 'unchanged' }

  const inserted = await supabase.from('score_history').insert(rows).select('id, entity_id')
  if (inserted.error) throw new Error(`score_history insert: ${inserted.error.message}`)

  const evidenceRows = []
  for (const row of inserted.data || []) {
    const s = refsByEntity.get(row.entity_id)
    const agent = (roots.agents || []).find((a) => a.id === row.entity_id)
    for (const ref of buildEvidenceRefs(roots, agent)) {
      evidenceRows.push({
        org_id: orgId,
        score_history_id: row.id,
        fact: ref.fact,
        source_table: ref.sourceTable,
        source_row_id: ref.sourceRowId,
        weight: null,
      })
    }
  }
  if (evidenceRows.length) {
    const ev = await supabase.from('evidence_records').insert(evidenceRows)
    if (ev.error) throw new Error(`evidence_records insert: ${ev.error.message}`)
  }

  return { persisted: rows.length, evidence: evidenceRows.length }
}

/** Best-effort wrapper for the compute path — logs, never throws. */
function persistScoreRunBestEffort(supabase, roots, predictiveRiskResult) {
  return persistScoreRun(supabase, roots, predictiveRiskResult).catch((err) => {
    console.error('[scoreLedger] best-effort persist failed:', err.message)
    return { error: err.message }
  })
}

module.exports = {
  RISK_MODEL_VERSION,
  buildEvidenceRefs,
  persistScoreRun,
  persistScoreRunBestEffort,
}
