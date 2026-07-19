import io
import json
import sys
from rich.console import Console

# Phase 1 / Core Intelligence (M01-M10)
from modules.ownership_intelligence import run_ownership_intelligence, display_ownership_report
from modules.dependency_intelligence import run_dependency_intelligence, display_dependency_report
from modules.risk_intelligence import run_risk_intelligence, display_risk_report
from modules.recommendation_engine import generate_recommendations, display_recommendation_report
from modules.whatif_simulation import run_whatif_simulation, display_whatif_report
from modules.human_agent_map import run_human_agent_map, display_human_agent_map
from modules.ai_tool_intelligence import run_ai_tool_intelligence, display_ai_tool_report
from modules.workflow_intelligence import run_workflow_intelligence, display_workflow_report
from modules.knowledge_risk_intelligence import run_knowledge_risk_intelligence, display_knowledge_risk_report
from modules.organizational_memory_intelligence import run_organizational_memory_intelligence, display_organizational_memory_report

# Prediction Layer (M11-M13, Tahir)
from modules.predictive_risk_intelligence import run_predictive_risk_intelligence, display_predictive_risk_report
from modules.organizational_forecasting_intelligence import run_organizational_forecasting_intelligence, display_organizational_forecasting_report
from modules.human_ai_collaboration_intelligence import run_human_ai_collaboration_intelligence, display_human_ai_collaboration_report

# Decision & Operations (M14-M16)
from modules.decision_intelligence import run_decision_intelligence, display_decision_report
from modules.verification_intelligence import run_verification_intelligence, display_verification_report
from modules.workflow_orchestration_intelligence import run_workflow_orchestration_intelligence, display_orchestration_report

# Learning Layer (M17, Tahir)
from modules.organizational_learning_intelligence import run_organizational_learning_intelligence, display_organizational_learning_report

# Continuity (M18)
from modules.organizational_continuity_intelligence import run_continuity_intelligence, display_continuity_report

# Governance & Accountability (M19-M20, Huzaifa)
from modules.governance_intelligence import run_governance_intelligence, display_governance_report
from modules.accountability_intelligence import run_accountability_intelligence, display_accountability_report

# Phase 2 — Five Pillars Integration
from modules.organizational_intelligence_engine import run_intelligence_engine, display_intelligence_report

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

DATA_PATH = "data/sunrise_care.json"

SEP = "\n" + "-" * 60 + "\n"


