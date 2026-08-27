import { Agent, Workflow, WorkflowStep } from '../types';
import { resolveCriticality } from './criticality';

/**
 * Normalizes a raw /api/agents row into the frontend's Agent shape.
 *
 * This exact block was hand-copied across 9 page.tsx files. /api/agents
 * never returns a top-level `department` -- only nested under `owner.department`
 * -- but 5 of the 9 copies fell back straight to a hardcoded 'Operations'
 * instead of reading `owner.department` first, silently showing "Operations"
 * for every agent on those pages regardless of its real department. One
 * function now, so this can't happen a 10th time.
 */
export function normalizeAgent(a: any): Agent {
  return {
    id: a.id?.toString() || '',
    name: a.name || 'Unknown Agent',
    owner: typeof a.owner === 'object' && a.owner ? a.owner.name : (a.owner || null),
    backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : (a.backup_owner || null),
    criticality: resolveCriticality(a),
    department: a.department || a.owner?.department || 'Unassigned',
    documented: Boolean(a.documented ?? false),
  };
}

/**
 * Normalizes a raw /api/workflows row into the frontend's Workflow shape.
 *
 * Must be /api/workflows, NOT /api/workflows/intelligence -- the two are
 * different endpoints with different shapes (see workflows/index.js's own
 * header comment). /intelligence returns computed risk-intelligence fields
 * keyed by `workflow` (not `name`), with no `id`, `department`, `criticality`,
 * or `steps`. Several pages fetched /intelligence and normalized as if it
 * were this shape, silently rendering every workflow as "Unknown Workflow"
 * with a colliding empty id, "Operations" department, and zero steps.
 */
export function normalizeWorkflow(w: any): Workflow {
  return {
    id: w.id?.toString() || '',
    name: w.name || 'Unknown Workflow',
    owner: typeof w.owner === 'object' && w.owner ? w.owner.name : (w.owner || 'Unassigned'),
    backup_owner: typeof w.backup_owner === 'object' && w.backup_owner ? w.backup_owner.name : (w.backup_owner || null),
    department: w.department || 'Unassigned',
    criticality: resolveCriticality(w),
    documented: Boolean(w.documented ?? false),
    steps: Array.isArray(w.steps) ? w.steps.map((s: any): WorkflowStep => ({
      step: s.step,
      actor: s.actor,
      name: s.name,
      action: s.action,
    })) : [],
  };
}
