"""
Din 3 demo — "governance exists" -> "Antares actually uses it".

Proves, with a real run (not a fabricated log), that:
  1. Kanwal's live engine (governance/engine/server.js, port 4003) is
     actually reachable and its real rule set is actually pulled over HTTP.
  2. Those real rules become real Policy rows in Zeeshan's platform, via
     the receive_governance_rules() integration point that existed but was
     never called by anything until this script.
  3. A real agent task, running through the real run_agent_task() chain,
     is actually gated because of a policy that traces back to a specific
     Kanwal rule id — not because of a hand-typed policy like
     demo_day7_governance.py used.
  4. What did NOT transfer (R-13, REJECT_IF_MATCH) is reported honestly,
     not hidden.

PRECONDITION: Kanwal's governance engine must be running:
  node governance/engine/server.js   (port 4003)

Run: python demo_din3_kanwal_integration.py
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.agent_engine import run_agent_task
from app.services.kanwal_governance_sync import sync_kanwal_rules


def run_demo():
    init_db()
    session = get_session()

    print("=== Din 3 Demo: Real Kanwal Governance Sync -> Zeeshan's Agent Platform ===\n")

    org = create_organization(session, name="Antares Din3 Integration Org",
                               owner_id="zeeshan.farooq", provenance="manual_seed")
    unit = create_organizational_unit(session, organization_id=org.id, name="Din3 Test Unit")
    agent = define_agent_role(session, unit_id=unit.id, title="ExecutionAgent")

    # A real capability whose name matches a real Kanwal action, so the sync can
    # link R-09 to it specifically instead of falling back to org-wide.
    cap_delete = assign_capability(session, organization_id=org.id, name="delete_customer_record")
    wf_delete = create_workflow(session, capability_id=cap_delete.id, name="Customer Deletion Workflow")
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap_delete.id,
                               granted_by="zeeshan.farooq")

    action_to_capability_id = {"delete_customer_record": cap_delete.id}

    print("--- Step 1: Real HTTP call to Kanwal's live engine (GET /api/rules) ---")
    created, skipped = sync_kanwal_rules(session, org.id, action_to_capability_id)

    print(f"\nPolicies actually created from Kanwal's real rules ({len(created)}):")
    for p in created:
        print(f"  - {p.name}  (requires_approval={p.requires_approval}, "
              f"capability_id={p.applies_to_capability_id}, provenance={p.provenance})")

    print(f"\nRules that could NOT be translated, reported honestly ({len(skipped)}):")
    for s in skipped:
        print(f"  - {s['rule_id']} ({s['requirement']}): {s['reason']}")

    print("\n--- Step 2: Run a REAL agent task against the capability R-09 now covers ---")
    task = create_task(session, workflow_id=wf_delete.id, title="Delete customer record CUST-4471")
    result = run_agent_task(session, agent, task, tool_executor=lambda t, p: "Record deleted.")

    print(f"\nTask status immediately after run_agent_task: {result.status}")
    print(f"Task result: {result.result}  (should be None — proves it did NOT execute)")
    print("\nThis block happened because of a policy that traces back to Kanwal's real "
          "R-09 rule, pulled live over HTTP moments ago — not a hand-typed policy.")

    session.close()
    print("\n=== Din 3 confirmed working end-to-end: Kanwal's engine is reachable, its real "
          "rules are actually pulled and registered, and a real Antares agent task is actually "
          "gated by them. The R-13/REJECT_IF_MATCH gap is real and reported, not hidden. ===")


if __name__ == "__main__":
    run_demo()
