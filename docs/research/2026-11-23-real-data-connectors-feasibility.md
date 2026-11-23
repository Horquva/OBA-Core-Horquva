# Real platform connectors for the MVP: architecture, feasibility and plan

Date: 23 November 2026
Branch inspected: `mvp/v1-continuity` at `6c14fcab`
Status: research and proposal. Nothing has been built yet. Section 14 lists the questions that must be answered before implementation starts, each with suggested answers. Sections 10–13 cross-check the findings against the test-org materials, audit how trustworthy the pipeline is, look at scaling, and assess whether the work is worth it.

## 1. Purpose

The MVP must stop relying on fabricated data. Every person, asset, owner and dependency it shows should come from a real platform, read through a real connector. The first real organization is the "Horquva on Horquva" test org. It is provisioned across the platforms named in `horquva-on-horquva-credentials.xlsx` and in the Person 15 execution plan.

This document covers:

- what in the MVP depends on fabricated data today
- what each platform's API actually offers, according to its official documentation
- how each platform's data maps onto our canonical model
- the ingestion pipeline
- a feasibility rating per platform
- the implementation order
- risks
- how we will check that real data arrived

### 1.1 Goals

- Every platform listed in the credentials sheet and the plan is assessed against official documentation.
- Each platform gets a rating: feasible, feasible with limitations, high risk, or not feasible.
- The ingestion design reuses the connector SDK we already have, unless the SDK is the wrong fit.
- When an integration fails, the real error reaches the UI and the sync record. Nothing is substituted for it.

### 1.2 Non-goals

- Writing connector code. That waits for the answers in section 14.
- Outbound actions, such as posting alerts to Slack. The current connectors are read-only by design. Sending alerts is a separate decision (section 14, Q7).
- The test-org accounts used only to provision infrastructure (Outlook, Gmail, Docker, ngrok, Supabase). They hold no organizational data the product analyses. Section 4.9 explains this.

### 1.3 Anti-goals

The work counts as failed, even if it technically runs, if any of these happen:

- A failed sync shows anything other than the true error and the data from the last good sync.
- Data that looks real but came from a fixture, a seed or a default reaches a screen in a deployment that claims to be live.
- An identity is linked across platforms on a guess, such as matching two accounts on display name alone, and is shown as fact.

## 2. Existing architecture

### 2.1 How data flows today

```
Settings → Connections (UI)
   │  POST /api/connections            routes/settings.ts
   ▼
ConnectorRunner.createConnection       connectors/sdk/runner.ts
   │  zod schema per type (CONFIG_SCHEMAS); config encrypted with the
   │  connection id as AAD (security/encryption.ts); stored in connection
   ▼
pg-boss: 'connector-sync-hourly' (0 * * * *) and on-demand 'connector-sync'
   │                                     jobs/scheduler.ts
   ▼
Connector.sync()  → SyncResult { entities, edges, facts, rawPayloads, stats }
   │  every HTTP read goes through ReadOnlyHttpGuard (GET only, host allow-list,
   │  timeout, 429/503 backoff with Retry-After)      connectors/sdk/guard.ts
   ▼
BaseConnector.persistSync()  (one transaction)      connectors/sdk/base.ts
   │  1. raw_payload  — unchanged landing copy, replayable
   │  2. entity       — upsert; directory names win over tool names
   │  3. edge / fact  — SCD Type 2; never replaces a stronger grade
   │                    (confirmed > stated > inferred > unknown)
   │  4. close rows this connection no longer reports — skipped when the
   │     sync had core errors or came back empty
   ▼
post-sync hooks: identity queue for unmatched accounts (identity/syncHook.ts),
leaver/mover suggestions (services/lifecycle/directoryLifecycle.ts),
graph rebuilt in memory from Postgres (DataService)
   ▼
views/*.ts → routes → frontend
```

Supported connector types today: `n8n`, `entra`, `google`, `ai_admin` (OpenAI and Anthropic only), plus a one-off `csv` import. See `runner.ts:32` and `runner.ts:63`.

### 2.2 Data model

Source: `packages/types/src/index.ts` and `backend/db/migrations/001–008`.

- Entity kinds: `person`, `automation`, `credential`, `model`, `vendor`, `group`, `app`, `process`. The `entity.kind` column is `VARCHAR(32)`, so a new kind needs no migration, only type and UI changes.
- Edge types: `owns`, `backs_up`, `depends_on`, `calls_model`, `runs_on_credentials_of`, `member_of`, `reports_to`, `grants_access_to`. `owns` edges also carry an `owner_kind` (`owner`, `key_principal`, `creator`, `sponsor`).
- Facts (SCD2 attributes): `criticality`, `documented`, `fallback_exists`, `status`, `last_used_at`, `expires_at`, `owner_access`, `owner_type`, `credential_expires_at`, `created_by_user`, and cost and usage attributes.
- Evidence grade on every edge and fact: `stated` (read from an authoritative API), `inferred` (heuristic), `confirmed` (attested by a person), `unknown`.
- Entity ids are strings such as `person:<email>` and `automation:n8n:<id>`. A person's id is keyed on email, so every non-directory source must resolve to an email before it can attach to a person.

### 2.3 Dependencies on fabricated data

Found by searching the knowledge graph and grepping `backend/src`, `backend/db` and `frontend/{app,features,lib,components}` for fixture, mock, demo, seed, sample, sandbox, placeholder and the fixture org's domain. Test files are excluded, because fixtures in tests are expected.

| # | Location | What it does | Action |
|---|---|---|---|
| F1 | `backend/src/services/dataService.ts:134–196`, `:286` (`initDefaultState`) | When `DATABASE_URL` is unset, the backend serves an in-memory org built from `tests/fixtures/handCheckableTruth.json` (Sarah, `acme.com`), plus a seeded departure, queue item and change feed. | Remove. With no database the server should refuse to start, or start empty with a clear "no database" state. |
| F2 | `dataService.ts:199` (`demoModeEnabled`), `:304` (`seedDemoData`) | With `DEMO_MODE=true` and an empty database, writes the 10-person demo org into Postgres. | Remove, or move behind a script that can never run against a live deployment. Section 14, Q3. |
| F3 | `backend/db/resetDemoDeployment.ts`, `backend/db/seedDemoHistory.ts` | Wipes a demo database, reseeds it and back-fills 60 days of snapshots. | Remove for the live deployment. Q3. |
| F4 | `backend/src/connectors/google/index.ts:65–66` | With no service-account key, returns the token `'google-sandbox-token'` instead of failing. | Remove. A missing key must be a configuration error. |
| F5 | `frontend/app/showcase/page.tsx:40–60` | Component showcase page with hard-coded people ("Sarah Connor", `acme.corp`). | Delete the route, or keep it out of production builds. |
| F6 | `frontend/lib/session.tsx:31–33` | Local dev sign-in personas (`alex@acme.com` and others). | Replace with users that exist in the test tenant. |
| F7 | `frontend/features/map/nodes.tsx:27,91` | Maps the old mock kind `workflow` to "Automation". | Harmless. Remove once no stored data uses `workflow`. |
| F8 | `backend/src/services/briefing/weeklyBriefing.ts:221` | Without a Gemini key, the weekly briefing is written by a template. The template uses real data and is labelled `writtenBy: 'template'`. | Keep. It does not fabricate data. |
| F9 | `backend/src/auth/demoLogin.ts` | Shared demo login for demo deployments. | Not data. Keep or remove separately. |
| F10 | `attestationService.ts:306` | Attestation links are placeholders until launch. | Not ingested data. Leave as is. |

Not yet checked: every screen's empty state against a database that holds only real data. This happens during validation (section 9). Some views may have been written assuming the demo org's shape, for example that a departure always exists.

### 2.4 Gaps in the two connectors we already have

