const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_KEY

let supabase

if (url && key) {
  // Normal path — credentials present, behaves exactly as before.
  supabase = createClient(url, key)
} else {
  // Resilient path — no credentials in .env.
  // The server still boots so non-Supabase routes (e.g. /api/intelligence/*)
  // keep working. Supabase-backed routes throw only when actually called,
  // and their try/catch returns a clean 500 instead of crashing the process.
  console.warn(
    '\u26A0  SUPABASE_URL / SUPABASE_KEY not set in backend/.env — ' +
    'Supabase-backed routes will return an error until configured. ' +
    'Non-Supabase routes (e.g. /api/intelligence/*) still work.'
  )
  const notConfigured = () => {
    throw new Error(
      'Supabase not configured: set SUPABASE_URL and SUPABASE_KEY in backend/.env'
    )
  }
  // Proxy so any call like supabase.from('x').select(...) throws lazily
  // (inside the route handler's try/catch) instead of at startup.
  supabase = new Proxy({}, {
    get() {
      return () => notConfigured()
    },
  })
}

module.exports = supabase
