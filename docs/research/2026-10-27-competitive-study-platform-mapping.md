# From competitive study to platform: what OBA has, what it lacks, what to build

**Date:** 2026-10-27 · **Builds on:** `2026-10-27-competitive-landscape-agents-and-org-intelligence.md` (the market) and `2026-10-27-organizational-intelligence-feasibility.md` (the code audit) · **Branch:** `mvp/v1-continuity` @ `64bfb914`

**What this document does.** It takes every competitor finding and maps it onto OBA's actual code:
- the module and file it touches;
- what we have today;
- what the competition does better;
- the exact change that would turn it into an advantage.

**Labels**, as in the landscape study:
- **[P]** primary vendor documentation or source code read this session;
- **[S]** secondary source;
- **[U]** unverified;
- **[C]** checked in our own code.

---

## 0. Bottom line

1. **OBA's architecture already points at the open position. Its data and framing don't yet.** The unusual parts competitors lack are already built [C]:
   - **Graded facts**, where "unknown" is never "no" (`packages/types` `EvidenceGrade`).
   - **A people-centred graph:** `owns`, `backs_up`, `runs_on_credentials_of`, `member_of`.
   - **Departures with a check after the account is disabled** (`handover/postDepartureVerifier.ts`).
   - **Snapshot diffs into change events.**

   None of the nine registry vendors grades evidence. None checks after a change. Only Agent 365 reacts to a leaver, and only by moving sponsorship [P].

2. **The gap is breadth and identity, not concept.** Today the graph is fed by:
   - n8n, which works since `6b145ee3`;
   - users and app registrations from Entra and Google;
   - a model *catalogue* from OpenAI. That's noise: it lists every model OpenAI sells (D4).

   Every platform the market says matters is missing: Copilot Studio and Power Automate, Agent 365 and Agent ID, Agentforce, AWS and Google registries, AI keys. The identity matcher only joins on email [C], but most of those platforms identify people by **object ID**, not email (§3.2).

3. **One new fact changes the Microsoft picture.** Microsoft's Power Platform inventory now advertises **"Prevent orphaned agents: proactively find resources owned by departing users"** [P].

   So for Copilot Studio agents and Power Automate flows, **Microsoft already ships a basic leaver view in its own admin centre.** Our Microsoft-only version of "what does the leaver own" is now a free feature.

   But Microsoft's own documentation shows where it stops [P]:
   - for flows, the Owner column **"shows the user who created the flow. It doesn't update when the owner changes"**;
   - programmatic inventory queries **only accept delegated user tokens** (a service principal gets 403);
   - nothing covers n8n, Make, Agentforce, AWS or API keys;
   - nothing checks afterwards.

   That's precisely the ground OBA should take.

4. **Three moves turn the platform into the position the study supports:**
   - **(A) Read the registries, don't rebuild them.** Add connectors for Power Platform inventory, Agent ID / Agent 365, Agentforce metadata, AWS and Google registries, and AI keys. Many are a few days each, because the SDK, runner, grades and raw storage already exist.
   - **(B) Multi-key identity resolution.** Join on Entra object ID, Google ID, Salesforce user ID, AWS principal ARN, and OpenAI/Anthropic user ID, as well as email. This is the hard, defensible core (§3).
   - **(C) Make the lifecycle cascade the product.** An HR or identity event (leaver, mover, manager change) runs the existing simulation, checks and verifier across **every** platform, with a check on each platform afterwards. Today that only happens for n8n (§4).

5. **Cut or hide** what competitors do better or free:
   - registry-style inventory as a headline (the Assets page becomes a view, not the pitch);
   - "AI model" entities from vendor catalogues;
   - any security or threat framing.

---

## 1. Where OBA stands against the market, capability by capability

"Best in market" is the strongest competitor implementation found. "OBA today" is checked in code [C].

