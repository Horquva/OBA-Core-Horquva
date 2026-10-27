# Competitive landscape: agent platforms, agent governance, observability and "organisational brain" products

**Date:** 2026-10-27 · **Status:** research (step 1 of the USP work) · **Author context:** OBA / Horquva continuity product on `mvp/v1-continuity`

**Purpose.** This is a blunt assessment of every product we compete with, directly or indirectly:
- what each product does;
- what it connects to;
- how it works;
- what it's good at and where it falls short;
- which of its data we could actually read through an API.

The goal is to find positions that are **hard to build, feasible for us, needed by buyers, and backed by numbers**, not just "nobody markets this".

**How sure each claim is.** Every claim carries one of these labels:
- **[P] Primary:** I read the vendor's own documentation, press release or source code during this study or the 2026-10-21 Agent 365 scope.
- **[S] Secondary:** analyst coverage, trade press or a third-party review. The fact is reported, not checked against the vendor.
- **[U] Unverified:** plausible, but I found no confirmation. It needs a test or a demo.

Funding, M&A and adoption figures come mostly from press coverage [S]. The study was done from public sources only: no trials, demos or tenant access.

---

## 0. The blunt summary

1. **Agent inventory is becoming a free commodity.** At least nine vendors now offer a cross-platform catalogue of agents:
   - Microsoft Agent 365
   - Microsoft Foundry Control Plane
   - AWS Agent Registry
   - Google Agent Registry
   - Salesforce MuleSoft Agent Registry
   - ServiceNow AI Control Tower
   - SAP LeanIX AI Agent Hub
   - Ardoq
   - Zenity

   Several are bundled or free:
   - ServiceNow is reportedly giving AI Control Tower away free for a year [S].
   - Salesforce made Agentforce Observability unmetered on every SKU [S].
   - AWS's registry has a free tier [S].

   **A registry of agents will not be our USP.** Anyone pitching "one place to see all your agents" in 2027 is competing with free.

2. **Runtime security and tracing are well funded and crowded.**
   - Zenity raised a $125M Series C in Aug 2026 [S].
   - Cisco bought Astrix, SailPoint bought Entro, and Cyera signed to buy Oasis for about $1B, all between May and July 2026 [S].
   - ClickHouse bought Langfuse in Jan 2026 [P].
   - Datadog, LangSmith, Arize and Braintrust already cover tracing and evaluation.

   **Don't compete on prompt-injection defence, guardrails, tracing or evaluation.**

3. **What every one of them leaves out is the organisation:**
   - The registries store an agent *record*. Some carry an owner ID; several have **no owner field at all**: AWS Agent Registry [P], the Agent 365 package catalogue [P], and Google's registry as far as its overview page shows [P].
   - **None of them models the company around the agent:** who the owner reports to, which team relies on it, what happens when that person moves or leaves, and which business process breaks.
   - The only product that reacts to a person leaving is Agent 365, and only for Microsoft-registered agents: it moves sponsorship to the manager [P]. Everything else treats people as a static field.

4. **What every one of them leaves out is the workflow layer.**
   - Registries are built for "agents" (the A2A agent-to-agent protocol, MCP servers, Foundry, Bedrock, Copilot).
   - Most automation in a 200–2,000-person company actually runs in **n8n, Make, Zapier and Power Automate**, plus API keys wired into scripts.
   - Apart from Microsoft covering its own Power Automate, no governance product shows those next to agents with the people who own them. (n8n is an Agent 365 "agent factory" partner [P], which covers n8n *agents* published into Microsoft, not n8n workflows in general.)

5. **The demand data supports an accountability gap, not an inventory gap.** All of the following are vendor-sponsored surveys [S], so the figures are directional:
   - **37.8%** of organisations had a named person accountable for agent behaviour before deployment (Gravitee, 750 executives, Apr 2026).
   - **85%** of IT teams say every agent has an owner, but only **42%** say ownership is actually clear (Ivanti).
   - Only **28%** can trace agent actions back to a human sponsor across all environments (CSA and Strata).
   - **51%** report no clear ownership for AI and non-human identities (CSA summary).
   - **45%** have had an agent incident where accountability was unclear, and only **17%** could quickly reconstruct what an agent did (SecurityHQ, 204 security leaders, Oct 2026).
   - Gartner: only **13%** think they have the right agent governance [P]. An average Fortune 500 company will have **more than 150,000 agents by 2028**, up from fewer than 15 in 2025 [P].

6. **"Organisational brain" products exist, but they're about knowledge, not accountability.**
   - Glean has an enterprise graph over 275+ connectors and passed $300M ARR [P/S].
   - Microsoft Work IQ models "how people, projects and workflows connect", and its API went GA in June 2026 [S].
   - Atlassian's Teamwork Graph does the same over Jira and Confluence [P].
   - They power search and copilots. They don't answer: who is accountable for this agent, what does it depend on, and what breaks when this person leaves.
   - **These are the biggest long-term threat:** each already has the people graph and could add an agent layer. It's also the clearest reason to move quickly and to *integrate with* rather than replicate them.

7. **The defensible position this research supports: a vendor-neutral accountability graph.**
   - It covers people, agents, automations and AI keys, and the dependencies between them.
   - It stays current through HR and identity events, not by someone maintaining it by hand.
   - It **reads** the vendor registries rather than rebuilding them.

   The hard, uncopyable part isn't any single connector. It's:
   - **matching identities across platforms** (each vendor has its own user ID);
   - **re-running the analysis when an HR event arrives** (leaver, mover, reorg);
   - **checking afterwards** whether the prediction came true.

   §6 tests this against complexity, feasibility, need and numbers.

---

## 1. The map

