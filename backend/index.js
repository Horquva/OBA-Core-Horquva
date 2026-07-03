console.log("1. File started")

const express = require('express')
const cors = require('cors')
require('dotenv').config()

console.log("2. Packages loaded")

const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))

console.log("3. Middlewares added")

// ── Reality Layer (Huzaifa: M01–M08, M19, M20) ──
app.use('/api/agents', require('./routes/agents'))
app.use('/api/ownership', require('./routes/ownership'))
app.use('/api/dependencies', require('./routes/dependencies'))
app.use('/api/risks', require('./routes/risks'))
app.use('/api/dashboard', require('./routes/dashboard'))
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

// ── Kamran's Continuity + Governance Intelligence read APIs (M18, M19) ──
app.use('/api/continuity', require('./routes/continuity/continuity'))          // M18 (read)
app.use('/api/governance', require('./routes/governance/governance'))          // M19 (read)

// ── Anusha's Interaction + Automation Layer (M15, M16, M21, M23, M51, M52, M53) ──
app.use('/api/verification', require('./routes/verification/index'))           // M15
app.use('/api/orchestration', require('./routes/orchestration/index'))         // M16
app.use('/api/avatar', require('./routes/avatar/index'))                       // M21
app.use('/api/briefing', require('./routes/briefing/index'))                   // M23
app.use('/api/self-healing', require('./routes/selfHealing/index'))            // M51
app.use('/api/automation/governance', require('./routes/governance/index'))    // M52 (automation)
app.use('/api/automation/continuity', require('./routes/continuity/index'))    // M53 (automation)

// ── Huzaifa's Voice Intelligence (M22) ──
app.use('/api/voice', require('./routes/voice/index'))                         // M22

// ── Kamran's Phase 6 Constitutional Intelligence & Meta-Brain (M36, M38, M39, M40, M46, M48, M50, M54, M55) ──
app.use('/api/intelligence', require('./routes/intelligence/constitutional'))

console.log("4. Routes loaded")

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})
