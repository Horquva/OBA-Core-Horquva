import { Boxes, Github, BookOpen, ShieldCheck, ListTree, AlertOctagon, Send, Radio, Users } from "lucide-react";

export const CATEGORIES = {
  project_ops: "Project Operations",
  repo_mgmt: "Repository Management",
  documentation: "Documentation",
  approvals: "Engineering Approvals",
  sprint_ops: "Sprint Operations",
  issue_mgmt: "Issue Management",
  eng_requests: "Engineering Requests",
  notifications: "Notifications",
  coordination: "Engineering Coordination",
};

export const CATEGORY_ICON = {
  project_ops: Boxes,
  repo_mgmt: Github,
  documentation: BookOpen,
  approvals: ShieldCheck,
  sprint_ops: ListTree,
  issue_mgmt: AlertOctagon,
  eng_requests: Send,
  notifications: Radio,
  coordination: Users,
};
