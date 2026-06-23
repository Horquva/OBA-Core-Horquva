import io
import json
import sys
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

# The formal vocabulary of the Organizational Brain.
# Every entity must be defined here before any module can reference it.
ENTITY_TYPES = ["Human", "Team", "AI Agent", "System", "Workflow", "Knowledge"]
RELATIONSHIP_VOCAB = ["owns", "depends_on", "governs", "collaborates_with"]


@dataclass
class OntologyEntity:
    entity_id: str
    name: str
    type: str
    attributes: dict


def _collect_people(data: dict) -> list[str]:
    people = set()
    for a in data.get("agents", []):
        if a.get("owner"):
            people.add(a["owner"])
        if a.get("backup_owner"):
            people.add(a["backup_owner"])
    for wf in data.get("workflows", []):
        if wf.get("owner"):
            people.add(wf["owner"])
        if wf.get("backup_owner"):
            people.add(wf["backup_owner"])
        for s in wf.get("steps", []):
            if s.get("actor") == "human" and s.get("name"):
                people.add(s["name"])
    for t in data.get("ai_tools", []):
        for u in t.get("users", []):
            people.add(u)
        if t.get("access_owner"):
            people.add(t["access_owner"])
    return sorted(people)


def _collect_teams(data: dict) -> list[str]:
    teams = set()
    for a in data.get("agents", []):
        if a.get("department"):
            teams.add(a["department"])
    for wf in data.get("workflows", []):
        if wf.get("department"):
            teams.add(wf["department"])
    for t in data.get("ai_tools", []):
        for d in t.get("departments", []):
            teams.add(d)
    return sorted(teams)


def run_ontology_layer(path: str):
    """Ontology Layer (Huzaifa) — defines what exists in the organization."""
    with open(path) as f:
        data = json.load(f)

    ontology: dict[str, list[OntologyEntity]] = {t: [] for t in ENTITY_TYPES}

    for p in _collect_people(data):
        ontology["Human"].append(OntologyEntity(
            "human:" + p.lower().replace(" ", "_"), p, "Human", {}))

    for d in _collect_teams(data):
        ontology["Team"].append(OntologyEntity(
            "team:" + d.lower().replace(" ", "_"), d, "Team", {}))

    for a in data.get("agents", []):
        ontology["AI Agent"].append(OntologyEntity(
            "agent:" + a["id"], a["name"], "AI Agent",
            {"owner": a.get("owner"), "criticality": a.get("criticality"),
             "documented": a.get("documented", False), "department": a.get("department")}))

    for t in data.get("ai_tools", []):
        ontology["System"].append(OntologyEntity(
            "system:" + t["id"], t["name"], "System",
            {"vendor": t.get("vendor"), "category": t.get("category"),
             "criticality": t.get("criticality"), "monthly_cost_usd": t.get("monthly_cost_usd")}))

    for wf in data.get("workflows", []):
        ontology["Workflow"].append(OntologyEntity(
            "workflow:" + wf["id"], wf["name"], "Workflow",
            {"owner": wf.get("owner"), "criticality": wf.get("criticality"),
             "documented": wf.get("documented", False)}))

    # Knowledge entities = tacit knowledge held in undocumented critical assets
    for a in data.get("agents", []):
        if not a.get("documented", False):
            ontology["Knowledge"].append(OntologyEntity(
                "knowledge:agent:" + a["id"], "Tacit knowledge: " + a["name"], "Knowledge",
                {"holder": a.get("owner"), "documented": False, "source": a["name"]}))
    for wf in data.get("workflows", []):
        if not wf.get("documented", False):
            ontology["Knowledge"].append(OntologyEntity(
                "knowledge:wf:" + wf["id"], "Tacit knowledge: " + wf["name"], "Knowledge",
                {"holder": wf.get("owner"), "documented": False, "source": wf["name"]}))

    stats = {t: len(ontology[t]) for t in ENTITY_TYPES}
    stats["total"] = sum(stats[t] for t in ENTITY_TYPES)
    return ontology, stats


def display_ontology_report(ontology: dict, stats: dict, company: str):
    console.print(f"\n\U0001f9ec  ONTOLOGY LAYER — Defines What Exists — {company}\n")
    console.print("The formal vocabulary of the Organizational Brain. Every entity is")
    console.print("defined here before any module is allowed to reference it.\n")

    table = Table(title="Entity Types Registered")
    table.add_column("Entity Type")
    table.add_column("Count")
    table.add_column("Examples")
    for t in ENTITY_TYPES:
        ents = ontology[t]
        examples = ", ".join(e.name for e in ents[:3]) + (" …" if len(ents) > 3 else "")
        table.add_row(t, str(len(ents)), examples if examples else "—")
    console.print(table)

    console.print(f"\nOntology total: {stats['total']} entities across {len(ENTITY_TYPES)} defined types.")
    console.print(f"Relationship vocabulary defined: {', '.join(RELATIONSHIP_VOCAB)}\n")
