// =============================================================================
// Horquva Continuity Platform — Sync failure classes
// =============================================================================
// A connector's modules fail in one of two ways, and persistSync treats them
// differently:
// - core modules define entities and ownership (users, projects, keys,
//   workflows, the apps list, owner reads). A failure counts as an error, so
//   nothing this connection asserted earlier is closed: a missing page must
//   not look like a removed owner.
// - optional enrichments only add facts (costs, usage, manager, leave date,
//   credential expiry). A failure is a warning; the module's facts are left
//   out, and closing vanished rows then retires their old values, so the UI
//   shows "unknown" instead of a stale number.
// Without the split, a key lacking one optional permission would hold
// errors > 0 forever and stale rows would never close.
// =============================================================================

import { SyncStats } from './types.js';

const MAX_REASON_LENGTH = 300;

function describe(module: string, err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `${module}: ${message}`.slice(0, MAX_REASON_LENGTH);
}

export class SyncIssues {
  public readonly errorReasons: string[] = [];
  public readonly warnings: string[] = [];

  /** A core module failed: this sync is partial and must close nothing. */
  public core(module: string, err: unknown): void {
    this.errorReasons.push(describe(module, err));
  }

  /** An optional enrichment failed: its facts were omitted. */
  public optional(module: string, err: unknown): void {
    this.warnings.push(describe(module, err));
  }

  public stats(): Pick<SyncStats, 'errors' | 'errorReasons' | 'warnings'> {
    return { errors: this.errorReasons.length, errorReasons: this.errorReasons, warnings: this.warnings };
  }
}
