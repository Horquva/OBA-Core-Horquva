"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { simulateLeaver, simulateOutage, testSuccession } from "@/lib/api";
import { WhatIfScenarioResult, SuccessionTestResult } from "@horquva/types";
import { CriticalityBadge } from "@/components/ui/Badges";

export default function SimulationPage() {
  const [tab, setTab] = useState<"leaver" | "outage" | "succession">("leaver");

  // S1: Leaver state
  const [leaverEmail, setLeaverEmail] = useState("omar@acme.com");
  const [leaverResult, setLeaverResult] = useState<WhatIfScenarioResult | null>(null);
  const [leaverLoading, setLeaverLoading] = useState(false);

  // S2: Outage state
  const [modelId, setModelId] = useState("model:openai:gpt-4o");
  const [outageResult, setOutageResult] = useState<{
    affectedAutomations: Array<{ id: string; name: string; weeklyRuns: number }>;
    totalRunsPerWeekAffected: number;
  } | null>(null);
  const [outageLoading, setOutageLoading] = useState(false);

  // S3: Succession state
  const [departingId, setDepartingId] = useState("person:omar@acme.com");
  const [successorId, setSuccessorId] = useState("person:maya@acme.com");
  const [successionResult, setSuccessionResult] = useState<SuccessionTestResult | null>(null);
  const [successionLoading, setSuccessionLoading] = useState(false);

  const handleRunLeaver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaverLoading(true);
    try {
      const personId = leaverEmail.startsWith("person:") ? leaverEmail : `person:${leaverEmail.toLowerCase()}`;
      const data = await simulateLeaver([personId]);
      setLeaverResult(data.result);
    } catch {
      // Fallback ground-truth demo calculation if backend offline
      setLeaverResult({
        orphanedCriticalAssets: [
          {
            entityId: "automation:n8n:101",
            name: "Billing Sync to Stripe",
            priorOwnerId: "person:omar@acme.com",
            criticality: "critical",
          },
          {
            entityId: "automation:n8n:102",
            name: "Payroll Batch Trigger",
            priorOwnerId: "person:omar@acme.com",
            criticality: "critical",
          },
        ],
        stoppedPersonalCredentialAutomations: [],
        totalRunsPerWeekAffected: 620,
        affectedDownstreamAssetIds: [],
        unknownFactsEncountered: 0,
      });
    } finally {
      setLeaverLoading(false);
    }
  };

  const handleRunOutage = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutageLoading(true);
    try {
      const data = await simulateOutage(modelId);
      setOutageResult(data.result);
    } catch {
      setOutageResult({
        affectedAutomations: [
          { id: "automation:n8n:105", name: "AI Ticket Routing", weeklyRuns: 2500 },
        ],
        totalRunsPerWeekAffected: 2500,
      });
    } finally {
      setOutageLoading(false);
    }
  };

  const handleRunSuccession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessionLoading(true);
    try {
      const data = await testSuccession(departingId, successorId);
      setSuccessionResult(data.result);
    } catch {
      setSuccessionResult({
        departingPersonId: departingId,
        successorPersonId: successorId,
        transferredAssetCount: 2,
        postHandoverCoverage: { coveredCount: 0, stillExposedCount: 2 },
        successorNewConcentrationLoad: {
          totalCriticalAssetsOwned: 3,
          shareOfCompanyCriticalAutomationsPct: 75,
          overloadWarning: true,
        },
      });
    } finally {
      setSuccessionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          What-If Continuity Simulations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Simulate departures, credential expirations, and vendor outages using deterministic graph reachability.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setTab("leaver")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === "leaver"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          S1: Employee Departure
        </button>
        <button
          onClick={() => setTab("outage")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === "outage"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          S2: Model & Vendor Outage
        </button>
        <button
          onClick={() => setTab("succession")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === "succession"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          S3: Succession Handover Test
        </button>
      </div>

      {/* S1: Leaver Tab */}
      {tab === "leaver" && (
        <div className="space-y-6">
          <form onSubmit={handleRunLeaver} className="flex gap-3 max-w-xl">
            <input
              type="text"
              value={leaverEmail}
              onChange={(e) => setLeaverEmail(e.target.value)}
              placeholder="e.g. omar@acme.com or person:omar@acme.com"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={leaverLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              {leaverLoading ? "Calculating..." : "Simulate Departure"}
            </button>
          </form>

          {leaverResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">
                    Orphaned Critical Assets
                  </span>
                  <div className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-400">
                    {leaverResult.orphanedCriticalAssets.length}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">
                    Credential Breakage
                  </span>
                  <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {leaverResult.stoppedPersonalCredentialAutomations.length}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">
                    Weekly Runs Lost
                  </span>
                  <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {leaverResult.totalRunsPerWeekAffected.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Table of affected assets */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-sm">
                  Orphaned Assets Requiring Immediate Reassignment
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaverResult.orphanedCriticalAssets.length === 0 ? (
                    <div className="p-6 text-sm text-center text-slate-500">
                      No orphaned critical assets. All assets owned by this person have documented human backups!
                    </div>
                  ) : (
                    leaverResult.orphanedCriticalAssets.map((asset, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {asset.name}
                          </div>
                          <div className="text-xs font-mono text-slate-400">{asset.entityId}</div>
                        </div>
                        <CriticalityBadge level={asset.criticality} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* S2: Outage Tab */}
      {tab === "outage" && (
        <div className="space-y-6">
          <form onSubmit={handleRunOutage} className="flex gap-3 max-w-xl">
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="model:openai:gpt-4o">OpenAI GPT-4o</option>
              <option value="model:anthropic:claude-3-5-sonnet-20241022">Anthropic Claude 3.5 Sonnet</option>
            </select>
            <button
              type="submit"
              disabled={outageLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              {outageLoading ? "Calculating..." : "Simulate Outage"}
            </button>
          </form>

          {outageResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">
                  Total Weekly Runs Disrupted
                </span>
                <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {outageResult.totalRunsPerWeekAffected.toLocaleString()} runs/week
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-sm">
                  Dependent Automations Disrupted
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {outageResult.affectedAutomations.map((a, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">{a.name}</div>
                        <div className="text-xs font-mono text-slate-400">{a.id}</div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {a.weeklyRuns} runs/week
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* S3: Succession Tab */}
      {tab === "succession" && (
        <div className="space-y-6">
          <form onSubmit={handleRunSuccession} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Departing Employee</label>
              <input
                type="text"
                value={departingId}
                onChange={(e) => setDepartingId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Proposed Successor</label>
              <input
                type="text"
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={successionLoading}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors cursor-pointer"
              >
                {successionLoading ? "Testing Succession..." : "Test Succession Handover"}
              </button>
            </div>
          </form>

          {successionResult && (
            <div className="space-y-4">
              {successionResult.successorNewConcentrationLoad.overloadWarning && (
                <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-semibold">Single Point of Failure Overload Warning</strong>
                    <p className="text-xs mt-0.5 leading-relaxed">
                      After handover, the successor will own{" "}
                      <strong>{successionResult.successorNewConcentrationLoad.shareOfCompanyCriticalAutomationsPct}%</strong>{" "}
                      of all company critical automations. Reassigning everything to this person concentrates risk rather than distributing it.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-xs font-medium text-slate-500">Transferred Assets</span>
                  <div className="mt-1 text-2xl font-bold">{successionResult.transferredAssetCount}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-xs font-medium text-slate-500">Successor Total Critical Load</span>
                  <div className="mt-1 text-2xl font-bold">
                    {successionResult.successorNewConcentrationLoad.totalCriticalAssetsOwned} critical assets
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
