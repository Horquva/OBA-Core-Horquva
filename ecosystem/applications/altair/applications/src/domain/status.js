import { Circle, Play, Loader2, Clock, CheckCheck, XCircle, CheckCircle2, AlertTriangle, RotateCcw, Info } from "lucide-react";

/**
 * Execution-instance state machine.
 *
 *   queued -> initiated -> processing -> [pending_approval -> approved|rejected] -> executing -> completed|failed
 *   failed -> retrying -> executing
 *
 * A single `status` enum drives every view — avoid re-introducing booleans
 * like isRunning/isFailed/isApproved elsewhere in the app.
 */
export const STATUS = {
  queued: "queued",
  initiated: "initiated",
  processing: "processing",
  pending_approval: "pending_approval",
  approved: "approved",
  rejected: "rejected",
  executing: "executing",
  completed: "completed",
  failed: "failed",
  retrying: "retrying",
  timed_out: "timed_out",
  cancelled: "cancelled",
};

export const STATUS_META = {
  queued: { label: "Queued", tone: "muted", icon: Circle, terminal: false },
  initiated: { label: "Initiated", tone: "blue", icon: Play, terminal: false },
  processing: { label: "Processing", tone: "blue", icon: Loader2, terminal: false, spin: true },
  pending_approval: { label: "Pending approval", tone: "purple", icon: Clock, terminal: false },
  approved: { label: "Approved", tone: "purple", icon: CheckCheck, terminal: false },
  rejected: { label: "Rejected", tone: "red", icon: XCircle, terminal: true },
  executing: { label: "Executing", tone: "blue", icon: Loader2, terminal: false, spin: true },
  completed: { label: "Completed", tone: "green", icon: CheckCircle2, terminal: true },
  failed: { label: "Failed", tone: "red", icon: AlertTriangle, terminal: true },
  retrying: { label: "Retrying", tone: "amber", icon: RotateCcw, terminal: false },
  timed_out: { label: "Timed out", tone: "red", icon: AlertTriangle, terminal: true },
  cancelled: { label: "Cancelled", tone: "muted", icon: XCircle, terminal: true },
};

/** Safe lookup — unknown/future statuses render as a neutral "Unknown" badge instead of crashing. */
export function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Unknown", tone: "muted", icon: Info, terminal: false };
}

export function isTerminal(status) {
  return !!statusMeta(status).terminal;
}

export function isActive(status) {
  return [STATUS.queued, STATUS.initiated, STATUS.processing, STATUS.executing, STATUS.retrying].includes(status);
}
