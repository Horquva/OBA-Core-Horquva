"use client";

import SectionHeader from "../../components/ui/SectionHeader";
import { Database, Download, FileText, HardDrive } from "lucide-react";

export default function SyntheticDataPage() {
  const artifacts = [
    { id: "art-901", type: "LOG_STREAM", name: "Transaction Event Corpus", size: "482 MB", created: "10 mins ago" },
    { id: "art-902", type: "METRICS_CSV", name: "Agent Latency Telemetry", size: "124 MB", created: "1 hour ago" },
    { id: "art-903", type: "JSON_CORPUS", name: "Enterprise Structural Snapshot", size: "1.2 GB", created: "3 hours ago" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        title="Synthetic Data Corpus"
        description="Browse, inspect, and export generated synthetic datasets and telemetry artifacts."
        action={
          <button className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm shadow-sm flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Export All Corpora
          </button>
        }
      />

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-800/50 font-semibold text-sm text-slate-700 flex justify-between">
          <span>Generated Artifacts</span>
          <span className="text-xs text-slate-500 font-normal">3 artifacts stored in DB</span>
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {artifacts.map((art) => (
            <div key={art.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Database className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{art.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{art.id} • {art.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-700">{art.size}</div>
                  <div className="text-[10px] text-slate-400">{art.created}</div>
                </div>
                <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
