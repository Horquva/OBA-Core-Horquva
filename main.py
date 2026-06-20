import io
import json
import sys
from rich.console import Console

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
from modules.verification_intelligence import run_verification_intelligence, display_verification_report
from modules.workflow_orchestration_intelligence import run_workflow_orchestration_intelligence, display_orchestration_report
from modules.decision_intelligence import run_decision_intelligence, display_decision_report
from modules.organizational_continuity_intelligence import run_continuity_intelligence, display_continuity_report
from modules.organizational_intelligence_engine import run_intelligence_engine, display_intelligence_report

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

DATA_PATH = "data/sunrise_care.json"


def main():
    with open(DATA_PATH) as f:
        data = json.load(f)

    company = data["company"]
    console.print("\n=== OBA CORE — AI WORKFORCE INTELLIGENCE ===\n")

    # Module 01
    ownership_results = run_ownership_intelligence(DATA_PATH)
    display_ownership_report(ownership_results, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 02
    dependency_results = run_dependency_intelligence(DATA_PATH)
    display_dependency_report(dependency_results, data)
    console.print("\n" + "-" * 60 + "\n")

    # Module 03
    risk_results, health_score = run_risk_intelligence(DATA_PATH)
    display_risk_report(risk_results, health_score, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 04
    recommendations = generate_recommendations(risk_results, data)
    display_recommendation_report(recommendations, risk_results, health_score, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 05
    scenarios, baseline_health = run_whatif_simulation(DATA_PATH)
    display_whatif_report(scenarios, baseline_health, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 06
    profiles, gaps, results = run_human_agent_map(DATA_PATH)
    display_human_agent_map(profiles, gaps, results, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 07
    tool_risks, dep_maps, dept_tool_map = run_ai_tool_intelligence(DATA_PATH)
    display_ai_tool_report(tool_risks, dep_maps, dept_tool_map, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 08
    wf_risks, node_failures = run_workflow_intelligence(DATA_PATH)
    display_workflow_report(wf_risks, node_failures, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 09
    knowledge_nodes, knowledge_gaps, knowledge_summary = run_knowledge_risk_intelligence(DATA_PATH)
    display_knowledge_risk_report(knowledge_nodes, knowledge_gaps, knowledge_summary, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 10
    memory_nodes, memory_carriers, memory_health = run_organizational_memory_intelligence(DATA_PATH)
    display_organizational_memory_report(memory_nodes, memory_carriers, memory_health, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 15
    verification_records = run_verification_intelligence(DATA_PATH)
    display_verification_report(verification_records, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 16
    orchestration_states, collisions = run_workflow_orchestration_intelligence(DATA_PATH)
    display_orchestration_report(orchestration_states, collisions, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 14 — Decision Intelligence (Kamran)
    decisions, decision_index = run_decision_intelligence(DATA_PATH)
    display_decision_report(decisions, decision_index, company)
    console.print("\n" + "-" * 60 + "\n")

    # Module 18 — Organizational Continuity Intelligence (Kamran)
    continuity_nodes, continuity_plans, continuity_score, continuity_dept_map = run_continuity_intelligence(DATA_PATH)
    display_continuity_report(continuity_nodes, continuity_plans, continuity_score, continuity_dept_map, company)
    console.print("\n" + "-" * 60 + "\n")

    # Phase 2 — Organizational Intelligence Engine (Five Pillars Integration, Kamran)
    pillars, pillar_relationships, org_intelligence_score = run_intelligence_engine(DATA_PATH)
    display_intelligence_report(pillars, pillar_relationships, org_intelligence_score, company)
    console.print("\n" + "-" * 60 + "\n")

    console.print("\n=== OBA Core Analysis Complete — 14 Modules + Organizational Intelligence Engine ===\n")


if __name__ == "__main__":
    main()