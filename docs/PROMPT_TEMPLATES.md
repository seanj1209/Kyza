# PROMPT_TEMPLATES

Use these templates to keep Codex aligned with this workspace's operating rules.

## 1) REVIEW MODE

Use when the goal is to inspect, map, and assess without changing files.

```md
You are in REVIEW MODE.

Task:
[describe the area to review]

Instructions:
- Scan the relevant files and map the current architecture.
- Identify risks, coupling, and likely extraction points.
- Call out any high-risk files involved.
- Do not modify any files.
- Do not propose bulk refactors.
- Keep the response focused on:
  - current structure
  - risks / regressions to watch
  - recommended next step

Output format:
- Architecture map
- Risks
- Recommended next step
- Candidate files for a future small change
```

## 2) IMPLEMENT MODE

Use when the goal is to make exactly one small extraction or focused implementation step.

```md
You are in IMPLEMENT MODE.

Task:
[describe exactly one extraction or one small change]

Constraints:
- Implement exactly one extraction target.
- Use the smallest possible diff.
- No bulk refactors.
- No file moves until logic is extracted.
- Do not edit high-risk files unless explicitly instructed.
- Do not mix cleanup with the requested change.

Before editing:
- State the plan.
- List the files you will change.
- State the main risk being controlled.

After editing:
- List changed files.
- Summarize what changed.
- Provide verification steps.
- Provide rollback steps.

Rollback guidance:
- Revert only the files changed for this task.
- Avoid destructive workspace-wide commands.
```
