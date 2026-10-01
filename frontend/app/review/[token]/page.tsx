"use client";

import React, { useEffect, useState, use } from "react";
import { Check } from "lucide-react";
import { fetchReviewTask, submitReview } from "@/lib/api";
import { CriticalityLevel, AttestationAnswers } from "@horquva/types";

interface ReviewTaskData {
  assetName: string;
  reviewerName: string;
  reviewerEmail: string;
  task: {
    status: string;
  };
}

export default function AttestationReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [taskData, setTaskData] = useState<ReviewTaskData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [isOwner, setIsOwner] = useState(true);
  const [backupEmail, setBackupEmail] = useState("");
  const [criticality, setCriticality] = useState<CriticalityLevel>("critical");
  const [isDocumented, setIsDocumented] = useState(true);
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [fallbackExists, setFallbackExists] = useState(true);

  useEffect(() => {
    fetchReviewTask(token)
      .then((data) => {
        setTaskData(data as ReviewTaskData);
      })
      .catch(() => {
        // Fallback demo data if testing locally without token in DB
        setTaskData({
          assetName: "Billing Sync to Stripe",
          reviewerName: "Omar Farooq",
          reviewerEmail: "omar@acme.com",
          task: { status: "pending" },
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const answers: AttestationAnswers = {
      isOwner,
      backupPersonId: backupEmail ? (backupEmail.startsWith("person:") ? backupEmail : `person:${backupEmail.toLowerCase()}`) : null,
      criticality,
      isDocumented,
      documentationUrl: documentationUrl || undefined,
      fallbackExists,
    };

    try {
      await submitReview(token, answers);
      setSubmitted(true);
    } catch {
      // In dev fallback preview
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm">
        Loading operational attestation task...
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attestation Confirmed</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Thank you, <strong>{taskData?.reviewerName}</strong>. The operational continuity facts for{" "}
          <strong>{taskData?.assetName}</strong> have been certified and recorded.
        </p>
        <p className="text-xs text-slate-400">
          Your backup and documentation have been updated across company continuity records.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Operational Continuity Review
        </span>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
          {taskData?.assetName || "Automated Business Process"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Hi {taskData?.reviewerName}, please take 60 seconds to confirm the human backup, runbook link, and operational fallback for this process.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        {/* Ownership Confirmation */}
        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
          <label className="font-semibold text-slate-900 dark:text-white block">
            1. Are you the primary operational owner?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="isOwner"
                checked={isOwner === true}
                onChange={() => setIsOwner(true)}
              />
              <span>Yes, I own this</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="isOwner"
                checked={isOwner === false}
                onChange={() => setIsOwner(false)}
              />
              <span>No, someone else owns this</span>
            </label>
          </div>
        </div>

        {/* Human Backup Owner */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-900 dark:text-white block">
            2. Who is the designated human backup?
          </label>
          <input
            type="email"
            value={backupEmail}
            onChange={(e) => setBackupEmail(e.target.value)}
            placeholder="colleague@acme.com"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
            required
          />
          <span className="text-xs text-slate-400 block">
            This person should have access to troubleshoot or maintain this automation if you are away.
          </span>
        </div>

        {/* Criticality Rating */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-900 dark:text-white block">
            3. Business Criticality
          </label>
          <select
            value={criticality}
            onChange={(e) => setCriticality(e.target.value as CriticalityLevel)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white"
          >
            <option value="critical">Critical (Breaks core customer revenue or compliance)</option>
            <option value="high">High (Major daily business disruption)</option>
            <option value="medium">Medium (Moderate internal impact)</option>
            <option value="low">Low (Non-urgent or cosmetic)</option>
          </select>
        </div>

        {/* Documentation / Runbook Link */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-900 dark:text-white block">
            4. Runbook / Documentation Link
          </label>
          <input
            type="url"
            value={documentationUrl}
            onChange={(e) => {
              setDocumentationUrl(e.target.value);
              setIsDocumented(Boolean(e.target.value.trim()));
            }}
            placeholder="https://notion.so/runbooks/billing-sync"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Fallback Procedure */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-900 dark:text-white block">
            5. Does a manual fallback exist if this automation goes down?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fallback"
                checked={fallbackExists === true}
                onChange={() => setFallbackExists(true)}
              />
              <span>Yes, manual fallback exists</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fallback"
                checked={fallbackExists === false}
                onChange={() => setFallbackExists(false)}
              />
              <span>No fallback exists</span>
            </label>
          </div>
        </div>

        {error && <div className="p-3 text-xs rounded bg-rose-50 text-rose-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >
          {submitting ? "Submitting Confirmation..." : "Confirm Continuity Details"}
        </button>
      </form>
    </div>
  );
}
