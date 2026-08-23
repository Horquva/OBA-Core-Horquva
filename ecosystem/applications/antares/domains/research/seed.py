"""
Sample evidence flows (roadmap Part-8, task 4: "sample real evidence flows").

Note the deliberately imperfect records: a single-source signal, an outdated
item, a disputed item. They exist so the contradiction engine has something
to catch — a seed set where everything is clean proves nothing.
"""

from __future__ import annotations

SEED_SIGNALS: list[dict] = [
    {
        "signal": {
            "title": "Engineering teams embedding AI copilots into daily review workflows",
            "description": (
                "Multiple engineering organizations report moving AI assistant usage from "
                "individual experimentation into the formal code review and design review "
                "workflow, with a human in the loop retained as the approving authority."
            ),
            "organizations": ["Contoso Engineering", "Northwind Platform Group"],
        },
        "evidence": [
            {
                "title": "State of Engineering Productivity 2025",
                "excerpt": "Assisted review is now part of the standard workflow at a majority "
                           "of surveyed engineering organizations, with human approval retained.",
                "source_name": "Engineering Productivity Institute",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/reports/eng-productivity-2025",
                "published_at": "2026-01-15",
                "observed_at": "2026-01-15",
                "status": "VERIFIED",
            },
            {
                "title": "Copilot adoption in regulated code review",
                "excerpt": "A controlled study found assisted review reduced defect escape rate "
                           "while increasing the volume of reviewer comments requiring judgement.",
                "source_name": "Journal of Software Organization",
                "source_type": "PEER_REVIEWED",
                "source_url": "https://example.org/jso/2026/assisted-review",
                "published_at": "2026-03-02",
                "observed_at": "2026-03-02",
                "status": "VERIFIED",
            },
            {
                "title": "Internal observation: review queue composition shift",
                "excerpt": "Our own platform teams report that reviewer time is shifting from "
                           "syntax to architectural judgement.",
                "source_name": "Internal Engineering Observation Log",
                "source_type": "INTERNAL_OBSERVATION",
                "published_at": "2026-05-10",
                "observed_at": "2026-05-10",
                "status": "VERIFIED",
            },
        ],
    },
    {
        "signal": {
            "title": "Organizations rewriting approval policy as machine-checkable guardrails",
            "description": (
                "Governance and compliance teams are expressing policy as code so that "
                "guardrails execute automatically at the point of work, with audit evidence "
                "captured as a by-product rather than assembled afterwards."
            ),
            "organizations": ["Fabrikam Financial", "Contoso Engineering"],
        },
        "evidence": [
            {
                "title": "Policy-as-code in regulated enterprises",
                "excerpt": "Compliance functions report shifting from periodic manual audit "
                           "toward continuous automated guardrail enforcement.",
                "source_name": "Governance Quarterly",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/gq/policy-as-code",
                "published_at": "2026-02-20",
                "observed_at": "2026-02-20",
                "status": "VERIFIED",
            },
            {
                "title": "Automated compliance evidence capture",
                "excerpt": "Audit evidence generated at execution time was accepted by "
                           "external auditors in the majority of reviewed engagements.",
                "source_name": "Journal of Software Organization",
                "source_type": "PEER_REVIEWED",
                "source_url": "https://example.org/jso/2026/audit-evidence",
                "published_at": "2026-04-11",
                "observed_at": "2026-04-11",
                "status": "VERIFIED",
            },
        ],
    },
    {
        "signal": {
            "title": "Multi-agent orchestration replacing manual work routing",
            "description": (
                "Operations groups are handing routing and escalation decisions to autonomous "
                "agent orchestration layers, with humans supervising exceptions rather than "
                "dispatching every item of work."
            ),
            "organizations": ["Northwind Platform Group"],
        },
        "evidence": [
            {
                "title": "Agent orchestration in operations",
                "excerpt": "Autonomous coordination handled routine routing while escalation "
                           "remained a supervised human decision.",
                "source_name": "Operations Technology Review",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/otr/agent-orchestration",
                "published_at": "2026-03-18",
                "observed_at": "2026-03-18",
                "status": "VERIFIED",
            },
            {
                "title": "Vendor claims on autonomous operations",
                "excerpt": "Vendor material asserts fully autonomous operations with no human "
                           "supervision required.",
                "source_name": "AgentCo Marketing",
                "source_type": "VENDOR_PUBLICATION",
                "source_url": "https://example.org/agentco/autonomy",
                "published_at": "2026-04-01",
                "observed_at": "2026-04-01",
                "status": "DISPUTED",   # deliberately contradicts the report above
            },
        ],
    },
    {
        "signal": {
            "title": "Distributed decision authority pushed to autonomous squads",
            "description": (
                "Leadership structures are devolving decision rights to self-managing squads, "
                "with accountability evidenced through recorded decision logs rather than "
                "hierarchical sign-off chains."
            ),
            "organizations": ["Fabrikam Financial"],
        },
        "evidence": [
            {
                "title": "Devolved decision rights in scaled organizations",
                "excerpt": "Squad-level decision authority correlated with faster cycle time "
                           "where decision logs were maintained.",
                "source_name": "Governance Quarterly",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/gq/devolved-authority",
                "published_at": "2026-02-05",
                "observed_at": "2026-02-05",
                "status": "VERIFIED",
            },
            {
                "title": "Flat organization retrospective",
                "excerpt": "An early flat-structure experiment reported coordination overhead "
                           "outweighing autonomy gains.",
                "source_name": "Practitioner Notes Blog",
                "source_type": "PRACTITIONER_BLOG",
                "source_url": "https://example.org/blog/flat-retro",
                "published_at": "2021-06-01",
                "observed_at": "2021-06-01",   # deliberately outdated
                "status": "UNVERIFIED",
            },
        ],
    },
    {
        "signal": {
            "title": "Institutional memory rebuilt as queryable knowledge graphs",
            "description": (
                "Organizations are consolidating scattered documentation into retrieval-backed "
                "knowledge graphs so that past decisions and their provenance can be queried "
                "rather than rediscovered."
            ),
            "organizations": ["Contoso Engineering"],
        },
        "evidence": [
            {
                "title": "Knowledge graph adoption for institutional memory",
                "excerpt": "Retrieval-backed knowledge bases shortened onboarding and reduced "
                           "repeated decision-making.",
                "source_name": "Knowledge Systems Review",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/ksr/knowledge-graphs",
                "published_at": "2026-01-28",
                "observed_at": "2026-01-28",
                "status": "VERIFIED",
            },
        ],
        # single source on purpose: must NOT reach pattern status alone
    },
    {
        "signal": {
            "title": "Design decisions drafted by AI assistant and ratified by human architects",
            "description": (
                "Architecture groups are using an AI assistant to draft options and trade-off "
                "analysis, keeping a human in the loop as the ratifying authority so that "
                "accountability for the decision stays with a named person."
            ),
            "organizations": ["Fabrikam Financial", "Contoso Engineering"],
        },
        "evidence": [
            {
                "title": "Assisted architecture decision records",
                "excerpt": "Teams using drafted decision records retained named human ratification "
                           "and reported faster convergence on trade-offs.",
                "source_name": "Journal of Software Organization",
                "source_type": "PEER_REVIEWED",
                "source_url": "https://example.org/jso/2026/assisted-adr",
                "published_at": "2026-02-14",
                "observed_at": "2026-02-14",
                "status": "VERIFIED",
            },
            {
                "title": "Architecture practice survey",
                "excerpt": "Assistant-drafted option analysis is now common in architecture "
                           "practice, with ratification remaining a human step.",
                "source_name": "Enterprise Architecture Digest",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/ead/practice-survey",
                "published_at": "2026-04-22",
                "observed_at": "2026-04-22",
                "status": "VERIFIED",
            },
            {
                "title": "Internal observation: ADR authorship shift",
                "excerpt": "Our architects report drafting time falling while review depth rises.",
                "source_name": "Internal Engineering Observation Log",
                "source_type": "INTERNAL_OBSERVATION",
                "published_at": "2026-05-30",
                "observed_at": "2026-05-30",
                "status": "VERIFIED",
            },
        ],
    },
    {
        "signal": {
            "title": "Continuous audit trails replacing periodic compliance review cycles",
            "description": (
                "Regulated organizations are replacing quarterly compliance review with "
                "continuous audit evidence capture, so oversight becomes a property of the "
                "workflow instead of a separate governance exercise."
            ),
            "organizations": ["Fabrikam Financial"],
        },
        "evidence": [
            {
                "title": "Continuous assurance in regulated industries",
                "excerpt": "Continuous evidence capture reduced audit preparation effort while "
                           "increasing the volume of retained oversight records.",
                "source_name": "Regulatory Technology Review",
                "source_type": "INDUSTRY_REPORT",
                "source_url": "https://example.org/rtr/continuous-assurance",
                "published_at": "2026-03-09",
                "observed_at": "2026-03-09",
                "status": "VERIFIED",
            },
            {
                "title": "Auditor acceptance of automated compliance records",
                "excerpt": "External auditors accepted workflow-generated records where "
                           "provenance and timestamps were preserved.",
                "source_name": "Journal of Software Organization",
                "source_type": "PEER_REVIEWED",
                "source_url": "https://example.org/jso/2026/auditor-acceptance",
                "published_at": "2026-05-18",
                "observed_at": "2026-05-18",
                "status": "VERIFIED",
            },
        ],
    },
]


def load_seed(service) -> dict:
    """Ingest the seed set through the real pipeline (no direct DB writes)."""
    created, evidence_count, warnings = [], 0, []
    for entry in SEED_SIGNALS:
        result = service.submit_signal(entry["signal"], actor="seed")
        signal_id = result["signal"]["id"]
        created.append(signal_id)
        warnings.extend(result["warnings"])
        for ev in entry["evidence"]:
            service.add_evidence(signal_id, ev, actor="seed")
            evidence_count += 1
        service.analyze_impact(signal_id, actor="seed")
    return {"signals": created, "evidence": evidence_count, "warnings": warnings}
