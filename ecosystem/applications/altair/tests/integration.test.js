import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 3137;
let child;

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not start");
}

test.before(async () => {
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, ALTAIR_PORT: String(port), ALTAIR_HOST: "127.0.0.1" },
    stdio: "ignore",
  });
  await waitForHealth();
});

test.after(() => child?.kill("SIGTERM"));

test("login establishes a persistent HttpOnly session", async () => {
  const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ALTAIR_DEMO_EMAIL || "admin@altair.local", password: process.env.ALTAIR_DEMO_PASSWORD || "AltairDemo123!" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /altair_session=.*HttpOnly/);

  const token = cookie.match(/altair_session=([^;]+)/)[1];
  const me = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
    headers: { cookie: `altair_session=${token}` },
  });
  assert.equal(me.status, 200);
  const payload = await me.json();
  assert.equal(payload.user.role, process.env.ALTAIR_DEMO_ROLE || "admin");
});

test("unauthenticated workflow access is rejected", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/workflows`);
  assert.equal(response.status, 401);
});

test("workflow initiation is asynchronous and idempotent", async () => {
  const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.ALTAIR_DEMO_EMAIL || "admin@altair.local", password: process.env.ALTAIR_DEMO_PASSWORD || "AltairDemo123!" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const key = `test-${Date.now()}`;
  const input = { inputs: { release_tag: "v-test", target_environment: "production" } };

  const first = await fetch(`http://127.0.0.1:${port}/api/workflows/wf-promote-rc/execute`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, "idempotency-key": key },
    body: JSON.stringify(input),
  });
  const firstBody = await first.json();
  assert.equal(first.status, 202);

  const second = await fetch(`http://127.0.0.1:${port}/api/workflows/wf-promote-rc/execute`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, "idempotency-key": key },
    body: JSON.stringify(input),
  });
  const secondBody = await second.json();
  assert.equal(second.status, 200);
  assert.equal(secondBody.executionId, firstBody.executionId);
  assert.equal(secondBody.idempotentReplay, true);

  let status = null;
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const execution = await fetch(`http://127.0.0.1:${port}/api/executions/${firstBody.executionId}`, { headers: { cookie } });
    const executionBody = await execution.json();
    status = executionBody.execution.status;
    if (status === "pending_approval") break;
  }
  assert.equal(status, "pending_approval");
});
