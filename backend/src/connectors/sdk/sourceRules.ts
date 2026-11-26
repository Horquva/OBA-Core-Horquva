// =============================================================================
// Horquva Continuity Platform — Source Rules & Evidence Grade Enforcement
// =============================================================================
// REF_KEYS: per connection type, the externalRefs keys whose value equals the
// raw_payload.external_id that connection stored for the entity. Used by the
// provenance check (Task 1.7). Keep this to keys a connector actually writes.
//
// STATED_RULES: the only (source, edge type) pairs that may carry the `stated`
// grade (plan Task 3.4). `stated` means a platform field literally names the
// relationship; anything derived from permissions or activity is `inferred`.
// An `owns` edge is stated only when its ownerKind is `owner` (absent counts as
// `owner`; connectors set it explicitly from Task 3.4). Changing this set needs
// the owner's approval (plan C.5).
// =============================================================================

import type { CanonicalEdge } from '@horquva/types';
import type { SyncResult } from './types.js';

export const REF_KEYS: Record<string, string[]> = {
  entra: ['entraId', 'objectId'],
  n8n: ['n8nUserId', 'n8n'],
  ai_admin: ['openaiUserId', 'modelId'],
  google: ['googleId'],
  // A CSV row has no platform id: people are stored under their email.
  csv: ['email', 'csvId'],
  // Extended as each connector lands (phases 4-6).
  slack: ['slackUserId', 'slackChannelId'],
  jira: ['jiraAccountId', 'jiraProjectId', 'jiraComponentId'],
  github: ['githubUserId', 'githubRepoId', 'githubTeamId'],
};

export const STATED_RULES: ReadonlySet<string> = new Set<string>([
  // Plan Task 3.4 table.
  'connector:entra|owns',
  'connector:entra|member_of',
  'connector:entra|reports_to',
  'connector:n8n|owns',
  'connector:n8n|depends_on',
  'connector:n8n|runs_on_credentials_of',
  'connector:n8n|calls_model',
  'connector:jira|owns',
  'connector:slack|member_of',
  'connector:github|member_of',
  // Existing sources whose fields literally name the relationship: the Google
  // manager relation, and the CSV owner/backup/manager columns.
  'connector:google|reports_to',
  'connector:csv|reports_to',
  'connector:csv|owns',
  'connector:csv|backs_up',
]);

/**
 * Jira `backs_up` may be stated only if G0 chooses option (a). Until then it
 * is not in STATED_RULES; flip this only with the owner's G0 decision.
 */
export const JIRA_BACKS_UP_STATED = false;

export function isStatedAllowed(edge: Pick<CanonicalEdge, 'source' | 'type' | 'ownerKind'>): boolean {
  const source = typeof edge.source === 'string' ? edge.source : '';
  const type = typeof edge.type === 'string' ? edge.type : '';
  if (!source || !type) return false;
  const key = `${source.startsWith('connector:') ? source : `connector:${source}`}|${type}`;
  if (type === 'owns' && edge.ownerKind !== undefined && edge.ownerKind !== 'owner') return false;
  if (key === 'connector:jira|backs_up') return JIRA_BACKS_UP_STATED;
  return STATED_RULES.has(key);
}

/** Every `stated` edge that STATED_RULES does not allow, as readable messages. */
export function assertGradeRules(result: SyncResult): string[] {
  const violations: string[] = [];
  for (const edge of result.edges) {
    if (!edge || edge.grade !== 'stated') continue;
    const target = edge.toId == null ? '' : String(edge.toId);
    const source = typeof edge.source === 'string' ? edge.source : '';
    if (!target || !isStatedAllowed(edge)) {
      const kind = edge.type === 'owns' && edge.ownerKind ? ` [${edge.ownerKind}]` : '';
      violations.push(`Illegal stated edge: ${source} -> ${String(edge.type ?? '')}${kind} (target: ${target})`);
    }
  }
  return violations;
}
