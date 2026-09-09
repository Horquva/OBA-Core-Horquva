from __future__ import annotations
import uuid

from .detectors import (
    scan_direct_injection,
    scan_indirect_injection,
    scan_instruction_conflict,
    scan_suspicious_patterns,
    sanitize,
)
from .schemas import PromptSecurityFinding, PromptSecurityRequest, PromptSecurityResult


def evaluate_prompt(req: PromptSecurityRequest, *, correlation_id: str | None = None) -> PromptSecurityResult:
    correlation_id = correlation_id or str(uuid.uuid4())
    findings: list[PromptSecurityFinding] = []

    for pattern, snippet in scan_direct_injection(req.prompt):
        findings.append(PromptSecurityFinding(
            finding_type="direct_injection", confidence=0.9,
            detail=f"direct injection pattern matched: {pattern}", matched_snippet=snippet,
        ))

    # Indirect injection only meaningful when the prompt content did NOT
    # originate from the user directly.
    if req.source != "user":
        for pattern, snippet in scan_indirect_injection(req.prompt):
            findings.append(PromptSecurityFinding(
                finding_type="indirect_injection", confidence=0.85,
                detail=f"non-user source ('{req.source}') addresses the agent directly: {pattern}",
                matched_snippet=snippet,
            ))

    for pattern, snippet in scan_instruction_conflict(req.prompt):
        findings.append(PromptSecurityFinding(
            finding_type="instruction_conflict", confidence=0.6,
            detail=f"instruction-conflict pattern matched: {pattern}", matched_snippet=snippet,
        ))

    for pattern, snippet in scan_suspicious_patterns(req.prompt):
        findings.append(PromptSecurityFinding(
            finding_type="suspicious_pattern", confidence=0.5,
            detail=f"suspicious/obfuscation pattern matched: {pattern}", matched_snippet=snippet,
        ))

    is_safe = not any(f.finding_type in ("direct_injection", "indirect_injection") for f in findings)

    return PromptSecurityResult(
        correlation_id=correlation_id,
        agent_id=req.agent_id,
        session_id=req.session_id,
        is_safe=is_safe,
        findings=findings,
        sanitized_prompt=sanitize(req.prompt),
    )
