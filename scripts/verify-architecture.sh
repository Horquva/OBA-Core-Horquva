#!/usr/bin/env bash
# Part A — DevSecOps Foundation Completion & Architectural Implementation
# Verification: Repository Security Foundation Verification
#
# Run this against a real repository once GitHub org access is granted.
# It checks the repo against the Week 2 approved architecture and reports
# PASS/FAIL for each control — producing the "Architecture Readiness
# Evidence" (Part A) required before the platform is considered complete.
#
# Requires: GitHub CLI (`gh`) authenticated with repo-admin read access.
# Usage: ./verify-architecture.sh <owner>/<repo>

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

echo "== Sentinel Architecture Verification: $REPO =="
echo

# --- Repository Security Foundation Verification (Part A) ---

# Branch protection on default branch
DEFAULT_BRANCH=$(gh api "repos/$REPO" --jq '.default_branch' 2>/dev/null)
BP=$(gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection" >/dev/null 2>&1; echo $?)
check "Branch protection enabled on '$DEFAULT_BRANCH'" "$BP"

# Required status checks
RSC=$(gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection/required_status_checks" --jq '.strict' 2>/dev/null)
check "Required status checks enforced" "$RSC"

# Required PR reviews
RPR=$(gh api "repos/$REPO/branches/$DEFAULT_BRANCH/protection/required_pull_request_reviews" --jq '.required_approving_review_count >= 1' 2>/dev/null)
check "Required PR review approvals configured" "$RPR"

# Secret scanning enabled
SS=$(gh api "repos/$REPO" --jq '.security_and_analysis.secret_scanning.status == "enabled"' 2>/dev/null)
check "Secret scanning enabled" "$SS"

# Secret scanning push protection
SSPP=$(gh api "repos/$REPO" --jq '.security_and_analysis.secret_scanning_push_protection.status == "enabled"' 2>/dev/null)
check "Secret scanning push protection enabled" "$SSPP"

# Dependabot alerts enabled
DA=$(gh api "repos/$REPO/vulnerability-alerts" >/dev/null 2>&1; echo $?)
check "Dependabot vulnerability alerts enabled" "$DA"

# CODEOWNERS file present
CO=$(gh api "repos/$REPO/contents/.github/CODEOWNERS" >/dev/null 2>&1; echo $?)
check "CODEOWNERS file present" "$CO"

# Workflow permissions set to read-only default
WP=$(gh api "repos/$REPO/actions/permissions/workflow" --jq '.default_workflow_permissions == "read"' 2>/dev/null)
check "Default workflow permissions set to read-only (Least Privilege)" "$WP"

# Security policy present
SP=$(gh api "repos/$REPO/contents/SECURITY.md" >/dev/null 2>&1; echo $?)
check "Security policy (SECURITY.md) present" "$SP"

# Repository visibility (should be private/internal for engineering repos)
VIS=$(gh api "repos/$REPO" --jq '.private == true' 2>/dev/null)
check "Repository is private/internal (not public)" "$VIS"

echo
echo "== Result: $PASS passed, $FAIL failed =="
if [ "$FAIL" -gt 0 ]; then
  echo "Repository does NOT yet meet the Sentinel security baseline (Part A)."
  exit 1
fi
echo "Repository meets the Sentinel security baseline."
