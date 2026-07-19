from __future__ import annotations
from modules.intelligence_pipeline import IntelligencePipeline
from modules.data_models import Entity, GovernancePolicy, GovernanceGap


def assess_governance_for_entity(
    entity: Entity,
    policies: list[GovernancePolicy],
) -> tuple[int, str, list[str]]:
    score = 100
    issues = []

    if not entity.owner:
        score -= 40
        issues.append("No owner assigned — no one is accountable")

    if not entity.documented:
        score -= 20
        issues.append("Not documented — governance blind spot")

    applicable = [p for p in policies if entity.id in p.applies_to]
    if not applicable:
        score -= 25
        issues.append("No governance policy applies to this entity")
    else:
        expired = [p for p in applicable if p.status == "expired"]
        if expired:
            score -= 15
            issues.append(f"{len(expired)} governance policy expired")

        active = [p for p in applicable if p.status in ("active", "enforced")]
        if not active:
            score -= 10
            issues.append("No active governance policy")

        enforced = [p for p in applicable if p.status == "enforced"]
        if not enforced and entity.criticality in ("critical", "high"):
            score -= 10
            issues.append("Critical entity lacks enforced governance")

    criticality_bonus = {"critical": -10, "high": -5, "medium": 0, "low": 5}
    score += criticality_bonus.get(entity.criticality, 0)

    if entity.criticality in ("critical", "high") and not applicable:
        score -= 15
        issues.append(f"High-criticality {entity.type} with zero governance coverage")

    score = max(0, min(100, score))

    if score >= 80:
        level = "HEALTHY"
    elif score >= 60:
        level = "WARNING"
    elif score >= 40:
        level = "AT RISK"
    else:
        level = "CRITICAL"

    return score, level, issues


def build_governance_heatmap(
    pipeline: IntelligencePipeline,
) -> dict[str, dict]:
    entities = pipeline.get_entities()
    policies = pipeline.get_policies()

    heatmap = {}
    for eid, entity in entities.items():
        if entity.type == "policy":
            continue
        score, level, issues = assess_governance_for_entity(entity, policies)
        heatmap[entity.name] = {
            "id": eid,
            "type": entity.type,
            "department": entity.department or "N/A",
            "criticality": entity.criticality,
            "owner": entity.owner,
            "documented": entity.documented,
            "governance_score": score,
            "governance_level": level,
            "issues": issues,
            "policy_count": len([p for p in policies if eid in p.applies_to]),
        }

    return heatmap


def find_governance_gaps(
    pipeline: IntelligencePipeline,
) -> list[GovernanceGap]:
    entities = pipeline.get_entities()
    policies = pipeline.get_policies()
    gaps = []

    for eid, entity in entities.items():
        if entity.type == "policy":
            continue
        score, level, issues = assess_governance_for_entity(entity, policies)

        if score < 60:
            severity = "CRITICAL" if score < 40 else "HIGH" if score < 50 else "MEDIUM"
            gap_type = "no_governance" if not issues else issues[0].lower().replace(" ", "_")[:30]
            gaps.append(GovernanceGap(
                entity_id=eid,
                entity_name=entity.name,
                gap_type=gap_type,
                severity=severity,
                details="; ".join(issues),
            ))

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
    gaps.sort(key=lambda g: severity_order.get(g.severity, 3))
    return gaps


def calculate_overall_governance_score(pipeline: IntelligencePipeline) -> int:
    heatmap = build_governance_heatmap(pipeline)
    if not heatmap:
        return 100
    scores = [h["governance_score"] for h in heatmap.values()]
    return int(sum(scores) / len(scores))
