// Tiny launcher that avoids shell-quoting pitfalls. Usage: node run-pw.cjs <arg>... 
const { spawnSync } = require('child_process');
const path = require('path');
const root = __dirname;
const args = process.argv.slice(2);
const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const res = spawnSync(process.execPath, [cli, ...args], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(res.status ?? 1);