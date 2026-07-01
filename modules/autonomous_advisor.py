import io
import json
import sys
from rich.console import Console
from rich.table import Table

from modules.truth_intelligence import run_truth_intelligence

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


# Maps a verified truth to a concrete recommended action.
_PLAYBOOK = {
    "Single points of failure exist": ("Assign and train backup owners for every critical asset", "CRITICAL"),
    "Critical knowledge is undocumented": ("Launch a documentation sprint for critical knowledge", "HIGH"),
    "Ownership is over-concentrated": ("Redistribute ownership and cross-train secondary owners", "HIGH"),
    "Incident learning loop is active": ("Sustain the post-incident review cadence", "LOW"),
}


def run_autonomous_advisor(path):
    """M48 - Autonomous Advisor.
    Generates recommendations ONLY from truths verified by M46 Truth
    Intelligence. Unverified claims are held back - the advisor never acts on
    unverified data (truth before recommendation).
    """
    truth = run_truth_intelligence(path)
    advice = []
    held_back = []
    for tr in truth["truths"]:
        action, priority = _PLAYBOOK.get(tr["claim"], ("Review manually", "MEDIUM"))
        if tr["verified"] and tr["claim"] != "Incident learning loop is active":
            advice.append({"action": action, "priority": priority,
                           "basis": tr["claim"], "confidence": tr["confidence"]})
        elif tr["claim"] == "Incident learning loop is active" and not tr["verified"]:
            advice.append({"action": "Establish a formal post-incident review loop",
                           "priority": "MEDIUM", "basis": tr["claim"], "confidence": tr["confidence"]})
        elif not tr["verified"]:
            held_back.append(tr["claim"])
    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    advice.sort(key=lambda a: order.get(a["priority"], 9))
    return {"advice": advice, "held_back": held_back, "trust_score": truth["trust_score"]}


def display_autonomous_advisor(summary, company):
    console.print(f"\nM48 - AUTONOMOUS ADVISOR - {company}\n")
    console.print("Recommends actions derived ONLY from M46-verified truths.\n")
    console.print(f"RECOMMENDED ACTIONS: {len(summary['advice'])}  "
                  f"(held back for insufficient verification: {len(summary['held_back'])})\n")
    t = Table(title="Verified recommendations")
    t.add_column("Priority"); t.add_column("Recommended action"); t.add_column("Verified basis"); t.add_column("Confidence")
    for a in summary["advice"]:
        t.add_row(a["priority"], a["action"], a["basis"], a["confidence"])
    console.print(t)
    if summary["held_back"]:
        console.print(f"\nHeld back (not verified): {', '.join(summary['held_back'])}")
    console.print("")
