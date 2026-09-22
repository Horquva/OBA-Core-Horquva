import { Dependency } from '../types';

/**
 * A `Dependency` edge means `from` depends_on `to` (same reading
 * backend/domain/derived.js's dependencyIndex() uses). So the things that
 * BREAK when `startId` fails are whatever points AT it -- walk backward.
 *
 * This function used to walk forward (returning what `startId` itself
 * depends on -- its own prerequisites, not its victims) while getUpstream()
 * below had the correct backward walk under the wrong name. Every caller
 * (DependencyTable's "Cascade Impact" column, FlowCanvas's downstream count,
 * riskIntelligence.ts's downstreamCount) was silently reading the inverse of
 * what it displayed.
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

// SPOF status is server-computed — GET /api/dependencies/agent-spofs, via
// backend/domain/definitions.js's spofVerdict() (sole owner AND no backup
// AND criticality >= high; dependents/victim count is informational only,
// never part of the verdict). A local getSPOFs() with its own >=3-victims
// rule used to live here and disagree with the canonical definition; see
// that route's header comment for why the two are not compatible.
