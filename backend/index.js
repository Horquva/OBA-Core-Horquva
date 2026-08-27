console.log("1. File started")

const path = require('path')
const express = require('express')
const cors = require('cors')
// Load backend/.env no matter where the process is started from.
require('dotenv').config({ path: path.join(__dirname, '.env') })

console.log("2. Packages loaded")

const app = express()

// Every /api route below requires a bearer token, but a default cors() sends
// Access-Control-Allow-Origin: * on every response — any site can then read
// an authenticated response from a browser holding a token (e.g. leaked via
// an unrelated XSS bug, or pasted into devtools). Restrict to the frontend's
// own origin(s) instead. CORS_ORIGINS is a comma-separated allowlist; unset
// falls back to the local dev ports so `npm run dev` keeps working out of
// the box — a production deployment must set it to its real frontend origin.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // No Origin header — server-to-server, curl, health checks. Not a browser
    // CORS scenario, so there is nothing to restrict.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
}))
app.use(express.json())

// Root route — friendly service metadata (prevents "Cannot GET /")
app.get('/', (req, res) => {
  res.json({
    name: 'Horquva OBA Core API',
    status: 'running',
    message: 'Organizational Brain backend is live. This is a JSON API, not a web page.',
    // D-40: the brain is a library, not a service (see backend/brain/README.md)
    // -- there is no /api/brain mount, so this used to point at 3 endpoints
    // that never existed.
    endpoints: {
      health: '/api/health/summary',
      authLogin: 'POST /api/auth/login',
    },
  })
})

const { requestLogger, errorHandler } = require('./middleware/validate')

console.log("3. Middlewares added")

app.use(requestLogger)

const { requireAuth } = require('./middleware/auth')

// Auth endpoints stay reachable without a token — register and login have to
// be. Everything else in that router gates itself per-route (GET /me, POST
// /logout, POST /change-password all name requireAuth), because mounting here
// puts the whole router above the global gate below.
app.use('/api/auth', require('./routes/auth/auth'))

// OBA Core is single-tenant and no business table carries an org column, so a
// second organization in app_users would silently share one dataset. D-01:
// this is now a hard boot failure, not a warning — see the gate on
// app.listen() at the bottom of this file, and lib/orgGuard.js for why the
// check itself still only reports rather than exiting.
const orgGuardCheck = require('./lib/orgGuard').assertSingleTenant()

// Everything else under /api touches real org data — require a valid bearer token.
app.use('/api', requireAuth)

app.use('/api/agents', require('./routes/agents'))
app.use('/api/employees', require('./routes/employees'))
app.use('/api/ownership', require('./routes/ownership'))
app.use('/api/dependencies', require('./routes/dependencies'))
app.use('/api/network', require('./routes/network'))
app.use('/api/risks', require('./routes/risks'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/data-quality', require('./routes/dataQuality'))
app.use('/api/simulations/employee-leaves', require('./routes/simulations/employeeLeaves'))
app.use('/api/simulations/agent-fails',     require('./routes/simulations/agentFails'))
app.use('/api/simulations/platform-down',   require('./routes/simulations/platformDown'))
app.use('/api/simulations/workflow-disruption', require('./routes/simulations/workflowDisruption'))
app.use('/api/simulations/rank',            require('./routes/simulations/rank'))
app.use('/api/human-agent-map',             require('./routes/humanAgentMap'))
app.use('/api/tools',             require('./routes/tools'))
app.use('/api/tool-intelligence', require('./routes/toolIntelligence'))
app.use('/api/tool-impact',       require('./routes/toolImpact'))
app.use('/api/workflows', require('./routes/workflows/index'))
app.use('/api/knowledge/intelligence', require('./routes/knowledge/intelligence'))
app.use('/api/knowledge/impact',       require('./routes/knowledge/impact'))
app.use('/api/knowledge/gaps',         require('./routes/knowledge/gaps'))
app.use('/api/memory', require('./routes/memory/memory'))
app.use('/api/continuity', require('./routes/continuity/continuity'))
app.use('/api/intelligence/truth', require('./routes/truth/truth'))
app.use('/api/verification', require('./routes/verification/intelligence'))
app.use('/api/intelligence/brain-core', require('./routes/intelligence/brainCore'))
app.use('/api/orchestration', require('./routes/orchestration/orchestration'))
app.use('/api/decisions', require('./routes/decisions/decisions'))
app.use('/api/decision-intelligence', require('./routes/decisionIntelligence'))
app.use('/api/learning', require('./routes/learning/learning'))
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

// ─── Organizational Brain: the M01–M55 analyses over the Knowledge Graph ───
// The brain is a library, not a service — nothing is mounted. Routes call
// brain.run(code) directly (see routes/intelligence/prediction.js). The graph
// loads asynchronously so the server does not block on Supabase; until it
// lands, brain.isReady() is false and those routes answer 503 rather than
// serving a synthetic stand-in.
require('./brain').loadGraph()
  .then((stats) => console.log('Organizational Brain: graph loaded from Supabase —', JSON.stringify(stats)))
  .catch((err) => {
    console.error('='.repeat(78))
    console.error('Organizational Brain: SUPABASE GRAPH LOAD FAILED —', err.message)
    console.error('Every /api/intelligence analysis endpoint will answer 503 until this')
    console.error('succeeds. Nothing is served from stand-in data.')
    console.error('='.repeat(78))
  })

app.use(errorHandler)

console.log("4. Routes loaded")

const PORT = process.env.PORT || 3000
orgGuardCheck.then((result) => {
  if (!result.ok) {
    console.error('Refusing to start — see the SINGLE-TENANT ASSUMPTION VIOLATED banner above.')
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log("Server running on port", PORT)
  })
})
