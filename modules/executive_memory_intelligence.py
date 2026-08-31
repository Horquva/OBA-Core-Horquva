"""
M26 - Executive Memory Intelligence
Constitutional Question: "What must leadership never forget?"
Purpose: Build the organization's institutional memory - recurring incident
         patterns, hard lessons, hero dependencies, and past mistakes - and
         rank them by relevance so critical history is never lost.

Owner: Kamran - Intelligence Layer
Consumes: incidents, decisions_log, agents, workflows
Produces: ranked institutional-memory items for executives / M23 briefing
"""

import io
import json
import sys
from collections import Counter
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)

REL = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}


def run_executive_memory(path):
    with open(path) as f:
        data = json.load(f)
    incidents = data.get("incidents", [])
    decisions = data.get("decisions_log", [])

    memory = []  # (relevance, kind, text)

    # 1) Recurring incident patterns by type -> systemic, not one-off.
    by_type = Counter(i.get("type") for i in incidents)
    for typ, n in by_type.most_common():
        if n >= 2:
            memory.append(("HIGH", "pattern",
                           f"'{typ}' incidents happened {n} times - systemic, not one-off"))

    # 2) Critical incidents and the lesson they taught.
    for i in incidents:
        if i.get("impact") == "critical":
            memory.append(("HIGH", "lesson",
                           f"{i.get('entity')} ({i.get('date')}): {i.get('lesson', 'no lesson recorded')}"))
        elif i.get("impact") == "high" and i.get("lesson"):
            memory.append(("MEDIUM", "lesson", f"{i.get('entity')}: {i.get('lesson')}"))

    # 3) Decisions that turned out badly - especially irreversible ones.
    for d in decisions:
        if d.get("outcome") == "negative":
            rel = "HIGH" if not d.get("reversible", True) else "MEDIUM"
            tag = " (IRREVERSIBLE)" if not d.get("reversible", True) else ""
            memory.append((rel, "decision",
                           f"Decision '{d.get('decision')}' ({d.get('area')}) turned out negative{tag}"))

    # 4) Hero dependency - one person repeatedly resolving incidents.
    resolver = Counter(i.get("resolved_by") for i in incidents if i.get("resolved_by"))
    for person, n in resolver.most_common(3):
        if n >= 2:
            memory.append(("MEDIUM", "hero-risk",
                           f"{person} personally resolved {n} incidents - hero dependency, spread this knowledge"))

    # 5) Repeat offender entities - same entity in multiple incidents.
    by_entity = Counter(i.get("entity") for i in incidents)
    for entity, n in by_entity.most_common():
        if n >= 2:
            memory.append(("HIGH", "repeat-offender",
                           f"{entity} appeared in {n} incidents - chronic weak point"))

    # Rank by relevance, then stable de-dup on text.
    seen, ranked = set(), []
    for rel, kind, text in sorted(memory, key=lambda m: -REL[m[0]]):
        if text in seen:
            continue
        seen.add(text)
        ranked.append((rel, kind, text))

    kinds = Counter(k for _, k, _ in ranked)
    return {"items": len(ranked), "incidents": len(incidents),
            "memory": ranked, "kinds": dict(kinds)}


def display_executive_memory(summary, company):
    console.print(f"\nM26 - EXECUTIVE MEMORY INTELLIGENCE - {company}\n")
    console.print("Remembers what leadership must not forget - patterns, lessons, hero risks, past mistakes.\n")
    console.print(f"Incidents on record: {summary['incidents']} - memory items surfaced: {summary['items']}")
    if summary["kinds"]:
        console.print("By kind: " + ", ".join(f"{k}: {v}" for k, v in summary["kinds"].items()))
    t = Table(title="What executives should remember (most relevant first)")
    t.add_column("Relevance"); t.add_column("Kind"); t.add_column("Memory")
    for rel, kind, text in summary["memory"][:12]:
        t.add_row(rel, kind, text)
    console.print(t)
    console.print("")
