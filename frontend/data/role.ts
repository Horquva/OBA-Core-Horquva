import { Role } from "@/types/onboarding";

export const roles: Role[] = [
  {
    id: "executive",
    title: "Executive",
    description:
      "View organizational health, strategic insights and AI recommendations.",
    icon: "executive",
  },

  {
    id: "department",
    title: "Department Head",
    description:
      "Monitor ownership, workflows, KPIs and department performance.",
    icon: "department",
  },

  {
    id: "analyst",
    title: "Analyst",
    description:
      "Investigate risks, incidents, workflow data and operational metrics.",
    icon: "analyst",
  },
];