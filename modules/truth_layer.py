import io
import json
import sys
from collections import Counter
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

# The Truth Layer turns many module signals into ONE authoritative truth.
SEVERITY_SCORE = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "HEALTHY": 0}
SCORE_LABEL = {4: "CRITICAL", 3: "HIGH", 2: "MEDIUM", 1: "LOW", 0: "HEALTHY"}


@dataclass
class Signal:
    module: str
    verdict: str
    reason: str


@dataclass
class TruthRecord:
    entity: str
    entity_type: str
    determined_truth: str
    confidence: int
    contradiction: bool
    freshness: str
    signals: list


def _assets(data: dict) -> list[dict]:
    assets = []
    for a in data.get("agents", []):
        assets.append({"name": a["name"], "type": "AI Agent", "owner": a.get("owner"),
                       "backup": a.get("backup_owner"), "crit": a.get("criticality", "medium"),
                       "documented": a.get("documented", False)})
    for wf in data.get("workflows", []):
        assets.append({"name": wf["name"], "type": "Workflow", "owner": wf.get("owner"),
                       "backup": wf.get("backup_owner"), "crit": wf.get("criticality", "medium"),
                       "documented": wf.get("documented", False)})
    for t in data.get("ai_tools", []):
        assets.append({"name": t["name"], "type": "System", "owner": t.get("access_owner"),
                       "backup": t.get("backup_tool"), "crit": t.get("criticality", "medium"),
                       "documented": t.get("documented", False)})
    return assets


def _dependents_count(data: dict) -> Counter:
    c: Counter = Counter()
    agent_name = {a["id"]: a["name"] for a in data.get("agents", [])}
    for d in data.get("dependencies", []):
        tgt = agent_name.get(d.get("to"))
        if tgt:
            c[tgt] += 1
    return c


def _owner_load(data: dict) -> Counter:
    load: Counter = Counter()
    for a in data.get("agents", []):
        if a.get("owner"):
            load[a["owner"]] += 1
    for wf in data.get("workflows", []):
        if wf.get("owner"):
            load[wf["owner"]] += 1
    return load


def _gen_signals(asset: dict, dependents: Counter, owner_load: Counter) -> list:
    """Each perspective is how a different module would 'see' this entity."""
    sigs = []
    crit = (asset["crit"] or "medium").lower()

    # Risk Intelligence (M03) — single point of failure
    if not asset["backup"] and crit == "critical":
        sigs.append(Signal("Risk Intelligence (M03)", "CRITICAL",
                           "Critical asset with no backup owner — single point of failure"))
    elif not asset["backup"] and crit == "high":
        sigs.append(Signal("Risk Intelligence (M03)", "HIGH",
                           "High-criticality asset with no backup owner"))
    elif asset["backup"]:
        sigs.append(Signal("Risk Intelligence (M03)", "LOW", "Backup owner present"))
    else:
        sigs.append(Signal("Risk Intelligence (M03)", "MEDIUM", "No backup but lower criticality"))

    # Knowledge Risk (M09) — documentation
    if not asset["documented"]:
        sigs.append(Signal("Knowledge Risk (M09)", "HIGH",
                           "Undocumented — knowledge lives only in the owner's head"))
    else:
        sigs.append(Signal("Knowledge Risk (M09)", "HEALTHY", "Documented — knowledge is captured"))

    # Continuity (M18) — succession
    if not asset["backup"]:
        sigs.append(Signal("Continuity (M18)", "HIGH", "No succession/backup — continuity at risk"))
    else:
        sigs.append(Signal("Continuity (M18)", "HEALTHY", "Backup provides continuity"))

    # Ownership (M01) — concentration
    load = owner_load.get(asset["owner"], 0) if asset["owner"] else 0
    if load >= 5:
        sigs.append(Signal("Ownership (M01)", "HIGH",
                           f"Owner '{asset['owner']}' is overloaded ({load} assets) — concentration risk"))
    elif load >= 3:
        sigs.append(Signal("Ownership (M01)", "MEDIUM", f"Owner '{asset['owner']}' owns {load} assets"))
    else:
        sigs.append(Signal("Ownership (M01)", "LOW", f"Ownership not concentrated ({load} assets)"))

    # Dependency (M02) — blast radius
    dep = dependents.get(asset["name"], 0)
    if dep >= 3:
        sigs.append(Signal("Dependency (M02)", "CRITICAL",
                           f"{dep} other assets depend on this — high blast radius"))
    elif dep >= 1:
        sigs.append(Signal("Dependency (M02)", "HIGH", f"{dep} dependent(s)"))
    else:
        sigs.append(Signal("Dependency (M02)", "LOW", "No downstream dependents"))

    return sigs


