"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 9 Deliverable: Cross-Team Integration Layer

Purpose (per the 10-day plan, Din 8-9):
"Unit + integration + API tests (invalid requests, duplicate submissions,
version conflicts), poore Antares platforms ke sath cross-team test."

This module does NOT reimplement ingestion logic. It reuses the Day 8
production engine (single source of truth for persistence/validation
rules) and adds:
  1. A catalog of sample payload shapes representing what each upstream
     Antares platform (Zara/Capability Validation, Ammara/Enterprise
     Validation, Kanwal/Trust & Governance, Aurangzeb/Technology
     Intelligence, Muzammel/Organizational Futures) would actually send.
  2. A cross-team ingestion harness that submits all of them through the
     real production API and reports pass/fail per platform.
  3. A reliability report endpoint summarizing what's live in the system,
     grouped by source_platform, so other teams/OBA can sanity-check
     integration status.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "day8"))

from typing import List, Dict, Any
from fastapi import APIRouter
from sqlalchemy.orm import Session

from part8_production_antres_platform import (
    app,
    SessionLocal,
    ProductionKnowledgeModel,
    ProductionIngestRequest,
    ProductionAntresEngine,
)

# ==========================================
# 1. CROSS-TEAM SAMPLE PAYLOAD CATALOG
# ==========================================
# One representative payload per upstream Antares platform, in the exact
# shape ProductionIngestRequest expects. Used both by the automated test
# suite and by the Day 10 final demo.
CROSS_TEAM_SAMPLE_PAYLOADS: List[Dict[str, Any]] = [
    {
        "id": "ko-zara-cap-201",
        "title": "  automated fraud detection capability  ",
        "description": "Validated capability for real-time transaction fraud detection using anomaly scoring.",
        "category": "Capability",
        "provenance": {
            "source_platform": "Capability Validation (Zara)",
            "author_id": "zara.fatima",
            "source_reference_id": "CAP-VAL-3301",
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.93,
            "constitutional_check_passed": True,
        },
        "capabilities": ["cap-fraud-01"],
        "technologies": ["tech-anomaly-detection"],
        "dependencies": [],
        "version": 1,
    },
    {
        "id": "ko-ammara-ent-202",
        "title": "enterprise data residency compliance pattern",
        "description": "Enterprise-validated pattern for regional data residency compliance across cloud regions.",
        "category": "Governance Pattern",
        "provenance": {
            "source_platform": "Enterprise Validation (Ammara)",
            "author_id": "ammara.nasir",
            "source_reference_id": "EV-REF-4470",
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.97,
            "constitutional_check_passed": True,
        },
        "capabilities": ["cap-compliance-04"],
        "technologies": [],
        "dependencies": ["ko-zara-cap-201"],
        "version": 1,
    },
    {
        "id": "ko-kanwal-gov-203",
        "title": "AI decision explainability governance rule",
        "description": "Trust and governance rule requiring explainability logs for autonomous AI-driven decisions.",
        "category": "Governance Pattern",
        "provenance": {
            "source_platform": "Trust & Governance Intelligence (Kanwal)",
            "author_id": "kanwal.raveen",
            "source_reference_id": "TGI-REF-1187",
        },
        "validation": {
            "validated_by": "CTO Review Board",
            "validation_status": "APPROVED",
            "confidence_score": 0.99,
            "constitutional_check_passed": True,
        },
        "capabilities": [],
        "technologies": [],
        "dependencies": [],
        "version": 1,
    },
    {
        "id": "ko-aurangzeb-tech-204",
        "title": "quantum-resistant encryption technology signal",
        "description": "Emerging technology signal on quantum-resistant encryption readiness for future architecture.",
        "category": "Technology",
        "provenance": {
            "source_platform": "Technology Intelligence (Aurangzeb)",
            "author_id": "aurangzeb.malik",
            "source_reference_id": "TECHRADAR-0091",
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.81,
            "constitutional_check_passed": True,
        },
        "capabilities": [],
        "technologies": ["tech-pqc-encryption"],
        "dependencies": [],
        "version": 1,
    },
    {
        "id": "ko-muzammel-org-205",
        "title": "autonomous enterprise organizational model",
        "description": "Organizational futures model describing autonomous, AI-native enterprise structures.",
        "category": "Organizational Future",
        "provenance": {
            "source_platform": "Organizational Futures Engineering (Muzammel)",
            "author_id": "muzammel.aslam",
            "source_reference_id": "OFE-REF-0552",
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.88,
            "constitutional_check_passed": True,
        },
        "capabilities": [],
        "technologies": [],
        "dependencies": [],
        "version": 1,
    },
]


# ==========================================
# 2. CROSS-TEAM INTEGRATION HARNESS
# ==========================================
class CrossTeamIntegrationHarness:
    @staticmethod
    def run_full_integration(db: Session) -> Dict[str, Any]:
        """Ingests one sample payload per upstream platform through the real
        Day 8 production engine and reports per-platform pass/fail."""
        results = []
        for payload_dict in CROSS_TEAM_SAMPLE_PAYLOADS:
            platform = payload_dict["provenance"]["source_platform"]
            try:
                req = ProductionIngestRequest(**payload_dict)
                obj = ProductionAntresEngine.operationalize_knowledge(db, req)
                results.append({
                    "source_platform": platform,
                    "knowledge_id": obj.id,
                    "status": "INTEGRATED",
                })
            except Exception as exc:  # noqa: BLE001 - integration report needs any failure captured
                results.append({
                    "source_platform": platform,
                    "knowledge_id": payload_dict.get("id"),
                    "status": "FAILED",
                    "error": str(exc),
                })
        return {
            "total_platforms_tested": len(CROSS_TEAM_SAMPLE_PAYLOADS),
            "integrated": len([r for r in results if r["status"] == "INTEGRATED"]),
            "failed": len([r for r in results if r["status"] == "FAILED"]),
            "results": results,
        }

    @staticmethod
    def integration_status_report(db: Session) -> Dict[str, Any]:
        """Groups all currently active knowledge objects by source_platform
        so other teams/OBA can see integration coverage at a glance."""
        objs = db.query(ProductionKnowledgeModel).filter(
            ProductionKnowledgeModel.is_active == True  # noqa: E712
        ).all()
        by_platform: Dict[str, int] = {}
        for obj in objs:
            by_platform[obj.source_platform] = by_platform.get(obj.source_platform, 0) + 1
        return {
            "total_active_knowledge_objects": len(objs),
            "objects_by_source_platform": by_platform,
        }


# ==========================================
# 3. FASTAPI ROUTES (mounted onto the Day 8 app)
# ==========================================
router = APIRouter(prefix="/api/v9/integration", tags=["cross-team-integration"])


@router.post("/run-cross-team-check")
def api_run_cross_team_check():
    db = SessionLocal()
    try:
        return CrossTeamIntegrationHarness.run_full_integration(db)
    finally:
        db.close()


@router.get("/status-report")
def api_integration_status_report():
    db = SessionLocal()
    try:
        return CrossTeamIntegrationHarness.integration_status_report(db)
    finally:
        db.close()


app.include_router(router)
