# OBA Core: product, market and technical feasibility for organisational intelligence

**Date:** 2026-10-27 · **Branch inspected:** `mvp/v1-continuity` @ `54d5acc7` · **Status:** research, no code changed

**What this builds on.** This repo already holds four studies that answer parts of this brief: the API feasibility study (2026-09-29), the engineering foundation (2026-09-29), the product scope (2026-09-30) and the Agent 365 connector scope (2026-10-21). I don't repeat their tables. I re-checked the claims that drive the recommendation, filled the gaps (competitors that handle departures, OAuth-grant APIs, n8n's current spec), and audited the code as it stands today.

**How to read the labels.**
- **Verified:** I read it in official docs or vendor source code during this study.
- **Conditional:** it's supported, but only with a licence, a permission or customer approval.
- **Inferred:** plausible, but not confirmed.
- **Unavailable:** not exposed by any supported interface.
- **[prior]** marks a fact carried over from an earlier study and not re-checked today.

**Limits of this study.**
- I had no access to a live customer tenant, n8n instance, Entra tenant or Google Workspace. Every API claim comes from documentation or source code, not from a call I made.
- Competitor capabilities come from vendor documentation and marketing, which I label as such.
- I found little independent evidence of customer demand (§3.4). I didn't make up any market-size numbers.

---

## 1. Executive assessment

1. **The product the brief describes no longer exists in this repo.**
   - The brief names many files from the legacy OBA app, and none of them are on this branch: `backend/brain/index.js`, `graphLoader.js`, `derived.js`, `voice.js`, `orchestrator.js`, `sql/02_seed_data.sql`, `sql/14_authored_entities.sql`, `tools/export-company.js`, `CommandBar.tsx`, `GlobalSearchOverlay.tsx`, `DeepLinkFocus.tsx` and `commandIndex.ts`.
   - `git ls-files` finds no match for any of them. They were deliberately replaced on 2026-09-29/30, when we decided to rebuild from scratch.
   - What runs today is a narrower product, the **Horquva / OBA Continuity Platform**. It's a discover → confirm → hand over → verify loop built around one moment: someone leaves.
   - It has 8 entity kinds, 6 edge types, graded facts, 4 checks, leaver/outage/succession simulations, attestation campaigns, departures with handover packs, post-departure verification, and a tool-calling assistant. Everything is single-org per deployment and backed by Postgres.

2. **The core mechanics are real. Almost all of the data is not.**
   - The four live connectors (Entra, Google, n8n, AI admin) exist and are wired to `/api/connections/:id/sync` and an hourly pg-boss job.
   - **None has run against a real customer system.** The demo runs on an authored fixture: 10 people, 6 automations, 1 model, 2 groups.
   - The n8n connector, which is our most important source, has **two defects that would empty the central finding on a real instance** (§2.3). It reads owner fields that n8n's API doesn't return, and it reads only the first page of workflows.

3. **The big "organisational intelligence" questions in the brief mostly can't be answered from obtainable data.** These have no API source anywhere (§5):
   - which business processes depend on what;
   - which dependencies management doesn't understand;
   - customer impact;
   - criticality;
   - backups.

   Earlier studies reached the same conclusion, and I found nothing that changes it. What *can* be observed is narrower: who exists, who's leaving, which automations, agents, apps and OAuth grants exist, which identity each one runs on, and whether it is actually running.

4. **The market has moved toward us, and that cuts both ways.**
   - Every automation platform now handles the *ownership* part of a departure itself. Zapier, n8n and Power Automate each let an admin transfer a leaver's workflows (§3.2).
   - SaaS-security tools such as Nudge Security already show a leaver's OAuth grants. Non-human-identity (NHI) vendors such as Astrix, Oasis and Token Security sell offboarding of machine identities to security teams.
   - So **"show me what a leaver owns" is now a standard feature, not a product.**

5. **The largest opportunity I found that's credible and still open is narrower and more specific:** *which running automations will break when this person's account is disabled, even after ownership is transferred?*
   - Ownership transfer doesn't move the identity a credential authenticates as. n8n's own community confirms that moving an OAuth credential doesn't change the underlying account. Zapier lets a leaver's private connections live on for up to 30 days and then lapse (§3.2).
   - This break is **predictable before the departure** from metadata we can read: n8n credential ownership plus usage, and Entra or Google OAuth grants by user.
   - It's also **checkable after the departure** from execution history. Our post-departure verifier already does this for n8n.
   - That before-and-after pair lets us **measure our own accuracy**. In my research, no competitor's documentation describes doing that.

6. **Recommendation:** build **Leaver Break Check**. Before a departure, it predicts the automations that run on the leaver's identity, with graded evidence. After the departure, it verifies the prediction against what actually ran.
   - It's a sharpening of the existing Departures feature, not a new product. Most of the plumbing exists.
   - It's an **integration-layer capability with a measurable-accuracy edge**, not a moat. If Nudge or an n8n-native feature covers workflow-level identity dependence first, the edge narrows to cross-platform coverage plus verification (§8.11).
   - **Before any of it:** fix the n8n connector, and run 3–5 manual scans to test demand (§10). The narrow pilot costs about **4–5 engineer-weeks**. A repeatable production version adds another **4–6** (§9).

---

## 2. Current-state audit (verified in code, 2026-10-27)

### 2.1 What exists and works

