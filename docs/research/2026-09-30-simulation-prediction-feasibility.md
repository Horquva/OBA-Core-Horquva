# Horquva — Simulations & Predictions: Need, Validity and Feasibility

**Date:** 2026-09-30
**Question:** Which of the simulations and predictions Horquva claims are needed, possible and buildable, by two engineers, on data we can actually get?
**Companion docs:** `2026-09-29-horquva-feasibility-study.md` (data sources), `2026-09-29-horquva-product-engineering-foundation.md` (architecture, scope).

---

## 0. Bottom line

1. **Keep the simulations. They're needed, valid and buildable.** "What happens if Ahmed leaves / OpenAI goes down / this automation breaks, and does handing it to Sara fix it?" is a deterministic computation over the dependency map. Financial regulators already *require* this kind of scenario testing (UK FCA/PRA operational resilience; EU DORA). The market sells it (Fusion Risk Management). Nothing about it is impossible. Its accuracy is bounded only by how complete the map is, and we can say that honestly.

2. **The current "predictions" don't hold up and should not ship as they are.**
   - The **predicted risk score** comes from a Bayesian network whose probability tables were written by hand. The papers the blueprint cites *learned* their tables from real data, so none of their validity carries over.
   - **Blast radius** uses eIRWR, a real paper (Khan & Farea, arXiv, Aug 2026), but it's a *root-cause* algorithm. It works backwards from observed failures to find where they started. Our code runs it forwards to predict impact, outside what the paper validated. That mismatch is why its "upstream cascade pressure" came out inverted.
   - **Health change** in simulations is 0 in 35 of 48 scenarios.
   - **Forecasts** are read from a frozen table.

3. **Real predictions are possible, but they must be grounded in base rates from real data, not invented weights:**
   - **Automation failure rates** from n8n execution history.
   - **Vendor incident frequency** from public status-page APIs (OpenAI and Anthropic both expose them).
   - **The organisation's own turnover rate** from leaver events in the directory.

   These can feed a probabilistic simulation (Monte Carlo over the dependency map): *"Over the next 90 days, given your turnover and these vendors' incident history, the chance that Invoice Automation is disrupted is between X and Y."* That's defensible because every input is observed and the method is standard reliability engineering. It needs **2–3 months of accumulated history** first, so it belongs in v2.

4. **One prediction must never be built: the probability that a specific person leaves.** Under the EU AI Act, AI that monitors or evaluates workers' behaviour, or informs termination-related decisions, is **high-risk** (Annex III; obligations reported to apply from 2 Dec 2027). It also contradicts our US compliance positioning, and we don't have the data (performance, pay, engagement) anyway. Use the organisation-wide turnover rate instead, applied equally to everyone.

5. **The way to make predictions trustworthy is to record them and check them.** From day one, store every probabilistic statement with its date, then compare it with what actually happened (leavers, failures, vendor incidents). Within months that gives measured accuracy we can publish. No competitor has that dataset. It's the path to honest "prediction" claims, and a moat.

---

## 1. Definitions (this distinction is the whole argument)

| Term | Meaning | Example | How you prove it's right |
|---|---|---|---|
| **Simulation** (deterministic what-if) | *If* X happens, what follows, given the recorded dependencies? | "If Omar leaves, these 4 automations have no owner; 2 are critical." | **Correctness:** it follows from the recorded facts. Test on a hand-checkable fixture. |
| **Probabilistic simulation** | Given how often things fail, how likely is a disruption over a period? | "22–35% chance Invoice Automation is disrupted in the next 90 days." | **Calibration:** over time, events predicted at ~30% happen about 30% of the time. Needs outcome data. |
| **Prediction about an individual** | How likely is *this person* to do X? | "Omar is 70% likely to leave." | Needs personal data and labelled outcomes. **Legally high-risk.** |

Most of Horquva's value, and all of what regulators ask for, is the first row. The current product blurs rows 1 and 2 and presents invented numbers as row 2.

