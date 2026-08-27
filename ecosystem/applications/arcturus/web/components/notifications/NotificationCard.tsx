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
        border-white/10
        bg-white/3
        p-5
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-cyan-500/30
        hover:bg-white/5
        hover:shadow-[0_0_25px_rgba(34,211,238,0.08)]
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

            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 transition group-hover:border-cyan-400/30">
              {notification.source}
            </span>

          </div>

          <div>

            <h3 className="text-lg font-semibold">
              {notification.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              {notification.description}
            </p>

          </div>

        </div>

        <span className="text-xs whitespace-nowrap text-gray-500">
          {notification.time}
        </span>

      </div>

      {/* Footer */}

      <div className="mt-6 flex items-center justify-between">

        <button
          disabled={notification.acknowledged}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition
          ${
            notification.acknowledged
              ? "cursor-default border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/10"
          }`}
        >
          <CheckCheck size={16} />

          {notification.acknowledged
            ? "Acknowledged"
            : "Acknowledge"}
        </button>

        <Link
          href={notification.link}
          className="flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
        >
          Go to {notification.moduleLabel}

          <ArrowUpRight size={16} />
        </Link>

      </div>

    </div>
  );
}