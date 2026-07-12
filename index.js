console.log("1. File started")

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

// ── Environment Validation ────────────────────────────────────────────────
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_KEY']
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key])
if (missingEnv.length > 0) {
  console.error('[STARTUP ERROR] Missing required environment variables:')
  missingEnv.forEach(key => console.error(`  - ${key}`))
  process.exit(1)
}
console.log('[STARTUP] Environment variables verified')

// ── Process Safety ────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err.message)
})
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message)
  process.exit(1)
})

console.log("2. Packages loaded")

const app = express()

// ── SECURITY: Helmet ──────────────────────────────────────────────────────
app.use(helmet())

// ── SECURITY: CORS ────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin} is not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// ── SECURITY: Rate Limiting ───────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again after 15 minutes.' }
})
app.use('/api/', globalLimiter)

// ── SECURITY: Request Size Limit ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

const { requestLogger, errorHandler } = require('./middleware/validate')

console.log("3. Middlewares added")
const apiVersion = require('./middleware/apiVersion')
app.use(apiVersion)

app.use(requestLogger)

app.use('/api/agents', require('./routes/agents'))
app.use('/api/ownership', require('./routes/ownership'))
app.use('/api/dependencies', require('./routes/dependencies'))
app.use('/api/risks', require('./routes/risks'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/data-quality', require('./routes/dataQuality'))
app.use('/api/simulations/employee-leaves', require('./routes/simulations/employeeLeaves'))
app.use('/api/simulations/agent-fails', require('./routes/simulations/agentFails'))
app.use('/api/simulations/platform-down', require('./routes/simulations/platformDown'))
app.use('/api/simulations/workflow-disruption', require('./routes/simulations/workflowDisruption'))
app.use('/api/human-agent-map', require('./routes/humanAgentMap'))
app.use('/api/tools', require('./routes/tools'))
app.use('/api/tool-intelligence', require('./routes/toolIntelligence'))
app.use('/api/tool-impact', require('./routes/toolImpact'))
app.use('/api/workflows', require('./routes/workflows/index'))
app.use('/api/knowledge/intelligence', require('./routes/knowledge/intelligence'))
app.use('/api/knowledge/impact', require('./routes/knowledge/impact'))
app.use('/api/knowledge/gaps', require('./routes/knowledge/gaps'))
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

// ── Chunk 07 ──────────────────────────────────────────────────────────────
require('./services/eventBus')
app.use('/api/graph', require('./routes/graph/graph'))
app.use('/api/events', require('./routes/events/events'))

// ── Chunk 08 ──────────────────────────────────────────────────────────────
app.use('/api/pattern-intelligence', require('./routes/patternIntelligence/patternIntelligence'))
app.use('/api/digital-twin', require('./routes/digitalTwin/digitalTwin'))

// ── Chunk 09 ──────────────────────────────────────────────────────────────
app.use('/api/simulations/history', require('./routes/simulations/history'))
app.use('/api/capabilities', require('./routes/capabilities/capabilities'))
app.use('/api/intelligence/registry-bridge', require('./routes/intelligence/registryBridge'))
app.use('/api/auth',          require('./routes/auth/auth'))
app.use('/api/organizations', require('./routes/auth/organizations'))
app.use('/api/workspaces',    require('./routes/auth/workspaces'))
app.use('/api/roles',         require('./routes/auth/roles'))
// ── API v1 versioned endpoints ────────────────────────────────────────────
app.use('/api/v1/auth',          require('./routes/auth/auth'))
app.use('/api/v1/organizations', require('./routes/auth/organizations'))
app.use('/api/v1/workspaces',    require('./routes/auth/workspaces'))
app.use('/api/v1/roles',         require('./routes/auth/roles'))
app.use('/api/v1/dashboard',     require('./routes/dashboard'))
app.use('/api/v1/agents',        require('./routes/agents'))

const { run: registerCapabilities } = require('./scripts/registerCapabilities')
registerCapabilities().catch(err => console.error('[CapabilityRegistry] Startup registration error:', err.message))

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' })
})

app.use(errorHandler)

console.log("4. Routes loaded")

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})