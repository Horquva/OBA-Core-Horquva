# OBA — UI/UX Design Specification

> **Product:** OBA — Organizational Brain Analysis, by Horquva
> **Promise:** When someone leaves, nothing breaks.
> **Date:** 2026-10-01 · **Branch:** `mvp/v1-continuity`
> **Status:** Approved section by section in brainstorming; awaiting owner review of this written spec.
> **Inputs:** `implementation_status_and_next_steps_plan.md`, `expanded_implementation_plan_new_mvp.md`, `WORK_BREAKDOWN_STRUCTURE_NEW_MVP.md`, `deep_feasibility_and_engineering_study.md`, SRS (`docs/horquva-strategy-session/extracted_SRS_v0_v1.txt`), the reference screenshot (style only), the horquva.com brand (`horquva-services-website/app/globals.css`), and the current frontend code.
> **Scope:** Screens only. PDF reports (RPT-01/02), emails and the downloadable n8n report are **out of scope** for this document.

---

## 0. Product principles that constrain the design

These are not style preferences; every screen must obey them.

1. **Counted facts, never invented scores.** No dollar exposure, no probabilities, no "health %", no confidence %. Every number on screen is a count from the deterministic checks engine.
2. **Unknown is never "no".** An unrecorded fact renders as *Unknown* (gray), visibly different from a confirmed absence *None* (red).
3. **Every fact shows its evidence grade and source** (stated / inferred / confirmed / unknown).
4. **No individual ranking.** People are never sorted, scored or listed by risk. Ranked lists contain assets, vendors and models only. (The named share bar on team cards is a deliberate, owner-approved exception — see §12 D-23.)
5. **Never fabricate.** No fallback/demo data is shown when the API fails or a table is empty. Loading, error and empty are three distinct states.
6. **AI explains; it never computes.** Only the Ask OBA page and the weekly briefing reading view contain AI-written text, and both are marked and evidence-linked.

---

## 1. Brand

| Element | Specification |
|---|---|
| Company wordmark | **HORQUVA**, uppercase, letter-spaced, recreated from the reference screenshot's wordmark (Hanken Grotesk 500, tracking ~0.18em). |
| Logo mark | Bronze twisted-ribbon mark: `horquva-services-website/public/logo-mark.png`. Copy into `frontend/public/brand/logo-mark.png`. Min display size 28px; a flat SVG version for ≤24px (favicon) is an **open item** (§13). |
| Product name | **OBA** with descriptor **Organizational Brain Analysis**. Sidebar header shows: mark · HORQUVA, and beneath it "OBA · Organizational Brain Analysis". |
| Assistant | **Ask OBA**. |
| Tagline | "When someone leaves, nothing breaks." — sign-in screen only. |
| Hero artwork | Glowing bronze/amber artwork from the reference. Used **only** on sign-in and first-run/empty states. **Asset pending** (§13); reserved path `frontend/public/brand/hero-art.*`. |
| Retired | "OCOS", "Organizational Intelligence", "Operational Continuity" as UI labels; the indigo/blue identity in current code. |

---

## 2. Color system

Base: horquva.com paper/ink/bronze. Brighter screenshot amber is reserved for interactive/attention states. All text pairs below were contrast-checked (WCAG 2.1 AA, 4.5:1 for text, 3:1 for UI components).

### 2.1 Light theme (default)

| Token | Value | Use | Contrast note |
|---|---|---|---|
| `--canvas` | `#F3EFE7` | Page background | — |
| `--surface` | `#FFFFFF` | Cards, drawers, tables, popovers | — |
| `--surface-sunken` | `#EBE5DA` | Inputs, table headers, hover fill | — |
| `--ink` | `#15120F` | Primary text | 16.3:1 on canvas |
| `--ink-2` | `#4A433C` | Secondary text | 8.5:1 on canvas |
| `--ink-3` | `#6E655C` | Tertiary text, metadata | 5.0 canvas · 5.7 surface · 4.55 sunken |
| `--rule` | `#DAD2C4` | Hairline borders, dividers | — |
| `--bronze` | `#A9825A` | Logo, category icons, decorative rules. **Never text.** | 3.5:1 on white (UI only) |
| `--bronze-deep` | `#5E3F2C` | Optional strong brand text | 8.2:1 on canvas |
| `--amber` | `#E8870F` | Filled primary button (with `--ink` text), active-nav dot, focus ring | ink on amber 7.0:1; amber as text fails — never use as text |
| `--amber-ink` | `#A85A00` | Outline-pill text ("Review"), links, inferred badge text | 5.1:1 on `--surface` only. **Do not place on canvas/sunken** (4.4 / 4.1). |

