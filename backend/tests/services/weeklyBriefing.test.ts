import { describe, it, expect, beforeEach } from 'vitest';
import { DataService } from '../../src/services/dataService.js';
import { WeeklyBriefingService } from '../../src/services/briefing/weeklyBriefing.js';

describe('CHG-03 / G-11: Weekly Continuity Executive Briefing Service', () => {
  let ds: DataService;

  beforeEach(() => {
    ds = DataService.resetInstance();
  });

  it('compiles accurate continuity data for upcoming departures, SPOFs, and credentials', () => {
    // Add an upcoming departure in 5 days
    const departureDate = new Date(Date.now() + 5 * 86_400_000).toISOString();
    ds.createDeparture({
      personId: 'person:omar@acme.com',
      leaveDate: departureDate,
      note: 'Omar leaving in 5 days',
    });

    const data = WeeklyBriefingService.compileBriefingData(ds);

    expect(data.asOfDate).toBeDefined();
    expect(data.headline).toBeDefined();
    expect(data.headline.totalCriticalAssets).toBeGreaterThan(0);

    // Omar should appear in upcoming departures
    expect(data.upcomingDepartures.length).toBeGreaterThan(0);
    expect(data.upcomingDepartures.some((d) => d.personName === 'Omar Farooq')).toBe(true);

    // SPOFs should be populated with assets having 1 owner and 0 backups
    expect(data.spofAssets.length).toBeGreaterThan(0);
    for (const spof of data.spofAssets) {
      expect(spof.assetName).toBeDefined();
      expect(spof.ownerName).toBeDefined();
      expect(spof.reason).toContain('Sole owner');
    }

    // David Miller personal token credential risk should be identified
    expect(data.credentialExposures.length).toBeGreaterThan(0);
    expect(data.credentialExposures.some((c) => c.credentialOwnerName === 'David Miller')).toBe(true);
  });

  it('generates executive prose adhering to SEC-07 (zero individual ranking)', async () => {
    const rawData = WeeklyBriefingService.compileBriefingData(ds);
    const prose = await WeeklyBriefingService.generateProse(rawData);

    expect(typeof prose).toBe('string');
    expect(prose.length).toBeGreaterThan(50);
    expect(prose).toContain('Executive Continuity Summary');

    // SEC-07 Invariant: Prose must never score or rank people
    const forbiddenPhrases = [
      'rank',
      'flight risk score',
      'churn probability',
      'worst employee',
      'least reliable',
    ];
    for (const phrase of forbiddenPhrases) {
      expect(prose.toLowerCase()).not.toContain(phrase);
    }
  });

  it('dispatches briefing email to admins and logs audit entry', async () => {
    const briefingService = new WeeklyBriefingService();
    const result = await briefingService.sendBriefing(ds, {
      to: ['admin@acme.com'],
    });

    expect(result.success).toBe(true);
    expect(result.recipientCount).toBe(1);
    expect(result.briefing.prose).toBeDefined();

    // Verify audit log entry
    const auditLogs = ds.getAuditLog({ action: 'SEND_WEEKLY_BRIEFING' });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].action).toBe('SEND_WEEKLY_BRIEFING');
    // No SMTP_HOST in tests: the audit entry must not claim a delivery that didn't happen.
    expect(auditLogs[0].details).toContain('not delivered (SMTP not configured)');
  });

  it('reports the headline with real numbers, never "undefined"', async () => {
    const data = WeeklyBriefingService.compileBriefingData(ds);
    const { coveredCount, exposedCount, unknownCount, totalCriticalAssets } = data.headline;
    for (const n of [coveredCount, exposedCount, unknownCount, totalCriticalAssets]) expect(typeof n).toBe('number');
    expect(coveredCount + exposedCount + unknownCount).toBe(totalCriticalAssets);
    const prose = await WeeklyBriefingService.generateProse(data);
    expect(prose).not.toContain('undefined');
    expect(prose).toContain(`${coveredCount} of ${totalCriticalAssets}`);
  });

  it('sends nothing when there is no admin to receive it', async () => {
    for (const u of ds.getUsers()) (u as any).role = 'viewer';
    const result = await new WeeklyBriefingService().sendBriefing(ds);
    expect(result).toMatchObject({ success: false, recipientCount: 0 });
    expect(ds.getAuditLog({ action: 'SEND_WEEKLY_BRIEFING' }).length).toBe(0);
  });

  it('credentialExposures skips linked accounts, deduplicates across linked accounts, and keeps unlinked accounts', async () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const g = ds.getGraph();
    const omar = { id: 'person:omar@acme.com', kind: 'person' as const, name: 'Omar Farooq', externalRefs: {}, createdAt: now, updatedAt: now };
    const acc1 = { id: 'account:n8n:wb1', kind: 'account' as const, name: 'Omar n8n 1', externalRefs: { source: 'n8n' }, createdAt: now, updatedAt: now };
    const acc2 = { id: 'account:openai:wb2', kind: 'account' as const, name: 'Omar OpenAI 2', externalRefs: { source: 'openai' }, createdAt: now, updatedAt: now };
    const unlinkedAcc = { id: 'account:n8n:wb_unlinked', kind: 'account' as const, name: 'Unlinked Cred Account', externalRefs: { source: 'n8n' }, createdAt: now, updatedAt: now };
    const wfMulti = { id: 'automation:n8n:wb_multi', kind: 'automation' as const, name: 'Multi Linked Cred Flow', externalRefs: {}, createdAt: now, updatedAt: now };
    const wfUnlinked = { id: 'automation:n8n:wb_unlinked', kind: 'automation' as const, name: 'Unlinked Cred Flow', externalRefs: {}, createdAt: now, updatedAt: now };

    g.addEntity(omar);
    g.addEntity(acc1);
    g.addEntity(acc2);
    g.addEntity(unlinkedAcc);
    g.addEntity(wfMulti);
    g.addEntity(wfUnlinked);

    g.addEdge({ id: 'ewb1', fromId: wfMulti.id, toId: acc1.id, type: 'runs_on_credentials_of', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });
    g.addEdge({ id: 'ewb2', fromId: wfMulti.id, toId: acc2.id, type: 'runs_on_credentials_of', grade: 'stated', source: 'connector:openai', validFrom: now, validTo: null });
    g.addEdge({ id: 'ewb3', fromId: wfUnlinked.id, toId: unlinkedAcc.id, type: 'runs_on_credentials_of', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });

    await ds.getLinkRepository().create({ accountId: acc1.id, personId: omar.id, grade: 'stated', method: 'exact_email', linkedBy: 'autoLink', note: null });
    await ds.getLinkRepository().create({ accountId: acc2.id, personId: omar.id, grade: 'confirmed', method: 'admin_link', linkedBy: 'admin', note: null });
    await ds.reattributeGraph();

    const data = WeeklyBriefingService.compileBriefingData(ds);
    const multiHits = data.credentialExposures.filter((c) => c.automationId === wfMulti.id);
    expect(multiHits).toEqual([
      { automationId: wfMulti.id, automationName: wfMulti.name, credentialOwnerName: 'Omar Farooq' },
    ]);
    const unlinkedHits = data.credentialExposures.filter((c) => c.automationId === wfUnlinked.id);
    expect(unlinkedHits).toEqual([
      { automationId: wfUnlinked.id, automationName: wfUnlinked.name, credentialOwnerName: 'Unlinked Cred Account' },
    ]);
  });
});
