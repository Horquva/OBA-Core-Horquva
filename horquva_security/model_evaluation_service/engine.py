from __future__ import annotations
from ai_security_common import EvaluationResult
from .criteria import ALL_CRITERIA
from .schemas import EvaluateModelRequest


def evaluate_model(req: EvaluateModelRequest) -> EvaluationResult:
    findings: list[str] = []
    per_sample_scores: list[float] = []

    for i, sample in enumerate(req.samples):
        sample_passed = 0
        for criterion in ALL_CRITERIA:
            ok, note = criterion(sample)
            if not ok:
                findings.append(f"sample[{i}]: {note}")
            else:
                sample_passed += 1
        per_sample_scores.append(sample_passed / len(ALL_CRITERIA))

    score = sum(per_sample_scores) / len(per_sample_scores)
    passed = score >= req.pass_threshold

    return EvaluationResult(
        subject_id=req.subject_id, passed=passed, score=round(score, 4), findings=findings,
    )
