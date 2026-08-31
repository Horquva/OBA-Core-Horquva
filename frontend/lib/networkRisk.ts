import { Dataset } from '../types';

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

export function computeNetworkRisk(dataset: Dataset): NetworkReport {
  // 1. Gather all unique people who own agents or workflows
  const people = new Set<string>();
  const assetToOwner: Record<string, string> = {};

  dataset.agents?.forEach(a => {
    if (a.owner) {
      people.add(a.owner);
      assetToOwner[a.id] = a.owner;
    }
  });
  dataset.workflows?.forEach(w => {
    if (w.owner) {
      people.add(w.owner);
      assetToOwner[w.id] = w.owner;
    }
  });

  // 2. Build edges based on dependencies
  // if Agent A (owned by P1) depends on Agent B (owned by P2) -> P1 depends on P2.
  // source = P1, target = P2
  const edgeMap: Record<string, number> = {};

  dataset.dependencies?.forEach(dep => {
    const fromOwner = assetToOwner[dep.from];
    const toOwner = assetToOwner[dep.to];
    if (fromOwner && toOwner && fromOwner !== toOwner) {
      const edgeId = `${fromOwner}->${toOwner}`;
      edgeMap[edgeId] = (edgeMap[edgeId] || 0) + 1;
    }
  });

  const edges: PersonEdge[] = Object.entries(edgeMap).map(([id, weight]) => {
    const [source, target] = id.split('->');
    return { id, source, target, weight };
  });

  // 3. Compute node degrees
  const inMap: Record<string, number> = {};
  const outMap: Record<string, number> = {};
  
  edges.forEach(e => {
    outMap[e.source] = (outMap[e.source] || 0) + e.weight;
    inMap[e.target] = (inMap[e.target] || 0) + e.weight;
  });

  const nodes: PersonNode[] = Array.from(people).map(name => {
    const inD = inMap[name] || 0;
    const outD = outMap[name] || 0;
    const centralityScore = inD + outD;
    
    return {
      id: name,
      name,
      inDegree: inD,
      outDegree: outD,
      centralityScore,
      isIsolated: centralityScore === 0,
      isBottleneck: false, // calculate later
    };
  });

  // Calculate bottlenecks (top 15% centrality or above a threshold)
  nodes.sort((a, b) => b.centralityScore - a.centralityScore);
  const maxScore = nodes[0]?.centralityScore || 0;
  
  nodes.forEach(n => {
    // Arbitrary heuristic: if you have >= 6 total connections or > 75% of max score, you're a bottleneck
    if (!n.isIsolated && (n.centralityScore >= 6 || (maxScore >= 4 && n.centralityScore >= maxScore * 0.75))) {
      n.isBottleneck = true;
    }
  });

  return {
    nodes,
    edges,
    maxCentralityHolder: nodes.length > 0 ? nodes[0] : null,
    bottleneckCount: nodes.filter(n => n.isBottleneck).length,
    isolatedCount: nodes.filter(n => n.isIsolated).length,
  };
}
