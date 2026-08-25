# Product Truth Map & Screen Audit

| Route Path | Primary Purpose | Current Data Source | Backend Capability | Missing States | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| / (Root) | Main Dashboard & High-level Metrics | Local State / Static | Experiment & Runtime Overview | Loading, Error | Audited |
| /admin | System Administration & Settings | Static Mock | User & Role Management | Unauthorized, Empty | Audited |
| /ai-tools | AI Model Tooling & Integration Hub | Local State | AI Intelligence Service | Connection Failed | Audited |
| /audit | Audit Logs & Event Trace | Static Fixtures | Governance & Compliance | Empty Log, Filter Error | Audited |
| /avatar | User Profile Avatar Settings | Static Mock | User Service | Upload Error | Audited |
| /continuity | Business Continuity Planning | Local State | Risk Management | Missing Plan | Audited |
| /decision | Decision Support System & Trade-offs | Local State | Intelligence & Analytics | Data Unavailable | Audited |
| /forecast | Predictive System Forecasting | Static Fixtures | Prediction Engine | Processing Error | Audited |
| /forgot-password | Password Recovery Flow | Static Form | Auth Service | Submission Error | Audited |
| /knowledge | Knowledge Base & Domain Context | Local State | Knowledge Engine | Empty Search | Audited |
| /login | User Authentication | Static Form | Auth Service | Invalid Credentials | Audited |
| /map | System Topology & Map View | Static Graphics | Graph & Network Engine | Render Error | Audited |
| /memory | Contextual Memory Management | Local State | Memory Store | Cache Miss | Audited |
| /network | Graph Network Analysis | Static Fixtures | Network Engine | Node Connection Timeout | Audited |
| /notifications | User Alerts & System Notifications | Local State | Event Bus | Empty Inbox | Audited |
| /oba | Organizational Behavior Metrics | Static Mock | Analytics Engine | Data Unavailable | Audited |
| /onboarding | User Setup & Tour | Static Flow | User Service | Step Failed | Audited |
| /org-science | Organizational Data & Science View | Static Mock | Research Engine | Data Unavailable | Audited |
| /ownership | Resource & Module Ownership Matrix | Local State | Governance Engine | Unassigned Resource | Audited |
| /recommendations | System Insights & Recommendations | Local State | Intelligence Engine | No Recommendations | Audited |
| /risk | System Risk Assessment & Matrix | Local State | Governance & Risk | Risk Calculation Error | Audited |
| /runs | Experiment & Workflow Executions | Execution API | Runtime Orchestration | Execution Failed | Audited |
| /signup | User Registration | Static Form | Auth Service | Validation Error | Audited |
| /simulation | Real-time Scenario Simulation | WebSocket / API | Simulation Engine | Stream Disconnected | Audited |
| /validations | Evidence & Inspection Dashboard | Validation API | Evidence & Intelligence | Validation Failed | Audited |
| /workflows | Workflow Design & Execution Tree | Local State | Workflow Engine | Flow Breakdown | Audited |
