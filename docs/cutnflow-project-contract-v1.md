# CutNFlow Project Contract V1

## Purpose

`CutNFlowProjectV1` is the first stable, versioned envelope around the current CutNFlow cutter model. It creates a validated JSON boundary for project identity, pack type, cutter data, and future export/artwork metadata without changing Cutter Studio behaviour or replacing `FlowwrapSpec`.

This is a compatibility foundation for later project persistence and engine commands. It is not a new cutter engine, an element-model migration, or a FlowAI mutation layer.

## Contract location

The contract is owned by `packages/cutter-engine/project` rather than a UI component:

- `projectTypes.ts` — versioned data types and constants.
- `projectContract.ts` — creation, parsing, migration, normalisation, ID, timestamp, and legacy-spec adapters.
- `projectStorage.ts` — isolated browser-storage and project JSON boundary.

## V1 shape

```ts
type CutNFlowProjectV1 = {
  schemaVersion: 1;
  id: string;
  revision: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  cutter: {
    units: "mm";
    coordinateSpace: "legacy-flowwrap";
    packType: string;
    legacySpec: FlowwrapSpec;
    identityMap: { elements: CutterElementRef[] };
  };
  artwork?: unknown;
  exportSettings?: {
    format?: "pdf" | "svg" | "ai";
    preserveVector?: boolean;
    includeLayers?: boolean;
  };
};
```

## Why `FlowwrapSpec` remains as `legacySpec`

`FlowwrapSpec` is the current structured input used by pack defaults, geometry composition, validation, renderers, controls, artboards, and export. Replacing it now would require a broad change across high-risk orchestration and UI files.

V1 therefore wraps an unchanged JSON copy as `cutter.legacySpec`. Existing renderers can continue consuming `FlowwrapSpec`, while persistence/API code gains a stable project identity and validated envelope. The adapter functions are the only intended bridge:

- `projectFromLegacySpec(packType, name, spec)` wraps existing cutter data.
- `legacySpecFromProject(project)` returns an isolated JSON copy for existing consumers.

The envelope must not become a second live cutter model. Until Phase 2, current UI state remains authoritative for current Studio sessions; the V1 project boundary is prepared for incremental adoption.

## `schemaVersion`

`schemaVersion: 1` identifies the project-envelope schema, not the pack module version or `FlowwrapSpec` version.

The parser rejects missing or unsupported schema versions because no older versioned envelope exists yet. `migrateCutNFlowProject` is the controlled entry point where future schema migrations will be added. It currently accepts V1 and may safely generate a missing project-level ID, but it does not invent or migrate cutter elements.

`revision` is a positive integer. New and duplicated projects begin at revision `1`; accepted model writes increment it once. Phase 1 records created before revision support are normalised to revision `1` at the parse boundary.

## Units

`cutter.units` must be `"mm"`.

This makes the current internal unit assumption explicit at the project boundary. It does not rename existing `FlowwrapSpec` fields or convert values. A project using another unit is rejected rather than silently converted.

## Coordinate space

`cutter.coordinateSpace` must be `"legacy-flowwrap"`.

The audit found several current coordinate conventions: cutter-origin values, live-area-relative values, calculated eyemark anchors, and pack-specific offsets. Calling the space `legacy-flowwrap` records that reality without pretending the current values share one origin.

Future element models must convert these values through explicit adapters before adopting a canonical `cutter-origin` coordinate space.

## Parsing and normalisation

All imported or stored values pass through `parseCutNFlowProject` before use. It returns:

```ts
type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };
```

V1 validation checks:

- schema version;
- project ID, name, and timestamps;
- cutter object;
- `units: "mm"`;
- `coordinateSpace: "legacy-flowwrap"`;
- non-empty pack type;
- object-shaped `legacySpec` with finite base width, height, and seal values;
- supported export-setting values.

Parsing and adapters make JSON copies so callers do not share mutable nested references accidentally. Invalid values produce error results instead of uncaught parse or storage exceptions.

## Project IDs and timestamps

`createCutNFlowProjectId()` uses `crypto.randomUUID()` where available and a timestamp/random fallback otherwise. Phase 3 adds stored compatibility refs for primary/secondary eyemarks, perf lanes, and DOY/sachet tear-notch configurations. Remaining element families are still deferred.

`touchCutNFlowProject(project)` returns a normalised copy with a new `updatedAt`. It is a timestamp helper, not a state manager or revision engine.

## Storage boundary

Versioned projects use the new key:

```text
cutnflow.projects.v1
```

This does not replace, read, delete, or rewrite the current `cutter_saved_projects_v1` records. Existing Cutter Studio save/load remains unchanged in Phase 1.

The storage module provides validated operations for save, load, list, delete, duplicate, JSON export, and JSON import. Every read is parsed through the V1 contract. Import is an upsert by project ID; callers should request confirmation before exposing replacement behaviour in a future UI.

## What is tested

The contract tests cover:

- creation and valid parsing;
- rejection of malformed/non-mm projects;
- safe generation of a missing project ID;
- legacy-spec value preservation;
- all currently registered pack defaults, including the internal plain-web module;
- local-storage save/load and list behaviour;
- duplication with a new project ID and unchanged cutter geometry;
- JSON export/import;
- one-eyemark and two-eyemark state preservation;
- fixed `mm` units and `legacy-flowwrap` coordinate space.

## Required work before FlowAI may mutate projects

Phase 1 alone does not make direct FlowAI mutation safe. Phase 2 and later must still:

1. Adopt the project envelope in normal Cutter Studio save/load through a migration adapter.
2. Add one immutable project update gateway and revision/conflict handling.
3. Make UI `setSpec` synchronisation side-effect free.
4. Complete stable IDs for every independently actionable cutter element; eyemark, perf-lane, and tear-notch compatibility refs are now present while remaining families are pending.
5. Define canonical mm coordinates and convert legacy feature coordinates through adapters.
6. Return structured validation codes and element IDs directly from engines.
7. Make render and export consume the same validated project revision.

Until then, FlowAI may interpret language into proposed typed engine requests only. It must not replace `legacySpec`, mutate SVG/controls, or address features by array index.

## Future `CutterElementV1` migration

The later migration should be incremental:

1. Add a canonical cutter document and element union beside a tested legacy adapter.
2. Migrate eyemarks first while preserving one/two-mark behaviour.
3. Migrate perf lanes and tear notches with stable IDs.
4. Convert live-relative and anchor-relative coordinates to explicit cutter-origin mm values.
5. Migrate remaining features one family at a time.
6. Remove `legacySpec` only after every registered pack passes JSON, geometry, validation, render, and export parity fixtures.

No renderer or UI shell change is part of the V1 contract.
