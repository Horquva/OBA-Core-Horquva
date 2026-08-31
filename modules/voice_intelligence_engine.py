import io
import json
import sys
from collections import Counter
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def _classify(q):
    ql = q.lower()
    if "own" in ql or "who" in ql:
        return "ownership"
    if "risk" in ql or "fail" in ql or "backup" in ql:
        return "risk"
    if "document" in ql or "status" in ql:
        return "status"
    return "general"


def run_voice_engine(path):
    with open(path) as f:
        data = json.load(f)
    by_name = {a["name"].lower(): a for a in data.get("agents", [])}
    queries = [
        "Who owns the Lead Scoring Agent?",
        "Is the Payroll Agent a risk?",
        "Who owns the Billing Agent?",
        "What is the status of the CRM Sync Agent?",
    ]
    answered = []
    for q in queries:
        intent = _classify(q)
        target = None
        for name, a in by_name.items():
            if name in q.lower():
                target = a
                break
        if not target:
            answered.append((q, intent, "—", "No matching entity in the ontology."))
            continue
        owner = target.get("owner") or "no one"
        if intent == "ownership":
            ans = f"{target['name']} is owned by {owner}."
        elif intent == "risk":
            risky = not target.get("backup_owner") or not target.get("documented", False)
            if risky:
                ans = (f"Yes — owned by {owner}, "
                       + ("no backup, " if not target.get("backup_owner") else "")
                       + ("undocumented." if not target.get("documented", False) else "documented."))
            else:
                ans = f"Low risk — {owner} owns it with backup and docs."
        else:
            ans = (f"{target['name']} — owner {owner}, "
                   f"{'documented' if target.get('documented') else 'undocumented'}, "
                   f"criticality {target.get('criticality', 'medium')}.")
        answered.append((q, intent, target["name"], ans))
    intents = Counter(a[1] for a in answered)
    return answered, {"queries": len(queries), "intents": dict(intents),
                      "spoken": "Good morning. Top concern today: critical agents without backup owners. "
                                "Recommend assigning backups before end of week."}


def display_voice_engine(answered, summary, company):
    console.print(f"\nM22 · VOICE INTELLIGENCE ENGINE — {company}\n")
    console.print("Routes spoken questions to intents and answers them from the ontology.\n")
    t = Table(title="Voice queries resolved")
    t.add_column("Spoken query"); t.add_column("Intent"); t.add_column("Answer")
    for q, intent, target, ans in answered:
        t.add_row(q, intent, ans)
    console.print(t)
    console.print(f"\nIntents handled: {summary['intents']}")
    console.print(f"Spoken daily summary: \"{summary['spoken']}\"")
    console.print("")
