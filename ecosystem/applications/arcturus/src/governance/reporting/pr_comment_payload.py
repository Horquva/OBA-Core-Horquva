"""
Arcturus Governance — pr_comment_payload.py
============================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 3 Deliverable: Converts a ComplianceScanReport into a structured GitHub
PR comment payload that the CI workflow can POST via the GitHub REST API.

The payload produced by build_pr_comment_payload() is a plain Python dict
that serialises directly to the JSON body required by:
  POST /repos/{owner}/{repo}/issues/{issue_number}/comments

Usage
-----
  import json
  from ecosystem.applications.arcturus.src.governance.reporting.pr_comment_payload import (
      build_pr_comment_payload,
  )

  payload = build_pr_comment_payload(report, markdown_body=md)
  print(json.dumps(payload, indent=2))
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from ecosystem.applications.arcturus.src.governance.compliance_scanner import (
    ComplianceScanReport,
)
from ecosystem.applications.arcturus.src.governance.reporting.markdown_reporter import (
    emit_markdown_report,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_COMMENT_TAG = "<!-- arcturus-governance-gate -->"
"""
Hidden HTML comment used to identify and update existing governance comments.
CI tooling can search for this tag to decide whether to create a new comment
or edit the existing one.
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_pr_comment_payload(
    report: ComplianceScanReport,
    *,
    markdown_body: str | None = None,
) -> dict[str, Any]:
    """
    Build the GitHub REST API payload for a PR comment that embeds the
    Arcturus compliance report.

    Parameters
    ----------
    report:
        The ComplianceScanReport to serialise into the comment body.
    markdown_body:
        Pre-rendered markdown string. If omitted, emit_markdown_report() is
        called automatically to produce the body.

    Returns
    -------
    dict[str, Any]
        A dict with the following keys:

        ``body``
            The full markdown string to post as the PR comment body.
        ``verdict``
            ``"compliant"`` or ``"non_compliant"`` — machine-readable verdict.
        ``timestamp``
            ISO-8601 UTC timestamp of the scan.
        ``violation_counts``
            Dict breaking down counts per check category.
        ``tag``
            The hidden HTML comment tag for idempotent comment updates.
    """
    if markdown_body is None:
        markdown_body = emit_markdown_report(report)

    now_iso = datetime.now(timezone.utc).isoformat()

    violation_counts = {
        "path_violations": len(report.path_result.violations),
        "import_violations": len(report.import_result.import_violations),
        "secret_hits": len(report.secret_result.secret_hits),
        "dirty_files": len(report.dirty_files),
    }

    # Prefix the body with the hidden tag so CI can locate this comment later
    full_body = f"{_COMMENT_TAG}\n\n{markdown_body}"

    return {
        "body": full_body,
        "verdict": "compliant" if report.is_compliant else "non_compliant",
        "timestamp": now_iso,
        "violation_counts": violation_counts,
        "tag": _COMMENT_TAG,
    }


def serialise_payload(payload: dict[str, Any], *, indent: int = 2) -> str:
    """
    Serialise a PR comment payload dict to a JSON string.

    Useful for writing the payload to a CI artifact file or echoing it in
    workflow logs.

    Parameters
    ----------
    payload:
        The dict returned by build_pr_comment_payload().
    indent:
        JSON indentation level.

    Returns
    -------
    str
        Pretty-printed JSON string.
    """
    return json.dumps(payload, indent=indent, ensure_ascii=False)
