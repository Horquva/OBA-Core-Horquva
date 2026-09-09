#!/usr/bin/env bash
# Part I — Artifact Security & Build Integrity: Signing
# Signs a container image using Sigstore Cosign with keyless (OIDC) signing,
# tying every artifact back to the exact CI workflow run that produced it.
#
# Usage: ./sign-artifact.sh <image-ref>
# Requires: cosign installed, running inside GitHub Actions (uses OIDC token)

set -euo pipefail

IMAGE_REF="${1:?Usage: sign-artifact.sh <image-ref>}"

echo "Signing artifact: ${IMAGE_REF}"

# Keyless signing — identity comes from the GitHub Actions OIDC token, so no
# long-lived private key needs to be stored as a secret (Least Privilege).
cosign sign \
  --yes \
  "${IMAGE_REF}"

echo "Generating SLSA provenance attestation..."
cosign attest \
  --yes \
  --type slsaprovenance \
  --predicate provenance.json \
  "${IMAGE_REF}"

echo "Artifact signed and provenance attached: ${IMAGE_REF}"
