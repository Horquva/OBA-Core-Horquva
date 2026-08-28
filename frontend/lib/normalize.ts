import { Agent, Workflow, WorkflowStep } from '../types';
import { resolveCriticality } from './criticality';

interface RawOwnerRef {
  name?: string;
  department?: string;
}

interface RawAgent {
  id?: string | number;
  name?: string;
  owner?: RawOwnerRef | string | null;
  backup_owner?: RawOwnerRef | string | null;
  risk?: string;
  criticality?: string;
  department?: string;
  documented?: boolean;
}

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
export function normalizeAgent(a: RawAgent): Agent {
  return {
    id: a.id?.toString() || '',
    name: a.name || 'Unknown Agent',
    owner: typeof a.owner === 'object' && a.owner ? (a.owner.name || null) : (a.owner || null),
    backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? (a.backup_owner.name || null) : (a.backup_owner || null),
    criticality: resolveCriticality(a),
    department: a.department || (typeof a.owner === 'object' && a.owner?.department) || 'Unassigned',
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
interface RawWorkflowStep {
  step?: number;
  actor?: string;
  name?: string;
  action?: string;
}

interface RawWorkflow {
  id?: string | number;
  name?: string;
  owner?: RawOwnerRef | string | null;
  backup_owner?: RawOwnerRef | string | null;
  department?: string;
  risk?: string;
  criticality?: string;
  documented?: boolean;
  steps?: RawWorkflowStep[];
}

export function normalizeWorkflow(w: RawWorkflow): Workflow {
  return {
    id: w.id?.toString() || '',
    name: w.name || 'Unknown Workflow',
    owner: typeof w.owner === 'object' && w.owner ? (w.owner.name || 'Unassigned') : (w.owner || 'Unassigned'),
    backup_owner: typeof w.backup_owner === 'object' && w.backup_owner ? (w.backup_owner.name || null) : (w.backup_owner || null),
    department: w.department || 'Unassigned',
    criticality: resolveCriticality(w),
    documented: Boolean(w.documented ?? false),
    steps: Array.isArray(w.steps) ? w.steps.map((s): WorkflowStep => ({
      step: s.step ?? 0,
      actor: (s.actor as WorkflowStep['actor']) ?? 'human',
      name: s.name ?? '',
      action: s.action ?? '',
    })) : [],
  };
}
