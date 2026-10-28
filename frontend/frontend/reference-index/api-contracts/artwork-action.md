# Artwork Action Contract

## Engine
- `artwork`

## Typical Action Names
- `import-artwork`
- `move-artwork`
- `run-preflight`
- `apply-preflight-fix`

## Request Shape
See `ArtworkActionRequest` in `packages/shared/engine-api/types.ts`.

## Response Shape
- success/failure
- updated artwork state where applicable
- warnings/errors
- validation report where applicable

## Hard Rules
- UI must not clear preflight warnings by duplicating engine logic.
- Final artwork validation and warning decisions remain engine-owned.
