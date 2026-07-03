"""
M30 - Knowledge Concentration Intelligence
Constitutional Question: "Where is critical knowledge dangerously concentrated?"
Purpose: Quantify knowledge concentration risk using a bus factor, a
         Herfindahl-Hirschman concentration index, single-holder critical
         areas, and per-person / per-department exposure.

Owner: Kamran - Intelligence Layer
Consumes: knowledge_areas, agents, workflows
Produces: bus factor, concentration index, single-holder areas, per-person risk
"""

import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_knowledge_concentration(path):
    with open(path) as f:
        data = json.load(f)

    person_crit = defaultdict(int)
    person_undoc = defaultdict(int)
    areas = data.get("knowledge_areas", [])

    for ka in areas:
        if ka.get("criticality") in ("critical", "high"):
            for h in ka.get("holders", []):
                person_crit[h] += 1
                if not ka.get("documented", False):
                    person_undoc[h] += 1

    # Owned critical assets also represent held knowledge.
    for a in data.get("agents", []) + data.get("workflows", []):
        if (a.get("criticality") or "").lower() in ("critical", "high") and a.get("owner"):
            person_crit[a["owner"]] += 1
            if not a.get("documented", False):
                person_undoc[a["owner"]] += 1

    total_crit = sum(person_crit.values()) or 1
    ranking = sorted(person_crit.items(), key=lambda kv: -kv[1])
    top_share = round(100 * ranking[0][1] / total_crit) if ranking else 0

    # Bus factor: minimum people holding >= 50% of critical knowledge.
    cum, bus = 0, 0
    for _, n in ranking:
        cum += n
        bus += 1
        if cum >= total_crit / 2:
            break

    # Herfindahl-Hirschman Index (0-10000): higher = more concentrated.
    hhi = round(sum((100 * n / total_crit) ** 2 for _, n in ranking))
    concentration = ("SEVERE" if hhi >= 2500 else
                     "HIGH" if hhi >= 1500 else
                     "MODERATE" if hhi >= 1000 else "HEALTHY")

    # Single-holder critical areas = highest continuity risk.
    single = [ka["area"] for ka in areas
              if ka.get("criticality") in ("critical", "high")
              and len(ka.get("holders", [])) == 1]

    # Undocumented critical areas.
    undoc_areas = [ka["area"] for ka in areas
                   if ka.get("criticality") in ("critical", "high") and not ka.get("documented", False)]

    return {
        "top_share": top_share,
        "bus_factor": bus,
        "hhi": hhi,
        "concentration": concentration,
        "single_holder": single,
        "undoc_areas": undoc_areas,
        "ranking": [(p, n, person_undoc.get(p, 0)) for p, n in ranking[:10]],
    }


def display_knowledge_concentration(summary, company):
    console.print(f"\nM30 - KNOWLEDGE CONCENTRATION INTELLIGENCE - {company}\n")
    console.print("Pinpoints where critical knowledge is dangerously concentrated (bus factor + HHI).\n")
    console.print(f"CONCENTRATION LEVEL: {summary['concentration']}  (HHI {summary['hhi']}/10000)")
    console.print(f"Bus factor: {summary['bus_factor']} (people who hold 50% of critical knowledge)")
    console.print(f"Top person holds {summary['top_share']}% of all critical knowledge")
    console.print(f"Critical areas with a SINGLE holder: {len(summary['single_holder'])} - "
                  f"{', '.join(summary['single_holder']) if summary['single_holder'] else 'none'}")
    if summary["undoc_areas"]:
        console.print(f"Undocumented critical areas: {', '.join(summary['undoc_areas'])}")
    t = Table(title="Knowledge concentration by person")
    t.add_column("Person"); t.add_column("Critical items"); t.add_column("Undocumented")
    for p, n, undoc in summary["ranking"]:
        t.add_row(p, str(n), str(undoc))
    console.print(t)
    console.print("")
