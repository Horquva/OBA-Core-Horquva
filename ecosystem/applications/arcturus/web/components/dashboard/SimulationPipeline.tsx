"use client";

import { Network, Database, BrainCircuit, Activity, CheckCircle } from "lucide-react";
import PipelineStep from "./PipelineStep";
import SectionHeader from "../ui/SectionHeader";
import { useActiveExperiment } from "../../hooks/useDashboardData";

export default function SimulationPipeline() {
  const { data: activeExp } = useActiveExperiment();
  const status = activeExp?.status || "IDLE";

  const getStepStatus = (step: string): "pending" | "running" | "completed" | "failed" => {
    if (status === "IDLE") return "pending";
    if (status === "RUNNING") {
      if (step === "ontology" || step === "data") return "completed";
      if (step === "engine") return "running";
      return "pending";
    }
    if (status === "COMPLETED") return "completed";
    if (status === "FAILED") {
      if (step === "engine") return "failed";
      return "completed";
    }
    return "pending";
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm">
      <SectionHeader title="Simulation Pipeline" description="End-to-end status of the current workload" />
      
      <div className="flex items-center justify-between mt-8 mb-4">
        <PipelineStep label="Ontology" icon={Network} status={getStepStatus("ontology")} />
        <PipelineStep label="Data" icon={Database} status={getStepStatus("data")} />
        <PipelineStep label="Engine" icon={Activity} status={getStepStatus("engine")} />
        <PipelineStep label="Analysis" icon={BrainCircuit} status={getStepStatus("analysis")} />
        <PipelineStep label="Validation" icon={CheckCircle} status={getStepStatus("validation")} isLast={true} />
      </div>
    </div>
  );
}