---

## 2. Is there a need? (demand evidence)

| Source | What it requires or offers | Relevance |
|---|---|---|
| **UK FCA PS21/3 / PRA operational resilience** (full compliance since 31 Mar 2025) | Firms must map important business services and **test that they stay within impact tolerance in severe-but-plausible scenarios**, across **people, processes, technology and resources**, reviewed at least annually. | Direct regulatory demand for dependency mapping + scenario testing, including people. |
| **EU DORA, Art. 11** | Business impact analysis using **scenario analysis**, considering critical functions, **third-party dependencies and their interdependencies**. Continuity plans tested at least yearly. | Direct demand for the vendor/model outage simulation. |
| **EU DORA, Art. 28** | Register of all ICT third-party arrangements; **concentration risk** assessment; exit strategies for critical providers. | Direct demand for vendor/model concentration. |
| **Fusion Risk Management** (enterprise BCM) | Maps people, processes, places, systems and third parties; **what-if scenarios on dependencies**. | Proves buyers pay for what-if on dependency maps. Their maps are built by hand. |

**Where the need is strongest:** regulated financial services, where scenario testing is mandatory. **A tension with the chosen first customer profile** (mid-market n8n shops): for them this isn't a legal obligation. The value is practical (succession planning, offboarding, AI-rollout risk). Both can be served, but the pitch differs. Decide which to lead with; see §8.

---

## 3. Verification of the current claims

| Current claim | What's actually behind it | Verdict |
|---|---|---|
| **Leaver simulation** (`employeeLeaves`) | Removes the person's ownership and walks dependents | ✅ Sound concept. Keep, rebuilt deterministically, with unknowns shown explicitly. |
| **Agent/automation fails** (`agentFails`) | Walks what depends on the agent | ✅ Keep |
| **Platform/vendor down** (`platformDown`) | Walks dependents of the platform. The old diagnostic found the health delta was always 0 because platforms weren't read. | ✅ Keep the concept. The old implementation was broken. |
| **Workflow disruption** | Walks downstream of a workflow | ✅ Keep |
| **Succession** (`employeeLeavesWithSuccessor`) | Transfers assets to a named successor, recounts | ✅ Keep. A strong, unique feature. |
| **Scenario ranking** ("worst single losses") | Runs every single-loss scenario and sorts | ✅ Keep. Sort by concrete impact, not a health delta. |
| **Blast radius via eIRWR** | Real paper: *eIRWR: Enhanced Iterative Random Walk with Restart for Scalable Root Cause Analysis in Microservices* (Khan & Farea, arXiv, 8 Aug 2026). It **localises the originating fault from observed anomalies** (MRR 0.75, under 25 ms on 17k nodes). | ❌ **Misapplied.** A root-cause ranker, used here for forward impact. Its backward edges are designed to walk *toward causes*, which is why the old code flagged healthy agents as "under cascade pressure". Replace with plain reachability, optionally weighted by attested criticality. |
| **Predicted risk score / P(Critical)** (Bayesian network) | Cited papers are real: Aquaro et al. 2009 (Bayesian networks for bank operational risk, **learned from loss data, validated on synthetic series**); Kumar et al. 2025 (urban cascading risk, **learned from urban + synthetic data**). Horquva's tables were **hand-written**, with no data. | ❌ **Not a prediction.** It inherits none of the papers' validity. "Calibrated" is false. Remove any probability output until outcome data exists (§6). |
| **Health delta** (Δ org health per scenario) | 35/48 scenarios return 0; a composite of authored formulas | ❌ Drop. Replace with concrete impact measures (§4). |
| **Forecasts** (`organizational_forecasts`) | Read from a static table; names carriers the live model says don't exist | ❌ Drop |
| **Volatility** | Pattern-reading over change history | ⏳ Valid later. Needs months of real change events. |

---

