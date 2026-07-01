import io
import json
import sys
from rich.console import Console
from rich.table import Table

from modules.organizational_health_intelligence import run_organizational_health
from modules.truth_intelligence import run_truth_intelligence
from modules.signal_intelligence import run_signal_intelligence

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_brain_core(path):
    """M50 - Organizational Brain Core Logic.
    The central reasoning core. It fuses the health index (M25), verified truths
    (M46) and early-warning signals (M36) into a single organizational 'brain
    state' and decides the operating posture the organization should adopt.
    """
    health = run_organizational_health(path)
    truth = run_truth_intelligence(path)
    signal = run_signal_intelligence(path)

    health_idx = health.get("index", 0)
    trust = truth.get("trust_score", 0)
    stability = signal.get("stability_score", 0)
    verified_risks = truth.get("verified_count", 0)

    # Weighted cognitive index
    brain_index = round(0.45 * health_idx + 0.30 * stability + 0.25 * trust)
    if brain_index >= 75:
        posture = "OPTIMIZE"
        note = "Stable base - focus on optimisation and growth."
    elif brain_index >= 55:
        posture = "STABILIZE"
        note = "Mixed signals - close gaps before scaling."
    elif brain_index >= 40:
        posture = "DEFEND"
        note = "Elevated risk - prioritise continuity and documentation."
    else:
        posture = "RECOVER"
        note = "Critical - trigger resilience and knowledge-capture programmes now."

    inputs = [
        ("Health index (M25)", health_idx),
        ("Signal stability (M36)", stability),
        ("Data trust (M46)", trust),
    ]
    return {"brain_index": brain_index, "posture": posture, "note": note,
            "inputs": inputs, "verified_risks": verified_risks,
            "active_signals": len(signal.get("signals", []))}


def display_brain_core(summary, company):
    console.print(f"\nM50 - ORGANIZATIONAL BRAIN CORE LOGIC - {company}\n")
    console.print("Central reasoning core - fuses health, truth and signals into one brain state.\n")
    console.print(f"BRAIN INDEX: {summary['brain_index']}/100  ->  OPERATING POSTURE: {summary['posture']}")
    console.print(f"{summary['note']}\n")
    t = Table(title="Cognitive inputs")
    t.add_column("Input"); t.add_column("Score")
    for name, val in summary["inputs"]:
        t.add_row(name, f"{val}/100")
    console.print(t)
    console.print(f"\nVerified risks in play: {summary['verified_risks']} | Active early-warning signals: {summary['active_signals']}")
    console.print("")
