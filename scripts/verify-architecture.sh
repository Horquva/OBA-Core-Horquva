#!/usr/bin/env bash
# Part 2, Task 7 — Repository Governance Integration Verification
#
# Bilal consumes repository governance (branch protection, CODEOWNERS,
# required status checks) rather than owning or redefining it. This script
# verifies that the DevSecOps security checks are correctly wired INTO
# existing repository governance as required checks — it does not create
# or modify governance itself.
#
# Usage: ./scripts/verify-architecture.sh <owner>/<repo>
# Requires: GitHub CLI (`gh`) authenticated with repo-admin read access.

set -uo pipefail

REPO="${1:?Usage: verify-architecture.sh <owner>/<repo>}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "true" ] || [ "$result" = "0" ]; then
    echo "PASS  - $name"
    PASS=$((PASS+1))
  else
    echo "FAIL  - $name"
    FAIL=$((FAIL+1))
  fi
}

echo "== Repository Governance Integration Check: $REPO =="
echo

DEFAULT_BRANCH=$(gh api "repos/$REPO" --jq '.default_branch' 2>/dev/null)

# --- Governance exists (owned by repo governance, not DevSecOps) ---
BP=$(gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection" >/dev/null 2>&1; echo $?)
check "Branch protection exists on '$DEFAULT_BRANCH'" "$BP"

CO=$(gh api "repos/$REPO/contents/.github/CODEOWNERS" >/dev/null 2>&1; echo $?)
check "CODEOWNERS file present" "$CO"

# --- DevSecOps integration INTO that governance (this is Bilal's part) ---
REQUIRED_CHECKS=$(gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection/required_status_checks" --jq '.contexts[]' 2>/dev/null)
if echo "$REQUIRED_CHECKS" | grep -q "Pipeline Status"; then
  check "Security 'Pipeline Status' check is a REQUIRED status check" "true"
else
  check "Security 'Pipeline Status' check is a REQUIRED status check" "false"
fi

CO_REVIEW=$(gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection" --jq '.required_pull_request_reviews.require_code_owner_reviews' 2>/dev/null)
if [ "$CO_REVIEW" = "true" ]; then
  check "CODEOWNERS review enforcement is enabled" "true"
else
  check "CODEOWNERS review enforcement is enabled" "false"
fi

DA=$(gh api "repos/$REPO/vulnerability-alerts" >/dev/null 2>&1; echo $?)
check "Dependabot vulnerability alerts enabled" "$DA"

SS=$(gh api "repos/$REPO" --jq '.security_and_analysis.secret_scanning.status == "enabled"' 2>/dev/null)
check "GitHub native secret scanning enabled (defense in depth alongside Gitleaks)" "$SS"

echo
echo "== Result: $PASS passed, $FAIL failed =="
echo "Note: Governance items (branch protection, CODEOWNERS existing) are"
echo "owned by repository governance, not DevSecOps. Bilal's responsibility"
echo "is confirming security checks are correctly consumed as required"
echo "checks within that governance — the middle two checks above."
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
