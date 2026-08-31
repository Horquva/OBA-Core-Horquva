const path = require('path')
const { createClient } = require('@supabase/supabase-js')
// Always load backend/.env regardless of the current working directory
// (so `node backend/index.js` from the repo root works too).
require('dotenv').config({ path: path.join(__dirname, '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

module.exports = supabase