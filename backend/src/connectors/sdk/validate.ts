// =============================================================================
// Horquva Continuity Platform — Boundary Page Parser
// =============================================================================

import { z } from 'zod';
import { SyncIssues } from './issues.js';

/**
 * Normalizes wrapped vendor page payloads (Graph { value: [] }, Jira { values: [] },
 * Slack { members: [] }, or raw arrays) and validates each item with Zod.
 * Invalid items record a core issue and are skipped; corrupted items never throw.
 */
export function parsePage<T>(
  itemSchema: z.ZodType<T>,
  data: unknown,
  module: string,
  issues: SyncIssues
): T[] {
  let items: unknown[];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.value)) {
      items = d.value;
    } else if (Array.isArray(d.values)) {
      items = d.values;
    } else if (Array.isArray(d.members)) {
      items = d.members;
    } else {
      items = [];
    }
  } else {
    items = [];
  }

  const valid: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const parsed = itemSchema.safeParse(items[i]);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      const issueMsg = parsed.error.issues
        .map((iss) => `${iss.path.join('.') || 'root'}: ${iss.message}`)
        .join('; ');
      issues.core(module, new Error(`[${module}] Item ${i} schema violation: ${issueMsg}`));
    }
  }

  return valid;
}
