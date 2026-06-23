import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_ecosystem_intelligence(path):
    with open(path) as f:
        data = json.load(f)
    name_by_id = {a["id"]: a["name"] for a in data.get("agents", [])}
    tool_users = defaultdict(set)
    for t in data.get("ai_tools", []):
        for ag in t.get("agents_using", []):
            tool_users[t["name"]].add(name_by_id.get(ag, ag))
        for wf in t.get("workflows", []):
            tool_users[t["name"]].add(wf)
    external = data.get("external_entities", [])
    exposure = []
    for e in external:
        deps = set()
        for tool in e.get("connects", []):
            deps |= tool_users.get(tool, set())
            deps.add(tool)
        exposure.append((e["name"], e.get("type", "vendor"), len(deps), e.get("criticality", "medium")))
    exposure.sort(key=lambda x: -x[2])
    critical_ext = [e for e in exposure if e[3] == "critical"]
    return {"internal_tools": len(data.get("ai_tools", [])), "external": len(external),
            "critical_external": len(critical_ext), "exposure": exposure}


def display_ecosystem_intelligence(summary, company):
    console.print(f"\nM31 · ORGANIZATIONAL ECOSYSTEM INTELLIGENCE — {company}\n")
    console.print("Maps the full ecosystem — internal tools + external vendors/platforms — and exposure.\n")
    console.print(f"Internal tools: {summary['internal_tools']} · external entities: {summary['external']} "
                  f"· critical external dependencies: {summary['critical_external']}")
    t = Table(title="External dependency exposure")
    t.add_column("External entity"); t.add_column("Type"); t.add_column("Internal dependents"); t.add_column("Criticality")
    for name, typ, n, crit in summary["exposure"]:
        t.add_row(name, typ, str(n), crit)
    console.print(t)
    console.print("\nNote: critical external entities with no alternative are external single points of failure.")
    console.print("")
