// =============================================================================
// Horquva Continuity Platform — Post-Departure 72h Verification Daemon (HND-06)
// =============================================================================
// When an account is disabled (Stage 4: account_disabled), a 72-hour monitoring
// window begins. The verifier checks execution logs of automations owned or
// credentialed by the leaver.
//
// If any automation fails with authentication/token/credential errors:
//   - Emits a High-Severity Alert (change event kind 'credential_risk' / 'failure_spiked')
//   - Appends an entry to the departure's watch log
//
// Once 72 hours have elapsed:
//   - If all handovers are accepted, every watched automation's executions
//     were actually checked, and no fatal failure occurred, automatically
//     closes the departure into Stage 5 (verified).
//
// Execution history comes from the n8n connection saved in Settings (or, with
// none, N8N_BASE_URL + N8N_API_KEY). Without it the window still runs but
// nothing is auto-verified: "no failures seen" is only claimed when executions
// were really read.
// =============================================================================

import type { ContinuityGraph } from '../domain/graph/index.js';
import type { DataService, DepartureRecord, DepartureWatchEvent } from '../services/dataService.js';
import { verifyDeparture } from './successionService.js';
import { N8nConnector } from '../connectors/n8n/index.js';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'success' | 'error';
  startedAt: string;
  stoppedAt?: string;
  errorMessage?: string | null;
  errorCategory?: 'auth_error' | 'runtime_error' | 'timeout' | 'unknown';
}

export interface VerificationResult {
  departureId: string;
  stage: DepartureRecord['stage'];
  windowElapsedHours: number;
  windowCompleted: boolean;
  monitoredAutomations: Array<{ id: string; name: string }>;
  failuresDetected: number;
  alertsEmitted: number;
  autoVerified: boolean;
  /** True only when every monitored automation's execution history was read. */
  executionsChecked: boolean;
  watchLog: DepartureWatchEvent[];
}

/** Returns the automation's executions since `since`, or null when its source can't be read. */
export type ExecutionProvider = (
  automationId: string,
  since: string
) => Promise<WorkflowExecution[] | null> | WorkflowExecution[] | null;

const N8N_AUTOMATION_PREFIX = 'automation:n8n:';

function n8nExecutionProvider(n8n: N8nConnector): ExecutionProvider {
  return async (automationId, since) => {
    if (!automationId.startsWith(N8N_AUTOMATION_PREFIX)) return null;
    const failed = await n8n.fetchFailedExecutions(automationId.slice(N8N_AUTOMATION_PREFIX.length), since);
    return failed.map((e) => ({ ...e, status: 'error' as const }));
  };
}

/** Live n8n execution history, when the instance is configured; otherwise null. */
export function n8nExecutionProviderFromEnv(env: NodeJS.ProcessEnv = process.env): ExecutionProvider | null {
  if (!env.N8N_BASE_URL || !env.N8N_API_KEY) return null;
  return n8nExecutionProvider(new N8nConnector('n8n', 'n8n', { baseUrl: env.N8N_BASE_URL, apiKey: env.N8N_API_KEY }));
}

/**
 * The n8n connection saved in Settings, falling back to N8N_BASE_URL/N8N_API_KEY
 * when there is none (or no database). Automation ids aren't namespaced per
 * connection, so with several n8n connections we can't tell which instance a
 * workflow lives on: nothing is read, and nothing is auto-verified.
 */
export async function resolveExecutionProvider(ds: DataService, env: NodeJS.ProcessEnv = process.env): Promise<ExecutionProvider | null> {
  if (ds.isPersistent()) {
    const { query } = await import('../db/client.js');
    const { rows } = await query(`SELECT id FROM connection WHERE type = 'n8n' ORDER BY id`);
    if (rows.length > 1) {
      console.warn(`[PostDepartureVerifier] ${rows.length} n8n connections: can't tell which one runs a workflow, so executions are not read.`);
      return null;
    }
    if (rows.length === 1) {
      const { ConnectorRunner } = await import('../connectors/sdk/runner.js');
      try {
        return n8nExecutionProvider((await ConnectorRunner.load(rows[0].id)) as N8nConnector);
      } catch (err: any) {
        console.warn(`[PostDepartureVerifier] Couldn't load n8n connection ${rows[0].id}: ${err.message}`);
        return null;
      }
    }
  }
  return n8nExecutionProviderFromEnv(env);
}

