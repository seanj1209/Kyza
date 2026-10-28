# Artwork Actions

- Engine owner: `artwork-engine`

## What The Artwork Engine Owns
- Artwork import state
- Artwork placement state
- Artwork preflight
- Safe-zone checks
- Eyemark-track checks
- Fold-line distance checks
- TD/slit warning prompts tied to artwork/flood-print context
- Future barcode/profile/approval orchestration

## Frontend/UI Allowed To Do
- Upload/select artwork
- Ask for preflight
- Display warnings, overlays, and action prompts
- Submit structured artwork actions in the future Engine API format

## Frontend/UI Must Not Do
- Recompute preflight rules separately
- Decide that a warning is cleared without engine confirmation
- Recreate barcode/profile approval logic outside the artwork engine

## Future AI Screen Rule
- AI-built screens may call structured artwork actions only.
- The artwork engine remains the source of truth for final validation and warning logic.
