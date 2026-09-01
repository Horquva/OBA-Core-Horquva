#!/usr/bin/env bash
# Part I — Artifact Security & Build Integrity: Verification
# Part 4, Task 3 — emits a security event (security-event-schema.json shape)
# on rejection, so artifact rejection is not just a workflow log line but a
# traceable, machine-readable event other platforms can eventually consume.
#
# Run before ANY deployment (staging or production). Blocks deployment if the
# artifact is unsigned, has an invalid signature, or lacks valid provenance.
#
# Usage: ./verify-artifact.sh <image-ref>

set -uo pipefail

IMAGE_REF="${1:?Usage: verify-artifact.sh <image-ref>}"
EXPECTED_REPO="${GITHUB_REPOSITORY:-horquva/oba-core-horquva}"
RUN_ID="${GITHUB_RUN_ID:-local}"
COMMIT="${GITHUB_SHA:-unknown}"
BRANCH="${GITHUB_REF_NAME:-unknown}"

emit_event() {
  local decision="$1"
  local reason="$2"
  cat <<EOF > artifact-verification-event.json
{
  "event_id": "SNTL-EVT-$(date -u +%Y%m%d%H%M%S)-artifact",
  "event_type": "artifact_rejected_or_approved_placeholder",
  "repository": "${EXPECTED_REPO}",
  "branch": "${BRANCH}",
  "commit": "${COMMIT}",
  "workflow": "${GITHUB_WORKFLOW:-unknown}",
  "run_id": "${RUN_ID}",
  "run_url": "https://github.com/${EXPECTED_REPO}/actions/runs/${RUN_ID}",
  "source_control": "artifact-verification",
  "decision": "${decision}",
  "image_ref": "${IMAGE_REF}",
  "reason": "${reason}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  # Set the correct event_type now that decision is known (kept the file
  # write above simple/portable; this second pass fixes the enum value).
  if [ "$decision" = "REJECT" ]; then
    sed -i.bak 's/"event_type": "artifact_rejected_or_approved_placeholder"/"event_type": "artifact_rejected"/' artifact-verification-event.json 2>/dev/null || \
    sed -i '' 's/"event_type": "artifact_rejected_or_approved_placeholder"/"event_type": "artifact_rejected"/' artifact-verification-event.json 2>/dev/null
  else
    sed -i.bak 's/"event_type": "artifact_rejected_or_approved_placeholder"/"event_type": "artifact_approved"/' artifact-verification-event.json 2>/dev/null || \
    sed -i '' 's/"event_type": "artifact_rejected_or_approved_placeholder"/"event_type": "artifact_approved"/' artifact-verification-event.json 2>/dev/null
  fi
  rm -f artifact-verification-event.json.bak 2>/dev/null
  echo "Security event written: artifact-verification-event.json"
}

echo "Verifying signature for: ${IMAGE_REF}"

if ! cosign verify \
  --certificate-identity-regexp "https://github.com/${EXPECTED_REPO}/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "${IMAGE_REF}"; then
  emit_event "REJECT" "Signature verification failed"
  echo "::error::Signature verification FAILED — artifact rejected."
  exit 1
fi

echo "Verifying SLSA provenance for: ${IMAGE_REF}"

if ! cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp "https://github.com/${EXPECTED_REPO}/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "${IMAGE_REF}"; then
  emit_event "REJECT" "Provenance verification failed"
  echo "::error::Provenance verification FAILED — artifact rejected."
  exit 1
fi

emit_event "APPROVE" "Signature and provenance both verified"
echo "Artifact verified: signature valid, provenance confirmed. Deployment may proceed."
