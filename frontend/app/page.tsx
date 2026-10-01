"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";
import { fetchOverview } from "@/lib/api";
import { HeadlineMetrics, CheckResult } from "@horquva/types";
import { CheckStatusBadge } from "@/components/ui/Badges";

const fallbackMetrics: HeadlineMetrics = {
  totalCriticalAssets: 4,
  fullyCoveredCriticalAssets: 1,
  exposedCriticalAssets: 3,
  unknownCriticalFacts: 2,
  definition:
    "Count of critical & high assets where confirmed backup exists, documentation is verified, and fallback exists.",
};

const fallbackAlerts: CheckResult[] = [
  {
    checkId: "C1_UNBACKED_CRITICAL",
    entityId: "automation:n8n:101",
    status: "FAIL",
    evidenceFactIds: [],
    reason: "Critical asset 'Billing Sync to Stripe' has 0 backups assigned.",
  },
  {
    checkId: "C2_DEPARTED_OWNER",
    entityId: "automation:n8n:104",
    status: "FAIL",
    evidenceFactIds: [],
    reason: "Active asset is owned by departed person: Sarah Connor.",
  },
];

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<HeadlineMetrics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const data = await fetchOverview();
      setMetrics(data.metrics);
      setActiveAlerts(data.activeAlerts);
    } catch {
      setMetrics(fallbackMetrics);
      setActiveAlerts(fallbackAlerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchOverview()
      .then((data) => {
        if (active) {
          setMetrics(data.metrics);
          setActiveAlerts(data.activeAlerts);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setMetrics(fallbackMetrics);
          setActiveAlerts(fallbackAlerts);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operational Continuity Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time status of critical automations, human backups, and single points of failure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Launch Attestation</span>
          </Link>
        </div>
      </div>

      {/* Headline Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Critical Assets</span>
            <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {metrics?.totalCriticalAssets ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Core operational processes</p>
        </div>

        <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Fully Protected</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
            {metrics?.fullyCoveredCriticalAssets ?? 0}
          </div>
          <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/70">
            Has confirmed backup, runbook & fallback
          </p>
        </div>

        <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <span>Exposed Assets</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-700 dark:text-rose-400">
            {metrics?.exposedCriticalAssets ?? 0}
          </div>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/70">
            Lacks human backup, docs, or fallback
          </p>
        </div>

        <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Unconfirmed Facts</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-700 dark:text-amber-400">
            {metrics?.unknownCriticalFacts ?? 0}
          </div>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/70">
            Pending owner review in campaign
          </p>
        </div>
      </div>

      {/* Active Continuity Alerts Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Active Continuity Alerts</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                {activeAlerts.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic rule violations requiring immediate owner assignment or documentation.
            </p>
          </div>
          <Link
            href="/simulation"
            className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1"
          >
            <span>Run Leaver Simulation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {activeAlerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No active continuity alerts detected. All critical assets meet minimum protection requirements.
            </div>
          ) : (
            activeAlerts.map((alert, idx) => (
              <div key={idx} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckStatusBadge status={alert.status} />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {alert.checkId}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {alert.entityId}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{alert.reason}</p>
                </div>
                <Link
                  href={`/simulation?target=${encodeURIComponent(alert.entityId)}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Simulate Blast Radius</span>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
