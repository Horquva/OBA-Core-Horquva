import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_strategic_alignment_intelligence(path):
    """M40 - Strategic Alignment Intelligence.
    Checks whether day-to-day operations (decisions, critical workflows,
    resource concentration) are aligned with organizational resilience goals.
    """
    with open(path) as f:
        data = json.load(f)

    checks = []

    # 1. Are critical workflows documented? (operational alignment)
    wf = data.get("workflows", [])
    crit_wf = [w for w in wf if (w.get("criticality") or "").lower() == "critical"]
    doc_crit = sum(1 for w in crit_wf if w.get("documented", False))
    a1 = round(100 * doc_crit / len(crit_wf)) if crit_wf else 100
    checks.append({"dimension": "Critical workflows documented", "score": a1,
                   "detail": f"{doc_crit}/{len(crit_wf)} critical workflows documented"})

    # 2. Decisions with recorded outcomes (learning alignment)
    dl = data.get("decisions_log", [])
    with_outcome = sum(1 for d in dl if d.get("outcome"))
    a2 = round(100 * with_outcome / len(dl)) if dl else 100
    checks.append({"dimension": "Decisions with tracked outcomes", "score": a2,
                   "detail": f"{with_outcome}/{len(dl)} decisions have outcomes logged"})

    # 3. Reversible decision ratio (agility alignment)
    reversible = sum(1 for d in dl if d.get("reversible"))
    a3 = round(100 * reversible / len(dl)) if dl else 100
    checks.append({"dimension": "Decision reversibility", "score": a3,
                   "detail": f"{reversible}/{len(dl)} decisions reversible"})

    # 4. Incident lessons captured (continuous improvement alignment)
    inc = data.get("incidents", [])
    lessons = sum(1 for i in inc if i.get("lesson"))
    a4 = round(100 * lessons / len(inc)) if inc else 100
    checks.append({"dimension": "Incident lessons captured", "score": a4,
                   "detail": f"{lessons}/{len(inc)} incidents have lessons recorded"})

    alignment = round(sum(c["score"] for c in checks) / len(checks)) if checks else 0
    state = "ALIGNED" if alignment >= 70 else ("PARTIAL" if alignment >= 50 else "MISALIGNED")
    misaligned = [c["dimension"] for c in checks if c["score"] < 50]
    return {"checks": checks, "alignment": alignment, "state": state, "misaligned": misaligned}


def display_strategic_alignment_report(summary, company):
    console.print(f"\nM40 - STRATEGIC ALIGNMENT INTELLIGENCE - {company}\n")
    console.print("Measures how well operations align with resilience and continuity goals.\n")
    console.print(f"STRATEGIC ALIGNMENT INDEX: {summary['alignment']}/100 - {summary['state']}")
    console.print(f"Misaligned areas: {', '.join(summary['misaligned']) or 'none'}\n")
    t = Table(title="Alignment by dimension")
    t.add_column("Dimension"); t.add_column("Score"); t.add_column("Detail")
    for c in summary["checks"]:
        t.add_row(c["dimension"], f"{c['score']}/100", c["detail"])
    console.print(t)
    console.print("")
