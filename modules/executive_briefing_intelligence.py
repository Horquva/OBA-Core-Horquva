import io
import json
import sys
from collections import Counter
from rich.console import Console

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_executive_briefing(path):
    with open(path) as f:
        data = json.load(f)
    assets = data.get("agents", []) + data.get("workflows", [])
    spofs = [a for a in assets if (a.get("criticality") or "").lower() == "critical" and not a.get("backup_owner")]
    load = Counter(a["owner"] for a in assets if a.get("owner"))
    top_owner = load.most_common(1)[0] if load else ("—", 0)
    incidents = sorted(data.get("incidents", []), key=lambda i: i.get("date", ""), reverse=True)
    history = data.get("history", [])
    pending = [d for d in data.get("decisions_log", []) if d.get("outcome") == "pending"]

    bullets = []
    bullets.append(f"[1] {len(spofs)} critical assets still have NO backup owner — top: "
                   f"{spofs[0]['name'] if spofs else '—'}")
    bullets.append(f"[2] {top_owner[0]} carries {top_owner[1]} assets — highest single-person concentration")
    if incidents:
        i = incidents[0]
        bullets.append(f"[3] Latest incident: {i['entity']} ({i['type']}, {i['impact']}) on {i['date']} — "
                       f"lesson: {i.get('lesson', '')}")
    if len(history) >= 2:
        d = history[-1]["documented_pct"] - history[0]["documented_pct"]
        bullets.append(f"[4] Documentation moved {history[0]['documented_pct']}% → {history[-1]['documented_pct']}% "
                       f"({'+' if d >= 0 else ''}{d} pts) over {len(history)} months — still below safe levels")
    if pending:
        bullets.append(f"[5] {len(pending)} executive decision(s) pending — e.g. \"{pending[0]['decision']}\"")
    return bullets, {"items": len(bullets)}


def display_executive_briefing(bullets, summary, company):
    console.print(f"\nM23 · EXECUTIVE BRIEFING INTELLIGENCE — {company}\n")
    console.print("The daily 'top things to know', auto-generated from the whole Brain.\n")
    console.print("TODAY'S EXECUTIVE BRIEFING")
    for b in bullets:
        console.print(f"   {b}")
    console.print("")
