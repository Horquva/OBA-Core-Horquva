// Lists every GET reachable through index.js and its status. Read-only.
const fs = require('fs'), path = require('path')
const idx = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8')
const mounts = [...idx.matchAll(/app\.use\(\s*'(\/api[^']*)'\s*,\s*require\('([^']+)'\)\s*\)/g)]
const seen = new Set(), gets = []
const resolve = (f) => {
  const p = path.join(__dirname, '..', f.replace(/^\.\//, ''))
  return fs.existsSync(p) && fs.statSync(p).isFile() ? p
    : fs.existsSync(p + '.js') ? p + '.js'
      : fs.existsSync(path.join(p, 'index.js')) ? path.join(p, 'index.js') : null
}
const scan = (base, file) => {
  const real = resolve(file); if (!real || seen.has(base + real)) return
  seen.add(base + real)
  const src = fs.readFileSync(real, 'utf8')
  for (const m of src.matchAll(/router\.get\(\s*'([^']*)'/g)) gets.push(base + (m[1] === '/' ? '' : m[1]))
  for (const m of src.matchAll(/router\.use\(\s*'([^']*)'\s*,\s*require\('([^']+)'\)\s*\)/g))
    scan(base + m[1], './' + path.posix.join(path.dirname(real).split(path.sep).slice(-2).join('/'), m[2]))
}
mounts.forEach((m) => scan(m[1], m[2]))

// Every route this sweeps sits behind index.js's global requireAuth gate, so
// pinging without a session used to report 401 for every single route -- the
// sweep's actual pass/fail signal was permanently masked by the auth gate it
// never authenticated past. Logs in with ADMIN_EMAIL/ADMIN_PASSWORD (same
// fallback account tests/api.smoke.test.js uses) and carries the resulting
// httpOnly session cookie on each request, same as a real authenticated caller.
async function sessionCookie() {
  const email = process.env.ADMIN_EMAIL, pass = process.env.ADMIN_PASSWORD
  if (!email || !pass) {
    console.error('ADMIN_EMAIL/ADMIN_PASSWORD not set -- every route below will 401.\n')
    return null
  }
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  }).catch(() => null)
  if (!res || !res.ok) {
    console.error('login failed -- every route below will 401.\n')
    return null
  }
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean)
  const pair = raw.map((c) => c.split(';')[0]).find((c) => c.startsWith('horquva_session='))
  return pair || null
}

;(async () => {
  const cookie = await sessionCookie()
  let ok = 0
  for (const p of [...new Set(gets)].sort()) {
    const r = await fetch('http://localhost:3000' + p, { headers: cookie ? { Cookie: cookie } : {} }).catch(() => ({ status: 0 }))
    if (r.status === 200) ok++; else console.log(r.status, p)
  }
  console.log(`\n200: ${ok} / ${new Set(gets).size}`)
})()
