======================================================================
Arcturus Compliance Scanner Report
======================================================================

── Path Boundary Check ──────────────────────────────────────
✅ Path Enforcer: 229 files checked — 0 violations under C:\data\Horquva\OBA-Core-Horquva

── Import Boundary Check ────────────────────────────────────
✅ Import Boundary: 104 file(s) checked — 0 forbidden imports, 0 secret patterns

── Secret Pattern Scan ──────────────────────────────────────
✅ Import Boundary: 135 file(s) checked — 0 forbidden imports, 0 secret patterns

── Working Tree Dirtiness Check ─────────────────────────────
❌ Tree is dirty — 11 uncommitted file(s):
  • D ecosystem/applications/arcturus/api/routers/enterprise_router.py
  • D ecosystem/applications/arcturus/api/routers/intelligence_router.py
  • D ecosystem/applications/arcturus/api/routers/validation_router.py
  • M ecosystem/applications/arcturus/api/services/intelligence_service.py
  • M ecosystem/applications/arcturus/contracts/ocos_integration/boundary_contract.py
  • M ecosystem/applications/arcturus/src/integration/experiment_orchestrator.py
  • M ecosystem/applications/arcturus/src/lineage/lineage_tracker.py
  • M ecosystem/applications/arcturus/tests/e2e/test_full_pipeline.py
  • ?? ecosystem/applications/arcturus/docs/week4/evidence/
  • ?? ecosystem/applications/arcturus/scripts/run_compliance_scan.py
  • ?? ecosystem/applications/arcturus/tests/e2e/fixtures/validated_intelligence_seed.json

── Overall Verdict ──────────────────────────────────────────
❌ NON-COMPLIANT — review findings above
======================================================================