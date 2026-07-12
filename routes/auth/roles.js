const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { authenticate, authorize } = require('../../middleware/authMiddleware')

// ── POST /api/roles/assign ────────────────────────────────────────────────
router.post('/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { user_id, organization_id, workspace_id, role } = req.body

    if (!user_id || !organization_id || !role) {
      return res.status(400).json({ error: 'user_id, organization_id, role are required' })
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert({ user_id, organization_id, workspace_id, role })
      .select()
      .single()

    if (error) throw new Error(error.message)

    res.status(201).json({ userRole: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/roles/user/:user_id ──────────────────────────────────────────
router.get('/user/:user_id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id, role, created_at,
        organizations ( id, name, slug ),
        workspaces ( id, name )
      `)
      .eq('user_id', req.params.user_id)

    if (error) throw new Error(error.message)

    res.json({ roles: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router