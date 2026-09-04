/*
 * Sentinel Identity & Trust — formal migration runner (Owner: Areeb Ahmad).
 *
 * Migration files live in identity/migrations/NNN_name.sql with two sections:
 *     -- +migrate up
 *     <forward SQL>
 *     -- +migrate down
 *     <rollback SQL>
 *
 * Applied migrations are tracked in schema_migrations (version, name, checksum,
 * applied_at). Checksums give us drift detection: if an already-applied file is
 * edited on disk, `validate` fails — enforcing "no uncontrolled manual schema
 * changes." Each migration applies inside its own transaction.
 *
 * Commands:
 *   up              apply all pending migrations
 *   down            roll back the most recently applied migration
 *   status          show applied vs pending
 *   validate        verify applied migrations match on-disk checksums (CI gate)
 *   create <name>   scaffold a new migration file
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const db = require('./pool')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')

function listFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort()
}
const versionOf = (file) => file.split('_')[0]
const checksum = (content) => crypto.createHash('sha256').update(content).digest('hex')

function parseSections(content) {
  const up = content.match(/--\s*\+migrate\s+up([\s\S]*?)(?=--\s*\+migrate\s+down|$)/i)
  const down = content.match(/--\s*\+migrate\s+down([\s\S]*)$/i)
  return { up: up ? up[1].trim() : '', down: down ? down[1].trim() : '' }
}

async function ensureTable() {
  await db.query(`
    create table if not exists schema_migrations (
      version    text primary key,
      name       text not null,
      checksum   text not null,
      applied_at timestamptz not null default now()
    )
  `)
}

async function appliedMap() {
  const { rows } = await db.query(
    'select version, name, checksum, applied_at from schema_migrations order by version'
  )
  return new Map(rows.map((r) => [r.version, r]))
}

async function cmdStatus() {
  await ensureTable()
  const applied = await appliedMap()
  const files = listFiles()
  console.log('Migration status:')
  for (const f of files) {
    console.log(`  [${applied.has(versionOf(f)) ? 'APPLIED' : 'pending'}] ${f}`)
  }
  const orphans = [...applied.keys()].filter((v) => !files.some((f) => versionOf(f) === v))
  if (orphans.length) console.log('  ! applied but missing on disk:', orphans.join(', '))
}

async function cmdUp() {
  await ensureTable()
  const applied = await appliedMap()
  let count = 0
  for (const f of listFiles()) {
    const v = versionOf(f)
    if (applied.has(v)) continue
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')
    const { up } = parseSections(content)
    if (!up) {
      console.log(`  skip ${f} (no up section)`)
      continue
    }
    process.stdout.write(`  applying ${f} ... `)
    await db.withTransaction(async (client) => {
      await client.query(up)
      await client.query(
        'insert into schema_migrations(version, name, checksum) values ($1, $2, $3)',
        [v, f, checksum(content)]
      )
    })
    console.log('OK')
    count++
  }
  console.log(count ? `Applied ${count} migration(s).` : 'Already up to date.')
}

async function cmdDown() {
  await ensureTable()
  const { rows } = await db.query(
    'select version, name from schema_migrations order by version desc limit 1'
  )
  if (!rows.length) {
    console.log('Nothing to roll back.')
    return
  }
  const { version, name } = rows[0]
  const file = path.join(MIGRATIONS_DIR, name)
  if (!fs.existsSync(file)) throw new Error(`cannot roll back ${name}: file missing on disk`)
  const { down } = parseSections(fs.readFileSync(file, 'utf8'))
  process.stdout.write(`  rolling back ${name} ... `)
  await db.withTransaction(async (client) => {
    if (down) await client.query(down)
    await client.query('delete from schema_migrations where version = $1', [version])
  })
  console.log('OK')
}

async function cmdValidate() {
  await ensureTable()
  const applied = await appliedMap()
  const files = listFiles()
  let problems = 0
  for (const [v, rec] of applied) {
    const f = files.find((x) => versionOf(x) === v)
    if (!f) {
      console.error(`  DRIFT: applied migration ${rec.name} is missing on disk`)
      problems++
      continue
    }
    const cs = checksum(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
    if (cs !== rec.checksum) {
      console.error(`  DRIFT: ${f} was modified after being applied (checksum mismatch)`)
      problems++
    }
  }
  if (problems) {
    console.error(`Validation FAILED: ${problems} problem(s).`)
    process.exitCode = 1
  } else {
    console.log(`Validation OK: ${applied.size} applied migration(s) match on-disk files.`)
  }
}

function cmdCreate(name) {
  if (!name) throw new Error('usage: migrate create <name>')
  const files = listFiles()
  const last = files.length ? parseInt(versionOf(files[files.length - 1]), 10) : 0
  const num = String(last + 1).padStart(3, '0')
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  if (!fs.existsSync(MIGRATIONS_DIR)) fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })
  const file = path.join(MIGRATIONS_DIR, `${num}_${safe}.sql`)
  fs.writeFileSync(file, '-- +migrate up\n\n\n-- +migrate down\n\n')
  console.log('Created', path.relative(process.cwd(), file))
}

async function main() {
  const [cmd, arg] = process.argv.slice(2)
  try {
    switch (cmd) {
      case 'up': await cmdUp(); break
      case 'down': await cmdDown(); break
      case 'status': await cmdStatus(); break
      case 'validate': await cmdValidate(); break
      case 'create': cmdCreate(arg); break
      default:
        console.log('usage: migrate <up|down|status|validate|create <name>>')
        process.exitCode = 2
    }
  } catch (err) {
    console.error('migration error:', err.message)
    process.exitCode = 1
  } finally {
    await db.pool.end()
  }
}

main()
