import { BellOff } from "lucide-react";

export default function NotificationEmpty() {
  return (
    <div className="card flex flex-col items-center justify-center py-20">

      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-hover)]">
        <BellOff className="h-8 w-8 text-[var(--text-tertiary)]" />
      </div>

      <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
        No Notifications
      </h3>

      <p className="mt-2 max-w-md text-center text-[var(--text-secondary)]">
        Everything looks healthy. No escalations or automated detections
        require your attention.
      </p>

    </div>
  );
}