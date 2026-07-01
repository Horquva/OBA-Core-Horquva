import io
import json
import sys
from rich.console import Console
from rich.table import Table

from modules.signal_intelligence import run_signal_intelligence
from modules.opportunity_intelligence import run_opportunity_intelligence
from modules.capability_intelligence import run_capability_intelligence
from modules.strategic_alignment_intelligence import run_strategic_alignment_intelligence
from modules.truth_intelligence import run_truth_intelligence
from modules.autonomous_advisor import run_autonomous_advisor
from modules.brain_core_logic import run_brain_core
from modules.simulation_universe import run_simulation_universe

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_intelligence_orchestrator(path):
    """M55 - Organizational Intelligence Orchestrator.
    The meta-brain. Runs the full intelligence pipeline in dependency order
    (Truth -> Signals/Capability/Alignment -> Advisor -> Brain Core -> Simulation),
    then fuses every module output into one Organizational Intelligence Score and
    a single prioritised executive verdict. Built and run LAST.
    """
    signal = run_signal_intelligence(path)
    opportunity = run_opportunity_intelligence(path)
    capability = run_capability_intelligence(path)
    alignment = run_strategic_alignment_intelligence(path)
    truth = run_truth_intelligence(path)
    advisor = run_autonomous_advisor(path)
    brain = run_brain_core(path)
    sim = run_simulation_universe(path)

    pipeline = [
        ("M36 Signal", signal["stability_score"]),
        ("M39 Capability", capability["org_capability"]),
        ("M40 Alignment", alignment["alignment"]),
        ("M46 Truth", truth["trust_score"]),
        ("M50 Brain Core", brain["brain_index"]),
        ("M54 Survivability", sim["survivability"]),
    ]
    org_intelligence = round(sum(v for _, v in pipeline) / len(pipeline))
    grade = ("A" if org_intelligence >= 80 else "B" if org_intelligence >= 65
             else "C" if org_intelligence >= 50 else "D")

    top_action = advisor["advice"][0]["action"] if advisor["advice"] else "Maintain current controls"
    verdict = (f"Posture {brain['posture']}. Top priority: {top_action}. "
               f"{opportunity['quick_wins']} quick wins available.")
    return {"pipeline": pipeline, "org_intelligence": org_intelligence, "grade": grade,
            "verdict": verdict, "modules_orchestrated": len(pipeline) + 2}


def display_intelligence_orchestrator(summary, company):
    console.print(f"\nM55 - ORGANIZATIONAL INTELLIGENCE ORCHESTRATOR - {company}\n")
    console.print("Meta-brain - fuses every module into one Organizational Intelligence Score.\n")
    console.print(f"ORGANIZATIONAL INTELLIGENCE SCORE: {summary['org_intelligence']}/100  "
                  f"(Grade {summary['grade']})\n")
    t = Table(title="Orchestrated pipeline")
    t.add_column("Module"); t.add_column("Score")
    for name, val in summary["pipeline"]:
        t.add_row(name, f"{val}/100")
    console.print(t)
    console.print(f"\nEXECUTIVE VERDICT: {summary['verdict']}")
    console.print("")