- Entra (`connectors/entra/index.ts`) reads users (`accountEnabled`, `employeeLeaveDateTime`, department, job title) and applications with their owners. Missing pieces:
  - Groups and group membership. Test A1 expects 6 groups.
  - Managers. Reporting lines feed lifecycle and successor logic.
  - Aliases. A6 expects 3 aliases.
  - Application secret and certificate expiry. Its `$select` is `id,appId,displayName,createdDateTime`. Without expiry, the orphan scan's `app_secret_expiring_unowned` finding can never fire from Entra. Reading `passwordCredentials`/`keyCredentials` is standard on the application resource, but I haven't checked it against the docs.
- n8n (`connectors/n8n/index.ts`) reads users, credentials, workflows (including owner and project), executions, and model nodes inside workflows. It was fixed against the real public API in `6b145ee3` and has a recorded fixture of real responses (`backend/tests/fixtures/n8nPublicApi.json`).

## 3. Platform inventory

The credentials sheet, read on 23 November 2026, lists accounts on:

- Outlook
- Gmail
- GitHub (an org-admin PAT, plus a GitHub App id and private key)
- Supabase
- Docker
- ngrok
- Azure / Microsoft Entra (tenant id, Global Administrator, 30 user rows)
- Jira (an Atlassian API token for `horquva-test.atlassian.net`)

The Person 15 plan adds n8n, Slack, Groq, Ollama, Zapier and Make.

The sheet's Platform filter lists every distinct value in that column. On 23 November 2026 the values were:

- (Blanks)
- Azure
- Docker
- GitHub
- Gmail
- Jira
- Microsoft
- Microsoft Entra app registration
- Microsoft Entra user
- ngrok
- Outlook
- Slack
- supabase

There are no rows for n8n, Groq, Ollama, Make or Zapier. The plan and the Mock Organization PDF say those accounts were created. Their credentials were never handed over, or they sit in blank-platform rows. I read the integration columns cell by cell only for roughly rows 2–21 and 53–62, so I don't know whether the Slack and "Entra app registration" rows hold a bot token or a client secret. Section 14, Q1.

## 4. Platform research

Every claim here comes from the official documentation pages listed under each platform, fetched on 23 November 2026. "Unverified" means I could not confirm it from official docs. Those items must be checked with a live call before we depend on them.

### 4.1 Microsoft Entra ID (Microsoft Graph)

- API: REST, JSON, Microsoft Graph v1.0.
- Auth: OAuth 2.0 client credentials. POST to `login.microsoftonline.com/{tenant}/oauth2/v2.0/token` with `scope=https://graph.microsoft.com/.default`. Application permissions always need admin consent.
- Least-privileged application permissions:

  | Data | Endpoint | Application permission |
  |---|---|---|
  | Users | `GET /users` | `User.Read.All` |
  | Group members | `GET /groups/{id}/members` | `GroupMember.ReadBasic.All` |
  | App owners | `GET /applications/{id}/owners` | `Application.Read.All` |
  | Direct reports | `GET /users/{id}/directReports` | `User.Read.All` |
  | Groups | `GET /groups` | `Group-NestingSupport.ReadWrite.All` (see below) |

  For groups, the docs list `Group-NestingSupport.ReadWrite.All` as least privileged, with `Group.Read.All` among the higher options. That looks like a documentation quirk. I would request `Group.Read.All` and confirm on the live tenant.
- Manager: the user-list-manager page lists Application access as "Not supported" for `GET /users/{id}/manager` and `$expand=manager`. The docs give no app-only way to read a user's manager. Direct reports do have one, so we can rebuild `reports_to` by reading each user's direct reports and inverting the result. For 30 users that is 30 extra calls per sync.
- Leave date and sign-ins: `employeeLeaveDateTime` needs `User-LifeCycleInfo.Read.All` as well. `signInActivity` needs Entra ID P1 or P2 and `AuditLog.Read.All`, and is throttled to 10 requests per minute per app per tenant.
- Aliases: `proxyAddresses` needs `$select`. The docs list `otherMails` only under a read-write permission.
- Paging: follow `@odata.nextLink` until it's absent. `$top` goes up to 999 for users, groups and members.
- Incremental sync: delta query is supported for users and groups. `$select=manager`/`members` tracks those relationships. The delta token lasts 7 days, and an expired token means a full resync. The docs don't say whether `$select=manager` on delta works app-only.
- Webhooks: change notifications exist for users and groups. They need a public HTTPS endpoint, and subscriptions last at most about 29 days.
- Throttling: the identity limit is measured in resource units. A tenant under 50 users gets 3,500 RU per 10 seconds per app. `GET /users` costs 2 RU. On a 429, honour `Retry-After`.
- Sandbox lifetime: a Microsoft 365 Developer Program tenant is "good for up to 90 days" and "may require tenants to be recreated every 90 days". After expiry it is deleted within about 60 days. Eligibility now needs a Visual Studio subscription, ISV Success, or Premier/Unified support, plus a billing account. The test tenant was created around 5 October 2026, so it may expire around early January 2027. Section 14, Q2.
- Sources:
  - learn.microsoft.com/graph/api/user-list
  - …/user-list-manager
  - …/user-list-directreports
  - …/group-list
  - …/group-list-members
  - …/group-delta
  - …/user-delta
  - …/application-list-owners
  - /graph/delta-query-overview
  - /graph/paging
  - /graph/throttling-limits
  - /graph/throttling
  - /graph/auth-v2-service
  - /graph/api/resources/user
  - /graph/change-notifications-overview
  - …-delivery-webhooks
  - …-lifecycle-events
  - /office/developer-program/microsoft-365-developer-program-faq

### 4.2 n8n (self-hosted)

- API: the public REST API is available on self-hosted Community edition. It is not on the n8n Cloud free trial.
- Auth: `X-N8N-API-KEY` header. Scopes such as `workflow:list`, `credential:list`, `user:list` and `execution:list` exist on all plans from n8n 2.14.0. Earlier non-Enterprise keys have full access.
- Users: `GET /users` is owner-only. That means the key must belong to the instance owner.
- Paging: cursor based. `limit` defaults to 100 with a maximum of 250, and the response returns `nextCursor`.
- Rate limits: optional, off by default, from 2.47.0. When on, over-limit calls get a 429 with `Retry-After`.
- Change events: log streaming is Enterprise only. Polling is the only option on Community.
- Projects and sharing: not in Community edition. The RBAC page and the editions page disagree on this. Workflow ownership on Community is therefore personal.
- Unverified from the docs: the paths for workflows, executions and credentials. They are verified in our own code and in the recorded real responses (`n8nPublicApi.json`).
- Blocker: the plan's n8n instance is self-hosted, and the 31 October shutdown rule said "no tunnels run". Our backend needs a stable reachable base URL for it. Section 14, Q2.
- Sources:
  - docs.n8n.io/api/
  - docs.n8n.io/api/authentication/
  - docs.n8n.io/api/pagination/
  - docs.n8n.io/api/api-reference/ (users)
  - docs.n8n.io/connect/n8n-api/rate-limits.md
  - docs.n8n.io/deploy/host-n8n/community-edition-features.md
  - docs.n8n.io/user-management/rbac/
  - docs.n8n.io/administer/observe-and-log/stream-logs-to-external-systems.md

### 4.3 GitHub

- API: REST (version `2022-11-28`) and GraphQL.
- Auth options:
  - Classic PAT with `read:org` and `repo`.
  - Fine-grained PAT, scoped to one org, which an org owner may have to approve.
  - GitHub App installation token (recommended by GitHub for org-level and long-lived integrations). Sign a JWT with the app's private key, then `POST /app/installations/{id}/access_tokens`. Tokens expire after 1 hour.
