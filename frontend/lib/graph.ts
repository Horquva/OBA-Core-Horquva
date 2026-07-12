import { Agent, Dependency } from '../types';
import { RiskLevel } from '../types';

export function getDownstream(startId: string, dependencies: Dependency[]): Set<string> {
  const adj: Record<string, string[]> = {};
  dependencies.forEach(d => {
    if (!adj[d.from]) adj[d.from] = [];
    adj[d.from].push(d.to);
  });

  const visited = new Set<string>();
  const q = [startId];

  while (q.length > 0) {
    const curr = q.shift()!;
    if (adj[curr]) {
      adj[curr].forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          q.push(neighbor);
        }
      });
    }
  }

  return visited;
}

export function getUpstream(startId: string, dependencies: Dependency[]): Set<string> {
  const adjRev: Record<string, string[]> = {};
  dependencies.forEach(d => {
    if (!adjRev[d.to]) adjRev[d.to] = [];
    adjRev[d.to].push(d.from);
  });

  const visited = new Set<string>();
  const q = [startId];

  while (q.length > 0) {
    const curr = q.shift()!;
    if (adjRev[curr]) {
      adjRev[curr].forEach(neighbor => {
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