| Layer | Who | What they want to own | Threat to us |
|---|---|---|---|
| **Hyperscaler and suite control planes** | Microsoft Agent 365, Microsoft Foundry Control Plane, AWS AgentCore and Agent Registry, Google Gemini Enterprise Agent Platform, Salesforce Agentforce and MuleSoft Agent Fabric | The agent runtime *and* its governance, inside their own platform | High for inventory, low for cross-stack accountability |
| **Enterprise IT / EA control towers** | ServiceNow AI Control Tower, SAP LeanIX AI Agent Hub, Ardoq | The system of record for "what AI do we run" | Medium. They're enterprise-priced and need a maintained CMDB or EA practice. |
| **AI agent security (AISPM / runtime)** | Zenity, Nudge Security, Okta for AI Agents and Cross App Access | Agent posture, data exposure, runtime blocking | Medium. Different buyer (CISO), but they now claim discovery and ownership. |
| **Non-human identity (NHI) security** | Astrix (Cisco), Entro (SailPoint), Oasis (Cyera), Token, Aembit, Clutch | Machine identities, secrets, keys, offboarding of NHIs | Medium. They have the "orphaned key after a leaver" story, sold to security teams. |
| **LLM / agent observability** | LangSmith, Langfuse (ClickHouse), Arize, Datadog LLM Observability and AI Agents Console, Braintrust, Helicone | Traces, evaluation, cost per LLM call, for developers | Low. Different buyer, and they need code instrumentation. |
| **SaaS management** | Zylo, Torii, Zluri, BetterCloud | Apps, licences, spend, offboarding execution | Low to medium. Adjacent; they're adding "shadow AI". |
| **AI governance / GRC** | Credo AI, Holistic AI | Policy, risk and EU AI Act evidence | Low. A compliance buyer and a manual register. |
| **Organisational knowledge graphs** | Glean, Microsoft Work IQ, Atlassian Teamwork Graph | The "context layer" for copilots | **Highest long-term.** They hold the people graph. |
| **Automation platforms (sources and partial competitors)** | n8n, Zapier, Make, Power Automate | Their own ownership-transfer features | Low. Single-platform only. |
| **Unified-API infrastructure** | Merge (Agent Handler, Gateway), Unified.to, Nango | Connectors as a service | Not a competitor. A possible supplier (HRIS). |

---

## 2. Hyperscaler and suite control planes

### 2.1 Microsoft Agent 365 (+ Entra Agent ID)

- **What it is.** The control plane to "observe, govern and secure" agents, for IT and security admins. GA on 2026-05-01 [P].
- **Features:**
  - **Registry.** Microsoft agents, Copilot Studio, Foundry, partner agents, and local agents found on devices through Defender and Intune [P].
  - **Registry sync** pulls in cloud agents from **AWS Bedrock and Google Gemini Enterprise Agent Platform**. This is in public preview [P]. The 2026-10-21 scope also listed Agentforce, Databricks, Anthropic, Oracle and Snowflake from Microsoft Learn [P].
  - **Entra-backed agent identities, with owners and sponsors.**
  - **Defender context mapping** (devices, MCP servers, identities, reachable resources): preview from June 2026 [P].
  - **Network controls** for Copilot Studio and endpoint agents [P].
  - **Lifecycle.** Ownerless agents are flagged after the user is deleted. A Lifecycle Workflow can transfer sponsorship to the manager [P, 10-21 scope]. Start, stop and delete for AWS and Google agents is "coming soon" [P].
- **Partners:** Genspark, Zensai, Egnyte and Zendesk agents. Kasisto, Kore.ai and **n8n** as "agent factories". Adobe, NVIDIA and Celonis among the launch partners [P].
- **Price:** **$15 per user per month** standalone, or included in M365 E7 at $99 [P]. One licence per person who manages, sponsors or uses agents [P]. Prerequisites differ by source (E5, E3 plus security suites, or Business Premium) [S].
- **APIs we can read:**
  - Package catalogue: `GET /copilot/admin/catalog/packages`, permission `CopilotPackages.Read.All`. **Needs the customer's Agent 365 licence. No owner field.** [P]
  - Entra Agent ID: list agent identities and their owners under `AgentIdentity.Read.All`. **Reading sponsors needs `AgentIdentity.ReadWrite.All`.** [P]
- **Strengths:**
  - Default distribution to every Microsoft 365 tenant.
  - Real identity for agents, with Defender and Purview enforcement.
  - The only vendor with a built-in reaction to a leaver, through the sponsor transfer.
- **Weaknesses:**
  - Licensed per *user*, which is expensive for a 1,000-person company where only some people touch agents. Microsoft's licence counts managers and users, and sources disagree on prerequisites [S].
  - Third-party coverage is preview and pull-only. Lifecycle control of non-Microsoft agents isn't shipped [P].
  - No workflow layer outside Power Automate. n8n, Make, Zapier and raw API keys are invisible unless an n8n agent is published into Agent 365.
  - Ownership is a field, not an organisation: there's no team context and no "what depends on this agent".
  - It's a security admin's tool. The COO question "what breaks when Sarah leaves" isn't something its UI answers.
- **What it means for us:** treat it as a **source**, not a rival. Read its registry and Agent ID owners, and add everything it can't see.

### 2.2 Microsoft Foundry Control Plane

- **What it is.** Inventory, observability, compliance and security for agents, models and tools across Foundry projects, aimed at developers and AI engineers [P].
- **Features:**
  - Fleet KPIs: active agents, run completion, compliance posture, cost, prohibited behaviours.
  - A searchable asset table with health score, cost, alerts and token use.
  - Continuous evaluation, red-teaming scans, drift monitoring, guardrail policies with bulk remediation.
  - Defender and Purview alerts shown in place.
  - **Registration of custom (external) agents** [P]. Tracing built on OpenTelemetry into Azure Monitor [S].
- **Requirements:** an Azure subscription, a Foundry project, and an AI gateway (API Management) for the advanced governance features [P]. **The control-plane features are portal-only** [P].
- **Strengths:**
  - Deep runtime telemetry and cost data for agents running on Azure.
  - Evaluation and red-teaming are built in.
- **Weaknesses:**
  - Scoped to a single Azure subscription.
  - Built for builders.
  - No people or organisation model.
  - Portal-only, so we can't read the control plane as such.
  - Microsoft itself had to publish "two control planes walk into an enterprise" to explain the overlap with Agent 365 [S]. That's a sign of buyer confusion we can use.
