# Microsoft Agent 365 / Entra Agent ID connector: scope

**Date:** 2026-10-21 · **Status:** proposed, not built · **Branch context:** `mvp/v1-continuity`

All API facts below were checked against Microsoft Learn on 2026-10-21. Anything not confirmed in a doc is marked **unverified** and listed in §8.

---

## 1. Why build it

Microsoft Agent 365 already keeps a registry of AI agents. It covers Microsoft's own agents, Copilot Studio, Foundry, partner agents, and agents synced from Bedrock, Vertex AI, Agentforce, Databricks, Anthropic, Oracle and Snowflake. OBA should **read** that registry instead of rebuilding it. Every agent Microsoft governs then enters OBA's loop:

- discover the agent;
- confirm its backup and criticality;
- hand it over before the owner leaves;
- verify afterwards that it still runs.

Microsoft does none of those four steps. That gap is our product.

## 2. What it reads

Two independent sources, both on Microsoft Graph and both read-only GETs.

### A. Entra Agent ID (agent identities)

| Call | Endpoint (v1.0) | Gives us |
|---|---|---|
| List agent identities | `GET /servicePrincipals/microsoft.graph.agentIdentity` | id, displayName, accountEnabled, createdDateTime, createdByAppId, agentIdentityBlueprintId, tags. Page size up to 100. |
| List owners | `GET /servicePrincipals/{id}/microsoft.graph.agentIdentity/owners` | Technical owners (users or service principals) |
| List sponsors | `GET /servicePrincipals/{id}/microsoft.graph.agentIdentity/sponsors` | Business-accountable sponsors (users or groups); at least one is required on every agent identity |

