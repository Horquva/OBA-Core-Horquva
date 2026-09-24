console.log("1. File started")

const path = require('path')
const express = require('express')
const cors = require('cors')

// --- Naye Packages ---
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });
// ---------------------

// Load backend/.env no matter where the process is started from.
require('dotenv').config({ path: path.join(__dirname, '.env') })

console.log("2. Packages loaded")

const app = express()

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
}))
app.use(express.json())

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Horquva OBA Core API',
    status: 'running',
    message: 'Organizational Brain backend is live. This is a JSON API, not a web page.',
    endpoints: {
      health: '/api/health/summary',
      authLogin: 'POST /api/auth/login',
    },
  })
})

const { requestLogger, errorHandler } = require('./middleware/validate')

console.log("3. Middlewares added")

app.use(requestLogger)

// ─── WD-01: Spreadsheet Upload Route ───
// Isey auth se pehle rakha hai taake bina login test ho sake
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Koi file upload nahi hui!" });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log("Uploaded Spreadsheet Data:", sheetData);

        res.json({
            message: "File successfully parse ho gayi!",
            totalRows: sheetData.length,
            data: sheetData
        });

    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ error: "File process karne mein masla aaya." });
    }
});
// ───────────────────────────────────────

const { requireAuth } = require('./middleware/auth')

app.use('/api/auth', require('./routes/auth/auth'))

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