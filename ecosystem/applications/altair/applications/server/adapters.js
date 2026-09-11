import process from "node:process";
import { config } from "./config.js";

export class IntegrationNotConfiguredError extends Error {
  constructor(adapter, detail = "") {
    super(`Integration adapter "${adapter}" is not configured.${detail ? ` ${detail}` : ""}`);
    this.code = "integration_not_configured";
    this.adapter = adapter;
  }
}

export class IntegrationTimeoutError extends Error {
  constructor(adapter) {
    super(`Integration adapter "${adapter}" timed out.`);
    this.code = "integration_timeout";
    this.adapter = adapter;
  }
}

/**
 * External side effects live behind adapters. An adapter either calls a real
 * configured service or explicitly fails as not configured; it never pretends
 * a side effect happened.
 */
export class IntegrationAdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.register("http", new HttpAdapter());
    this.register("noop-internal", new InternalAdapter());
  }

  register(name, adapter) {
    this.adapters.set(name, adapter);
  }

  get(name) {
    return this.adapters.get(name);
  }
}

class InternalAdapter {
  async execute({ action }) {
    return { ok: true, adapter: "noop-internal", action };
  }
}

class HttpAdapter {
  async execute({ action, input, timeoutMs }) {
    const envKey = `ALTAIR_ADAPTER_${action.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_")}_URL`;
    const url = process.env[envKey];
    // Local/demo installs should work immediately without requiring private
    // Jira, GitHub, deployment, or notification endpoints. Production can
    // disable demo mode and require the real adapter URL.
    if (!url && config.demoMode) {
      return { ok: true, adapter: "http-demo", simulated: true, action, message: "Simulated successfully in local demo mode." };
    }
    if (!url) throw new IntegrationNotConfiguredError("http", `Set ${envKey}.`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, input }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Adapter returned HTTP ${response.status}.`);
      return { ok: true, adapter: "http", status: response.status, body: await response.text() };
    } catch (error) {
      if (error.name === "AbortError") throw new IntegrationTimeoutError("http");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function adapterForStep(step) {
  // Processing steps are internal workflow logic. Execution-phase steps are
  // side effects and therefore require an explicit external adapter.
  return step.phase === "execution" ? "http" : "noop-internal";
}
