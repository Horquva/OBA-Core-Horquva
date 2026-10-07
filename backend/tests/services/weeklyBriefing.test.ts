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
    expect(auditLogs[0].details).toContain('Dispatched weekly briefing');
  });
});
