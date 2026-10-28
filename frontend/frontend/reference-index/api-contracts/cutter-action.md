# Cutter Action Contract

## Engine
- `cutter`

## Typical Action Names
- `set-eyemark-count`
- `move-eyemark`
- `fix-td-slit-clearance`
- `add-fold-line`
- `add-hanger-slot`

## Request Shape
See `CutterActionRequest` in `packages/shared/engine-api/types.ts`.

## Response Shape
- success/failure
- updated state when applicable
- warnings/errors
- validation report when applicable

## Hard Rules
- AI must not directly mutate cutter geometry.
- Final geometry decisions must remain inside the engines.
- Final validation decisions must remain inside the engines.
