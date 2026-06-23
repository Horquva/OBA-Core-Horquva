import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def _build_graph(data):
    depends = defaultdict(set)
    name_by_id = {a["id"]: a["name"] for a in data.get("agents", [])}
    for d in data.get("dependencies", []):
        src, tgt = name_by_id.get(d.get("from")), name_by_id.get(d.get("to"))
        if src and tgt:
            depends[src].add(tgt)
    for t in data.get("ai_tools", []):
        for ag in t.get("agents_using", []):
            depends[name_by_id.get(ag, ag)].add(t["name"])
        for wf in t.get("workflows", []):
            depends[wf].add(t["name"])
    for a in data.get("agents", []) + data.get("workflows", []):
        if a.get("owner"):
            depends[a["name"]].add(a["owner"])
    return depends


def _longest_chain(depends):
    best = []

    def dfs(node, path):
        nonlocal best
        if node in path:
            return
        path = path + [node]
        if len(path) > len(best):
            best = path
        for nxt in depends.get(node, ()):
            dfs(nxt, path)

    for n in list(depends.keys()):
        dfs(n, [])
    return best


def run_universal_dependency_graph(path):
    with open(path) as f:
        data = json.load(f)
    depends = _build_graph(data)
    nodes = set(depends.keys()) | {y for ys in depends.values() for y in ys}
    edges = sum(len(v) for v in depends.values())
    indeg = defaultdict(int)
    for ys in depends.values():
        for y in ys:
            indeg[y] += 1
    top = sorted(indeg.items(), key=lambda kv: -kv[1])[:8]
    chain = _longest_chain(depends)
    return {"nodes": len(nodes), "edges": edges, "chain_len": len(chain), "top": top, "chain": chain}


def display_universal_dependency_graph(summary, company):
    console.print(f"\nM28 · UNIVERSAL DEPENDENCY GRAPH — {company}\n")
    console.print("One graph across agents, tools, workflows AND people — not just agent-to-agent.\n")
    console.print(f"Graph size: {summary['nodes']} nodes · {summary['edges']} dependency edges")
    console.print(f"Longest dependency chain: {summary['chain_len']} hops")
    t = Table(title="Most depended-on nodes (failure blast radius)")
    t.add_column("Node"); t.add_column("Dependents")
    for name, n in summary["top"]:
        t.add_row(name, str(n))
    console.print(t)
    if summary["chain"]:
        console.print("\nLongest chain: " + "  →  ".join(summary["chain"]))
    console.print("")