const DEFAULT_WINDOW_HOURS = 72;

/**
 * Categorizes an error message into auth/credential failure vs general runtime.
 */
export function isCredentialOrAuthError(errorMessage?: string | null): boolean {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  const authKeywords = [
    'auth',
    'unauthorized',
    '401',
    '403',
    'forbidden',
    'credential',
    'token',
    'api key',
    'apikey',
    'expired',
    'login',
    'access denied',
    'authentication',
    'invalid_grant',
    'jwt',
    'oauth',
  ];
  return authKeywords.some((kw) => lower.includes(kw));
}

/**
 * Finds all automation entity IDs associated with a person:
 * 1. Automations owned by the person.
 * 2. Automations using the person's credentials (`runs_on_credentials_of` edge).
 */
export function getAssociatedAutomations(
  graph: ContinuityGraph,
  personId: string
): Array<{ id: string; name: string }> {
  const result = new Map<string, string>();

  // 1. Owned assets that are automations
  for (const asset of graph.getOwnedAssets(personId)) {
    if (asset.kind === 'automation') {
      result.set(asset.id, asset.name);
    }
  }

  // 2. Automations running on person's personal credentials
  for (const edge of graph.getAllEdges()) {
    if (edge.type === 'runs_on_credentials_of' && edge.toId === personId) {
      const node = graph.getNode(edge.fromId);
      if (node?.entity?.kind === 'automation') {
        result.set(node.entity.id, node.entity.name);
      }
    }
  }

  return Array.from(result.entries()).map(([id, name]) => ({ id, name }));
}

export interface VerifyOptions {
  now?: Date;
  windowHours?: number;
  /** Omitted: the saved n8n connection, else n8n from env. null: no execution source. */
  executionProvider?: ExecutionProvider | null;
  autoTransition?: boolean;
}

/**
 * Verifies post-departure executions for a single departure in Stage 4 (account_disabled).
 */
