// run_migrations.js — Execute SQL migrations via Supabase JS client
// Splits each migration file into individual statements and runs them

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Split SQL into individual statements (split on ';' + newline)
function splitStatements(sql) {
  return sql
    .replace(/--.*$/gm, '')          // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

async function runMigration(filename) {
  const filePath = path.join(__dirname, 'sql', filename)
  const sql = fs.readFileSync(filePath, 'utf8')
  const statements = splitStatements(sql)
  
  console.log(`\n=== ${filename}: ${statements.length} statements ===`)
  
  let passed = 0
  let failed = 0
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue
    
    try {
      // Use rpc to run raw SQL — requires the 'exec_sql' function OR
      // we use the pg connection via the service role
      const { error } = await supabase.rpc('exec_sql', { sql_text: stmt + ';' })
      
      if (error) {
        // Try direct query approach if RPC not available
        console.error(`  [${i+1}] FAILED: ${error.message}`)
        console.error(`  Statement: ${stmt.slice(0, 100)}...`)
        failed++
      } else {
        console.log(`  [${i+1}] OK`)
        passed++
      }
    } catch (err) {
      console.error(`  [${i+1}] ERROR: ${err.message}`)
      failed++
    }
  }
  
  console.log(`  => ${passed} passed, ${failed} failed`)
  return failed === 0
}

async function main() {
  console.log('Running migrations...')
  await runMigration('03_fizza_modules_schema.sql')
  await runMigration('04_fizza_modules_seed.sql')
  console.log('\nDone.')
}

main().catch(console.error)
