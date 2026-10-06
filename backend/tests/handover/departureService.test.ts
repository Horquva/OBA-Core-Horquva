// =============================================================================
// Horquva Continuity Platform — Departure Initiation + Handover Pack (HND-01/02)
// =============================================================================
// Hand-checked against tests/fixtures/handCheckableTruth.json:
//   omar  owns 101 (documented, fallback) + 102 (neither); no backups → both orphaned
//   maya  owns 103, chen backs it up → not orphaned
//   sarah owns 104, no documented/fallback facts → 'unknown', never 'no'
//   david's personal credential runs 105 (2,500 runs/week)
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { DataService } from '../../src/services/dataService.js';
import { DepartureError, buildHandoverPack, initiateDeparture } from '../../src/handover/departureService.js';

let ds: DataService;

beforeEach(() => {
  ds = new DataService(); // fresh fixture-seeded store per test
});

const leave = '2026-12-31T00:00:00.000Z';

describe('Handover pack compilation (HND-02)', () => {
  it('lists every owned asset with evidence and orphan status from S1', () => {
    const pack = buildHandoverPack(ds.getGraph(), { departureId: 'd1', personId: 'person:omar@acme.com', leaveDate: leave });

    expect(pack.person).toEqual({ id: 'person:omar@acme.com', name: 'Omar Farooq' });
    expect(pack.assets.map((a) => a.asset.id).sort()).toEqual(['automation:n8n:101', 'automation:n8n:102']);

    const a101 = pack.assets.find((a) => a.asset.id === 'automation:n8n:101')!;
    expect(a101).toMatchObject({
      criticality: 'critical',
      criticalityGrade: 'confirmed',
      documented: 'yes',
      fallbackExists: 'yes',
      orphanedOnDeparture: true,
      remainingCoverage: [],
      weeklyRuns: 500,
    });
    const a102 = pack.assets.find((a) => a.asset.id === 'automation:n8n:102')!;
    expect(a102).toMatchObject({ documented: 'no', fallbackExists: 'no', orphanedOnDeparture: true });

    expect(pack.summary).toMatchObject({ assetsTotal: 2, orphanedOnDeparture: 2, totalRunsPerWeekAffected: 620 });
  });

  it('does not mark a backed-up asset as orphaned, and names who still covers it', () => {
    const pack = buildHandoverPack(ds.getGraph(), { departureId: 'd1', personId: 'person:maya@acme.com', leaveDate: leave });
    expect(pack.assets).toHaveLength(1);
    expect(pack.assets[0]).toMatchObject({
      orphanedOnDeparture: false,
      remainingCoverage: [{ id: 'person:chen@acme.com', name: 'Chen Wei', via: 'backup' }],
    });
    expect(pack.summary.orphanedOnDeparture).toBe(0);
  });

  it('reports missing facts as unknown, never as no (DATA-03)', () => {
    const pack = buildHandoverPack(ds.getGraph(), { departureId: 'd1', personId: 'person:sarah@acme.com', leaveDate: leave });
    expect(pack.assets[0]).toMatchObject({ documented: 'unknown', fallbackExists: 'unknown' });
  });

  it('includes automations that run on the leaver’s personal credentials', () => {
    const pack = buildHandoverPack(ds.getGraph(), { departureId: 'd1', personId: 'person:david@acme.com', leaveDate: leave });
    expect(pack.personalCredentialAutomations).toEqual([
      expect.objectContaining({ workflowId: 'automation:n8n:105', weeklyRuns: 2500 }),
    ]);
    expect(pack.summary.personalCredentialAutomations).toBe(1);
  });

  it('is deterministic for the same graph (NFR-05)', () => {
    const at = new Date('2026-10-06T00:00:00Z');
    const input = { departureId: 'd1', personId: 'person:omar@acme.com', leaveDate: leave };
    expect(buildHandoverPack(ds.getGraph(), input, at)).toEqual(buildHandoverPack(ds.getGraph(), input, at));
  });
});

describe('Departure initiation (HND-01)', () => {
  it('creates the departure, a handover row per owned asset, and attaches the pack', () => {
    const dep = initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: '2026-12-31', note: 'Moving on' });

    expect(dep.stage).toBe('initiated');
    expect(dep.detectedFrom).toBe('manual');
    expect(dep.leaveDate).toBe(leave); // normalized to ISO
    expect(dep.handovers.map((h) => h.assetId).sort()).toEqual(['automation:n8n:101', 'automation:n8n:102']);
    expect(dep.handovers.every((h) => h.successorId === null && h.acceptance === 'none')).toBe(true);
    expect(dep.handoverPack?.departureId).toBe(dep.id);
    expect(dep.handoverPack?.summary.assetsTotal).toBe(2);
    expect(ds.getDeparture(dep.id)).toBe(dep);
  });

  it('records the detection source (Entra/Google-detected leavers)', () => {
    const dep = initiateDeparture(ds, { personId: 'person:david@acme.com', leaveDate: leave, note: null, detectedFrom: 'entra' });
    expect(dep.detectedFrom).toBe('entra');
  });

  it('writes an INITIATE_DEPARTURE audit entry', () => {
    const dep = initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: leave, note: null });
    expect(ds.getAuditLog()[0]).toMatchObject({ action: 'INITIATE_DEPARTURE', resource: `departure:${dep.id}` });
  });

  it('rejects unknown people and non-person entities with 404', () => {
    for (const personId of ['person:nobody@acme.com', 'automation:n8n:101']) {
      expect(() => initiateDeparture(ds, { personId, leaveDate: leave, note: null })).toThrowError(
        expect.objectContaining({ status: 404 })
      );
    }
  });

  it('rejects an invalid leave date with 400', () => {
    expect(() => initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: 'next tuesday', note: null })).toThrow(
      DepartureError
    );
  });

  it('refuses a second open departure for the same person with 409', () => {
    initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: leave, note: null });
    expect(() => initiateDeparture(ds, { personId: 'person:omar@acme.com', leaveDate: leave, note: null })).toThrowError(
      expect.objectContaining({ status: 409 })
    );
    // Seeded Sarah departure is open too.
    expect(() => initiateDeparture(ds, { personId: 'person:sarah@acme.com', leaveDate: leave, note: null })).toThrowError(
      expect.objectContaining({ status: 409 })
    );
  });

  it('still creates a departure (with an empty pack) for someone who owns nothing', () => {
    const dep = initiateDeparture(ds, { personId: 'person:carlos@acme.com', leaveDate: leave, note: null });
    expect(dep.handovers).toEqual([]);
    expect(dep.handoverPack?.summary.assetsTotal).toBe(0);
  });
});
