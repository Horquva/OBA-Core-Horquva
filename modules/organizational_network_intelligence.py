import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_network_intelligence(path):
    with open(path) as f:
        data = json.load(f)
    adj = defaultdict(set)
    for t in data.get("ai_tools", []):
        users = list(t.get("users", []))
        for i in range(len(users)):
            for j in range(i + 1, len(users)):
                adj[users[i]].add(users[j])
                adj[users[j]].add(users[i])
    for a in data.get("agents", []) + data.get("workflows", []):
        o, b = a.get("owner"), a.get("backup_owner")
        if o and b:
            adj[o].add(b); adj[b].add(o)
    degree = sorted(((p, len(n)) for p, n in adj.items()), key=lambda kv: -kv[1])
    isolated = [p for p, n in adj.items() if len(n) <= 1]
    return {"people": len(adj), "connections": sum(len(n) for n in adj.values()) // 2,
            "degree": degree[:8], "isolated": isolated,
            "bottleneck": degree[0][0] if degree else "—"}


def display_network_intelligence(summary, company):
    console.print(f"\nM35 · ORGANIZATIONAL NETWORK INTELLIGENCE — {company}\n")
    console.print("Network-science view of who connects the organization and where it bottlenecks.\n")
    console.print(f"People in network: {summary['people']} · connections: {summary['connections']}")
    console.print(f"Primary bottleneck (highest centrality): {summary['bottleneck']}")
    console.print(f"Weakly-connected / isolated people: {len(summary['isolated'])}")
    t = Table(title="Centrality (most connected people)")
    t.add_column("Person"); t.add_column("Connections")
    for p, n in summary["degree"]:
        t.add_row(p, str(n))
    console.print(t)
    console.print("")
