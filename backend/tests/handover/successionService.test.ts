// =============================================================================
// Horquva Continuity Platform — Succession & Stage Machine (HND-03/04/05)
// =============================================================================
// Fixture: omar owns 101 + 102. Users with person records: user:chen ↔
// person:chen@acme.com (reviewer), user:maya ↔ person:maya@acme.com (viewer),
// user:admin (Alex) has no person record.
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { DataService, type UserAccount } from '../../src/services/dataService.js';
import { initiateDeparture } from '../../src/handover/departureService.js';
import {
  acceptHandover,
  declineHandover,
  handoverStage,
  markAccountDisabled,
  nameSuccessors,
  personIdForUser,
  requestAcceptance,
  verifyDeparture,
} from '../../src/handover/successionService.js';

let ds: DataService;
let depId: string;
const user = (id: string) => ds.getUserById(id) as UserAccount;
const hndFor = (assetId: string) => ds.getDeparture(depId)!.handovers.find((h) => h.assetId === assetId)!;
const BOTH = [
  { assetId: 'automation:n8n:101', successorId: 'person:chen@acme.com' },
  { assetId: 'automation:n8n:102', successorId: 'person:maya@acme.com' },
];

beforeEach(() => {
  ds = new DataService();
  depId = initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: '2026-12-31', note: null }).id;
});

const status = (fn: () => unknown) => {
  try {
    fn();
  } catch (e: any) {
    return e.status;
  }
  return 'ok';
};

describe('Full lifecycle: Initiated → Named → Accepted → Disabled → Verified (HND-05)', () => {
  it('walks all five stages with timestamps', async () => {
    const dep = ds.getDeparture(depId)!;
    expect(dep.stage).toBe('initiated');

    nameSuccessors(ds, depId, BOTH);
    expect(dep.stage).toBe('successor_named');

    expect(requestAcceptance(ds, depId)).toEqual({ requested: 2 });
    await acceptHandover(ds, hndFor('automation:n8n:101').id, user('user:chen'));
    expect(dep.stage).toBe('successor_named'); // one of two accepted
    await acceptHandover(ds, hndFor('automation:n8n:102').id, user('user:maya'));
    expect(dep.stage).toBe('accepted');

    markAccountDisabled(ds, depId);
    expect(dep.stage).toBe('account_disabled');
    verifyDeparture(ds, depId);
    expect(dep.stage).toBe('verified');

    expect(Object.keys(dep.stageTimestamps).sort()).toEqual(
      ['accepted', 'account_disabled', 'initiated', 'successor_named', 'verified']
    );
  });

  it('a verified departure is no longer open, so the person could be re-initiated later', async () => {
    nameSuccessors(ds, depId, BOTH);
    requestAcceptance(ds, depId);
    await acceptHandover(ds, hndFor('automation:n8n:101').id, user('user:chen'));
    await acceptHandover(ds, hndFor('automation:n8n:102').id, user('user:maya'));
    markAccountDisabled(ds, depId);
    verifyDeparture(ds, depId);
    expect(status(() => initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: '2027-06-01', note: null }))).toBe('ok');
  });
});

describe('Naming successors (HND-03)', () => {
  it('only reaches successor_named when every asset has a successor', () => {
    nameSuccessors(ds, depId, [BOTH[0]]);
    expect(ds.getDeparture(depId)!.stage).toBe('initiated');
  });

  it('rejects bad assignments without changing anything', () => {
    const cases: Array<[Array<{ assetId: string; successorId: string }>, number]> = [
      [[{ assetId: 'automation:n8n:999', successorId: 'person:chen@acme.com' }], 400], // not in this handover
      [[{ assetId: 'automation:n8n:101', successorId: 'person:ghost@acme.com' }], 400], // no such person
      [[{ assetId: 'automation:n8n:101', successorId: 'automation:n8n:103' }], 400], // not a person
      [[{ assetId: 'automation:n8n:101', successorId: 'person:omar@acme.com' }], 400], // the leaver
      [[{ assetId: 'automation:n8n:101', successorId: 'person:sarah@acme.com' }], 400], // also leaving (seeded)
      [[], 400],
    ];
    for (const [assignments, code] of cases) {
      expect(status(() => nameSuccessors(ds, depId, assignments))).toBe(code);
    }
    // Atomic: a valid row next to an invalid one is not applied.
    expect(status(() => nameSuccessors(ds, depId, [BOTH[0], { assetId: 'automation:n8n:999', successorId: 'person:chen@acme.com' }]))).toBe(400);
    expect(hndFor('automation:n8n:101').successorId).toBeNull();
  });

  it('re-naming resets a pending request, but an accepted handover is locked', async () => {
    nameSuccessors(ds, depId, BOTH);
    requestAcceptance(ds, depId);
    nameSuccessors(ds, depId, [{ assetId: 'automation:n8n:102', successorId: 'person:elena@acme.com' }]);
    expect(hndFor('automation:n8n:102')).toMatchObject({ successorId: 'person:elena@acme.com', acceptance: 'none' });

    await acceptHandover(ds, hndFor('automation:n8n:101').id, user('user:chen'));
    expect(status(() => nameSuccessors(ds, depId, [{ assetId: 'automation:n8n:101', successorId: 'person:elena@acme.com' }]))).toBe(409);
  });

  it('cannot change successors after the account is disabled', () => {
    markAccountDisabled(ds, depId);
    expect(status(() => nameSuccessors(ds, depId, BOTH))).toBe(409);
  });
});

