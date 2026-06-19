console.log("1. File started")

const express = require('express')
const cors = require('cors')
require('dotenv').config()

console.log("2. Packages loaded")

const app = express()

app.use(cors())
app.use(express.json())

console.log("3. Middlewares added")

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
app.use('/api/verification', require('./routes/verification/index'))
app.use('/api/orchestration', require('./routes/orchestration/index'))
console.log("4. Routes loaded")

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})