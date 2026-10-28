# Slit Tolerance

- Primary owners: `artwork-engine` for warnings/prompts, `cutter-engine` for geometry updates

## Current Actions
- Reduce eyemark size on the TD axis
- Move eyemark inward to the required TD clearance
- Increase cutter/web width where supported
- Ignore current warning state

## Current Known Rules
- TD/slit eyemark clearance threshold is currently `1.5mm`.
- Single affected eyemark actions target that eyemark only.
- Grouped two-eyemark TD/slit actions operate on both eyemarks together where required.
- Two-eyemark grouped width increase uses the grouped recommendation currently surfaced by the engine layer.
- Left-side expansion is not generally available as a free-form client-side behavior; unsupported cases should remain engine-declared.

## Hard Rules
- Slit tolerance actions for two eyemarks must operate on both eyemarks together where required.
- UI must not guess which eyemark or edge should move.
- Final geometry and warning-clear decisions remain inside the engines.