- Data available:

  | Data | Endpoint | Notes |
  |---|---|---|
  | Org members | `GET /orgs/{org}/members` | Filter `role=admin` or `role=member`. The list items carry no role. |
  | Org role | `GET /orgs/{org}/memberships/{username}` | |
  | Teams | `GET /orgs/{org}/teams` | |
  | Team members | `GET /orgs/{org}/teams/{slug}/members` | Includes `role` (`maintainer`/`member`) and `inherited`. |
  | Org repos | `GET /orgs/{org}/repos` | |
  | Team repos | `GET /orgs/{org}/teams/{slug}/repos` | Includes permissions. |
  | Collaborators | `GET /repos/{o}/{r}/collaborators` | Includes `permissions` and `role_name`. |
  | CODEOWNERS | `GET /repos/{o}/{r}/contents/.github/CODEOWNERS` | Also in the root or `docs/`. |
  | Commits | `GET /repos/{o}/{r}/commits` | |
  | Contributor stats | `GET /repos/{o}/{r}/stats/contributors` | Returns 202 while being computed. |

- Collaborator limitation: GitHub says there is "not a way to differentiate between an organization level grant and a repository level grant". A collaborator list therefore can't tell a deliberate repo admin from an org owner who inherits admin.
- Identity: `email` is nullable everywhere. It is only the user's public profile email. GitHub accounts can't be matched to directory people by email. Our `person:<email>` id therefore can't attach GitHub accounts automatically. This is the single biggest compatibility gap for GitHub.
- Rate limits: a PAT gets 5,000 requests per hour. An app installation gets at least 5,000 per hour and up to 12,500. Secondary limits: 100 concurrent requests and 900 points per minute. A secondary limit can come back as 403 with `retry-after`, and our guard only retries on 429 and 503.
- Paging: `Link` header. `per_page` maximum is 100.
- Webhooks: `organization`, `member`, `membership`, `team` and `repository` events exist. The `team` event is org-level only. Signed with `X-Hub-Signature-256`.
- Unverified:
  - Fine-grained permission names per endpoint.
  - Whether webhooks need public HTTPS.
  - Whether a GitHub App's `ExternalIdentity` or SAML linking is available. It needs Enterprise Cloud, which a free org doesn't have.
- Sources (docs.github.com):
  - rest/orgs/members
  - rest/teams/teams
  - rest/teams/members
  - rest/repos/repos
  - rest/collaborators/collaborators
  - rest/repos/contents
  - repositories/…/about-code-owners
  - rest/commits/commits
  - rest/metrics/statistics
  - rest/using-the-rest-api/rate-limits-for-the-rest-api
  - …/using-pagination-in-the-rest-api
  - authentication/…/managing-your-personal-access-tokens
  - apps/…/authenticating-as-a-github-app-installation
  - webhooks/webhook-events-and-payloads
  - rest/users/users

### 4.4 Slack

- API: the Web API (JSON over HTTP). Docs now live at docs.slack.dev.
- Auth: a bot token (`xoxb-`) from an installed app.
- Scopes and methods:

  | Data | Method | Scopes / notes |
  |---|---|---|
  | Users with emails | `users.list` | `users:read` and `users:read.email`. The method page says email now needs `users:read.email`. |
  | Channels | `conversations.list` | `channels:read`, plus `groups:read` for private channels. |
  | Channel members | `conversations.members` | |
  | Channel details | `conversations.info` | Returns `creator`. |

- User fields: `id`, `deleted`, `is_admin`, `is_owner`, `is_primary_owner`, `is_restricted`, `is_bot`, `is_app_user`, `profile.email`, `profile.title`, `real_name`.
- Identity: Slack exposes email, so Slack accounts match directory people exactly. This is the best identity signal of any tool here.
- Channel managers: there is no API for them on Free or Pro. `admin.conversations.search` is Enterprise-only. The plan's "#ops-alerts admin only Natasha Khan" therefore can't be read. Only the channel `creator` can.
- Plan limits: `usergroups.list` returns `plan_upgrade_required` below Standard. Free workspaces have message limits (`is_limited` on history). The 90-day history window and app-install caps are unverified.
- Rate tiers:

  | Method | Tier |
  |---|---|
  | `users.list` | T2 (20+/min) |
  | `conversations.list` | T2 |
  | `conversations.members` | T4 |
  | `conversations.info` | T3 |

  A 429 comes with `Retry-After`.
- Paging: `cursor` and `limit` (100–200 recommended, maximum 1,000). Don't persist cursors.
- Events: the Events API needs a public URL. Socket Mode does not, but it is a long-lived connection rather than a request.
- Posting: `chat.postMessage` needs `chat:write`, and `chat:write.public` to post in channels the bot hasn't joined. This only matters if we build alerts (Q7).
- Unverified: the 2025 rate-limit change for `conversations.history` on non-Marketplace apps. It wasn't found in the current docs or changelog.
- Sources (docs.slack.dev, redirected from api.slack.com):
  - reference/methods/users.list
  - users.lookupByEmail
  - conversations.list
  - conversations.members
  - conversations.info
  - conversations.history
  - usergroups.list
  - admin.conversations.search
  - chat.postMessage
  - apis/web-api/rate-limits
  - apis/web-api/pagination
  - authentication/tokens
  - apis/events-api
  - apis/events-api/using-socket-mode

### 4.5 Jira Cloud

- Auth: email plus API token over Basic auth. Passwords are deprecated.
  - Tokens expire in 1–365 days, with one year as the default.
  - Tokens created before 15 December 2024 expired between March and May 2026.
  - Scoped tokens must call `https://api.atlassian.com/ex/jira/{cloudId}`. Unscoped tokens call the site URL.
  - Atlassian says that apps collecting API tokens from customers don't meet its security requirements. That's fine for our own test tenant, but a customer product needs OAuth 2.0 (3LO). Q8.
- Identity: users have a non-nullable `accountId`.
  - `emailAddress` is nullable and returned only when the user's profile visibility allows it.
  - For unmanaged accounts the default visibility is "Anyone".
  - Admins always see email in admin screens, but that does not extend to the API.
  - Webhook user payloads never include email.
- Rate limits: points-based quotas began 2 March 2026 for Forge, Connect and OAuth apps. API-token traffic is explicitly excluded and stays on burst limits (default 100 GET per second per endpoint). A 429 carries `Retry-After`.
- Webhooks: these need public HTTPS on port 443 or 8443. They can be registered in the admin UI or over REST. Events cover projects, issues and users.
- Partly verified from the schema in the OpenAPI spec: components have `lead`, `assigneeType` and `realAssignee`.
- Unverified: the official REST reference pages rendered empty and the spec's paths section was too large to read. These are the endpoint paths I expect to use, none confirmed:
  - `GET /rest/api/3/project/search?expand=lead`
  - `GET /rest/api/3/project/{key}/components`
  - `GET /rest/api/3/project/{key}/role/{id}`
  - `GET /rest/api/3/search/jql` with `nextPageToken`
  - `GET /rest/api/3/users/search`

  These are all standard Jira endpoints, but by the standard set for this document they stay unverified until a live call confirms them.
- Also unverified: whether Jira has any native "backup lead" field. I found none.
- Sources:
  - developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
  - …/rate-limiting/
  - …/webhooks/
  - …/deprecation-notice-user-privacy-api-migration-guide/
  - …/swagger-v3.v3.json (schemas only)
  - …/changelog/
  - support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/
  - …/update-your-profile-and-visibility-settings/

### 4.6 Groq

- The documented API covers inference (chat, audio, batches, files) and `GET /openai/v1/models`.
- No organization or admin endpoint for keys, users, projects, usage or spend appears in the API reference I read. Usage and spend appear as console pages. This is unverified as a definite absence, because the reference page was truncated.
- Consequence: we can't inventory Groq keys or attribute usage through Groq itself. The workable signal is n8n workflows calling Groq, which our n8n connector already turns into `calls_model` edges.
- Sources: console.groq.com/docs/api-reference, /rate-limits, /models.

