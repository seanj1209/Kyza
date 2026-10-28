# WORKFLOW_GUARDRAILS

These guardrails define how changes must be delivered in this workspace.

## Required Workflow

- No bulk refactors.
- No file moves until logic extracted.
- One extraction target at a time.
- Always provide plan -> then implement.
- Always list changed files.
- Always provide rollback steps.

## High-Risk Files

Do not edit these unless explicitly instructed:
- `frontend/frontend/src/main.ts`
- `frontend/frontend/src/ui/controls.ts`
- `frontend/frontend/src/ui/customisationPanel.ts`

Treat other very large orchestration files as high risk unless the task specifically targets them.

## Change Discipline

- Keep diffs small and local.
- Prefer one small batch of changes over broad cleanup.
- Do not mix architecture cleanup with feature work unless asked.
- Do not extract multiple systems at once.
- Do not rewrite working code for style only.

## Delivery Format

Before implementation, provide:
- the plan
- the intended files to change
- the specific risk being controlled

After implementation, provide:
- changed files
- short summary of what changed
- verification steps
- rollback steps

## Rollback Standard

Rollback steps should be explicit and minimal.

Preferred rollback guidance:
- revert only the files changed for the task
- avoid destructive workspace-wide commands
- preserve unrelated user changes
