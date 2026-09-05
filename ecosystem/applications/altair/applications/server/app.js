import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { ensureStore, readStore, updateStore, id } from "./store.js";
import { ensureDemoUser, authenticate, logout, userFromToken, requirePermission } from "./auth.js";
import { addSseClient, publish } from "./realtime.js";
import { audit } from "./audit.js";
import { approveExecution, rejectExecution, retryExecution, cancelExecution, queueExecution } from "./engine.js";
import { runScheduledTriggers } from "./scheduler.js";
import { inc, snapshot } from "./metrics.js";

ensureStore();
ensureDemoUser();

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function send(res, status, body, extra = {}) {
  res.writeHead(status, { ...jsonHeaders, ...extra });
  res.end(JSON.stringify(body));
}

function cookieToken(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|; )altair_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(res, token, maxAgeSeconds) {
  res.setHeader("set-cookie", `altair_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`);
}

async function body(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

function auth(req, res, permission) {
  const user = userFromToken(cookieToken(req));
  if (!user) {
    send(res, 401, { error: "unauthenticated" });
    return null;
  }
  if (permission && !requirePermission(user, permission)) {
    send(res, 403, { error: "forbidden", permission });
    return null;
  }
  return user;
}

export function createTriggeredExecution(workflowId, inputs, actor, forcedId = null) {
  const state = readStore();
  const workflow = state.workflows.find((w) => w.id === workflowId);
  if (!workflow) return null;
  const execution = {
    id: forcedId || id("ex"),
    workflowId,
    status: "queued",
    initiator: actor,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentNodeId: "trigger",
    inputs: inputs || {},
    approval: workflow.approval.required ? { id: id("ap"), requiredRole: workflow.approval.approverRole, actor: null, decision: "pending", reason: null, decidedAt: null } : null,
    events: [],
    retryCount: 0,
    cancelRequested: false,
    nextStepIndex: 0,
    maxAttempts: 3,
  };
  updateStore((next) => {
    next.executions.unshift(execution);
    return next;
  });
  audit({ actor, type: "workflow.initiated", message: `${actor.name} initiated ${workflow.name}`, executionId: execution.id, workflowId });
  publish("execution.updated", execution);
  return execution;
}

function parsePath(req) {
  return new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname.split("/").filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  inc("httpRequests");
  const path = parsePath(req);
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": config.allowedOrigin, "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" });
    return res.end();
  }

  res.setHeader("access-control-allow-origin", config.allowedOrigin);
  res.setHeader("access-control-allow-credentials", "true");

  try {
    if (path[0] !== "api") return send(res, 404, { error: "not_found" });

    if (method === "GET" && path.join("/") === "api/health") {
      return send(res, 200, { ok: true, service: "altair-api" });
    }

    if (method === "POST" && path.join("/") === "api/auth/login") {
      const input = await body(req);
      const result = authenticate(input.email, input.password);
      if (!result) { inc("authFailures"); return send(res, 401, { error: "invalid_credentials" }); }
      setSessionCookie(res, result.token, Math.floor(config.sessionTtlMs / 1000));
      return send(res, 200, { user: result.user, expiresAt: result.expiresAt });
    }

    if (method === "POST" && path.join("/") === "api/auth/logout") {
      logout(cookieToken(req));
      setSessionCookie(res, "", 0);
      return send(res, 200, { ok: true });
    }

    if (method === "GET" && path.join("/") === "api/auth/me") {
      const user = userFromToken(cookieToken(req));
      return user ? send(res, 200, { user }) : send(res, 401, { error: "unauthenticated" });
    }

    if (method === "GET" && path.join("/") === "api/stream") {
      const user = auth(req, res);
      if (!user) return;
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": config.allowedOrigin });
      addSseClient(res);
      return;
    }

    if (method === "POST" && path[1] === "webhooks" && path[2]) {
      if (config.nodeEnv === "production" && !config.webhookSecret) return send(res, 503, { error: "webhook_secret_not_configured" });
      if (config.webhookSecret && req.headers["x-altair-webhook-secret"] !== config.webhookSecret) return send(res, 401, { error: "invalid_webhook_secret" });
      const workflowId = path[2];
      const workflow = readStore().workflows.find((w) => w.id === workflowId);
      if (!workflow || !String(workflow.trigger?.type || "").toLowerCase().includes("webhook")) return send(res, 409, { error: "workflow_is_not_webhook_triggered" });
      const input = await body(req);
      const execution = createTriggeredExecution(workflowId, input, { id: "webhook", name: "Webhook", role: "system" });
      if (!execution) return send(res, 404, { error: "workflow_not_found" });
      queueExecution(execution.id, 0, 1);
      return send(res, 202, { executionId: execution.id });
    }

    if (method === "POST" && path.join("/") === "api/events") {
      const input = await body(req);
      const workflow = readStore().workflows.find((w) => w.id === input.workflowId);
      if (!workflow) return send(res, 404, { error: "workflow_not_found" });
      if (!String(workflow.trigger?.type || "").toLowerCase().includes("event")) return send(res, 409, { error: "workflow_is_not_event_triggered" });
      const execution = createTriggeredExecution(input.workflowId, input.payload || {}, { id: "event", name: "Event Bus", role: "system" });
      queueExecution(execution.id, 0, 1);
      return send(res, 202, { executionId: execution.id });
    }

    const user = auth(req, res);
    if (!user) return;

    if (method === "GET" && path.join("/") === "api/workflows") {
      if (!requirePermission(user, "workflow:read")) return send(res, 403, { error: "forbidden" });
      return send(res, 200, { workflows: readStore().workflows });
    }

    if (method === "GET" && path[1] === "workflows" && path[3] === "versions") {
      if (!requirePermission(user, "workflow:read")) return send(res, 403, { error: "forbidden" });
      const versions = readStore().workflowVersions.filter((v) => v.workflowId === path[2]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, { versions });
    }

    if (method === "POST" && path[1] === "workflows" && path[3] === "versions") {
      if (!requirePermission(user, "workflow:write")) return send(res, 403, { error: "forbidden" });
      const input = await body(req);
      const state = readStore();
      const current = state.workflows.find((w) => w.id === path[2]);
      if (!current) return send(res, 404, { error: "workflow_not_found" });
      const definition = { ...current, ...input.definition, id: current.id };
      const previous = current.version.split(".").map(Number);
      const version = input.version || `${previous[0]}.${previous[1]}.${(previous[2] || 0) + 1}`;
      definition.version = version;
      updateStore((next) => {
        const workflow = next.workflows.find((w) => w.id === current.id);
        Object.assign(workflow, definition);
        next.workflowVersions.push({
          id: id("wfv"),
          workflowId: current.id,
          version,
          status: input.status || "draft",
          createdAt: new Date().toISOString(),
          createdBy: user,
          definition,
        });
        return next;
      });
      audit({ actor: user, type: "workflow.version_created", message: `${user.name} created workflow version ${version}.`, workflowId: current.id, meta: { version } });
      publish("workflow.version.created", { workflowId: current.id, version });
      return send(res, 201, { workflow: definition, version });
    }

    if (method === "GET" && path.join("/") === "api/executions") {
      if (!requirePermission(user, "workflow:read")) return send(res, 403, { error: "forbidden" });
      return send(res, 200, { executions: readStore().executions });
    }

    if (method === "POST" && path[1] === "workflows" && path[3] === "execute") {
      if (!requirePermission(user, "workflow:execute")) return send(res, 403, { error: "forbidden" });
      const workflowId = path[2];
      const input = await body(req);
      const idem = req.headers["idempotency-key"];
      if (idem) {
        const prior = readStore().idempotency.find((x) => x.userId === user.id && x.key === idem);
        if (prior) return send(res, 200, { executionId: prior.executionId, idempotentReplay: true });
      }
      const execution = createTriggeredExecution(workflowId, input.inputs || input, user);
      if (!execution) return send(res, 404, { error: "workflow_not_found" });
      if (idem) updateStore((state) => { state.idempotency.push({ userId: user.id, key: idem, executionId: execution.id, createdAt: new Date().toISOString() }); return state; });
      queueExecution(execution.id, 0, 1);
      return send(res, 202, { executionId: execution.id });
    }

    if (method === "POST" && path[1] === "executions" && path[3] === "approve") {
      if (!requirePermission(user, "approval:decide")) return send(res, 403, { error: "forbidden" });
      const ex = approveExecution(path[2], user);
      if (!ex) return send(res, 409, { error: "approval_not_pending" });
      return send(res, 200, { execution: ex });
    }

    if (method === "POST" && path[1] === "executions" && path[3] === "reject") {
      if (!requirePermission(user, "approval:decide")) return send(res, 403, { error: "forbidden" });
      const input = await body(req);
      const ex = rejectExecution(path[2], user, input.reason);
      if (!ex) return send(res, 409, { error: "approval_not_pending_or_reason_missing" });
      return send(res, 200, { execution: ex });
    }

    if (method === "POST" && path[1] === "executions" && path[3] === "retry") {
      if (!requirePermission(user, "execution:retry")) return send(res, 403, { error: "forbidden" });
      const ex = retryExecution(path[2]);
      if (!ex) return send(res, 409, { error: "execution_not_retryable" });
      return send(res, 200, { execution: ex });
    }

    if (method === "POST" && path[1] === "executions" && path[3] === "cancel") {
      if (!requirePermission(user, "execution:cancel")) return send(res, 403, { error: "forbidden" });
      const ex = cancelExecution(path[2]);
      if (!ex) return send(res, 404, { error: "execution_not_found" });
      audit({ actor: user, type: "workflow.cancel_requested", message: `${user.name} requested cancellation.`, executionId: path[2], workflowId: ex.workflowId });
      return send(res, 202, { execution: ex });
    }

    if (method === "GET" && path[1] === "executions" && path[3] === "events") {
      const ex = readStore().executions.find((e) => e.id === path[2]);
      if (!ex) return send(res, 404, { error: "execution_not_found" });
      return send(res, 200, { events: ex.events });
    }

    if (method === "GET" && path[1] === "executions" && path[2]) {
      const ex = readStore().executions.find((e) => e.id === path[2]);
      return ex ? send(res, 200, { execution: ex }) : send(res, 404, { error: "execution_not_found" });
    }

    if (method === "GET" && path.join("/") === "api/notifications") {
      return send(res, 200, { notifications: readStore().notifications });
    }

    if (method === "POST" && path.join("/") === "api/notifications/read-all") {
      updateStore((state) => { state.notifications.forEach((n) => { n.read = true; }); return state; });
      return send(res, 200, { ok: true });
    }

    if (method === "POST" && path[1] === "notifications" && path[3] === "read") {
      updateStore((state) => { const n = state.notifications.find((x) => x.id === path[2]); if (n) n.read = true; return state; });
      return send(res, 200, { ok: true });
    }

    if (method === "GET" && path.join("/") === "api/audit") {
      if (!requirePermission(user, "audit:read")) return send(res, 403, { error: "forbidden" });
      return send(res, 200, { events: readStore().audit });
    }

    if (method === "GET" && path.join("/") === "api/metrics") {
      if (!requirePermission(user, "operations:read")) return send(res, 403, { error: "forbidden" });
      return send(res, 200, snapshot());
    }

    return send(res, 404, { error: "not_found" });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: error.message, stack: error.stack, at: new Date().toISOString() }));
    return send(res, 500, { error: "internal_error" });
  }
});

export function startServer() {
  server.listen(config.port, config.host, () => console.log(JSON.stringify({ level: "info", message: "Altair API listening", port: config.port, at: new Date().toISOString() })));
  setInterval(runScheduledTriggers, 1000);
  return server;
}

export { server };
