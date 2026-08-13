# Altair Configuration Foundation

## Safe configuration rules

- Never embed API secrets, keys, tokens, or database credentials in client-side source.
- Keep runtime configuration explicit and environment-aware.
- Separate development, build, and runtime concerns.
- Treat public configuration as safe only when approved for client exposure.

## Allowed configuration patterns

- public metadata
- route metadata
- UI defaults
- non-sensitive theme values
- local mock adapters for contract-safe development

## Deferred external requirements

Any production deployment, environment injection, or secured runtime configuration must happen outside Altair in the repository's real application runtime boundary.