## 4. The simulations we keep: method, data, effort

All deterministic, over the fact store and graph from the engineering foundation doc.

| # | Simulation | Input | Output | Data it needs (and where from) | Effort (eng-wks) |
|---|---|---|---|---|---|
| S1 | **Person leaves** | A person | Assets left with no owner or backup; critical ones; everything downstream; **run volume at risk** | Owners (n8n creator/project + attestation), backups (attestation), edges (n8n nodes/credentials), run counts (n8n executions) | in v1 core |
| S2 | **Automation/agent fails** | An asset | Everything downstream and its run volume | Edges, run counts | in v1 core |
| S3 | **Vendor/model unavailable** | Vendor or model (e.g. OpenAI) | Automations calling it (via node types/credentials), their owners, run volume, and which have an attested fallback | n8n node types → vendor catalog; OpenAI/Anthropic usage by project or key; fallback (attested) | in v1 core |
| S4 | **Credential owner leaves** | A person | Automations running on *that person's* credentials. They break when the account is disabled, even with another owner. | n8n node `credentials` + credential ownership | +0.5 (strong, unique finding) |
| S5 | **Succession test** | Person + successor | Coverage after handover; successor's new concentration; what stays uncovered | Same as S1 | in v1 core |
| S6 | **Worst single losses** | — | All S1–S3 scenarios ranked by critical assets orphaned, then run volume | Same | in v1 core |
| S7 | **Combined scenario** ("severe but plausible") | Several events, e.g. person leaves + vendor down | Union of impacts, with interaction (the backup is also the one who left) | Same | +0.5 |

**Replacing "health delta" with concrete impact measures:**
- critical assets left with no owner;
- automations that stop;
- **runs per week affected**, from n8n execution counts, which is real volume;
- departments affected;
- how many affected facts are "unknown".

Every one is a count of named things.

**Honesty in every output:** "Based on 41 recorded automations. 6 have an unknown backup, and 2 may be affected but we can't confirm."

**Data gotcha, verified:** n8n prunes execution history (self-hosted default 336 hours = 14 days; Cloud Starter 7 days, Pro 30 days, Enterprise unlimited). **Horquva must store its own daily run and failure counts** from the first sync, or volume and failure history won't exist. +0.5 eng-wk, v1.

