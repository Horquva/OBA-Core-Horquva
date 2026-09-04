const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/employees — flat directory list (id, name, role, department)
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('employees').select('id, name, role, department')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

module.exports = router
