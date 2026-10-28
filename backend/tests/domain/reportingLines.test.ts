// =============================================================================
// Reporting lines (B3): a manager is a `reports_to` edge, never a team.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { CanonicalEdge, CanonicalEntity, EdgeType, EntityKind } from '@horquva/types';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { departureSummary } from '../../src/views/departureViews.js';
import type { DataService, DepartureRecord } from '../../src/services/dataService.js';

const entity = (id: string, kind: EntityKind, name = id): CanonicalEntity => ({ id, kind, name, externalRefs: {}, createdAt: new Date(), updatedAt: new Date() });
const edge = (fromId: string, type: EdgeType, toId: string): CanonicalEdge => ({ fromId, toId, type, grade: 'stated', source: 'connector:test', validFrom: new Date() });

const OMAR = 'person:omar@acme.com';
const MAYA = 'person:maya@acme.com';

function teamFor(edges: CanonicalEdge[]): string | null {
  const graph = ContinuityGraph.fromSnapshot(
    [entity(OMAR, 'person', 'Omar Farooq'), entity(MAYA, 'person', 'Maya Chen'), entity('group:platform', 'group', 'Platform')],
    edges,
    []
  );
  const ds = { getGraph: () => graph } as unknown as DataService;
  const dep = { id: 'dep_1', personId: OMAR, leaveDate: '2099-01-01', stage: 'initiated', handovers: [] } as unknown as DepartureRecord;
  return departureSummary(dep, ds).team;
}

describe('reporting lines', () => {
  it('getManager follows reports_to and is null when the directory says nothing', () => {
    const graph = ContinuityGraph.fromSnapshot([entity(OMAR, 'person'), entity(MAYA, 'person', 'Maya Chen')], [edge(OMAR, 'reports_to', MAYA)], []);
    expect(graph.getManager(OMAR)?.name).toBe('Maya Chen');
    expect(graph.getManager(MAYA)).toBeNull();
    expect(graph.getManager('person:nobody@acme.com')).toBeNull();
  });

  it("a departure's team is the directory group, never the manager", () => {
    expect(teamFor([edge(OMAR, 'reports_to', MAYA)])).toBeNull();
    expect(teamFor([edge(OMAR, 'reports_to', MAYA), edge(OMAR, 'member_of', 'group:platform')])).toBe('Platform');
    // Old data that stored the manager as member_of no longer reads as a team.
    expect(teamFor([edge(OMAR, 'member_of', MAYA)])).toBeNull();
  });
});
