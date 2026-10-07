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
//   - If all handovers are accepted and no fatal failure occurred,
//     automatically closes the departure into Stage 5 (verified).
// =============================================================================

import type { ContinuityGraph } from '../domain/graph/index.js';
import type { DataService, DepartureRecord, DepartureWatchEvent } from '../services/dataService.js';
import { verifyDeparture } from './successionService.js';

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
  watchLog: DepartureWatchEvent[];
}

export type ExecutionProvider = (
  workflowId: string,
  since: string
) => Promise<WorkflowExecution[]> | WorkflowExecution[];

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
  executionProvider?: ExecutionProvider;
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

  // Check executions for each automation since disabledAt
  if (options.executionProvider && automations.length > 0) {
    const sinceIso = new Date(disabledAt).toISOString();
    for (const auto of automations) {
      try {
        const executions = await options.executionProvider(auto.id, sinceIso);
        for (const exec of executions) {
          if (exec.status === 'error') {
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
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[PostDepartureVerifier] Failed to fetch executions for ${auto.id}:`, err.message);
      }
    }
  }

  // Check if all handovers are accepted
  const allHandoversAccepted =
    dep.handovers.length > 0 && dep.handovers.every((h) => h.acceptance === 'accepted');

  let autoVerified = false;

  // Auto-transition to verified if window completed, all accepted, and zero auth failures
  if (autoTransition && windowCompleted && allHandoversAccepted && !hasActiveAuthFailure) {
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
  for (const dep of activeDepartures) {
    const res = await verifyDepartureExecutions(ds, dep.id, options);
    results.push(res);
  }
  return results;
}