| Capability | Best in market | OBA today [C] | Gap | Change (§ = detail below) |
|---|---|---|---|---|
| Agent / automation inventory | ServiceNow AICT (~30 integrations) [S]; Agent 365 with registry sync [P] | n8n workflows + Entra app registrations | Large but **commoditised** | Read vendor registries (§2). Don't market inventory. |
| No-code workflow coverage | Power Platform inventory (Microsoft only) [P]; nobody cross-vendor | n8n (fixed) | Make, Power Automate, Zapier | §2.3 Power Platform, §2.7 Make |
| AI API keys → person | NHI vendors (enterprise) [S] | **None.** The AI connector reads model catalogues (D4). | Large, and cheap to close | §2.1. OpenAI and Anthropic key APIs give the owner directly [P]. |
| Owner semantics | Agent ID owners and sponsors [P]; CMDB `owned_by` [S] | One `owns` edge type, graded | No distinction between creator, owner, sponsor and key principal | §3.3 |
| Identity resolution across platforms | Each vendor only within itself | Email and alias matcher, service-account heuristic (`identity/matcher.ts`) | **No object-ID join** | §3.2. **Core moat.** |
| Org context (manager, team) | Glean, Work IQ (for search) [P/S] | `member_of` groups. **No manager** (Entra `$select` omits it, D5). | Manager, team, mover events | §2.2 |
| Reacting to leavers and movers | Agent 365 sponsor → manager [P]; Power Platform "owned by departing users" [P]; Nudge playbook [S] | Departures (manual or HR entry), handover packs, successor acceptance | Automatic trigger from the identity provider; movers; cross-platform | §4 |
| Dependency / blast radius | ServiceNow CMDB [S]; Agent 365 context map (preview) [P] | `graph/blast-radius`, simulations; edges `depends_on`, `calls_model`, `runs_on_credentials_of` | Connector-level dependencies for Microsoft (`powerPlatformConnectors` [P]) | §2.3 |
| Checking after a change | **Nobody** cross-platform | n8n executions only (`postDepartureVerifier.ts`) | Other platforms' run signals | §4.2 |
| Evidence grading | **Nobody** | ✅ stated / inferred / confirmed / unknown | — | Keep. Make it visible as a selling point. |
| Owner confirmation | ServiceNow (workflows), Agent 365 (sponsor) | ✅ Attestation campaigns, magic links | Triggered by events, not just campaigns | §4.3 |
| Cost by person / team | Foundry (Foundry only) [P] | None | OpenAI `costs` grouped by `user_id` / `api_key_id` [P] | §2.1 |
| Runtime security, tracing, evaluation | Zenity, Datadog, LangSmith… | None | **Don't build** | — |

---

## 2. Connectors: what to add, in what order, and what each really gives

The SDK pattern already handles: config encryption, the read-only Guard, the runner with sync runs, persistence that closes vanished rows and respects grades, and raw payload storage (`connectors/sdk/*`) [C]. Every new connector is a mapper plus pagination plus tests against the real response shape: the same recipe as the n8n fix.

### 2.1 AI admin: replace the model catalogue with keys, owners, usage and cost. *First. ~3–4 engineer-days.*

**OpenAI** (official OpenAPI spec, read today [P]):
- `GET /organization/projects` → `GET /organization/projects/{id}/api_keys`. Each `ProjectApiKey` has:
  - `owner.type` (user / service_account), with `owner.user.{id, email, name, role}`;
  - `last_used_at`;
  - **`owner_project_access` (active / inactive):** whether the key's owner still has access to the project;
  - `created_at`, `expires_at`.
- `GET /organization/costs?group_by=api_key_id|user_id|project_id|line_item`. Supported fields include **`user_id`** and **`api_key_id`**; some combinations return 400.

**Anthropic** [P]:
- `GET /v1/organizations/api_keys`: `created_by`, `principal` (user or service account), `status`, workspace, `expires_at`.
- The usage report groups by `api_key_id`.

**Mapping into OBA:**

| Source | OBA |
|---|---|
| API key | entity `kind: 'credential'`, `externalRefs: { vendor, keyId, project }`. No new kind. |
| Key owner (email) | edge person → credential `owns`, grade `stated` |
| Key used by a workflow | Only inferable. n8n hides the secret. Match by name, or ask in attestation. |
| `last_used_at`, cost over 30 days | facts. This needs new `FactAttribute` values: `last_used_at`, `cost_30d`. |
| `owner_project_access = inactive` | Feeds a new check, **C5 "key outlives its owner's access"**. Stated by OpenAI itself. |

