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
;(async () => {
  let ok = 0
  for (const p of [...new Set(gets)].sort()) {
    const r = await fetch('http://localhost:3000' + p).catch(() => ({ status: 0 }))
    if (r.status === 200) ok++; else console.log(r.status, p)
  }
  console.log(`\n200: ${ok} / ${new Set(gets).size}`)
})()