**Validation of S1–S7:** correctness, not calibration. A hand-built test org where every answer is worked out on paper, plus property tests (e.g. adding a backup never increases what's orphaned).

---

## 5. Predictions: what's possible, grounded in real base rates

| # | Prediction | Data source (verified) | Method | Validity | Verdict / when |
|---|---|---|---|---|---|
| P1 | **Automation failure rate** and trend | n8n `GET /executions?status=error&workflowId=&startedAfter=`, stored daily by us | Empirical rate over the last N runs, smoothed for low counts (beta-binomial); trend over weeks | Observed, not modelled. Label it "failed 12 of 400 runs in 30 days, rising". | ✅ **v1.1** (1 wk) |
| P2 | **Vendor incident frequency** | Statuspage JSON: `status.openai.com/api/v2/incidents.json` (returned 23 incidents, 11–29 Sep 2026); `status.claude.com/api/v2/incidents.json` (16 incidents, 16 Aug–29 Sep 2026, with components) | Incidents per 90 days by impact level; the feed only covers a recent window, so **poll daily and accumulate** | Vendor-*reported* incidents, not your experience of them. Say so. | ✅ **v1.1** (0.5–1 wk) |
| P3 | **Organisation turnover base rate** | Directory leaver events (Entra `accountEnabled` / `employeeLeaveDateTime`; Google `suspended`/`archived`) accumulated over time; the customer can enter a historical figure to start | Annualised rate, org-wide or per department (with a minimum group size to avoid identifying anyone) | Aggregate. **Applied equally to every person.** | ✅ v1.1 input, used in v2 |
| P4 | **Bus factor per automation or area** | n8n workflow version history (`/workflows/{id}/history`): who edited what | Adapted truck-factor algorithm: degree-of-authorship + greedy removal (Avelino et al., ICPC 2016; 46% of 133 popular GitHub projects had truck factor 1) | ⚠️ **Inferred only.** Wheeler (arXiv, Jun 2026) argues AI-generated work breaks "authorship = understanding", which matters for AI-built automations. Treat as a hint that feeds attestation, never as fact. | 🟡 **v1.1** (1 wk), labelled inferred |
| P5 | **Probability of disruption over a period** (probabilistic simulation) | P1 + P2 + P3 + the dependency map + attested backups and fallbacks | **Monte Carlo over the graph**, standard fault-tree / reliability practice: sample person departures (P3), vendor incidents (P2), automation failures (P1); propagate; count disruptions of each critical asset; report a **range** | Inputs are observed base rates. Structure is the recorded map. Output is conditional on both, and must be shown with its assumptions. Accuracy is unproven until checked (§6). | ⏳ **v2**, after 2–3 months of accumulated history (2–3 wks) |
| P6 | **Time to recover / rebuild** | No API. Ask owners in attestation ("how long would it take someone else to take this over?") | Attested input used by S1–S7 (e.g. "uncovered for ~3 weeks") | Opinion, labelled as attested | ✅ v1.1 as an attestation question |
| P7 | **Chance a specific person leaves** | Would need performance, pay and engagement data we don't have | Attrition model | **EU AI Act Annex III high-risk** (monitoring or evaluating workers' behaviour; termination-related decisions); contradicts our US positioning | ❌ **Never** |
| P8 | **Forecasts / trends of organisational "health"** | — | — | No real history; the old version read a frozen table | ❌ Drop. Revisit as volatility trends after 6+ months of change events. |

---

## 6. How predictions become trustworthy: the prediction ledger

This is the part no amount of maths replaces.

1. **Record every probabilistic output** (P1 trend flags, P5 disruption ranges) with timestamp, inputs and model version. It's an append-only table, about 1 eng-wk, and should start in **v1.1** even before anything is shown.
2. **Record outcomes automatically** from data we already collect: leaver events (directory), failure spikes (executions), vendor incidents (status pages), automations that went ownerless.
3. **Score regularly:** Brier score and calibration buckets. "Of disruptions we rated 20–30% likely, 24% happened."
4. **Only show a probability in the product once its calibration has been measured** on enough events. Before that, show base rates and scenario ranges with their assumptions, not "predictions".

This fixes the blueprint's false "calibrated" claim properly: calibration becomes something we *measure and publish*. Over many customer-months it's also a dataset competitors don't have.

---

## 7. Effort and where it lands (two engineers)

| Item | Release | Eng-wks |
|---|---|---|
| S1–S3, S5, S6 deterministic simulations with concrete impact measures | v1 (already in plan item 10) | (1.5, existing) |
| S4 credential-owner leaves | v1 | +0.5 |
| S7 combined scenarios | v1 | +0.5 |
| Daily storage of run and failure counts (n8n retention workaround) | v1 | +0.5 |
| P1 automation failure rates + trend | v1.1 | 1 |
| P2 vendor incident base rates (status-page polling) | v1.1 | 0.5–1 |
| P3 turnover base rate | v1.1 | 0.5 |
| P4 bus factor (inferred) | v1.1 | 1 |
| P6 time-to-recover attestation question | v1.1 | 0.25 |
| Prediction ledger (record only) | v1.1 | 1 |
| P5 Monte Carlo disruption ranges | v2 (after 2–3 months of history) | 2–3 |
| Calibration scoring + showing measured accuracy | v2 | 1–1.5 |

**Impact on the plan:** v1 grows by about 1.5 eng-wks (under 1 calendar week for two engineers). v1.1 grows by about 4–5 eng-wks, so it takes about 5–6 weeks instead of 4. v2 adds about 3–4.5 eng-wks.

