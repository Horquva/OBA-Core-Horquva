import { DataSource } from "@/types/onboarding";

export const dataSources: DataSource[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Repositories & source code",
    icon: "github",
    connected: false,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication",
    icon: "slack",
    connected: false,
  },
  {
    id: "jira",
    name: "Jira",
    description: "Projects & issues",
    icon: "jira",
    connected: false,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Knowledge base",
    icon: "notion",
    connected: false,
  },
];
