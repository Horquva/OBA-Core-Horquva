/*
 * Sentinel Identity & Trust — standalone service entrypoint (Owner: Areeb Ahmad).
 *
 * Runs the identity platform as a dedicated service exposing ONLY /api/v1, with no
 * dependency on the OBA Brain or Supabase. This is what the container image runs so
 * other Sentinel platforms (AI Security, Infra, Flutter) can reach identity at a
 * stable base URL. For the combined dev backend, `node index.js` still mounts the
 * same /api/v1 router into the main app.
 */
const express = require('express')
const config = require('./config')
const { healthcheck } = require('./db/pool')

const app = express()
app.disable('x-powered-by')
app.use(express.json())
try { app.use(require('cors')()) } catch (_) { /* cors optional */ }

app.get('/', (req, res) => {
  res.json({ service: 'sentinel-identity', status: 'operational', api: config.api.prefix })
})
app.use(config.api.prefix, require('./api/v1'))

const port = process.env.PORT || 3000
async function main() {
  // Fail fast if the database is unreachable at boot (fail-closed posture).
  try {
    await healthcheck()
  } catch (err) {
    console.error('[identity] database unreachable at startup:', err.message)
    process.exit(1)
  }
  app.listen(port, () => {
    console.log(`Sentinel Identity & Trust listening on :${port} (${config.api.prefix}) [alg=${config.jwt.algorithm}]`)
  })
}

main()
