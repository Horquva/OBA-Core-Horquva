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

# Phase 3 — Architecture Layers (Ontology, Relationship, Context, Voice — Huzaifa; Reasoning, Truth — Kamran)
from modules.ontology_layer import run_ontology_layer, display_ontology_report
from modules.relationship_layer import run_relationship_layer, display_relationship_report
from modules.reasoning_layer import run_reasoning_layer, display_reasoning_report
from modules.truth_layer import run_truth_layer, display_truth_report as display_truth_layer_report
from modules.context_intelligence_layer import run_context_layer, display_context_report
from modules.voice_context_layer import run_voice_context_layer, display_voice_context_report

# Phase 4 — Executive Intelligence (Huzaifa: M21-M23; Kamran: M24-M27)
from modules.executive_avatar_intelligence import run_executive_avatar, display_executive_avatar
from modules.voice_intelligence_engine import run_voice_engine, display_voice_engine
from modules.executive_briefing_intelligence import run_executive_briefing, display_executive_briefing
from modules.decision_support_intelligence import run_decision_support, display_decision_support
from modules.organizational_health_intelligence import run_organizational_health, display_organizational_health
from modules.executive_memory_intelligence import run_executive_memory, display_executive_memory
from modules.executive_context_intelligence import run_executive_context, display_executive_context

# Phase 5 — Network, Dependency & Ecosystem Intelligence (Huzaifa: M28/M29/M31/M34/M35; Kamran: M30)
from modules.universal_dependency_graph import run_universal_dependency_graph, display_universal_dependency_graph
from modules.organizational_relationship_intelligence import run_relationship_intelligence, display_relationship_intelligence
from modules.knowledge_concentration_intelligence import run_knowledge_concentration, display_knowledge_concentration
from modules.organizational_ecosystem_intelligence import run_ecosystem_intelligence, display_ecosystem_intelligence
from modules.hidden_dependency_intelligence import run_hidden_dependency, display_hidden_dependency
from modules.organizational_network_intelligence import run_network_intelligence, display_network_intelligence

# Phase 6 - Constitutional Intelligence & Meta-Brain (Kamran: M36, M38, M39, M40, M46, M48, M50, M54, M55)
from modules.signal_intelligence import run_signal_intelligence, display_signal_report
from modules.opportunity_intelligence import run_opportunity_intelligence, display_opportunity_report
from modules.capability_intelligence import run_capability_intelligence, display_capability_report
from modules.strategic_alignment_intelligence import run_strategic_alignment_intelligence, display_strategic_alignment_report
from modules.truth_intelligence import run_truth_intelligence, display_truth_report as display_truth_intel_report
from modules.autonomous_advisor import run_autonomous_advisor, display_autonomous_advisor
from modules.brain_core_logic import run_brain_core, display_brain_core
from modules.simulation_universe import run_simulation_universe, display_simulation_universe
from modules.intelligence_orchestrator import run_intelligence_orchestrator, display_intelligence_orchestrator

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

