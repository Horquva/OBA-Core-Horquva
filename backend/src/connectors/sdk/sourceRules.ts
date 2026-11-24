// =============================================================================
// Horquva Continuity Platform — Source Rules & Evidence Grade Enforcement
// =============================================================================

import { SyncResult } from './types.js';

/**
 * Authoritative external reference keys per connector type.
 * Used for identity resolution and entity correlation across connectors.
 */
export const REF_KEYS: Record<string, string[]> = {
  entra: ['entraId', 'objectId', 'entraAppId'],
  n8n: ['n8nUserId', 'n8n'],
  ai_admin: ['openaiUserId', 'modelId', 'vendorId'],
  google: ['googleId'],
  csv: ['csvRow', 'csvId', 'email'],
  slack: ['slackUserId', 'slackChannelId'],
  jira: ['jiraAccountId', 'jiraProjectId', 'jiraComponentId'],
  github: ['githubUserId', 'githubRepoId', 'githubTeamId'],
};

/**
 * Validated combinations of source, edge type, and target entity kind
 * that are permitted to assert 'stated' evidence grade edges.
 */
export const STATED_RULES = new Set<string>([
  'connector:entra|owns|app',
  'connector:entra|member_of|group',
  'connector:entra|reports_to|person',
  'connector:entra|grants_access_to|vendor',
  'connector:n8n|owns|workflow',
  'connector:n8n|owns|automation',
  'connector:n8n|depends_on|workflow',
  'connector:n8n|depends_on|automation',
  'connector:n8n|depends_on|credential',
  'connector:n8n|runs_on_credentials_of|credential',
  'connector:n8n|runs_on_credentials_of|person',
  'connector:n8n|calls_model|model',
  'connector:jira|owns|project',
  'connector:jira|backs_up|person',
  'connector:jira|backs_up|project',
  'connector:slack|member_of|channel',
  'connector:github|member_of|team',
  'connector:google|owns|app',
  'connector:google|reports_to|person',
  'connector:csv|owns|automation',
  'connector:csv|owns|workflow',
  'connector:csv|backs_up|automation',
  'connector:csv|backs_up|workflow',
  'connector:csv|reports_to|person',
  'connector:ai_admin|owns|model',
  'connector:ai_admin|owns|vendor',
  'connector:github|owns|repository',
  'connector:slack|member_of|group',
]);

/**
 * Verifies that all edges with grade === 'stated' conform to STATED_RULES.
 * Returns an array of descriptive violation messages.
 */
export function assertGradeRules(result: SyncResult): string[] {
  const violations: string[] = [];

  for (const edge of result.edges) {
    if (!edge) continue;
    if (edge.grade === 'stated') {
      const rawTarget = edge.toId ?? (edge as any).target ?? '';
      const target = typeof rawTarget === 'string' ? rawTarget : String(rawTarget || '');
      const targetKind = target.includes(':') ? target.split(':')[0] : target;

      const rawSource = edge.source ?? '';
      const sourceStr = typeof rawSource === 'string' ? rawSource : String(rawSource || '');
      const normSource = sourceStr.startsWith('connector:') ? sourceStr : `connector:${sourceStr}`;

      const edgeType = typeof edge.type === 'string' ? edge.type : String(edge.type || '');

      const key1 = `${sourceStr}|${edgeType}|${targetKind}`;
      const fallback1 = `${sourceStr}|${edgeType}`;
      const key2 = `${normSource}|${edgeType}|${targetKind}`;
      const fallback2 = `${normSource}|${edgeType}`;

      if (
        !target ||
        !sourceStr ||
        (!STATED_RULES.has(key1) &&
          !STATED_RULES.has(fallback1) &&
          !STATED_RULES.has(key2) &&
          !STATED_RULES.has(fallback2))
      ) {
        violations.push(`Illegal stated edge: ${sourceStr} -> ${edgeType} (target: ${target})`);
      }
    }
  }

  return violations;
}