### 2.2 Semantic colors (light)

Evidence grades follow WBS 10.2.4 literally. Check status uses three colors. Criticality is **not** colored.

| Meaning | Token | Value |
|---|---|---|
| Evidence: stated | `--ev-stated` | `#1D5FA8` (blue) |
| Evidence: inferred | `--ev-inferred` | `#A85A00` (amber) |
| Evidence: confirmed | `--ev-confirmed` | `#2F6B2A` (green) |
| Evidence: unknown | `--ev-unknown` | `#6B6560` (gray) |
| Check PASS / covered | `--st-pass` | `#2F6B2A` (green) |
| Check FAIL / exposed / None | `--st-fail` | `#B3261E` (red) |
| Check UNKNOWN | `--st-unknown` | `#6B6560` (gray — same gray as evidence unknown; gray means "unknown" app-wide) |

Badge backgrounds use the same hue at ~10% alpha on `--surface`; badge text uses the full value.

**Amber disambiguation rule.** Amber means both "inferred" and "act here". They are separated by shape: **data = dot or square-cornered badge; action = pill or button.** An amber pill is always clickable; an amber square badge is always a data grade.

**Criticality** = text label + filled-dot scale, in `--ink-2`:
`●●●● Critical` · `●●●○ High` · `●●○○ Medium` · `●○○○ Low` · `○○○○ Unknown` (unknown in `--ev-unknown`). Red is reserved for failing.

### 2.3 Dark theme

Supported as an alternate; default is light. Mode = System by default, with a Light / Dark / System choice in the user menu.

| Token | Dark value | Contrast |
|---|---|---|
| `--canvas` | `#17140F` | — |
| `--surface` | `#1F1B16` | — |
| `--surface-sunken` | `#2A251E` | — |
| `--ink` | `#F3EFE7` | 16.0:1 |
| `--ink-2` | `#CFC6B8` | 10.1:1 |
| `--ink-3` | `#A39A8F` | 6.2:1 |
| `--rule` | `#3A332D` | — |
| `--bronze` | `#C9A27A` | 7.3:1 |
| `--amber` / `--amber-ink` | `#F2A541` | 8.3:1; ink on amber 9.1:1 |
| `--ev-stated` | `#7FB0E8` | 7.6:1 |
| `--ev-confirmed` / `--st-pass` | `#8CC47E` | 8.4:1 |
| `--st-fail` | `#F08A80` | 7.1:1 |
| `--ev-unknown` / `--st-unknown` | `#A39A8F` | 6.2:1 |
| `--ev-inferred` | `#F2A541` | 8.3:1 |