def main():
    with open(DATA_PATH) as f:
        data = json.load(f)

    company = data["company"]
    console.print("\n=== OBA CORE — AI WORKFORCE INTELLIGENCE ===\n")

    # ── M01 — Ownership Intelligence (Kamran) ──
    ownership_results = run_ownership_intelligence(DATA_PATH)
    display_ownership_report(ownership_results, company)
    console.print(SEP)

    # ── M02 — Dependency Intelligence (Huzaifa) ──
    dependency_results = run_dependency_intelligence(DATA_PATH)
    display_dependency_report(dependency_results, data)
    console.print(SEP)

    # ── M03 — Risk Intelligence (Huzaifa) ──
    risk_results, health_score = run_risk_intelligence(DATA_PATH)
    display_risk_report(risk_results, health_score, company)
    console.print(SEP)

    # ── M04 — Recommendation Engine (Kamran) ──
    recommendations = generate_recommendations(risk_results, data)
    display_recommendation_report(recommendations, risk_results, health_score, company)
    console.print(SEP)

    # ── M05 — What-If Simulation (Kamran) ──
    scenarios, baseline_health = run_whatif_simulation(DATA_PATH)
    display_whatif_report(scenarios, baseline_health, company)
    console.print(SEP)

    # ── M06 — Human-Agent Dependency Map (Kamran) ──
    profiles, gaps, results = run_human_agent_map(DATA_PATH)
    display_human_agent_map(profiles, gaps, results, company)
    console.print(SEP)

    # ── M07 — AI Tool Intelligence (Huzaifa) ──
    tool_risks, dep_maps, dept_tool_map = run_ai_tool_intelligence(DATA_PATH)
    display_ai_tool_report(tool_risks, dep_maps, dept_tool_map, company)
    console.print(SEP)

    # ── M08 — Workflow Intelligence (Huzaifa) ──
    wf_risks, node_failures = run_workflow_intelligence(DATA_PATH)
    display_workflow_report(wf_risks, node_failures, company)
    console.print(SEP)

    # ── M09 — Knowledge Risk Intelligence (Kamran) ──
    knowledge_nodes, knowledge_gaps, knowledge_summary = run_knowledge_risk_intelligence(DATA_PATH)
    display_knowledge_risk_report(knowledge_nodes, knowledge_gaps, knowledge_summary, company)
    console.print(SEP)

    # ── M10 — Organizational Memory Intelligence (Kamran) ──
    memory_nodes, memory_carriers, memory_health = run_organizational_memory_intelligence(DATA_PATH)
    display_organizational_memory_report(memory_nodes, memory_carriers, memory_health, company)
    console.print(SEP)

    # ── M11 — Predictive Risk Intelligence (Tahir) ──
    predictions, prediction_summary = run_predictive_risk_intelligence(DATA_PATH)
    display_predictive_risk_report(predictions, prediction_summary, company)
    console.print(SEP)

    # ── M12 — Organizational Forecasting Intelligence (Tahir) ──
    forecasts, outlook_score = run_organizational_forecasting_intelligence(DATA_PATH)
    display_organizational_forecasting_report(forecasts, outlook_score, company)
    console.print(SEP)

    # ── M13 — Human-AI Collaboration Intelligence (Tahir) ──
    collaboration_report = run_human_ai_collaboration_intelligence(DATA_PATH)
    display_human_ai_collaboration_report(collaboration_report, company)
    console.print(SEP)

    # ── M14 — Decision Intelligence (Kamran) ──
    decisions, decision_index = run_decision_intelligence(DATA_PATH)
    display_decision_report(decisions, decision_index, company)
    console.print(SEP)

    # ── M15 — Verification Intelligence (Anusha) ──
    verification_records = run_verification_intelligence(DATA_PATH)
    display_verification_report(verification_records, company)
    console.print(SEP)

    # ── M16 — Workflow Orchestration Intelligence (Anusha) ──
    orchestration_states, collisions = run_workflow_orchestration_intelligence(DATA_PATH)
    display_orchestration_report(orchestration_states, collisions, company)
    console.print(SEP)

    # ── M17 — Organizational Learning Intelligence (Tahir) ──
    learning_report = run_organizational_learning_intelligence(DATA_PATH)
    display_organizational_learning_report(learning_report, company)
    console.print(SEP)

    # ── M18 — Organizational Continuity Intelligence (Kamran) ──
    continuity_nodes, continuity_plans, continuity_score, continuity_dept_map = run_continuity_intelligence(DATA_PATH)
    display_continuity_report(continuity_nodes, continuity_plans, continuity_score, continuity_dept_map, company)
    console.print(SEP)

    # ── M19 — Governance Intelligence (Huzaifa) ──
    gov_results, gov_score, gov_risks, gov_heatmap = run_governance_intelligence(DATA_PATH)
    display_governance_report(gov_results, gov_score, gov_risks, gov_heatmap, company)
    console.print(SEP)

    # ── M20 — Accountability Intelligence (Huzaifa) ──
    acc_results, acc_score, acc_chains, acc_coverage = run_accountability_intelligence(DATA_PATH)
    display_accountability_report(acc_results, acc_score, acc_chains, acc_coverage, company)
    console.print(SEP)

    # ── Phase 2 — Organizational Intelligence Engine (Five Pillars Integration, Kamran) ──
    pillars, pillar_relationships, org_intelligence_score = run_intelligence_engine(DATA_PATH)
    display_intelligence_report(pillars, pillar_relationships, org_intelligence_score, company)
    console.print(SEP)

    console.print("\n=== OBA Core Analysis Complete — 20 Modules + Organizational Intelligence Engine ===\n")


if __name__ == "__main__":
    main()
