"""
Deliberate Failure Injection Tests
-----------------------------------------------------------------
Purpose: prove the system reports failure honestly when evidence,
dependencies, or the request itself is broken -- rather than silently
producing a passing or default result.

Every test in this file is expected to FAIL SAFE: either an explicit
error/rejected state, or a genuinely low score with itemized reasons.
A test here would be considered a violation of the no-false-success
requirement if the system ever masked a broken input as a clean pass.
"""
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8123"


def post(path: str, payload: dict, expect_status: int = 200):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def get(path: str):
    req = urllib.request.Request(f"{BASE_URL}{path}", method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def check(name, condition, detail):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name} -- {detail}")
    return condition


def test_empty_capability_is_not_silently_validated():
    """A completely empty submission must NOT reach VALIDATED."""
    status, resp = post("/capabilities", {})
    cap_id = resp["capability_id"]
    _, result = post(f"/capabilities/{cap_id}/validate", {})
    ok = result["state"] != "VALIDATED" and result["overall_score"] < 0.35
    return check(
        "empty_capability_is_not_silently_validated", ok,
        f"state={result['state']} score={result['overall_score']}",
    )


def test_missing_evidence_lowers_score_not_hidden():
    """A capability with strong narrative but zero evidence must be
    flagged specifically on EVIDENCE_QUALITY, not pass unnoticed."""
    payload = {
        "capability_name": "Unverified Claim Capability",
        "description": "A capability whose claims cannot currently be checked "
                        "against any supporting evidence at all.",
        "organizational_problem": "Some unverified operational problem exists here.",
        "target_organization": "Ops",
        "expected_value": "Large unverified value claimed without support.",
        "expected_outcome": "Unverified positive outcome.",
        "evidence_references": [],
    }
    status, resp = post("/capabilities", payload)
    cap_id = resp["capability_id"]
    _, result = post(f"/capabilities/{cap_id}/validate", {})
    dims = {f["dimension"]: f for f in result["findings"]}
    ev_finding = dims.get("EVIDENCE_QUALITY", {})
    ok = ev_finding.get("passed") is False and ev_finding.get("score", 1) == 0.0
    return check(
        "missing_evidence_lowers_score_not_hidden", ok,
        f"EVIDENCE_QUALITY passed={ev_finding.get('passed')} "
        f"score={ev_finding.get('score')}",
    )


def test_unknown_capability_id_fails_loudly_on_every_read_endpoint():
    """Every read endpoint must 404 on an unknown id -- never return a
    default/empty object that a caller could mistake for a real result."""
    fake_id = "CAP-DOES-NOT-EXIST-0000"
    results = {}
    for path in [
        f"/capabilities/{fake_id}/assessment",
        f"/capabilities/{fake_id}/status",
        f"/capabilities/{fake_id}/report",
    ]:
        status, _ = get(path)
        results[path] = status
    ok = all(v == 404 for v in results.values())
    return check(
        "unknown_capability_id_fails_loudly_on_every_read_endpoint", ok,
        f"statuses={results}",
    )


def test_history_endpoint_does_not_fabricate_entries_for_unknown_id():
    """The history endpoint returns 200 by design (it's a list endpoint),
    so the failure-safe requirement here is different: it must return an
    EMPTY list for an unknown id, never fabricated history entries."""
    fake_id = "CAP-DOES-NOT-EXIST-0000"
    status, resp = get(f"/capabilities/{fake_id}/history")
    ok = status == 200 and resp["history"] == []
    return check(
        "history_endpoint_does_not_fabricate_entries_for_unknown_id", ok,
        f"status={status} history_len={len(resp.get('history', []))}",
    )


def test_revision_of_unknown_capability_fails_not_silently_creates():
    """Requesting a revision for an id that was never submitted must
    fail (404), not silently create a new record."""
    fake_id = "CAP-DOES-NOT-EXIST-0000"
    status, resp = post(f"/capabilities/{fake_id}/revise", {"updated_fields": {}})
    ok = status == 404
    return check(
        "revision_of_unknown_capability_fails_not_silently_creates", ok,
        f"status={status}",
    )


if __name__ == "__main__":
    tests = [
        test_empty_capability_is_not_silently_validated,
        test_missing_evidence_lowers_score_not_hidden,
        test_unknown_capability_id_fails_loudly_on_every_read_endpoint,
        test_history_endpoint_does_not_fabricate_entries_for_unknown_id,
        test_revision_of_unknown_capability_fails_not_silently_creates,
    ]
    results = [t() for t in tests]
    passed = sum(results)
    print(f"\n{passed}/{len(results)} failure-injection checks passed")
    if passed != len(results):
        raise SystemExit(1)
