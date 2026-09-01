"use client";

import { Play, Database, BrainCircuit, Activity } from "lucide-react";
import QuickActionButton from "../ui/QuickActionButton";
import { useRouter } from "next/navigation";

export default function QuickActionsBar() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <QuickActionButton
        icon={Play}
        label="New Experiment"
        description="Launch a new simulation run"
        primary={true}
        onClick={() => router.push("/experiments")}
      />
      <QuickActionButton
        icon={Database}
        label="Generate Data"
        description="Create synthetic datasets"
        onClick={() => router.push("/synthetic_data")}
      />
      <QuickActionButton
        icon={BrainCircuit}
        label="Analyze Insights"
        description="View latest AI recommendations"
        onClick={() => router.push("/intelligence")}
      />
      <QuickActionButton
        icon={Activity}
        label="View Telemetry"
        description="Check system health & logs"
        onClick={() => router.push("/runtime")}
      />
    </div>
  );
}