### 4.7 Ollama

- Local REST API at `http://localhost:11434/api`. Local requests need no auth. Ollama Cloud uses a bearer key.
- `GET /api/tags` lists installed models and `GET /api/ps` lists loaded models. Both came from a summary of the GitHub docs, not verbatim.
- No caller identity or usage log.
- Consequence: this gives a model inventory per host and nothing about ownership. Reaching a laptop-hosted Ollama from our backend needs a network path (Q2).
- Sources: docs.ollama.com/api, github.com/ollama/ollama/blob/main/docs/api.md.

### 4.8 Make and Zapier

- Make:
  - Auth: `Authorization: Token …` with scopes such as `scenarios:read`, `connections:read` and `user:read`, against zone hosts (`eu1`/`eu2`/`us1`/`us2.make.com/api/v2`).
  - `GET /scenarios?teamId=` returns `createdByUser {id,name,email}`, `scheduling`, `isActive` and `usedPackages`.
  - `GET /connections` returns `scenarioUsages` but no creator.
  - Free plan: "Most Make API endpoints are reserved for our paid subscription plans". The rate-limit table has no Free row. The plan says the test org uses free accounts.
  - Sources: developers.make.com/api-documentation (and /authentication, /api-scopes-overview, /api-reference/scenarios, /connections, /users, /organizations, /getting-started/rate-limiting, /pagination-and-sorting).
- Zapier:
  - Is partner approval mandatory? For the API, yes. `GET https://api.zapier.com/v2/zaps` needs OAuth (`zap`, `zap:all` or `zap:account:all`) or a Client ID.
  - The Client ID page says the app "needs to be published as a public integration in Zapier's App Directory", and that the Client ID and Secret are "only available after you've published your app as a public integration".
  - The API spec says the client_id is received "once you are approved for access to the API".
  - Building a private integration is free and self-serve, but the docs don't say a private integration gets a Client ID.
  - Publishing is gated by Zapier's "Integration Ownership criteria" and automated checks. Whether a human review follows is unverified.
  - Even with access, the Zap schema has no owner field. Connected accounts appear only as step-level `authentication` objects.
  - Not verified: account-level Zap export, audit logs (search snippets suggest Team or Company plans), and Zapier MCP as a listing route.
  - Workaround that needs nothing from Zapier: when someone connects Zapier to a work account, the grant appears on the other side. That is an enterprise app or service principal plus delegated grant in Entra, an OAuth app or installation in GitHub, or an installed app in Slack. That tells us who connected Zapier to which system, which is the accountability fact we care about. It does not list Zaps. Make shows up the same way. The Graph, GitHub and Slack endpoints for this are not yet verified. Our model already has a `grants_access_to` edge for it.
  - Sources:
    - docs.zapier.com/powered-by-zapier/api-reference/zaps/get-zaps-v2.md
    - …/authentication/getting-started.md
    - …/authentication/methods/client-id.md
    - …/authentication/methods/user-access-token.md
    - …/introduction
    - docs.zapier.com/integrations/quickstart/private-vs-public-integrations.md
    - …/rate-limiting.md

### 4.9 Accounts that are not data sources

- Outlook and Gmail are personal mailboxes the team signed up with. Mail could be read through Graph or the Gmail API, but mailbox content is not part of the accountability model, and reading staff mail is a privacy decision we have never made.
- Supabase was the interns' test database.
- Docker and ngrok are infrastructure.

I propose we don't connect any of these. Q4.

## 5. Data compatibility

| Platform | Maps to | Fields used | Gaps and mismatches |
|---|---|---|---|
| Entra | `person`, `group`, `app`; `member_of`, `reports_to`, `owns` (app owners) | `id`, `userPrincipalName`, `mail`, `displayName`, `department`, `jobTitle`, `accountEnabled`, `employeeLeaveDateTime`, `proxyAddresses`; group `id`, `displayName`; members `id`; app `appId`, owners `id` | Manager must come from inverted `directReports`. `mail` can be null, so fall back to UPN and lower-case it. Aliases come from `proxyAddresses` with the `smtp:` prefix stripped. Group membership isn't transitive. |
| n8n | `person`, `automation`, `credential`, `model`; `owns`, `depends_on`, `runs_on_credentials_of`, `calls_model` | already mapped | Without projects, ownership is the personal owner only. |
| GitHub | `person` (via identity), `group` (team), repository (new kind or `app`), credential (Actions secrets: unverified) | member `id`, `login`; team `slug`, members `role`; repo `full_name`, collaborators `permissions`, `role_name`; CODEOWNERS lines | No email, so the login-to-person link needs either an identity rule or a human mapping (Q5). Effective admin can't be told apart from an inherited org grant. No kind fits a repository (Q6). |
| Slack | `person`, `group` (channel); `member_of`; channel `creator` as a weak owner (`owner_kind: 'creator'`, grade `inferred`) | `id`, `profile.email`, `deleted`, `is_bot`, `is_admin`, `is_owner`; channel `id`, `name`, `is_private`, `creator`, members | No channel managers on Free/Pro. `deleted: true` is a strong leaver signal for lifecycle. Bot users map to service accounts. |
| Jira | `person`, project (new kind or `process`), component; `owns` (project lead, component lead), `backs_up` (convention, Q9) | `accountId`, `emailAddress` (nullable), `active`, `accountType`; project `key`, `lead.accountId`; component `lead`, `assigneeType` | Email may be hidden. No native backup field. Issues are activity, not structure: I propose not storing issues as entities, only an optional `last_used_at`-style fact on projects. |
| Groq | none directly | none | Seen only through n8n `calls_model`. |
| Ollama | `model` (by host) | model `name`, `modified_at` | No owner or usage. |
| Make | `automation`, `credential`; `owns` (`createdByUser`, `owner_kind: 'creator'`), `depends_on` (connection `scenarioUsages`) | as listed | Paid plan needed (Q10). |
| Zapier | none | none | Partner approval needed. |

### 5.1 Can the sources be unified?

Yes, for every source that exposes an email: Entra, Slack, Make, Jira when visibility allows, and n8n. These attach to the directory person by exact email, which is what `identity/matcher.ts` already does.

GitHub can't be unified automatically. Jira accounts with hidden email can't either. Both land in the identity queue (B4) for a human to link. In a 30-person org that is a one-time job, and the link is stored as `confirmed`.

### 5.2 Changes to the architecture

- New entity kinds: `repository`, and maybe `project`. These are type and UI changes only (Q6).
- `persistSync` closes every row that a connection stopped reporting. So every sync must be a full snapshot for whatever it covers. Delta-only syncs (Entra delta, Jira `updated >=`) would close rows they simply didn't fetch. Either we keep full snapshots, which is cheap at this size, or the base class needs a partial-sync mode. I recommend full snapshots now.
- `ReadOnlyHttpGuard` allows GET only. GitHub App token exchange is a POST, just as the Entra token request already bypasses the guard with plain `fetch`. Token endpoints should get one explicit, audited exception rather than ad hoc fetches.
- The guard retries only on 429 and 503. GitHub secondary limits return 403 with `retry-after`, and should be retried when that header is present.

## 6. Ingestion pipeline

The ten stages map onto existing code. New work is in the "New" column.

