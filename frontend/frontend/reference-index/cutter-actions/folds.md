# Folds

- Engine owner: `cutter-engine`

## Current Actions
- Add/remove fold lines
- Move fold lines
- Render fold guides and measure against them

## Current Known Rules
- Fold lines are part of cutter geometry and must remain internally consistent.
- Artwork preflight can warn when critical artwork is too close to fold lines.

## Hard Rules
- UI must not invent fold geometry rules separately from the engines.
- Final fold placement and validation decisions remain engine-owned.
