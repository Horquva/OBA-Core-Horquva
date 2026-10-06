// =============================================================================
// Horquva Continuity Platform — People & Teams REST API
// =============================================================================
// Implements SRS UI-04 & UI-05:
// - GET /api/people/teams (Rollup logic, coverage metrics, concentration)
// - GET /api/people/teams/:id (Team detail with member holdings)
// - GET /api/people/:id (Person detail, holdings, open handovers)
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { CriticalityLevel, EvidenceGrade } from '@horquva/types';

export const peopleRouter = Router();

// Defined departments mapping benchmark people
const TEAMS_CONFIG = [
  {
    id: 'team_platform',
    name: 'Platform Engineering',
    memberIds: [
      'person:omar@acme.com',
      'person:chen@acme.com',
      'person:maya@acme.com',
      'person:david@acme.com',
      'person:elena@acme.com',
    ],
  },
  {
    id: 'team_revops',
    name: 'Revenue Operations',
    memberIds: [
      'person:sarah@acme.com',
      'person:liam@acme.com',
      'person:priya@acme.com',
      'person:carlos@acme.com',
      'person:aisha@acme.com',
    ],
  },
];

function buildHoldings(personId: string, dataService: DataService): any[] {
  const graph = dataService.getGraph();
  const holdings: any[] = [];

  // 1. Owned assets
  const owned = graph.getOwnedAssets(personId);
  for (const asset of owned) {
    const node = graph.getNode(asset.id);
    const crit = (node?.facts.get('criticality')?.value as CriticalityLevel) || 'medium';
    const backups = graph.getBackups(asset.id);
    const backupFact = backups.length > 0
      ? {
          state: 'value' as const,
          display: backups[0].name,
          grade: 'confirmed' as EvidenceGrade,
          source: 'attestation',
          observedAt: new Date().toISOString(),
          ref: { id: backups[0].id, kind: backups[0].kind, name: backups[0].name },
        }
      : {
          state: 'none' as const,
          display: null,
          grade: 'unknown' as EvidenceGrade,
          source: null,
          observedAt: null,
          ref: null,
        };

    holdings.push({
      asset: { id: asset.id, kind: asset.kind, name: asset.name },
      relation: 'owns',
      criticality: crit,
      backup: backupFact,
    });
  }

  // 2. Backed up assets
  const allNodes = graph.getAllNodes();
  for (const n of allNodes) {
    if (n.entity.kind === 'automation') {
      const backups = graph.getBackups(n.entity.id);
      if (backups.some((b) => b.id === personId)) {
        const crit = (n.facts.get('criticality')?.value as CriticalityLevel) || 'medium';
        holdings.push({
          asset: { id: n.entity.id, kind: n.entity.kind, name: n.entity.name },
          relation: 'backs_up',
          criticality: crit,
          backup: {
            state: 'value' as const,
            display: 'Self',
            grade: 'confirmed' as EvidenceGrade,
            source: 'attestation',
            observedAt: new Date().toISOString(),
            ref: { id: personId, kind: 'person' as const, name: personId.replace('person:', '') },
          },
        });
      }
    }
  }

  // 3. Personal credentials
  const edges = graph.getEdgesForEntity(personId);
  for (const e of edges) {
    if (e.type === 'runs_on_credentials_of' && e.toId === personId) {
      const wfNode = graph.getNode(e.fromId);
      if (wfNode?.entity) {
        const crit = (wfNode.facts.get('criticality')?.value as CriticalityLevel) || 'medium';
        holdings.push({
          asset: { id: wfNode.entity.id, kind: wfNode.entity.kind, name: wfNode.entity.name },
          relation: 'credential',
          criticality: crit,
          backup: {
            state: 'none' as const,
            display: null,
            grade: 'unknown' as EvidenceGrade,
            source: null,
            observedAt: null,
            ref: null,
          },
        });
      }
    }
  }

  return holdings;
}