| Stage | Today | New |
|---|---|---|
| 1. Platform auth | Entra client credentials. n8n API key. | GitHub App JWT → installation token, cached for under an hour. Slack bot token. Jira email and token. Make token. |
| 2. Connector init and config | zod schema per type, encrypted config, Settings UI | Schemas and UI forms for `github`, `slack`, `jira`, `make`, `ollama`. |
| 3. Extraction | `guard.get` with paging per connector | Paging per platform: `Link` header (GitHub), `next_cursor` (Slack), `nextPageToken`/`startAt` (Jira), `pg[offset]` (Make). |
| 4. Response validation | Ad hoc field checks | A zod schema per response type at the boundary. A shape mismatch is a core error naming the field. No silent defaults. |
| 5. Transformation | Per connector into `CanonicalEntity`/`Edge`/`Fact` | Same pattern. Lower-case emails. Strip Entra `smtp:` prefixes. Stable ids such as `group:slack:<id>`, `group:github:<team id>`, `repository:github:<id>`, `project:jira:<id>`. |
| 6. Dedup and conflicts | Upsert by entity id. Directory name wins. Grade precedence on edges and facts. | Cross-source person merge only by exact email or confirmed identity link (Q11). |
| 7. Persistence | `persistSync`, one transaction, raw landing kept | No change apart from the new kinds. |
| 8. Incremental sync | Full snapshot each hour. Rows not seen are closed. | Keep full snapshots (section 5.2). Entra delta and webhooks are a later optimisation. |
| 9. Errors, retries, rate limits | Guard backoff on 429/503. Core errors vs warnings. A failed sync closes nothing. | 403 with `retry-after` handling. Per-connector concurrency cap (Slack tier 2 is about 20 calls per minute). |
| 10. Logging and status | `sync_run` row with stats and `errorReasons`. `connection.status` and `last_error` shown in Settings. Audit entries. | A per-platform freshness indicator. Alert when a connection hasn't synced successfully within N hours (Q12). |

### 6.1 Ingestion pattern per platform

| Platform | Pattern | Why |
|---|---|---|
| Entra | Hourly full poll | Small tenant. Delta and webhooks need extra state and a public endpoint. |
| n8n | Hourly full poll | Community edition has no events. |
| GitHub | Hourly full poll. Contributor stats daily. | Within rate limits. Stats endpoints are asynchronous (202). |
| Slack | Hourly full poll with a concurrency cap | Tier 2 methods. Events need a public URL or Socket Mode. |
| Jira | Hourly full poll of projects, components and roles | API-token traffic stays on burst limits only. |
| Ollama | Hourly `GET /api/tags` | Inventory only. |
| Make | Hourly poll, if a paid plan exists | |
| Groq, Zapier | No connector | Section 4. |

Webhooks and Socket Mode can come later, once the backend has a stable public HTTPS host. They would trigger a sync, not replace one, so `persistSync`'s full-snapshot rule still holds.

## 7. Feasibility matrix

| Platform | Rating | Auth complexity | Effort (one engineer) | Blockers and dependencies |
|---|---|---|---|---|
| Entra | Feasible with limitations | Low | 2–3 days to add groups, direct-report inversion and aliases | App registration with admin consent. Manager is not readable app-only. Sandbox tenant expires. |
| n8n | Feasible | Low | 0.5 day to configure | Needs a stable reachable URL and an owner API key. |
| Slack | Feasible with limitations | Low | 3–4 days | Install an app with the listed scopes. No channel managers on Free. |
| Jira | Feasible with limitations | Low (token) | 3–4 days | Endpoints unverified until a live call. Email may be hidden. No backup field. Token expiry. |
| GitHub | Feasible with limitations | Medium (App JWT) | 4–5 days | No email, so identity needs human linking. Repositories need a new kind. |
| Ollama | Feasible with limitations | None | 1 day | Network path to the host. Inventory only. |
| Make | High risk | Low | 2 days if allowed | API gated to paid plans. The test org uses Free. |
| Groq | Not feasible as a direct source | n/a | 0 | No admin or usage API documented. Covered through n8n. |
| Zapier | Not feasible through its API. Partly visible through OAuth grants. | n/a | 0, or about 2 days for grant detection across Entra, GitHub and Slack | The API needs a published public integration and approval. No owner field. |

Verified versus assumed:

- The effort figures are my estimates.
- The ratings rest on the cited docs, except for the unverified Jira paths and the Groq absence.

## 8. Implementation plan

Each phase ends with something checked against the live test org.

0. Confirm what's alive. Before any code, use each credential once with a single read-only call:
   - Graph `GET /users?$top=1`
   - n8n `GET /users?limit=1`
   - GitHub `GET /orgs/{org}`
   - Slack `auth.test`
   - Jira `GET /rest/api/3/myself`
   - Make `GET /users/me`
   - Ollama `GET /api/tags`

   Record each result as working, expired, unreachable or missing. Done when every platform has a recorded result. This also confirms or rules out the unverified Jira paths.
1. Remove fabricated data (F1–F6). The backend needs Postgres. An empty database shows honest empty states. Done when a fresh database with no connections shows no people, and every screen still renders.
2. Entra and n8n, live. Create the app registration, configure both connections through the UI, and extend Entra with groups, direct-report inversion and aliases. Done when A1 and A2 counts match the live tenant, read from the database.
3. Slack connector. Done when A4 passes, and Slack accounts attach to directory people by email with zero false merges.
4. Jira connector. Done when A5 passes, project leads and component leads appear as `owns`, and the OPS project shows no backup.
5. GitHub connector plus identity linking. Done when A3 passes, and every GitHub member is either linked (confirmed) or sitting in the identity queue.
6. Reliability. Add 403 `retry-after` handling, the token-endpoint exception in the guard, freshness alerts, and response validation everywhere. Done when an expired token, a revoked app and an unreachable host each show their true error in Settings and in `sync_run`, and data from the last good sync is still shown.
7. Ollama, and Make if a paid plan exists.

Order rationale: Entra comes first because every other source attaches to its people. Slack has the best identity signal. Jira has the most ownership signal. GitHub has the hardest identity problem.

## 9. Validation

- Ground truth: for each platform, a count and a sample taken directly from the platform's own UI or API on the same day. Not the interns' CSVs, which may be stale. Compare against `SELECT kind, count(*) FROM entity …` and the edges per source.
- Provenance: every entity and edge from a live sync has a `raw_payload` row for the same `sync_run`. A check that finds any entity with no raw payload behind it fails validation. This catches fabricated rows.
- Mutation test: change one thing on each platform, such as removing a Slack member from a channel, changing a Jira project lead, or disabling an Entra user. After the next sync, the old edge has `valid_to` set and the new one is active.
- Failure test: revoke one credential per platform. The sync records a failed run with the platform's real error, closes nothing, and the UI shows the error.
- Identity: count linked accounts per source, plus the queue size. No person may have two `person:` entities.
- Automated tests: replay recorded real responses through each connector, as `n8nPublicApi.json` does today. These are recordings of real API output, captured once with secrets removed and labelled as such. They are not invented data.

## 10. Cross-check against the materials we have

The materials: the Person 15 plan (v7.0), the Mock Organization summary, and the credentials sheet.

### 10.1 What the test org was built to contain, and what the MVP can do with it

| Planted in the test org (per plan / summary) | What the MVP can do with it | Note |
|---|---|---|
| Entra: 30 users, 6 groups, 5 app registrations, 3 forced alias mismatches | Users and app owners today. Groups and aliases after the Entra work in phase 2. | The alias mismatches test identity resolution (A6) directly. |
| n8n: 15 scheduled workflows, 5 credentials, an API key | Full support today. | No n8n credential is in the sheet. |
| GitHub: 8 repos, 5 teams, 20 collaborators, 3 forced username mismatches, real commits, issues and PRs | New connector. | The username mismatches suit our identity queue, because GitHub gives no email (section 4.3). The test org was built for exactly the case GitHub can't solve automatically. |
| Slack: 30 users, 8 channels with admins, `#ops-alerts` admin only Natasha, 50+ messages, an app with `chat:write` | New connector. | The existing app has only `chat:write`. It needs `users:read`, `users:read.email`, `channels:read`, `groups:read`, and a reinstall. Channel admins can't be read on Free or Pro (section 4.4), so the `#ops-alerts` admin rule can't be checked through the API. |
| Jira: 6 projects (ENG, OPS, FIN, HR, INFRA, SEC), leads and backups with OPS having no backup, 40 issues, 6 components | New connector. | Jira has no backup field, so we need to know how the backups were recorded (role, component lead, or description text) before we can read them (Q9). |
| Groq 2 keys, Ollama 2 models, Zapier and Make free accounts | Groq only through n8n. Ollama inventory only. Make and Zapier not through their APIs on Free. | None of these credentials are in the sheet. |
| `master.csv`, `spof-list.md` (6 SPOFs), per-platform ground-truth CSVs, `simulate-changes.py`, `simulate-failures.py`, change-feed ground truth | Ground truth for checking results (section 9) and scripted change and failure injection. | These live in `/shared/…`. We don't have them in this repo (Q14). |
| Synthetic leavers `bob@`, `alice@`, `carol@horquva-test.local` | Leaver detection, orphan scan and handover flows need a departed person. | Likely mismatch: Entra sign-in names must use a domain verified in the tenant, and a `.local` domain can't be verified. These personas probably exist only in CSVs, not in Entra. This is my inference, not checked. |