| Area | Where | State |
|---|---|---|
| Canonical model | `packages/types/src/index.ts` | `EntityKind`: person, automation, credential, model, vendor, group, app, process. `EdgeType`: owns, backs_up, depends_on, calls_model, runs_on_credentials_of, member_of. `EvidenceGrade`: stated / inferred / confirmed / unknown. Facts are SCD2 (`validFrom` and `validTo`). Grades are first-class, and "unknown is never no" is encoded in the types. |
| Graph + checks | `backend/src/domain/graph`, `domain/checks` | In-memory graph rebuilt from Postgres. 4 checks with PASS/FAIL/UNKNOWN: C1 unbacked critical, C2 departed owner on active asset, C3 undocumented critical, C4 missing fallback. Blast radius at `/api/graph/blast-radius`. |
| Simulations | `domain/simulation`, `routes/continuity.ts` | Deterministic leaver, outage, succession and combined simulations, plus worst losses. These are graph walks, not predictions, which is what the 2026-09-30 sim study recommended. |
| Change detection | `domain/changes/diffEngine.ts`, `services/snapshot` | Snapshot diff produces change events (person_left, owner_changed, workflow_edited, model_swapped, credential_risk, failures_spiked), plus a weekly briefing. |
| Attestation | `attestation/`, migration 005 | Campaigns, magic links (hashed and encrypted), reminders, audit trail, all on Postgres. |
| Departures | `routes/departures.ts`, `handover/` | Work at risk, handover pack (JSON and PDF), succession test, accept/decline/reassign, and `verify-executions` against n8n. |
| Identity resolution | `identity/matcher.ts`, `queue.ts` | Email-anchored matching, with a review queue for anything that doesn't match. |
| Connectors | `connectors/{entra,google,n8n,ai_admin,csv}`, `sdk/runner.ts`, `sdk/guard.ts` | Runner with sync runs, Guard host allow-list, AES-GCM secret encryption (`security/encryption.ts`), hourly sync via pg-boss, and an on-prem n8n collector script. |
| Assistant | `assistant/assistantService.ts`, `ai/gemini.ts`, `ai/graphAnswers.ts` | Tool-calling chat over the graph. Conversations persist (migration 007). |
| Auth | `auth/` | OIDC for Entra and Google, RBAC middleware, audit log, invite-only users, a production-safe demo login. |
| Deployment | `render.yaml`, Vercel project `horquva-continuity` | One instance per org. Demo deployment is live. |

### 2.2 What is simulated, seeded or authored

- **All the data you see in the demo is authored.** The source is `backend/tests/fixtures/handCheckableTruth.json` plus `db/seedDemoHistory.ts` and `resetDemoDeployment.ts`. The concentration, departures and work-at-risk figures in a demo come from that file.
- **Criticality, documented and fallback** are seeded by connectors as `unknown` and filled only by attestation. That's correct and honest. It also means a fresh real connection shows mostly "unknown" until a campaign runs.
- **Backups (`backs_up`) have no connector source.** Only attestation or a manual action creates them. The earlier finding still holds: no API provides a backup owner, except PagerDuty escalation level 2.
- **`process` entities and `depends_on` to business processes have no connector source.** They come only from CSV or the fixture.

### 2.3 Defects that block a real pilot (new findings)

I checked these against n8n's public-API source on `master`, read through `gh api` on 2026-10-27.

| # | Defect | Evidence | Effect on a real instance |
|---|---|---|---|
| D1 | **n8n owner is read from fields the API doesn't return.** The connector uses `wf.ownedBy?.email`, falling back to `wf.userId` (`connectors/n8n/index.ts:216-218`). n8n's workflow schema returns ownership as `shared[]: {role, workflowId, projectId}` (`getWorkflows.generated.yml`). It has no `ownedBy` and no `userId`. | n8n spec | **No `owns` edges get created.** Every workflow looks ownerless. C2, concentration and the leaver simulation all go empty or `UNKNOWN`. That's the headline finding gone. |
| D2 | **No pagination on n8n.** The connector calls `GET /api/v1/workflows` and `/users` once. The spec defaults `limit` to 100 (max 250) and returns `nextCursor`. | `shared/spec/parameters/limit.yml` | Instances with more than 100 workflows are silently cut off. Entra and Google *do* follow `@odata.nextLink` and `nextPageToken`. |
| D3 | **n8n credential owners aren't mapped.** Credentials become entities, and workflows get `runs_on_credentials_of` edges to them. No edge links a credential to a person. | `connectors/n8n/index.ts:114-135` | "This workflow runs on Ahmed's credential" is never produced from real data. Only the fixture has it. That is exactly the insight this report recommends. |
| D4 | **The AI admin connector reads the model catalogue, not usage.** OpenAI: `GET /v1/models` and `/v1/organization/users`. It never calls usage, costs, projects or API keys. | `connectors/ai_admin/index.ts` | Every model the vendor offers becomes a `model` entity, which is noise. Spend, key-to-agent mapping and per-project usage aren't collected. |
| D5 | **The Entra connector reads users and app registrations only.** It has no manager (the header claims one, but `$select` omits it), no service-principal (enterprise app) owners, no group owners and no OAuth grants. | `connectors/entra/index.ts:111,161` | Microsoft-side ownership is thin. This was already logged in the Agent 365 scope (§6), and it still isn't fixed. |
| D6 | **The post-departure verifier reads `N8N_BASE_URL` / `N8N_API_KEY` from env,** not from the stored connection. | `handover/postDepartureVerifier.ts:61` | Verification works only if someone also sets env vars by hand. A UI-configured connection isn't used. |
| D7 | **There are no unit tests for the connector mappers** against recorded API payloads. Only `tests/connectors/guard.test.ts` and a pg sync test exist. | `backend/tests/connectors/` | D1–D3 went unnoticed because nothing checks the mapper against n8n's real response shape. |

**Recommended action, independent of which feature we pick:** fix D1–D3 and D6. Add mapper tests against fixtures captured from a real n8n instance. Estimate: 3–4 engineer-days.

### 2.4 Missing

- **Entities:** service accounts / non-human identities as their own kind. Today they could only be `app` or `credential`. There's also no **OAuth grant** (a delegated consent from person X to app Y), and no Microsoft agent kind (deferred in the Agent 365 scope).
- **Relationships:** `authenticates_as` (credential → person), meaning the identity a token acts as, which is different from who owns the credential. There's also no `consented` (person → app) edge.
- **Sources:** OAuth grants (Entra `oauth2PermissionGrants`, Google `tokens.list`), service-principal sign-in activity, Make, Power Automate, Zapier, Okta, any HRIS.

### 2.5 Retain, replace, consolidate, remove

- **Retain:** graded facts with SCD2, the PASS/FAIL/UNKNOWN checks, deterministic simulations, attestation, the verifier, single-tenant deployment, the Guard allow-list and encrypted secrets. These are the right foundations. Don't rebuild them.
- **Replace:** the AI admin connector's model-catalogue read. Switch to the usage and API-key endpoints, or drop the connector from the pilot.
- **Consolidate:** the verifier's n8n access goes through the connection table (D6).
- **Remove, or keep only behind the demo:** anything a screen shows from `process` or `depends_on` entities, unless a CSV supplies them. They have no real source.

