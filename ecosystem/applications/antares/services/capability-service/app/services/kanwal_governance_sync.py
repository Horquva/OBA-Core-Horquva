"""
Kanwal Governance Sync — Din 3 deliverable.

Closes the real gap Din 1 found: demo_day7_governance.py calls
create_policy(..., created_by="kanwal") with a HAND-TYPED rule, labeled as
if it came from Kanwal's Trust & Governance platform but never actually
did. This module makes that label true — it pulls Kanwal's REAL, live
rule set (governance/engine/rules.js, served over her governanceApi
contract at GET /api/rules — see governance/engine/CONTRACT.md) and
registers it as real Policy rows via the existing
governance_service.receive_governance_rules() integration point, which
was written for this and unused until now.

Design boundary respected (per governance_service.py's own docstring):
this module does not author governance logic. It only translates
Kanwal's rule SHAPE into Zeeshan's Policy SHAPE and registers whatever
her engine actually says. If her rules change, the next sync reflects
that — nothing here is a static/hardcoded rule of our own.

## Honest mapping — not everything transfers

Kanwal's engine has 4 possible outcomes for a rule (ALLOW_IF_MATCH,
REJECT_IF_MATCH, REQUIRE_HUMAN_REVIEW_IF_MATCH, CONDITIONAL). Zeeshan's
Policy model only has ONE boolean lever: requires_approval. This is a
real semantic gap, not a detail to paper over:

- REQUIRE_HUMAN_REVIEW_IF_MATCH, CONDITIONAL  -> requires_approval=True
  (both genuinely mean "a human must look at this before it proceeds" —
  CONDITIONAL specifically means "unless trust is very high", which this
  sync intentionally treats as the SAFER of the two options: always gate,
  never silently skip the gate because trust looked fine at sync time.)
- ALLOW_IF_MATCH -> skipped. No Policy needed: "no policy attached" already
  means "proceeds without approval" in Zeeshan's engine, so a Policy row
  with requires_approval=False would be a no-op.
- REJECT_IF_MATCH -> skipped, and reported as a genuine unhandled case.
  Zeeshan's Policy model has no concept of an outright block — only
  authority_check() can reject a task, and that's driven by capability
  grants, not by Kanwal's policy rules. A REJECT_IF_MATCH rule (e.g. R-13,
  "unverified actors are always rejected") currently has NO enforcement
  path on Zeeshan's side at all. This is a real, unresolved integration
  gap — flagged here rather than silently dropped, left for Din 4/7.

## Capability linkage — honest, not fabricated

Kanwal's rules are keyed by `action` (e.g. "delete_customer_record").
Zeeshan's policies are keyed by `applies_to_capability_id`. There is no
existing mapping between the two. Rather than invent one, this sync only
links a rule to a specific capability when the caller explicitly passes
an `action_to_capability_id` map built from real capabilities that exist
in this organization. Any Kanwal rule whose action isn't in that map is
registered as an ORG-WIDE policy (applies_to_capability_id=None) instead
of being silently skipped or guessed onto the wrong capability — org-wide
is the safe default: it still enforces, it just isn't scoped as tightly
as it could be once a real action<->capability registry exists.
"""
import json
import urllib.request
import urllib.error

from app.services.governance_service import receive_governance_rules

REQUIRES_APPROVAL_REQUIREMENTS = {"REQUIRE_HUMAN_REVIEW_IF_MATCH", "CONDITIONAL"}
NO_POLICY_NEEDED_REQUIREMENTS = {"ALLOW_IF_MATCH"}
UNSUPPORTED_REQUIREMENTS = {"REJECT_IF_MATCH"}


def fetch_kanwal_rules(base_url: str = "http://127.0.0.1:4003") -> list[dict]:
    """
    Real HTTP call to Kanwal's live governance engine's GET /api/rules
    (Din 3 addition to server.js). Raises if the engine isn't reachable —
    this sync never falls back to a hardcoded rule list; if her engine is
    down, that must be a visible failure, not a silent stale sync.
    """
    url = base_url.rstrip("/") + "/api/rules"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError) as e:
        raise RuntimeError(
            f"Could not reach Kanwal's governance engine at {url}: {e}. "
            f"Sync aborted — refusing to register a stale or invented rule set."
        ) from e
    return data["rules"]


def map_kanwal_rules_to_policies(kanwal_rules: list[dict],
                                  action_to_capability_id: dict | None = None) -> tuple[list[dict], list[dict]]:
    """
    Returns (mapped_policies, skipped) where:
      mapped_policies: list of dicts ready for receive_governance_rules()
      skipped: list of {rule_id, requirement, reason} for anything not
               translated, so the caller can report it rather than lose it
               silently.
    """
    action_to_capability_id = action_to_capability_id or {}
    mapped = []
    skipped = []

    for rule in kanwal_rules:
        requirement = rule["requirement"]
        actions = rule.get("appliesTo", {}).get("actions", [])

        if requirement in NO_POLICY_NEEDED_REQUIREMENTS:
            skipped.append({
                "rule_id": rule["id"], "requirement": requirement,
                "reason": "ALLOW_IF_MATCH needs no Policy row — absence of a policy already means no approval gate."
            })
            continue

        if requirement in UNSUPPORTED_REQUIREMENTS:
            skipped.append({
                "rule_id": rule["id"], "requirement": requirement,
                "reason": "Zeeshan's Policy model has no REJECT concept — this rule currently has NO "
                          "enforcement path on this platform. Real gap, not yet resolved."
            })
            continue

        assert requirement in REQUIRES_APPROVAL_REQUIREMENTS

        capability_id = None
        for action in actions:
            if action in action_to_capability_id:
                capability_id = action_to_capability_id[action]
                break

        mapped.append({
            "name": f"[kanwal:{rule['id']}] {rule['name']}",
            "rule": rule["description"],
            "requires_approval": True,
            "applies_to_capability_id": capability_id,
        })

    return mapped, skipped


def sync_kanwal_rules(session, organization_id: str, action_to_capability_id: dict | None = None,
                       base_url: str = "http://127.0.0.1:4003"):
    """
    The actual Din 3 integration: real HTTP call out to Kanwal's live engine,
    honest translation, real registration via the existing (previously
    unused) receive_governance_rules() integration point.

    Returns (created_policies, skipped) for the caller to report.
    """
    kanwal_rules = fetch_kanwal_rules(base_url)
    mapped, skipped = map_kanwal_rules_to_policies(kanwal_rules, action_to_capability_id)
    created = receive_governance_rules(session, organization_id, mapped, source="kanwal")
    return created, skipped
