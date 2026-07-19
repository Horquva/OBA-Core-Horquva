const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('risk')

  if (error) return res.status(500).json({ error: error.message })

  const weights = { critical: 40, high: 20, medium: 10, low: 5 }
  const maxScore = 100

  const raw = data.reduce((sum, a) => sum + (weights[a.risk] || 0), 0)
  const score = Math.min(Math.round((raw / (data.length * 40)) * 100), maxScore)

  const breakdown = {
    critical: data.filter(a => a.risk === 'critical').length,
    high:     data.filter(a => a.risk === 'high').length,
    medium:   data.filter(a => a.risk === 'medium').length,
    low:      data.filter(a => a.risk === 'low').length,
  }

  res.json({ score, breakdown })
})

module.exports = router