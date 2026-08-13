console.log("1. File started")

const path = require('path')
const express = require('express')
const cors = require('cors')
// Load backend/.env no matter where the process is started from.
require('dotenv').config({ path: path.join(__dirname, '.env') })

console.log("2. Packages loaded")

const app = express()

app.use(cors())
app.use(express.json())

// Root route — friendly service metadata (prevents "Cannot GET /")
app.get('/', (req, res) => {
  res.json({
    name: 'Horquva OBA Core API',
    status: 'running',
    message: 'Organizational Brain backend is live. This is a JSON API, not a web page.',
    endpoints: {
      bootReport: '/api/brain/boot-report',
      brainStatus: '/api/brain/status',
      modules: '/api/brain/registry/modules',
      health: '/api/health/summary',
      authLogin: 'POST /api/auth/login',
    },
  })
})

const { requestLogger, errorHandler } = require('./middleware/validate')

console.log("3. Middlewares added")

app.use(requestLogger)

const { requireAuth } = require('./middleware/auth')

// Auth endpoints stay reachable without a token — register/login/reset-password
// have to be, and GET /api/auth/me already gates itself with requireAuth.
app.use('/api/auth', require('./routes/auth/auth'))

// Everything else under /api touches real org data — require a valid bearer token.
app.use('/api', requireAuth)

app.use('/api/agents', require('./routes/agents'))
app.use('/api/employees', require('./routes/employees'))
app.use('/api/ownership', require('./routes/ownership'))
app.use('/api/dependencies', require('./routes/dependencies'))
app.use('/api/risks', require('./routes/risks'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/data-quality', require('./routes/dataQuality'))
app.use('/api/simulations/employee-leaves', require('./routes/simulations/employeeLeaves'))
app.use('/api/simulations/agent-fails',     require('./routes/simulations/agentFails'))
app.use('/api/simulations/platform-down',   require('./routes/simulations/platformDown'))
app.use('/api/simulations/workflow-disruption', require('./routes/simulations/workflowDisruption'))
app.use('/api/human-agent-map',             require('./routes/humanAgentMap'))
app.use('/api/tools',             require('./routes/tools'))
app.use('/api/tool-intelligence', require('./routes/toolIntelligence'))
app.use('/api/tool-impact',       require('./routes/toolImpact'))
app.use('/api/workflows', require('./routes/workflows/index'))
app.use('/api/knowledge/intelligence', require('./routes/knowledge/intelligence'))
app.use('/api/knowledge/impact',       require('./routes/knowledge/impact'))
app.use('/api/knowledge/gaps',         require('./routes/knowledge/gaps'))
app.use('/api/memory', require('./routes/memory/memory'))
app.use('/api/intelligence/truth', require('./routes/truth/truth'))
app.use('/api/verification', require('./routes/verification/intelligence'))
app.use('/api/intelligence/brain-core', require('./routes/intelligence/brainCore'))
app.use('/api/orchestration', require('./routes/orchestration/orchestration'))
app.use('/api/decisions', require('./routes/decisions/decisions'))
app.use('/api/continuity', require('./routes/continuity/continuity'))
app.use('/api/learning', require('./routes/learning/learning'))
app.use('/api/governance', require('./routes/governance/governance'))
app.use('/api/predictive-risk', require('./routes/predictive/predictiveRisk'))
app.use('/api/forecast', require('./routes/forecast/forecast'))
app.use('/api/collaboration', require('./routes/collaboration/collaboration'))
app.use('/api/accountability', require('./routes/accountability/accountability'))
app.use('/api/executive', require('./routes/executive/executive'))
app.use('/api/voice', require('./routes/voice/voice'))
app.use('/api/briefing', require('./routes/briefing/briefing'))
app.use('/api/decision-support', require('./routes/decisionSupport/decisionSupport'))
app.use('/api/health', require('./routes/health/health'))
app.use('/api/executive-memory', require('./routes/executiveMemory/executiveMemory'))
app.use('/api/context', require('./routes/context/context'))
app.use('/api/intelligence/orchestrator', require('./routes/intelligence/orchestrator'))
app.use('/api/intelligence', require('./routes/intelligence/prediction'))
app.use('/api/signals', require('./routes/signals/signals'))
app.use('/api/intelligence', require('./routes/intelligence/constitutional'))
app.use('/api/avatar', require('./routes/avatar'))
app.use('/api/self-healing', require('./routes/selfHealing'))
app.use('/api/automation', require('./routes/automation'))

// ─── Organizational Brain: constitutional runtime for M01–M55 (mounted at /api/brain) ───
// Boots synchronously on graphSeeder's demo data (fast, non-blocking startup),
// then swaps in the real Supabase-backed graph once loaded. If Supabase is
// unreachable the process stays up on demo data rather than failing to boot.
try {
  const { mountBrain } = require('./brain')
  const { report, runtime } = mountBrain(app)
  console.log(
    `Organizational Brain: ${report.accepted ? 'READY' : 'DEGRADED'} — ` +
    `${report.modules.discovered}/${report.modules.expected} modules, ` +
    `${report.capabilities.registered} capabilities`
  )
  // Fire-and-forget by design — the server must not block on Supabase. But a
  // failure here means every answer the brain gives comes from the synthetic
  // demo graph, so it is logged as the loud, unambiguous failure it is and
  // recorded on runtime state (see GET /api/brain/status -> dataSource).
  runtime.reloadGraph()
    .then((stats) => console.log('Organizational Brain: graph reloaded from Supabase —', JSON.stringify(stats)))
    .catch((err) => {
      console.error('='.repeat(78))
      console.error('Organizational Brain: SUPABASE GRAPH LOAD FAILED —', err.message)
      console.error('The brain is serving the SYNTHETIC DEMO GRAPH. Every number it')
      console.error('produces is fiction until this succeeds. Check GET /api/brain/status')
      console.error('-> dataSource, and retry with POST /api/brain/reload-graph.')
      console.error('='.repeat(78))
    })
} catch (e) {
  console.error('Organizational Brain failed to boot:', e.message)
}

app.use(errorHandler)

console.log("4. Routes loaded")

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})
