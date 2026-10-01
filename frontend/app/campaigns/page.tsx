"use client";

import React, { useEffect, useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { fetchCampaigns, createCampaign } from "@/lib/api";

interface CampaignItem {
  id: string;
  name: string;
  status: string;
  due_date: string;
  total_tasks: number | string;
  completed_tasks: number | string;
}

const fallbackCampaigns: CampaignItem[] = [
  {
    id: "camp-001",
    name: "Q3 Access & Continuity Attestation",
    status: "completed",
    due_date: "2026-09-30T00:00:00Z",
    total_tasks: 12,
    completed_tasks: 12,
  },
  {
    id: "camp-002",
    name: "Core Automations Backup Review",
    status: "active",
    due_date: "2026-10-15T00:00:00Z",
    total_tasks: 8,
    completed_tasks: 5,
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("Q4 Operational Continuity Review");
  const [dueDate, setDueDate] = useState("2026-10-15");

  useEffect(() => {
    let active = true;
    fetchCampaigns()
      .then((data) => {
        if (active) {
          setCampaigns(data.campaigns as CampaignItem[]);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setCampaigns(fallbackCampaigns);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCampaign(name, new Date(dueDate), [
        { reviewerPersonId: "person:omar@acme.com", assetEntityId: "automation:n8n:101" },
        { reviewerPersonId: "person:omar@acme.com", assetEntityId: "automation:n8n:102" },
      ]);
      setIsCreating(false);
      const res = await fetchCampaigns();
      setCampaigns(res.campaigns as CampaignItem[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert("Failed to create campaign: " + msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Confirmation Campaigns
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access-review style confirmation campaigns requesting asset owners to verify human backups, runbooks, and fallbacks.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading campaigns...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((camp) => {
            const total = Number(camp.total_tasks || 0);
            const completed = Number(camp.completed_tasks || 0);
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isDone = camp.status === "completed" || pct === 100;

            return (
              <div
                key={camp.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4"
              >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 dark:text-white">{camp.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due {new Date(camp.due_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    isDone
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                  }`}
                >
                  {camp.status}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Progress ({completed} of {total} attested)</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDone ? "bg-emerald-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create Confirmation Campaign</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 cursor-pointer"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
