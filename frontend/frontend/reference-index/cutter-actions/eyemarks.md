# Eyemarks

- Engine owner: `cutter-engine`
- Related artwork checks: `artwork-engine`

## Current Actions
- Set eyemark count
- Set eyemark position
- Set eyemark size
- Move eyemark(s)
- Preserve per-eyemark state for one and two-eyemark setups

## Hard Rules
- Two-eyemark state must be preserved and must not collapse back to one eyemark.
- UI must not store a fake second eyemark outside engine-owned state.
- Final eyemark geometry decisions remain inside the engines.

## Current Validation/Behavior Notes
- Supported eyemark counts are engine-limited.
- Position options are validated per single-eyemark vs two-eyemark mode.
- TD/slit clearance actions are currently TD-only; MD edge warning logic is intentionally not live yet.
