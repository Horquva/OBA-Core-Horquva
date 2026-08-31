export type NotificationSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type NotificationSource =
  | "Avatar"
  | "Governance"
  | "Self Healing"
  | "Continuity";

export type NotificationGroup =
  | "Today"
  | "Yesterday"
  | "Earlier";

export interface NotificationItem {
  id: string;

  title: string;

  description: string;

  severity: NotificationSeverity;

  source: NotificationSource;

  group: NotificationGroup;

  time: string;

  acknowledged: boolean;

  // Deep link
  link: string;

  // Display name for destination
  moduleLabel: string;
}