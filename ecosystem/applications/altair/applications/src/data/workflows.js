import { ACTORS } from "./actors.js";

/**
 * Governed workflow definitions (the "catalog"). Each entry describes
 * identity, trigger, inputs, approval requirements, and the ordered step
 * list used to derive the pipeline visualization (see domain/pipeline.js).
 *
 * This is static configuration data — in a real system it would be served
 * by a workflow-registry API rather than bundled with the frontend.
 */
export const WORKFLOWS = [
  {
    id: "wf-promote-rc",
    name: "Promote Release Candidate",
    category: "project_ops",
    description:
      "Promotes a validated release candidate build to the production channel and updates deployment manifests across affected services.",
    owner: ACTORS.wei,
    version: "3.4.0",
    availability: "available",
    trigger: {
      type: "Manual",
      source: "Release console / CI tag",
      preconditions: [
        "Release candidate has passed the full CI gate",
        "No open Sev-1/Sev-2 incidents on affected services",
        "Changelog has been generated for the release",
      ],
    },
    inputs: {
      required: [
        { name: "release_tag", type: "string", desc: "Git tag of the validated release candidate" },
        { name: "target_environment", type: "enum", desc: "production | production-eu" },
      ],
      optional: [{ name: "rollout_percentage", type: "number", desc: "Canary rollout percentage (default 100)" }],
    },
    approval: { required: true, approverRole: "Release Manager", protected: true },
    steps: [
      { id: "s1", name: "Validate build artifacts", phase: "processing" },
      { id: "s2", name: "Diff deployment manifest", phase: "processing" },
      { id: "s3", name: "Notify affected service owners", phase: "processing" },
      { id: "s4", name: "Deploy to production", phase: "execution" },
      { id: "s5", name: "Run smoke tests", phase: "execution" },
    ],
  },
  {
    id: "wf-repo-access",
    name: "Provision Repository Access",
    category: "repo_mgmt",
    description:
      "Grants a scoped, time-bounded write access role to a requested repository after ownership confirms the request.",
    owner: ACTORS.jordan,
    version: "1.9.2",
    availability: "available",
    trigger: {
      type: "Self-service request",
      source: "Developer portal",
      preconditions: ["Requester has an active engineering identity", "Repository is not archived"],
    },
    inputs: {
      required: [
        { name: "repository", type: "string", desc: "Target repository (org/repo)" },
        { name: "access_level", type: "enum", desc: "read | write | maintain" },
      ],
      optional: [{ name: "expires_in_days", type: "number", desc: "Access expiry window (default 30)" }],
    },
    approval: { required: true, approverRole: "Repository Owner", protected: false },
    steps: [
      { id: "s1", name: "Validate requester identity", phase: "processing" },
      { id: "s2", name: "Check repository policy", phase: "processing" },
      { id: "s3", name: "Grant access role", phase: "execution" },
      { id: "s4", name: "Schedule expiry revocation", phase: "execution" },
    ],
  },
  {
    id: "wf-archive-repo",
    name: "Archive Deprecated Repository",
    category: "repo_mgmt",
    description:
      "Archives a repository flagged as deprecated: disables writes, snapshots CI config, and notifies remaining contributors.",
    owner: ACTORS.jordan,
    version: "2.1.0",
    availability: "available",
    trigger: {
      type: "Manual",
      source: "Repository admin console",
      preconditions: ["Repository has had zero commits in 180 days", "No active deployment depends on the repository"],
    },
    inputs: {
      required: [{ name: "repository", type: "string", desc: "Target repository (org/repo)" }],
      optional: [{ name: "archive_reason", type: "string", desc: "Free-text justification" }],
    },
    approval: { required: true, approverRole: "Engineering Manager", protected: true },
    steps: [
      { id: "s1", name: "Verify inactivity window", phase: "processing" },
      { id: "s2", name: "Snapshot CI configuration", phase: "processing" },
      { id: "s3", name: "Archive repository", phase: "execution" },
      { id: "s4", name: "Notify contributors", phase: "execution" },
    ],
  },
  {
    id: "wf-publish-docs",
    name: "Publish API Documentation",
    category: "documentation",
    description:
      "Builds and publishes the latest API reference documentation from source annotations to the public docs site.",
    owner: ACTORS.lena,
    version: "4.0.1",
    availability: "available",
    trigger: {
      type: "Event",
      source: "Merge to main on docs-source",
      preconditions: ["Docs build passes linting", "No broken internal links"],
    },
    inputs: {
      required: [{ name: "source_ref", type: "string", desc: "Commit or tag to build from" }],
      optional: [],
    },
    approval: { required: false, approverRole: null, protected: false },
    steps: [
      { id: "s1", name: "Build documentation site", phase: "processing" },
      { id: "s2", name: "Validate internal links", phase: "processing" },
      { id: "s3", name: "Publish to docs CDN", phase: "execution" },
    ],
  },
  {
    id: "wf-deprecate-endpoint",
    name: "Deprecate Public API Endpoint",
    category: "documentation",
    description:
      "Marks a public API endpoint as deprecated, updates documentation with a sunset date, and notifies registered API consumers.",
    owner: ACTORS.sam,
    version: "1.3.0",
    availability: "available",
    trigger: {
      type: "Manual",
      source: "API governance console",
      preconditions: ["Replacement endpoint is documented", "Sunset date is at least 90 days out"],
    },
    inputs: {
      required: [
        { name: "endpoint", type: "string", desc: "Endpoint path, e.g. /v1/legacy-search" },
        { name: "sunset_date", type: "date", desc: "Date the endpoint stops serving traffic" },
      ],
      optional: [{ name: "replacement_endpoint", type: "string", desc: "Recommended replacement" }],
    },
    approval: { required: true, approverRole: "API Governance Lead", protected: true },
    steps: [
      { id: "s1", name: "Validate sunset window", phase: "processing" },
      { id: "s2", name: "Update documentation", phase: "execution" },
      { id: "s3", name: "Notify registered consumers", phase: "execution" },
    ],
  },
  {
    id: "wf-rotate-creds",
    name: "Rotate Service Credentials",
    category: "approvals",
    description:
      "Rotates a service's production credentials, updates the secret store, and performs a staged restart of dependent services.",
    owner: ACTORS.sam,
    version: "2.6.3",
    availability: "available",
    trigger: {
      type: "Scheduled / Manual",
      source: "Security console",
      preconditions: ["Secret store is reachable", "No deployment freeze is active"],
    },
    inputs: {
      required: [{ name: "service", type: "string", desc: "Target service identifier" }],
      optional: [],
    },
    approval: { required: true, approverRole: "Security Lead", protected: true },
    steps: [
      { id: "s1", name: "Generate new credential", phase: "processing" },
      { id: "s2", name: "Write to secret store", phase: "execution" },
      { id: "s3", name: "Restage dependent services", phase: "execution" },
      { id: "s4", name: "Revoke previous credential", phase: "execution" },
    ],
  },
  {
    id: "wf-close-stale",
    name: "Close Stale Sprint Issues",
    category: "sprint_ops",
    description:
      "Identifies issues untouched for the configured window within a sprint board and closes them with an explanatory comment.",
    owner: ACTORS.you,
    version: "1.4.0",
    availability: "available",
    trigger: { type: "Scheduled", source: "Weekly sprint hygiene job", preconditions: ["Sprint board is active"] },
    inputs: {
      required: [{ name: "board", type: "string", desc: "Sprint board identifier" }],
      optional: [{ name: "stale_after_days", type: "number", desc: "Inactivity window (default 21)" }],
    },
    approval: { required: false, approverRole: null, protected: false },
    steps: [
      { id: "s1", name: "Scan board for stale issues", phase: "processing" },
      { id: "s2", name: "Post explanatory comment", phase: "execution" },
      { id: "s3", name: "Close issues", phase: "execution" },
    ],
  },
  {
    id: "wf-sprint-retro",
    name: "Generate Sprint Retrospective Report",
    category: "sprint_ops",
    description:
      "Compiles velocity, carry-over, and incident data for the closed sprint into a structured retrospective report.",
    owner: ACTORS.jordan,
    version: "1.1.0",
    availability: "available",
    trigger: { type: "Event", source: "Sprint close", preconditions: ["Sprint has been marked closed"] },
    inputs: { required: [{ name: "sprint_id", type: "string", desc: "Closed sprint identifier" }], optional: [] },
    approval: { required: false, approverRole: null, protected: false },
    steps: [
      { id: "s1", name: "Aggregate sprint metrics", phase: "processing" },
      { id: "s2", name: "Render report", phase: "execution" },
      { id: "s3", name: "Publish to team space", phase: "execution" },
    ],
  },
  {
    id: "wf-escalate-bug",
    name: "Escalate Critical Bug",
    category: "issue_mgmt",
    description:
      "Escalates a critical bug to the owning team's on-call, opens an incident channel, and applies the escalation label.",
    owner: ACTORS.lena,
    version: "2.0.0",
    availability: "available",
    trigger: { type: "Manual", source: "Issue tracker", preconditions: ["Issue is labeled severity:critical"] },
    inputs: { required: [{ name: "issue_id", type: "string", desc: "Issue tracker identifier" }], optional: [] },
    approval: { required: false, approverRole: null, protected: false },
    steps: [
      { id: "s1", name: "Identify owning on-call", phase: "processing" },
      { id: "s2", name: "Open incident channel", phase: "execution" },
      { id: "s3", name: "Apply escalation label", phase: "execution" },
    ],
  },
  {
    id: "wf-db-access",
    name: "Request Production Database Access",
    category: "eng_requests",
    description:
      "Requests temporary, audited read access to a production database for incident investigation or migration support.",
    owner: ACTORS.sam,
    version: "1.7.0",
    availability: "available",
    trigger: { type: "Self-service request", source: "Developer portal", preconditions: ["Requester has completed data-handling training"] },
    inputs: {
      required: [
        { name: "database", type: "string", desc: "Target production database" },
        { name: "justification", type: "string", desc: "Reason for access" },
      ],
      optional: [{ name: "duration_hours", type: "number", desc: "Access window (default 4)" }],
    },
    approval: { required: true, approverRole: "Security Lead", protected: true },
    steps: [
      { id: "s1", name: "Validate training compliance", phase: "processing" },
      { id: "s2", name: "Grant scoped read access", phase: "execution" },
      { id: "s3", name: "Schedule automatic revocation", phase: "execution" },
    ],
  },
  {
    id: "wf-broadcast-incident",
    name: "Broadcast Incident Notification",
    category: "notifications",
    description:
      "Sends a structured incident notification to affected team channels and the status page subscriber list.",
    owner: ACTORS.lena,
    version: "1.2.1",
    availability: "available",
    trigger: { type: "Manual", source: "Incident console", preconditions: ["Incident has an assigned severity"] },
    inputs: {
      required: [
        { name: "incident_id", type: "string", desc: "Incident tracker identifier" },
        { name: "message", type: "string", desc: "Notification body" },
      ],
      optional: [],
    },
    approval: { required: false, approverRole: null, protected: false },
    steps: [
      { id: "s1", name: "Resolve affected channels", phase: "processing" },
      { id: "s2", name: "Publish to status page", phase: "execution" },
      { id: "s3", name: "Notify team channels", phase: "execution" },
    ],
  },
  {
    id: "wf-oncall-sync",
    name: "Sync On-call Schedule",
    category: "coordination",
    description:
      "Synchronizes the on-call rotation from the scheduling source of truth into paging and chat integrations.",
    owner: ACTORS.jordan,
    version: "1.0.4",
    availability: "restricted",
    trigger: { type: "Scheduled", source: "Nightly sync job", preconditions: ["Schedule source is reachable"] },
    inputs: { required: [{ name: "team", type: "string", desc: "Team identifier" }], optional: [] },
    approval: { required: true, approverRole: "Coordination Admin", protected: false },
    steps: [
      { id: "s1", name: "Fetch rotation source", phase: "processing" },
      { id: "s2", name: "Update paging integration", phase: "execution" },
      { id: "s3", name: "Post schedule to team channel", phase: "execution" },
    ],
  },
];

/** Fast lookup by workflow id, used throughout the app instead of re-scanning the array. */
export const WF = Object.fromEntries(WORKFLOWS.map((w) => [w.id, w]));
