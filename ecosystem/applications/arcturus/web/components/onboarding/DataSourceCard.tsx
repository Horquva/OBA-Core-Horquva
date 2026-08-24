"use client";

import {
  FolderGit2,
  MessageSquare,
  NotebookText,
  BriefcaseBusiness,
  CheckCircle2,
  Link2,
} from "lucide-react";

import { DataSource } from "@/types/onboarding";

interface DataSourceCardProps {
  source: DataSource;
  onConnect: (id: string) => void;
}

export default function DataSourceCard({
  source,
  onConnect,
}: DataSourceCardProps) {
  const getIcon = () => {
    switch (source.icon) {
      case "github":
        return <FolderGit2 className="h-7 w-7 text-white" />;

      case "slack":
        return <MessageSquare className="h-7 w-7 text-cyan-400" />;

      case "jira":
        return <BriefcaseBusiness className="h-7 w-7 text-orange-400" />;

      case "notion":
        return <NotebookText className="h-7 w-7 text-emerald-400" />;

      default:
        return <Link2 className="h-7 w-7 text-gray-400" />;
    }
  };

  return (
    <div
      className="
      rounded-xl
      border
      border-white/10
      bg-white/3
      p-6
      transition-all
      duration-300
      hover:border-cyan-500/30
      hover:bg-white/5
      hover:shadow-[0_0_25px_rgba(34,211,238,0.08)]
    "
    >
      {/* Top */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/20">
            {getIcon()}
          </div>

          <div>

            <h3 className="text-lg font-semibold">
              {source.name}
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              {source.description}
            </p>

          </div>

        </div>

      </div>

      {/* Status */}

      <div className="mt-6 flex items-center justify-between">

        {source.connected ? (
          <div className="flex items-center gap-2 text-emerald-400">

            <CheckCircle2 className="h-5 w-5" />

            <span className="text-sm font-medium">
              Connected
            </span>

          </div>
        ) : (
          <span className="text-sm text-gray-400">
            Ready to Connect
          </span>
        )}

        <button
          onClick={() => onConnect(source.id)}
          className={`rounded-lg px-4 py-2 text-sm transition
          ${
            source.connected
              ? "bg-emerald-500/10 text-emerald-400 cursor-default"
              : "border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
          }`}
        >
          {source.connected ? "Connected" : "Connect"}
        </button>

      </div>

    </div>
  );
}