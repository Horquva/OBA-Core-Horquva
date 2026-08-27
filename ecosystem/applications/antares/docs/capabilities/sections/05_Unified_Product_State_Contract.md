# Making Actual State Usable Inside the Unified Antares Product

**Purpose:** Ensure this platform's real state can be consumed truthfully by a unified product surface — without this platform building its own frontend, and without fabricating a "unified product" integration that does not exist in the delivered package.

## Constraint Acknowledged Up Front

No unified Antares frontend or product shell exists in the delivered package. Building one here would itself be a boundary violation (this platform's job is validation, not UI, and definitely not another team's product surface). What follows is the truthful data/state contract a frontend team would need — nothing more.

## What a Consuming Frontend Can Rely On Today

Every field below was observed in real, live responses during this verification (see `FULL_EVIDENCE_LOG.txt`), not assumed from reading the code:

| Data a UI would show | Source endpoint | Verified live? |
|---|---|---|
| Capability name, current state, score | `GET /capabilities/{id}/report` | Yes |
| Per-dimension pass/fail with plain-language reasoning | `GET /capabilities/{id}/assessment` | Yes |
| Specific strengths/weaknesses per dimension | `GET /capabilities/{id}/assessment` | Yes |
| Full state-transition history with timestamps | `GET /capabilities/{id}/history` | Yes |
| Missing-information checklist (what's blocking VALIDATED) | `report.missing_information` | Yes |

## What a Consuming Frontend Must Not Assume

1. **State does not survive a restart.** A frontend polling this service must treat data as ephemeral until the persistence gap (identified separately) is closed. It should not be treated as a system of record yet.
2. **There is no push/webhook mechanism.** A frontend must poll `status` or `history`; the service does not notify callers when a state changes.
3. **There is no multi-capability listing endpoint.** Every read endpoint operates on a single `capability_id`. A dashboard showing many capabilities would need to track IDs itself; this service does not provide a "list all" or search endpoint today.

## Recommendation

Hand this document (and the Interface Freeze document) directly to whichever team owns the unified product surface. This platform's obligation — providing truthful, explainable, correctly-failing state — is met. Building the actual UI is out of this platform's boundary and is not attempted here.
