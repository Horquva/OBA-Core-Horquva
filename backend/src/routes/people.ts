// =============================================================================
// Horquva Continuity Platform — People & Teams REST API
// =============================================================================
// Implements SRS UI-03 & SIM-06:
// - GET /api/people/teams (directory groups, coverage, concentration)
// - GET /api/people/teams/:id (team detail; members alphabetical)
// - GET /api/people/:id (person holdings, open handovers)
// Read models and the no-ranking rules live in views/peopleViews.ts.
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { holdingsOf, listTeams, teamDetail, teamOfPerson, teamSummary } from '../views/peopleViews.js';

export const peopleRouter = Router();

// 1. GET /api/people/teams
peopleRouter.get('/teams', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const minGroupSize = dataService.getOrganization().minGroupSize;
    const graph = dataService.getGraph();
    const teams = listTeams(graph).map((t) => teamSummary(graph, t, minGroupSize));
    res.json({ teams, minGroupSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch teams.' });
  }
});

// 2. GET /api/people/teams/:id
peopleRouter.get('/teams/:id', (req: Request, res: Response) => {
  try {
    const detail = teamDetail(DataService.getInstance(), decodeURIComponent(String(req.params.id)));
    if (!detail) {
      res.status(404).json({ error: `Team ${req.params.id} not found.` });
      return;
    }
    res.json(detail);
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

    // Handovers this person has been asked to take over and hasn't accepted yet.
    const openHandovers: any[] = [];
    for (const dep of dataService.getDepartures()) {
      const relevant = dep.handovers.filter((h) => h.successorId === personId && h.acceptance !== 'accepted');
      if (relevant.length > 0) {
        const from = graph.getNode(dep.personId)?.entity;
        openHandovers.push({
          departureId: dep.id,
          from: from ? { id: from.id, kind: from.kind, name: from.name } : { id: dep.personId, kind: 'person', name: dep.personId },
          assetCount: relevant.length,
        });
      }
    }

    res.json({
      person: { id: node.entity.id, kind: node.entity.kind, name: node.entity.name },
      title: node.entity.description ?? null,
      team: teamOfPerson(graph, personId),
      holdings: holdingsOf(graph, personId),
      openHandovers,
      // Attestation tasks live in the attestation store, not this graph; not counted here yet.
      pendingConfirmations: null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch person detail.' });
  }
});