- **APIs for us:** Azure Resource Manager and Foundry project APIs for agent definitions, plus Azure Monitor for traces. These are **[U]**: I didn't verify an agent-list endpoint in this study. The cheaper path is to get Foundry agents through Agent 365 or Agent ID.

### 2.3 Salesforce Agentforce (+ MuleSoft Agent Fabric)

- **What it is.** Salesforce's agent platform, plus governance.
- **Features:**
  - Command Center and Agentforce Observability: latency, error and escalation rates, adoption, feedback, cost [S].
  - **Session tracing** in OpenTelemetry format through Data Cloud (Data 360) [P/S].
  - Einstein Trust Layer, Agentforce Gateway, agent-level permissions [S].
  - **MuleSoft Agent Fabric:** an Agent Registry (agents, MCP and A2A servers), Agent Broker (routing), Agent Governance (policy on every interaction) and Agent Visualizer (a map of the agent ecosystem) [S].
- **Price:** Flex Credits at **$0.10 per action** ($500 per 100k credits; voice actions cost more), $2 per conversation or per resolution, or $125–550 per user per month on some editions [S]. Observability is **unmetered** for every Agentforce customer [S].
- **Adoption:** about **8,000 of 150,000+** Salesforce customers had adopted Agentforce by May 2025, with **price cited as the barrier for mid-market** [S, dated].
- **APIs for us:**
  - Tooling API `GenAiPlannerDefinition`, `GenAiPluginDefinition`, `GenAiFunctionDefinition` and `BotDefinition` for agents, topics and actions. Owner is only `CreatedById` / `LastModifiedById` [P, 09-29 study].
  - Session-trace export API: **beta, one session per request, sessions from the last 72 hours only** [P]. That's useless for bulk analytics, but enough to check "did this agent run and fail since X".
  - Needs a Connected App and admin approval.
- **Strengths:**
  - Agents sit next to the CRM data and processes that matter.
  - Observability is free.
  - MuleSoft brings integration muscle.
- **Weaknesses:**
  - Governance is Salesforce-centric. I found no evidence that Agent Fabric's registry discovers Bedrock or Copilot agents automatically [S, gap].
  - The ownership model is "creator".
  - The export API is too narrow for a third-party view.
  - Pricing complexity is a known adoption brake.
- **What it means for us:** another **source**. Salesforce-heavy mid-market customers are a segment where "Agentforce agent X belongs to an admin who's leaving" is a real, readable fact.

### 2.4 AWS: Bedrock AgentCore + AWS Agent Registry

- **What it is.** A modular agent infrastructure: Runtime, Gateway, Memory, Identity, Policy, Observability, Evaluations, Browser and Code Interpreter [S]. The **AWS Agent Registry** went GA on **2026-08-31** [S].
- **Registry features** [P]:
  - Registries contain records for MCP servers, agents, skills and custom resources.
  - An approval workflow (publish → curate → discover), with records validated against the MCP and A2A schemas.
  - Hybrid search, plus an MCP endpoint.
  - IAM or corporate-JWT authorisation.
  - EventBridge notifications, CloudTrail logging, sharing across AWS Organizations and RAM.
  - Records can be synced from MCP or A2A endpoints, including ones outside AWS.
- **Price** [S]:
  - Runtime: $0.0895 per vCPU-hour and $0.00945 per GB-hour.
  - Gateway: $0.005 per 1,000 calls.
  - Policy: $0.000025 per authorisation.
  - Observability is billed at CloudWatch rates, with no cap.
  - Registry free tier: 5,000 records, then $0.40 per 1,000.
- **APIs for us:**
  - Registry list and get through the SDK and CLI, with read-only IAM via a cross-account role [P for existence; exact operation names **[U]**].
  - Bedrock Agents `ListAgents` and `GetAgent` [U in this study].
  - **Creator comes only from CloudTrail**, which records who called create. **The registry documentation shows no owner field** [P].
- **Strengths:**
  - Open protocols (A2A, MCP), real IAM, an org-wide catalogue with approvals.
  - Very cheap.
- **Weaknesses:**
  - It's a developer and platform-team product.
  - The catalogue is only as complete as what teams *publish*, because approval is the gate, not discovery.
  - No owner semantics, no people, no departure handling.
  - Per-component metering makes total cost hard to predict, a recurring complaint in the pricing guides [S].
- **What it means for us:** a **source** for engineering-led customers. Our value on top is "who is accountable, and is that person still here?", which needs CloudTrail matched to directory identities. That's hard work, and it's ours to do.

### 2.5 Google: Gemini Enterprise Agent Platform (formerly Vertex AI)

- **What it is.** Rebranded from Vertex AI at Cloud Next 2026 [S/P].
- **Components** [P]:
  - **Agent Registry:** "all agents, tools and MCP servers", including your own, Google's and third-party ones. Agents register automatically when deployed [S].
  - **Agent Identity:** a managed identity per agent.
  - **Agent Gateway:** policy enforcement on tool calls, with Model Armor.
  - **Observability:** Unified Trace Viewer, Cloud Trace.
- **APIs for us:** the overview page doesn't document a list API or owner fields [P]. Status **[U]**.
- **Strengths:** auto-registration on deploy, which makes the inventory complete *within* Google. An integrated identity and gateway.
- **Weaknesses:**
  - The same pattern as AWS: complete for agents deployed on Google, voluntary for everything else.
  - No people model.
  - Mid-market Google Workspace companies rarely run agents on Google Cloud, so Google's agent governance hardly reaches them.
- **What it means for us:** low priority as a source until a design partner runs agents on it.

---

## 3. Enterprise control towers and EA tools

### 3.1 ServiceNow AI Control Tower