---

## 8. What we can and can't claim

**Can claim now (v1):**
- "Simulate what happens if a person leaves, an automation fails, or an AI vendor goes down, including combined scenarios. See exactly what stops, who's left holding it, and how many runs a week are affected."
- "Test a successor before you hand over."
- "Find automations that will break when someone's account is disabled, because they run on that person's credentials."
- "Supports the dependency mapping and scenario testing expected under UK operational resilience rules and DORA." Supports, not "ensures compliance".

**Can claim from v1.1:** "Tracks real failure rates of your automations and the incident history of your AI vendors."

**Can claim from v2, once calibration is measured:** "Estimates the likelihood of disruption over the next quarter from your own history, and publishes how accurate those estimates have been."

**Never claim:**
- "Predicts who will leave".
- "Calibrated / peer-reviewed / mathematical proof", until calibration is actually measured.
- "Real-time prediction".
- Any single-number "predicted risk score" without its inputs.

---

## 9. Decisions for the owner

1. **Adopt the split:** deterministic simulations in v1, base-rate signals in v1.1, probabilistic simulation in v2, gated on measured calibration.
2. **Retire eIRWR and the hand-written Bayesian network** from the product. The papers are fine; our use of them isn't.
3. **Never build individual attrition prediction.**
4. **Start the prediction ledger in v1.1.**
5. **Choose the lead market for the simulation pitch:** regulated financial services (scenario testing is mandatory: stronger need, slower sales, and enterprise tooling like ServiceNow and CMDB appears sooner) or mid-market AI-automation companies (the practical succession/offboarding pitch; matches the n8n-first connectors). My recommendation: mid-market first for speed and connector fit, with the regulatory framing as a second-phase expansion.

---

## Sources

- eIRWR paper (Khan & Farea, 2026): https://arxiv.org/abs/2608.08073
- Aquaro et al., A Bayesian Networks Approach to Operational Risk: https://arxiv.org/abs/0906.3968
- Kumar et al., Cascading Urban Risk with Bayesian Networks: https://arxiv.org/abs/2505.06281
- FCA PS21/3 Building operational resilience: https://www.fca.org.uk/publications/policy-statements/ps21-3-building-operational-resilience
- FCA operational resilience insights: https://www.fca.org.uk/firms/operational-resilience/insights-observations
- DORA Article 11: https://www.digital-operational-resilience-act.com/Article_11.html
- DORA Article 28: https://www.digital-operational-resilience-act.com/Article_28.html
- EU AI Act Annex III: https://artificialintelligenceact.eu/annex/3/
- EU AI Act Service Desk, Annex III: https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3
- EU AI Act high-risk timing (DLA Piper): https://intelligence.dlapiper.com/artificial-intelligence/?t=06-high-risk-uses&c=EU
- Fusion business continuity: https://www.fusionrm.com/solutions/business-continuity-management/
- Avelino et al., A Novel Approach for Estimating Truck Factors: https://arxiv.org/abs/1604.06766
- Truck factor algorithms comparative study: https://link.springer.com/article/10.1007/s11219-019-09457-2
- Wheeler, The Substrate Collapse: https://arxiv.org/abs/2606.20882
- OpenAI status incidents API: https://status.openai.com/api/v2/incidents.json
- Claude status incidents API: https://status.claude.com/api/v2/incidents.json
- n8n execution data retention: https://docs.n8n.io/hosting/scaling/execution-data/
- n8n Cloud data management: https://docs.n8n.io/manage-cloud/cloud-data-management/
- Fault tree + Monte Carlo (example methodology): https://www.researchgate.net/publication/331404947_A_methodology_for_reliability_assessment_of_substations_using_fault_tree_and_Monte_Carlo_simulation
- Sequential Monte Carlo for network resilience: https://arxiv.org/pdf/2604.00540
