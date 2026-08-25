# Navigation Structure Audit

## Mapped Navigation Items (Sidebar.tsx)

| Nav Item Label | Route (`href`) | Icon | Access Roles | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| Dashboard | `/` | LayoutDashboard | All Roles | Active |
| Ownership | `/ownership` | Users | All Roles | Active |
| Risk Intelligence | `/risk` | ShieldAlert | MANAGER_UP | Active |
| Dependency Map | `/map` | GitFork | All Roles | Active |
| What-If Simulation | `/simulation` | Zap | EXEC | Active |
| Recommendations | `/recommendations` | ListChecks | MANAGER_UP | Active |
| AI Tool Intelligence | `/ai-tools` | Bot | All Roles | Active |
| Knowledge Risk | `/knowledge` | Brain | All Roles | Active |
| Org Memory | `/memory` | Archive | MANAGER_UP | Active |
| Decision Intelligence | `/decision` | Scale | EXEC | Active |
| Continuity & Gov | `/continuity` | Activity | MANAGER_UP | Active |
| Workflows | `/workflows` | Workflow | All Roles | Active |
| Forecast | `/forecast` | TrendingUp | MANAGER_UP | Active |
| Org Science | `/org-science` | FlaskConical | EXEC | Active |
| Admin | `/admin` | Settings | admin, ceo, cto | Active |

## Unmapped Application Routes (Discovered in App Audit)

* `/audit`
* `/avatar`
* `/forgot-password`
* `/login`
* `/network`
* `/notifications`
* `/oba`
* `/onboarding`
* `/runs`
* `/signup`
* `/validations`