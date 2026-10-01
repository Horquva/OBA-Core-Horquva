# Horquva — Operational Continuity Platform

> **"When someone leaves, nothing breaks."**

Horquva is an enterprise operational continuity platform that detects single points of failure across automated workflows, critical credentials, and business processes. It integrates read-only with enterprise automation tools (n8n), directory backbones (Microsoft Entra ID, Google Workspace), and third-party AI APIs (OpenAI, Anthropic) to build an active dependency graph and certify human backups.

---

## Core Capabilities (7 Screens + Ask Horquva)

1. **Overview Dashboard (`/`)**: Corporate headline metrics (Total Critical Assets, Fully Protected, Exposed Assets, Unconfirmed Facts) and active continuity alerts.
2. **Asset Inventory (`/inventory`)**: Filterable catalog of all tracked automations, people, credentials, models, and apps.
3. **What-If Simulation Engine (`/simulation`)**:
   - **S1: Employee Departure**: Walks the graph to discover orphaned critical assets, broken personal credentials, and weekly run volume lost.
   - **S2: Model & Vendor Outage**: Downstream workflow disruption and weekly run impact when an external model fails.
   - **S3: Succession Handover Test**: Simulates transferring asset ownership to a successor and flags single-point-of-failure concentration overloads.
4. **Confirmation Campaigns (`/campaigns`)**: Access-review style campaigns requesting asset owners to verify human backups, runbooks, and fallback plans.
5. **Attestation Web Form (`/review/[token]`)**: Lightweight, 60-second mobile-friendly web form delivered via single-use magic links without requiring a login password.
6. **Free v0 n8n Ownership Scan (`/n8n-check`)**: Stateless wedge tool that inspects n8n workflows in volatile memory, generates an immediate ownership concentration report, and never stores credentials.
7. **Connectors & Integrations (`/connectors`)**: Management interface for read-only enterprise data sources.
8. **Ask Horquva Assistant**: Grounded Google Gemini 2.0 Flash AI assistant that cites exact entity IDs from the graph ground truth without hallucinations.

---

## Architecture Principles

- **No Synthetic 0–100 Scores**: Every metric is a verifiable count of named, clickable assets.
- **Strict Compliance**: Never predicts individual employee attrition or ranks workers (EU AI Act Annex III compliant).
- **Truth-Preserving Evidence Grades**: All facts and edges are tracked with evidence states (`stated`, `inferred`, `confirmed`, `unknown`). Missing data is explicitly `UNKNOWN`, never assumed false.
- **Read-Only Security**: All API connectors enforce strict `GET`-only requests via `ReadOnlyHttpGuard` with credential masking and host allowlists.
- **Greenfield Database Isolation**: Dedicated PostgreSQL database using `pgcrypto` AES-256 for credential encryption at rest.

---

## Project Structure

```text
├── backend/                  # TypeScript Express API & Inference Engine
│   ├── src/
│   │   ├── ai/               # Grounded Gemini 2.0 Flash & Weekly Briefings
│   │   ├── attestation/      # Campaigns, Token Lifecycle & SMTP Mailer
│   │   ├── connectors/       # n8n, Entra ID, Google Workspace, AI Admin, CSV
│   │   ├── db/               # PostgreSQL Connection Pool & pgcrypto Helpers
│   │   ├── domain/           # Graphology DAG, Deterministic Checks, Simulations, A/B Testing
│   │   ├── routes/           # REST Endpoints (/overview, /inventory, /simulations, /campaigns, /v0)
│   │   └── server.ts         # Express Application & Middleware
│   ├── db/migrations/        # Greenfield Schema (001_initial_schema.sql)
│   └── tests/                # Comprehensive Vitest Test Suites (21 tests)
├── frontend/                 # Next.js 16 (Turbopack) & React 19 Frontend
│   ├── app/                  # App Router: 7 Core Screens
│   ├── components/           # UI Badges, AppShell, Sidebar, AskHorquvaSlideOver
│   ├── lib/                  # Typed API Client & ThemeContext
│   └── types/                # Canonical Screen Presentation Contracts
├── packages/types/           # Shared @horquva/types Domain Package
├── e2e/                      # Playwright E2E Tests with Mobile Viewport Emulation
└── docs/                     # Strategy Session, Feasibility Study, WBS, Product Specs
```

---

## Quickstart

### Prerequisites
- Node.js 22+
- PostgreSQL 15+ (with `pgcrypto` and `uuid-ossp` extensions)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Packages & Types
```bash
npm run build --prefix packages/types
```

### 3. Run Backend Test Suite
```bash
npm test --prefix backend
```

### 4. Start Development Servers
```bash
# Start Backend API (Port 4000)
npm run dev --prefix backend

# Start Frontend App (Port 3001)
npm run dev --prefix frontend
```
