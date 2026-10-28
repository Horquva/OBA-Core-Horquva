// =============================================================================
// Horquva Continuity Platform — Departure Initiation + Handover Pack (HND-01/02)
// =============================================================================
// Initiating a departure validates the request, runs the S1 leaver simulation
// for that person, and freezes the result as a JSON handover pack on the
// departure. The pack is evidence-honest: facts the graph does not hold are
// reported as 'unknown', never as 'no' (DATA-03).
// =============================================================================

import type { FactAttribute, WhatIfScenarioResult } from '@horquva/types';
import { SimulationEngine } from '../domain/simulation/index.js';
import type { ContinuityGraph } from '../domain/graph/index.js';
import type { DataService, DepartureRecord } from '../services/dataService.js';

export class DepartureError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = 'DepartureError';
  }
}

export type TriState = 'yes' | 'no' | 'unknown';

export interface HandoverPackAsset {
  asset: { id: string; kind: string; name: string };
  /** Value as held in the graph; 'unknown' when no fact (or an unknown-grade fact) exists. */
  criticality: string;
  criticalityGrade: string;
  documented: TriState;
  fallbackExists: TriState;
  /** True when S1 finds no other owner or backup left once this person goes. */
  orphanedOnDeparture: boolean;
  remainingCoverage: Array<{ id: string; name: string; via: 'owner' | 'backup' }>;
  weeklyRuns: number | null;
}

export interface HandoverPack {
  version: 1;
  departureId: string;
  person: { id: string; name: string };
  leaveDate: string;
  generatedAt: string;
  assets: HandoverPackAsset[];
  personalCredentialAutomations: WhatIfScenarioResult['stoppedPersonalCredentialAutomations'];
  /** AI vendor keys to rotate or revoke (absent on packs from before keys, and when there are none). */
  keys?: NonNullable<WhatIfScenarioResult['keysAtRisk']>;
  affectedDownstreamAssetIds: string[];
  summary: {
    assetsTotal: number;
    orphanedOnDeparture: number;
    personalCredentialAutomations: number;
    totalRunsPerWeekAffected: number;
    unknownFactsEncountered: number;
  };
  /** Raw S1 output the pack was built from, kept for audit and PDF rendering (RPT-01). */
  simulation: WhatIfScenarioResult;
}

function triState(graph: ContinuityGraph, entityId: string, attribute: FactAttribute): TriState {
  const fact = graph.getNode(entityId)?.facts.get(attribute);
  if (!fact || fact.grade === 'unknown' || typeof fact.value !== 'boolean') return 'unknown';
  return fact.value ? 'yes' : 'no';
}

export function buildHandoverPack(
  graph: ContinuityGraph,
  input: { departureId: string; personId: string; leaveDate: string },
  now: Date = new Date()
): HandoverPack {
  const simulation = new SimulationEngine(graph).simulateDeparture([input.personId]);
  const orphaned = new Set(simulation.orphanedCriticalAssets.map((a) => a.entityId));
  const personNode = graph.getNode(input.personId);

  const assets: HandoverPackAsset[] = graph.getOwnedAssets(input.personId).map((asset) => {
    const facts = graph.getNode(asset.id)?.facts;
    const crit = facts?.get('criticality');
    const runs = facts?.get('run_volume_weekly');
    const remainingCoverage = [
      ...graph.getOwners(asset.id).map((p) => ({ id: p.id, name: p.name, via: 'owner' as const })),
      ...graph.getBackups(asset.id).map((p) => ({ id: p.id, name: p.name, via: 'backup' as const })),
    ].filter((p) => p.id !== input.personId);

    return {
      asset: { id: asset.id, kind: asset.kind, name: asset.name },
      criticality: crit && crit.grade !== 'unknown' ? String(crit.value) : 'unknown',
      criticalityGrade: crit?.grade ?? 'unknown',
      documented: triState(graph, asset.id, 'documented'),
      fallbackExists: triState(graph, asset.id, 'fallback_exists'),
      orphanedOnDeparture: orphaned.has(asset.id),
      remainingCoverage,
      weeklyRuns: typeof runs?.value === 'number' ? runs.value : null,
    };
  });

  return {
    version: 1,
    departureId: input.departureId,
    person: { id: input.personId, name: personNode?.entity?.name ?? input.personId },
    leaveDate: input.leaveDate,
    generatedAt: now.toISOString(),
    assets,
    personalCredentialAutomations: simulation.stoppedPersonalCredentialAutomations,
    ...(simulation.keysAtRisk ? { keys: simulation.keysAtRisk } : {}),
    affectedDownstreamAssetIds: simulation.affectedDownstreamAssetIds,
    summary: {
      assetsTotal: assets.length,
      orphanedOnDeparture: assets.filter((a) => a.orphanedOnDeparture).length,
      personalCredentialAutomations: simulation.stoppedPersonalCredentialAutomations.length,
      totalRunsPerWeekAffected: simulation.totalRunsPerWeekAffected,
      unknownFactsEncountered: simulation.unknownFactsEncountered,
    },
    simulation,
  };
}

export interface InitiateDepartureInput {
  personId: string;
  leaveDate: string;
  note: string | null;
  detectedFrom?: DepartureRecord['detectedFrom'];
}

/** HND-01 + HND-02: validate, create the departure, and attach its handover pack. */
export function initiateDeparture(ds: DataService, input: InitiateDepartureInput): DepartureRecord {
  const graph = ds.getGraph();
  const person = graph.getNode(input.personId)?.entity;
  if (!person || person.kind !== 'person') {
    throw new DepartureError(404, `No person ${input.personId} exists in the organization graph.`);
  }

  const leave = new Date(input.leaveDate);
  if (Number.isNaN(leave.getTime())) {
    throw new DepartureError(400, 'leaveDate must be a valid date.');
  }

  const active = ds.getDepartures().find((d) => d.personId === input.personId && d.stage !== 'verified');
  if (active) {
    throw new DepartureError(409, `${person.name} already has an open departure (${active.id}).`);
  }

  const leaveDate = leave.toISOString();
  return ds.createDeparture(
    { personId: input.personId, leaveDate, note: input.note },
    {
      detectedFrom: input.detectedFrom ?? 'manual',
      buildPack: (departureId) => buildHandoverPack(graph, { departureId, personId: input.personId, leaveDate }),
    }
  );
}