### 10.2 Problems the materials reveal

1. People's emails differ between platforms. Entra users are `firstname.lastname@sohaibadnanhorquvaoutlook.onmicrosoft.com`. The sheet shows Jira and GitHub accounts registered with the workers' own Outlook and Gmail addresses (for example `tayyaba.horquva@outlook.com`, `ali.naeem.horquva@gmail.com`). If Slack and Jira invited the 30 roster people with addresses other than their Entra sign-in names, exact-email matching fails for most of the org. Everything would land in the identity queue. That is the most important thing for phase 0 to check, because cross-source identity carries every finding.
2. Seat and plan limits. The developer tenant includes 25 licences, against 30 users. Unlicensed users still exist in the directory. The Jira Free user cap (thought to be 10) is unverified. If Jira has fewer than 30 people, A5's numbers will be wrong.
3. The interns' connectors were built against mock data first (Clarification 4). The summary says Sumavia "built Make and Zapier connectors". Given section 4.8, those can only have worked against fixtures or paid accounts. Treat their reported results as unproven until we see the code and the runs.
4. The plan's A7 expects "6 SPOFs". Our single-point-of-failure check returns `UNKNOWN` until an asset's criticality is confirmed (`domain/checks/index.ts:49`). No API supplies criticality, so connectors alone will show 0 confirmed SPOFs and up to 6 unknowns. This is the trust rule working, not a bug. A7 has to include an attestation round, or count the unknowns.
5. The 31 October shutdown checklist asked for "no leaked credentials stay valid" and "no tunnels run". If it was carried out, most of what the sheet holds no longer works, and self-hosted n8n and Ollama are gone.

## 11. Can the pipeline be trusted?

The product rests on evidence-graded facts. I checked the existing code against that standard.

### 11.1 What is already sound (verified in code)

- Credentials are encrypted at rest with the connection id as additional authenticated data, and are never read back to the UI (`runner.ts`).
- Connectors can't write to a customer system. `ReadOnlyHttpGuard` only sends GET, to an allow-listed host (`guard.ts:96`).
- Every response is kept unchanged in `raw_payload` against its `sync_run`. Any entity can be traced to the API response that produced it.
- History is kept (SCD2), and a weaker grade never overwrites a stronger one. An attested owner survives the next sync (`base.ts`, `factStore.ts:265`).
- A partial sync can't wipe data. A core error or an empty result skips closing vanished rows (`base.ts`, B1).
- Missing is never treated as false. Checks return `UNKNOWN` for unconfirmed criticality, documentation or fallback (`checks/index.ts:6,49,174,223`).
- Identity merges only on exact email, a known alias, or a service-account pattern. A username-only match goes to a human (`identity/syncHook.ts`).

### 11.2 Weak spots and fixes

| # | Problem | Why it matters for trust | Fix |
|---|---|---|---|
| T1 | Silent scope shrink. If a token loses access to part of the data without an error (a Slack bot removed from a private channel, a fine-grained GitHub token limited to some repos, a Jira user losing Browse permission), the API simply returns less. `persistSync` then closes real memberships and ownerships as if they ended. | False "owner left" or "no members" findings, which is exactly the false alarm that erodes trust. | Record what each sync could see (counts per resource type) as part of the run. Refuse to close rows when coverage drops by more than a set threshold against the last good run. Mark that sync "partial: visibility dropped". |
| T2 | Grade inflation in new connectors. `stated` means read directly from an authoritative API, but permission is not ownership. GitHub `admin`, Slack channel `creator`, and Jira issue assignee all imply responsibility without stating it. | Ownership counts and findings would look more certain than the evidence supports. | Only fields that literally name an owner are `stated`: Entra app owners, n8n workflow owner, Jira project and component lead, Make `createdByUser` (as `creator`). Everything derived from permissions or activity is `inferred`, with `owner_kind` `key_principal` or `creator`. Write this into a connector checklist and a test per connector. |
| T3 | No response-shape validation. Connectors read fields ad hoc. If a field is renamed or comes back null (for example Entra `mail`, Jira `emailAddress`), it quietly becomes missing. | Silent data loss that looks like real absence. | A zod schema per response at the boundary. Unknown shapes become a core error naming the field. A nullable field the docs allow (for example Jira email) becomes a recorded fact grade `unknown`, not an omission. |
| T4 | People are keyed on email (`person:<email>`). Renaming someone's email makes a new person, and closes the old one's edges as vanished. | A rename looks like a departure and a new hire. | Anchor directory people on the directory's immutable id (`entraId`), with email as an attribute and alias. Needs a migration of existing ids. It's cheap now and expensive after the first real customer. |
| T5 | Leaver and mover detection only reads directory connectors (`runner.ts:184`, entra/google). Slack `deleted`, GitHub removal from the org, and Jira `active:false` are not used. | Strong real-world departure signals are ignored, or they surface only as closed edges without explanation. | Feed tool-side deactivations into lifecycle as suggestions, graded `inferred`, never as a departure. The directory stays the authority (Q11). |
| T6 | The identity hook only knows n8n, OpenAI and Anthropic accounts (`syncHook.ts` `TOOL_ACCOUNT_REFS`). | New connectors' accounts would never be queued for matching. | Each new connector registers its account reference (`githubUserId`, `slackUserId`, `jiraAccountId`, `makeUserId`). |
| T7 | Made-up data is still possible (F1, F2, F4). | One fixture or fake token in a live deployment undoes all of the above. | Phase 1 removes it. Add a check that fails if any entity lacks a `raw_payload`, an attestation, or a manual-entry audit row behind it. |
| T8 | GitHub secondary rate limits return 403 with `retry-after`. The guard treats every 4xx except 429 as fatal. | Spurious failed syncs. | Retry a 403 when `retry-after` or `x-ratelimit-remaining: 0` is present. |

T1, T2 and T3 must be in place before any finding from a new connector is shown as fact. They are what turns "we read some API" into "we can stand behind this".

## 12. Scaling: bottlenecks and fixes

The current target is one deployment per org (decided earlier). The test org is 30 people. The design has to hold at a few thousand people without a rewrite.

