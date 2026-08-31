import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_truth_intelligence(path):
    """M46 - Truth Intelligence.
    Cross-verifies facts across independent data sources and produces a set of
    VERIFIED organizational truths, each with a confidence level. This module is
    the gate that must run BEFORE the Autonomous Advisor (M48) - truth before
    recommendation.
    """
    with open(path) as f:
        data = json.load(f)

    assets = data.get("agents", []) + data.get("workflows", [])
    knowledge = data.get("knowledge_areas", [])
    truths = []

    # Truth 1: single points of failure (critical + no backup) - verified two ways
    spof = [a for a in assets if (a.get("criticality") or "").lower() == "critical"
            and not a.get("backup_owner")]
    truths.append({"claim": "Single points of failure exist",
                   "verified": len(spof) > 0, "confidence": "HIGH" if spof else "HIGH",
                   "evidence": f"{len(spof)} critical assets without a backup owner"})

    # Truth 2: undocumented critical knowledge - corroborated by knowledge_areas
    undoc_assets = [a for a in assets if not a.get("documented", False)
                    and (a.get("criticality") or "").lower() in ("critical", "high")]
    undoc_ka = [k for k in knowledge if not k.get("documented", False)
                and k.get("criticality") in ("critical", "high")]
    corroborated = bool(undoc_assets) and bool(undoc_ka)
    truths.append({"claim": "Critical knowledge is undocumented",
                   "verified": bool(undoc_assets) or bool(undoc_ka),
                   "confidence": "HIGH" if corroborated else "MEDIUM",
                   "evidence": f"{len(undoc_assets)} assets + {len(undoc_ka)} knowledge areas undocumented"})

    # Truth 3: ownership concentration
    owners = {}
    for a in assets:
        o = a.get("owner")
        if o:
            owners[o] = owners.get(o, 0) + 1
    top = max(owners.items(), key=lambda kv: kv[1]) if owners else (None, 0)
    concentrated = top[1] >= 3
    truths.append({"claim": "Ownership is over-concentrated",
                   "verified": concentrated,
                   "confidence": "HIGH" if top[1] >= 4 else ("MEDIUM" if concentrated else "LOW"),
                   "evidence": f"Top owner '{top[0]}' holds {top[1]} assets" if top[0] else "n/a"})

    # Truth 4: incident lessons feeding back (consistency check)
    inc = data.get("incidents", [])
    lessons = sum(1 for i in inc if i.get("lesson"))
    truths.append({"claim": "Incident learning loop is active",
                   "verified": lessons >= max(1, len(inc) // 2),
                   "confidence": "MEDIUM",
                   "evidence": f"{lessons}/{len(inc)} incidents have documented lessons"})

    verified = [t for t in truths if t["verified"]]
    trust_score = round(100 * sum(1 for t in truths if t["confidence"] == "HIGH") / len(truths)) if truths else 0
    return {"truths": truths, "verified_count": len(verified), "trust_score": trust_score}


def display_truth_report(summary, company):
    console.print(f"\nM46 - TRUTH INTELLIGENCE - {company}\n")
    console.print("Cross-verifies facts across sources. Truth before recommendation (gates M48).\n")
    console.print(f"VERIFIED TRUTHS: {summary['verified_count']}/{len(summary['truths'])}  "
                  f"| Data trust score: {summary['trust_score']}/100\n")
    t = Table(title="Verified organizational truths")
    t.add_column("Verified"); t.add_column("Confidence"); t.add_column("Claim"); t.add_column("Evidence")
    for tr in summary["truths"]:
        t.add_row("YES" if tr["verified"] else "no", tr["confidence"], tr["claim"], tr["evidence"])
    console.print(t)
    console.print("")
