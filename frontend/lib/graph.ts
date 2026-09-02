import { Agent, Dependency } from '../types';

/**
 * A `Dependency` edge means `from` depends_on `to` (same reading
 * backend/domain/derived.js's dependencyIndex() uses). So the things that
 * BREAK when `startId` fails are whatever points AT it -- walk backward.
 *
 * This function used to walk forward (returning what `startId` itself
 * depends on -- its own prerequisites, not its victims) while getUpstream()
 * below had the correct backward walk under the wrong name. Every caller
 * (DependencyTable's "Cascade Impact" column, FlowCanvas's downstream count,
 * riskIntelligence.ts's downstreamCount, getSPOFs()'s victim count) was
 * silently reading the inverse of what it displayed.
 */
export function getDownstream(startId: string, dependencies: Dependency[]): Set<string> {
  const dependentsOf: Record<string, string[]> = {};
  dependencies.forEach(d => {
    if (!dependentsOf[d.to]) dependentsOf[d.to] = [];
    dependentsOf[d.to].push(d.from);
  });

  const visited = new Set<string>();
  const q = [startId];

  while (q.length > 0) {
    const curr = q.shift()!;
    if (dependentsOf[curr]) {
      dependentsOf[curr].forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          q.push(neighbor);
        }
      });
    }
  }

  return visited;
}

/** What `startId` itself depends on (its prerequisites), walking forward. */
export function getUpstream(startId: string, dependencies: Dependency[]): Set<string> {
  const dependsOn: Record<string, string[]> = {};
  dependencies.forEach(d => {
    if (!dependsOn[d.from]) dependsOn[d.from] = [];
    dependsOn[d.from].push(d.to);
  });

  const visited = new Set<string>();
  const q = [startId];

  while (q.length > 0) {
    const curr = q.shift()!;
    if (dependsOn[curr]) {
      dependsOn[curr].forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          q.push(neighbor);
        }
      });
    }
  }

  return visited;
}

export interface SPOFResult {
  agentId: string;
  victimsCount: number;
}

// SPOF Criteria: >= 3 victims AND no backup_owner AND (criticality === high or critical)
// Wait, the data has Inventory Agent as SPOF, which has no owner either.
export function getSPOFs(agents: Agent[], dependencies: Dependency[]): SPOFResult[] {
  const spofs: SPOFResult[] = [];
  
  agents.forEach(agent => {
    const victims = getDownstream(agent.id, dependencies);
    if (
      victims.size >= 3 && 
      !agent.backup_owner && 
      (agent.criticality === 'high' || agent.criticality === 'critical')
    ) {
      spofs.push({
        agentId: agent.id,
        victimsCount: victims.size,
      });
    }
  });

  return spofs;
}
