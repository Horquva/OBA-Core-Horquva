"""
Upstream Candidate Producer — Runtime Integration Verification
-----------------------------------------------------------------
Simulates what an upstream discovery-style platform does: it does NOT
touch any Capability Validation internals. It only calls the public
HTTP contract documented in the Interface Freeze document, exactly as
a real caller would from outside this repository.

This script and its downstream counterpart (downstream_result_consumer.py)
are the actual runtime-integration evidence for the platform: they were
run against a live, locally-hosted instance of app.api:app, not mocked.
"""
import sys
import json
import urllib.request

BASE_URL = "http://127.0.0.1:8123"


def post(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def submit_candidate(candidate: dict) -> str:
    """Acts as an upstream discovery platform submitting a real candidate."""
    result = post("/capabilities", candidate)
    print(f"[upstream] submitted candidate -> capability_id={result['capability_id']} "
          f"status={result['status']}")
    return result["capability_id"]


def trigger_validation(capability_id: str) -> dict:
    result = post(f"/capabilities/{capability_id}/validate", {})
    print(f"[upstream] validation triggered -> state={result['state']} "
          f"score={result['overall_score']}")
    return result


if __name__ == "__main__":
    candidate = {
        "capability_name": "Automated Invoice Reconciliation",
        "description": "Matches incoming vendor invoices against purchase orders "
                        "and flags discrepancies for finance review automatically.",
        "organizational_problem": "Finance team spends 12+ hours weekly on manual "
                                   "invoice-to-PO matching, causing payment delays.",
        "target_organization": "Finance Operations",
        "expected_value": "Reduces manual reconciliation time by an estimated 80%.",
        "expected_outcome": "Invoices are matched and exceptions routed automatically.",
        "source_platform": "Technology Intelligence",
        "submitted_by": "upstream-integration-script",
        "dependencies": ["ERP invoice feed", "PO system access"],
        "risks": ["False-positive mismatches during initial rollout"],
        "evidence_references": [
            {
                "evidence_id": "EV-INV-001",
                "source": "pilot",
                "description": "4-week pilot run against 220 real invoices",
                "url_or_locator": "internal://pilot-reports/inv-recon-w4",
            }
        ],
    }
    cap_id = submit_candidate(candidate)
    result = trigger_validation(cap_id)
    with open("/tmp/last_capability_id.txt", "w") as f:
        f.write(cap_id)
    print(json.dumps(result, indent=2))
