"""
M33 — Dependency Evolution Intelligence
Constitutional Question: "How are dependencies changing over time?"
Purpose: Track the evolution of relationships between people, systems,
         and processes across historical snapshots.

Owner: Tahir — Prediction Layer
"""

from typing import List, Dict, Any


def diff_snapshots(prev: Dict[str, Any], next_: Dict[str, Any]) -> Dict[str, Any]:
    """Compare two consecutive snapshots and describe what changed."""
    prev_map = {n["id"]: set(n["dependsOn"]) for n in prev["nodes"]}
    next_map = {n["id"]: set(n["dependsOn"]) for n in next_["nodes"]}

    added, removed = [], []
    new_nodes, removed_nodes = [], []

    for node_id, deps in next_map.items():
        if node_id not in prev_map:
            new_nodes.append(node_id)
            continue
        prev_deps = prev_map[node_id]
        for d in deps - prev_deps:
            added.append({"node": node_id, "newDependency": d})
        for d in prev_deps - deps:
            removed.append({"node": node_id, "removedDependency": d})

    for node_id in prev_map:
        if node_id not in next_map:
            removed_nodes.append(node_id)

    return {
        "from": prev["timestamp"],
        "to": next_["timestamp"],
        "newDependencies": added,
        "removedDependencies": removed,
        "newNodes": new_nodes,
        "removedNodes": removed_nodes,
        "volatility": len(added) + len(removed) + len(new_nodes) + len(removed_nodes),
    }


def classify_trend(timeline: List[Dict[str, Any]]) -> str:
    if len(timeline) < 2:
        return "insufficient-data"
    first, last = timeline[0]["volatility"], timeline[-1]["volatility"]
    if last > first * 1.2:
        return "coupling-increasing"
    if last < first * 0.8:
        return "coupling-stabilizing"
    return "stable"


def track_evolution(snapshots_oldest_first: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Run diffs across a full history of snapshots (oldest -> newest)."""
    timeline = [
        diff_snapshots(snapshots_oldest_first[i - 1], snapshots_oldest_first[i])
        for i in range(1, len(snapshots_oldest_first))
    ]

    avg_volatility = (sum(t["volatility"] for t in timeline) / len(timeline)) if timeline else 0

    churn_by_node: Dict[str, int] = {}
    for t in timeline:
        for entry in t["newDependencies"]:
            churn_by_node[entry["node"]] = churn_by_node.get(entry["node"], 0) + 1
        for entry in t["removedDependencies"]:
            churn_by_node[entry["node"]] = churn_by_node.get(entry["node"], 0) + 1

    most_volatile_nodes = sorted(
        ({"id": k, "changes": v} for k, v in churn_by_node.items()),
        key=lambda x: x["changes"], reverse=True
    )[:10]

    return {
        "periods": len(timeline),
        "averageVolatilityPerPeriod": round(avg_volatility, 2),
        "trend": classify_trend(timeline),
        "mostVolatileNodes": most_volatile_nodes,
        "timeline": timeline,
    }
