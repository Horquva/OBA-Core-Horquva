import { Dataset } from '../types';

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

/**
 * Assembles a Dataset live from Supabase via /api/agents, /api/workflows and
 * /api/dependencies — this used to be a static JSON snapshot. The only real
 * consumer is computeNetworkRisk() (lib/networkRisk.ts), which only reads
 * agents[].{id,owner}, workflows[].{id,owner} and dependencies[].{from,to} —
 * `company`/`employees`/`ai_tools` are left as empty placeholders since
 * nothing reads them.
 *
 * Agent ids and workflow ids are both small integers from separate Supabase
 * tables (e.g. agent id 3 and workflow id 3 are unrelated), so they're
 * namespaced ('agent_3' / 'workflow_3') before being used as graph node ids —
 * without that, computeNetworkRisk's assetToOwner lookup would silently
 * collide the two id spaces.
 */
export async function getDataset(): Promise<Dataset> {
  const [agentsRes, workflowsRes, depsRes] = await Promise.all([
    fetch(`${BASE}/api/agents`, { cache: 'no-store' }),
    fetch(`${BASE}/api/workflows`, { cache: 'no-store' }),
    fetch(`${BASE}/api/dependencies`, { cache: 'no-store' }),
  ]);
  if (!agentsRes.ok) throw new Error('Failed to load agents');
  if (!workflowsRes.ok) throw new Error('Failed to load workflows');
  if (!depsRes.ok) throw new Error('Failed to load dependencies');

  const agentsData = await agentsRes.json();
  const workflowsData = await workflowsRes.json();
  const depsData = await depsRes.json();

  const agents = (Array.isArray(agentsData) ? agentsData : []).map((a: any) => ({
    id: `agent_${a.id}`,
    name: a.name,
    owner: a.owner?.name ?? null,
    backup_owner: null, // not resolvable from /api/agents; unused by computeNetworkRisk
    criticality: a.risk || 'low',
    department: a.owner?.department || 'Unassigned',
    documented: false, // not tracked on /api/agents; unused by computeNetworkRisk
  }));

  const workflows = (Array.isArray(workflowsData) ? workflowsData : []).map((w: any) => ({
    id: `workflow_${w.id}`,
    name: w.name,
    owner: w.owner?.name ?? null,
    backup_owner: null,
    department: w.department || 'Unassigned',
    criticality: w.risk || 'low',
    documented: Boolean(w.documented),
    steps: [],
  }));

  const rawDeps = Array.isArray(depsData?.dependencies) ? depsData.dependencies : [];
  const prefix = (type: string) => (type === 'workflow' ? 'workflow_' : 'agent_');
  const dependencies = rawDeps
    .filter((d: any) => (d.source_type === 'agent' || d.source_type === 'workflow') && d.target_type === 'agent')
    .map((d: any) => ({
      from: `${prefix(d.source_type)}${d.source_id}`,
      to: `${prefix(d.target_type)}${d.target_id}`,
      type: d.dependency_type || 'normal',
    }));

  return {
    company: '',
    employees: 0,
    agents,
    workflows,
    dependencies,
    ai_tools: [],
  };
}
