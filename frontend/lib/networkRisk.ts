// Types for the People Centrality Graph. The computation itself lives on the
// backend now (backend/routes/network.js, GET /api/network/centrality) — this
// file used to also contain computeNetworkRisk(), a client-side reimplementation
// of the same algorithm; consolidated to one implementation, not duplicated.

export interface PersonNode {
  id: string;
  name: string;
  inDegree: number;
  outDegree: number;
  centralityScore: number;
  isIsolated: boolean;
  isBottleneck: boolean;
}

export interface PersonEdge {
  id: string;
  source: string; // person id
  target: string; // person id
  weight: number; // how many assets connect them
}

export interface NetworkReport {
  nodes: PersonNode[];
  edges: PersonEdge[];
  maxCentralityHolder: PersonNode | null;
  bottleneckCount: number;
  isolatedCount: number;
}