- **What it is.** A command centre to "govern, manage, secure and realise value from any AI agent, model and workflow" (launched May 2025) [P].
- **Coverage:** Knowledge 2026 added about **30 enterprise integrations** (AWS, Google Cloud, Azure, SAP, Oracle, Workday) [S], and integrations with **Microsoft Agent 365** and **Amazon Bedrock AgentCore** [S]. Discovery reportedly covers non-human identities (service accounts, API keys) [S]. There's a new AI Gateway for MCP traffic [S].
- **Price:** reportedly **free for one year**, then part of ServiceNow's AI subscription tiers. Governing third-party assets may need extra licences [S, single source].
- **Strengths:**
  - It sits on the CMDB, which already has `owned_by`, support groups and business criticality.
  - It's the only control tower with a real criticality source.
  - It has workflow muscle for remediation.
- **Weaknesses:**
  - **Requires ServiceNow.** Mid-market companies of 200–2,000 people mostly don't run it.
  - Its value depends on CMDB data quality, which is notoriously uneven [prior study].
  - Heavy implementation.
- **What it means for us:** the closest thing to "accountability plus criticality" in the market, but **for ServiceNow shops only**. Our ICP, mostly not on ServiceNow, is exactly the gap it leaves.

### 3.2 SAP LeanIX AI Agent Hub, and Ardoq

- **LeanIX AI Agent Hub:** a central inventory for agents, models and MCP servers, first launched Nov 2025 and expanded at Sapphire 2026. **Only 2 of 6 capabilities are GA. The governance layer is slated for Q3 2026** [S]. "Vendor-agnostic" is largely SAP's own framing, untested outside SAP-heavy environments [S]. Its EA base complains about setup effort and data upkeep (G2 4.5 from 183 reviews; maintenance burden noted in third-party summaries) [S].
- **Ardoq:** imports agents from Vertex AI, Foundry and Bedrock through Import Builder, shown through an "AI Lens" [S, vendor blog].
- **Strengths:** the architecture context (capability → application → agent) that EA teams want.
- **Weaknesses:**
  - An enterprise architect is the buyer.
  - Models are kept current by hand or through imports.
  - Nothing is driven by people's lifecycle events.
  - The value decays when data isn't maintained.
- **What it means for us:** confirms that "agents mapped to the business" is wanted, and that the incumbents deliver it through **manual upkeep**. An event-driven, self-maintaining graph is the contrast.

---

## 4. AI agent security, NHI and identity

### 4.1 Zenity

- **What it is.** An AI agent security platform covering AI observability (continuous agent inventory across SaaS, cloud and endpoints), AISPM, AI exposure management, and AI detection and response [S].
  - New in 2026: Guardian Agents and Boundaries, plus policy-as-code through a CLI [S].
  - Coverage confirmed for Microsoft (Foundry runtime GA Mar 2026), Salesforce and ServiceNow ecosystems, GitHub Copilot and OpenAI Codex [S].
  - **No evidence of n8n or ChatGPT Enterprise coverage** [S, gap].
- **Money and recognition:** a **$125M Series C** (Norwest, Aug 2026) [S]. Named "Company to Beat" in a Gartner report (Apr 2026) [prior].
- **Strengths:** the strongest independent security player across the big agent platforms, with runtime enforcement and analyst momentum.
- **Weaknesses for our buyer:**
  - Priced and sold to CISOs at enterprises.
  - Security-first framing: posture, threats, data leakage.
  - People appear as owners for security findings. Nothing covers continuity, handover or org context.

### 4.2 Nudge Security

- **What it is.** SaaS and AI discovery from the identity provider and email, plus OAuth grant analysis.
  - It flags risky scopes, unused privileged grants, and **integrations tied to inactive users**.
  - Its offboarding playbook lists a leaver's OAuth grants and suggests who could take them over.
  - It now claims coverage of AI agents and MCP connections [S].
- **Price:** reportedly **$5 per active user per month, from $750/month** for smaller organisations [S]. There's a free shadow-SaaS inventory tool.
- **Strengths:**
  - **Mid-market pricing and a fast, read-only setup.**
  - Already has the leaver-plus-grant story.
- **Weaknesses:**
  - It works at the *app* level: which SaaS has a grant.
  - I found no evidence it looks inside n8n or Make workflows, or checks run history afterwards [S, gap].
- **What it means for us:** **the most direct competitor in our price band.** We beat it only where we go deeper than "app X has a grant": which workflow, run how often, owned by whom, what breaks, and was it fixed.

### 4.3 NHI security: Astrix (Cisco), Entro (SailPoint), Oasis (Cyera), Token, Aembit, Clutch

- **What they do.** Inventory machine identities, secrets and keys; detect stale or over-privileged NHIs; handle *improper offboarding*, which OWASP's NHI Top 10 ranks #1 [S].
- **Market:** three of the six best-known independents were bought between May and July 2026 [S]:
  - Cisco–Astrix, about $400M;
  - SailPoint–Entro, about $200M;
  - Cyera–Oasis, about $1B (letter of intent).

  The rest are mostly Series A–B.
- **Strengths:** deep secret and key scanning across cloud, code and SaaS. Machine-to-human attribution is part of the product.
- **Weaknesses for our buyer:**
  - Security-team buyers.
  - Enterprise pricing, and now bundled into Cisco, SailPoint and Cyera suites.
  - The output is "rotate or revoke this credential", not "this business workflow will stop".
- **What it means for us:** **validates the leaver → orphaned credential problem with acquisition prices.** It also shows the security framing is taken: our framing must be operational continuity, not threat.

### 4.4 Okta for AI Agents / Cross App Access (XAA)

- Agents are managed with risk classes and owners. Static credentials go through Okta Privileged Access. **Cross App Access is now an official MCP authorisation extension**, with ~30 partners including Anthropic, Atlassian, Slack, Zoom and Cursor (Jun 2026) [S].
- Priced per workload principal [S].
- **Strength:** standardises how agents get tokens. Over time this makes "which agent acts as whom" more observable.
- **Weakness:** only for Okta tenants, and only for agents that adopt XAA.
- **What it means for us:** a future **source** of agent-to-person delegation facts for Okta customers.

---

## 5. Observability, SaaS management, governance and knowledge graphs

### 5.1 LLM / agent observability