describe('Accepting and declining (HND-04)', () => {
  beforeEach(() => {
    nameSuccessors(ds, depId, BOTH);
  });

  it('cannot respond before acceptance is requested', async () => {
    await expect(acceptHandover(ds, hndFor('automation:n8n:101').id, user('user:chen'))).rejects.toMatchObject({ status: 409 });
  });

  it('only the named successor can respond — not admins, not other reviewers', async () => {
    requestAcceptance(ds, depId);
    const id = hndFor('automation:n8n:101').id; // Chen's
    await expect(acceptHandover(ds, id, user('user:admin'))).rejects.toMatchObject({ status: 403 });
    await expect(acceptHandover(ds, id, user('user:maya'))).rejects.toMatchObject({ status: 403 });
    expect(status(() => declineHandover(ds, id, user('user:maya'), 'no'))).toBe(403);
  });

  it('acceptance records a confirmed owns edge and a confirmed fact attested by the successor', async () => {
    requestAcceptance(ds, depId);
    const hnd = hndFor('automation:n8n:101');
    await acceptHandover(ds, hnd.id, user('user:chen'));

    const edge = ds.getGraph().getAllEdges().find(
      (e) => e.fromId === 'person:chen@acme.com' && e.toId === 'automation:n8n:101' && e.type === 'owns'
    );
    expect(edge).toMatchObject({ grade: 'confirmed', source: 'handover_acceptance', sourceRef: hnd.id });

    const fact = await ds.getFactStore().getActiveFact('automation:n8n:101', 'status');
    expect(fact).toMatchObject({ value: 'handed_over', grade: 'confirmed', attestedBy: 'person:chen@acme.com' });
    expect(ds.getAuditLog()[0]).toMatchObject({ action: 'ACCEPT_HANDOVER', actor: 'person:chen@acme.com' });
  });

  it('accepting twice is refused (no duplicate ownership edges)', async () => {
    requestAcceptance(ds, depId);
    const id = hndFor('automation:n8n:101').id;
    await acceptHandover(ds, id, user('user:chen'));
    await expect(acceptHandover(ds, id, user('user:chen'))).rejects.toMatchObject({ status: 409 });
  });

  it('a decline records the reason and sends the departure back to naming', () => {
    requestAcceptance(ds, depId);
    declineHandover(ds, hndFor('automation:n8n:101').id, user('user:chen'), 'On leave in Q4');
    expect(hndFor('automation:n8n:101')).toMatchObject({ acceptance: 'declined', declineReason: 'On leave in Q4' });
    const dep = ds.getDeparture(depId)!;
    expect(dep.stage).toBe('initiated');
    expect(dep.stageTimestamps.successor_named).toBeUndefined(); // no longer reached

    // Naming someone new re-opens the request cycle.
    nameSuccessors(ds, depId, [{ assetId: 'automation:n8n:101', successorId: 'person:elena@acme.com' }]);
    expect(dep.stage).toBe('successor_named');
    expect(requestAcceptance(ds, depId)).toEqual({ requested: 1 });
  });

  it('requesting with nobody waiting is a 409', () => {
    requestAcceptance(ds, depId);
    expect(status(() => requestAcceptance(ds, depId))).toBe(409);
  });
});

describe('Disable and verify', () => {
  it('records an account disable at any point, once', () => {
    markAccountDisabled(ds, depId);
    expect(ds.getDeparture(depId)!.stage).toBe('account_disabled');
    expect(ds.getAuditLog()[0].details).toContain('2 handover(s) not yet accepted');
    expect(status(() => markAccountDisabled(ds, depId))).toBe(409);
  });

  it('refuses to verify before the account is disabled or while handovers are open', () => {
    expect(status(() => verifyDeparture(ds, depId))).toBe(409);
    markAccountDisabled(ds, depId);
    expect(status(() => verifyDeparture(ds, depId))).toBe(409);
  });

  it('accepting after the account is disabled keeps the stage at account_disabled', async () => {
    nameSuccessors(ds, depId, BOTH);
    requestAcceptance(ds, depId);
    markAccountDisabled(ds, depId);
    await acceptHandover(ds, hndFor('automation:n8n:101').id, user('user:chen'));
    expect(ds.getDeparture(depId)!.stage).toBe('account_disabled');
  });
});

describe('helpers', () => {
  it('maps signed-in users to their person records by email', () => {
    expect(personIdForUser(ds.getGraph(), user('user:chen'))).toBe('person:chen@acme.com');
    expect(personIdForUser(ds.getGraph(), user('user:admin'))).toBeNull(); // alex@acme.com has no person record
  });

  it('derives stage from handover rows', () => {
    const dep = ds.getDeparture(depId)!;
    expect(handoverStage({ ...dep, handovers: [] })).toBe('initiated');
  });
});
