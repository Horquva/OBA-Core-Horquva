const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../../supabase')

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, organization } = req.body

    if (!name || !email || !password || !organization) {
      return res.status(400).json({ error: 'name, email, password, organization are required' })
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password: hashedPassword, organization, role: 'user' })
      .select('id, name, email, organization, role')
      .single()

    if (error) throw new Error(error.message)

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, organization: user.organization },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password, organization, role')
      .eq('email', email)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, organization: user.organization },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _, ...safeUser } = user

    res.json({ token, user: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'No token provided' })

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, organization, role')
      .eq('id', decoded.id)
      .single()

    if (error || !user) return res.status(404).json({ error: 'User not found' })

    res.json({ user })
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    res.status(500).json({ error: err.message })
  }
})

module.exports = router