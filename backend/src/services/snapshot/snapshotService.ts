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
      if (change.kind === 'credential_risk' || change.kind === 'failure_spiked') {
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
      } catch {
        // In-process fallback is active
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
        const res = await query('SELECT * FROM daily_snapshot WHERE snapshot_date = $1', [snapshotDate]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            snapshotDate: typeof row.snapshot_date === 'string' ? row.snapshot_date : row.snapshot_date.toISOString().slice(0, 10),
            headline: typeof row.headline === 'string' ? JSON.parse(row.headline) : row.headline,
            teamConcentration: typeof row.team_concentration === 'string' ? JSON.parse(row.team_concentration) : row.team_concentration,
            automationFailures: typeof row.automation_failures === 'string' ? JSON.parse(row.automation_failures) : row.automation_failures,
            createdAt: row.created_at.toISOString(),
          };
        }
      } catch {
        // Fallback to in-memory
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
          SELECT * FROM daily_snapshot
           WHERE snapshot_date <= $1
           ORDER BY snapshot_date DESC
           LIMIT 1;
        `;
        const res = await query(sql, [targetDate]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            snapshotDate: typeof row.snapshot_date === 'string' ? row.snapshot_date : row.snapshot_date.toISOString().slice(0, 10),
            headline: typeof row.headline === 'string' ? JSON.parse(row.headline) : row.headline,
            teamConcentration: typeof row.team_concentration === 'string' ? JSON.parse(row.team_concentration) : row.team_concentration,
            automationFailures: typeof row.automation_failures === 'string' ? JSON.parse(row.automation_failures) : row.automation_failures,
            createdAt: row.created_at.toISOString(),
          };
        }
      } catch {
        // Fallback
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
   * Returns all stored snapshots ordered newest first.
   */
  public static async listSnapshots(limit = 30): Promise<DailySnapshotRecord[]> {
    try {
      const res = await query('SELECT * FROM daily_snapshot ORDER BY snapshot_date DESC LIMIT $1', [limit]);
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
          id: row.id,
          snapshotDate: typeof row.snapshot_date === 'string' ? row.snapshot_date : row.snapshot_date.toISOString().slice(0, 10),
          headline: typeof row.headline === 'string' ? JSON.parse(row.headline) : row.headline,
          teamConcentration: typeof row.team_concentration === 'string' ? JSON.parse(row.team_concentration) : row.team_concentration,
          automationFailures: typeof row.automation_failures === 'string' ? JSON.parse(row.automation_failures) : row.automation_failures,
          createdAt: row.created_at.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }

    return Array.from(inMemorySnapshots.values())
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))
      .slice(0, limit);
  }
}