| # | Bottleneck (where) | At 30 people | At about 5,000 people | Fix |
|---|---|---|---|---|
| S1 | The hourly job syncs connections one after another (`runner.ts:234` `syncAll`). | Negligible | One slow or throttled source (Slack at tier 2, about 20 calls a minute) delays every other source. | Put each connection on the existing `connector-sync` pg-boss queue with its own singleton key, so they run in parallel with a cap. |
| S2 | Every sync rebuilds the whole in-memory graph from Postgres (`runner.ts:183`). | ms | N connectors means N full rebuilds an hour. The 20k-entity benchmark from October bounds a single rebuild, not N of them. | Rebuild once per batch, by debouncing for a few seconds after the last sync finishes. Later, apply the sync's change set to the graph incrementally. |
| S3 | `raw_payload` stores a full copy of every response on every hourly sync, with no retention. | About 2–5k rows a day | Hundreds of thousands to over a million rows a day (Slack and GitHub members, channels, repos). | Store a payload only when its hash differs from the last stored version for that (connection, resource, external id). Keep a time-boxed retention for unchanged runs. Provenance stays intact because the row that produced the current edge is kept. |
| S4 | Full-snapshot syncs (section 5.2). | Cheap | Fine for directories and repos. Costly for Jira issues and Slack history if we ever ingest them. | Keep structure as full snapshots. Never ingest activity streams (issues, messages) as entities. If activity is ever needed, read it incrementally into facts, not into vanish-closed edges. |
| S5 | Per-repo and per-channel fan-out (collaborators, CODEOWNERS, channel members). | 8 repos, 8 channels | Thousands of calls an hour. GitHub allows 5k to 12.5k an hour per installation. | GitHub App auth, not a PAT, for the larger quota. Run expensive fan-out (contributor stats, CODEOWNERS) daily, not hourly. Use ETags and conditional requests where the API supports them. |
| S6 | The in-memory graph lives in a single process. | Fine | Running more than one API instance gives each its own graph, and they drift apart between rebuilds. | Run one API instance per org, which is current practice. If we need more, move graph reads to Postgres or a shared cache before scaling out. |
| S7 | Webhooks need a public HTTPS host, and local development has none. | n/a | Polling delay of up to an hour. | Polling now. Later, webhooks and Socket Mode can trigger a sync of the affected connection (section 6.1). |

## 13. Is this worth doing?

Short answer: yes for Entra, n8n, GitHub, Jira and Slack identity, with the trust fixes (T1–T3) first. No for Groq, Make and Zapier through their own APIs, and no for ingesting Jira issues or Slack messages.

### 13.1 What real data will turn into insight, using findings the MVP already computes

| Insight (existing code) | Needs | Can connectors alone produce it? |
|---|---|---|
| Keys and automations still tied to people who have gone (orphan scan `key_owner_gone`, `automation_on_gone_identity`) | A departed directory person, plus n8n workflow owners and credentials | Yes. Graded `stated` end to end. The test org needs a real disabled account (section 10.1, synthetic leavers). |
| Owner not in the directory (`owner_not_in_directory`) | Directory, plus tool accounts | Yes. That is exactly the identity queue's job. The GitHub and alias mismatches will exercise it. |
| App secret expiring with nobody to rotate it | Entra app secret expiry plus owners | Yes, once Entra reads `passwordCredentials` (section 2.4). |
| Assets whose only owner is leaving, and handovers on departure | Owners from Entra, n8n, Jira leads and GitHub (`inferred`), plus a departure | Yes for the structure. Handover acceptance is a human step. |
| Single point of failure (A7), documented, fallback exists | Confirmed criticality, documentation and fallback | No. These come from attestation. Connectors supply the candidates. People confirm them. The honest output before attestation is "N assets with one owner, criticality unconfirmed". |
| Coverage: no backup (Jira OPS) | Jira leads plus a backup convention | Only once the backup convention is settled (Q9). Otherwise it's unknown, not "no backup". |

### 13.2 What this does and doesn't prove

- It proves that our connectors work against real APIs: authentication, paging, throttling, real response shapes, real errors, identity across five systems, and leaver detection from a real directory. Today only n8n has been proven against real responses. Every design-partner pilot depends on this, so it isn't wasted work.
- It doesn't prove the product finds unknown risks. The test org was built in five days with planted answers (forced mismatches, one project without backup, a list of 6 SPOFs). Matching those answers shows our pipeline is correct, not that a customer will learn something new. Product value still needs a real design partner's data.
- Where time would be wasted: Make and Zapier through their APIs (not available on Free, or approval needed), Groq (no admin API), Ollama beyond a model list, Slack channel membership as ownership (it isn't ownership), and Jira issues or Slack messages (activity, not accountability, and they drive storage growth in S3/S4).

### 13.3 Rough cost

- Phases 0–2: about 1.5 weeks for one engineer. That covers checking what's alive, removing fake data, live Entra and n8n with groups, aliases, managers and secret expiry, plus T1–T3.
- Phases 3–5 (Slack, Jira, GitHub with identity linking): about 2–2.5 weeks.
- Reliability and scaling fixes (T4–T8, S1–S3): about 1 week.
- Total: roughly 4.5–5 weeks of one engineer, if phase 0 finds the platforms alive. If the Entra tenant or n8n is gone, rebuilding them is an extra cost outside this estimate.

## 14. Questions, with suggested answers

Pick one option per question, or write your own. My recommendation is marked.

Q1. Credentials. The sheet has no n8n, Groq, Ollama, Make or Zapier rows, and I couldn't confirm a Slack bot token or Entra client secret.
- a) Ask the people who created those accounts (Hanain, Anas, Umair, Sohaib) for the missing credentials, and lock the sheet first. (recommended)
- b) We recreate the missing accounts and apps ourselves, under accounts Horquva controls.
- c) Go ahead only with what's in the sheet (Entra, GitHub, Jira) and add the rest later.

Q2. What's still running after the 31 October shutdown?
- a) I don't know. Run phase 0's one-call check on everything and report back. (recommended)
- b) The shutdown was carried out, so assume everything must be recreated.
- c) Only Entra, GitHub, Jira and Slack still exist. n8n and Ollama are gone.

Q3. Scope of removing made-up data.
- a) Remove it from the product entirely. The sales demo then runs on the live test org. (recommended, given "no fabricated data")
- b) Remove it from live deployments only. Keep the seeded demo org behind a separate script for the sales demo deployment.
- c) Keep the demo deployment as it is until the test org is fully connected, then switch.

Q4. Outlook, Gmail, Supabase, Docker and ngrok accounts as data sources.
- a) Out of scope. They are infrastructure or personal mailboxes. (recommended)
- b) Read Outlook and Gmail metadata (not content) as an activity signal.

Q5. Linking GitHub accounts to people (GitHub gives no email).
- a) A human links each account once through the identity queue, stored as `confirmed`. (recommended, at 30 people)
- b) A maintained mapping file of login to email, imported as `stated`.
- c) Guess from commit author emails, graded `inferred`, always shown as unconfirmed.

Q6. How to model GitHub repositories and Jira projects.
- a) Add entity kinds `repository` and `project`. (recommended)
- b) Map repositories to `app` and projects to `process`.

Q7. Alerts for A12–A14 (the MVP posting to Slack).
- a) Not now. Keep connectors read-only. A12–A14 are tested by the existing watchdog and n8n, not by the MVP. (recommended)
- b) Build a separate, explicitly write-scoped alerting integration after phase 5.
- c) Drop A12–A14 from the MVP test plan.

Q8. Jira authentication.
- a) Use an API token for our own test tenant now. Plan OAuth 2.0 (3LO) before any customer. (recommended)
- b) Build OAuth 2.0 (3LO) from the start.

Q9. How backups are represented in Jira (needed for "OPS has no backup").
- a) Check how Tayyaba recorded backups in the live site during phase 0, then decide. (recommended)
- b) Agree that a project role named "Backup" means `backs_up`, and set it up in the test site.
- c) Backups come only from attestation in our app, not from Jira.

Q10. Make and Zapier.
- a) No Make or Zapier connectors. Detect both through OAuth grants in Entra, GitHub and Slack (`grants_access_to`). (recommended)
- b) Pay for a Make plan and build a Make connector. Zapier stays out.
- c) Drop both entirely.

Q11. When sources disagree.
- a) The directory is the authority for name, department and status. Tool-side deactivation raises a leaver suggestion graded `inferred`, never a departure. (recommended)
- b) The directory is the only authority. Tool signals are ignored.
- c) The most recent change wins, whatever its source.

