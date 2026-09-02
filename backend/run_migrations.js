// run_migrations.js — apply SQL migrations to Postgres, in order, exactly once.
//
//   node run_migrations.js              apply everything not yet applied
//   node run_migrations.js --dry-run    list what would run, change nothing
//   node run_migrations.js --baseline   record every file as applied WITHOUT running it
//
// Requires DATABASE_URL (Supabase: Project Settings -> Database -> Connection string -> URI).
//
// Order: schema.sql first, then sql/*.sql sorted by filename.
// Applied files are recorded in schema_migrations so re-running is safe. This
// matters because 01_schema_migration.sql uses bare CREATE TABLE and the seed
// files use bare INSERT — running either twice fails or duplicates rows.
//
// On a database that already has tables (created before this runner worked),
// run --baseline ONCE to record the existing files, then normal runs apply only
// what is new.

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const BASELINE = process.argv.includes('--baseline')

/** schema.sql first — it defines escalation_logs, verification_logs,
 *  orchestration_state, execution_intents and execution_mode, which exist
 *  nowhere else — then sql/*.sql in filename order. */
function migrationFiles() {
  const files = []
  const root = path.join(__dirname, 'schema.sql')
  if (fs.existsSync(root)) files.push({ name: 'schema.sql', path: root })

  const dir = path.join(__dirname, 'sql')
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      files.push({ name: f, path: path.join(dir, f) })
    }
  }
  return files
}

async function ensureLedger(client) {
  await client.query(`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `)
}

async function applied(client) {
  const { rows } = await client.query('select filename from schema_migrations')
  return new Set(rows.map((r) => r.filename))
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not set.\n\n' +
      'Supabase: Project Settings -> Database -> Connection string -> URI.\n' +
      'Add it to backend/.env as DATABASE_URL=postgresql://...\n\n' +
      'Note: SUPABASE_KEY is a PostgREST API key and cannot execute DDL.'
    )
    process.exit(1)
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  try {
    await ensureLedger(client)
    const done = await applied(client)
    const pending = migrationFiles().filter((f) => !done.has(f.name))

    if (!pending.length) {
      console.log('Nothing to apply — all migrations recorded.')
      return
    }

    console.log(`${pending.length} pending: ${pending.map((f) => f.name).join(', ')}\n`)

    if (DRY_RUN) {
      console.log('--dry-run: nothing was changed.')
      return
    }

    if (BASELINE) {
      for (const f of pending) {
        await client.query(
          'insert into schema_migrations (filename) values ($1) on conflict do nothing',
          [f.name]
        )
        console.log(`  recorded (not run)  ${f.name}`)
      }
      console.log('\nBaseline complete. Future runs apply only new files.')
      return
    }

    // Each file runs inside one transaction: it applies completely or not at
    // all, and a half-applied file never gets recorded as done.
    for (const f of pending) {
      const sql = fs.readFileSync(f.path, 'utf8')
      process.stdout.write(`  ${f.name} ... `)
      try {
        await client.query('begin')
        await client.query(sql)
        await client.query(
          'insert into schema_migrations (filename) values ($1)',
          [f.name]
        )
        await client.query('commit')
        console.log('OK')
      } catch (err) {
        await client.query('rollback')
        console.log('FAILED')
        console.error(`\n${f.name}: ${err.message}\n`)
        console.error('Nothing from this file was applied. Fix it and re-run.')
        process.exitCode = 1
        return
      }
    }

    console.log('\nAll migrations applied.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
