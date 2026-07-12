const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { authenticate } = require('../../middleware/authMiddleware')

// ── POST /api/workspaces ──────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, organization_id } = req.body

    if (!name || !organization_id) {
      return res.status(400).json({ error: 'name and organization_id are required' })
    }

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, organization_id })
      .select()
      .single()

    if (error) throw new Error(error.message)

    res.status(201).json({ workspace: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/workspaces/:organization_id ──────────────────────────────────
router.get('/:organization_id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('organization_id', req.params.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    res.json({ workspaces: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router