Drop the model-catalogue read: it creates one `model` entity for every model the vendor offers [C, D4].

**The finding this enables, which nobody else shows a mid-market COO:**
> "7 keys belong to people who no longer have access. They were last used 2 hours ago and cost $3,100 last month."

### 2.2 Entra: managers, enterprise-app owners, delegated grants, secret expiry. *~3–4 days.*
- Add `manager` to the users read: `$expand=manager` or `/users/{id}/manager` [prior P]. This produces the reporting line the escalation and successor flows need (today they're picked by hand).
- `/servicePrincipals?$expand=owners`, needing `Application.Read.All`.
- `/oauth2PermissionGrants`, needing `Directory.Read.All` [P].
- Application `passwordCredentials` / `keyCredentials` `endDateTime`, needing `Application.Read.All`. This is a standard Graph property, but I haven't tested reading it **[U]**.
- **Store `entraId` on every person**, as the Entra connector already does (`externalRefs.entraId` [C]). It's the join key for Power Platform and Agent ID (§3.2).

### 2.3 Power Platform inventory: Copilot Studio agents, Power Automate flows, apps. *~4–5 days plus an auth decision.*

What we get [P, inventory schema]:
- `type` values: `microsoft.copilotstudio/agents`, `microsoft.powerautomate/cloudflows`, `agentflows`, `m365agentflows`, `powerapps/canvasapps` and others.
- `properties.createdBy` and `ownerId` (Entra object IDs), `environmentId`, `lastModifiedAt`, `lastModifiedBy`.
- **`properties.powerPlatformConnectors[].connectorId` / `operations[]`** (preview): real dependency edges, e.g. a flow uses SharePoint `GetItems`.
- `trigger` / `triggerOperation` for flows.
- Data refreshes within 15 minutes.

Known holes [P]:
- **The flow owner is the creator and isn't updated** when ownership changes.
- Model-driven apps have no owner.
- Agents show "–" for last modified.
- The HTTP built-in action doesn't appear among connectors, so external API calls are invisible.

**Auth constraint [P]:** the Power Platform API and connector query action **reject service principals (HTTP 403)**; only delegated user tokens work. The same data is in **Azure Resource Graph** (`PowerPlatformResources` table). Whether ARG accepts a service principal for that table is **[U]**: test it first.

- If ARG accepts a service principal, use ARG.
- If not, an admin signs in once through OAuth, and we store an encrypted refresh token. The same pattern as our SSO, but it's a new connector credential type, and it needs a reconnect experience when the token expires.

Mapping:

| Inventory record | OBA |
|---|---|
| Agent, flow, app | `automation` |
| `ownerId` / `createdBy` | `owns`, with owner kind `creator` (§3.3), grade `stated`, labelled "creator (may be stale)" for flows |
| `powerPlatformConnectors` | `depends_on` → `app` entity per connector (e.g. `app:pp:shared_sharepointonline`) |
| `environmentId` | fact |

### 2.4 Entra Agent ID + Agent 365 catalogue. *~12 days (already scoped 2026-10-21).*

Unchanged from `2026-10-21-agent365-connector-scope.md`:
- Agent ID owners are read-only.
- Sponsors need a ReadWrite permission.
- The catalogue needs the customer's Agent 365 licence, and **has no owner field** [P].
- The catalogue's `lastUsedDateTime` and `exceptionRate` are what the after-departure check uses for Microsoft agents (§4.2).

### 2.5 Salesforce Agentforce. *~4–5 days.*
- Tooling API: `GenAiPlannerDefinition`, `GenAiPluginDefinition`, `GenAiFunctionDefinition`, `BotDefinition`, with `CreatedById` / `LastModifiedById` [prior P].
- Salesforce `User` gives the email → matched by Salesforce user ID (§3.2).
- Session-trace export [P]: beta, **one session per request, last 72 hours only.** Use it only for the check afterwards ("did this agent fail since the account was disabled"), never for bulk analytics.

### 2.6 AWS Agent Registry + CloudTrail, and Google Agent Registry. *~5 days each. Only for engineering-led customers.*
- **AWS** [P]: service `agent-registry`, IAM actions `agent-registry:ListRegistryRecords` / `GetRegistryRecord` (read), through a cross-account read-only role. **No owner field**, so the creator comes from CloudTrail `Create*` events (principal ARN). Joining to a person needs IAM Identity Center users or a mapping table.
- **Google** [P]: Agent Registry API v1, `projects.locations.agents.list`, permission `agentregistry.agents.list`. Fields: `agentId`, `card` (A2A agent card), `attributes` (framework, **runtime identity principal**, runtime reference), `createTime`, `version`. **No owner.** The runtime principal is a service account, so a person comes only from IAM policy history or attestation.
- **Priority:** low until a design partner runs agents there. Mid-market companies rarely do.

### 2.7 Make. *~3–4 days.*
- Scenarios: `createdByUser`, `usedPackages`, blueprint [prior P].
- Connections have no owner field [P].

### 2.8 Not worth building yet
- **Zapier:** requires an App Directory listing; no owner field [prior P].
- **Foundry Control Plane:** portal-only; Foundry agents arrive through Agent ID / Agent 365 anyway [P].
- **ChatGPT Enterprise Compliance API:** owner field unverified; Enterprise customers only [S].

---

## 3. Identity resolution: the defensible core

### 3.1 Why it's the moat
- Every vendor in the study resolves identity **inside its own platform only**. It has no commercial reason to resolve its competitors' identities.
- A buyer with Microsoft 365 + n8n + OpenAI + Salesforce has four identity namespaces for the same person.
- Joining them correctly, and saying how sure we are, is the work nobody else does for the mid-market. It also gets better with each connector we add.

### 3.2 What has to change in `identity/matcher.ts`
Today [C]: an `emailIndex` plus an `aliasIndex`, a service-account heuristic, and `MatchResult.matchType ∈ exact_email | alias | service_account | heuristic | none`.

Add an **external-ID index**: `(namespace, id) → person`. It's populated by the directory connectors:

| Namespace | Populated from | Used to resolve |
|---|---|---|
| `entra` (object ID) | Entra users (`externalRefs.entraId` already stored [C]) | Power Platform `ownerId` / `createdBy`, Agent ID owners, servicePrincipal owners, oauth2PermissionGrant `principalId` |
| `google` (user ID) | Google Directory | Google grants, Google Agent Registry IAM members |
| `salesforce` (user ID) | Salesforce `User` (with email) | Agentforce `CreatedById` |
| `aws` (principal ARN) | IAM Identity Center users (with email) [U] | CloudTrail creators |
| `openai` / `anthropic` (user ID) | Their org-users APIs (with email) | Key `owner.user.id`, `created_by.id` |
| `n8n` (user ID) | n8n `/users` (with email) | Project members |

- New `matchType: 'external_id'`, with confidence 1.0 when the namespace's directory is authoritative (Entra or Google).
- Anything unresolved goes to the existing review queue (`identity/queue.ts`) instead of being dropped.
- Estimate: **3–4 days**, with tests per namespace.

### 3.3 Owner semantics: stop collapsing them into one `owns`
Platforms mean different things by ownership:

| Kind | Meaning | Platforms |
|---|---|---|
| creator | Who created it | Power Platform flows, Agentforce, AWS CloudTrail, Make |
| owner | The platform's own owner field | n8n owner project, Agent ID owners, Power Platform apps and agents |
| sponsor | Business-accountable | Agent ID sponsors |
| key principal | The identity a key acts as | OpenAI and Anthropic keys |
| confirmed owner | Confirmed through attestation | Ours |

**Recommendation:** keep the single `owns` `EdgeType`, so the ~15 consumers listed in the audit keep working, and add an **`ownerKind` qualifier**. This needs a migration adding a nullable `owner_kind` column on `edge`, defaulting to `owner`.

Checks then treat `creator` as weaker evidence:
- C2 "departed owner" fires on `owner` / `sponsor` / `confirmed`.
- On `creator` only, it returns **UNKNOWN**: "created by a leaver, current owner unknown". That's honest, and it's exactly the hole in Microsoft's flow-owner column.

---

## 4. The lifecycle cascade: turning departures into the product

### 4.1 Today [C]
- Departures are created by hand (`POST /api/departures`) or by HR in the app.
- Stages run through `account_disabled` → verified. Successors, acceptance, handover pack.
- The snapshot diff emits `person_left` / `owner_changed` change events.
- The verifier reads n8n executions for 72 hours after the account is disabled.

### 4.2 Extend
1. **Automatic triggers from the identity provider.** The diff engine already sees `accountEnabled` flip to false. Make it **open or advance a departure automatically** (stage `account_disabled`, with the timestamp from the sync) and notify the manager, read through the new `manager` edge.
   - **Movers:** a department or manager change in the directory raises a `person_moved` event, which needs a new `ChangeEventKind`. It opens a lighter handover ("still owns 4 things in the old team").
2. **Check afterwards, per platform.** Generalise `ExecutionProvider` (already an interface [C]) into one adapter per platform:

| Platform | Signal after the account is disabled | Source |
|---|---|---|
| n8n | Failed executions with auth errors | Built [C] |
| OpenAI keys | `last_used_at` after the date, `owner_project_access = inactive` | [P] |
| Anthropic keys | Status, usage by key after the date | [P] |
| Agent 365 agents | `lastUsedDateTime`, `exceptionRate` | [P] (licence) |
| Agentforce | Sessions with errors in the 72-hour window | [P] (beta) |
| Power Automate flows | Flow run history | **[U]**. The Power Automate management API isn't verified. |

   Each adapter returns `null` when it can't read, which the verifier already treats as "not checked" [C].

3. **Record the prediction as data.** When a departure opens, store what the simulation predicted would break. After the window closes, store what the adapters observed. This is the labelled outcome data no competitor has, and it allows a measured accuracy figure in the product ("our predictions were right 83% of the time").
   - Needs a new `departure_prediction` table (migration 008) plus a small accuracy view.

### 4.3 Event-driven confirmation
Attestation today is campaign-based [C]. Add **single-item confirmation triggered by events**:
- a new automation is discovered with only a `creator` owner → ask the creator's manager to confirm the owner and backup;
- a departure opens → ask the successor to accept.

The magic-link and task infrastructure exists [C]. This is mostly new triggers, about 2–3 days.

---

## 5. Screens: reframed by what competitors can't show

The current sidebar [C]: Ask OBA, Overview, Departures, People & Teams, Assets, Map, What-If, Actions, Settings.

| Screen | Competitor reality | Change |
|---|---|---|
| **Overview** | Every registry has an inventory dashboard | Lead with **accountability**, not counts. Example: "23 automations and 7 AI keys depend on people who are leaving or have left; $3.1k/month; 4 creators unknown." Evidence grades stay visible. |
| **Departures** | Microsoft shows "owned by departing user" for Power Platform only, and doesn't check afterwards [P] | The hero screen: one cross-platform list per leaver, a predicted-break list, then ✓ / ✗ afterwards with the prediction-accuracy line. |
| **People & Teams** | Glean / Work IQ know people, but not their AI footprint | A person page = their **AI and automation footprint across platforms**, with the manager chain. |
| **Assets** | Commodity | Keep as a filterable list. Add a platform badge and owner kind. Not a pitch screen. |
| **Map** | Agent 365 context map (preview), MuleSoft visualiser | Keep. Becomes richer with Power Platform connector edges. |
| **What-If** | Nobody does cross-platform leaver or mover simulation | Keep. Add a "mover" scenario. |
| **Actions** | Everyone has remediation lists | Keep, but every action points to *the platform where it gets done* (we stay read-only). |
| **Ask OBA** | Every product has a chat | Keep as an interface, never as the USP. |

---

## 6. What to drop or de-emphasise

- **"One place for all your agents"** as a message: free from ServiceNow, Microsoft and AWS.
- **Model-catalogue entities** (D4).
- **Checks C1, C3 and C4 as first-screen content.** They depend on criticality, documentation and fallback, which no API supplies; they stay "unknown" until attestation. Keep them, but below the accountability findings.
- **Any security, threat or guardrail language.** That's Zenity's and the NHI acquirers' territory.

---

## 7. Sequenced plan

Assumes one engineer who knows the codebase. Estimates are ±30%, and every API marked **[U]** is spiked first.

| # | Work | Days | Unlocks | Depends on |
|---|---|---|---|---|
| 1 | AI keys, owners, usage and cost (OpenAI + Anthropic); drop the catalogue; check C5 | 3–4 | First money and leaver finding with no security review | — |
| 2 | Multi-key identity resolution + `ownerKind` (migration) | 4–5 | Every later connector joins correctly | — |
| 3 | Entra: manager, servicePrincipal owners, grants, secret expiry | 3–4 | Org context, mover events, Microsoft apps | 2 |
| 4 | Lifecycle triggers from the identity provider (auto-departure, `person_moved`) + prediction record (migration) | 4–5 | The hero loop runs on its own | 3 |
| 5 | Check-afterwards adapters: OpenAI, Anthropic | 2 | Checks beyond n8n | 1, 4 |
| 6 | Power Platform inventory (ARG test, then connector) | 4–5 (+2 if delegated auth is needed) | Copilot Studio and Power Automate coverage | 2 |
| 7 | Overview and Departures reframing | 4–5 | The demo story | 1–6 |
| 8 | Agent ID / Agent 365 (existing scope) | ~12 | Microsoft agents with owners | 2 |
| 9 | Agentforce metadata + session check | 4–5 | Salesforce customers | 2 |
| 10 | Make; AWS / Google registries | 3–5 each | Wider coverage | 2 |

- **Steps 1–7: about 25–30 engineer-days (5–6 weeks).** That turns the demo from "your n8n workflows" into a cross-platform accountability product on real APIs.
- Steps 8–10 follow design-partner demand.

---

## 8. Battlecard lines, grounded in facts

| When the buyer says… | The answer (and its evidence) |
|---|---|
| "Microsoft already shows flows owned by departing users." | "For Power Platform only, and its flow Owner column is the creator and 'doesn't update when the owner changes' (Microsoft's own documentation). We cover n8n, AI keys, Agentforce and Microsoft together, correct owners through confirmation, and check afterwards whether anything broke." |
| "We bought Agent 365." | "Good, we read its registry. Its catalogue has no owner field, and lifecycle control for non-Microsoft agents is 'coming soon'. We add workflows, keys and the people around them." |
| "ServiceNow AI Control Tower is free." | "If you run ServiceNow and keep the CMDB current. Most 200–2,000-person companies don't." |
| "Nudge shows a leaver's OAuth grants." | "At the app level. We show which workflows and agents run on that person, how often they run, and whether they still work after the account is disabled." |
| "Our devs use LangSmith / Datadog." | "They trace code you instrument. We cover SaaS-built agents and no-code workflows, and who owns them." |
| "Glean / Copilot already knows our org." | "It knows documents and people for search. It doesn't track which agents, flows and keys depend on whom." |

---

## 9. Open items to settle before building
1. **Power Platform via ARG with a service principal**: works or not. That decides the effort of step 6. Needs a test tenant.
2. **Power Automate run history API** (for the check afterwards): not verified.
3. **OpenAI `costs` with `group_by=user_id`**: "support depends on the organisation and time range" [P]. Test against a real org.
4. Whether a **mid-market buyer pays** for the accountability position. Mock up the reframed Overview and Departures and test them in sales calls, before step 7 if possible.

## Sources (new in this document)
- Power Platform inventory: https://learn.microsoft.com/en-us/power-platform/admin/power-platform-inventory
- Inventory schema: https://learn.microsoft.com/en-us/power-platform/admin/inventory-schema
- OpenAI OpenAPI spec (`ProjectApiKey`, `/organization/costs`): https://github.com/openai/openai-openapi
- Anthropic API keys: https://platform.claude.com/docs/en/api/admin-api/apikeys/list-api-keys
- AWS Agent Registry IAM actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_agent-registry.html
- AWS Agent Registry Control API: https://docs.aws.amazon.com/agent-registry-control/latest/APIReference/API_GetRegistry.html
- Google Agent Registry v1 agents.list: https://googleapis.github.io/google-api-python-client/docs/dyn/agentregistry_v1.projects.locations.agents.html
- Everything else: see `2026-10-27-competitive-landscape-agents-and-org-intelligence.md` §9
