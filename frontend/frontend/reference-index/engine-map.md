# Kyza Engine Map

## Ownership
- `cutter-engine` owns cutter geometry, eyemarks, slit tolerance, folds, holes, live/seal boundaries, rendering/export rules, and final cutter-side validation decisions.
- `artwork-engine` owns artwork placement, artwork preflight, safe-zone checks, eyemark-track checks, TD/slit artwork warnings, flood-print related prompts, and future approval/profile logic.
- `pack-generator` owns pack templates, pack defaults, pack geometry composition, and pack-level validation.
- `shared` owns reusable types, geometry helpers, constants, schemas, and cross-engine contract types.
- `engine-api` is reserved as the future bridge between UI, future AI-built screens, and backend/API routes.

## Frontend/UI Rules
### Allowed
- Gather user input.
- Render engine output.
- Send structured requests to engines or the future Engine API bridge.
- Display warnings, validation messages, and previews returned by engines.

### Must Not
- Duplicate cutter, artwork, or pack-generation rules.
- Directly decide final geometry.
- Directly decide final validation outcomes.
- Collapse two-eyemark state back to one eyemark.
- Re-implement PDF export logic separately from engine-owned behavior.

## Future AI Screen Rules
### Allowed
- Read this Reference Index as the source of truth.
- Convert plain-English prompts into structured engine/API requests.
- Ask the `pack-generator` for structured pack specs.
- Ask the `cutter` and `artwork` engines for safe actions and validation.

### Must Not
- Directly mutate cutter geometry.
- Bypass engine validation.
- Invent new pack/action payload shapes outside the shared API contract types.

## Hard Rules
- UI must not duplicate cutter, artwork, or pack-generation rules.
- UI must call structured engine/API requests.
- AI-built screens must use the Reference Index as the source of truth.
- Future AI pack generation may convert plain-English prompts into structured pack specs.
- AI must not directly mutate cutter geometry.
- Final geometry decisions must remain inside the engines.
- Final validation decisions must remain inside the engines.
- Two-eyemark state must be preserved and must not collapse back to one eyemark.
- Slit tolerance actions for two eyemarks must operate on both eyemarks together where required.
- PDF export behavior must remain unchanged.

## Current Pack Types
- `flowwrap` — primary flowwrap workflow with two-eyemark defaults.
- `pillow-pack` — pillow pack workflow with default fold lines.
- `doy-pouch` — DOY pouch workflow.
- `k-seal-pouch` — K seal pouch workflow.
- `sachet-3-side-seal` — 3-side seal sachet workflow.
- `sachet-4-side-seal` — 4-side seal sachet workflow.
- `plain-web` — hidden/internal plain-web module.
- `paper-strip` — paper-strip workflow.

## Current Cutter Actions
- Add/remove/move eyemarks.
- Adjust eyemark size.
- Apply TD/slit eyemark clearance actions.
- Add/remove fold lines.
- Add/remove hanger slots.
- Add/remove half-moon cut-outs.
- Manage safe zones, windows, attributes, perfs, and related cutter geometry controls.

## Current Known Validation Rules
- Width and height must stay positive.
- Seal dimensions and live-area math must remain valid.
- Seal clearance minimums are enforced by the engines.
- Eyemark counts are limited to supported states and valid positions.
- Safe zones and attribute boxes must stay inside allowed areas.
- Half-moon cut-outs, hanger slots, perfs, and paper-strip rules are engine-validated.
- Artwork preflight enforces safe-zone, seal, fold-line, eyemark-track, and TD/slit warning rules.

## Structured Request Rule
- UI and future AI clients should send typed requests using `packages/shared/engine-api/types.ts`.
- Engines should return typed responses, warnings, errors, and validation reports.
- The UI should render those results rather than recomputing them.
