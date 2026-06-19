const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, name, role, department, risk,
      employee_agent (
        role,
        agents (
          id, name, status, risk,
          agent_platform (
            ai_platforms ( id, name, type, status )
          ),
          workflow_dependencies (
            is_critical,
            workflows ( id, name, status, risk )
          )
        )
      )
    `)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

module.exports = router