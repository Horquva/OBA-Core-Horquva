console.log("1. File started")

const path = require('path')
const express = require('express')
const cors = require('cors')
// Load backend/.env no matter where the process is started from.
require('dotenv').config({ path: path.join(__dirname, '.env') })
const agentConfig = require('./agent/config')

console.log("2. Packages loaded")

const app = express()

// Render (and any platform fronting this app with a reverse proxy) terminates
// the client connection itself and forwards the real client IP in
// X-Forwarded-For. Express ignores that header by default, so req.ip resolves
// to the proxy's own IP for every single request -- every caller landed in
// the same rate-limit bucket (middleware/rateLimit.js keys on req.ip), so one
// abusive client could exhaust the shared bucket and lock out everyone else
// behind the same proxy. `1` trusts exactly one hop (Render's edge), which is
// also correct locally: with no proxy in front, there is no X-Forwarded-For
// to trust and req.ip falls back to the direct socket address as before.
app.set('trust proxy', 1)

// SEC-1: security headers first, so every response — including CORS
// rejections and errors — carries them.
app.use(require('./middleware/securityHeaders'))

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
  // SEC-2: the session is an httpOnly cookie, so the browser must be allowed
  // to send it cross-origin. Safe only because `origin` above is an allowlist,
  // never '*'.
  credentials: true,
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
function reportAgentBootState() {
  if (!agentConfig.enabled) {
    console.log('Organizational Agent: disabled by AGENT_ENABLED=false')
    return
  }

  const readinessError = agentConfig.readinessError()

  if (readinessError) {
    console.error('='.repeat(78))
    console.error('Organizational Agent: PROVIDER NOT READY')
    console.error(readinessError)
    console.error('Agent routes will remain unmounted.')
    console.error('The rest of the API will continue normally.')
    console.error('='.repeat(78))
    return
  }

  console.log('Organizational Agent: provider configuration ready')
}

reportAgentBootState()

// Auth endpoints stay reachable without a token — register and login have to
// be. Everything else in that router gates itself per-route (GET /me, POST
// /logout, POST /change-password all name requireAuth), because mounting here
// puts the whole router above the global gate below.
app.use('/api/auth', require('./routes/auth/auth'))

// Tenant health at boot (Phase 1.2): with org_id on every business table and
// per-request scoping in lib/tenant.js, a second organization is now SUPPORTED,
// not a boot failure. assertSingleTenant() is kept as a loud informational
// report — multi-org data isolation is real, so the old process.exit(1) is gone.
require('./lib/orgGuard').assertSingleTenant()

// Everything else under /api touches real org data — require a valid bearer token,
// then bind the request to its tenant (Phase 1.2): runWithTenant resolves the
// token's org slug to an orgs.id, stores it in the AsyncLocalStorage request
// context that lib/tenant.js's applyOrgScope() reads everywhere, and mirrors it
// on req.orgId. An unknown org slug is a hard 403; an unreachable orgs table
// degrades to unscoped single-tenant mode with a warning.
app.use('/api', requireAuth)
app.use('/api', require('./lib/tenant').runWithTenant)
app.use('/api/agent', require('./routes/agent'))

app.use('/api/audit-log', require('./routes/auditLog'))
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
app.use('/api/simulations/reassign',        require('./routes/simulations/reassign'))
app.use('/api/human-agent-map',             require('./routes/humanAgentMap'))
app.use('/api/tools',             require('./routes/tools'))
app.use('/api/tool-intelligence', require('./routes/toolIntelligence'))
app.use('/api/workflows', require('./routes/workflows/index'))
app.use('/api/knowledge/intelligence', require('./routes/knowledge/intelligence'))
app.use('/api/knowledge/gaps',         require('./routes/knowledge/gaps'))
app.use('/api/memory', require('./routes/memory/memory'))
app.use('/api/continuity', require('./routes/continuity/continuity'))
app.use('/api/intelligence/truth', require('./routes/truth/truth'))
app.use('/api/verification', require('./routes/verification/intelligence'))
app.use('/api/intelligence/brain-core', require('./routes/intelligence/brainCore'))
app.use('/api/orchestration', require('./routes/orchestration/orchestration'))
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
app.use('/api/intelligence', require('./routes/intelligence/reality'))
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
    // Phase 1.7: transient failures retry inside loadGraph already; a total
    // boot failure self-retries in the background instead of staying down
    // until a human restarts the container.
    const brain = require('./brain')
    let bootRetries = 0
    const retryBootLoad = () => {
      if (bootRetries >= 5) {
        console.error('Organizational Brain: giving up after 5 boot retries — use POST /api/intelligence/prediction/graph/reload once Supabase is reachable.')
        return
      }
      bootRetries++
      setTimeout(() => {
        brain.loadGraph()
          .then((stats) => console.log('Organizational Brain: graph loaded on boot retry', bootRetries, '—', JSON.stringify(stats)))
          .catch(retryBootLoad)
      }, 30_000 * bootRetries)
    }
    retryBootLoad()
  })

app.use(errorHandler)

console.log("4. Routes loaded")

const PORT = process.env.PORT || 3000
// Phase 1.2: multi-org data is now isolated per request, so a second org in
// app_users is a supported state, not a refusal to boot. The guard's report
// is logged when it resolves; the server listens regardless.
orgGuardCheck.then((result) => {
  if (result.ok && result.orgs.length > 1) {
    console.log(`Tenant mode: ${result.orgs.length} organizations served with per-request isolation.`)
  }
  app.listen(PORT, () => {
    console.log("Server running on port", PORT)
  })
}).catch(() => {
  // The report is best-effort; never let it block listening.
  app.listen(PORT, () => {
    console.log("Server running on port", PORT)
  })
})