function computeTeamSummary(teamConfig: typeof TEAMS_CONFIG[0], dataService: DataService, minGroupSize: number) {
  const graph = dataService.getGraph();
  const memberCount = teamConfig.memberIds.length;
  const rolledUp = memberCount < minGroupSize;

  let totalCritical = 0;
  let coveredCritical = 0;
  const criticalPerPerson = new Map<string, number>();

  for (const mId of teamConfig.memberIds) {
    const owned = graph.getOwnedAssets(mId);
    let personCritCount = 0;

    for (const asset of owned) {
      const node = graph.getNode(asset.id);
      const crit = node?.facts.get('criticality')?.value;
      if (crit === 'critical' || crit === 'high') {
        totalCritical++;
        personCritCount++;
        const backups = graph.getBackups(asset.id);
        if (backups.length > 0) {
          coveredCritical++;
        }
      }
    }

    if (personCritCount > 0) {
      criticalPerPerson.set(mId, personCritCount);
    }
  }

  const exposed = totalCritical - coveredCritical;

  let concentration = null;
  if (totalCritical > 0 && criticalPerPerson.size > 0) {
    const holders: any[] = [];
    let topHolderId = '';
    let topCount = 0;

    for (const [pId, count] of criticalPerPerson.entries()) {
      const sharePct = Math.round((count / totalCritical) * 100);
      const node = graph.getNode(pId);
      const personRef = node?.entity
        ? { id: node.entity.id, kind: node.entity.kind, name: node.entity.name }
        : { id: pId, kind: 'person' as const, name: pId.replace('person:', '') };

      holders.push({ person: personRef, sharePct });
      if (count > topCount) {
        topCount = count;
        topHolderId = pId;
      }
    }

    holders.sort((a, b) => b.sharePct - a.sharePct);
    const topNode = graph.getNode(topHolderId);
    const topName = topNode?.entity?.name || topHolderId;
    const topShare = Math.round((topCount / totalCritical) * 100);

    concentration = {
      sentence: `${topName} holds ${topShare}% of team critical automations.`,
      holders,
    };
  }

  return {
    id: teamConfig.id,
    name: teamConfig.name,
    memberCount,
    rolledUp,
    coverage: {
      total: totalCritical,
      covered: coveredCritical,
      exposed,
      unknown: null,
      definition: 'Critical automations with at least one confirmed backup.',
    },
    concentration,
  };
}

// 1. GET /api/people/teams
peopleRouter.get('/teams', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const minGroupSize = dataService.getOrganization().minGroupSize;
    const summaries = TEAMS_CONFIG.map((tc) => computeTeamSummary(tc, dataService, minGroupSize));
    res.json({ teams: summaries, minGroupSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch teams.' });
  }
});

// 2. GET /api/people/teams/:id
peopleRouter.get('/teams/:id', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const minGroupSize = dataService.getOrganization().minGroupSize;
    const teamConfig = TEAMS_CONFIG.find((tc) => tc.id === req.params.id);
    if (!teamConfig) {
      res.status(404).json({ error: `Team ${req.params.id} not found.` });
      return;
    }

    const team = computeTeamSummary(teamConfig, dataService, minGroupSize);
    const graph = dataService.getGraph();

    const members = teamConfig.memberIds.map((mId) => {
      const node = graph.getNode(mId);
      const person = node?.entity
        ? { id: node.entity.id, kind: node.entity.kind, name: node.entity.name }
        : { id: mId, kind: 'person' as const, name: mId.replace('person:', '') };

      const holdings = buildHoldings(mId, dataService);

      return {
        person,
        title: node?.entity?.description || 'Software Engineer',
        holdings,
      };
    });

    res.json({ team, members });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch team detail.' });
  }
});

// 3. GET /api/people/:id
peopleRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const personId = decodeURIComponent(String(req.params.id));
    const graph = dataService.getGraph();
    const node = graph.getNode(personId);

    if (!node || node.entity.kind !== 'person') {
      res.status(404).json({ error: `Person ${personId} not found.` });
      return;
    }

    const holdings = buildHoldings(personId, dataService);

    // Find team
    const teamConfig = TEAMS_CONFIG.find((tc) => tc.memberIds.includes(personId));
    const team = teamConfig ? { id: teamConfig.id, kind: 'group' as const, name: teamConfig.name } : null;

    // Open handovers where this person is the successor or from
    const openHandovers: any[] = [];
    const departures = dataService.getDepartures();
    for (const dep of departures) {
      const relevant = dep.handovers.filter((h) => h.successorId === personId && h.acceptance !== 'accepted');
      if (relevant.length > 0) {
        const fromNode = graph.getNode(dep.personId);
        openHandovers.push({
          departureId: dep.id,
          from: fromNode?.entity
            ? { id: fromNode.entity.id, kind: fromNode.entity.kind, name: fromNode.entity.name }
            : { id: dep.personId, kind: 'person' as const, name: dep.personId.replace('person:', '') },
          assetCount: relevant.length,
        });
      }
    }

    res.json({
      person: { id: node.entity.id, kind: node.entity.kind, name: node.entity.name },
      title: node.entity.description || 'Senior Engineer',
      team,
      holdings,
      openHandovers,
      pendingConfirmations: 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch person detail.' });
  }
});
