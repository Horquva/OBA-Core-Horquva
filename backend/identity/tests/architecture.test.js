/*
 * Architecture boundary (doc §3D): services must NOT bypass the repository layer.
 * They may compose repositories and control transactions, but must not run raw
 * SQL or import the pg driver directly.
 */
const fs = require('fs')
const path = require('path')
const { assert } = require('./helpers')

async function servicesDoNotBypassRepositories() {
  const dir = path.join(__dirname, '..', 'services')
  if (!fs.existsSync(dir)) return
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8')
    assert(!/\.query\s*\(/.test(src), `service ${file} runs raw SQL (.query) — must go through repositories`)
    assert(!/require\(['"]pg['"]\)/.test(src), `service ${file} imports pg directly — must use the repository layer`)
  }
}

module.exports = { 'services do not bypass the repository layer': servicesDoNotBypassRepositories }
