import { Bell } from "lucide-react";

interface NotificationHeaderProps {
  total: number;
}

export default function NotificationHeader({
  total,
}: NotificationHeaderProps) {
  return (
    <div className="card flex items-center justify-between p-8">

      {/* Left */}

      <div className="flex items-center gap-5">

        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Bell className="h-7 w-7 text-cyan-400" />
        </div>

        <div>
          <h1 className="text-3xl font-semibold">
            Notification Center
          </h1>

          <p className="mt-1 text-gray-400">
            Unified inbox for alerts, escalations and automated detections.
          </p>
        </div>

      </div>

      {/* Right */}

      <div className="flex flex-col items-end gap-2">

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">

          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

          Live Feed

        </div>

        <span className="text-sm text-gray-500">

          {total} Active Alerts

        </span>

      </div>

    </div>
  );
}