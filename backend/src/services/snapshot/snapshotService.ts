// =============================================================================
// Horquva Continuity Platform — Daily Continuity Snapshot Service (TRD-01, G-21)
// =============================================================================
// Captures and stores dated snapshots of headline metrics at least daily:
// - Coverage count (covered, exposed, unknown, total)
// - Ownerless assets, open handovers, unconfirmed facts
// - Concentration per team and automation failures
// Enables diffing historical continuity state across user visits (backupsLost, newlyExposed).
// Dual-mode: writes to PostgreSQL daily_snapshot table when connected,
// falling back to in-memory persistence in development and testing.
// =============================================================================

import crypto from 'node:crypto';
import type { DataService } from '../dataService.js';
import { calculateHeadlineMetrics } from '../../domain/checks/index.js';
import { query } from '../../db/client.js';

export interface DailyHeadlineMetrics {
  coveredCount: number;
  exposedCount: number;
  unknownCount: number;
  totalCriticalAssets: number;
  ownerlessAssets: number;
  openHandovers: number;
  unconfirmedFacts: number;
}

export interface TeamConcentrationMetric {
  team: string;
  criticalAssetCount: number;
}

export interface AutomationFailureMetric {
  automationId: string;
  automationName: string;
  failureCount: number;
}

export interface DailySnapshotRecord {
  id: string;
  snapshotDate: string; // 'YYYY-MM-DD'
  headline: DailyHeadlineMetrics;
  teamConcentration: TeamConcentrationMetric[];
  automationFailures: AutomationFailureMetric[];
  createdAt: string;
}

// In-memory fallback map keyed by snapshotDate ('YYYY-MM-DD')
const inMemorySnapshots = new Map<string, DailySnapshotRecord>();

// snapshot_date is read as text: node-pg turns a DATE into local midnight, which
// moves the day backwards in any timezone east of UTC.
const COLUMNS = 'id, snapshot_date::text AS snapshot_date, headline, team_concentration, automation_failures, created_at';

