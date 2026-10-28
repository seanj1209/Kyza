# CutNFlow Project Update Boundary

## Purpose

Phase 2 adds one controlled path for Cutter Studio project/spec writes while retaining the current `FlowwrapSpec` renderer contract. It reduces the chance that separate copies of the spec overwrite each other during control edits, canvas interactions, artboard switches, undo, or save/load.

This phase does not add FlowAI mutation, redesign the UI, change renderer output, alter cutter rules, or migrate `FlowwrapSpec` into `CutterElementV1`.

## Central service

`apps/web/src/project/projectUpdateService.ts` provides:

- `updateCutNFlowProject()` for immutable project/spec writes;
- `synchroniseCutNFlowProject()` for read/display synchronisation that must not create a model write;
- `migrateSavedProjectRecord()` for old `cutter_saved_projects_v1` records;
- update reasons, revision checks, deep patch types, results, and validation hooks.

Every accepted update:

1. Parses the current V1 project through the Phase 1 contract.
2. Optionally rejects a stale `expectedRevision`.
3. Deep-clones a replacement spec or recursively applies an object patch.
4. Preserves unpatched nested cutter fields.
5. Increments the numeric revision once and updates `updatedAt`.
6. Parses the result again before returning it.
7. Returns the new project and an isolated `legacySpec` copy.

The previous project object is never mutated.

## Revision behaviour

New and duplicated projects start at revision `1`. Accepted writes increment the current revision. Read-only synchronisation for artboard switching or save/load preserves both revision and `updatedAt`.

Callers may provide `expectedRevision`. A mismatch returns an error instead of applying stale work. This is the low-risk foundation for future command conflict checks.

## Controls synchronisation

`controlsApi.syncSpecFromProject(spec)` is display-only:

- it deep-clones the supplied model;
- it updates fields and control subviews;
- it does not call `onChange`;
- it does not increment the project revision;
- it does not trigger a render/model-write loop.

Actual user edits call the separate `emitUserChange` channel and are routed back to `main.ts` with either `controls-edit` or `engine-action`.

The legacy `setSpec` API remains as a compatibility alias for `syncSpecFromProject`, but new orchestration code uses the explicit method name.

## Paths now using the boundary

- Pack creation from the start screen.
- New artboard pack creation.
- Custom project-builder completion.
- Control edits.
- Eyemark count engine actions initiated by controls.
- Customisation-panel edits through its main callback.
- Safe zone, attribute, eyemark, hanger slot, window, half-moon, K-seal, fold, grip, zipper, tear-notch, DOY, perf, paper-strip, and seal canvas interactions.
- Selection edit/delete helpers that use `commitSpecUpdate`.
- Layer and sublayer deletion.
- Undo restoration.
- Saved project loading.
- Artboard switching/remounting.
- Artwork handoff startup hydration.

## Save/load compatibility

The existing `cutter_saved_projects_v1` card key remains available and old records still load. Old cards are wrapped with `projectFromLegacySpec`, validated, and assigned their existing card ID as the stable project ID.

New saves include a `CutNFlowProjectV1` envelope in the legacy card record and are also written through the Phase 1 `cutnflow.projects.v1` boundary. Current card UI and export continue using the compatibility `spec` field, which is derived from the project envelope.

Duplicate creates a new V1 project ID and revision history while preserving cutter geometry. Delete removes both the visible legacy card and its versioned project when available.

## Validation hook

The update service exposes an optional validation hook and returns errors/warnings. Cutter Studio does not change its validation rules in Phase 2.

```ts
// Phase 4 UI/export consumers use the shared structured validation service.
// This hook remains available for future command-scoped pre/post validation.
```

## State copies that remain temporarily

Phase 2 controls writes but does not remove all compatibility state. These still exist:

- `Artboard.project` — V1 envelope and revision source.
- `Artboard.spec` — compatibility render/save copy derived from the project.
- `main.currentSpec` — active render/input compatibility copy.
- controls local spec — isolated UI copy.
- customisation panel local spec — isolated UI copy.
- interaction `pendingSpec` closures — pointer-session working copies.
- rendered SVG metadata — interaction and current issue-panel transport.

The important change is that accepted writes converge through `updateCutNFlowProject()` before `Artboard.project`, `Artboard.spec`, and `main.currentSpec` are synchronised.

## Intentionally deferred

- Removing all compatibility spec copies.
- Redo support; only undo exists currently.
- Stable IDs beyond the Phase 3 eyemark, perf-lane, and tear-notch compatibility refs; seals, gussets, and other remaining feature families are pending.
- Canonical cutter-origin coordinates.
- Structured validation codes and element references.
- A single vector-preserving export service.
- Artwork project-ID migration.
- `CutterElementV1` unions.
- FlowAI prompt/command mutation.

## Effect on disappearing-element risks

Deep cloning and recursive patches prevent unrelated edits from replacing nested eyemark, perf, safe-zone, fold, hanger, window, attribute, tear-notch, or pack-specific fields. Programmatic control sync can no longer emit an accidental model update during a view switch. Revision checks provide an observable way to reject stale future commands.

Phase 3 now supplies stored eyemark, perf-lane, and tear-notch refs through this update boundary. Other legacy feature identity remains a risk.

## Requirements before FlowAI mutation

Before FlowAI may write projects, the remaining canonical-coordinate work, approved production-rule gaps, and command-level pre/post validation must be completed. FlowAI must continue to propose typed engine requests rather than replacing `legacySpec` directly.
