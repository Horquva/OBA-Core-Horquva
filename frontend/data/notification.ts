import { NotificationItem } from "@/types/notification";

export const notifications: NotificationItem[] = [
  {
    id: "1",
    title: "Workflow Escalated",
    description:
      "Workflow WF-001 requires executive review because policy validation failed.",

    severity: "critical",
    source: "Avatar",

    group: "Today",
    time: "2 min ago",

    acknowledged: false,

    link: "/avatar",
    moduleLabel: "Avatar",
  },

  {
    id: "2",
    title: "Self-Healing Triggered",
    description:
      "The automation engine restarted Workflow WF-008 after detecting a temporary failure.",

    severity: "medium",
    source: "Self Healing",

    group: "Today",
    time: "15 min ago",

    acknowledged: false,

    link: "/self-healing",
   
    moduleLabel: "Self-Healing",
  },

  {
    id: "3",
    title: "Governance Alert",
    description:
      "A policy conflict has been detected in the Finance approval workflow.",

    severity: "high",
    source: "Governance",

    group: "Yesterday",
    time: "Yesterday · 5:40 PM",

    acknowledged: true,

    link: "/governance",
    moduleLabel: "Governance",
  },

  {
    id: "4",
    title: "Backup Owner Assigned",
    description:
      "A backup owner has been assigned to Agent A-14 to improve continuity coverage.",

    severity: "low",
    source: "Continuity",

    group: "Earlier",
    time: "2 days ago",

    acknowledged: true,

    link: "/continuity",
    moduleLabel: "Continuity",
  },
];