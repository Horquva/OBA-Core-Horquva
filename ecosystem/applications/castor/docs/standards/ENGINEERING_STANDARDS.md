# Engineering Standards — Horquva Castor

Version: 1.0  
Owner: Sufyan Afzal (Engineering Governance)  
Status: Active

---

## 1. Folder & File Naming

- All folder names: lowercase, words separated by hyphens (`design-system`, `ai-experience`)
- All file names: UPPERCASE for docs (`README.md`, `STANDARDS.md`), lowercase for code files
- No spaces in any file or folder name

---

## 2. Branch Naming

| Type | Format | Example |
|---|---|---|
| Platform work | `platform/<platform-name>` | `platform/design-system` |
| Bug fix | `fix/<short-description>` | `fix/pr-template-typo` |
| Documentation | `docs/<short-description>` | `docs/update-readme` |

**Rules:**
- Always branch off from `develop`, never from `main`
- Never push directly to `main` or `develop`
- One branch per platform per sprint

---

## 3. Commit Messages

Format: `type(platform): short description`

```
feat(design-system): add color token system
docs(accessibility): add WCAG 2.2 checklist
fix(frontend-engineering): correct folder structure
chore(engineering-governance): update CODEOWNERS
```

**Types:**
- `feat` — new work or deliverable
- `docs` — documentation only
- `fix` — fixing something broken
- `chore` — housekeeping, config, setup
- `refactor` — restructuring existing work

**Rules:**
- Keep it short (under 72 characters)
- Use present tense ("add" not "added")
- Commit often — don't wait until everything is done

---

## 4. Pull Request Rules

- Always PR into `develop`, never directly into `main`
- Fill out the PR template completely
- At least one reviewer required: Sufyan Afzal (Team Lead)
- No self-merging — you cannot merge your own PR
- Resolve all reviewer comments before merging

---

## 5. Folder Work Rules

- Every platform owner works **only inside their own platform folder**
- Example: Ayla Sajid works only inside `platforms/accessibility/`
- Do not modify another person's platform folder
- Shared docs go into `docs/` — ask Team Lead before adding there

---

## 6. Documentation Standards

- All documents written in Markdown (`.md`)
- Every document must have: title, version, author, date, and content
- Use clear headings (`#`, `##`, `###`)
- No walls of text — use lists, tables, and sections
- Every document must be readable by someone who did not write it

---

## 7. Definition of Done (Week 2)

A platform's Week 2 work is considered DONE when:

- [ ] All deliverables listed in the task document are complete
- [ ] Work is committed and pushed to the platform branch
- [ ] PR is opened to `develop` with the template filled out
- [ ] Team Lead has reviewed and approved
- [ ] No outstanding reviewer comments
- [ ] Documentation is clear, organized, and self-explanatory

---

## 8. What NOT to do

- Do not push confidential Horquva information to public repositories
- Do not commit directly to `main` or `develop`
- Do not merge your own PRs
- Do not work outside your platform folder without permission
- Do not upload passwords, credentials, or API keys to the repo
