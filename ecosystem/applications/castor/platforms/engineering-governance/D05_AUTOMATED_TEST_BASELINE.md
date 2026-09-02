# CASTOR v2.0 — AUTOMATED TEST BASELINE (D05)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)  
**Status:** ACTIVE / ENFORCED  

---

## 1. Test Pyramid Strategy

Castor enforces a 3-tier testing strategy across all application features:

              / \
             /   \  E2E / Surface Tests (5%)
            /-----\
           /       \  Widget / Integration Tests (25%)
          /---------\
         /           \  Unit & Contract Tests (70%)
        /-------------\

---

## 2. Test Execution Commands

| Test Suite | Target Directory / File | Command | Target Pass Rate |
| :--- | :--- | :--- | :--- |
| **Widget Tests** | `apps/mobile/test/widget_test.dart` | `flutter test` | 100% |
| **Full Suite** | `apps/mobile/test/` | `flutter test --coverage` | 100% |
| **Static Analysis** | `apps/mobile/` | `flutter analyze` | 0 Issues |
| **Format Check** | `apps/mobile/` | `dart format --output=none --set-exit-if-changed .` | Clean |