/**
 * services/eventBus.js
 * ─────────────────────────────────────────────
 * Event & Signal Bus — Postgres-backed event log + in-process pub/sub.
 *
 * Usage:
 *   const eventBus = require('./services/eventBus')
 *   eventBus.subscribe('risk.critical', async (payload) => { ... })
 *   await eventBus.publish('risk.critical', 'risks', 'executiveMemory', { agentName: 'DeployBot' }, 0.95)
 *
 * Architecture:
 *   - All events are persisted to `system_events` in Postgres (durable log).
 *   - In-process EventEmitter propagates the same events synchronously to
 *     any subscribed handler functions (cheap fan-out within the Node process).
 *   - No Redis/Kafka/RabbitMQ needed — deadline-safe, single-process design.
 */

const { EventEmitter } = require('events')
const { randomUUID } = require('crypto')
const supabase = require('../supabase')

// ─────────────────────────────────────────────
// Internal EventEmitter (in-process pub/sub)
// ─────────────────────────────────────────────
const emitter = new EventEmitter()
emitter.setMaxListeners(50)   // allow many modules to subscribe

// ─────────────────────────────────────────────
// publish(eventType, sourceModule, targetModule, payload, confidence)
//   → inserts a row into system_events AND emits in-process
// ─────────────────────────────────────────────
async function publish(eventType, sourceModule, targetModule, payload = {}, confidence = 1.0) {
  const correlationId = randomUUID()

  // 1. Persist to Postgres
  const { data, error } = await supabase
    .from('system_events')
    .insert({
      event_type: eventType,
      source_module: sourceModule,
      target_module: targetModule,
      correlation_id: correlationId,
      payload: payload,
      confidence: confidence,
      status: 'published'
    })
    .select()
    .single()

  if (error) {
    console.error(`[EventBus] Failed to persist event "${eventType}":`, error.message)
  }

  // 2. Emit in-process (fire-and-forget — don't await handler promises here)
  const eventData = {
    eventType,
    sourceModule,
    targetModule,
    correlationId,
    payload,
    confidence,
    dbId: data?.id ?? null,
    timestamp: new Date().toISOString()
  }

  emitter.emit(eventType, eventData)
  emitter.emit('*', eventData)   // wildcard listeners

  console.log(`[EventBus] Published "${eventType}" from ${sourceModule} → ${targetModule} (correlationId: ${correlationId})`)

  return { correlationId, dbId: data?.id ?? null }
}

// ─────────────────────────────────────────────
// subscribe(eventType, handlerFn)
//   → registers an in-process listener
// ─────────────────────────────────────────────
function subscribe(eventType, handlerFn) {
  emitter.on(eventType, async (eventData) => {
    try {
      await Promise.resolve(handlerFn(eventData))

      // Mark as processed in Postgres
      if (eventData.dbId) {
        await supabase
          .from('system_events')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', eventData.dbId)
      }
    } catch (err) {
      console.error(`[EventBus] Handler error for "${eventType}":`, err.message)
    }
  })
  console.log(`[EventBus] Subscribed handler for event type "${eventType}"`)
}

// ─────────────────────────────────────────────
// REAL WIRING — connect existing modules
// ─────────────────────────────────────────────

