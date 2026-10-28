---
name: cutnflow-review
description: Use for CutnFlow architecture reviews, audits, risk analysis, coupling analysis, duplication mapping, and staged refactor planning. Never edit files. Produce a folder map, coupling risks, and a phased plan only.
---

# Purpose
Review a CutnFlow flexo cutter-guide codebase. Output analysis and plans only.

# Hard Rules
- Do not modify files.
- Do not run terminal commands.
- Identify high-risk files.
- Avoid proposing edits to high-risk files unless the user explicitly requests them.

# Output Format
1) Current structure map
2) Coupling hotspots
3) Duplication map
4) Proposed staged refactor plan (Phase 1 low-risk first)
5) Verification checklist