def _resolve(asset: dict, sigs: list) -> TruthRecord:
    scores = [SEVERITY_SCORE[s.verdict] for s in sigs]
    contradiction = (max(scores) >= 3 and min(scores) <= 1)

    # Evidence-weighted truth: lean toward the worst-case evidence, but anchored by the average.
    avg = sum(scores) / len(scores)
    weighted = round((avg + max(scores)) / 2)
    weighted = max(0, min(4, weighted))
    truth = SCORE_LABEL[weighted]

    # Confidence = how many modules land within one band of the determined truth.
    agree = sum(1 for sc in scores if abs(sc - weighted) <= 1)
    confidence = int((agree / len(scores)) * 100)
    if contradiction:
        confidence = min(confidence, 70)  # unresolved disagreement caps certainty

    if asset["documented"] and asset["backup"]:
        freshness = "Fresh"
    elif asset["documented"] or asset["backup"]:
        freshness = "Aging"
    else:
        freshness = "Stale"

    return TruthRecord(asset["name"], asset["type"], truth, confidence, contradiction, freshness, sigs)


def run_truth_layer(path: str):
    """Truth Layer (Kamran) — reconciles every module signal into one truth."""
    with open(path) as f:
        data = json.load(f)

    dependents = _dependents_count(data)
    owner_load = _owner_load(data)

    records = [_resolve(asset, _gen_signals(asset, dependents, owner_load))
               for asset in _assets(data)]
    records.sort(key=lambda r: (SEVERITY_SCORE[r.determined_truth], -r.confidence), reverse=True)

    summary = {
        "entities": len(records),
        "signals": sum(len(r.signals) for r in records),
        "contradictions_resolved": sum(1 for r in records if r.contradiction),
        "trust_score": int(sum(r.confidence for r in records) / len(records)) if records else 0,
        "critical": sum(1 for r in records if r.determined_truth == "CRITICAL"),
        "high": sum(1 for r in records if r.determined_truth == "HIGH"),
    }
    return records, summary


def display_truth_report(records: list, summary: dict, company: str):
    console.print(f"\n\u2696\ufe0f  TRUTH LAYER — One Organizational Truth — {company}\n")
    console.print("Modules no longer make decisions — they generate signals. The Truth Layer")
    console.print("combines every signal into a single authoritative truth, with confidence,")
    console.print("evidence and freshness for full auditability.\n")

    table = Table(title="Determined Truth (top entities)")
    table.add_column("Entity")
    table.add_column("Type")
    table.add_column("Truth")
    table.add_column("Confidence")
    table.add_column("Evidence")
    table.add_column("Freshness")
    table.add_column("Resolved?")
    for r in records[:12]:
        table.add_row(r.entity, r.entity_type, r.determined_truth, f"{r.confidence}%",
                      f"{len(r.signals)} signals", r.freshness,
                      "contradiction resolved" if r.contradiction else "—")
    console.print(table)

    console.print(f"\nTrust Score (avg confidence across the Brain): {summary['trust_score']}%")
    console.print(f"Signals reconciled: {summary['signals']} across {summary['entities']} entities")
    console.print(f"Determined CRITICAL truths: {summary['critical']}  ·  HIGH: {summary['high']}")
    console.print(f"Contradictions resolved into a single truth: {summary['contradictions_resolved']}")

    example = next((r for r in records if r.contradiction), records[0] if records else None)
    if example:
        console.print(f"\nEvidence trail — {example.entity}  →  TRUTH: {example.determined_truth} "
                      f"({example.confidence}% confidence, freshness: {example.freshness})")
        for s in example.signals:
            console.print(f"   • [{s.module}] says {s.verdict}: {s.reason}")
    console.print("")
