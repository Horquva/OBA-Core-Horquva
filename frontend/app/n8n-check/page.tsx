"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { runV0N8nCheck } from "@/lib/api";

interface N8nOwnerConcentration {
  ownerName: string;
  workflowsOwned: number;
  sharePct: number;
}

interface N8nAiModelDependency {
  workflowName: string;
  modelName: string;
}

interface N8nContinuityAlert {
  checkId: string;
  reason: string;
}

interface N8nScanResults {
  summary?: {
    totalWorkflows?: number;
    totalUsers?: number;
    totalCredentials?: number;
    aiIntegrationsCount?: number;
  };
  ownerConcentration?: N8nOwnerConcentration[];
  aiModelDependencies?: N8nAiModelDependency[];
  detectedContinuityAlerts?: N8nContinuityAlert[];
}

export default function N8nCheckPage() {
  const [n8nUrl, setN8nUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<N8nScanResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n8nUrl || !apiKey) return;
    setLoading(true);
    setError(null);

    try {
      const data = await runV0N8nCheck(n8nUrl, apiKey);
      setResults(data as unknown as N8nScanResults);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      // Clean fallback demo data if running in preview
      setResults({
        summary: {
          totalWorkflows: 18,
          totalUsers: 5,
          totalCredentials: 12,
          aiIntegrationsCount: 4,
        },
        ownerConcentration: [
          { ownerName: "Omar Farooq", workflowsOwned: 12, sharePct: 67 },
          { ownerName: "Maya Lin", workflowsOwned: 4, sharePct: 22 },
          { ownerName: "Chen Wei", workflowsOwned: 2, sharePct: 11 },
        ],
        aiModelDependencies: [
          { workflowName: "AI Ticket Routing", modelName: "OpenAI gpt-4o" },
          { workflowName: "Document Summarizer", modelName: "Anthropic Claude 3.5 Sonnet" },
        ],
        detectedContinuityAlerts: [
          {
            checkId: "C1_UNBACKED_CRITICAL",
            reason: "Workflow 'Billing Sync' has 0 human backups assigned.",
          },
          {
            checkId: "C2_DEPARTED_OWNER",
            reason: "Workflow 'Lead Scraper' is owned by departed user.",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Free v0 Wedge Tool</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          n8n Ownership & Continuity Scan
        </h1>
        <p className="text-sm text-slate-500">
          Find out who truly owns your automations, who is a single point of failure, and which workflows break if someone leaves.
        </p>
      </div>

      {/* Input Form */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <form onSubmit={handleScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                n8n Instance Base URL
              </label>
              <input
                type="url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://n8n.yourcompany.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                n8n Public API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="n8n_api_key_..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Stateless &amp; ephemeral: API key is held in memory for this scan only and never saved to disk.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
            >
              {loading ? "Scanning n8n Workflows..." : "Run Ownership Scan"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
          Notice: {error} (Displaying local demo preview).
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase">Workflows</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {results.summary?.totalWorkflows}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase">Users</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {results.summary?.totalUsers}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase">Credentials</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {results.summary?.totalCredentials}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase">AI Integrations</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {results.summary?.aiIntegrationsCount}
              </div>
            </div>
          </div>

          {/* Owner Concentration Alert */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Workflow Ownership Concentration
            </h3>
            <div className="space-y-3">
              {results.ownerConcentration?.map((owner: N8nOwnerConcentration, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{owner.ownerName}</span>
                    <span>{owner.workflowsOwned} workflows ({owner.sharePct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${owner.sharePct > 50 ? "bg-rose-500" : "bg-blue-600"}`}
                      style={{ width: `${owner.sharePct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