DATA_PATH = "data/company.json"

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

    # ── Phase 3 — Architecture Layers ──
    # Ontology Layer (Huzaifa) — defines what exists
    ontology, ontology_stats = run_ontology_layer(DATA_PATH)
    display_ontology_report(ontology, ontology_stats, company)
    console.print(SEP)

    # Relationship Layer (Huzaifa) — defines how everything connects
    relationships, relationship_stats = run_relationship_layer(DATA_PATH)
    display_relationship_report(relationships, relationship_stats, company)
    console.print(SEP)

    # Reasoning Layer (Kamran) — turns raw signals into understanding
    insights, reasoning_summary = run_reasoning_layer(DATA_PATH)
    display_reasoning_report(insights, reasoning_summary, company)
    console.print(SEP)

    # Truth Layer (Kamran) — reconciles all signals into one organizational truth
    truth_records, truth_summary = run_truth_layer(DATA_PATH)
    display_truth_layer_report(truth_records, truth_summary, company)
    console.print(SEP)

    # Context Intelligence Layer (Huzaifa) — real-time context for the Executive Avatar
    context_packages, context_summary = run_context_layer(DATA_PATH)
    display_context_report(context_packages, context_summary, company)
    console.print(SEP)

    # Voice Agent Context Layer (Huzaifa) — semantic foundation for Voice Agents
    voice_entities, voice_intents, voice_summary = run_voice_context_layer(DATA_PATH)
    display_voice_context_report(voice_entities, voice_intents, voice_summary, company)
    console.print(SEP)

    # ══ Phase 4 — Executive Intelligence (Huzaifa: M21-M23; Kamran: M24-M27) ══
    avatar_qa, avatar_summary = run_executive_avatar(DATA_PATH)
    display_executive_avatar(avatar_qa, avatar_summary, company)
    console.print(SEP)

    voice_answered, voice_engine_summary = run_voice_engine(DATA_PATH)
    display_voice_engine(voice_answered, voice_engine_summary, company)
    console.print(SEP)

    briefing, briefing_summary = run_executive_briefing(DATA_PATH)
    display_executive_briefing(briefing, briefing_summary, company)
    console.print(SEP)

    decision_summary = run_decision_support(DATA_PATH)
    display_decision_support(decision_summary, company)
    console.print(SEP)

    health_summary = run_organizational_health(DATA_PATH)
    display_organizational_health(health_summary, company)
    console.print(SEP)

    memory_summary = run_executive_memory(DATA_PATH)
    display_executive_memory(memory_summary, company)
    console.print(SEP)

    context_intel_summary = run_executive_context(DATA_PATH)
    display_executive_context(context_intel_summary, company)
    console.print(SEP)

    # ══ Phase 5 — Network, Dependency & Ecosystem Intelligence (Huzaifa: M28/M29/M31/M34/M35; Kamran: M30) ══
    udg_summary = run_universal_dependency_graph(DATA_PATH)
    display_universal_dependency_graph(udg_summary, company)
    console.print(SEP)

    rel_intel_summary = run_relationship_intelligence(DATA_PATH)
    display_relationship_intelligence(rel_intel_summary, company)
    console.print(SEP)

    kc_summary = run_knowledge_concentration(DATA_PATH)
    display_knowledge_concentration(kc_summary, company)
    console.print(SEP)

    eco_summary = run_ecosystem_intelligence(DATA_PATH)
    display_ecosystem_intelligence(eco_summary, company)
    console.print(SEP)

    hidden_summary = run_hidden_dependency(DATA_PATH)
    display_hidden_dependency(hidden_summary, company)
    console.print(SEP)

    network_summary = run_network_intelligence(DATA_PATH)
    display_network_intelligence(network_summary, company)
    console.print(SEP)

    # == Phase 6 - Constitutional Intelligence & Meta-Brain (Kamran: M36, M38-M40, M46, M48, M50, M54, M55) ==
    # Truth-before-recommendation order: signals/capability/alignment -> truth -> advisor -> brain core -> simulation -> orchestrator (last)
    signal_summary = run_signal_intelligence(DATA_PATH)
    display_signal_report(signal_summary, company)
    console.print(SEP)

    capability_summary = run_capability_intelligence(DATA_PATH)
    display_capability_report(capability_summary, company)
    console.print(SEP)

    opportunity_summary = run_opportunity_intelligence(DATA_PATH)
    display_opportunity_report(opportunity_summary, company)
    console.print(SEP)

    alignment_summary = run_strategic_alignment_intelligence(DATA_PATH)
    display_strategic_alignment_report(alignment_summary, company)
    console.print(SEP)

    truth_intel_summary = run_truth_intelligence(DATA_PATH)
    display_truth_intel_report(truth_intel_summary, company)
    console.print(SEP)

    advisor_summary = run_autonomous_advisor(DATA_PATH)
    display_autonomous_advisor(advisor_summary, company)
    console.print(SEP)

    brain_summary = run_brain_core(DATA_PATH)
    display_brain_core(brain_summary, company)
    console.print(SEP)

    universe_summary = run_simulation_universe(DATA_PATH)
    display_simulation_universe(universe_summary, company)
    console.print(SEP)

    orchestrator_summary = run_intelligence_orchestrator(DATA_PATH)
    display_intelligence_orchestrator(orchestrator_summary, company)
    console.print(SEP)

    console.print("\n=== OBA Core Analysis Complete — Constitutional Module Registry M01-M55 (LOCKED) — 20 Core + Engine + 6 Architecture Layers + Phase 4/5 Executive & Network + Phase 6 Constitutional Intelligence & Meta-Brain (M36-M55) ===\n")


if __name__ == "__main__":
    main()