function rowToRecord(row: any): DailySnapshotRecord {
  const json = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    headline: json(row.headline),
    teamConcentration: json(row.team_concentration),
    automationFailures: json(row.automation_failures),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class SnapshotService {
  /**
   * Resets in-memory snapshot cache (used for unit tests).
   */
  public static resetInMemoryCache(): void {
    inMemorySnapshots.clear();
  }

  /**
   * Computes headline snapshot metrics from the active graph and departures.
   */
  public static computeMetrics(ds: DataService): {
    headline: DailyHeadlineMetrics;
    teamConcentration: TeamConcentrationMetric[];
    automationFailures: AutomationFailureMetric[];
  } {
    const graph = ds.getGraph();
    const baseHeadline = calculateHeadlineMetrics(graph);

    let ownerlessAssets = 0;
    let unconfirmedFacts = 0;

    for (const node of graph.getAllNodes()) {
      if (node.entity.kind === 'automation' || node.entity.kind === 'credential' || node.entity.kind === 'app') {
        const owners = graph.getOwners(node.entity.id);
        if (owners.length === 0) {
          ownerlessAssets++;
        }
      }
      for (const fact of node.facts.values()) {
        if (fact.grade !== 'confirmed') {
          unconfirmedFacts++;
        }
      }
    }

    // Open handovers across all non-verified departures
    let openHandovers = 0;
    for (const dep of ds.getDepartures()) {
      if (dep.stage !== 'verified') {
        openHandovers += dep.handovers.filter((h) => h.acceptance !== 'accepted').length;
      }
    }

    // Team concentration: count critical assets per team
    const teamCounts = new Map<string, number>();
    for (const node of graph.getAllNodes()) {
      const crit = node.facts.get('criticality')?.value;
      if (crit === 'critical' || crit === 'high') {
        const owners = graph.getOwners(node.entity.id);
        for (const o of owners) {
          const edges = graph.getEdgesForEntity(o.id);
          const memberEdge = edges.find((e) => e.type === 'member_of' && e.fromId === o.id);
          if (memberEdge) {
            const teamNode = graph.getNode(memberEdge.toId);
            const teamName = teamNode?.entity?.name ?? 'Unknown Team';
            teamCounts.set(teamName, (teamCounts.get(teamName) ?? 0) + 1);
          }
        }
      }
    }

    const teamConcentration: TeamConcentrationMetric[] = Array.from(teamCounts.entries()).map(
      ([team, criticalAssetCount]) => ({ team, criticalAssetCount })
    );

    // Automation failure counts from change events
    const failMap = new Map<string, { name: string; count: number }>();
    for (const change of ds.getChangeEvents()) {
      if (change.kind === 'credential_risk' || change.kind === 'failures_spiked') {
        const autoId = change.href?.replace('/assets/', '') ?? change.id;
        const cur = failMap.get(autoId) ?? { name: change.title, count: 0 };
        cur.count++;
        failMap.set(autoId, cur);
      }
    }

    const automationFailures: AutomationFailureMetric[] = Array.from(failMap.entries()).map(
      ([automationId, val]) => ({
        automationId,
        automationName: val.name,
        failureCount: val.count,
      })
    );

    return {
      headline: {
        coveredCount: baseHeadline.fullyCoveredCriticalAssets,
        exposedCount: baseHeadline.exposedCriticalAssets,
        unknownCount: baseHeadline.unknownCriticalAssets,
        totalCriticalAssets: baseHeadline.totalCriticalAssets,
        ownerlessAssets,
        openHandovers,
        unconfirmedFacts,
      },
      teamConcentration,
      automationFailures,
    };
  }

  private static shouldUseDatabase(): boolean {
    return Boolean(process.env.DATABASE_URL && process.env.NODE_ENV !== 'test');
  }

  /**
   * Captures and stores the dated continuity snapshot for today (or custom ISO date).
   */
  public static async captureDailySnapshot(
    ds: DataService,
    dateStr?: string
  ): Promise<DailySnapshotRecord> {
    const snapshotDate = dateStr ?? new Date().toISOString().slice(0, 10);
    const { headline, teamConcentration, automationFailures } = this.computeMetrics(ds);

    const record: DailySnapshotRecord = {
      id: crypto.randomUUID(),
      snapshotDate,
      headline,
      teamConcentration,
      automationFailures,
      createdAt: new Date().toISOString(),
    };

    // Always update in-memory cache
    inMemorySnapshots.set(snapshotDate, record);

    // Attempt PostgreSQL persistence if DB is active and not test
    if (this.shouldUseDatabase()) {
      try {
        const sql = `
          INSERT INTO daily_snapshot (id, snapshot_date, headline, team_concentration, automation_failures, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (snapshot_date) DO UPDATE
          SET headline = EXCLUDED.headline,
              team_concentration = EXCLUDED.team_concentration,
              automation_failures = EXCLUDED.automation_failures,
              created_at = EXCLUDED.created_at
          RETURNING id;
        `;
        await query(sql, [
          record.id,
          record.snapshotDate,
          JSON.stringify(record.headline),
          JSON.stringify(record.teamConcentration),
          JSON.stringify(record.automationFailures),
          record.createdAt,
        ]);
      } catch (err: any) {
        console.warn('[SnapshotService] Failed to persist daily snapshot; kept in memory only:', err.message);
      }
    }

    return record;
  }

  /**
   * Retrieves snapshot for a specific date (YYYY-MM-DD).
   */
  public static async getSnapshot(snapshotDate: string): Promise<DailySnapshotRecord | null> {
    if (this.shouldUseDatabase()) {
      try {
        const res = await query(`SELECT ${COLUMNS} FROM daily_snapshot WHERE snapshot_date = $1`, [snapshotDate]);
        if (res.rows.length > 0) {
          return rowToRecord(res.rows[0]);
        }
      } catch (err: any) {
        console.warn('[SnapshotService] Snapshot read failed; using in-memory snapshots:', err.message);
      }
    }
    return inMemorySnapshots.get(snapshotDate) ?? null;
  }

  /**
   * Finds the latest snapshot on or before a given date string.
   */
  public static async getLatestSnapshotBefore(isoDateOrString: string): Promise<DailySnapshotRecord | null> {
    const targetDate = isoDateOrString.slice(0, 10);

    if (this.shouldUseDatabase()) {
      try {
        const sql = `
          SELECT ${COLUMNS} FROM daily_snapshot
           WHERE snapshot_date <= $1
           ORDER BY snapshot_date DESC
           LIMIT 1;
        `;
        const res = await query(sql, [targetDate]);
        if (res.rows.length > 0) {
          return rowToRecord(res.rows[0]);
        }
      } catch (err: any) {
        console.warn('[SnapshotService] Snapshot read failed; using in-memory snapshots:', err.message);
      }
    }

    // In-memory search
    const matching = Array.from(inMemorySnapshots.values())
      .filter((s) => s.snapshotDate <= targetDate)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate));

    return matching[0] ?? null;
  }

  /**
   * Diffs two snapshots or a snapshot against current state to compute:
   * - backupsLost: positive delta in uncovered / exposed assets where backup was lost
   * - newlyExposed: net increase in exposed critical assets
   */
  public static diffSnapshots(
    earlier: DailySnapshotRecord,
    later: DailySnapshotRecord
  ): { backupsLost: number; newlyExposed: number } {
    // If exposed count grew, newly exposed is the increase
    const newlyExposed = Math.max(0, later.headline.exposedCount - earlier.headline.exposedCount);
    // If covered count shrank, backups were lost
    const backupsLost = Math.max(0, earlier.headline.coveredCount - later.headline.coveredCount);

    return {
      backupsLost,
      newlyExposed,
    };
  }

  /**
   * DEMO ONLY: back-fills `days` of daily snapshots before today for the demo org, so
   * the Overview history chart has a line to draw. The series is deterministic and
   * ends at today's real counts. Existing snapshots are never overwritten. Callers
   * must gate this on demoModeEnabled(); it must never run against customer data.
   */
  public static async seedDemoHistory(ds: DataService, days = 60, now: Date = new Date()): Promise<number> {
    const { headline, teamConcentration, automationFailures } = this.computeMetrics(ds);
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
      const record: DailySnapshotRecord = {
        id: crypto.randomUUID(),
        snapshotDate,
        headline: { ...headline, coveredCount: covered, unknownCount: unknown, exposedCount: exposed },
        teamConcentration,
        automationFailures,
        createdAt: new Date().toISOString(),
      };

      if (this.shouldUseDatabase()) {
        const res = await query(
          `INSERT INTO daily_snapshot (id, snapshot_date, headline, team_concentration, automation_failures, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (snapshot_date) DO NOTHING`,
          [record.id, snapshotDate, JSON.stringify(record.headline), JSON.stringify(teamConcentration), JSON.stringify(automationFailures), record.createdAt],
        );
        inserted += res.rowCount ?? 0;
      } else if (!inMemorySnapshots.has(snapshotDate)) {
        inMemorySnapshots.set(snapshotDate, record);
        inserted++;
      }
    }
    return inserted;
  }

  /**
   * Returns all stored snapshots ordered newest first.
   */
  public static async listSnapshots(limit = 30): Promise<DailySnapshotRecord[]> {
    if (!this.shouldUseDatabase()) {
      return Array.from(inMemorySnapshots.values())
        .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))
        .slice(0, limit);
    }
    try {
      const res = await query(`SELECT ${COLUMNS} FROM daily_snapshot ORDER BY snapshot_date DESC LIMIT $1`, [limit]);
      if (res.rows.length > 0) {
        return res.rows.map(rowToRecord);
      }
    } catch (err: any) {
      console.warn('[SnapshotService] Snapshot list failed; using in-memory snapshots:', err.message);
    }

    return Array.from(inMemorySnapshots.values())
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))
      .slice(0, limit);
  }
}