Implementation: tokens on `:root`, overridden under `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. No hard-coded Tailwind color classes (`bg-slate-*`, `text-blue-*` etc.) in components — only tokens.

---

## 3. Typography

| Role | Font | Size / line-height | Notes |
|---|---|---|---|
| Hero greeting | Instrument Serif 400 | 56 / 1.05 | Overview only |
| Page title | Instrument Serif 400 | 40 / 1.1 | One per screen |
| Headline count | Instrument Serif 400 | 32 / 1.15 | One per screen max (e.g. "38 of 52 critical assets fully covered") |
| Section heading | Hanken Grotesk 600 | 18 / 1.3 | |
| Body | Hanken Grotesk 400 | 15 / 1.55 | |
| UI label / table | Hanken Grotesk 500 | 14 / 1.4 | Tabular figures (`font-variant-numeric: tabular-nums`) for all numbers |
| Metadata / caption | Hanken Grotesk 400 | 13 / 1.4 | `--ink-3` |
| Overline | Hanken Grotesk 600 | 12 / 1.3, tracking 0.08em, uppercase | e.g. "EXECUTIVE BRIEFING" |

- Instrument Serif has only Regular and Italic: serif hierarchy is by **size only**; italic may be used for a single emphasized word in a hero line.
- Serif is used **only** for: page titles, hero lines, the headline count, the What-If sentence builder, the sign-in tagline, and the briefing reading view body.
- All other numbers (cards, tables, stat strips) are Hanken.
- Fonts via `next/font/google`: `Instrument_Serif` (400, normal + italic) and `Hanken_Grotesk` (400/500/600). DM Sans is removed.

---

## 4. Shape, elevation, spacing, icons, motion

| Aspect | Rule |
|---|---|
| Card radius | 16px |
| Input / button radius | 10px |
| Action pills | Fully rounded (`9999px`) |
| Evidence/status badges | 4px (square-ish — the "data" shape) |
| Card elevation | 1px `--rule` border + single soft shadow `0 1px 2px rgb(21 18 15 / 0.04), 0 4px 16px rgb(21 18 15 / 0.04)`. Dark mode: border only. No hover lift. |
| Spacing scale | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px. Page gutter 32px desktop, 16px phone. Card padding 24px. |
| Icons | `lucide-react`, stroke 1.5px; 18px nav, 16px inline. Icons never carry meaning alone — always paired with text or an accessible label. |
| Motion | **Quiet & functional.** 150–250ms ease-out fades/slides for drawers, side sheets, popovers, tab changes; skeleton shimmer while loading; blast-radius highlight transition on Map/What-If. **Removed:** card hover lift, count-up numbers, glow, pulsing live dot, staggered fade-up entrances, ambient radial page gradients. |
| Reduced motion | `prefers-reduced-motion: reduce` disables all transitions except instant state changes. |

---

## 5. Voice and formatting

- **System UI speaks as "we"** (company voice): "We found 3 assets without a backup." / "We couldn't reach OBA. Retry"
- **Ask OBA speaks as "I"**, only on the Ask OBA page.
- Sentence case for all labels, buttons, headings. Verb-first buttons ("Assign backup", "Send acceptance requests").
- Copy language: US English.
- **Dates, times, numbers follow the viewer's browser locale** (`Intl.DateTimeFormat` / `Intl.NumberFormat`), in the viewer's time zone; zone shown on hover. Freshness uses relative time ("2 hours ago"); dates use absolute.
- Unknown copy: "Unknown" — never "No", "None", "N/A", "Low" or blank, unless the fact is a confirmed absence ("None").

---

## 6. Global UI rules

### 6.1 Data states (every data region)

| State | Rendering |
|---|---|
| Loading | Skeleton matching the final layout (shimmer). |
| Error | "We couldn't reach OBA. Retry" + "Last successful load 8:42 AM" if any. Never substitute sample data. |
| Empty | Headline naming the space, one-line explanation, one verb CTA (e.g. "Connect n8n"). First-run empties may show the hero artwork faintly. |

**Code change required:** remove every `fallback*` constant and demo branch from `frontend/app/**` (overview, inventory, simulation, campaigns, n8n-check, review). Sample data exists only in a separately labelled demo deployment.

### 6.2 Fact cells

- Every fact cell begins with an **EvidenceDot** in the grade color. Hover/focus tooltip: "Stated · n8n · synced 8:42 AM" (grade · source · observed time). Table header has a grade legend.
- **Unknown** fact: gray text "Unknown" in a dashed-outline gray badge; on hover/focus an inline **"Ask owner"** link adds the fact to a confirmation.
- **Confirmed absence:** red "None".
- Full provenance (SCD2 fact history) lives in the detail drawer.

### 6.3 Roles

| Role | Experience |
|---|---|
| Admin | Everything. |
| Viewer | Same screens; all action buttons **hidden** (not disabled); "View only" tag in the top bar. |
| HR / manager permission | Reveals "Initiate departure" and successor pickers, for their own reports only. |
| Reviewer | Slim app at `/my` (§9.2); no main navigation. Magic-link form for non-signed-in use (§9.1). |

Role enforcement is server-side (SRS); the UI only mirrors it.

---

## 7. Shell and navigation

### 7.1 Layout

Two zones on every authenticated screen: fixed **left sidebar** + **main column** (top bar + content). **No right rail anywhere.** Content max-width 1280px, centered; Map and What-If use full width.

### 7.2 Sidebar (248px)

- **Header:** logo mark + HORQUVA wordmark; "OBA · Organizational Brain Analysis" beneath.
- **Primary nav (in order):** Overview · Departures · People & Teams · Assets · Map · What-If · Actions.
- **Pinned bottom:** Settings (count badge when Identity queue has pending items), then the **user card** (avatar, name, role, chevron → menu: Theme Light/Dark/System, Sign out).
- **Active item:** `--surface` pill on canvas, `--ink` text, amber dot at the right edge. Inactive: `--ink-2`, no fill; hover = `--surface-sunken` fill.
- **Badges:** Departures = departures within 14 days; Actions = open critical actions. No others.

### 7.3 Top bar (64px)

- **Left — data freshness:** "Data as of 8:42 AM · 3 of 3 sources synced". Becomes amber "1 source failed · View" or red "Data is 2 days old" when stale; links to Settings → Connections. Replaces the reference's "All Systems Operational" / "System Health 100%".
- **Right:** Ask OBA field · bell · avatar.
- **Ask OBA field:** compact input; Enter opens `/ask` with the question already sent (satisfies SRS AI-01 "ask from any screen").
- **Bell popover (380px):** unacknowledged `change_event`s + 72-hour post-departure alerts, newest first. Row = icon, event ("Omar Haddad left"), impact line ("4 critical assets orphaned · 1,200 runs/week"), **Acknowledge** / **Open**. Unread dot = unacknowledged count. Footer: "Acknowledge all".

### 7.4 Responsive

| Width | Behavior |
|---|---|
| ≥1280px | Full layout. |
| 768–1279px | Sidebar collapses to a 72px icon rail with tooltips. |
| <768px | Bottom tab bar (Overview · Departures · Actions · More). Read-only. Map and What-If show "Best on a larger screen" with links to their list equivalents. Reviewer app and confirmation form are fully phone-first. |

### 7.5 Sign-in (`/sign-in`)

Split screen. Left: hero artwork + "When someone leaves, nothing breaks." (serif). Right: "Sign in to OBA" + "Continue with Microsoft" and/or "Continue with Google" — only the provider(s) this deployment uses. **SSO only; no passwords.**

---

## 8. Screens

### 8.1 Overview (`/`) — SRS UI-01

1. **Hero:** "Good morning, Guido." (serif 56px; morning/afternoon/evening by viewer local time). Below, 1–2 sentences in `--ink-2`, generated by **deterministic templates** over counted change events **since the viewer's last visit** (e.g. "Since Monday, 2 people left and 3 critical assets lost their backup."). Nothing changed → "No changes since your last visit." No LLM call.
2. **Coverage strip** (card): serif headline count "38 of 52 critical assets fully covered"; segmented bar green covered / red exposed / gray unknown with counts; inline "What counts as covered?" disclosure showing the definition (SIM-07). Each segment links to Assets pre-filtered.
3. **Three priority cards** (reference-screenshot pattern) = top 3 ranked actions, **uniform styling**: rank "01/02/03", bronze category icon + label, one-sentence problem, metric label **"Critical assets affected"** with an `--ink` number, amber outline **"Review"** pill → opens the action. "See all actions" link.
4. **Two columns:**
   - *Upcoming departures (next 30 days):* name, leave date, 5-dot stage stepper, "3 of 5 handed over".
   - *Top single points of failure:* **critical assets** depending on a single person or credential, ranked ("Invoice Workflow — one owner, no backup · 1,200 runs/wk"). The person is an attribute, never the ranked item.
5. **Briefing card** (slim): "This week's briefing · generated Mon 8:00 AM" → reading view (serif body, "Written by AI from counted data" marker, every number linked to its source).
6. **Empty / first run:** if no n8n connection exists — "See your n8n exposure in a few minutes" with **Run n8n check** and **Connect n8n**.

### 8.2 Departures (`/departures`) — SRS UI-02, WBS EPIC 8

**List**, grouped: **Upcoming · In handover · Recently departed (last 30 days)**. Row: person, role/team, leave date (relative + absolute), 5-dot stage stepper, "3 of 5 assets handed over", post-departure alert flag.

Lifecycle stages (WBS 8.1.4): Initiated → Successor named → Accepted → Account disabled → Post-departure verified.

**Initiate departure** (Admin, HR/manager): side sheet — person picker, leave date, optional note. Auto-detected departures show "Detected from Entra" / "Detected from Google".

**Detail page (`/departures/[id]`):**
- Header: person, leave date, full stepper with timestamps per stage.
- **Handover table:** one row per owned asset — criticality dots, current backup, **Successor** picker pre-filled with the top suggestion and its reason ("backup since Mar", "edited 6 times"). "Apply one person to all" shortcut.
- **Live succession-test panel** (sticky right): coverage after handover ("4 of 5 covered · 1 still exposed"), each successor's new load, amber warning when a successor would hold >30% of critical automations.
- **Send acceptance requests** button.
- Sections: "Automations on [name]'s personal credentials" (will stop when the account is disabled) · "Undocumented systems" · **72-hour watch** log (post-disable execution errors + alerts).

### 8.3 People & Teams (`/people`) — SRS UI-03

- **Default: team cards grid.** Card = team name, member count, coverage bar, concentration sentence ("2 people hold 70% of Finance's critical assets"), and a **named share bar** (segments labelled with names, descending share). Teams below the minimum size (Settings; default 5, floor 3) roll up into their parent and show "Too small to report separately".
- **Team drill-down (`/people/teams/[id]`):** members listed **alphabetically only** — no sort by holdings. Each member shows what they hold; unbacked holdings marked Unknown (gray) or None (red).
- **Person page (`/people/[id]`):** holdings (owned, backing up, credentials), open handovers, pending confirmations. **No score, rank or risk number.**

### 8.4 Assets (`/assets`) — SRS UI-04

- **Toolbar:** type tabs (All · Automations · AI models · Credentials · Apps · Vendors · Groups · CSV assets), search, filter chips (Criticality · Check status · Owner · Has unknown facts · Source). Filter state in the URL.
- **Default sort:** failing critical → unknown critical → covered critical → non-critical.
- **Columns:** Name (type icon) · Owner · Backup · Criticality · Documented · Fallback · Runs/week. Fact cells per §6.2. 48px rows, sticky header, hairline dividers, no zebra.
- **Row click → 560px drawer:** current facts with grade + source; check results (PASS/FAIL/UNKNOWN + reason); upstream/downstream dependencies; fact-history timeline (SCD2 versions: what changed, who/what changed it, when). Actions: **Open full page** (`/assets/[id]`), **Show on map**.

### 8.5 Map (`/map`) — SRS UI-05

- **Opening state:** centered picker "Start from a person, asset, or vendor", suggesting the top SPOF asset. Renders that node + 2 hops.
- **Layout:** dagre, left→right: people → automations → credentials/models → vendors. React Flow (`@xyflow/react`, already installed).
- **Nodes:** person = circle, automation = hexagon, model/vendor = rectangle, credential = rounded square. Neutral: `--surface` fill, `--ink` label. Failing check = red ring; unknown-critical = gray dashed ring.
- **Edges:** color/stroke by evidence grade — stated blue solid, inferred amber dashed, confirmed green solid, unknown gray dotted. Edge type (owns, backs up, depends on, calls model, runs on credentials of, member of) on hover and in the legend.
- **Interaction:** click node → highlight downstream blast radius + upstream, dim all else to 15%, open node drawer. "Expand" adds neighbors. "Run What-If from here" opens What-If prefilled. A list view of the current selection exists for keyboard/screen-reader users.

### 8.6 What-If (`/what-if`) — SRS UI-06

- **Sentence builder** (serif): "What if [Omar Haddad ✕] [+ person] leaves and [OpenAI ✕] [+ vendor or model] goes down?" plus an optional "[automation] fails" slot (S2). Slots are searchable pickers — never raw IDs. **Run** button.
- **Results:**
  - Summary strip: orphaned critical assets · automations stopped (personal credentials) · runs/week affected · downstream assets hit · "N unknown facts encountered" → "Ask owners".
  - Detail lists for each.
  - **Test a successor** inline: pick a successor → coverage change + new load + >30% warning.
  - **Show on map** toggle renders the blast radius.
- **Worst single losses (S6):** ranked list of **vendors and models only**. People: a count only, no list ("7 people each hold 3+ unbacked critical assets") linking to People & Teams.

### 8.7 Actions (`/actions`) — SRS UI-07, two tabs

**Actions tab**
- Ranked: critical first, then missing backup, then run volume.
- Row: rank · plain-language problem · asset · exact failing fact ("No confirmed backup") · critical assets affected · status pill · one primary action for the type (Assign backup / Ask owner to confirm / Name successor / Move credential).
- **Statuses:** Open (check failing) → In progress (confirmation sent / successor requested) → Resolved (**automatic**, only when the check passes). **Accepted risk:** requires reason + expiry date, audit-logged, shown under the "Accepted" filter, **still counted as exposed** in the headline.
- Filter chips: Open · In progress · Accepted · Resolved (last 30 days).

**Confirmations tab**
- Campaign list: progress bars ("41 of 52 answered"), per-reviewer breakdown, reminder (day 3) and escalation (day 7) schedule visible.
- **New confirmation → full-page wizard** (`/actions/confirmations/new`):
  1. **Scope:** all unknown critical facts · a department · a leaver · items selected in Actions/Assets.
  2. **Review:** "Sends 14 emails covering 52 questions" + per-reviewer list (reviewer = stated owner; unowned → line manager).
  3. **Message:** email preview + one optional personal intro line. Subject/body are system-controlled (keeps A/B Experiment 1 valid).
  4. **Schedule:** due date (default 7 days), send now or at a set time → **Send**.

### 8.8 Ask OBA (`/ask`)

- Reached from the top-bar field; not in the 7-screen nav.
- Left: the user's past conversations (**persisted server-side per user** — backend dependency, §13). Right: reading column.
- Assistant voice: "I". Answers render entity names as **EntityChips** (colored by evidence grade, open the asset/person drawer) plus a collapsible **Sources** list naming facts/API calls used.
- If the data cannot answer: says so explicitly (AI-05). Never shows a computed score.

---

## 9. Reviewer surfaces

### 9.1 Confirmation form (`/attest/[token]`) — no login, phone-first — SRS UI-08

Route renamed from the current `/review/[token]`.

- **Header:** customer company name (+ logo if uploaded in Settings → Organization) and "Ownership check requested by [admin name]". **Footer:** "Powered by OBA · Horquva".
- **Landing:** "Confirm 6 automations · about 1 min each", progress count, asset list with per-asset status (To do · Saved).
- **Asset card:** all five questions on one scrollable card; tap targets ≥44px.
  1. *Do you still own this?* Yes / No. "No" reveals optional "Who owns it?" picker.
  2. *Who's your backup?* searchable person picker, or "No backup".
  3. *How critical is this?* High / Medium / Low + required one-line reason.
  4. *Where's the runbook?* URL field, or "Not documented".
  5. *Is there a fallback if this stops?* Yes / No / **Don't know** (keeps the fact unknown).
- **Save and next** persists each asset immediately; reviewer can stop and resume from the same link.
- **States:** done ("Thanks — 6 of 6 confirmed."), expired link ("This link has expired. Ask [admin] for a new one."), already submitted (read-only summary).
- **Code changes required:** multi-asset support; "Don't know" on the fallback question (current code is Yes/No); route rename.

### 9.2 Reviewer app (`/my`)

"Your confirmations and handovers": pending confirmation cards (same component as 9.1) and **successor acceptances** — "Omar is handing you 5 assets" with each asset's criticality, runbook link and credential notes → **Accept** / **I can't take this** (reason required).

---

## 10. Settings (`/settings/*`) — left sub-nav

| Section | Content |
|---|---|
| **Connections** | Card per source (n8n, Entra or Google, OpenAI, Anthropic, CSV): status, last sync, items synced, last error in plain words, Sync now / Edit / Disconnect. Secrets never re-displayed ("Key ending …3f9a"). Contains the **n8n Ownership Check**. |
| **Identity queue** | Each unmatched account: source, display name, email candidate, suggested match + reason. Actions: Link to person · Service account · Departed · Ignore. All audit-logged. An unmatched creator renders as Unknown owner, never "no owner". |
| **Users & roles** | Users (from SSO), role (Admin / Viewer / Reviewer), HR/manager permission toggle. |
| **Organization** | Company name + logo (used on the confirmation form), minimum team size (default 5, floor 3), department-name mapping. |
| **Audit log** | Filterable, read-only. |

**n8n Ownership Check** (customers only; no guest/public access): form for n8n URL + API key with the disclosure "Read-only. The key is held in memory for this scan only and never saved." → 4-step stepper (Validating → Fetching workflows → Auditing credentials → Analyzing executions) → report with counted, named lists: single-owner workflows, personal-credential workflows, failing workflows, abandoned workflows (no runs/edits in 60+ days). Also reachable from the Overview empty state.

---

## 11. Component inventory (build first)

| Group | Components |
|---|---|
| Shell | `Sidebar`, `NavItem`, `TopBar`, `FreshnessIndicator`, `AskField`, `BellPopover`, `UserMenu` |
| Data marks | `EvidenceDot` (+tooltip), `EvidenceBadge`, `CheckStatusBadge`, `CriticalityDots`, `UnknownValue` (dashed + "Ask owner"), `NoneValue` |
| Layout | `Card`, `CoverageStrip`, `SegmentedBar`, `NamedShareBar`, `PriorityCard`, `StageStepper`, `DataTable`, `Drawer` (560px), `SideSheet`, `FullPageWizard` |
| Controls | `PersonPicker`, `EntityPicker`, `SentenceBuilder`, `Button` (primary = amber fill + ink text; secondary; ghost — max one primary per view), `ActionPill` (amber outline) |
| Feedback | `Toast`, `Skeleton`, `EmptyState`, `ErrorState` |
| Chat | `EntityChip`, `SourcesList` |

Existing `frontend/components/ui/Badges.tsx` is replaced (its colors contradict §2.2).

### 11.1 Accessibility (SRS: WCAG 2.1 AA)

- All text/background pairs per §2 tables; amber text only on `--surface`.
- Color never the sole signal (dots have text tooltips; badges have labels; rings have legends).
- 2px amber focus ring, offset 2px, on every interactive element.
- Full keyboard paths: tables, drawers, pickers, wizard, Map (with list-view equivalent).
- All form fields labelled; errors announced inline.
- `prefers-reduced-motion` respected.

---

## 12. Decisions log

| # | Decision | Choice |
|---|---|---|
| D-01 | Screen set | SRS 7 screens + supporting pages |
| D-02 | v0 n8n check placement | Inside the app shell |
| D-03 | v0 audience | Customers only; no guest state |
| D-04 | Naming | Horquva = company, OBA (Organizational Brain Analysis) = product, "Ask OBA" |
| D-05 | Logo | `logo-mark.png` from services website; wordmark recreated from reference |
| D-06 | Palette | Blend: website paper/ink/bronze + screenshot amber for interaction |
| D-07 | Theme | Light default + full dark mode |
| D-08 | Evidence colors | WBS literal (stated blue, inferred amber, confirmed green, unknown gray); shape separates data from action |
| D-09 | Check / criticality color | PASS green, FAIL red, UNKNOWN gray; criticality via text + dots |
| D-10 | Type system | Serif display + Hanken Grotesk |
| D-11 | Display serif | Instrument Serif |
| D-12 | Serif scope | Titles, hero lines, one headline count per screen |
| D-13 | Corners | Soft (16 / 10 / pill) |
| D-14 | Shell | Sidebar + main everywhere; no right rail |
| D-15 | Hero artwork | Sign-in + empty states only; asset pending |
| D-16 | Status area | Data freshness; sidebar footer = user card only |
| D-17 | Sidebar | 7 screens + Settings only |
| D-18 | Confirmations | Tab inside Actions |
| D-19 | n8n check entry | Overview empty state + Settings → Connections |
| D-20 | Bell | Change-feed popover |
| D-21 | Ask OBA | Dedicated page; top-bar field; persisted per-user history; inline chips + sources |
| D-22 | No-data rule | Never fabricate; loading / error / empty states |
| D-23 | Team concentration | Named share bar — chosen knowingly despite proximity to individual ranking |
| D-24 | Unknown cell | Gray dashed "Unknown" + "Ask owner" |
| D-25 | Evidence density | Dot + hover detail; history in drawer |
| D-26 | Overview hero | Greeting + deterministic template prose, since last visit |
| D-27 | Overview body | Coverage strip → 3 priority cards → departures / SPOF assets → briefing card |
| D-28 | Priority card metric | Critical assets affected; uniform styling, amber CTA |
| D-29 | Departures | List + detail page; per-asset successors with bulk default + live succession test |
| D-30 | People | Teams first; members alphabetical; min group size admin-configurable (default 5, floor 3) |
| D-31 | Assets | Drawer expandable to page; critical + exposed first |
| D-32 | Map | Focused neighbourhood; neutral nodes + status rings; grade-styled edges |
| D-33 | What-If | Sentence builder; S6 ranks vendors/models only; Overview SPOF list = assets |
| D-34 | Action statuses | Open → In progress → Resolved (auto) + Accepted risk (reason, expiry, still exposed) |
| D-35 | Campaign creation | Full-page wizard; preview + one intro line only |
| D-36 | Form flow | Asset list → one card per asset, save as you go |
| D-37 | "Don't know" | Fallback question only (per WBS) |
| D-38 | Form branding | Customer first, "Powered by OBA · Horquva" |
| D-39 | Settings | Left sub-nav: Connections, Identity queue, Users & roles, Organization, Audit log |
| D-40 | Sign-in | SSO only |
| D-41 | Roles in UI | Hide actions; "View only" tag; reviewer slim app `/my` |
| D-42 | Responsive | Desktop + tablet; phone read-only; form + reviewer app phone-first |
| D-43 | Motion | Quiet & functional |
| D-44 | Voice | System "we"; assistant "I" |
| D-45 | Icons | Lucide outline, 1.5px |
| D-46 | Density | Comfortable 48px rows |
| D-47 | Doc scope | Screens only (no PDFs, emails, n8n report) |
| D-48 | Locale | Follow browser locale; US English copy |

---

## 13. Open items and dependencies

**Missing assets**
- Hero artwork image file (`frontend/public/brand/hero-art.*`).
- Flat SVG version of the logo mark for favicon / ≤24px use.

**Backend dependencies the design assumes (not yet built on `mvp/v1-continuity`)**
- Departures and handover lifecycle, successor acceptance, 72-hour watcher (WBS EPIC 8).
- Combined scenarios S4 and worst-single-losses S6 (EPIC 6).
- Identity queue endpoints (EPIC 3).
- Ask OBA conversation persistence (new table + endpoints).
- Change-event feed with acknowledge endpoint; "since last visit" requires a per-user last-seen timestamp.
- Action status persistence, including Accepted risk (reason, expiry, audit).
- Per-person / per-team holdings and concentration endpoints (People & Teams).
- Asset detail endpoint with fact history, check results and dependencies.
- Graph neighbourhood endpoint for the Map.
- SSO auth, RBAC and the HR/manager permission (WBS 1.3).
- Organization settings (company name, logo, min group size, department mapping).
- Multi-asset attestation tokens and partial-save.

**Code that must change to meet this spec**
- Remove all fabricated fallback/demo data from `frontend/app/**`.
- Replace `globals.css` tokens, `Badges.tsx` colors, `ThemeContext` (dark default → light default + System), DM Sans → Instrument Serif + Hanken Grotesk.
- Rebuild navigation to the 7-screen IA; rename `/inventory` → `/assets`, `/simulation` → `/what-if`, `/campaigns` → `/actions` (Confirmations tab), `/review/[token]` → `/attest/[token]`, `/connectors` → `/settings/connections`.
- Replace raw-ID text inputs in What-If with pickers.
- Move Ask OBA from slide-over to `/ask`.
