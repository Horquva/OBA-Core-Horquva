"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function ConnectorsPage() {
  const [connectors] = useState([
    {
      id: "n8n",
      name: "n8n Automation Engine",
      description: "Discovers workflows, credentials metadata, node models, and execution volume.",
      status: "connected",
      lastSync: "10 minutes ago",
    },
    {
      id: "entra",
      name: "Microsoft Entra ID (Azure AD)",
      description: "Authoritative leaver detection (employeeLeaveDateTime) and Azure app registrations.",
      status: "connected",
      lastSync: "30 minutes ago",
    },
    {
      id: "google",
      name: "Google Workspace Directory",
      description: "User suspension states, organizational units, and manager escalation hierarchy.",
      status: "disconnected",
      lastSync: "Never",
    },
    {
      id: "ai_admin",
      name: "OpenAI & Anthropic Admin",
      description: "Direct usage tracking by model and team attribution.",
      status: "connected",
      lastSync: "2 hours ago",
    },
  ]);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      alert(`Synchronized connector ${id} successfully!`);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Data Connectors &amp; Sources
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Horquva connects directly to your tools via read-only APIs to discover automated workflows, people, and models.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connectors.map((c) => {
          const isConn = c.status === "connected";
          const isSyncing = syncingId === c.id;

          return (
            <div
              key={c.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-slate-900 dark:text-white">{c.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      isConn
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isConn ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{c.status}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Last sync: {c.lastSync}</span>
                <button
                  onClick={() => handleSync(c.id)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
