const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/dependencies — full dependency graph with analysis
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('dependencies')
    .select(`
      id,
      source_id,
      target_id,
      source_type,
      target_type,
      dependency_type,
      strength,
      agent_source:agents!dependencies_agent_source_fkey (id, name, status, risk),
      agent_target:agents!dependencies_agent_target_fkey (id, name, status, risk)
    `)

  if (error) return res.status(500).json({ error: error.message })

  const critical = data.filter(d => d.dependency_type === 'critical')
  const high     = data.filter(d => d.dependency_type === 'high')

  // Hub detection: count how many dependencies each node has
  const nodeCounts = {}
  data.forEach(d => {
    const sourceKey = `${d.source_type}:${d.source_id}`
    const targetKey = `${d.target_type}:${d.target_id}`
    nodeCounts[sourceKey] = (nodeCounts[sourceKey] || 0) + 1
    nodeCounts[targetKey] = (nodeCounts[targetKey] || 0) + 1
  })

  const hubs = Object.entries(nodeCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const [type, id] = key.split(':')
      return { type, id: parseInt(id), connectionCount: count }
    })

  res.json({
    total:    data.length,
    critical: critical.length,
    high:     high.length,
    hubs,
    dependencies: data
  })
})

module.exports = router