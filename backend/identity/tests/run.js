/*
 * Minimal test runner for the identity platform. Discovers *.test.js files in this
 * directory and runs every exported async function as a test case. Exits non-zero
 * on any failure (usable as a CI gate).
 */
const fs = require('fs')
const path = require('path')
const { pool } = require('../db/pool')

async function main() {
  const dir = __dirname
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort()
  let pass = 0
  let fail = 0
  const failures = []

  for (const file of files) {
    const suite = require(path.join(dir, file))
    for (const [name, fn] of Object.entries(suite)) {
      try {
        await fn()
        console.log(`  ✓ ${file} › ${name}`)
        pass++
      } catch (e) {
        console.error(`  ✗ ${file} › ${name}\n      ${e.message}`)
        failures.push(`${file} › ${name}`)
        fail++
      }
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  await pool.end()
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('test runner error:', e.message)
  process.exit(1)
})
