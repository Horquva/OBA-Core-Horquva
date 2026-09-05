/** Relative time label, e.g. "3h ago". Used across rows, tables, and notifications. */
export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Absolute, locale-aware timestamp label, e.g. "Aug 20, 09:35 AM". */
export function fmtTime(iso) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
