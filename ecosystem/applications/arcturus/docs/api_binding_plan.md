# Key Screens API Data-Binding Audit & Fix Plan

| Target Screen | Route | Current Data State | Backend Endpoint Target | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Simulation** | `/simulation` | Mock / Static State | `WS /api/websocket/simulation_stream` | Real-time WebSocket streaming connection integrate karein. |
| **Executions & Runs** | `/runs` | Static Fixtures | `GET /api/routers/runtime` | Execution list & status polling bind karein. |
| **Validations & Evidence** | `/validations` | Local State | `GET /api/routers/experiments` | Experiment evidence & checkpoint validation data pull karein. |
| **Ontology & Map** | `/map` | Static Graphics | `GET /api/routers/ontology` | Dynamic ontology snapshot & graph data fetch karein. |

## Implementation Steps
1. Integration hooks create/update karein key endpoints ke liye.
2. Loading, Error, aur Empty fallback states wire up karein.
3. Live socket reconnections handle karein real-time stream par.