Q12. Sync frequency and freshness.
- a) Hourly for structure, daily for heavy fan-out (contributor stats, CODEOWNERS). Flag a connection as stale after 3 missed hours. (recommended)
- b) Hourly for everything. Stale after 24 hours.
- c) Every 15 minutes, for demos.

Q13. Storing what we read (real staff names and emails in `raw_payload`).
- a) Store in full, with hash dedup and 30-day retention for unchanged payloads. Restricted to the test deployment. (recommended)
- b) Strip emails and profile fields from raw payloads after mapping.
- c) Need a legal or privacy answer first.

Q14. The test org's ground truth (`/shared/…`: `master.csv`, `spof-list.md`, ground-truth CSVs, `simulate-*.py`).
- a) I can get access. Bring them into `docs/test-org/` (no credentials) as the answer key for section 9. (recommended)
- b) They're lost. Take ground truth directly from each platform's UI on the day.
- c) Don't know where they are.

## 15. Decisions (23 November 2026)

The owner accepted every recommended answer in section 14:

- Q1 a: ask for the missing credentials and lock the sheet first.
- Q2 a: run the phase 0 check.
- Q3 a: remove made-up data entirely. The demo runs on the live test org.
- Q4 a: mailboxes and infrastructure accounts are out of scope.
- Q5 a: GitHub accounts are linked by a person once.
- Q6 a: add `repository` and `project` kinds.
- Q7 a: no outbound alerts now.
- Q8 a: API token now, OAuth before any customer.
- Q9 a: check how Jira backups were recorded during phase 0.
- Q10 a: detect Make and Zapier through OAuth grants.
- Q11 a: the directory is the authority. Tool-side deactivations become `inferred` suggestions.
- Q12 a: hourly for structure, daily for fan-out, stale after 3 missed hours.
- Q13 a: hash dedup, 30-day retention, test deployment only.
- Q14 a: bring the ground truth in as the answer key.

## 16. Proposed design: one canonical identity per person

### 16.1 The problem today (verified in code)

- People are keyed on email (`person:<email>`). A tool account becomes its own `person` entity under whatever email the tool reports. It "joins" the directory person only if the two email strings are identical, because then the entity ids collide on upsert. There is no explicit link.
- Linking an account in the identity queue (`identity/queue.ts` `resolveLink`) sets `identity_queue.linked_person_id`. Nothing else reads that column: not the graph, the checks, or the orphan scan. A linked GitHub or n8n account keeps its own `person` entity, and its ownership edges never reach the real person. Today identity linking is recorded but has no effect.
- `directoryFrom()` never fills `aliases`, so the matcher's alias index is always empty.
- Email changes split a person (T4).

### 16.2 Design

1. One anchor per person. The canonical person is the directory record, keyed on the directory's immutable id: `person:entra:<objectId>`, or `person:google:<id>`. Every email the directory knows for that person is an attribute: `mail`, `userPrincipalName`, and the `smtp:` entries in `proxyAddresses`. Without a directory connection, the CSV import is the directory.
2. Accounts are separate from people. Each platform account becomes its own entity, kind `account`, with id `account:<source>:<platform id>`. Examples:
   - `account:github:583231`
   - `account:slack:U0123`
   - `account:jira:5b10ac8d…`
   - `account:n8n:<uuid>`

   It carries the platform's own fields (login, email if any, deleted or active, bot flag). Connectors attach what the platform says to the account: GitHub "admin on repo X", n8n "owns workflow Y". Connectors never write to a person directly. Provenance stays exactly what the source said.
3. A link joins an account to a person. Links live in a new SCD2 table `identity_link`: account id, person id, grade, method, who linked, `valid_from` and `valid_to`. It replaces `identity_queue.linked_person_id` as the source of truth. The queue becomes a view of accounts with no active link. Methods and grades:
   - `exact_email`, grade `stated`. The account's email equals any directory email or alias. Applied automatically, and closed automatically if either side changes.
   - `admin_link`, grade `confirmed`. A person linked it in the queue. Never overwritten by an automatic match (the existing grade precedence rule).
   - `suggested`, grade `inferred`. Same local part, similar name, or a commit-author email. Shown in the queue as a suggestion and never applied on its own.
   - `service_account`, `ignored`. Non-human principals (Slack `is_bot`, GitHub type `Bot`, `svc-*`) are kept as accounts but never become people.
4. Findings use the chain of evidence. When the graph is built, an account's edges are attributed to its linked person. The finding's grade is the weaker of the two pieces of evidence. For example, "GitHub says this account is admin" (`inferred`, T2) plus "a person linked this account to Ali" (`confirmed`) gives "Ali administers repo X", graded `inferred`. Each finding can cite both the raw payload and the link record. An account with no link stays visible as "owner not in directory". That's an existing orphan-scan finding, and it is correct.
5. Rules:
   - A person may have many accounts per platform.
   - An account links to at most one person.
   - A second link to a different person is rejected until the first is closed.
   - Links survive a person's departure, because the orphan scan needs them to find "key still tied to someone who left".
6. Fix the data at the source where possible. In the test org, people signed up for Jira and GitHub with personal addresses. The cleanest fix is for an Entra admin to add those addresses as aliases in the directory (`otherMails` or proxy addresses). Then the directory itself states the link, and matching is automatic and graded `stated`. Linking in our queue is for whatever the directory can't express, which in practice means GitHub.

### 16.3 What changes

| Area | Change |
|---|---|
| Types | Entity kind `account`, `identity_link` record type |
| Migration | New `identity_link` table. Re-key existing `person:<email>` directory people to `person:entra:<id>` (or `google`), keeping the old id as an alias. Back-fill links from `identity_queue.linked_person_id`. |
| Connectors | n8n and ai_admin emit `account` entities instead of `person`. New connectors do the same from day one. Entra fills aliases. |
| Graph build | Attribute account edges through active links. Weaker-grade rule. |
| Identity queue | Read from accounts without an active link. Suggestions come from the matcher. A bulk "confirm suggestion" action for one-time setup of about 120 accounts. |
| Checks and orphan scan | Unchanged in logic. They see people with attributed edges, plus unlinked accounts. |
| Tests | Rename does not split a person. Linking moves ownership. An automatic link never overrides a manual one. A suggestion is never applied. One account can't link to two people. |

Estimated effort is about 4–5 days, best done in phase 1, before the new connectors exist, so they're built on accounts from day one.

## 17. Database: is Supabase needed?

- The backend needs PostgreSQL, nothing Supabase-specific. It connects only through `DATABASE_URL` (`backend/src/db/client.ts`) and runs pg-boss jobs in the same database. The Supabase SDK variables in `backend/.env.example` (`SUPABASE_URL`, `SUPABASE_KEY`) are not used anywhere in `backend/src`.
- Postgres becomes mandatory once F1 is removed. Without a database there is no live data and no hourly sync.
- Options: any managed Postgres works (Supabase, Neon, Render Postgres), or local Docker Postgres for development. We already deploy the demo on Supabase, and the `.env.example` notes cover its pooler limits (session mode, 15 clients, keep `2 × (PG_POOL_MAX + PGBOSS_POOL_MAX)` under it). pg-boss needs a session-mode or direct connection, not the transaction pooler.
- Recommendation: a new, dedicated Supabase project for the live test org, holding only real data.
  - Not the current demo database. It was loaded by `resetDemoDeployment.ts`, carries the demo marker table, and under Q3 that seeding goes away.
  - Not the interns' Supabase project (`horquva-test-ahmed`). Its schema is theirs, and its secret key is exposed in a shared sheet.
  - Developers keep using local Postgres.
  - The free tier is enough at this size. Supabase pausing inactive free projects is something to check on their pricing page before relying on it.