export async function verifyDepartureExecutions(
  ds: DataService,
  departureId: string,
  options: VerifyOptions = {}
): Promise<VerificationResult> {
  const dep = ds.getDeparture(departureId);
  if (!dep) {
    throw new Error(`Departure ${departureId} not found.`);
  }

  const now = options.now ?? new Date();
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const autoTransition = options.autoTransition ?? true;
  const graph = ds.getGraph();
  const person = graph.getNode(dep.personId)?.entity;
  const personName = person?.name ?? dep.personId;

  const automations = getAssociatedAutomations(graph, dep.personId);

  // If not yet account_disabled, return status without processing window
  if (dep.stage !== 'account_disabled') {
    return {
      departureId,
      stage: dep.stage,
      windowElapsedHours: 0,
      windowCompleted: false,
      monitoredAutomations: automations,
      failuresDetected: 0,
      alertsEmitted: 0,
      autoVerified: false,
      executionsChecked: false,
      watchLog: dep.watchLog ?? [],
    };
  }

  const disabledAtStr = dep.stageTimestamps.account_disabled;
  const disabledAt = disabledAtStr ? new Date(disabledAtStr).getTime() : now.getTime();
  const elapsedMs = Math.max(0, now.getTime() - disabledAt);
  const windowElapsedHours = Math.round((elapsedMs / (3600 * 1000)) * 10) / 10;
  const windowCompleted = elapsedMs >= windowHours * 3600 * 1000;

  let failuresDetected = 0;
  let alertsEmitted = 0;
  let hasActiveAuthFailure = false;
  const provider = options.executionProvider === undefined ? await resolveExecutionProvider(ds) : options.executionProvider;
  // Nothing to watch counts as checked; otherwise every automation must be readable.
  let executionsChecked = automations.length === 0 || provider !== null;
  // The hourly scan re-reads the whole window; only new executions are recorded.
  const seenExecutions = new Set((dep.watchLog ?? []).map((w) => w.executionId).filter(Boolean));

  // Check executions for each automation since disabledAt
  if (provider && automations.length > 0) {
    const sinceIso = new Date(disabledAt).toISOString();
    for (const auto of automations) {
      try {
        const executions = await provider(auto.id, sinceIso);
        if (executions === null) {
          executionsChecked = false;
          continue;
        }
        for (const exec of executions) {
          if (exec.status === 'error' && !seenExecutions.has(exec.id)) {
            failuresDetected++;
            const isAuth = isCredentialOrAuthError(exec.errorMessage);
            if (isAuth) {
              hasActiveAuthFailure = true;
              alertsEmitted++;

              const alertMessage = `Workflow "${auto.name}" halted post-departure due to disabled credentials of ${personName}.`;
              
              // 1. Emit High-Severity alert in change feed
              ds.addChangeEvent({
                kind: 'credential_risk',
                title: `Post-Departure Failure: ${auto.name}`,
                impact: alertMessage,
                href: `/departures/${dep.id}`,
              });

              // 2. Append to departure watchLog
              ds.addDepartureWatchEvent(dep.id, {
                at: exec.stoppedAt ?? now.toISOString(),
                workflow: { id: auto.id, name: auto.name },
                message: alertMessage,
                severity: 'alert',
                executionId: exec.id,
              });

              // 3. Add audit log entry
              ds.addAuditEntry(
                'system:post-departure-verifier',
                'POST_DEPARTURE_FAILURE_DETECTED',
                `departure:${dep.id}`,
                alertMessage
              );
            } else {
              // Non-auth error is logged as info
              ds.addDepartureWatchEvent(dep.id, {
                at: exec.stoppedAt ?? now.toISOString(),
                workflow: { id: auto.id, name: auto.name },
                message: `Workflow error (non-auth): ${exec.errorMessage || 'Execution failed'}`,
                severity: 'info',
                executionId: exec.id,
              });
            }
          }
        }
      } catch (err: any) {
        executionsChecked = false;
        console.warn(`[PostDepartureVerifier] Failed to fetch executions for ${auto.id}:`, err.message);
      }
    }
  }

  // Check if all handovers are accepted
  const allHandoversAccepted =
    dep.handovers.length > 0 && dep.handovers.every((h) => h.acceptance === 'accepted');

  let autoVerified = false;

  // Auto-transition to verified if window completed, all accepted, and zero auth failures
  if (autoTransition && windowCompleted && allHandoversAccepted && executionsChecked && !hasActiveAuthFailure) {
    // Check if any watchLog alerts were recorded previously
    const priorAlerts = (dep.watchLog ?? []).filter((w) => w.severity === 'alert').length;
    if (priorAlerts === 0) {
      try {
        verifyDeparture(ds, dep.id);
        autoVerified = true;

        ds.addDepartureWatchEvent(dep.id, {
          at: now.toISOString(),
          workflow: { id: 'system', name: 'Post-Departure Verifier' },
          message: `72-hour verification window completed with 0 credential errors. All handovers accepted. Departure marked verified.`,
          severity: 'info',
        });
      } catch (err: any) {
        console.warn(`[PostDepartureVerifier] Auto-verification failed:`, err.message);
      }
    }
  }

  return {
    departureId,
    stage: dep.stage,
    windowElapsedHours,
    windowCompleted,
    monitoredAutomations: automations,
    failuresDetected,
    alertsEmitted,
    autoVerified,
    executionsChecked,
    watchLog: dep.watchLog ?? [],
  };
}

/**
 * Runs verification across all open departures in Stage 4 (account_disabled).
 */
export async function verifyAllActiveDepartures(
  ds: DataService,
  options: VerifyOptions = {}
): Promise<VerificationResult[]> {
  const activeDepartures = ds
    .getDepartures()
    .filter((d) => d.stage === 'account_disabled');

  const results: VerificationResult[] = [];
  if (activeDepartures.length === 0) return results;
  // Resolve the execution source once for the whole run.
  const executionProvider = options.executionProvider === undefined ? await resolveExecutionProvider(ds) : options.executionProvider;
  for (const dep of activeDepartures) {
    const res = await verifyDepartureExecutions(ds, dep.id, { ...options, executionProvider });
    results.push(res);
  }
  return results;
}
