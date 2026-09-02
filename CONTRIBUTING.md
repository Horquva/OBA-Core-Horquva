# Contributing to Knowledge Management Platform

**Welcome to Horquva's Knowledge Management Platform!**

Thank you for helping us build our organizational knowledge. This guide explains how to contribute to the KMP and ensure your knowledge is valuable, discoverable, and well-maintained.

---

## Before You Start

### Prerequisites

- GitHub account with repository access
- Understanding of Markdown format (or willing to learn)
- 30-60 minutes to write and review your contribution
- Git basics (clone, commit, push, create PR)

### Required Knowledge

- **Markdown:** We use GitHub-flavored Markdown ([Quick guide](https://guides.github.com/features/mastering-markdown/))
- **Repository Structure:** Review [STRUCTURE.md](./STRUCTURE.md) to understand domains
- **Templates:** Use appropriate template from [templates/](./templates/) directory
- **Standards:** Read relevant standards in [standards/](./standards/) directory

---

## What Can You Contribute?

### ✅ Welcome Contributions

- **Architecture Decisions (ADRs)** - Document significant technical decisions
- **Best Practices** - Share proven engineering approaches
- **Playbooks** - Document operational workflows
- **Runbooks** - Create step-by-step guides for tasks
- **Lessons Learned** - Share what you learned from incidents/projects
- **Standards Improvements** - Suggest improvements to existing standards
- **Glossary Additions** - Add or improve definitions
- **Documentation Fixes** - Improve clarity, fix typos, update examples
- **FAQ** - Add frequently asked questions and answers

### ❌ Do NOT Contribute

- **Proprietary Information** - Keep company secrets secure
- **Personal Opinions** - Stick to facts and organizational knowledge
- **Incomplete Work** - Contribute only complete, reviewed content
- **Duplicate Content** - Check if topic already exists before writing
- **External Marketing** - No promotional or marketing content
- **Broken Links** - Verify all links work before submitting

---

## The Contribution Workflow

### Step 1: Choose Your Contribution Type

Determine what you're contributing:

| Type | Template | Owner Review | CTO Sign-off | Location |
|------|----------|---|---|---|
| **ADR** | ADR template | ✓ | ✓ | `architecture/decisions/` |
| **Best Practice** | Best Practice template | ✓ | | `best-practices/` |
| **Playbook** | Playbook template | ✓ | | `playbooks/` |
| **Runbook** | Runbook template | ✓ | | `runbooks/` |
| **Standard** | Standard template | ✓ | ✓ | `standards/` |
| **Lesson Learned** | Lesson template | ✓ | | `lessons-learned/` |
| **Glossary** | N/A (simple entry) | ✓ | ✓ | `glossary/` |

### Step 2: Review Related Knowledge

**Before writing, check if content already exists:**

1. Search the repository for similar topics
2. Review the appropriate domain index
3. Check FAQ for related questions
4. Look at existing examples

**If content exists:**
- Can you improve it? Create a PR with improvements
- Is it different? Ensure your version adds unique value
- Should they be combined? Coordinate with domain owner

### Step 3: Use the Right Template

Copy the appropriate template from [templates/](./templates/) directory:

```bash
# Example: Creating a new best practice
cp templates/best-practices-template.md best-practices/my-best-practice.md
```

**Fill in all sections of the template.** Don't skip sections marked as required.

### Step 4: Write Your Contribution

**Quality Standards:**

- **Clarity:** Write clearly for engineers with varying expertise
- **Completeness:** Include all relevant information
- **Examples:** Provide concrete examples or code snippets
- **Links:** Link to related documentation and resources
- **Accuracy:** Ensure all information is correct and current
- **Length:** Keep focused - split into multiple docs if too long

**Writing Tips:**

- Use active voice ("Do this" not "This should be done")
- Include specific examples, not just general statements
- Provide context for "why" not just "how"
- Link related knowledge assets
- Use headers to organize content
- Include a clear summary at the top

### Step 5: Self-Review Against Standards

Before submitting, verify your contribution:

**Quality Checklist:**
- [ ] Follows appropriate template structure
- [ ] Uses clear, concise language
- [ ] Includes relevant examples
- [ ] All links are valid and functional
- [ ] No spelling or grammar errors
- [ ] Markdown formatting is correct
- [ ] Related knowledge is linked
- [ ] Information is accurate and current
- [ ] Follows naming conventions
- [ ] Placed in correct directory

**Standards Checklist:**
- [ ] Follows engineering standards (see [standards/](./standards/))
- [ ] Consistent with other similar documents
- [ ] Appropriate metadata included
- [ ] Governance information complete
- [ ] Last updated date set correctly

### Step 6: Submit a Pull Request

**Create your PR:**

```bash
# Create feature branch
git checkout -b feature/add-my-knowledge

# Commit your changes
git add path/to/my-file.md
git commit -m "Add: [Domain] - Brief description of content"

# Push to repository
git push origin feature/add-my-knowledge
```

**PR Description Template:**

```markdown
## Description
[Brief description of what this contribution adds]

## Type of Contribution
- [ ] Architecture Decision (ADR)
- [ ] Best Practice
- [ ] Playbook
- [ ] Runbook
- [ ] Lesson Learned
- [ ] Standard Improvement
- [ ] Glossary Addition
- [ ] Documentation Fix
- [ ] FAQ Item

## Domain/Category
[Which domain does this belong to?]

## Related Issues/PRs
[Link any related issues or previous discussions]

## Checklist
- [ ] Follows template structure
- [ ] Includes all required sections
- [ ] No spelling/grammar errors
- [ ] All links are valid
- [ ] Related knowledge is linked
- [ ] Follows engineering standards
```

### Step 7: Address Review Feedback

**A domain owner or reviewer will:**
- Review for quality and accuracy
- Check alignment with standards
- Suggest improvements
- Request clarifications if needed

**Timeline:** Reviews complete within 2-3 business days

**Your responsibility:**
- [ ] Respond to all feedback comments
- [ ] Make requested changes
- [ ] Explain if you disagree with suggestions
- [ ] Request re-review when ready

### Step 8: Approval & Merge

**For Most Content:** Domain Owner approves and merges

**For Significant Changes (ADRs, Standards, Glossary):**
1. Domain Owner approves
2. CTO reviews and approves
3. Merge to main branch

**Once Approved:**
- PR is merged to main branch
- Content becomes live and discoverable
- Your contribution is published

---

## Contribution Best Practices

### Content Quality

**Be Specific:**
```
❌ Bad: "Use best practices for error handling"
✅ Good: "Wrap critical operations in try-catch blocks and log specific error codes"
```

**Include Examples:**
```
❌ Bad: "Document your code"
✅ Good: "Add JSDoc comments to functions:
   function processData(input) {
     // Good: Describes what it does
     // Bad: Just saying '// process'
   }
```

**Link Related Knowledge:**
```
✅ Good: "See Best Practice: [Error Handling Guidelines](../../best-practices/error-handling.md)"
```

**Provide Context:**
```
✅ Good: "Why: This reduces production incidents by 40% based on 2023 data"
```

### Naming Conventions

**File Names:**
- Use `kebab-case-lowercase` for all files
- Example: `error-handling-best-practices.md`
- ADRs: `ADR-NNNN-brief-title.md`

**Folder Names:**
- Use `lowercase-folder-names`
- Example: `best-practices/error-handling/`

**Header Names:**
- Use Title Case for main headers
- Use lowercase for sub-headers
- Avoid repetition of document title

### Linking

**Always link related knowledge:**
```markdown
**Related:**
- [Best Practice: Error Handling](../../best-practices/error-handling.md)
- [Standard: Code Review Process](../../standards/code-review.md)
- [Runbook: Deploy to Production](../../runbooks/deployment/deploy-production.md)
```

**Link Format:**
- Use relative paths for internal links
- Include descriptive link text (not just "here" or "link")
- Update links if target pages move

### Metadata

**Every document should include:**

```markdown
**Version:** 1.0  
**Owner:** [Your name or team]  
**Last Updated:** YYYY-MM-DD  
**Status:** [Active | Draft | Deprecated]  
**Review Schedule:** [Quarterly/Annually]  
```

### Documentation Quality

**Requirements:**
1. **Clarity** - Can someone unfamiliar with the topic understand it?
2. **Completeness** - Are all important details included?
3. **Accuracy** - Is the information correct and current?
4. **Usability** - Can someone actually use this to accomplish the goal?
5. **Maintainability** - Is it clear who should update this?

---

## Review Process

### Who Reviews?

1. **Domain Owner** - Reviews all submissions in their domain
2. **Peer Reviewers** - Community review for best practices
3. **CTO** - Reviews ADRs, standards, glossary entries
4. **Platform Owner** - Final review for quality and standards

### What Reviewers Look For

- **Accuracy** - Is the information correct?
- **Completeness** - Are all sections filled in?
- **Clarity** - Is it understandable?
- **Standards** - Does it follow organizational standards?
- **Examples** - Are examples provided and correct?
- **Links** - Are related knowledge linked?
- **Maintenance** - Is owner clearly identified?

### Common Feedback Types

**Request Changes:**
```
"Please clarify the example in Step 3"
→ You update content and re-request review
```

**Approve with Minor Changes:**
```
"Good work! Minor typo in line 5."
→ We fix the typo and merge
```

**Request Significant Revision:**
```
"This needs more examples and clearer structure"
→ You revise and resubmit
```

---

## Special Contribution Types

### Contributing an ADR (Architecture Decision Record)

**Additional Requirements:**
1. Must be for significant technical decisions
2. Requires CTO approval
3. Must reference alternatives considered
4. Must include implementation plan
5. Should address potential concerns

**Review Timeline:** 5-7 business days (involves CTO)

**Approval Chain:**
1. Domain Owner reviews
2. CTO reviews and approves
3. Merge to main

### Contributing a Standard

**Additional Requirements:**
1. Must affect multiple teams or platforms
2. Requires CTO approval
3. Must explain rationale
4. Should include examples
5. Must define governance

**Review Timeline:** 5-7 business days (involves CTO)

**Approval Chain:**
1. Domain Owner reviews
2. CTO reviews and approves
3. Merge to main

### Improving Existing Content

**When to create a new PR:**
- Adding a new section
- Fixing accuracy issues
- Adding new examples
- Improving clarity

**Process is the same as new contributions**

---

## Maintaining Your Contributions

### Your Responsibility as Author

Once your contribution is published, you become its maintainer:

**Quarterly Reviews:**
- [ ] Is the information still accurate?
- [ ] Do examples still work?
- [ ] Are links still valid?
- [ ] Does it need updating?

**Update When:**
- [ ] Information becomes outdated
- [ ] Processes change
- [ ] New better practices emerge
- [ ] Examples no longer work
- [ ] Standards change

**Update Process:**
1. Make updates to your document
2. Create PR with `Update:` prefix
3. Note what changed in PR description
4. Update "Last Updated" date
5. Get review approval
6. Merge

### Archiving Content

**Mark as Deprecated When:**
- Information is no longer relevant
- Replaced by newer, better documentation
- Process no longer used
- Technology no longer supported

**Archival Process:**
1. Add deprecation notice at top:
   ```markdown
   > ⚠️ **DEPRECATED** - This document is no longer maintained.
   > See [Newer Alternative](link) instead.
   ```
2. Move to `_archived/` directory
3. Update last updated date
4. Create PR explaining why archived
5. Get approval and merge

---

## FAQ for Contributors

**Q: How long should my contribution be?**
A: Long enough to be complete, short enough to be focused. If >5000 words, consider splitting.

**Q: Can I write in different format than Markdown?**
A: No - Markdown enables version control and consistency. We provide templates.

**Q: How do I add diagrams?**
A: Use Mermaid format (stored as `.mermaid` files) or provide screenshots/images.

**Q: Who owns the content I contribute?**
A: You do! We'll list you as author. You maintain it going forward.

**Q: How often should I update my content?**
A: At minimum quarterly. Update sooner if information changes.

**Q: What if I disagree with reviewer feedback?**
A: Discuss in the PR! We value different perspectives.

**Q: Can I delete my contribution?**
A: We keep it and mark as archived. Organizational knowledge is valuable even if superseded.

**Q: How do I find what needs contributing?**
A: Check [CONTRIBUTING_NEEDED.md](./CONTRIBUTING_NEEDED.md) for gaps we've identified.

---

## Getting Help

### Questions About Contributing?
- **Slack:** #knowledge-management channel
- **Email:** [kmp-owner@horquva.com]
- **Office Hours:** Thursdays 2-3 PM

### Need Feedback Before PR?
1. Create a draft PR
2. Request feedback from domain owner
3. Or share in Slack for discussion

### Found an Error in Existing Content?
1. Create a GitHub issue describing the problem
2. OR create a PR with the fix
3. Tag the content owner for review

---

## Code of Conduct

When contributing to KMP:

- **Be Respectful** - Assume good intentions in feedback
- **Be Accurate** - Verify information before sharing
- **Be Helpful** - Aim to improve organizational knowledge
- **Be Honest** - Acknowledge uncertainties and limits
- **Be Collaborative** - Welcome other perspectives

---

## Recognition

### We Recognize Contributors Through

- 📝 **Author Attribution** - Your name appears on content you contribute
- 🏆 **Acknowledgments** - Regular shoutouts for significant contributions
- 📊 **Metrics** - Tracking and celebrating most-used contributions
- 🎓 **Growth** - Contribution history counts toward skill development

### Contributing Guidelines Compliance

**Your contributions must:**
- ✓ Follow this contributing guide
- ✓ Use appropriate templates
- ✓ Meet quality standards
- ✓ Link related knowledge
- ✓ Be accurate and complete
- ✓ Receive appropriate reviews

**Non-compliant contributions will:**
- Be returned for revision with specific feedback
- Not be merged until standards are met

---

## Summary

**Contributing to KMP:**

1. **Choose** what you want to contribute
2. **Review** similar existing knowledge
3. **Use** the appropriate template
4. **Write** clear, complete content
5. **Self-review** against standards
6. **Submit** a Pull Request
7. **Address** review feedback
8. **Publish** your knowledge
9. **Maintain** your content going forward

---

**Let's build Horquva's organizational intelligence together!**

**Questions?** → Contact: Muhammad Shaheer Nawaz (KMP Platform Owner)

---

**Template Version:** 1.0  
**Last Updated:** 2024  
**Platform:** Knowledge Management Platform  
**Part of:** Altair v1.0 Engineering Operating System
