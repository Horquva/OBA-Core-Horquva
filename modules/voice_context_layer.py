import io
import json
import sys
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class VoiceEntity:
    canonical: str
    type: str
    aliases: list


@dataclass
class VoiceIntent:
    question: str
    resolved_entity: str
    answer: str


def _aliases(name: str) -> list:
    al = set()
    low = name.lower().strip()
    al.add(low)
    for suf in (" agent", " workflow", " intelligence"):
        if low.endswith(suf):
            al.add(low[: -len(suf)].strip())
    tokens = low.split()
    if tokens:
        al.add(tokens[0])
    return sorted(a for a in al if a)


def _collect_people(data: dict) -> set:
    people = set()
    for a in data.get("agents", []):
        for k in ("owner", "backup_owner"):
            if a.get(k):
                people.add(a[k])
    for wf in data.get("workflows", []):
        for k in ("owner", "backup_owner"):
            if wf.get(k):
                people.add(wf[k])
    for t in data.get("ai_tools", []):
        for u in t.get("users", []):
            people.add(u)
    return people


def run_voice_context_layer(path: str):
    """Voice Agent Context Layer (Huzaifa) — semantic foundation for Voice Agents."""
    with open(path) as f:
        data = json.load(f)

    entities: list[VoiceEntity] = []
    for a in data.get("agents", []):
        entities.append(VoiceEntity(a["name"], "AI Agent", _aliases(a["name"])))
    for wf in data.get("workflows", []):
        entities.append(VoiceEntity(wf["name"], "Workflow", _aliases(wf["name"])))
    for t in data.get("ai_tools", []):
        entities.append(VoiceEntity(t["name"], "System", _aliases(t["name"])))
    for p in sorted(_collect_people(data)):
        entities.append(VoiceEntity(p, "Human", _aliases(p)))

    # Sample intents the Voice Agent can already resolve from the ontology
    intents: list[VoiceIntent] = []
    for a in data.get("agents", []):
        owner = a.get("owner") or "no one"
        if not a.get("backup_owner") and (a.get("criticality") or "").lower() == "critical":
            intents.append(VoiceIntent(
                f"Who owns the {a['name']}?",
                a["name"],
                f"{owner} — and there is no backup owner, so it is a single point of failure."))
    for wf in data.get("workflows", []):
        if not wf.get("documented", False):
            intents.append(VoiceIntent(
                f"Is the {wf['name']} documented?",
                wf["name"],
                f"No — it is undocumented and owned by {wf.get('owner') or 'no one'}."))

    total_aliases = sum(len(e.aliases) for e in entities)
    summary = {
        "entities": len(entities),
        "aliases": total_aliases,
        "intents": len(intents),
        "types": sorted({e.type for e in entities}),
    }
    return entities, intents, summary


def display_voice_context_report(entities: list, intents: list, summary: dict, company: str):
    console.print(f"\n\U0001f5e3\ufe0f  VOICE AGENT CONTEXT LAYER — Semantic Foundation for Voice — {company}\n")
    console.print("The layer that lets a Voice Agent understand which entity a person means")
    console.print("and answer organizational questions in natural language.\n")

    console.print(f"Voice-resolvable entities: {summary['entities']}  ·  "
                  f"name aliases mapped: {summary['aliases']}  ·  "
                  f"sample intents: {summary['intents']}")
    console.print(f"Entity types understood: {', '.join(summary['types'])}\n")

    table = Table(title="Sample Voice Intents (resolved from the ontology)")
    table.add_column("Spoken question")
    table.add_column("Resolves to")
    table.add_column("Answer")
    for it in intents[:8]:
        table.add_row(it.question, it.resolved_entity, it.answer)
    console.print(table)
    console.print("")
