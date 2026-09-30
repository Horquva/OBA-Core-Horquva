// =============================================================================
// Horquva Continuity Platform — Deterministic A/B Testing Engine
// =============================================================================
// Zero-third-party, privacy-preserving experiment allocation:
// - Uses SHA-256 deterministic hash of (experimentId + ":" + subjectId)
// - Consistent assignment across sessions, web forms, and server-side routes
// =============================================================================

import crypto from 'node:crypto';

export interface ExperimentVariantConfig {
  name: string;
  weight: number; // percentage (0 to 100)
}

export interface ExperimentDefinition {
  id: string;
  name: string;
  variants: ExperimentVariantConfig[];
}

export class ABTestingEngine {
  /**
   * Deterministically assigns a subject to an experiment variant.
   * Reproduces the identical result in TypeScript and PostgreSQL SHA256.
   */
  public static assignVariant(
    experimentId: string,
    subjectId: string,
    variants: ExperimentVariantConfig[]
  ): string {
    if (!variants || variants.length === 0) {
      throw new Error(`[ABTestingEngine] Experiment '${experimentId}' has no variants defined.`);
    }

    if (variants.length === 1) {
      return variants[0].name;
    }

    // 1. Calculate SHA256 hex digest
    const hash = crypto
      .createHash('sha256')
      .update(`${experimentId}:${subjectId}`)
      .digest('hex');

    // 2. Take first 8 hex characters (32 bits) and convert to integer
    const hashInt = parseInt(hash.substring(0, 8), 16);

    // 3. Modulo 100 gives bucket between 0 and 99
    const bucket = hashInt % 100;

    // 4. Map bucket to variant by cumulative weight
    let cumulative = 0;
    for (const v of variants) {
      cumulative += v.weight;
      if (bucket < cumulative) {
        return v.name;
      }
    }

    // Fallback to last variant in case weights don't sum precisely to 100
    return variants[variants.length - 1].name;
  }
}