| Product | Model | Price signal [S] | Strength | Weakness for our buyer |
|---|---|---|---|---|
| **LangSmith** (LangChain) | SDK tracing, evaluation, agent runtime | Free for 5k traces; Plus $39/seat; self-host only on Enterprise | Deepest for LangChain apps | Code-level only; developer buyer |
| **Langfuse** (ClickHouse, Jan 2026 [P]) | Open-source tracing and evaluation, self-hostable | Free / $29–59 per month cloud | 2,000+ paying customers, 19 of the Fortune 50 [S] | Same; needs instrumentation |
| **Arize (AX / Phoenix)** | Evaluation and monitoring | Phoenix free; AX Pro $50/month | Strong evaluation | Developer buyer |
| **Datadog LLM Obs + AI Agents Console** | APM-native LLM spans; the Console watches in-house *and third-party* agents (Agentforce, Operator, IDE copilots) [S] | From $8 per 10k requests, 100k minimum | Already in every enterprise's ops stack | Console in preview since Jun 2025 [S]; infra-team buyer; no org model |
| **Braintrust, Helicone, Laminar** | Evaluation, gateway, tracing | $79–249/month tiers | Cheaper, focused | Same |

**Blunt verdict:**
- These tools see **only agents whose code you instrument** (or whose vendor exports OTel traces). That means close to zero visibility of SaaS-hosted agents and no-code workflows.
- They answer "why did this LLM call fail", never "who owns this, and what breaks if they leave".
- Cost per trace varies **by ~45×** across vendors for the same workload, according to one competitor's benchmark [S].
- **Not our market. Possibly a future source** (OTel import) for engineering-heavy customers.

### 5.2 SaaS management (Zylo, Torii, Zluri, BetterCloud)

- **Market data:**
  - Zylo's 2026 Index: **AI-native app spend +108%** (and +393% at companies over 10k employees); ChatGPT is the **most expensed app**; AI app use grew **181%** [P].
  - Torii is reportedly a Leader in Gartner's 2026 Magic Quadrant for SaaS Management Platforms and is moving towards AI governance [S].
  - BetterCloud was reportedly acquired by CoreStack in 2026 [S, single source].
- **Strength:** licence and spend data, offboarding *execution* (suspend, transfer Drive, reclaim seats).
- **Weakness:** the app-level view. Nothing inside automations, and no dependency or continuity model.
- **What it means for us:** an adjacent buyer (IT ops). Their spend numbers are useful **evidence of AI sprawl**.

### 5.3 AI governance / GRC (Credo AI, Holistic AI)

- AI registries plus policy packs for the EU AI Act, NIST AI RMF and ISO 42001. Credo reportedly serves Mastercard, PepsiCo and Cisco [S].
- **Weakness:** the registry is mostly *declared* by humans. It's a compliance buyer, and EU AI Act high-risk duties phase in later (dates are contested between sources [S]).
- **What it means for us:** a future export target (evidence packs), not a competitor.

### 5.4 Organisational knowledge graphs, the real long-term threat

| Product | What its graph models | Scale | Gap for us |
|---|---|---|---|
| **Glean Enterprise Graph** | Content, people and activity across 275+ connectors; personal graphs infer tasks and projects [P] | Passed **$300M ARR** [P]; $7.2B valuation [S] | Built for search and agents. No ownership or continuity of agents and automations. |
| **Microsoft Work IQ** | "How people, projects and workflows connect", powering Copilot. A2A, MCP and REST APIs (preview Apr 2026, GA Jun 2026) [S] | Every M365 Copilot tenant | Microsoft-only context; doesn't expose agent accountability or dependency analysis. |
| **Atlassian Teamwork Graph** | Work items, documents, projects, people, plus third-party connectors via a Forge SDK (still in Early Access) [P] | Atlassian base | Same. |

**Blunt verdict:**
- These companies own the **people-and-work graph** we'd otherwise have to approximate.
- If Microsoft adds "agents and automations by owner, with leaver impact" to Work IQ or Agent 365, the Microsoft-only version of our pitch becomes a feature.
- Our defence is **vendor neutrality** (n8n, Make, Agentforce, AWS and AI keys in one graph) plus **the HR-event cascade with checking afterwards**.
- Where possible, *consume* Work IQ or Glean context rather than rebuild it. Work IQ's API terms and pricing are **[U]**.

---

## 6. Where they all fall short, and what is actually defensible

### 6.1 The gap matrix

✅ = yes, 🟡 = partial or preview, ❌ = no, as far as public documentation shows.

| Capability | A365 | Foundry CP | Agentforce / MuleSoft | AWS Registry | Google | ServiceNow AICT | LeanIX / Ardoq | Zenity | Nudge | NHI vendors | Observability | Glean / Work IQ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Agent inventory, own platform | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| Cross-vendor agent inventory | 🟡 preview | 🟡 register | 🟡 | 🟡 publish | 🟡 | ✅ | 🟡 import | ✅ | 🟡 | 🟡 | ❌ | ❌ |
| **No-code workflows (n8n / Make / Zapier)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ found | ❌ | ❌ | ❌ | ❌ |
| **AI API keys → person** | ❌ | 🟡 own keys | ❌ | ❌ | ❌ | 🟡 NHI | ❌ | 🟡 | 🟡 | ✅ | ❌ | ❌ |
| Owner field | ✅ (Agent ID) | 🟡 | 🟡 creator | ❌ | ❌ found | ✅ CMDB | 🟡 manual | 🟡 | 🟡 | ✅ | ❌ | n/a |
| **Org context (manager, team, role)** | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 CMDB groups | 🟡 manual | ❌ | ❌ | ❌ | ❌ | ✅ (but not for agents) |
| **Reacts to leaver / mover events** | 🟡 sponsor → manager | ❌ | ❌ | ❌ | ❌ | 🟡 via workflows | ❌ | ❌ | 🟡 playbook | 🟡 revoke | ❌ | ❌ |
| **Dependency / blast radius across systems** | 🟡 context map preview | ❌ | 🟡 visualiser | ❌ | ❌ | 🟡 CMDB | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ |
| **Check after the change (did it break?)** | ❌ | 🟡 own runs | 🟡 own sessions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 own traces | ❌ |
| Criticality source | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ CMDB | 🟡 manual | 🟡 risk | ❌ | 🟡 risk | ❌ | ❌ |
| Priced for 200–2,000 employees | 🟡 $15/user | 🟡 usage | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | 🟡 |

