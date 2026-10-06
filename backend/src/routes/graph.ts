// =============================================================================
// Horquva Continuity Platform — Graph REST API
// =============================================================================
// Implements SRS Graph Visualization & Ego-Graph Extraction:
// - GET /api/graph/neighbourhood (1-hop or 2-hop BFS neighbourhood)
// - GET /api/graph/blast-radius (Downstream and upstream impact paths)
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { evaluateAllChecks } from '../domain/checks/index.js';
import { EntityKind, EdgeType, EvidenceGrade } from '@horquva/types';

export const graphRouter = Router();

// 1. GET /api/graph/neighbourhood
graphRouter.get('/neighbourhood', (req: Request, res: Response) => {
  try {
    const rootId = req.query.root as string;
    const hops = parseInt((req.query.hops as string) || '2', 10);

    if (!rootId) {
      res.status(400).json({ error: 'root query parameter is required.' });
      return;
    }

    const dataService = DataService.getInstance();
    const graph = dataService.getGraph();

    if (!graph.getNode(rootId)) {
      res.status(404).json({ error: `Root entity ${rootId} not found in graph.` });
      return;
    }

    // BFS extraction up to `hops` levels
    const visitedNodes = new Set<string>([rootId]);
    let currentLevel = new Set<string>([rootId]);

    for (let h = 0; h < hops; h++) {
      const nextLevel = new Set<string>();
      for (const nodeId of currentLevel) {
        const edges = graph.getEdgesForEntity(nodeId);
        for (const e of edges) {
          if (!visitedNodes.has(e.fromId)) {
            visitedNodes.add(e.fromId);
            nextLevel.add(e.fromId);
          }
          if (!visitedNodes.has(e.toId)) {
            visitedNodes.add(e.toId);
            nextLevel.add(e.toId);
          }
        }
      }
      currentLevel = nextLevel;
      if (currentLevel.size === 0) break;
    }

    // Evaluate all checks to assign failure/unknown rings
    const allChecks = evaluateAllChecks(graph);
    const checksByEntity = new Map<string, string[]>();
    for (const c of allChecks) {
      if (!checksByEntity.has(c.entityId)) {
        checksByEntity.set(c.entityId, []);
      }
      checksByEntity.get(c.entityId)!.push(c.status);
    }

    // Build nodes view
    const nodes: any[] = [];
    for (const nId of visitedNodes) {
      const node = graph.getNode(nId);
      if (node?.entity) {
        const statuses = checksByEntity.get(nId) || [];
        let ring: 'fail' | 'unknown' | null = null;
        if (statuses.includes('FAIL')) ring = 'fail';
        else if (statuses.includes('UNKNOWN')) ring = 'unknown';

        nodes.push({
          id: node.entity.id,
          kind: node.entity.kind as EntityKind,
          name: node.entity.name,
          ring,
        });
      }
    }

    // Build edges view (only between visited nodes)
    const edges: any[] = [];
    const allEdges = graph.getAllEdges();
    for (const e of allEdges) {
      if (visitedNodes.has(e.fromId) && visitedNodes.has(e.toId)) {
        edges.push({
          id: e.id || `${e.fromId}-${e.type}-${e.toId}`,
          from: e.fromId,
          to: e.toId,
          type: e.type as EdgeType,
          grade: e.grade as EvidenceGrade,
        });
      }
    }

    res.json({
      rootId,
      nodes,
      edges,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch neighbourhood.' });
  }
});

// 2. GET /api/graph/blast-radius
graphRouter.get('/blast-radius', (req: Request, res: Response) => {
  try {
    const rootId = req.query.root as string;

    if (!rootId) {
      res.status(400).json({ error: 'root query parameter is required.' });
      return;
    }

    const dataService = DataService.getInstance();
    const graph = dataService.getGraph();

    if (!graph.getNode(rootId)) {
      res.status(404).json({ error: `Root entity ${rootId} not found in graph.` });
      return;
    }

    const downstream = graph.getDownstreamImpact(rootId);

    // Upstream walk: entities pointing into rootId following dependency edges
    const upstreamVisited = new Set<string>();
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const edges = graph.getEdgesForEntity(current);
      for (const e of edges) {
        if (
          e.toId === current &&
          e.fromId !== rootId &&
          !upstreamVisited.has(e.fromId) &&
          (e.type === 'depends_on' || e.type === 'calls_model' || e.type === 'runs_on_credentials_of')
        ) {
          upstreamVisited.add(e.fromId);
          queue.push(e.fromId);
        }
      }
    }

    res.json({
      rootId,
      downstream,
      upstream: Array.from(upstreamVisited),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch blast radius.' });
  }
});
