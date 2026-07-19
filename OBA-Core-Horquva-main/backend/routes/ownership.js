const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('owners')
    .select(`
      id,
      name,
      role,
      backup_owner,
      risk,
      agents (id, name, status, risk)
    `)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

module.exports = router