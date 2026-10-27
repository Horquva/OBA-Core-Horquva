# Part 2: Test-tenant plan (owner tasks, start day 1)

| # | Environment | Steps | Cost / owner | Verified? |
|---|---|---|---|---|
| T1 | Entra tenant | Azure free account → "your new Azure account automatically includes a default Entra ID tenant", and the account holder becomes Global Administrator (Microsoft Learn training module), so admin consent is possible. App with User.Read.All, Application.Read.All, optional User-LifeCycleInfo.Read.All → admin consent (Directory.Read.All only when the deferred A5 grants module returns). 8 users with managers; 2 app registrations with owners and a secret expiring in 10 days; 1 SP owned by a user who'll be disabled; 1 user consents to a third-party app (kept for the deferred A5). | Affan; free tier **[verify at signup]** | Permissions [P]; signup not verified |
| T2 | M365 trial (Part 3 only) | Business Premium "Try for free" one-month trial (reported by a pricing tracker, Aug 2026; not confirmed on a Microsoft page). The developer E5 sandbox is restricted (community reports). | Owner; confirm on Microsoft's trial page before relying on it | Secondary only |
| T3 | OpenAI org | **Only organisation owners can create Admin API keys**; when creating one "you choose the permissions the integration needs" (OpenAI help: "Admin and Audit Logs API for the API Platform"). So create a **read-only** key with read access to users, projects, API keys and **Usage** (the Costs API reports a missing `api.usage.read` scope without it, per an OpenAI community thread) and record its exact permissions in `docs/test-tenants/`. The same list goes into the Settings help text. Owner → Settings → Organization → Admin keys. 2 projects, 3 keys; remove one key owner from its project (expected `owner_project_access=inactive`, from the field definition [P], **[LIVE-VERIFY]**); a few calls. | Small prepaid credit | Key creation per vendor guides |
| T4 | Anthropic org | Create an Organization [P] → admin key → 2 workspaces, 3 keys from 2 members, a few calls. | Small credit | [P] |
| T5 | n8n | `docker run n8nio/n8n`; owner + 2 members; workflows using personal credentials. | Free | [P] |
| T6 | Seed scripts | `docs/test-tenants/`, built in S3. | Ibrahim | — |

**Seeded orphans (revision 17, during S1):** a key owned by a user who is then disabled; an n8n workflow on a disabled member's personal credential; an Entra app secret expiring within 30 days whose only owner is disabled; a key whose owner is not in the directory.

**Exit (10 Nov checkpoint):** `orphanScan.ts --verify-shapes` finds every seeded orphan on T1, T3, T4 and T5. No design partner is needed.

