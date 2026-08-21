import { spawn } from "node:child_process";
import process from "node:process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];
let shuttingDown = false;

function run(label, args) {
  const child = spawn(npm, args, {
    stdio: "inherit",
    shell: false,
    cwd: process.cwd(),
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (!shuttingDown && code !== 0 && signal !== "SIGINT") {
      console.error(`${label} stopped with code ${code ?? "unknown"}.`);
      shutdown(code || 1);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGINT");
  }
  setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting Altair API + worker and Vite frontend...");
run("API", ["run", "server"]);
run("Vite", ["run", "dev"]);