// ── Wire 1: risk.critical
//    When a CRITICAL predictive risk is detected, auto-log a memory item
//    in executive_memory_items (so leadership is never surprised).
//    Also upserts a failure_patterns entry so Learning module surfaces it.
subscribe('risk.critical', async (event) => {
  const { agentName, threatLevel, predictedScore, reasons } = event.payload || {}
  if (!agentName) return

  // 1a. Executive memory item (original behaviour — unchanged)
  await supabase.from('executive_memory_items').insert({
    memory_type: 'hero_risk',
    title: `CRITICAL risk detected: ${agentName}`,
    description: `Predictive risk score ${predictedScore ?? '?'}/100 — ${(reasons || []).join('; ')}`,
    entity_name: agentName,
    relevance_score: predictedScore ?? 90,
    severity: 'critical',
    source_module: 'eventBus.risk.critical',
    is_recurring: false
  })

  // 1b. Learning entry — upsert into failure_patterns so /api/learning/failures
  //     and /api/learning/summary reflect event-driven learning (not just seed data).
  //     We upsert on asset_name+asset_type to increment appearance_count naturally.
  const { data: existing } = await supabase
    .from('failure_patterns')
    .select('id, appearance_count')
    .eq('asset_name', agentName)
    .eq('asset_type', 'agent')
    .single()

  if (existing) {
    await supabase
      .from('failure_patterns')
      .update({
        appearance_count: existing.appearance_count + 1,
        is_repeat_offender: (existing.appearance_count + 1) >= 2,
        failure_severity: 'critical'
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('failure_patterns').insert({
      asset_name:       agentName,
      asset_type:       'agent',
      appearance_count: 1,
      failure_severity: 'critical',
      is_repeat_offender: false,
      reasons:          reasons && reasons.length ? reasons : [`Predictive score ${predictedScore ?? '?'}/100 — CRITICAL threat level`]
    })
  }

  console.log(`[EventBus] risk.critical handler: logged executive memory + failure_patterns entry for ${agentName}`)
})

// ── Wire 2: graph.synced
//    When the knowledge graph is re-synced, publish a summary event
//    so Pattern Intelligence (next chunk) can pick it up.
subscribe('graph.synced', async (event) => {
  const { nodesCount, edgesCount } = event.payload || {}
  console.log(`[EventBus] graph.synced handler: graph updated — ${nodesCount} nodes, ${edgesCount} edges`)

  await supabase.from('executive_memory_items').insert({
    memory_type: 'lesson',
    title: 'Knowledge graph re-synchronized',
    description: `Graph now has ${nodesCount ?? '?'} nodes and ${edgesCount ?? '?'} edges reflecting current org state.`,
    entity_name: 'Knowledge Graph',
    relevance_score: 60,
    severity: 'low',
    source_module: 'eventBus.graph.synced',
    is_recurring: false
  })
})

// ── Wire 3: agent.failed
//    When an agent enters FAILED status, immediately publish a
//    high-severity context item so the executive feed surfaces it.
subscribe('agent.failed', async (event) => {
  const { agentName, agentId, ownerId } = event.payload || {}
  if (!agentName) return

  await supabase.from('context_items').insert({
    context_type: 'incident',
    title: `Agent failure detected: ${agentName}`,
    description: `Agent ${agentName} (ID ${agentId ?? '?'}) has entered FAILED state. Owner employee ID: ${ownerId ?? 'unknown'}. Immediate investigation required.`,
    entity_name: agentName,
    responsible_person: null,
    urgency: 'CRITICAL',
    blast_radius: 85,
    source_module: 'eventBus.agent.failed',
    status: 'open'
  })

  console.log(`[EventBus] agent.failed handler: context item created for failed agent ${agentName}`)
})

// ── Wire 4: twin.synced
//    When the Digital Twin is synced, log a memory item so leadership knows
//    the org mirror has been updated and what key metrics looked like.
subscribe('twin.synced', async (event) => {
  const { snapshotId, nodeCount, edgeCount, orgHealthIndex, criticalRiskCount, spofCount } = event.payload || {}
  console.log(`[EventBus] twin.synced handler: Digital Twin snapshot ${snapshotId} — ${nodeCount} nodes, ${edgeCount} edges, health ${orgHealthIndex}`)

  await supabase.from('executive_memory_items').insert({
    memory_type: 'lesson',
    title: 'Digital Twin synchronized',
    description: `Twin snapshot ${snapshotId ?? '?'} computed. Org graph: ${nodeCount ?? '?'} nodes, ${edgeCount ?? '?'} edges. Health index: ${orgHealthIndex ?? '?'}. Critical risks: ${criticalRiskCount ?? '?'}. SPOFs: ${spofCount ?? '?'}.`,
    entity_name: 'Digital Twin',
    relevance_score: 70,
    severity: criticalRiskCount > 0 ? 'high' : 'low',
    source_module: 'eventBus.twin.synced',
    is_recurring: false
  })
})

// ── Wire 5: simulation.completed
//    High-impact simulations (severity=critical) automatically surface in
//    executive memory so leadership is aware of simulated risks.
//    ALSO logs a failure_patterns entry so Learning module reacts to simulations.
subscribe('simulation.completed', async (event) => {
  const { simulationType, targetEntity, severity, impactScore, twinSnapshotId, affectedEntities } = event.payload || {}
  const affectedCount = Object.values(affectedEntities || {}).flat().length
  console.log(`[EventBus] simulation.completed: ${simulationType} on ${targetEntity} — ${severity} (score ${impactScore})`)

  // 5a. Executive memory item — only for critical/high to avoid noise (original behaviour)
  if (['critical', 'high'].includes(severity)) {
    await supabase.from('executive_memory_items').insert({
      memory_type: 'lesson',
      title: `Simulation alert: ${(simulationType || '').replace(/_/g, ' ')} — ${targetEntity}`,
      description: `Simulation "${simulationType}" on "${targetEntity}" completed with severity ${severity} and impact score ${impactScore}/100. ` +
        `${affectedCount} entity(ies) affected. Twin snapshot ID: ${twinSnapshotId ?? 'N/A'}.`,
      entity_name: targetEntity,
      relevance_score: impactScore ?? 70,
      severity: severity === 'critical' ? 'critical' : 'high',
      source_module: `eventBus.simulation.completed.${simulationType}`,
      is_recurring: false
    })
  }

  // 5b. Learning entry — ALWAYS log into failure_patterns regardless of severity
  //     so the Learning module has a complete record of all simulated failure events.
  //     Upsert: increment appearance_count if same entity already known.
  const assetType = simulationType?.includes('agent') ? 'agent'
    : simulationType?.includes('employee') ? 'employee'
    : simulationType?.includes('platform') ? 'platform'
    : 'workflow'

  const { data: existing } = await supabase
    .from('failure_patterns')
    .select('id, appearance_count')
    .eq('asset_name', targetEntity)
    .eq('asset_type', assetType)
    .single()

  if (existing) {
    await supabase
      .from('failure_patterns')
      .update({
        appearance_count: existing.appearance_count + 1,
        is_repeat_offender: (existing.appearance_count + 1) >= 2,
        failure_severity: severity
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('failure_patterns').insert({
      asset_name:         targetEntity,
      asset_type:         assetType,
      appearance_count:   1,
      failure_severity:   severity,
      is_repeat_offender: false,
      reasons:            [`Simulation: ${simulationType} — impact score ${impactScore ?? '?'}/100. ${affectedCount} entities affected.`]
    })
  }

  console.log(`[EventBus] simulation.completed handler: logged executive memory + failure_patterns entry for ${targetEntity} (${severity})`)
})

module.exports = { publish, subscribe }

