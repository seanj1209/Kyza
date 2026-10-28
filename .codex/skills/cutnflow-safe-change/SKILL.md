---
name: cutnflow-safe-change
description: Use when making small, safe changes in CutnFlow code. Require a plan first, keep diffs minimal, avoid risky files unless explicitly requested, and report changed files, rollback steps, and verification after implementation.
---

# Mode
SAFE IMPLEMENTATION

## Before Edits
- Summarize intent in 3 bullets.
- List the exact files to change or create.
- Provide rollback steps.
- Wait for confirmation if the user did not explicitly ask to implement.

## Implementation Rules
- Make one extraction or change at a time.
- Keep the diff minimal.
- Do not move files unless the user requests it.
- Do not edit high-risk files unless the user explicitly requests it:
  - `main.ts`
  - `ui/controls.ts`
  - `ui/customisationPanel.ts`

## After Edits
- List changed files.
- Describe what changed in short form.
- Provide how to verify with commands and manual checks.
- Provide rollback steps.
