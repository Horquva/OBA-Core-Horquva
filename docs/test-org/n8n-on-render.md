# n8n on Render, free plan (runbook R6)

The original test-org n8n is gone (owner, 27 Nov 2026), so it is rebuilt on Render from `infra/n8n/render.yaml`. Everything runs on free plans. No credential value is written in this file, in chat, or in Git.

## 1. What the setup is

| Part | Where | Plan |
| --- | --- | --- |
| n8n web service `horquva-n8n` | Render, image `n8nio/n8n:1.123.102` | Free |
| n8n's database | The test org's Supabase project (`horquva-live-test`), schema `n8n_v1` | Free |
| Keep-awake ping | cron-job.org, `/healthz` every 10 minutes | Free |

Why it is shaped this way:

1. A free Render Postgres is deleted 30 days after creation, so n8n's data lives in Supabase instead. A free Supabase project does not expire; it pauses after a week without activity, which n8n's own activity prevents.
2. Supabase allows two active free projects per owner, so n8n shares the test org's project in its own schema rather than taking a second one.
3. A free Render web service sleeps after 15 minutes without traffic, and n8n's schedules do not run while it sleeps. The ping keeps it awake.
4. n8n keeps its default pool of 2 connections. A pool of 1 made every query wait behind the one running, and the backlog ran n8n out of memory (28 Nov 2026). Supabase's session pooler allows 15 clients, so the backend's pool is lowered before it moves to this project (runbook R8).
5. n8n is pinned to 1.123.102. n8n 2.x ran out of heap on the free 512 MB instance every few minutes ("JavaScript heap out of memory", 27–28 Nov 2026), even with a heap cap and the default pool. The `/api/v1` public API is the same in 1.x.

Sources, checked 27 Nov 2026: render.com/docs/deploy-n8n, render.com/hosting/n8n, render.com/docs/your-first-deploy, supabase.com/pricing, supabase.com/docs/guides/platform/billing-faq, docs.n8n.io database environment variables, cron-job.org/faq.

## 2. Steps for the owner

### 2.1 Supabase project (also runbook R7)

1. At supabase.com, create a new project named `horquva-live-test` on the Free plan. Save the database password in the password manager.
2. Choose the region closest to where the Render service will run (Render's region is picked in 2.2; use the same part of the world for both).
3. Open SQL Editor, run `create schema if not exists n8n_v1;`.
4. Click Connect, choose Session pooler, and keep that panel open for 2.2. You need the host, the user (it looks like `postgres.<project ref>`) and the password.

### 2.2 Render Blueprint

1. Wait until Claude says `infra/n8n/render.yaml` is pushed to `mvp/v1-continuity`.
2. In the Render dashboard, check that no other free service runs in this workspace. One always-on free service uses about 744 of the 750 free hours a month.
3. Choose New, then Blueprint. Pick the repository `Horquva/OBA-Core-Horquva` and branch `mvp/v1-continuity`.
4. Set the Blueprint file path to `infra/n8n/render.yaml`. If Render shows no path field, stop and tell Claude.
5. Render lists one service, `horquva-n8n`. Check it says Free.
6. Fill the four values Render asks for:
    - `DB_POSTGRESDB_HOST`: the session pooler host from 2.1.
    - `DB_POSTGRESDB_USER`: the session pooler user from 2.1.
    - `DB_POSTGRESDB_PASSWORD`: the database password.
    - `WEBHOOK_URL`: `https://horquva-n8n.onrender.com/` (correct it after the first deploy if Render gives the service a different address).
7. Apply. Wait for the deploy to finish.
8. Open the service's Environment tab and copy `N8N_ENCRYPTION_KEY` into the password manager. Never change it: every credential stored in n8n is encrypted with it.
9. If the deploy fails, copy the log lines that mention the database or an error and send them to Claude, with any password removed.

### 2.3 n8n owner account and API key

1. Open the service URL. Create the owner account with your own email and a new password.
2. In n8n, open Settings, then n8n API, and create an API key labelled `horquva-connector`. Copy it.
3. In `backend/.env.connectors`, set `N8N_BASE_URL` to the service URL (no trailing slash) and `N8N_API_KEY` to the key.

### 2.4 Keep it awake

1. Sign up at cron-job.org (free).
2. Create a cron job for `https://<service URL>/healthz`, every 10 minutes.

### 2.5 Hand back

Tell Claude the file is updated. Claude runs the platform probe for n8n and reports which checks pass.

## 3. Not yet possible

The 15 original workflows, their 5 credentials and their owners are defined in `workflow-inventory.md`, which is in Sumavia's `/shared/` archive. They are rebuilt only from that file, so the ground truth still matches. Until it arrives, n8n runs with no workflows.
