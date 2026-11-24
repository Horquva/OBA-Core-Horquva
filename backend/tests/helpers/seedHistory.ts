import crypto from 'node:crypto';
import type { DataService } from '../../src/services/dataService.js';
import { SnapshotService } from '../../src/services/snapshot/snapshotService.js';
import { query } from '../../src/db/client.js';

export async function seedDemoHistory(ds: DataService, days = 60, now: Date = new Date()): Promise<number> {
  const { headline, teamConcentration, automationFailures } = SnapshotService.computeMetrics(ds);
  const total = headline.totalCriticalAssets;
  const coveredStart = Math.max(0, Math.round(headline.coveredCount * 0.4) - 1);
  const unknownStart = Math.min(total - coveredStart, headline.unknownCount + Math.ceil(total * 0.25));
  let inserted = 0;

  for (let i = days; i >= 1; i--) {
    const snapshotDate = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const f = (days - i) / days; // 0 at the start of the window, approaching 1 by yesterday
    const covered = Math.round(coveredStart + (headline.coveredCount - coveredStart) * f * f);
    const unknown = Math.round(unknownStart + (headline.unknownCount - unknownStart) * f);
    const exposed = Math.max(0, total - covered - unknown);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const head = { ...headline, coveredCount: covered, unknownCount: unknown, exposedCount: exposed };

    if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
      const res = await query(
        `INSERT INTO daily_snapshot (id, snapshot_date, headline, team_concentration, automation_failures, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (snapshot_date) DO NOTHING`,
        [id, snapshotDate, JSON.stringify(head), JSON.stringify(teamConcentration), JSON.stringify(automationFailures), createdAt],
      );
      inserted += res.rowCount ?? 0;
    } else if (!SnapshotService.hasInMemorySnapshot(snapshotDate)) {
      SnapshotService.saveInMemorySnapshot({
        id,
        snapshotDate,
        headline: head,
        teamConcentration,
        automationFailures,
        createdAt,
      });
      inserted++;
    }
  }
  return inserted;
}
