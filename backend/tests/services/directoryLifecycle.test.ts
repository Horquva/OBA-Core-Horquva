import { describe, it, expect } from 'vitest';
import type { CanonicalEdge, CanonicalEntity, CanonicalFact } from '@horquva/types';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { lifecycleChanges, toFeedEvent } from '../../src/services/lifecycle/directoryLifecycle.js';

const now = new Date();
type P = { email: string; name: string; status?: string; refs?: Record<string, string>; manager?: string };
function graphOf(people: P[]): ContinuityGraph {
  const entities: CanonicalEntity[] = people.map((p) => ({
    id: `person:${p.email}`, kind: 'person', name: p.name, externalRefs: { entraId: `e-${p.email}`, ...p.refs }, createdAt: now, updatedAt: now,
  }));
  const facts: CanonicalFact[] = people.filter((p) => p.status).map((p) => ({
    entityId: `person:${p.email}`, attribute: 'status', value: p.status, grade: 'stated', source: 'connector:entra', validFrom: now,
  }));
  const edges: CanonicalEdge[] = people.filter((p) => p.manager).map((p) => ({
    fromId: `person:${p.email}`, toId: `person:${p.manager}`, type: 'reports_to', grade: 'stated', source: 'connector:entra', validFrom: now,
  }));
  return ContinuityGraph.fromSnapshot(entities, edges, facts);
}
const kinds = (prev: P[], curr: P[]) => lifecycleChanges(graphOf(prev), graphOf(curr), 'entra').map((c) => [c.kind, c.entityId]);

const omar: P = { email: 'omar@acme.com', name: 'Omar Farooq', status: 'active', refs: { department: 'Platform' } };
const maya: P = { email: 'maya@acme.com', name: 'Maya Chen', status: 'active' };
const chen: P = { email: 'chen@acme.com', name: 'Chen Wei', status: 'active' };

describe('directory lifecycle diff', () => {
  it('a disabled account is a person_left', () => {
    expect(kinds([omar], [{ ...omar, status: 'departed' }])).toEqual([['person_left', 'person:omar@acme.com']]);
  });

  it('someone who first appears already departed is not a leaver', () => {
    expect(kinds([], [{ ...omar, status: 'departed' }])).toEqual([]);
  });

  it('an account active again is person_reenabled', () => {
    expect(kinds([{ ...omar, status: 'departed' }], [omar])).toEqual([['person_reenabled', 'person:omar@acme.com']]);
  });

  it('a department or manager change is person_moved; a value seen for the first time is not', () => {
    expect(kinds([omar], [{ ...omar, refs: { department: 'Finance' } }])).toEqual([['person_moved', 'person:omar@acme.com']]);
    expect(kinds([maya, chen, { ...omar, manager: 'maya@acme.com' }], [maya, chen, { ...omar, manager: 'chen@acme.com' }])).toEqual([['person_moved', 'person:omar@acme.com']]);
    expect(kinds([maya, omar], [maya, { ...omar, manager: 'maya@acme.com' }])).toEqual([]);
    expect(kinds([{ ...omar, refs: {} }], [omar])).toEqual([]);
  });

  it('the same state twice yields nothing', () => {
    expect(kinds([omar, maya], [omar, maya])).toEqual([]);
  });

  it("only reports people this directory knows", () => {
    const csvOnly: P = { email: 'sam@acme.com', name: 'Sam', status: 'active', refs: { entraId: '' } };
    expect(kinds([csvOnly], [{ ...csvOnly, status: 'departed' }])).toEqual([]);
  });

  it('a leaver suggestion links to a prefilled departure form', () => {
    const curr = graphOf([{ ...omar, status: 'departed' }]);
    const [change] = lifecycleChanges(graphOf([omar]), curr, 'entra');
    const feed = toFeedEvent(change, curr, 'entra');
    expect(feed.title).toBe('Possible leaver: Omar Farooq (Entra)');
    expect(feed.href).toBe(`/departures?record=person%3Aomar%40acme.com&source=entra&detectedAt=${encodeURIComponent(change.detectedAt.toISOString())}`);
  });

  it('a move says what changed', () => {
    const curr = graphOf([maya, { ...omar, refs: { department: 'Finance' }, manager: 'maya@acme.com' }]);
    const [change] = lifecycleChanges(graphOf([chen, maya, { ...omar, manager: 'chen@acme.com' }]), curr, 'entra');
    expect(toFeedEvent(change, curr, 'entra')).toMatchObject({ title: 'Moved: Omar Farooq (Entra)', href: '/people/person:omar@acme.com' });
    expect(toFeedEvent(change, curr, 'entra').impact).toMatch(/^Platform → Finance; now reports to Maya Chen\./);
  });
});
