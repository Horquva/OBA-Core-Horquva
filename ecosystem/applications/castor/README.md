# Horquva Castor — HEEP v1.0

**Horquva Experience Engineering Platform (HEEP)**  
Constitutional Engineering Repository — Week 2 Foundation

---

## What is Castor?

Castor is the Human Experience Platform of Horquva. It transforms the intelligence of the Organizational Brain (OBA) into experiences that people can understand, trust, and use confidently — across every screen, every interaction, and every future Horquva product.

---

## Team

| Name | Platform | Branch |
|---|---|---|
| Sufyan Afzal | Engineering Governance (Team Lead) | `platform/engineering-governance` |
| Syed Bilal Sajid | Design System | `platform/design-system` |
| Dur Muhammad Khan | Frontend Engineering | `platform/frontend-engineering` |
| Syed Muhammad Taha Zaidi | Executive Workspace | `platform/executive-workspace` |
| Gulshan Kumar | AI Experience | `platform/ai-experience` |
| Asfand Nadeem | Mobile Experience | `platform/mobile-experience` |
| Hazam Mehmood | Visualization | `platform/visualization` |
| Khubaib Ijaz | Experience Quality | `platform/experience-quality` |
| Ayla Sajid | Accessibility | `platform/accessibility` |
| Ahmad Ali Sultan | AI Experience Engineering | `platform/ai-experience-engineering` |

---

## Repository Structure

```
horquva-castor/
│
├── .github/
│   ├── ISSUE_TEMPLATE/         # Bug reports, feature requests
│   ├── PULL_REQUEST_TEMPLATE/  # PR checklist
│   └── CODEOWNERS              # Review assignments
│
├── docs/
│   ├── architecture/           # Architecture diagrams and decisions
│   ├── decisions/              # ADRs (Architecture Decision Records)
│   └── standards/              # Coding standards, naming conventions, DoD
│
├── platforms/
│   ├── design-system/          # Syed Bilal Sajid
│   ├── frontend-engineering/   # Dur Muhammad Khan
│   ├── executive-workspace/    # Syed Muhammad Taha Zaidi
│   ├── ai-experience/          # Gulshan Kumar
│   ├── mobile-experience/      # Asfand Nadeem
│   ├── visualization/          # Hazam Mehmood
│   ├── experience-quality/     # Khubaib Ijaz
│   ├── accessibility/          # Ayla Sajid
│   └── ai-experience-engineering/ # Ahmad Ali Sultan
│
├── scripts/                    # Utility scripts
└── README.md
```

---

## Branch Strategy

| Branch | Purpose | Who uses it |
|---|---|---|
| `main` | Final, reviewed, approved work only | Team Lead merges here after review |
| `develop` | Integration branch — all platforms merge here first | Everyone |
| `platform/<platform-name>` | Each person's working branch | Each platform owner |

**Flow:** `platform/your-platform` → PR to `develop` → Team Lead reviews → merge to `develop` → final review → merge to `main`

---

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/sufyanafzal7/horquva-castor.git
cd horquva-castor
```

2. Create your platform branch
```bash
git checkout develop
git checkout -b platform/your-platform-name
```

3. Work on your deliverables inside your platform folder under `platforms/`

4. Commit regularly
```bash
git add .
git commit -m "feat(design-system): add color tokens"
```

5. Push your branch
```bash
git push origin platform/your-platform-name
```

6. Open a Pull Request to `develop` when your work is ready

---

## Commit Message Format

```
type(platform): short description

Examples:
feat(design-system): add typography tokens
docs(accessibility): add WCAG review checklist
fix(frontend-engineering): correct folder structure
chore(engineering-governance): update PR template
```

**Types:** `feat` `docs` `fix` `chore` `refactor` `test`

---

## Definition of Done (Week 2)

Before opening a PR, confirm:

- [ ] All deliverables from your task document are completed
- [ ] Work is saved inside your platform folder (`platforms/your-platform/`)
- [ ] All documents are clear and readable
- [ ] You understand everything you have written or designed
- [ ] No confidential Horquva information shared with unauthorized tools
- [ ] PR description explains what you did and what reviewers should check

---

## Contact

**Team Lead:** Sufyan Afzal  
For questions: DM Sufyan Afzal  
For architectural questions: contact Natasha Khan (CTO)
