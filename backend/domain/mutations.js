/**
 * FEATURE 3 (Phase 3.1) — The mutation layer: the ONE write path.
 * ============================================================================
 *
 * Every state change to the organizational graph — from the owner PATCH to
 * the Phase 4 CRUD routes and future connector adapters — goes through
 * applyMutation(). That is what makes Feature 3 possible without graph-diff
 * inference: because the layer sees every mutation, it can RECORD them
 * directly (event capture at the source, not snapshot diffing), compute the
 * cascade/health impact, and guarantee idempotent retries.
 *
 * Flow: validate → idempotency replay check → load scoped roots (before) →
 * apply the write → reload roots (after) → changeImpact (seeded Engine A
 * walk on the MUTATED topology + ΔOHI + deterministic mitigation) → append
 * dependency_change_log (unique on (org_id, idempotency_key)) → invalidate
 * the derived memo + schedule a background graph reload → audit.
 *
 * Writes REQUIRE a tenant context — unlike reads (which degrade to unscoped
 * for offline tests/jobs), a write with no org would silently land in the
 * bootstrap org. Fail closed.
 */

const supabaseRef = () => require('../supabase')

const MUTATION_TYPES = [
  'OWNER_ASSIGNED', 'OWNER_REMOVED',
  'BACKUP_ASSIGNED', 'BACKUP_LOST',
  'STATUS_CHANGED', 'MODEL_SWAPPED',
  'DEPENDENCY_ADDED', 'DEPENDENCY_BROKEN',
  'ENTITY_CREATED', 'ENTITY_DELETED',
]

const TARGET_TABLES = { agent: 'agents', workflow: 'workflows', platform: 'ai_platforms', employee: 'employees' }
const VALID_STATUSES = new Set(['active', 'inactive', 'failed'])

class MutationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

async function loadRootsOnce() {
  const derived = require('./derived')
  return derived.loadRoots(supabaseRef())
}

async function fetchRow(table, id) {
  const { data, error } = await supabaseRef().from(table).select('*').eq('id', id).maybeSingle()
  if (error) throw new MutationError(`${table} read failed: ${error.message}`, 500)
  return data
}

/** Applies one mutation's write to its table. Returns nothing; throws
 *  MutationError on invalid input. */
async function applyWrite(mutation, beforeRow) {
  const supabase = supabaseRef()
  const { mutationType, targetType, targetId, payload = {} } = mutation

  switch (mutationType) {
    case 'OWNER_ASSIGNED':
    case 'OWNER_REMOVED': {
      if (targetType !== 'agent') throw new MutationError('OWNER_* mutations target agents')
      const ownerId = mutationType === 'OWNER_REMOVED' ? null : payload.ownerId
      if (ownerId == null && mutationType === 'OWNER_ASSIGNED') throw new MutationError('OWNER_ASSIGNED requires payload.ownerId')
      const { error } = await supabase.from('agents').update({ owner_id: ownerId }).eq('id', targetId)
      if (error) {
        // Postgres FK violation (agents.owner_id -> employees.id): a bad
        // owner id is a client error, not a server fault.
        if (error.code === '23503') throw new MutationError(`No employee with id ${ownerId}`, 400)
        throw new MutationError(`agents update failed: ${error.message}`, 500)
      }
      return
    }
    case 'STATUS_CHANGED': {
      const table = TARGET_TABLES[targetType]
      if (!table) throw new MutationError('STATUS_CHANGED targets agents, workflows or platforms')
      if (!VALID_STATUSES.has(payload.status)) throw new MutationError(`payload.status must be one of ${[...VALID_STATUSES].join(', ')}`)
      const { error } = await supabase.from(table).update({ status: payload.status }).eq('id', targetId)
      if (error) throw new MutationError(`${table} update failed: ${error.message}`, 500)
      return
    }
    case 'BACKUP_ASSIGNED':
    case 'BACKUP_LOST': {
      if (targetType !== 'employee') throw new MutationError('BACKUP_* mutations target employees')
      const backupOwner = mutationType === 'BACKUP_LOST' ? null : payload.backupOwner
      if (mutationType === 'BACKUP_ASSIGNED' && !backupOwner) throw new MutationError('BACKUP_ASSIGNED requires payload.backupOwner (the backup owner name)')
      // owners is the person-level backup registry keyed by employee_id.
      const existing = (await loadRootsOnce()).owners.find((o) => o.employee_id === targetId)
      const patch = { backup_owner: backupOwner }
      if (existing) {
        const { error } = await supabase.from('owners').update(patch).eq('id', existing.id)
        if (error) throw new MutationError(`owners update failed: ${error.message}`, 500)
      } else {
        const { error } = await supabase.from('owners').insert({
          name: payload.employeeName || `employee:${targetId}`,
          employee_id: targetId,
          ...patch,
        })
        if (error) throw new MutationError(`owners insert failed: ${error.message}`, 500)
      }
      return
    }
    case 'MODEL_SWAPPED': {
      if (targetType !== 'agent') throw new MutationError('MODEL_SWAPPED targets agents')
      if (!payload.platformId) throw new MutationError('MODEL_SWAPPED requires payload.platformId')
      await supabase.from('agent_platform').delete().eq('agent_id', targetId)
      const { error } = await supabase.from('agent_platform').insert({ agent_id: targetId, platform_id: payload.platformId })
      if (error) throw new MutationError(`agent_platform insert failed: ${error.message}`, 500)
      return
    }
    case 'DEPENDENCY_ADDED': {
      const edge = payload.edge
      if (!edge || !edge.sourceType || !edge.sourceId || !edge.targetType || !edge.targetId) {
        throw new MutationError('DEPENDENCY_ADDED requires payload.edge {sourceType, sourceId, targetType, targetId, dependencyType?, strength?}')
      }
      const { error } = await supabase.from('dependencies').insert({
        source_type: edge.sourceType,
        source_id: edge.sourceId,
        target_type: edge.targetType,
        target_id: edge.targetId,
        dependency_type: edge.dependencyType || 'normal',
        strength: edge.strength ?? null,
      })
      if (error) throw new MutationError(`dependencies insert failed: ${error.message}`, 500)
      return
    }
    case 'DEPENDENCY_BROKEN': {
      if (!payload.edgeId) throw new MutationError('DEPENDENCY_BROKEN requires payload.edgeId')
      const { error } = await supabase.from('dependencies').delete().eq('id', payload.edgeId)
      if (error) throw new MutationError(`dependencies delete failed: ${error.message}`, 500)
      return
    }
    case 'ENTITY_CREATED': {
      const table = TARGET_TABLES[targetType]
      if (!table || targetType === 'employee') throw new MutationError('ENTITY_CREATED targets agents, workflows or platforms')
      if (!payload.row || typeof payload.row !== 'object') throw new MutationError('ENTITY_CREATED requires payload.row')
      const { error } = await supabase.from(table).insert(payload.row)
      if (error) throw new MutationError(`${table} insert failed: ${error.message}`, 500)
      return
    }
    case 'ENTITY_DELETED': {
      const table = TARGET_TABLES[targetType]
      if (!table || targetType === 'employee') throw new MutationError('ENTITY_DELETED targets agents, workflows or platforms (employees soft-exit via simulations)')
      await supabase.from('dependencies').delete().or(`source_id.eq.${targetId},target_id.eq.${targetId}`)
      const { error } = await supabase.from(table).delete().eq('id', targetId)
      if (error) throw new MutationError(`${table} delete failed: ${error.message}`, 500)
      return
    }
    default:
      throw new MutationError(`Unknown mutation type: ${mutationType}`)
  }
}

