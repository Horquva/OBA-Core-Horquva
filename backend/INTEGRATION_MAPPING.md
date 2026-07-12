# Phase 4 Readiness — Sample Tool Mapping (GitHub -> Organizational Data Model)

This note proves the data model is integration-ready. In Phase 4, each external
tool is connected by writing ONE mapper that reads the tool and writes into the
existing tables below. No module or API endpoint changes.

## GitHub -> canonical entities

| GitHub source            | Maps to table(s)                         | Notes                                            |
|--------------------------|------------------------------------------|--------------------------------------------------|
| Org members / committers | employees                                | login -> name, team -> department                |
| Repositories             | (asset via) tool_ownership, agents       | repo -> asset, CODEOWNERS -> owner_id            |
| CODEOWNERS / repo admins | owners, accountability_links             | owner = Responsible/Accountable (RACI)           |
| Commits / PR activity    | snapshots, learning_snapshots            | per-period activity -> trend metrics             |
| Issues / incidents       | workflow_failures, failure_patterns      | incident -> event, labels -> type                |
| PR reviews / approvals    | verification_actions, policy_violations | reviewer -> verifier, missing review -> violation|
| Repo dependency graph    | dependencies, workflow_tool_dependencies | from/to + type=uses/feeds                        |
| Branch protection / rules| governance_assessments, tool_policies    | rule present? -> adherence / approval_status     |
| Decisions in PR threads  | organizational_decisions, decision_factors| merge decision -> owner, factors, outcome        |

## Mapper contract (pseudocode)

```
for repo in github.repos():
    upsert tool_ownership(asset=repo.name, owner_id=lookup(repo.codeowner))
    for commit in repo.commits(period):
        upsert snapshots(date=period, metrics={...})
    for issue in repo.issues():
        upsert workflow_failures(entity=repo.name, type=issue.label, ...)
```

Because every connector targets the SAME schema, Phase 4 (GitHub, Slack, Jira,
Linear) and Phase 5 (Google Workspace, M365, Salesforce) are each just "write
one mapper" — modules M01-M20 and the API stay untouched.
