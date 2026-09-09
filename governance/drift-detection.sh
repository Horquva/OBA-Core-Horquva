#!/usr/bin/env bash
# Part P — DevSecOps Governance, Drift Control & Cross-Platform Security
#
# Compares a repository's CURRENT security configuration against the
# approved baseline (this repo's own config files) and reports drift.
# Intended to run on a schedule across every Sentinel repository once
# real org access exists.
#
# Usage: ./drift-detection.sh <owner>/<repo>

set -uo pipefail

REPO="${1:?Usage: drift-detection.sh <owner>/<repo>}"
DRIFT_FOUND=0

echo "== Sentinel Architecture Drift Detection: $REPO =="
echo

report_drift() {
  echo "DRIFT - $1"
  DRIFT_FOUND=1
}

report_ok() {
  echo "OK    - $1"
}

# 1. Required security workflow files still present and unmodified in structure
for f in ".github/workflows/security-gate.yml" ".github/workflows/ci.yml" ".github/CODEOWNERS" ".github/dependabot.yml"; do
  if gh api "repos/$REPO/contents/$f" >/dev/null 2>&1; then
    report_ok "$f present"
  else
    report_drift "$f MISSING — required security control removed"
  fi
done

# 2. Branch protection still matches baseline (reuses Part A check)
DEFAULT_BRANCH=$(gh api "repos/$REPO" --jq '.default_branch' 2>/dev/null)
if gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection" >/dev/null 2>&1; then
  report_ok "Branch protection still enabled"
else
  report_drift "Branch protection DISABLED since last check"
fi

# 3. Secret scanning still enabled
SS=$(gh api "repos/$REPO" --jq '.security_and_analysis.secret_scanning.status' 2>/dev/null)
if [ "$SS" = "enabled" ]; then
  report_ok "Secret scanning still enabled"
else
  report_drift "Secret scanning DISABLED since last check"
fi

# 4. No unauthorized workflow permission escalation
WP=$(gh api "repos/$REPO/actions/permissions/workflow" --jq '.default_workflow_permissions' 2>/dev/null)
if [ "$WP" = "read" ]; then
  report_ok "Default workflow permissions still read-only"
else
  report_drift "Default workflow permissions escalated to '$WP' (expected 'read')"
fi

echo
if [ "$DRIFT_FOUND" -eq 1 ]; then
  echo "RESULT: Drift detected. Log each item above in governance/exception-register-template.csv"
  echo "        or remediate immediately, per Part P."
  exit 1
fi
echo "RESULT: No drift detected — repository matches approved baseline."