/**
 * Applies one mutation end-to-end.
 *
 * @returns {{ replayed: boolean, change: object|null, impact: object|null }}
 */
async function applyMutation({ mutationType, targetType, targetId, payload = {}, actorId = null, idempotencyKey = null }) {
  const supabase = supabaseRef()
  const { applyOrgScope, currentOrgId } = require('../lib/tenant')
  const orgId = currentOrgId()
  if (!orgId) throw new MutationError('Writes require a tenant context (org resolution failed)', 503)

  if (!MUTATION_TYPES.includes(mutationType)) {
    throw new MutationError(`mutationType must be one of: ${MUTATION_TYPES.join(', ')}`)
  }

  // Idempotent replay: a retried request returns the recorded mutation.
  if (idempotencyKey) {
    const { data: existing } = await applyOrgScope(
      supabase.from('dependency_change_log').select('*')
    ).eq('idempotency_key', idempotencyKey).maybeSingle()
    if (existing) return { replayed: true, change: existing, impact: null }
  }

  const table = TARGET_TABLES[targetType]
  const beforeRow = targetId && table ? await fetchRow(table, targetId) : null
  if (targetId && table && !beforeRow && mutationType !== 'ENTITY_CREATED' && mutationType !== 'DEPENDENCY_ADDED') {
    throw new MutationError(`No ${targetType} with id ${targetId}`, 404)
  }

  const beforeRoots = await loadRootsOnce()

  await applyWrite({ mutationType, targetType, targetId, payload }, beforeRow)

  const afterRoots = await loadRootsOnce()
  const afterRow = targetId && table ? await fetchRow(table, targetId) : null

  const impact = require('./changeImpact').changeImpact(beforeRoots, afterRoots, {
    mutationType, targetType, targetId, payload,
  })

  const changeRow = {
    org_id: orgId,
    idempotency_key: idempotencyKey,
    mutation_type: mutationType,
    target_type: targetType,
    target_id: targetId || null,
    actor_id: actorId,
    before: beforeRow || null,
    after: afterRow || payload.row || payload.edge || null,
    blast_radius_score: impact.blastRadiusScore,
    health_delta: impact.healthDelta,
    impacted_entities: impact.impactedEntities,
    mitigation: impact.mitigation,
  }
  const inserted = await supabase.from('dependency_change_log').insert(changeRow).select('*').maybeSingle()
  if (inserted.error) {
    // Unique (org_id, idempotency_key) violation → a concurrent retry won the
    // race; return its recorded mutation (23505).
    if (inserted.error.code === '23505' && idempotencyKey) {
      const { data: winner } = await applyOrgScope(
        supabase.from('dependency_change_log').select('*')
      ).eq('idempotency_key', idempotencyKey).maybeSingle()
      return { replayed: true, change: winner || null, impact: null }
    }
    throw new MutationError(`change log insert failed: ${inserted.error.message}`, 500)
  }

  // The graph and every derived product just changed.
  require('./derived').invalidate()
  require('../brain').scheduleReload()

  return { replayed: false, change: inserted.data || changeRow, impact }
}

module.exports = { applyMutation, MUTATION_TYPES, MutationError }
