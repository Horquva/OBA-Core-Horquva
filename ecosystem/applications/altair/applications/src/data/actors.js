/**
 * Mock actor directory. In a real integration this would come from an
 * identity/directory service (e.g. an org's SSO or HR system) rather than
 * being hard-coded — kept here as the single source of "who" for seed data.
 */
export const ACTORS = {
  you: { id: "u-priya", name: "Priya Natarajan", role: "Staff Engineer", team: "Platform" },
  jordan: { id: "u-jordan", name: "Jordan Ackerman", role: "Eng Manager", team: "Platform" },
  wei: { id: "u-wei", name: "Wei Chen", role: "Release Manager", team: "Release Engineering" },
  sam: { id: "u-sam", name: "Sam Okafor", role: "Security Lead", team: "AppSec" },
  lena: { id: "u-lena", name: "Lena Kovac", role: "SRE", team: "Infrastructure" },
  system: { id: "sys-altair", name: "Altair", role: "System", team: "Automation" },
};
