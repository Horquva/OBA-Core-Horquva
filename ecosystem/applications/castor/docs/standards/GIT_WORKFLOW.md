# Git Workflow Guide — Horquva Castor

Owner: Sufyan Afzal  
For: All Platform Owners — Week 2

---

## Branch Overview

```
main
 └── develop
      ├── platform/design-system          (Syed Bilal Sajid)
      ├── platform/frontend-engineering   (Dur Muhammad Khan)
      ├── platform/executive-workspace    (Syed Muhammad Taha Zaidi)
      ├── platform/ai-experience          (Gulshan Kumar)
      ├── platform/mobile-experience      (Asfand Nadeem)
      ├── platform/visualization          (Hazam Mehmood)
      ├── platform/experience-quality     (Khubaib Ijaz)
      ├── platform/accessibility          (Ayla Sajid)
      └── platform/ai-experience-engineering (Ahmad Ali Sultan)
```

**main** — Only clean, reviewed, approved work. Team Lead merges here at the end of the sprint.  
**develop** — Where all platforms come together. You merge into here via PR.  
**platform/xxx** — Your personal working branch. This is where you do all your work.

---

## Step-by-Step: How to Work

### Step 1 — Clone the repo (only once)
```bash
git clone https://github.com/sufyanafzal7/horquva-castor.git
cd horquva-castor
```

### Step 2 — Switch to develop and pull latest
```bash
git checkout develop
git pull origin develop
```

### Step 3 — Create your platform branch
```bash
git checkout -b platform/your-platform-name
```

Replace `your-platform-name` with your actual platform. Example:
```bash
git checkout -b platform/accessibility
```

### Step 4 — Do your work
- Open your folder: `platforms/your-platform/`
- Create your documents, diagrams, checklists, etc.
- Save everything inside your folder

### Step 5 — Commit your work
```bash
git add .
git commit -m "docs(accessibility): add WCAG 2.2 research notes"
```

Do this every day, not just at the end.

### Step 6 — Push your branch to GitHub
```bash
git push origin platform/your-platform-name
```

### Step 7 — Open a Pull Request when done
1. Go to the GitHub repository
2. Click **"Compare & pull request"**
3. Set base branch to `develop` (NOT main)
4. Fill out the PR template completely
5. Add Sufyan Afzal as reviewer
6. Submit the PR

### Step 8 — Wait for review
- Sufyan will review your PR
- If there are comments, fix them and push again — the PR updates automatically
- Once approved, Sufyan will merge it into `develop`

---

## Daily Habit

```bash
# Start of each day — pull latest changes
git checkout develop
git pull origin develop
git checkout platform/your-platform-name
git merge develop   # keep your branch updated

# End of each day — commit and push
git add .
git commit -m "docs(your-platform): what you did today"
git push origin platform/your-platform-name
```

---

## Common Issues

**"I accidentally committed to develop"**
- Tell Sufyan immediately. Don't push it.

**"I don't know what branch I'm on"**
```bash
git branch
```
The branch with `*` is your current branch.

**"I made a mistake in my last commit message"**
```bash
git commit --amend -m "corrected message here"
```
Only do this if you haven't pushed yet.

**"I want to see what changed before committing"**
```bash
git status
git diff
```

---

## Questions?
DM Sufyan on WhatsApp. Don't guess — just ask.
