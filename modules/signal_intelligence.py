import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def _trend(series):
    """Return (delta, direction) for a numeric time series (oldest..newest)."""
    if len(series) < 2:
        return 0, "flat"
    delta = series[-1] - series[0]
    return delta, ("rising" if delta > 0 else ("falling" if delta < 0 else "flat"))


def run_signal_intelligence(path):
    """M36 - Signal Intelligence.
    Detects early-warning organizational signals from historical trends and
    incident patterns before they become full-blown risks.
    """
    with open(path) as f:
        data = json.load(f)

    hist = data.get("history", [])
    incidents = data.get("incidents", [])
    signals = []

    if hist:
        doc_series = [h.get("documented_pct", 0) for h in hist]
        risk_series = [h.get("risk_index", 0) for h in hist]
        inc_series = [h.get("open_incidents", 0) for h in hist]
        backup_series = [h.get("backup_pct", 0) for h in hist]

        d, dir_ = _trend(doc_series)
        if dir_ == "falling":
            signals.append({"signal": "Documentation coverage declining", "metric": f"{doc_series[0]}% -> {doc_series[-1]}%", "severity": "HIGH"})
        d, dir_ = _trend(risk_series)
        if dir_ == "rising":
            signals.append({"signal": "Organizational risk index rising", "metric": f"{risk_series[0]} -> {risk_series[-1]}", "severity": "CRITICAL"})
        d, dir_ = _trend(inc_series)
        if dir_ == "rising":
            signals.append({"signal": "Open incidents trending up", "metric": f"{inc_series[0]} -> {inc_series[-1]}", "severity": "HIGH"})
        d, dir_ = _trend(backup_series)
        if dir_ == "falling":
            signals.append({"signal": "Backup/continuity coverage eroding", "metric": f"{backup_series[0]}% -> {backup_series[-1]}%", "severity": "MEDIUM"})

    unresolved = [i for i in incidents if not i.get("resolved_by")]
    if unresolved:
        signals.append({"signal": "Unresolved incidents on record", "metric": f"{len(unresolved)} open", "severity": "HIGH"})

    # repeat incident types = systemic signal
    types = {}
    for i in incidents:
        types[i.get("type", "unknown")] = types.get(i.get("type", "unknown"), 0) + 1
    for t, n in types.items():
        if n >= 2:
            signals.append({"signal": f"Recurring incident pattern: {t}", "metric": f"{n} occurrences", "severity": "MEDIUM"})

    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    signals.sort(key=lambda s: order.get(s["severity"], 9))
    score = max(0, 100 - (18 * sum(1 for s in signals if s["severity"] == "CRITICAL")
                          + 10 * sum(1 for s in signals if s["severity"] == "HIGH")
                          + 4 * sum(1 for s in signals if s["severity"] == "MEDIUM")))
    return {"signals": signals, "stability_score": score}


def display_signal_report(summary, company):
    console.print(f"\nM36 - SIGNAL INTELLIGENCE - {company}\n")
    console.print("Detects early-warning signals from trends and incidents before they escalate.\n")
    console.print(f"EARLY-WARNING STABILITY SCORE: {summary['stability_score']}/100  "
                  f"({len(summary['signals'])} active signals)\n")
    if not summary["signals"]:
        console.print("No early-warning signals detected. Organization is stable.\n")
        return
    t = Table(title="Active early-warning signals")
    t.add_column("Severity"); t.add_column("Signal"); t.add_column("Evidence")
    for s in summary["signals"]:
        t.add_row(s["severity"], s["signal"], s["metric"])
    console.print(t)
    console.print("")
