"""
M32 — Dependency Impact Intelligence
Constitutional Question: "If this dependency fails, what breaks?"
Purpose: Predict cascading impacts caused by dependency failures across
         people, systems, and processes.

Owner: Tahir — Prediction Layer
"""

from collections import deque
from typing import List, Dict, Any


def build_reverse_index(nodes: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """Build a reverse-dependency map: node_id -> [ids that depend on it]."""
    reverse = {n["id"]: [] for n in nodes}
    for n in nodes:
        for dep_id in n.get("dependsOn", []):
            reverse.setdefault(dep_id, [])
            reverse[dep_id].append(n["id"])
    return reverse


def simulate_failure(nodes: List[Dict[str, Any]], failed_node_id: str) -> Dict[str, Any]:
    """Simulate cascading failure starting from a failed node."""
    by_id = {n["id"]: n for n in nodes}
    reverse = build_reverse_index(nodes)

    if failed_node_id not in by_id:
        raise ValueError(f"Unknown node: {failed_node_id}")

    DECAY = 0.65
    visited = {failed_node_id: {"distance": 0, "impact": 1.0}}
    queue = deque([{"id": failed_node_id, "distance": 0, "impact": 1.0}])

    while queue:
        current = queue.popleft()
        for dep_id in reverse.get(current["id"], []):
            node = by_id[dep_id]
            propagated_impact = current["impact"] * DECAY * node.get("criticality", 0.5)
            existing = visited.get(dep_id)
            if existing is None or propagated_impact > existing["impact"]:
                visited[dep_id] = {"distance": current["distance"] + 1, "impact": propagated_impact}
                queue.append({"id": dep_id, "distance": current["distance"] + 1, "impact": propagated_impact})

    impacted_nodes = []
    for node_id, v in visited.items():
        if node_id == failed_node_id:
            continue
        node = by_id.get(node_id, {})
        impact = v["impact"]
        severity = (
            "critical" if impact > 0.5 else
            "high" if impact > 0.2 else
            "moderate" if impact > 0.05 else
            "low"
        )
        impacted_nodes.append({
            "id": node_id,
            "name": node.get("name", node_id),
            "type": node.get("type"),
            "hopsFromFailure": v["distance"],
            "impactScore": round(impact, 3),
            "severity": severity,
        })

    impacted_nodes.sort(key=lambda x: x["impactScore"], reverse=True)
    blast_radius = max([n["hopsFromFailure"] for n in impacted_nodes], default=0)

    return {
        "failedNode": failed_node_id,
        "totalImpactedNodes": len(impacted_nodes),
        "blastRadius": blast_radius,
        "impactedNodes": impacted_nodes,
    }


def rank_single_points_of_failure(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank all nodes by how dangerous their failure would be."""
    results = []
    for n in nodes:
        result = simulate_failure(nodes, n["id"])
        aggregate_impact = sum(x["impactScore"] for x in result["impactedNodes"])
        results.append({
            "id": n["id"],
            "name": n.get("name", n["id"]),
            "criticality": n.get("criticality"),
            "dependentsAffected": result["totalImpactedNodes"],
            "aggregateImpactScore": round(aggregate_impact, 3),
        })
    results.sort(key=lambda x: x["aggregateImpactScore"], reverse=True)
    return results