The bold rows are what we'd build on. **Each one on its own is a feature; together they're a product no one ships.**

### 6.2 Candidate USPs, tested against the four criteria

**USP 1: A vendor-neutral accountability graph.** People ↔ agents, automations and AI keys, with dependencies, kept current by HR and identity events.
- **Need:** see the survey figures in §0 point 5 (37.8%, 42% of 85%, 28%, 51%, 45% vs 17%) [S]. Gartner: only 13% have the right governance; 150k agents per Fortune 500 company by 2028 [P].
- **Complexity** (why it's hard to copy):
  1. **Matching identities across platforms.** Agentforce uses Salesforce User IDs; Power Platform uses Entra object IDs; n8n uses emails and projects; AWS uses IAM principals from CloudTrail; Anthropic uses its own user IDs; Agent 365 has no owner in the catalogue. Each needs a different join to one directory person.
  2. **Ownership semantics.** "Creator", "owner project", "sponsor" and "key principal" all mean different things and must be graded, not merged.
  3. **Keeping it current.** Every vendor's data drifts differently.

  Each vendor solves this only for its own island, and has no reason to solve it for its competitors' islands.
- **Feasibility:** see the API map (§7). Every source listed has a read-only API. The weak ones are Google (list API unverified) and Zapier (partner listing required).
- **Numbers:** the agent-identity security market is pricing companies at $200M–$1B for adjacent capability [S]. Gartner expects "guardian agent" spend to rise from **under 1% to 5–7% of agentic AI budgets by 2028** [S, secondary to Gartner].
- **Verdict:** ✅ the strongest. It's the frame; USPs 2–4 are what it does.

**USP 2: HR-event cascade with prediction and checking.** When a person leaves, moves or a team reorganises, show what breaks, who takes over, and afterwards whether it actually broke.
- **Need:** this moment happens constantly. US total separations run at **3.2% of employment per month** (BLS JOLTS, Aug 2026: 5.1M separations) [P]. That's economy-wide, and white-collar rates are lower, but at that rate a 1,000-person company sees roughly 30 departures a month. Every one is a potential orphaning event. Today only Agent 365 reacts, and only for Microsoft agents, by moving sponsorship.
- **Complexity:**
  - It needs the accountability graph (USP 1), plus run history from each platform (n8n executions, Agentforce sessions, Agent 365 `exceptionRate` / `lastUsedDateTime`, CloudWatch for AgentCore).
  - Plus the time logic: before, during and after the account is disabled.
  - The check afterwards produces **labelled outcomes** (predicted vs actual). Nobody else collects that data, and it compounds.
- **Feasibility:** the n8n part is built and was fixed this week. The Agent 365 / Agent ID part is scoped (~12 engineer-days, 10-21 scope). Agentforce's 72-hour, single-session trace export is enough for a "did it run and fail since X" check [P].
- **Verdict:** ✅ the hero moment for the demo.

**USP 3: The workflow and key layer the registries skip.** n8n, Make, Power Automate and AI API keys, as first-class citizens next to agents.
- **Need:** n8n is valued at **$5.2B**, with SAP embedding it in Joule Studio [S]. Zylo: ChatGPT is the most-expensed app; AI-native spend +108% [P]. This is where mid-market automation actually lives.
- **Complexity:**
  - Parsing workflow graphs: node types → vendors and models (hundreds of n8n node types).
  - Reading credential ownership through projects (now built).
  - Linking API keys to people: Anthropic `created_by` and `principal` [P].
- **Feasibility:**
  - n8n: verified and built.
  - Make: scenarios verified [prior]; connection owner not documented [P].
  - Power Platform Inventory API: **GA Feb 2026, includes Copilot Studio agents with `ownerId`, refreshed within about 20 minutes, access through Entra roles** [S, Microsoft Learn summarised]. This is a cheaper Microsoft path than Agent 365's licence; the exact fields need a check.
  - Anthropic keys: verified.
  - OpenAI keys: owner field **[U]**.
- **Verdict:** ✅ necessary. It's the coverage gap the registries leave.

**USP 4: Cost and value attributed to people and teams.** "This team's AI and automation costs $X/month; Y of it runs through people who've left."
- **Need:** AI spend growth (Zylo) [P]. Foundry tracks cost only for Foundry; observability tools only for instrumented code.
- **Feasibility:**
  - Anthropic and OpenAI usage and cost APIs [P/prior].
  - Agentforce credits aren't readable per agent through an API [U].
  - Agent 365 has no cost.
  - Partial coverage only.
- **Verdict:** 🟡 a strong hook for the first screen (money gets attention), but coverage is uneven. Ship it as part of USP 1, not as a product.

**Not USPs: don't build these**
- Agent registry or catalogue: commoditised and free (§0 point 1).
- Runtime guardrails, prompt-injection defence, red-teaming: Zenity, Microsoft, Google and AWS, heavily funded.
- LLM tracing and evaluation: the observability vendors.
- Shadow-SaaS discovery via OAuth: Nudge, Torii, Zluri.
- Enterprise-architecture modelling: LeanIX, Ardoq.

### 6.3 The positioning sentence the evidence supports

> **OBA is the vendor-neutral accountability layer for AI and automation.** It reads the registries Microsoft, Salesforce and AWS already keep, plus the workflows and API keys they don't, ties every agent, automation and key to a real person and team, and tells you what breaks, and proves whether it broke, when people leave, move or reorganise.

This is a **middleware organisational brain**. It doesn't replace any of these products; it connects them through the one thing none of them models: **the organisation**.

---

## 7. Middleware API map: what we can actually read

All access is read-only unless noted. "Owner semantics" says what the platform calls ownership.

| Platform | Endpoint / object | What we get | Owner semantics | Auth / permission | Licence or blocker | Status |
|---|---|---|---|---|---|---|
| **n8n** | `/api/v1/workflows`, `/credentials`, `/users?projectId=`, `/executions` | Workflows, nodes, credentials used, owner projects → person, runs | `shared[].role` workflow:owner / credential:owner → project → single member | Owner API key | API not on Cloud trial; keys not read-only below Enterprise | **[P] built and tested** |
| **Microsoft Agent 365 catalogue** | `GET /copilot/admin/catalog/packages` | All tenant agents, platform, blocked, deployed, last used, sessions, exception rate | **None** | `CopilotPackages.Read.All` | Customer's Agent 365 licence | [P] |
| **Entra Agent ID** | `/servicePrincipals/microsoft.graph.agentIdentity` (+ owners, sponsors) | Agent identities, enabled, owners | Owners (technical), sponsors (business) | `AgentIdentity.Read.All`; sponsors need ReadWrite | — | [P] |
| **Power Platform Inventory API** | Inventory API (GA Feb 2026) | Copilot Studio and Agent Builder agents, created by, last published, channels | `properties.ownerId` | Entra roles (not Power Platform RBAC) | Licence **[U]** | [S] (Microsoft Learn via summary) |
| **Entra directory** | `/users` (+ `/manager`), `/applications`, `/servicePrincipals/{id}/owners`, `/oauth2PermissionGrants` | People, managers, leavers, apps, app owners, delegated grants | Owners per app | `User.Read.All`, `Application.Read.All`, `Directory.Read.All` | — | [P] |
| **Google Workspace** | Directory `users`, `users/{u}/tokens` | People, managers, suspended, OAuth tokens per user | — | `admin.directory.user.readonly`, `admin.directory.user.security` (DWD) | — | [P] |
| **Okta** | Users, app links, user grants and clients | People, app assignments, consent grants | — | API token / OAuth | — | [P] existence; scopes [U] |
| **Salesforce Agentforce** | Tooling API `GenAiPlannerDefinition`, `BotDefinition`, …; OTel session export | Agents, topics, actions; one session's trace | `CreatedById` | Connected App, admin approval | Session export: beta, 1 session per request, 72 h | [P] |
| **AWS** | Agent Registry list/get; Bedrock `ListAgents`; CloudTrail | Registered agents, MCP servers, skills; who created them | **None in the registry**; creator from CloudTrail | Cross-account read-only IAM role | — | [P] registry; operations [U] |
| **Google Agent Platform** | Agent Registry | Agents, tools, MCP servers | Not documented | IAM | — | **[U]** |
| **Anthropic Admin** | `GET /v1/organizations/api_keys`, usage report, cost report | Keys, creator, principal, status, workspace; usage by key | `created_by`, `principal` | Admin key | — | **[P] (today)** |
| **OpenAI Admin** | Usage, costs, projects, project API keys | Usage and cost by project/key; keys | Key owner **[U]** | Admin key | — | [prior P] / [U] |
| **ChatGPT Enterprise** | Compliance API | Workspace GPT configurations and metadata, users | Owner field **[U]** | Workspace owner | Enterprise only | [S] |
| **Make** | `/scenarios`, `/connections` | Scenarios (with `createdByUser`), modules, connections | Scenario creator; connection owner not documented | Token `scenarios:read`, `connections:read` | — | [P] |
| **Zapier** | `GET /v2/zaps` | Zaps, steps | **None** | OAuth | **App Directory listing required** | [P] (blocker) |
| **HRIS** | Merge HRIS (Workday, BambooHR, …) | Employees, manager, termination date | — | Merge linked account | Merge subscription | [prior] |

**Coverage reality for a typical 200–2,000-person target:**
- Microsoft 365 or Google Workspace: always.
- Some mix of n8n, Make, Zapier or Power Automate: common.
- OpenAI or Anthropic keys: common.
- Salesforce: often.
- AWS or Google agents: rare.

So the minimum viable middleware is: **Entra or Google + n8n + Power Platform Inventory + Anthropic/OpenAI admin**, then Agentforce and Agent 365 for customers who have them.

---

## 8. What this study did not establish (next steps)

1. **Willingness to pay** for the accountability position. No pricing benchmark for "continuity" exists. Nudge's ~$750/month floor and Agent 365's $15/user are the nearest reference points. Test it in sales calls with a one-screen mockup.
2. **Whether Microsoft closes the gap.** Watch Agent 365 lifecycle features and Work IQ's agent APIs. They're the most likely to make the Microsoft-only slice of USP 2 a free feature.
3. **Nudge's actual depth** inside automation platforms. Book a demo.
4. **The unverified APIs:** the Power Platform Inventory API fields and licence; OpenAI key owner; the Google Agent Registry list API; AWS registry operation names. Each is a ½–1 day spike in a test tenant.
5. **Survey figures are vendor-sponsored.** Use them as directional only in sales material, and cite the source.

## 9. Sources

**Primary (vendor documentation, press releases, code):**
- Microsoft Agent 365 GA (2026-05-01): https://www.microsoft.com/en-us/security/blog/2026/05/01/microsoft-agent-365-now-generally-available-expands-capabilities-and-integrations/
- Foundry Control Plane overview: https://learn.microsoft.com/en-us/azure/foundry/control-plane/overview
- Foundry Control Plane and Agent 365: https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/foundry-control-plane-and-agent-365-two-control-planes-walk-into-an-enterprise/4520185
- AWS Agent Registry: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html
- AWS Agent Registry GA: https://aws.amazon.com/about-aws/whats-new/2026/08/aws-agent-registry-generally-available
- Gemini Enterprise Agent Platform: https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview
- Introducing it: https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform
- Agentforce session-trace export (beta): https://developer.salesforce.com/docs/ai/agentforce/guide/otel-api.html
- MuleSoft Agent Fabric: https://www.salesforce.com/news/press-releases/2025/05/28/mulesoft-agent-fabric-announcement/
- ServiceNow AI Control Tower launch: https://newsroom.servicenow.com/press-releases/details/2025/ServiceNow-Launches-AI-Control-Tower-a-Centralized-Command-Center-to-Govern-Manage-Secure-and-Realize-Value-From-Any-AI-Agent-Model-and-Workflow/default.aspx
- Anthropic Admin API keys: https://platform.claude.com/docs/en/api/admin-api/apikeys/list-api-keys
- Power Platform inventory: https://learn.microsoft.com/en-us/power-platform/admin/power-platform-inventory
- Copilot Studio agent inventory: https://learn.microsoft.com/microsoft-copilot-studio/admin-agent-inventory
- Atlassian Teamwork Graph connectors: https://developer.atlassian.com/platform/teamwork-graph/connector-reference/overview
- Glean $300M ARR: https://www.glean.com/press/glean-surpasses-300m-arr-unrivaled-enterprise-context-fuels-ai-adoption
- Glean Enterprise Graph: https://www.glean.com/product/enterprise-graph
- Langfuse joins ClickHouse: https://langfuse.com/blog/joining-clickhouse
- ClickHouse acquires Langfuse: https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability
- Zylo 2026 SaaS Management Index: https://zylo.com/news/2026-saas-management-index
- Gartner, AI agent sprawl (2026-04-28): https://www.gartner.com/en/newsroom/press-releases/2026-04-28-gartner-identifies-six-steps-to-manage-artificial-intelligence-agent-sprawl
- BLS JOLTS (Aug 2026, released 2026-09-29): https://www.bls.gov/news.release/archives/jolts_09292026.htm
- Zenity $125M: https://www.businesswire.com/news/home/20260803963850/en/Zenity-Raises-$125-Million-to-Secure-the-Era-of-1-Billion-AI-Agents
- Okta Cross App Access ecosystem: https://www.okta.com/newsroom/press-releases/okta-announces-cross-app-access-partners/
- Datadog AI Agents Console: https://www.datadoghq.com/about/latest-news/press-releases/datadog-expands-llm-observability-with-new-capabilities-to-monitor-agentic-ai-accelerate-development-and-improve-model-performance
- Work IQ APIs: https://www.microsoft.com/en-us/copilot/blog/2026/06/02/announcing-the-new-work-iq-apis/
- Prior studies in this repo: `2026-09-29-horquva-feasibility-study.md`, `2026-10-21-agent365-connector-scope.md`, `2026-10-27-organizational-intelligence-feasibility.md`

**Secondary (trade press, analysts, reviews, vendor-sponsored surveys):**
- Agent 365 pricing analysis: https://samexpert.com/agent-365/
- Agentforce pricing: https://www.eesel.ai/blog/agentforce-pricing · https://www.11x.ai/guides/agentforce-pricing
- Agentforce governance guide: https://aperion.ai/blog/agentforce-governance-guide/
- AgentCore pricing: https://cloudburn.io/blog/amazon-bedrock-agentcore-pricing
- ServiceNow AI Control Tower expansion: https://thelettertwo.com/2026/05/05/servicenow-expands-ai-control-tower-knowledge-2026/
- ServiceNow and AWS: https://www.constellationr.com/insights/news/servicenow-aws-integrate-ai-control-tower-amazon-bedrock-agentcore
- ServiceNow field coverage: https://www.beri.net/article/ai-control-tower-servicenow-governance
- LeanIX AI Agent Hub: https://www.leanix.net/en/blog/sap-leanix-announces-launch-of-ai-agent-hub-and-key-industry-partnerships · https://inclusioncloud.com/?p=53597
- Ardoq agent discovery: https://www.ardoq.com/blog/ai-agent-discovery
- Zenity product updates: https://zenity.io/blog/august-2026-product-updates · https://www.nightfall.ai/blog/zenity-reviews
- NHI consolidation: https://accuroai.co/blog/nhi-consolidation-identity-acquisitions-ai-agent-security · https://labs.cloudsecurityalliance.org/research/csa-research-note-cisco-astrix-ai-agent-identity-market-cons/ · https://tech-insider.org/astrix-vs-oasis-vs-entro-non-human-identity-security-2026/
- Nudge Security: https://www.nudgesecurity.com/post/best-shadow-ai-detection-tools · https://www.decryptiondigest.com/blog/shadow-ai-discovery-tools-comparison-2026
- Observability pricing and comparisons: https://www.braintrust.dev/articles/best-ai-observability-tools-2026 · https://laminar.sh/article/llm-observability-pricing · https://last9.io/blog/best-ai-observability-tools-2026/
- Credo AI and Holistic AI: https://guptadeepak.com/tools/top-5-ai-governance-platforms-2026/ · https://www.decryptiondigest.com/blog/eu-ai-act-compliance-platforms-credo-ai-vs-holistic-ai-vs-fairly-ai
- SaaS management: https://resources.rework.com/tools/it-management/zluri-vs-torii · https://resources.rework.com/tools/it-management/best-torii-alternatives
- n8n valuation: https://sifted.eu/articles/n8n-valuation · https://www.bolsamania.com/nota-de-prensa_email/mercados/n8n-valuation-doubles-to-52bn-as-sap-makes-strategic-investment-and-plans-to-embed-the-ai-platform-into-joule-studio--22470787.html
- Glean ARR analysis: https://futurumgroup.com/insights/glean-doubles-arr-to-200m-can-its-knowledge-graph-beat-copilot/
- Guardian-agent spend: https://www.itbrew.com/stories/2026/03/06/guardian-agents-are-here-and-ready-to-disrupt-the-market
- Accountability surveys: https://www.gravitee.io/state-of-ai-agent-security · https://venturebeat.com/security/85-of-it-teams-claim-every-ai-agent-is-under-control-only-42-actually-know-who-owns-them · https://labs.cloudsecurityalliance.org/agentic/agentic-identity-governance-framework-v1/ · https://www.globenewswire.com/news-release/2026/10/15/3382044/0/en/securityhq-research-finds-an-accountability-gap-in-how-enterprises-govern-ai-agents.html · https://www.helpnetsecurity.com/2026/07/29/1password-ai-agent-governance/
- Merge unified API: https://unified.to/blog/unified_mcp_vs_merge_agent_handler_a_2026_comparison · https://pricingsaas.com/companies/merge/diffs/2026Q2
