# Part 3: Power Platform connector, separate plan (deferred, ~6–8 engineer-days, after T2)

**Facts [P]:**
- The inventory query is `POST {PowerPlatformAPI url}/resourcequery/resources/query?api-version=2024-10-01`.
- Body: `{TableName:"PowerPlatformResources",Clauses[…],Options{Top,Skip,SkipToken}}`.
- Response: `{totalRecords,count,resultTruncated,skipToken,data[]}`.
- **Delegated user auth only**: a service principal or managed identity gets 403.
- Access roles: Global admin, Power Platform admin, Dynamics 365 admin, Global reader (all resources); AI admin / AI reader (AI resources only).
- Types: `microsoft.copilotstudio/agents`, `microsoft.powerautomate/cloudflows|agentflows|m365agentflows`, `microsoft.powerapps/*`.
- Fields: `properties.{displayName,createdAt,createdBy,ownerId,environmentId,lastModifiedAt,lastModifiedBy,powerPlatformConnectors[](preview),trigger}`.
- The flow owner is the creator and "doesn't update when the owner changes".
- Data refreshes within 15 minutes.

**Steps:**
1. **Spike (1d):** Azure Resource Graph `PowerPlatformResources` app-only with a documented role. App-only is "not documented" [OSS ValueLens]; the result decides the path.
2. **Delegated path (2d):**
   - admin OAuth code flow;
   - encrypted refresh token (existing AES-GCM);
   - a reconnect state;
   - a guard `post()` limited to one allow-listed (host, path), with the exact host resolved in the spike.
3. **Connector (2d):**
   - page on `skipToken`;
   - map to automation/app;
   - `ownerId` → owner edge via `entraId` (flows get `ownerKind:'creator'`);
   - `powerPlatformConnectors` → `depends_on`.
4. **Identity (1d):** an `entraId → person` index.
5. **Status per probe:** forbidden, empty or error → `errors++`, nothing closed [OSS].
6. **Tests (1d):** a fake inventory server shaped as documented; token refresh; the guard allow-list.

On approval, Parts 2 and 3 are also saved to `docs/plans/2026-10-28-test-tenants.md` and `docs/plans/power-platform-connector.md`.
