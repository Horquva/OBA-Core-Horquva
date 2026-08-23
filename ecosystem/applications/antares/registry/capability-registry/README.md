# Capability Registry — NOT YET BUILT

This is the one real gap in Zeeshan's Day 1-10 deliverable relative to
the official repo structure: `OrganizationalCapability` records
currently live only inside the SQLite database created by
`services/capability-service/app/models/capability.py` — there is no
separate registry artifact (e.g. exported JSON/manifest of capabilities)
that other Antares platforms could read without running this service.

Needed before OBA integration: a small export/registry service that
serializes active capabilities from the database into this folder (or
exposes them via `query_service.py`, which already exists and is
read-only — may be sufficient, pending Tech Lead confirmation on
whether a registry needs to be a static artifact or a live query
endpoint).