Docs: [agentIdentity resource](https://learn.microsoft.com/en-us/graph/api/resources/agentidentity?view=graph-rest-1.0), [list](https://learn.microsoft.com/en-us/graph/api/agentidentity-list?view=graph-rest-1.0), [owners](https://learn.microsoft.com/en-us/graph/api/agentidentity-list-owners?view=graph-rest-1.0), [sponsors](https://learn.microsoft.com/en-us/graph/api/agentidentity-list-sponsors?view=graph-rest-1.0).

### B. Agent 365 catalog (Package Management API)

| Call | Endpoint (v1.0) | Gives us |
|---|---|---|
| List agents | `GET /copilot/admin/catalog/packages?$filter=supportedHosts/any(h:h eq 'Copilot')` | Every agent in the tenant catalogue: id, displayName, type, publisher, platform, isBlocked, availableTo, deployedTo, lastModifiedDateTime, agentIdentityId, governanceMetadata |
| Get agent | `GET /copilot/admin/catalog/packages/{id}` | Adds lastUsedDateTime, activeUsers, totalSessions, totalRunTimeInHours, **exceptionRate** (all 30-day), sharedWith/allowed users and groups, sensitivity |

Docs: [overview](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/admin-settings/package/overview), [list](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/admin-settings/package/copilotpackages-list), [copilotPackageDetail](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/admin-settings/package/resources/copilotpackagedetail).

**Important gap:** the documented package properties have **no owner field**. The admin centre's CSV export and the `reassign` action imply that an owner exists, but the API doesn't return it. Owners therefore come from source A (joined through `agentIdentityId`) or from an OBA confirmation campaign. That fits discover + confirm.

## 3. Permissions

All application permissions, consented by the customer's admin on the existing OBA Entra app registration.

| Permission | Needed for | Read-only? |
|---|---|---|
| `AgentIdentity.Read.All` | List agent identities and their owners | Yes |
| `CopilotPackages.Read.All` | List and get catalogue agents | Yes |
| `AgentIdentity.ReadWrite.All` | **List sponsors**: Microsoft documents no read-only application permission for this call | **No** |

**Decision needed (D-1): sponsors.** Reading sponsors needs a write-capable permission. That breaks our "read-only, metadata-only" promise the same way the n8n owner key does. Options:

1. **Skip sponsors in v1.** Use owners plus OBA confirmation for accountability. *(Recommended.)*
2. Make it an opt-in "extended" mode, disclosed the way we disclose n8n.
3. Test whether `$expand=sponsors` on the list call works under `AgentIdentity.Read.All` (unverified, §8).

## 4. Licence dependency

| Source | What the customer needs | What happens without it |
|---|---|---|
| A. Agent ID (identities + owners) | No licence requirement is stated on the read API pages (**unverified**, §8). Microsoft's sponsor *governance* features need M365 E7, or Agent 365 plus Entra P1 / M365 E3. | We read whatever agent identities exist. |
| B. Package Management API | **Microsoft Agent 365 licence required.** It [lists at $15/user/month](https://www.microsoft.com/licensing/faqs/122) standalone, or comes in M365 E7 at $99. | The call fails. The connector marks the module "not licensed" and carries on. |

So the connector must **detect, not assume**: a 403 or licence error on B is a normal state, shown on the Connections screen as "Agent 365 not licensed; Microsoft agent inventory unavailable". It's not a sync failure.

## 5. How it maps into OBA

Built as an **extension of the existing `EntraConnector`** (`backend/src/connectors/entra/index.ts`). It uses the same app registration, tenant, token and Guard allow-list (`graph.microsoft.com`). Each module is optional and can fail on its own.

| Microsoft object | OBA entity / edge / fact | Grade |
|---|---|---|
| Agent identity or catalogue agent | entity `kind: 'automation'`, `externalRefs.platform = 'microsoft-agent'`, joined on `agentIdentityId` | stated |
| Agent identity owner (user) | edge `person → owns → automation` | stated |
| Sponsor (if D-1 allows) | edge `owns` plus fact `accountable_role = sponsor` | stated |
| Agent with no owner and no sponsor we can read | no edge; goes to a confirmation campaign | unknown, never "no owner" |
| accountEnabled, isBlocked | facts `status` | stated |
| lastUsedDateTime, totalSessions, exceptionRate | facts `last_run`, `runs_30d`, `failure_rate` | stated |

Using `kind: 'automation'` avoids changing `EntityKind` in `packages/types`. That means no knock-on changes to the 7 screens, filters or the What-If engine. A separate `'agent'` kind can come later if design partners ask for it.

**Post-departure verification.** After a leaver's account is disabled, re-read their agents' accountEnabled, isBlocked, lastUsedDateTime and exceptionRate, and flag a stop or a spike. This hooks into the departure verifier (`backend/src/jobs/scheduler.ts`, `routes/departures.ts`), which today only checks n8n.

## 6. Out of scope

- **Any write action.** We don't block, reassign or change sponsors. Microsoft's reassign is beta and needs a write permission. OBA recommends the action; the customer's admin does it in Microsoft.
- **Agents synced from other clouds**, until §8 item 3 confirms they appear in the package list.
- **Microsoft Lifecycle Workflow configuration.**
- **Existing Entra connector gaps found while scoping.** These are not part of this work, but worth a separate ticket:
  - the file header says it discovers the manager hierarchy, but `$select` doesn't request it;
  - enterprise-app (servicePrincipal) owners and group owners aren't read, although the 2026-09-30 scope lists them;
  - there's no unit test for `EntraConnector`; only `tests/auth/entra.test.ts` (sign-in) exists.

## 7. Effort

Estimate for one engineer who knows the connector SDK. It assumes a Microsoft test tenant with an Agent 365 licence (trial or Frontier) is available. Without one, step 1 blocks everything.

| # | Work | Days |
|---|---|---|
| 1 | Test tenant setup: Agent 365 licence, a few Copilot Studio and Foundry agents, app permissions, resolve §8 unknowns | 2 |
| 2 | Agent ID module: list identities and owners, paging, mapping | 2 |
| 3 | Package module: list and detail, licence detection, join on agentIdentityId | 2 |
| 4 | Facts and post-departure verification hook | 2 |
| 5 | Connections UI: permission checklist, "Agent 365 not licensed" state, Microsoft-agent filter on Assets | 1.5 |
| 6 | Tests: mocked-Graph unit tests for both modules and the licence-missing path; one pg sync test | 2 |
| 7 | Docs, data-processing note and customer permission guide | 0.5 |
| | **Total** | **≈ 12 engineer-days (about 2.5 weeks)** |

Sponsors via option 2 (opt-in write permission) add about 1 day. Option 3 is covered by step 1.

## 8. Unverified, to settle in the test tenant (step 1)

1. Can sponsors be read under `AgentIdentity.Read.All`, e.g. via `$expand`?
2. Does reading agent identities need any licence beyond Entra ID Free?
3. Do agents synced through Agent 365 "Connected platforms" (Bedrock, Vertex, Anthropic, …) appear in `/copilot/admin/catalog/packages`, with an `agentIdentityId`?
4. Do Copilot Studio agents shared by a creator always have an agent identity? If not, those agents have no API-readable owner.
5. Rate limits and paging behaviour of the package API at a few hundred agents.

## 9. Decisions for the team

- **D-1 Sponsors:** skip (recommended), opt-in, or test first.
- **D-2 Priority:** this vs. the Entra gaps in §6. The gaps help every Microsoft customer; this only helps customers with Agent 365 or agent identities.
- **D-3 Test tenant:** who obtains an Agent 365 licence for testing.
