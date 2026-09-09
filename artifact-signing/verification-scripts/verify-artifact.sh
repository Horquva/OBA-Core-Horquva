#!/usr/bin/env bash
# Part I — Artifact Security & Build Integrity: Verification
# Run before ANY deployment (staging or production). Blocks deployment if the
# artifact is unsigned, has an invalid signature, or lacks valid provenance.
#
# Usage: ./verify-artifact.sh <image-ref>

set -euo pipefail

IMAGE_REF="${1:?Usage: verify-artifact.sh <image-ref>}"
EXPECTED_REPO="${GITHUB_REPOSITORY:-horquva/sentinel-devsecops}"

echo "Verifying signature for: ${IMAGE_REF}"

cosign verify \
  --certificate-identity-regexp "https://github.com/${EXPECTED_REPO}/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "${IMAGE_REF}" \
  || { echo "::error::Signature verification FAILED — artifact rejected."; exit 1; }

echo "Verifying SLSA provenance for: ${IMAGE_REF}"

cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp "https://github.com/${EXPECTED_REPO}/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "${IMAGE_REF}" \
  || { echo "::error::Provenance verification FAILED — artifact rejected."; exit 1; }

echo "Artifact verified: signature valid, provenance confirmed. Deployment may proceed."
