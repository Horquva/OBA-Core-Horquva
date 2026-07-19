const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('dependencies')
    .select(`
      id,
      dependency_type,
      source:agent_source (id, name, status, risk),
      target:agent_target (id, name, status, risk)
    `)

  if (error) return res.status(500).json({ error: error.message })

  const critical = data.filter(d => d.dependency_type === 'critical')
  res.json({ total: data.length, critical: critical.length, dependencies: data })
})

module.exports = router