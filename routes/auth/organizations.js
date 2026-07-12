const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { authenticate } = require('../../middleware/authMiddleware')

// ── POST /api/organizations/register ─────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, slug, plan } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' })
    }

    // Check slug unique
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' })
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, slug, plan: plan ?? 'starter' })
      .select()
      .single()

    if (error) throw new Error(error.message)

    res.status(201).json({ organization: org })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/organizations ────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    res.json({ organizations: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/organizations/:slug ──────────────────────────────────────────
router.get('/:slug', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id, name, slug, plan, created_at,
        workspaces ( id, name, created_at )
      `)
      .eq('slug', req.params.slug)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    res.json({ organization: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router