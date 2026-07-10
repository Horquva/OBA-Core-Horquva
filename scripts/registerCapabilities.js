/**
 * scripts/registerCapabilities.js
 * ─────────────────────────────────────────────
 * One-time seed that registers EVERY currently-working module in the
 * Capability Registry (module_capabilities table).
 *
 * Run after migration 08 is applied:
 *   node scripts/registerCapabilities.js
 *
 * Also called at server startup from index.js (idempotent — safe to re-run
 * as all entries upsert on module_id).
 *
 * Modules registered here are derived ONLY from routes actually mounted in
 * index.js, not from memory or assumptions. Each entry has been verified
 * against the actual route files.
 */

const { registerCapability } = require('../services/capabilityRegistry')

const MODULES = [
  // ════════════════════════════════════════════
  // CORE MODULES (M01–M10) — Data & Entity layer
  // ════════════════════════════════════════════
  {
    moduleId: 'M01',
    moduleName: 'Ownership Intelligence',
    category: 'core',
    baseRoute: '/api/ownership',
    capabilities: [
      { endpoint: '/api/ownership', method: 'GET', description: 'Detect ownership gaps, orphaned agents and workflows', returns: 'ownership gaps, orphaned entities, missing backups' }
    ]
  },
  {
    moduleId: 'M02',
    moduleName: 'Dependency Intelligence',
    category: 'core',
    baseRoute: '/api/dependencies',
    capabilities: [
      { endpoint: '/api/dependencies', method: 'GET', description: 'Map organizational dependencies and detect cascading failure risks', returns: 'dependency graph, cascade risks, dependency strength' }
    ]
  },
  {
    moduleId: 'M03',
    moduleName: 'Risk Intelligence',
    category: 'core',
    baseRoute: '/api/risks',
    capabilities: [
      { endpoint: '/api/risks', method: 'GET', description: 'Calculate risk scores and detect critical organizational assets', returns: 'risk scores, critical assets, risk breakdown' }
    ]
  },
  {
    moduleId: 'M04',
    moduleName: 'Dashboard Intelligence',
    category: 'core',
    baseRoute: '/api/dashboard',
    capabilities: [
      { endpoint: '/api/dashboard', method: 'GET', description: 'Organizational summary dashboard with top-level metrics', returns: 'agent count, risk breakdown, workflow health, platform overview' }
    ]
  },
  {
    moduleId: 'M05',
    moduleName: 'Agent Intelligence',
    category: 'core',
    baseRoute: '/api/agents',
    capabilities: [
      { endpoint: '/api/agents', method: 'GET', description: 'List all AI agents with risk scores, ownership, and status', returns: 'agents list with risk, status, owner, usage metrics' }
    ]
  },
  {
    moduleId: 'M06',
    moduleName: 'Human-Agent Map Intelligence',
    category: 'core',
    baseRoute: '/api/human-agent-map',
    capabilities: [
      { endpoint: '/api/human-agent-map', method: 'GET', description: 'Map human-to-AI agent relationships and collaboration network', returns: 'human-agent ownership map, role assignments' }
    ]
  },
  {
    moduleId: 'M07',
    moduleName: 'AI Tool Intelligence',
    category: 'core',
    baseRoute: '/api/tool-intelligence',
    capabilities: [
      { endpoint: '/api/tool-intelligence', method: 'GET', description: 'AI tool inventory, adoption rates, and cost analysis', returns: 'tool list, adoption, cost, ownership, backup tools' },
      { endpoint: '/api/tools', method: 'GET', description: 'Raw tool list', returns: 'tools' },
      { endpoint: '/api/tool-impact', method: 'GET', description: 'Tool impact and dependency analysis', returns: 'tool impact scores' }
    ]
  },
  {
    moduleId: 'M08',
    moduleName: 'Workflow Intelligence',
    category: 'core',
    baseRoute: '/api/workflows',
    capabilities: [
      { endpoint: '/api/workflows/intelligence', method: 'GET', description: 'Workflow execution mapping, health, and SPOF detection', returns: 'workflow health, SPOFs, failure analysis' },
      { endpoint: '/api/workflows/failures', method: 'GET', description: 'Workflow failure analysis by type and severity', returns: 'workflow failures, failure types, severity' },
      { endpoint: '/api/workflows/spof', method: 'GET', description: 'Single Point of Failure detection in workflows', returns: 'SPOF workflows, critical dependencies' }
    ]
  },
  {
    moduleId: 'M09',
    moduleName: 'Knowledge Intelligence',
    category: 'core',
    baseRoute: '/api/knowledge',
    capabilities: [
      { endpoint: '/api/knowledge/intelligence', method: 'GET', description: 'Knowledge asset management, concentration, and documentation gaps', returns: 'knowledge assets, coverage, gaps' },
      { endpoint: '/api/knowledge/gaps', method: 'GET', description: 'Documentation gaps in knowledge assets', returns: 'undocumented knowledge, risk levels' },
      { endpoint: '/api/knowledge/impact/:employee', method: 'GET', description: 'Knowledge impact if an employee leaves', returns: 'knowledge loss impact, affected assets' }
    ]
  },
  {
    moduleId: 'M10',
    moduleName: 'Organizational Memory Intelligence',
    category: 'core',
    baseRoute: '/api/memory',
    capabilities: [
      { endpoint: '/api/memory/health', method: 'GET', description: 'Memory preservation health and institutional memory risk', returns: 'memory health score, critical carriers' },
      { endpoint: '/api/memory/map', method: 'GET', description: 'Memory dependency map across employees', returns: 'memory concentration, risk map' },
      { endpoint: '/api/memory/employee/:name', method: 'GET', description: 'Memory profile for a specific employee', returns: 'employee knowledge assets, risk level' }
    ]
  },
  // ════════════════════════════════════════════
  // INTELLIGENCE MODULES (M11–M27)
  // ════════════════════════════════════════════
  {
    moduleId: 'M11',
    moduleName: 'Predictive Risk Intelligence',
    category: 'intelligence',
    baseRoute: '/api/predictive-risk',
    capabilities: [
      { endpoint: '/api/predictive-risk/summary', method: 'GET', description: 'Summary of predicted organizational risks by threat level', returns: 'threat breakdown, emerging threats, top risk drivers' },
      { endpoint: '/api/predictive-risk/critical', method: 'GET', description: 'All CRITICAL-threat agents with IEP intelligence envelope (fires risk.critical event)', returns: 'IEP packageIntelligence with critical agents, confidence, recommendations' },
      { endpoint: '/api/predictive-risk/emerging', method: 'GET', description: 'Detect emerging threats before they become critical', returns: 'emerging threats, predicted scores' },
      { endpoint: '/api/predictive-risk/agents', method: 'GET', description: 'All agents with predictive risk scores', returns: 'all agent risk predictions' }
    ]
  },
  {
    moduleId: 'M12',
    moduleName: 'Organizational Forecast Intelligence',
    category: 'intelligence',
    baseRoute: '/api/forecast',
    capabilities: [
      { endpoint: '/api/forecast/summary', method: 'GET', description: '30/60/90 day organizational outlook and health prediction', returns: 'forecast periods, health trend, predicted scores' }
    ]
  },
  {
    moduleId: 'M13',
    moduleName: 'Human-AI Collaboration Intelligence',
    category: 'intelligence',
    baseRoute: '/api/collaboration',
    capabilities: [
      { endpoint: '/api/collaboration/summary', method: 'GET', description: 'AI adoption analysis, collaboration scoring, dependency concentration', returns: 'collaboration score, AI adoption, concentration risk' }
    ]
  },
  {
    moduleId: 'M14',
    moduleName: 'Decision Intelligence',
    category: 'intelligence',
    baseRoute: '/api/decisions',
    capabilities: [
      { endpoint: '/api/decisions/summary', method: 'GET', description: 'Decision reconstruction, quality analysis, and Decision Quality Index', returns: 'DQI, decision history, quality breakdown' }
    ]
  },
  {
    moduleId: 'M15',
    moduleName: 'Verification Intelligence',
    category: 'intelligence',
    baseRoute: '/api/verification',
    capabilities: [
      { endpoint: '/api/verification/summary', method: 'GET', description: 'Action verification, policy compliance, violation detection', returns: 'verification results, policy violations, compliance score' }
    ]
  },
  {
    moduleId: 'M16',
    moduleName: 'Workflow Orchestration Intelligence',
    category: 'intelligence',
    baseRoute: '/api/orchestration',
    capabilities: [
      { endpoint: '/api/orchestration/summary', method: 'GET', description: 'Workflow execution orchestration, collision detection, resource conflicts', returns: 'orchestration status, conflicts, resource usage' }
    ]
  },
  {
    moduleId: 'M17',
    moduleName: 'Organizational Learning Intelligence',
    category: 'intelligence',
    baseRoute: '/api/learning',
    capabilities: [
      { endpoint: '/api/learning/summary', method: 'GET', description: 'Learning maturity assessment, failure patterns, IEP intelligence envelope', returns: 'IEP packageIntelligence with learning maturity, repeat offenders' },
      { endpoint: '/api/learning/failures', method: 'GET', description: 'Failure pattern analysis and repeat offender detection', returns: 'failure patterns, repeat offenders, severity' },
      { endpoint: '/api/learning/incidents', method: 'GET', description: 'Department incident exposure rankings', returns: 'department exposure scores, risk levels' }
    ]
  },
  {
    moduleId: 'M18',
    moduleName: 'Organizational Continuity Intelligence',
    category: 'intelligence',
    baseRoute: '/api/continuity',
    capabilities: [
      { endpoint: '/api/continuity/summary', method: 'GET', description: 'Continuity analysis, survival classification, recovery planning', returns: 'continuity score, survival status, recovery plans' }
    ]
  },
  {
    moduleId: 'M19',
    moduleName: 'Governance Intelligence',
    category: 'intelligence',
    baseRoute: '/api/governance',
    capabilities: [
      { endpoint: '/api/governance/score', method: 'GET', description: 'Governance score and status breakdown across all assets', returns: 'governance score, status breakdown' },
      { endpoint: '/api/governance/gaps', method: 'GET', description: 'Governance gaps by severity and type', returns: 'governance gaps, gap types, severity' },
      { endpoint: '/api/governance/heatmap', method: 'GET', description: 'Governance heatmap by department', returns: 'department governance scores' },
      { endpoint: '/api/governance/offenders', method: 'GET', description: 'Critical and high-risk governance offenders', returns: 'governance offenders list' }
    ]
  },
  {
    moduleId: 'M20',
    moduleName: 'Accountability Intelligence',
    category: 'intelligence',
    baseRoute: '/api/accountability',
    capabilities: [
      { endpoint: '/api/accountability/score', method: 'GET', description: 'RACI accountability score and separation-of-duties analysis', returns: 'accountability score, RACI breakdown' },
      { endpoint: '/api/accountability/chains', method: 'GET', description: 'Accountability chains across entities', returns: 'accountability chains' },
      { endpoint: '/api/accountability/entities', method: 'GET', description: 'All accountable entities', returns: 'entities with accountability assignments' }
    ]
  },
  // ════════════════════════════════════════════
  // EXECUTIVE MODULES (M21–M27)
  // ════════════════════════════════════════════
  {
    moduleId: 'M21',
    moduleName: 'Executive Avatar Intelligence',
    category: 'executive',
    baseRoute: '/api/executive',
    capabilities: [
      { endpoint: '/api/executive/ask', method: 'GET', description: 'Executive conversational Q&A interface, live org answers', returns: 'natural language answer, data sources' },
      { endpoint: '/api/executive/briefing', method: 'GET', description: 'Executive briefing on current org state', returns: 'executive briefing' },
      { endpoint: '/api/executive/questions', method: 'GET', description: 'Available executive question templates', returns: 'question library' }
    ]
  },
  {
    moduleId: 'M22',
    moduleName: 'Voice Intelligence Engine',
    category: 'executive',
    baseRoute: '/api/voice',
    capabilities: [
      { endpoint: '/api/voice/ask', method: 'GET', description: 'Voice-ready org intelligence, intent classification, entity resolution', returns: 'natural language response, detected intent' },
      { endpoint: '/api/voice/daily-summary', method: 'GET', description: 'Daily spoken organizational summary', returns: 'voice summary' }
    ]
  },
  {
    moduleId: 'M23',
    moduleName: 'Executive Briefing Intelligence',
    category: 'executive',
    baseRoute: '/api/briefing',
    capabilities: [
      { endpoint: '/api/briefing', method: 'GET', description: 'Auto-generated daily executive briefing with top risks and incidents', returns: 'executive briefing, top risks, incidents, documentation trends' }
    ]
  },
  {
    moduleId: 'M24',
    moduleName: 'Decision Support Intelligence',
    category: 'executive',
    baseRoute: '/api/decision-support',
    capabilities: [
      { endpoint: '/api/decision-support/priorities', method: 'GET', description: 'Prioritized decision queue: impact × urgency ÷ effort scoring', returns: 'prioritized decisions, impact scores' }
    ]
  },
  {
    moduleId: 'M25',
    moduleName: 'Organizational Health Intelligence',
    category: 'intelligence',
    baseRoute: '/api/health',
    capabilities: [
      { endpoint: '/api/health/summary', method: 'GET', description: 'Organizational Health Index, health status, and dimension scores', returns: 'health index, dimensions, trend' },
      { endpoint: '/api/health/departments', method: 'GET', description: 'Department-level health scores', returns: 'department health breakdown' },
      { endpoint: '/api/health/critical', method: 'GET', description: 'Live critical health signals across all dimensions', returns: 'critical agents, undocumented workflows, live health index' },
      { endpoint: '/api/health/trend', method: 'GET', description: 'Health index trend over time', returns: 'health trend, baseline vs latest' }
    ]
  },
  {
    moduleId: 'M26',
    moduleName: 'Executive Memory Intelligence',
    category: 'executive',
    baseRoute: '/api/executive-memory',
    capabilities: [
      { endpoint: '/api/executive-memory', method: 'GET', description: 'Leadership memory: recurring incidents, lessons, hero dependencies, repeat failures', returns: 'memory items by type, severity' }
    ]
  },
  {
    moduleId: 'M27',
    moduleName: 'Executive Context Intelligence',
    category: 'executive',
    baseRoute: '/api/context',
    capabilities: [
      { endpoint: '/api/context', method: 'GET', description: 'Ranked organizational priorities: open incidents, SPOFs, pending decisions', returns: 'priority feed, urgency rankings' }
    ]
  },
  // ════════════════════════════════════════════
  // DATA QUALITY
  // ════════════════════════════════════════════
  {
    moduleId: 'core.dataquality',
    moduleName: 'Data Quality Intelligence',
    category: 'core',
    baseRoute: '/api/data-quality',
    capabilities: [
      { endpoint: '/api/data-quality', method: 'GET', description: 'Data integrity checks: orphaned agents, undocumented knowledge, missing runbooks', returns: 'data quality issues, severity breakdown' }
    ]
  },
  // ════════════════════════════════════════════
  // FIZZA'S MODULES (M46, M50, M55)
  // ════════════════════════════════════════════
  {
    moduleId: 'M46',
    moduleName: 'Truth Intelligence',
    category: 'intelligence',
    baseRoute: '/api/intelligence/truth',
    capabilities: [
      { endpoint: '/api/intelligence/truth', method: 'GET', description: 'Constitutional verification layer — fact verification, confidence scoring, data trust score', returns: 'truth entities, verified/unverified facts, trust score' },
      { endpoint: '/api/intelligence/truth/summary', method: 'GET', description: 'Truth summary across all entities', returns: 'total claims, verified count, trust score' },
      { endpoint: '/api/intelligence/truth/verified', method: 'GET', description: 'All verified facts', returns: 'verified claims list' }
    ]
  },
  {
    moduleId: 'M50',
    moduleName: 'Organizational Brain Core Logic',
    category: 'intelligence',
    baseRoute: '/api/intelligence/brain-core',
    capabilities: [
      { endpoint: '/api/intelligence/brain-core', method: 'GET', description: 'Unified Brain Index, organizational posture (STABLE/STRAINED/CRITICAL), signal fusion', returns: 'brain index, posture, top signals' },
      { endpoint: '/api/intelligence/brain-core/posture', method: 'GET', description: 'Current organizational posture', returns: 'posture: STABLE | STRAINED | CRITICAL' },
      { endpoint: '/api/intelligence/brain-core/signals', method: 'GET', description: 'Brain intelligence signals breakdown', returns: 'signal sources, scores' }
    ]
  },
  {
    moduleId: 'M55',
    moduleName: 'Organizational Intelligence Orchestrator',
    category: 'intelligence',
    baseRoute: '/api/intelligence/orchestrator',
    capabilities: [
      { endpoint: '/api/intelligence/orchestrator', method: 'GET', description: 'Final constitutional reasoning layer — IEP-wrapped Organizational Intelligence Score and verdict', returns: 'IEP packageIntelligence with OI score, rating, verdict, recommendations' },
      { endpoint: '/api/intelligence/orchestrator/summary', method: 'GET', description: 'Orchestrator summary with top recommendations', returns: 'OI score, rating, brain posture, recommendations' },
      { endpoint: '/api/intelligence/orchestrator/modules', method: 'GET', description: 'All contributing module scores and verification status', returns: 'module breakdown, verified count, weights' },
      { endpoint: '/api/intelligence/orchestrator/score', method: 'GET', description: 'Organizational Intelligence Score only', returns: 'score, rating' }
    ]
  },
  // ════════════════════════════════════════════
  // INFRASTRUCTURE MODULES (Graph, Events, IEP)
  // ════════════════════════════════════════════
  {
    moduleId: 'M60',
    moduleName: 'Knowledge Graph',
    category: 'graph',
    baseRoute: '/api/graph',
    capabilities: [
      { endpoint: '/api/graph/nodes', method: 'GET', description: 'All graph nodes, filterable by node_type (employee/agent/platform/workflow)', returns: 'nodes with entity metadata and properties' },
      { endpoint: '/api/graph/nodes/:id/neighbors', method: 'GET', description: 'One-hop neighbors of a graph node', returns: 'outgoing and incoming neighbors with edge metadata' },
      { endpoint: '/api/graph/path/:sourceId/:targetId', method: 'GET', description: 'BFS shortest path between two nodes', returns: 'path nodes, segments, hop count, connected flag' },
      { endpoint: '/api/graph/entity/:type/:id', method: 'GET', description: 'Graph node and all connections for a real entity', returns: 'node, outgoing and incoming connections' },
      { endpoint: '/api/graph/sync', method: 'POST', description: 'Re-sync graph_nodes and graph_edges from source tables (publishes graph.synced event)', returns: 'node count, edge count, breakdown by type' }
    ]
  },
  {
    moduleId: 'M61',
    moduleName: 'Event & Signal Bus',
    category: 'event',
    baseRoute: '/api/events',
    capabilities: [
      { endpoint: '/api/events', method: 'GET', description: 'Recent system events, filterable by event_type and source_module', returns: 'events with correlation IDs and processing status' },
      { endpoint: '/api/events/:correlationId', method: 'GET', description: 'Trace all events sharing a correlation ID', returns: 'correlated event chain' },
      { endpoint: '/api/events/publish', method: 'POST', description: 'Publish a new event to the system event bus', returns: 'correlationId, dbId' }
    ]
  },
  {
    moduleId: 'M63',
    moduleName: 'Pattern Intelligence',
    category: 'pattern',
    baseRoute: '/api/pattern-intelligence',
    capabilities: [
      { endpoint: '/api/pattern-intelligence/summary', method: 'GET', description: 'Pattern intelligence summary by type — IEP envelope, counts of recurring failures, dependency clusters, escalation chains, event correlations', returns: 'IEP packageIntelligence with pattern counts, top 5 by occurrence' },
      { endpoint: '/api/pattern-intelligence/recurring-failures', method: 'GET', description: 'Recurring failure patterns grouped by failure type across workflow_failures and incident_patterns', returns: 'recurring failure patterns with confidence and entities involved' },
      { endpoint: '/api/pattern-intelligence/dependency-clusters', method: 'GET', description: 'Graph nodes with unusually high fan-in or fan-out indicating structural risk', returns: 'dependency cluster patterns with degree analysis' },
      { endpoint: '/api/pattern-intelligence/event-correlations', method: 'GET', description: 'System events grouped by correlation_id or event_type showing storm patterns', returns: 'event correlation patterns' },
      { endpoint: '/api/pattern-intelligence/scan', method: 'POST', description: 'Run all pattern detectors and upsert results into detected_patterns table', returns: 'scan results with counts by pattern type and persisted IDs' }
    ]
  },
  {
    moduleId: 'M64',
    moduleName: 'Digital Twin',
    category: 'twin',
    baseRoute: '/api/digital-twin',
    capabilities: [
      { endpoint: '/api/digital-twin/sync', method: 'POST', description: 'Sync live org state from graph, risk, health, governance into twin_snapshots and twin_entity_state (publishes twin.synced event)', returns: 'snapshotId, node count, edge count, risk counts, entities updated' },
      { endpoint: '/api/digital-twin/current', method: 'GET', description: 'Latest digital twin snapshot plus full entity state list with risk levels', returns: 'twin snapshot, entity count, risk breakdown, all entity states' },
      { endpoint: '/api/digital-twin/entity/:nodeId', method: 'GET', description: 'Single entity current state plus graph neighbors', returns: 'entity state, graph node, outgoing and incoming neighbors' },
      { endpoint: '/api/digital-twin/drift', method: 'GET', description: 'Compare two most recent twin snapshots to show what changed: new risks, resolved risks, health delta, SPOF changes', returns: 'deltas, entity drift, drift signals' }
    ]
  },
  {
    moduleId: 'M65',
    moduleName: 'Simulation Intelligence',
    category: 'simulation',
    baseRoute: '/api/simulations',
    capabilities: [
      { endpoint: '/api/simulations/agent-fails/:agent', method: 'GET', description: 'Simulate an AI agent failure and compute blast radius from Digital Twin state', returns: 'IEP packageIntelligence with impacted agents, workflows, severity, impact score' },
      { endpoint: '/api/simulations/employee-leaves/:employee', method: 'GET', description: 'Simulate an employee departure and compute knowledge/agent impact from Digital Twin', returns: 'IEP packageIntelligence with impacted agents, workflows, knowledge risk' },
      { endpoint: '/api/simulations/platform-down/:platform', method: 'GET', description: 'Simulate an AI platform outage and compute downstream agent and workflow impact', returns: 'IEP packageIntelligence with impacted agents, workflows, platform risk' },
      { endpoint: '/api/simulations/workflow-disruption/:workflow', method: 'GET', description: 'Simulate a workflow disruption and compute agent dependencies and cascade risk', returns: 'IEP packageIntelligence with affected agents, critical dependencies' },
      { endpoint: '/api/simulations/history', method: 'GET', description: 'List past simulation runs, filterable by type and date range', returns: 'simulation run history linked to twin snapshot IDs' }
    ]
  },
  {
    moduleId: 'M66',
    moduleName: 'Capability Registry',
    category: 'registry',
    baseRoute: '/api/capabilities',
    capabilities: [
      { endpoint: '/api/capabilities', method: 'GET', description: 'List all registered modules with their capabilities', returns: 'module list with endpoints, descriptions, categories' },
      { endpoint: '/api/capabilities/:moduleId', method: 'GET', description: 'One module capabilities by module ID', returns: 'single module with full capability list' },
      { endpoint: '/api/capabilities/search', method: 'GET', description: 'Keyword search across module names and capability descriptions for intent-based discovery', returns: 'matching modules by intent keyword' }
    ]
  }
]

async function run() {
  console.log('[CapabilityRegistry] Starting registration of', MODULES.length, 'modules...')
  let registered = 0
  let failed = 0

  for (const mod of MODULES) {
    try {
      await registerCapability(
        mod.moduleId,
        mod.moduleName,
        mod.category,
        mod.baseRoute,
        mod.capabilities
      )
      console.log(`  [OK] ${mod.moduleId} — ${mod.moduleName}`)
      registered++
    } catch (err) {
      console.error(`  [FAIL] ${mod.moduleId} — ${err.message}`)
      failed++
    }
  }

  console.log(`[CapabilityRegistry] Done: ${registered} registered, ${failed} failed`)
  return { registered, failed }
}

// If run directly (node scripts/registerCapabilities.js)
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
  run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
}

module.exports = { run, MODULES }
