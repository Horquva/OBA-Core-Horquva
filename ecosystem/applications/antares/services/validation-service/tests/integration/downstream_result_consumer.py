"""
Downstream Result Consumer — Runtime Integration Verification
-----------------------------------------------------------------
Simulates what a downstream platform (e.g. an operationalization or
enterprise-approval platform) does: it consumes the validation result
purely through the public HTTP contract, and makes its own decision
based on the returned state — it never inspects or reuses internal
scoring logic.

Also demonstrates the honest-failure path: requesting a report for a
capability_id that does not exist must fail loudly (404), not silently.
"""
import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8123"


def get(path: str) -> dict:
    req = urllib.request.Request(f"{BASE_URL}{path}", method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def consume_result(capability_id: str) -> None:
    report = get(f"/capabilities/{capability_id}/report")
    state = report["state"]
    print(f"[downstream] received report for {capability_id}: state={state}, "
          f"score={report['overall_score']}")

    if state == "VALIDATED":
        print("[downstream] decision -> ACCEPT for operationalization queue")
    elif state == "REVISION_REQUIRED":
        print(f"[downstream] decision -> HOLD, {len(report['weaknesses'])} "
              f"weaknesses reported, returned to submitter")
    elif state == "REJECTED":
        print("[downstream] decision -> REJECT, closed")
    else:
        print(f"[downstream] decision -> WAIT, capability still in state {state}")

    history = get(f"/capabilities/{capability_id}/history")
    print(f"[downstream] full audit trail available: "
          f"{len(history['history'])} recorded transition(s)")


def confirm_unknown_id_fails_honestly() -> None:
    """Ground rule: no false success. An unknown capability must 404, not
    return an empty/default report that could be mistaken for success."""
    try:
        get("/capabilities/DOES-NOT-EXIST/report")
        print("[downstream] UNEXPECTED: unknown id returned 200 -- FAIL")
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"expected 404, got {e.code}"
        print(f"[downstream] confirmed: unknown capability_id correctly "
              f"fails with HTTP {e.code} (no false success)")


if __name__ == "__main__":
    with open("/tmp/last_capability_id.txt") as f:
        cap_id = f.read().strip()
    consume_result(cap_id)
    confirm_unknown_id_fails_honestly()