---

## 3. Market and competitor analysis

### 3.1 What "organisational intelligence" can honestly mean here

I looked at the adjacent categories: EA/application mapping (LeanIX, ServiceNow CMDB), SaaS management (Zylo, BetterCloud, Zluri, Torii), identity governance (Okta, Entra ID Governance), NHI security (Astrix, Oasis, Token), SaaS and AI security (Nudge, Zenity), process mining (Celonis) and observability (Datadog, Dynatrace). Each one owns a slice of "organisational visibility", and **each one sources its slice from a system of record or from telemetry it controls**.

Nobody sources "which business process depends on what" automatically. Process mining comes closest, and it needs event logs from ERP-class systems (Celonis's own positioning, [prior]).

So, for OBA, **organisational intelligence = an evidence-graded map of which people, identities and automations the operation runs on, plus what changes when one of them goes away.**

It is *not* a business-process model. It is *not* a score for the organisation either. The repo already reached that conclusion when it dropped 0–100 indexes from the screens.

### 3.2 The departure moment: who already handles what

This is the decisive table. The departure moment is our chosen wedge, so the question is what's already covered.

| Player | What it does for a leaver | Source type | Gap relative to "will it break?" |
|---|---|---|---|
| **Zapier** (native) | Super admins transfer a departing member's Zaps; bulk "Change Owner"; the remove-member dialog defaults the transfer to the account owner. Private app connections either expire 30 days after removal or keep working until the app's own expiry. Shared connections transfer to the account owner. Team/Enterprise only. [Verified: Zapier help] | Platform config | It moves ownership. It doesn't tell you which transferred Zaps will fail when the leaver's *Google or Microsoft* account is disabled upstream. |
| **n8n** (native) | When you delete a user, you choose to transfer their workflows and credentials to another user, or delete them. [Verified: n8n docs] A community report says a moved OAuth credential still authenticates as the original account, so it fails once the IdP account is disabled. [Community, not official] | Platform config | Same gap. It also only covers one instance. |
| **Power Automate** (native + CoE Starter Kit) | Admin centre shows ownerless (orphaned) flows. 2024 Wave 1 added recommendations listing flows owned by departed users (public preview in June 2024; current status unverified). The CoE kit can email the manager to pick a new owner. [Verified: Microsoft Learn / support article] | Platform config | Microsoft-only. Mostly *after* the fact (orphaned = already ownerless). |
| **Nudge Security** | Offboarding playbook: lists the leaver's app-to-app OAuth grants and scopes, suggests other users who could take over, records ownership transfers, and flags integrations tied to inactive users. Now claims coverage of AI agents and MCP connections. [Vendor marketing, 2023–2026] | IdP OAuth grants + email-based SaaS discovery | **Closest competitor.** It sees grants at the SaaS-app level. I found no evidence that it looks inside n8n or Make to see *which workflows* use the grant, or whether they ran afterwards. |
| **Zluri / BetterCloud / Torii** | Offboarding workflows: suspend accounts, transfer Drive ownership, reclaim licences. [Vendor docs / reviews] | IdP + SaaS APIs | Built to *execute* offboarding, not to predict breakage. |
| **Astrix / Oasis / Token Security** (NHI) | Inventory machine identities a person created; transfer, rotate and revoke as one lifecycle event. They cite "improper offboarding" as OWASP NHI Top 10 #1. [Vendor content] | Cloud/IdP/SaaS identity APIs | Buyer is the security team at enterprise scale. Focus is risk (leftover access), not continuity (things that stop working). |
| **Zenity / ServiceNow AI Control Tower / Microsoft Agent 365** | Agent inventory with owners. Agent 365 flags ownerless agents after the user is deleted and can move sponsorship to the manager. [prior, verified 2026-10-21] | Platform registries | Agent-centric. They don't cover n8n/Make-style workflows or the credential identity. |

**What this means:**
- **Inventory and ownership transfer are table stakes.** Building them doesn't differentiate OBA.
- **The open space is the gap between transferring ownership and the thing still working.** That's the identity a credential acts as, across platforms, predicted before the departure and checked after it.
- I didn't find this claimed by any of the vendors above. That is *absence of evidence in their documentation*, not proof that no one does it. Nudge is the most likely to close it (§8.11).

### 3.3 Category notes

- **EA / LeanIX:** G2 average 4.5 from 183 reviews. The recurring complaints are setup effort and a complex metamodel. Third-party summaries say value drops quickly when data maintenance is neglected. Our "documentation goes stale" thesis is plausible but **weakly evidenced**: I didn't pull full review text. LeanIX's buyer is the enterprise architect, not our buyer.
- **AI agent sprawl:**
  - Gartner (28 Apr 2026) projects that an average global Fortune 500 company will have more than 150,000 agents by 2028, up from fewer than 15 in 2025.
  - The same release says only 13% of organisations think they have the right agent governance.
  - Gartner separately predicts that 40% of enterprise apps will include task-specific agents by the end of 2026.
  - OutSystems' vendor survey (1,900 IT leaders) found that 94% are concerned that sprawl is adding complexity.
  - These numbers support *urgency in the category*. They say nothing about our ICP (200–2,000 people) specifically.
- **Workforce analytics / organisational network analysis:** we dropped collaboration scores and workload in September because they have no source. Nothing found today changes that, and scoring individuals carries compliance risk (see the US compliance plan).

### 3.4 Demand evidence, stated honestly

- **Direct:**
  - A Zapier community post asks for help getting Zaps back on track after "our systems person left".
  - The n8n community has threads on deleted users' workflows causing issues, and on sub-workflows and data tables failing after a transfer.
  - Vendors have shipped *native* transfer features (Zapier, n8n, Power Automate). That's the strongest signal: platforms build what enough customers ask for.
- **Indirect:**
  - The NHI category exists, and offboarding is ranked #1 in the OWASP NHI Top 10.
  - Nudge built an offboarding playbook.
  - Token Security reports that 53% of IT leaders fear attacks through accounts left behind by poor deprovisioning. That's a vendor survey, so weak evidence.
- **Not found:**
  - Independent data on how often automations break after a departure, or what it costs.
  - Any evidence of willingness to pay for this specifically.
  - My Reddit-targeted search returned no relevant threads. The `site:` filter wasn't applied, so this is a gap in the search, not proof of no demand.

  **Willingness to pay is the biggest unknown.** That's why §10 starts with a demand test, not a build.

---

## 4. Connector feasibility report

This covers only connectors that matter to the shortlisted features. Earlier studies already cover HRIS (Merge), PagerDuty, ServiceNow, Backstage, GitHub, Jira, Confluence, Slack, Agentforce and Copilot Studio; I don't repeat them, and I note only where today's findings change them.

| Platform / API | Intelligence value | Accessible data | Access / auth | Permissions | Licensing | Tenant approval | Limits | Update | Feasibility | Effort | MVP? | Status / evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **n8n public API v1** `/workflows`, `/workflows/{id}`, `/credentials`, `/users`, `/projects/{id}/users`, `/executions` | Which automations exist, who owns them and their credentials, which credentials each uses, whether they run | Workflow `nodes[].credentials{type:{id,name}}`, `shared[]{role,projectId}`, `activeVersionId`, `triggerCount`, `isArchived`; credential `shared[]` [prior]; executions with status | `X-N8N-API-KEY` | Owner-level key for full visibility; scoped keys only on Enterprise [prior] | API not on free trial [prior]; projects endpoints licence-gated [prior] | Customer creates the key | `limit` default 100, max 250, cursor paging (verified). **The credential's connected account identity isn't exposed** (secrets never returned). Execution and history retention is configurable and may be short [prior: history pruned at 24h by default] | Poll (daily minimum for history) | High (Cloud); medium (self-hosted behind a firewall: collector exists) | 3–4 d to fix D1–D3 | **Yes** | **Verified** (n8n spec on master) |
| **n8n** `GET /workflows/{id}/dependencies` | Sub-workflow, error-workflow, credential, data-table and agent dependencies, both directions | `type ∈ {agent, credential, dataTable, errorWorkflow, errorWorkflowParent, parentWorkflow, subWorkflow}`, `id`, `name`, `projectId`, `inaccessibleCount` | Same | `workflow:read` | Unknown | Same | **Last changed on master 2026-10-26.** Which release ships it is unverified | Poll | Later | 1 d | No (later) | **Verified spec; release unverified** |
| **Microsoft Graph** `GET /oauth2PermissionGrants?$filter=principalId eq '{user}'` | Which apps person X gave delegated consent to (the token acts *as X*) | `clientId` (service principal of the app), `consentType` (AllPrincipals / Principal), `principalId`, `resourceId`, `scope` | App-only OAuth | `Directory.Read.All` (least privileged, application) | Entra ID Free (no licence noted) | Admin consent | Supports `$filter` `eq`; replication delay for recent grants | Poll / delta | High | 1.5 d | **Yes** | **Verified** (Graph v1.0 docs) |
| **Microsoft Graph** `/servicePrincipals/{id}/owners`, `/groups/{id}/owners`, `/users/{id}/manager` | Owners of enterprise apps and groups; manager for escalation | Directory objects | App-only | `Application.Read.All`, `GroupMember.Read.All`, `User.Read.All` [prior] | Free | Admin consent | Apps created by admins or from the gallery are often ownerless [prior] | Poll / delta | High | 1.5 d | Yes (fixes D5) | **Verified [prior]** |
| **Microsoft Graph beta** `GET /reports/servicePrincipalSignInActivities` | Is an app or service principal still being used (last sign-in, delegated vs app-only) | `appId`, `lastSignInActivity`, `delegatedClientSignInActivity`, `applicationAuthenticationClientSignInActivity` | App-only | `AuditLog.Read.All` | **Beta only** (Microsoft says not for production). Licence requirement not on the page I read; Entra P1 is likely, unverified | Admin consent | Beta can change; global cloud only | Poll | Conditional | 1 d | Optional | **Conditional** |
| **Google Admin SDK** `GET admin/directory/v1/users/{userKey}/tokens` | Which third-party apps person X has issued OAuth tokens to | Per-user token list (Token schema fields like clientId, displayText and scopes: **not confirmed on the page I read**) | Service account with domain-wide delegation, or admin OAuth | `admin.directory.user.security` | Workspace (any edition, inferred) | Super-admin DWD grant | **Per user**, so N calls for N users. Fine at 2,000 users, needs quotas checked | Poll | High | 2 d | **Yes** (Google customers) | **Verified** endpoint and scope; fields **inferred** |
| **Okta** user app links, user grants, user clients | Same as above for Okta shops | App links per user; consent grants per user/client; clients with tokens for a user | API token or OAuth service app | `okta.users.read`, `okta.apps.read` (inferred) | Okta WIC | Admin | ISPM features (orphaned accounts) not checked | Poll | Medium-high | 3 d | Later | **Verified** endpoints exist (SDK docs); scopes **inferred** |
| **Make** `GET /connections?teamId=` | Which connections exist per team | `id, name, accountName, accountLabel, packageName, expire, metadata{value,type: string/email}, teamId, scoped, editable, …` | `Authorization: Token` | `connections:read` | Make plan with API | Customer token | **No creator/owner field documented.** `metadata.type=email` *may* hold the connected account's email (unconfirmed). Scenario `createdByUser` exists [prior] | Poll | Medium | 3–4 d | Later | **Verified** fields; identity **inferred** |
| **Zapier** `GET /v2/zaps` | Zaps and steps | No owner field; App Directory listing needed [prior] | OAuth | `zap:account:all` | — | — | Partner listing is a blocker | — | Low | 4–8 wk | No | **Verified [prior]** |
| **Power Automate** (admin connectors / PowerShell / Dataverse `workflow`) | Flows, owners, connection references | Not re-checked in this study | — | Power Platform admin | — | — | Microsoft natively surfaces orphaned flows already | — | Medium | 2–3 wk | No | **Inferred** |
| **OpenAI Admin** `/v1/organization/usage/*`, `/costs`, `/projects`, `/admin_api_keys` | Spend and usage per project or key; which keys exist | [prior] | Admin key | — | — | Customer creates key | Maps to agents only if keys are per agent [prior] | Poll | High | 2 d (replace D4) | Optional | **Verified [prior]** |
| **Anthropic Admin** usage report, API keys, workspaces | Same | [prior] | Admin key | — | — | — | Same | Poll | High | 1 d | Optional | **Verified [prior]** |
| **Microsoft Agent 365 / Entra Agent ID** | Microsoft-governed agents + owners | See 2026-10-21 scope | App-only | `AgentIdentity.Read.All`, `CopilotPackages.Read.All`; sponsors need ReadWrite | Agent 365 licence for the catalogue | Admin | No owner field in the catalogue | Poll | Conditional | ~12 d | No (v1.x) | **Verified [prior]** |
| **AWS / Azure / GCP / Kubernetes** | Cloud resources and IAM | Not investigated in depth | — | — | — | — | Config inventory ≠ dependency on people; owner tags are rarely reliable (inferred) | — | Out of ICP | — | No | **Not assessed**. Deliberately out of scope for a 200–2,000-person ops buyer, and cloud posture is owned by Wiz-class tools |
| **Slack / Teams / SharePoint / Drive** | Activity metadata | [prior] Slack: no LLM training, history throttled | — | — | — | — | Content access is a privacy event | — | Low | — | No | **[prior]** |

---

## 5. Insight feasibility map

I took each of the brief's research questions and asked whether it can be answered from data we can actually obtain.

| Question | Answerable? | How / why not |
|---|---|---|
| What is actually running? | **Partly.** Automation and agent platforms we connect to, plus OAuth-consented apps | n8n, Make, IdP grants and Agent 365. Code-built agents are invisible without a CMDB or Backstage. |
| Which processes depend on which apps, people and services? | **No** (business process); **yes** (automation → credential → app) | No API models business processes. Automation graphs model *workflow* dependencies. |
| Undocumented dependencies management doesn't know about? | **Within automations only** | "Workflow X runs on Y's personal Google token" is detectable. Cross-system tacit dependencies are not. |
| What happens if a person, service account or vendor becomes unavailable? | **Yes, for automation-mediated effects** | Graph walk over owns, runs_on_credentials_of, calls_model and the new authenticates_as / consented edges. Accuracy depends on the edge grades. |
| Critical processes with no verified owner or backup? | **Owner: partly. Backup and criticality: attestation only** | Unchanged from September. |
| Duplicate tools and unnecessary cost? | **Partly** | AI vendor spend via admin APIs. General SaaS spend needs finance data. Zylo and Torii own this category. |
| Which AI agents and automations can reach sensitive systems? | **Yes, by scope** | OAuth grant `scope` strings and n8n credential types. Whether data is actually *sensitive* isn't knowable without content access. |
| Single points of failure with measurable risk? | **Concentration: yes. "Measurable business risk": no** | Counts are computable. Money impact is not. |
| Known vs inferred vs unverified? | **Yes**, already in the model | The grades exist. Keep them visible. |
| What should management change, and why? | **Yes, as evidence-backed actions** | Rules over the graph, each with its evidence links. |

### 5.1 The recommended insight, traced end to end

**Insight:** *"If Sarah's account is disabled on Friday, 4 active automations will probably stop: 2 because they run on her Google OAuth token (stated + corroborated), 2 because they call her personal credential in n8n (stated owner; identity inferred). 1 of the 4 ran 312 times last week."*

```
SOURCE                          API DATA                                   RECORD / EDGE                         GRADE
Entra / Google directory        user.accountEnabled, employeeLeaveDate     person (leaving)                      stated
  or OBA departure entry        (or HR-entered departure)
n8n /credentials                shared[]{role:'credential:owner',          person ─owns→ credential              stated
                                projectId} → /projects/{id}/users
                                (personal project ⇒ one user)
n8n /workflows/{id}             nodes[].credentials{type:{id,name}}        automation ─runs_on_credentials_of→   stated
                                                                           credential
n8n credential type             e.g. googleSheetsOAuth2Api,                credential ─authenticates_as→ person  inferred
                                microsoftOutlookOAuth2Api                  (OAuth type + personal owner)
Google tokens.list(user) /      clientId == customer's n8n OAuth client    corroborates authenticates_as         stated → raises to
Entra oauth2PermissionGrants    principalId == user, clientId == n8n app                                         "corroborated"
n8n /executions                 status, startedAt per workflow, 30 days    fact run_volume_weekly                stated
                                                                                  ↓
CHECK (new)  C5_RUNS_ON_LEAVER_IDENTITY: active automation, ran in the last 30 days,
             credential authenticates_as a person who is leaving or has left
             → FAIL / UNKNOWN (identity not inferable) / PASS (service account or shared credential)
                                                                                  ↓
UI           Departure page "Will break" list, each row: evidence chain + grade + run volume
ACTION       "Re-authorise credential X under a service account before <date>", assigned to the successor
VERIFY       After accountEnabled=false: n8n executions for those workflows → error / stopped / fine
             → prediction scored true or false (precision / recall, §10)
```

**The ten questions, for this insight:**

1. **Fields:** n8n credential `shared[]` and `type`; workflow `nodes[].credentials` and `activeVersionId`; executions `status` and `startedAt`; Entra grant `principalId`, `clientId` and `scope`; Google `tokens.list` items; directory `accountEnabled` (+ leave date).
2. **APIs:** in the matrix above.
3. **Permissions:** n8n owner key; `Directory.Read.All` (Entra); `admin.directory.user.security` (Google).
4. **Matching:** n8n user email ↔ directory email. n8n OAuth client ↔ Entra service principal `appId` or Google `clientId`. The customer enters their n8n OAuth client ID once at setup; n8n doesn't expose it, because it sits in the credential's secret data.
5. **Observed vs inferred:**
   - *Observed:* who owns the credential, which workflows use it, run volume, grants per user.
   - *Inferred:* that the credential's token is the owner's *own* account. Someone could connect a shared mailbox under a personal credential.
   - *Corroborated:* when the IdP shows that same user granted consent to the n8n OAuth client.
6. **Missing identifiers:**
   - n8n user with no directory match → identity queue (exists).
   - Credential in a team project with no single owner → `UNKNOWN`, never "safe".
   - API-key credential type (not OAuth) → ownership only, no identity inference; label it "breaks only if the key is revoked".
7. **Independent verification:** yes. After the account is disabled, execution status confirms or refutes each prediction. That's what makes this feature different.
8. **Freshness:**
   - Credential and workflow config: daily.
   - Executions: daily (retention may be short).
   - Grants: daily.
   - Before a known departure date: an on-demand sync.
9. **Confidence:** the existing grade, plus a "corroborated" display state. The check's reason string names which link is inferred.
10. **Incomplete evidence:** the check returns `UNKNOWN` with what's missing ("no executions readable", "credential in shared project"). Never "PASS", and never a risk score.

---

## 6. Feature opportunity matrix

**How I scored:** 1–5 per criterion, 5 = best (for effort and burden, 5 = least). Unweighted sum. Evidence is cited in §§2–5.

| Criterion | A. Leaver Break Check | B. AI agent & automation register | C. AI/SaaS spend & duplicate tools | D. Silent-failure watch (automation reliability) | E. Change-impact for automation edits |
|---|---|---|---|---|---|
| Demonstrated demand | 3. Native transfer features show the pain; WTP unknown | 3. Gartner and analysts; enterprise-skewed | 4. An established paying category | 3. Review complaints about silent Zap failures | 2. No direct evidence |
| Business impact / urgency | 4. A dated event (departure) forces action | 3 | 3 | 4. Failures are happening now | 2 |
| Differentiation | 4. Predict + verify identity breakage across platforms; no vendor doc claims it | 1. Zenity, ServiceNow, Agent 365 | 1. Zylo, Torii | 2. n8n error workflows, Datadog | 3 |
| Data quality / availability | 4. Stated + one inferred link, corroborable | 3. Owners are often missing | 3. Only AI vendor APIs; SaaS spend needs finance data | 5. Executions are stated | 3. n8n deps endpoint unreleased? |
| Connectors needed (fewer = better) | 4. n8n + one IdP | 2. Many platforms | 2 | 4. n8n (+Make) | 4 |
| Time to MVP | 4. ~4–5 eng-wk on existing plumbing | 2 | 3 | 4 | 3 |
| Maintenance burden | 3 | 2 | 3 | 4 | 3 |
| Security / compliance load | 3. Directory.Read.All + DWD is a security review | 2. Broad scopes | 3. Finance data | 4. n8n only | 4 |
| Pilot demonstrability | 5. "We said these 4 would break; 3 did" | 3 | 4. A dollar figure | 4 | 2 |
| Recurring usage / expansion | 3. Per departure, plus a monthly scan | 4 | 4 | 5. Daily | 3 |
| Fit with current architecture | 5. Departures, verifier, checks and grades exist | 3 | 2. No cost model | 4. failures_spiked exists | 3 |
| Defensibility as data grows | 4. Labelled outcomes (prediction vs actual) accumulate | 2 | 2 | 2 | 3 |
| **Total (/60)** | **46** | **30** | **34** | **45** | **35** |

**Reading the scores:**
- A and D are close. D is easier to build and gets used more often, but it competes with n8n's own error workflows and every observability tool.
- A is the one with a reason to exist that others lack.
- **D's core (executions + failures_spiked) is also A's verification step,** so building A gives a thin version of D for free. Sell D as part of A, not as a separate product.

---

## 7. Primary recommendation: Leaver Break Check

1. **Customer problem.** When someone leaves, their automations get *ownership-transferred* but keep *authenticating as them*. Disabling the account then breaks the automations quietly: Zapier private connections lapse, and n8n OAuth credentials fail. Nobody finds out until downstream data goes missing.
2. **Buyer / ICP.**
   - Who: the Head of Ops, IT or AI lead at a 200–2,000-person company that runs **n8n (Cloud or reachable self-hosted)** on **Microsoft 365 or Google Workspace**.
   - Trigger: a meaningful number of production workflows built by a few people.
   - Sponsor: the COO (unchanged from the Master Brief).
3. **Why now:**
   - Agent and automation counts are rising (Gartner, Apr 2026).
   - Platforms have only just shipped *ownership* transfer, which makes the *identity* gap the next visible failure.
   - n8n is adding dependency APIs, which makes the graph richer.
4. **Competitor coverage:** transfer of ownership (Zapier, n8n, Power Automate); leaver OAuth grants at the SaaS-app level (Nudge); NHI lifecycle for security teams (Astrix, Oasis, Token); agent ownerless detection (Agent 365).
5. **What they don't cover adequately (per their documentation):**
   - workflow-level prediction of which *running* automations depend on the leaver's identity, across the IdP and the automation platform;
   - checking that prediction afterwards.

   This is an evidence-limited claim; see §8.11.
6. **Why OBA is well placed:**
   - The departure entity, handover pack, successor flow, graded evidence, `UNKNOWN` semantics, execution verifier and attestation all exist today.
   - The new work is two connector extensions and one check.
7. **What the user sees:**
   - The departure page gets a "Will break when the account is disabled" list. Each row shows the workflow, the credential and the identity it acts as, its grade (stated / corroborated / inferred), its runs per week, and an action: "Re-authorise under a service account" or "Move to shared credential".
   - The successor accepts the actions.
   - After the disable date, each row turns ✓ (still running) or ✗ (failed or stopped), with the run evidence.
   - Ask OBA gets a tool: "What breaks if Sarah leaves?"
8. **The insight:** a short, ranked, evidence-linked list of automations at risk from one departure, with confidence. Not a score.
9. **Decision enabled:** what to re-credential before the account is disabled, and whether to delay the disable.
10. **Why someone would pay:**
    - It prevents a visible operational failure that happens on a known date.
    - The proof is auditable: here's what we predicted, here's what happened.
    - It's a recurring event at any company with turnover.

    This is a hypothesis; the demand test must confirm it.
11. **What would invalidate it:**
    - Design partners say their automations use service accounts already, so the list comes back empty.
    - The n8n community claim that a moved OAuth credential keeps the old identity turns out false in testing.
    - Predicted breaks rarely happen because IdP disable doesn't revoke refresh tokens quickly. That's plausible for Google and needs testing.
    - Nudge or n8n ships this natively within the pilot window.
12. **Demand test before building:** see §10, Stage 1.

**Classification:**
- This is a **valuable integration layer with a measurable-accuracy edge**, not a defensible platform moat on its own.
- The defensible part is the growing record of predictions against outcomes. That data only exists if we run the loop at customers.
- I could not establish a stronger competitive advantage than this.

---

## 8. Production architecture: how it fits the existing system

- **Raw → canonical:** use what exists. Raw payloads go through `ConnectorRunner` and `persistSync` (grade-aware, closes vanished rows), then SCD2 edges and facts.
- **Model changes (minimal):**
  - New `EdgeType` **`authenticates_as`** (credential → person) and **`consented`** (person → app). No new `EntityKind`: OAuth clients are `app`, n8n credentials stay `credential`.
  - Add grade display "corroborated" as a *view* over `inferred` plus a matching `consented` edge, not a new grade. That keeps the 4-grade invariant.
  - **Check consumers of `EdgeType`** (the map's edge styling, simulation walks, the Assistant's graph answers) when adding the two types.
- **Connectors:**
  - n8n: fix D1–D3. Read `shared[]` and resolve through `/projects/{id}/users`; paginate on `nextCursor`; map credential owners.
  - Entra: add `oauth2PermissionGrants`, service-principal owners and manager (closes D5).
  - Google: add a per-user `tokens.list`.
- **Graph / rules:** new check `C5_RUNS_ON_LEAVER_IDENTITY` in `domain/checks`. The leaver simulation follows `runs_on_credentials_of → authenticates_as`.
- **Verifier:** read n8n from the connection table (D6). Record each prediction's outcome as a fact (`prediction_outcome`) so accuracy can be reported.
- **Trust:**
  - Every row links to its evidence (the source ref on the edge).
  - Inferred links are labelled in words.
  - Missing data gives `UNKNOWN` with a reason.
  - No numeric risk score.
- **Production safety:**
  - Single tenant per deployment (already decided).
  - Encrypted connection secrets exist.
  - Still open:
    - **n8n owner keys aren't read-only** below Enterprise, so "read-only" must be enforced by us and disclosed [prior].
    - `Directory.Read.All` and Google DWD with `admin.directory.user.security` are **security-review events**. Ship a one-page permission justification.
    - Key rotation and revocation UX.
    - Retention policy for raw payloads.
    - Grants contain no content, but they reveal which apps each employee uses. Treat that as personal data under the US compliance plan.

---

## 9. Implementation roadmap

All assumptions: one engineer who knows this codebase; n8n test instance available; Entra and Google test tenants available. Confidence is ±30% unless noted.

| Stage | Work | Effort | Confidence |
|---|---|---|---|
| **1. Validation** | Script-only scans (no product UI) at 3–5 design partners: n8n + one IdP. Hand-deliver the "will break" list. Test the identity-persistence hypothesis in our own n8n with a disabled Google and Entra user, measuring how long until the credential fails. | 1.5–2 wk elapsed, ~5 eng-days | Medium (depends on partners) |
| **2. Connector** | Fix D1–D3 and D6 plus mapper tests on captured payloads (3–4 d); Entra grants, SP owners and manager (3 d); Google tokens (2 d); setup UI for the n8n OAuth client ID (1 d) | ~2 eng-wk | Medium-high |
| **3. Intelligence** | `authenticates_as` / `consented` edges, C5 check, simulation walk, prediction-outcome facts, accuracy query; tests on a hand-checkable fixture plus captured real payloads | ~1 eng-wk | High |
| **4. Product** | Departure "Will break" panel, successor actions, after-disable ✓/✗, Ask OBA tool, PDF pack section | ~1–1.5 eng-wk | High |
| **5. Pilot** | 2–3 partners, 6–8 weeks elapsed, at least 5 real departures observed in total | Support ~20% of one engineer | Low (depends on departure volume) |
| **Narrow pilot total** | | **≈ 4–5 eng-weeks** | |
| **Production, repeatable** | Admin-consent onboarding flow and permission docs, key rotation and revocation, collector packaging for self-hosted n8n, raw retention and deletion, connector health monitoring, SOC 2-ready audit evidence | **+4–6 eng-weeks** | Low-medium |

**Blockers:**
1. Test tenants: the same D-3 question as the Agent 365 scope.
2. Design partners willing to grant `Directory.Read.All` or DWD.
3. Departure volume at small partners may be too low to measure accuracy in 8 weeks. Mitigation: simulate by disabling *test* accounts that own copies of real workflows.

---

## 10. Validation plan

**Stage 1: demand and technical proof of concept. Stop if it fails.**
- **Technical:**
  - In our own n8n (Cloud and self-hosted), create OAuth credentials for Google and Microsoft under user U. Transfer the workflows to user V. Disable U in the IdP.
  - Record whether the workflows fail and how long until they do.
  - **If they keep running for more than 30 days, the core premise is weak. Stop or reframe.**
- **Demand:** offer 5 target companies a free "Leaver Break Check" for their next departure.
  - Success signal: at least 3 agree to the script-based scan.
  - Then at least 2 find at least 1 automation they didn't know would break.
  - Then at least 1 agrees to a paid pilot, or to a letter of intent.

**Acceptance criteria for the pilot.** Targets are set only where there's a basis; otherwise I give a baseline method.

| Metric | Target / method |
|---|---|
| Source records ingested | 100% of workflows and credentials the key can see. Check against the n8n UI count. Any shortfall is a bug, not a threshold. |
| Identity matching | Baseline: % of n8n users matched to the directory automatically; manually review a sample of 50. No target until measured. |
| Insights with traceable evidence | 100%. Every row must link to source refs. Enforced by a test. |
| **Prediction precision** (predicted breaks that did break, or would have without remediation) | Baseline from Stage 1. Proposed bar: ≥ 0.7 to proceed. |
| **Recall** (breaks after departure that we hadn't predicted) | Measured from failed executions in the 14 days after disable. Each miss gets a root cause. |
| Freshness | Daily sync success ≥ 95% of days, plus an on-demand sync before each disable date. |
| Time to first result | Baseline from Stage 1 setup (key + consent → first list). Goal under 1 hour of customer time; measure first. |
| Time saved | Interview: how they currently find a leaver's automations. Compare. |
| Previously unknown verified dependencies | Count per scan of rows the customer confirms they didn't know about. This is the main value signal. |
| Commercial | Paid conversion of ≥ 1 of 3 pilots; repeat use on a second departure. |

**Stop or change direction if any of these happen:**
- the Stage 1 premise test fails;
- fewer than 2 of 5 prospects take a free scan;
- precision is below 0.5 after 5 departures;
- partners resolve every finding with the native transfer features alone;
- a competitor ships workflow-level identity prediction before the pilot ends.

---

## 11. Open questions

1. Does an IdP disable actually break n8n, Zapier and Make OAuth credentials, and how fast? This is Google refresh-token revocation versus Entra token lifetime. **It is the premise of the whole recommendation.**
2. What exactly does the Google `tokens.list` Token object contain? Does `clientId` reliably match the customer's n8n OAuth client?
3. Do n8n credential types reliably separate OAuth (identity-bound) from API keys? Is there a stable list?
4. Which n8n release ships `GET /workflows/{id}/dependencies`, and what do older instances return?
5. Does Make's connection `metadata` (type email) expose the connected account's email? If yes, Make joins the MVP cheaply.
6. What is the licence requirement for `servicePrincipalSignInActivities`, and is there a v1.0 timeline?
7. Does Nudge Security inspect workflow-level usage inside n8n or Make? Test it with a trial or a demo request.
8. Willingness to pay, and who owns the budget: Ops or IT?
9. What will partners' security reviews say about `Directory.Read.All` and DWD? Is a narrower path acceptable, such as delegated admin, or the customer running our script?

---

## 12. Sources

**Code (this repo, `mvp/v1-continuity` @ 54d5acc7):**
- `packages/types/src/index.ts`
- `backend/src/connectors/{n8n,entra,google,ai_admin}/index.ts`
- `backend/src/handover/postDepartureVerifier.ts`
- `backend/src/jobs/scheduler.ts`
- `backend/src/services/dataService.ts`
- `backend/src/domain/checks/index.ts`
- `backend/src/routes/*.ts`
- `backend/tests/fixtures/handCheckableTruth.json`

**Prior studies (this repo):**
- `docs/research/2026-09-29-horquva-feasibility-study.md`
- `2026-09-29-horquva-product-engineering-foundation.md`
- `2026-09-30-product-scope.md`
- `2026-09-30-simulation-prediction-feasibility.md`
- `2026-10-21-agent365-connector-scope.md`

**n8n:**
- Public API spec on master (read via GitHub API, 2026-10-27): `packages/cli/src/public-api/v1/handlers/workflows/spec/paths/getWorkflows.generated.yml`, `getWorkflowDependencies.generated.yml`, `shared/spec/parameters/limit.yml`, `shared/spec/schemas/dependencyListPublicDto.generated.yml`. https://github.com/n8n-io/n8n/tree/master/packages/cli/src/public-api/v1
- Add and remove users: https://docs.n8n.io/administer/manage-users-and-access/add-and-remove-users
- Projects: https://docs.n8n.io/administer/manage-users-and-access/set-permissions-and-roles-rbac/organize-work-in-projects
- Community: https://community.n8n.io/t/deleted-users-workflows-causing-issues/300857 · https://community.n8n.io/t/considerations-when-deleting-user-account/300701

**Microsoft:**
- oauth2PermissionGrants list: https://learn.microsoft.com/en-us/graph/api/oauth2permissiongrant-list?view=graph-rest-1.0
- servicePrincipalSignInActivities (beta): https://learn.microsoft.com/en-us/graph/api/reportroot-list-serviceprincipalsigninactivities?view=graph-rest-beta
- Orphaned flows: https://learn.microsoft.com/el-gr/troubleshoot/power-platform/power-automate/flow-management/manage-orphan-flow-when-owner-leaves-org
- CoE orphan components: https://learn.microsoft.com/en-us/power-platform/guidance/coe/setup-orphan-components
- 2024 Wave 1 orphaned-flow recommendations (third-party): https://azurecurve.co.uk/2024/07/new-functionality-in-microsoft-power-automate-2024-wave-1-recommendations-to-reassign-orphaned-cloud-flows

**Google:**
- Directory API tokens.list: https://developers.google.com/workspace/admin/directory/reference/rest/v1/tokens/list

**Okta:**
- Users API: https://developer.okta.com/docs/reference/api/users
- Java SDK UserApi: https://developer.okta.com/okta-sdk-java/apidocs/org/openapitools/client/api/UserApi.html

**Make:**
- Connections API: https://developers.make.com/api-documentation/api-reference/connections

**Zapier:**
- Remove members: https://help.zapier.com/hc/en-us/articles/8496281082253-Remove-members-from-your-Team-or-Company-account
- Bulk change Zap owner: https://community.zapier.com/product-updates/new-feature-bulk-actions-change-zap-owner-24210
- Remove-member offboarding: https://community.zapier.com/product-updates/improved-offboarding-with-remove-member-feature-24676
- Shared connection transfer: https://community.zapier.com/product-updates/transferring-shared-app-connections-when-a-team-member-leaves-3025
- Community request: https://community.zapier.com/troubleshooting-99/need-help-with-zapier-after-losing-a-team-member-50938

**Competitors (vendor content unless noted):**
- Nudge Security: https://www.nudgesecurity.com/post/nudge-security-vs-grip-security · https://www.nudgesecurity.com/connected-app/google-workspace · https://thehackernews.com/2023/11/how-to-automate-hardest-parts-of.html
- Astrix, improper offboarding: https://astrix.security/glossary/what-is-improper-offboarding-nhi/
- NHI offboarding coverage: https://nhimg.org/articles/offboarded-employees-leave-behind-hidden-non-human-identity-risk/ · https://nhimg.org/articles/decommissioning-orphaned-nhis-is-a-lifecycle-governance-problem/
- Zluri workflows: https://help.zluri.com/docs/workflows-onboarding-and-offboarding
- SAP LeanIX reviews (G2): https://www.g2.com/products/leanix-enterprise-architecture-management/reviews
- RFP.wiki summary (low confidence): https://www.rfp.wiki/it-security/enterprise-architecture-tools/leanix

**Market:**
- Gartner, six steps to manage AI agent sprawl (2026-04-28): https://www.gartner.com/en/newsroom/press-releases/2026-04-28-gartner-identifies-six-steps-to-manage-artificial-intelligence-agent-sprawl
- OutSystems survey (vendor): https://www.outsystems.com/news/enterprise-ai-agent-report-2026/
