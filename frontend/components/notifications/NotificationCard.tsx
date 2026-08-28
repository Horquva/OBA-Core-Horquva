"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCheck } from "lucide-react";
import { NotificationItem } from "@/types/notification";
import { RiskBadge } from "@/components/ui/RiskBadge";

interface NotificationCardProps {
  notification: NotificationItem;
}

export default function NotificationCard({
  notification,
}: NotificationCardProps) {
  return (
    <div
      className="
        group
        rounded-xl
        border
        border-[var(--border-subtle)]
        bg-[var(--bg-elevated)]
        p-5
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[var(--accent-border)]
        hover:bg-[var(--bg-hover)]
        hover:shadow-[0_0_25px_rgba(99,102,241,0.08)]
      "
    >
      {/* Top */}

      <div className="flex items-start justify-between gap-4">

        <div className="space-y-3">

          <div className="flex items-center gap-3">

            <RiskBadge
              level={notification.severity}
              variant="pill"
            />

            <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-dim)] px-3 py-1 text-xs font-medium text-[var(--accent)] transition group-hover:border-[var(--accent-border)]">
              {notification.source}
            </span>

          </div>

          <div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {notification.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {notification.description}
            </p>

          </div>

        </div>

        <span className="text-xs whitespace-nowrap text-[var(--text-tertiary)]">
          {notification.time}
        </span>

      </div>

      {/* Footer */}

      <div className="mt-6 flex items-center justify-between">

        <button
          disabled={notification.acknowledged}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition
          ${notification.acknowledged
              ? "cursor-default border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
            }`}
        >
          <CheckCheck size={16} />

          {notification.acknowledged
            ? "Acknowledged"
            : "Acknowledge"}
        </button>

        <Link
          href={notification.link}
          className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:opacity-80"
        >
          Go to {notification.moduleLabel}

          <ArrowUpRight size={16} />
        </Link>

      </div>

    </div>
  );
}