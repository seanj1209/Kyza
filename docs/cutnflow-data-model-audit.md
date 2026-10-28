# CutNFlow Cutter Data Model Audit

## Audit scope

This audit records the repository state as inspected on 2 July 2026. It covers the current cutter/project model, update paths, rendering, validation, export, and browser persistence. It does not redesign the Cutter Studio shell or propose a full rewrite.

## Executive verdict

**Safe to build FlowAI command input on: PARTIAL**

The current `FlowwrapSpec` is a useful structured source for cutter geometry. Pack modules already compose a spec into geometry, validation, layout, and SVG, and the ordinary project records are JSON-serialisable. That is a credible foundation.

It is not yet safe for FlowAI to mutate projects directly because there is no single versioned project aggregate, several element classes have no stable ID, units and coordinate spaces are implicit, state updates are distributed across large UI/orchestration files, validation is incomplete for important cutter rules, and export has two partially different paths. FlowAI should remain limited to typed engine requests until the Priority 0 hardening work below is complete.

No dedicated type file was added during this audit. The existing types are scattered and should be consolidated, but introducing an unused parallel model without adapters, migration, and round-trip tests would create another source of truth rather than remove one.

## 1. Current structure map

```text
frontend/frontend/
├── apps/web/src/
│   ├── main.ts                         Cutter Studio orchestration and runtime state
│   ├── types/
│   │   ├── flowwrap.ts                 Main cutter spec and most feature types
│   │   ├── eyeMarks.ts                 Aggregate eyemark state
│   │   └── perfs.ts                    Aggregate perf and lane state
│   ├── config/
│   │   ├── mvpDemoPack.ts              MVP project identity/handoff record
│   │   └── activeCutterState.ts        Cutter-to-Artwork session handoff snapshot
│   ├── packs/                           Pack defaults, validate/render contracts
│   ├── core/packComposer/               Normalise → geometry → rules → validation → layout
│   ├── core/geometry/resolvers/         Structured render-layout models
│   ├── geometry/                        Geometry and feature calculations
│   ├── constraints/                     Shared cutter constraints
│   ├── engines/validation-engine/       Pack-specific validator selection
│   ├── renderers/                       SVG construction
│   ├── ui/                              Controls and direct SVG interactions
│   ├── layers/layerManager.ts           Runtime layer metadata and state
│   ├── state/selectionStore.ts           Runtime selection registry
│   ├── artwork/                          Separate artwork model/store/preflight/export
│   └── sandbox/storage/                 Separate versioned custom-project persistence
└── packages/
    ├── cutter-engine/                   Re-exports app types/actions/validators/renderers
    ├── engine-api/                      Structured request runners
    └── shared/engine-api/               Generic engine request/response contracts
```

The documented target `frontend/frontend/src` path is stale for this checkout. The application source is under `frontend/frontend/apps/web/src`.

## 2. Current data model summary

### Practical source of cutter truth

The practical cutter model is `FlowwrapSpec` in `apps/web/src/types/flowwrap.ts`. It contains base dimensions and optional feature groups. Pack type is not part of the spec: it is held beside the spec as `Artboard.packId`, `SavedProjectCard.packId`, or `CurrentProject.packType`.

The live Cutter Studio project is an `Artboard` declared inside `main.ts`:

```ts
type Artboard = {
  id: string;
  name: string;
  packId: string;
  spec: FlowwrapSpec | null;
  started: boolean;
  viewBoxState: { zoom: number; panX: number; panY: number };
  savedProjectId?: string;
};
```

This is not exported, versioned, or shared with the engine packages. The saved-library record is a second local type containing `id`, `name`, `packId`, `spec`, and `updatedAt`. The Artwork Studio handoff is a third shape, `ActiveCutterState`, which duplicates `spec` into `baseGeometry` and `attributes` and adds selection, layer IDs, and print rules.

### Attribute coverage

| Concern | Current representation | Stable ID | Units / coordinates |
| --- | --- | --- | --- |
| Pack type | `Artboard.packId`, `SavedProjectCard.packId`, `CurrentProject.packType`; all plain `string` | Project/artboard has an ID, pack type does not need one | N/A |
| Pack dimensions | `FlowwrapSpec.width`, `height` | No element ID | Implicit mm; cutter-local size |
| Seals | Scalar `seal` plus optional `seals.top/bottom/left/right` overrides | No | Implicit mm; derived from cutter edges |
| Bleed | Optional `FlowwrapSpec.bleed`; renderer geometry uses `INTERNAL_BLEED_MM` instead | No | Implicit mm; current rendered inset is a fixed internal constant |
| Safe zones | `SafeZoneSpec[]` | Yes | `x/y/width/height` are implicit mm relative to live-area origin |
| Fold lines | `FoldLineSpec[]` | Yes | Vertical `offset` is relative to live-area X; horizontal rendering ignores offset and centres the line |
| Eyemarks | One aggregate `EyeMarkSpec` with count, primary/secondary size, offsets, and manual flags | No per mark; UI derives `eye-mark:0/1` from index | Implicit mm; offsets are relative to computed position/seal anchors |
| Tear notches | Nested `doyPouch.tearNotch` and optional `sachet.tearNotch` | No | Implicit mm; DOY offsets are derived from cutter edges, not a common origin |
| Hanger slots | `HangerSlotSpec[]` | Yes | `centerX/centerY` are implicit mm relative to live-area origin |
| Perforations | One aggregate `PerfSpec`; optional `PerfLane[]` | No ID on the perf group or lanes | Implicit mm; lane origins are live-area relative, with mode-specific interpretation |
| Gussets | Nested DOY/K-seal/sachet construction fields | No | Implicit mm plus several ratios/offsets; no common element contract |
| Windows | `WindowSpec[]` | Yes | Implicit mm relative to live-area origin |
| Half-moon cut-outs | `HalfMoonCutoutSpec[]` | Yes | `centerX/centerY` are cutter-origin relative |
| Attribute boxes | `AttributeBoxSpec[]` for barcode, QR, BBE, label, and clear strip | Yes | Implicit mm relative to live-area origin |
| Plain-web guides | `PlainWebGuideLineSpec[]` | Yes | Implicit mm; offset relative to the relevant live-area axis |
| Artwork | Separate `ArtworkCollection` / `ArtworkItem[]` in Artwork Studio | Yes | Base sizes are explicit `Mm`; `x/y` are SVG/cutter coordinates |
| Layer metadata | Runtime `LayerManager` groups/layers with names, order, visibility, lock, and export role | Yes for layers | UI/runtime state; not stored in normal project records |
| Export settings | Artwork proof options only; no common cutter export settings on project | N/A | Not persisted with cutter project |
| Validation | Composer result and SVG `data-error` / `data-warning` attributes | Message IDs are generated by list index in UI | Derived state; not persisted with normal project |

### ID assessment

IDs are reliable enough for safe zones, attribute boxes, fold lines, windows, hanger slots, half-moon cut-outs, and plain-web guide lines. Creation uses a mixture of fixed defaults, `Date.now()`, random suffixes, and derived strings rather than one ID policy.

Eyemarks, perf lanes, seals, tear notches, and gusset features do not have stable element IDs. Eyemark selection is derived from array position/count, and perf interaction is derived from lane index. These are unsafe command targets for FlowAI because an index can change meaning after insertion, deletion, count changes, normalisation, or migration.

### Unit and coordinate assessment

The code consistently behaves as if cutter values are millimetres, and export explicitly writes SVG sizes in `mm`. The model does not declare a unit field and most dimensions are named `width`, `height`, `x`, `y`, or `offset` rather than `widthMm`, etc.

The structured model stores cutter/live-relative geometry, not browser pixels. Pointer handlers convert client coordinates through the SVG screen CTM before changing the spec. Pan and zoom are stored separately in `Artboard.viewBoxState`.

There is no single coordinate-space rule:

- Base cutter geometry starts at `(0, 0)`.
- Render layouts add an 80-unit canvas margin and expose rendered origins through SVG attributes.
- Safe zones, windows, attribute boxes, hanger slots, and most perf values are live-area relative.
- Half-moon cut-outs are cutter-origin relative.
- Fold offsets are live-X relative.
- Eyemark offsets are relative to calculated anchors.
- Tear notches use pack-specific edge offsets.

This works for current renderers but is too ambiguous for external commands without a typed coordinate-space contract.

## 3. Current files and types involved

| File | Responsibility | Audit note |
| --- | --- | --- |
| `apps/web/src/types/flowwrap.ts` | Main cutter spec and most feature interfaces | Central practical model, but broad, optional, implicit-unit, and not a project envelope |
| `apps/web/src/types/eyeMarks.ts` | Eyemark aggregate | Preserves two-mark values, but lacks per-mark IDs and uses duplicated primary/secondary fields |
| `apps/web/src/types/perfs.ts` | Perf aggregate and lanes | Lanes lack IDs and are addressed by index |
| `apps/web/src/geometry/foldLines.ts` | Fold spec and resolved segments | Stable IDs; horizontal offset semantics are not equivalent to vertical semantics |
| `apps/web/src/config/mvpDemoPack.ts` | Current MVP project metadata and local-storage handoff | No project ID; loader only accepts one exact MVP signature/version |
| `apps/web/src/config/activeCutterState.ts` | Session handoff to Artwork Studio | JSON-safe but duplicates canonical spec fields into derived collections |
| `apps/web/src/main.ts` | Artboards, current spec, save/load, undo, render wiring, selection sync, saved-card export | 3,000+ line high-risk orchestration hotspot |
| `apps/web/src/ui/controls.ts` | Local spec, controls, quick-add, normalisation-on-set | 4,000+ line high-risk hotspot; `setSpec` writes normalised data back through `onChange` |
| `apps/web/src/ui/customisationPanel.ts` | Separate current spec, style changes, current-canvas export | 1,500+ line high-risk hotspot; contains a second export implementation |
| `apps/web/src/ui/*Interactions.ts` | Direct SVG pointer interactions | Each owns a `pendingSpec` and feature-specific update path |
| `apps/web/src/core/packComposer/*` | Structured composition pipeline | Good boundary, but packages still depend on app-owned types and implementation |
| `apps/web/src/constraints/*` | Base/shared validation | Runs on structured data; coverage is incomplete |
| `apps/web/src/engines/validation-engine/*` | Pack validator selection | Useful central entry point, still app-owned |
| `apps/web/src/renderers/*` | SVG output and validation attributes | Render derives from spec/layout; also becomes a transport for UI validation messages |
| `apps/web/src/layers/layerManager.ts` | Layer names/order/visibility/lock/export roles | Separate mutable runtime state; normal project save does not preserve it |
| `apps/web/src/state/selectionStore.ts` | Runtime selection registry | Correctly UI-only, but element taxonomy is incomplete and IDs are partly DOM-derived |
| `apps/web/src/artwork/*` | Artwork items, local storage, preflight, proof export | Separate serialisable model; linked by an unstable project signature rather than project ID |
| `apps/web/src/sandbox/storage/customProjectStorage.ts` | Versioned custom-project JSON storage | Stronger schema/migration pattern that normal cutter save/load can reuse |
| `packages/cutter-engine/*` | Public cutter package surface | Currently re-exports `apps/web/src` types/actions/validators/renderers rather than owning stable contracts |

## 4. Current data flow

```text
Pack module defaults / saved localStorage record / session handoff
                              |
                              v
                    Artboard.spec: FlowwrapSpec
                              |
                   shallow/deep copies into
                              v
             main.currentSpec + controls local spec
                    + custom-panel local spec
                              |
             +----------------+----------------+
             |                                 |
       form/menu edit                    SVG pointer edit
             |                         (feature pendingSpec)
             v                                 v
      controls onChange              interaction onSpecChange
             |                                 |
             +----------> main callback <------+
                              |
                    update currentSpec and
                    active Artboard.spec
                              |
                              v
                    pack.render(spec)
                              |
                              v
       compose: normalise → geometry → rules → validate → layout
                              |
                              v
                      structured SVG
             +----------------+----------------+
             |                |                |
       Studio display    issue collection    current export
       + interactions    reads SVG attrs     clones live SVG
                                              
Saved project: Artboard.spec → JSON localStorage
Saved-card export: saved spec → pack.render(spec) → SVG → PDF/AI path
Artwork handoff: currentSpec → ActiveCutterState JSON in sessionStorage
Artwork items: separate ArtworkCollection JSON in localStorage
```

## 5. State update flow assessment

### What is centralised

- Pack creation goes through registered pack modules and, in the main start path, the Engine API bridge.
- Pack composition has a consistent `normalise → geometry → rules → validation → layout` shape.
- `commitSpecUpdate` updates `main.currentSpec` and the active artboard spec for several selection/edit commands.
- The controls `onChange` callback updates the active artboard and re-renders.
- Saved projects clone `FlowwrapSpec` before storage.

### What is scattered

- `main.ts` keeps `artboards`, `activeArtboardId`, `currentSpec`, undo state, view state, layer state, selection state, and saved records as separate mutable variables.
- `controls.ts` owns another mutable `spec` and normalises collections when `setSpec` is called.
- `customisationPanel.ts` owns another `currentSpec`.
- Every feature interaction module owns a closure-local `pendingSpec` and reports its own updated copy.
- Some paths use `commitSpecUpdate`; others assign `currentSpec` and `active.spec` directly; direct SVG interactions rely on `controlsApi.setSpec()` calling back into main.
- Several pack defaults return shallow object copies, while nested objects/arrays may remain shared until a later immutable update or JSON clone.
- Some control handlers mutate nested collections directly before notifying.

### Overwrite and disappearance risk

The current code contains safeguards for two-eyemark count changes in `runCutterActionRequest`, and secondary width/height fields are preserved. The audit did not prove an active disappearing-eyemark bug.

There is still a credible persistence risk:

1. Eyemarks are one aggregate object, not stable elements. Mark identity is derived from index.
2. The same cutter is represented concurrently by `Artboard.spec`, `main.currentSpec`, the controls spec, the custom-panel spec, interaction `pendingSpec` closures, and the session handoff snapshot.
3. View switches restore from `Artboard.spec`; any path that updates only another copy can be overwritten.
4. `controls.setSpec()` is not a read-only synchronisation method: it adds defaults/empty arrays and calls `onChange`, which can trigger an additional model update and render during a view switch or remount.
5. Selection IDs for eyemarks and perf lanes are positional, so count/lane changes can select or command a different visual object.

These conditions are compatible with intermittent “element disappeared/reverted” symptoms even if the currently known eyemark path is improved.

## 6. Render model

### Confirmed source

The normal render path is structured-data driven:

```text
FlowwrapSpec
  → registered PackModule.render(spec)
  → pack composer
  → normalised spec + geometry + validation + resolved layout
  → SVG renderer
```

The SVG is therefore derived output rather than the primary cutter model. Feature interactions can update the DOM during pointer movement for responsiveness, but they commit a changed spec at the end of the interaction and the next full render regenerates the SVG from that spec.

### Separate visual state

- Layer visibility, lock state, order, renamed labels, and selection live in `LayerManager` / `SelectionStore`, not `FlowwrapSpec`.
- Pan and zoom live in `Artboard.viewBoxState`.
- Control panel expansion and tool modes are UI-only globals.
- Rendered SVG contains origins, bounds, IDs, warnings, and hit targets used by interactions and UI issue reporting.

The separation is appropriate for transient selection and pan/zoom. Layer visibility/order and export naming are not purely transient because they affect output, yet they are not stored with the normal project.

### Render/export consistency

Saved-card export re-renders from the saved `FlowwrapSpec`, so its base geometry uses the same pack renderer as Studio. Current-project export clones the live Studio SVG rather than re-rendering an explicit export document. The two routes can therefore differ in runtime layer state, selection chrome removal, layer naming metadata, and future render-mode behaviour.

## 7. Export model

### Current paths

1. `customisationPanel.ts` exports the currently rendered SVG. It removes interaction chrome, applies an 80 mm frame margin, writes dimensions in mm, and adds friendly/Inkscape layer metadata for the `.ai` route.
2. `main.ts` saved-card export renders `card.spec` again, applies base customisation, and uses a second serializer/PDF builder.
3. Artwork proof export has a third PDF path tailored to an A4 proof and optional cutter/artwork layers.

### Repro/editability findings

- The cutter PDF path rasterises the SVG to a 600 dpi JPEG and embeds that single image in a PDF. Cutter lines, text, and layer groups are flattened and are not editable vector objects in Illustrator.
- The `.ai` path writes SVG/XML markup with an `.ai` extension and `application/postscript` MIME type. It is not a native Illustrator/PostScript file. Illustrator may import compatible SVG content, but this is not a guaranteed production AI contract.
- The custom-panel AI serializer labels SVG groups using layer names and Inkscape metadata. The saved-card AI serializer does not perform the same layer-name rewrite; its `includeAiLayerMeta` flag only declares a namespace.
- Layer roles (`cut`, `annotation`, `guide`) exist in `LayerManager` but are not embedded in the canonical project or consistently used by both export paths.
- Export frame size is derived from SVG metadata and written in mm, which is directionally correct. Duplicate export implementations and raster conversion create regression risk for scale, margins, hidden layers, and output parity.
- No common export-readiness gate was found before cutter PDF/AI creation.

**Export conclusion:** geometry is sourced from the cutter spec, but current PDF output is unsuitable as an editable repro cutter file, and layer/editability guarantees are not stable enough for production use.

## 8. Validation model

### Where rules live

- Shared cutter checks: `apps/web/src/constraints/`.
- Pack-specific checks: `apps/web/src/engines/validation-engine/` and pack composition functions.
- Composition and result aggregation: `apps/web/src/core/packComposer/`.
- Artwork preflight: `apps/web/src/artwork/artworkPreflight.helpers.ts` and related Artwork Studio files.

Base/pack validation runs against structured `FlowwrapSpec`, which is the correct direction. The resolved layout calls base validation, renderers copy messages onto SVG `data-error` and `data-warning` attributes, and `main.ts` reads those attributes back to populate the issue panel. Artwork preflight also queries rendered SVG geometry/zones, so it is more DOM-dependent than the cutter validators.

### Existing cutter checks

The current validators cover, with pack-specific variation:

- positive cutter width and height;
- positive seals for sealed contexts and valid live width/height after seals;
- non-negative input bleed and whether the fixed internal bleed buffer fits the live area;
- minimum seal clearance;
- safe-zone count, positive dimensions, live-area bounds, rotation-aware bounds, and seal/bleed clearance;
- attribute-box positive dimensions, live-area bounds, and clearance warning;
- perf separation, diameter, lane count, lane origin minima, continuous seal edge, and regulated count;
- eyemark positive size and position compatibility for supported one/two-mark states;
- maximum one window;
- half-moon count, cutter-edge position, side-seal intersection, seal reduction, and configured DOY gusset/grip/zipper/notch relationships;
- K-seal field/range relationships;
- plain-web guide offsets/spans;
- paper-strip placement and clear-strip constraints.

### MVP gaps

| Required check | Current status |
| --- | --- |
| Eyemark in seal only | **Missing as a model validator.** Renderer/interaction placement constrains common paths, but imported or externally mutated state is not comprehensively checked. |
| Eyemark minimum distance from cutter edge | **Partial.** Artwork preflight has TD/slit allowance logic; base cutter validation does not enforce a general edge-clearance rule, and MD behaviour is intentionally incomplete in the reference index. |
| Bleed inside seal boundaries | **Incomplete/inconsistent.** `spec.bleed` is checked for non-negative input, but geometry uses fixed `INTERNAL_BLEED_MM`; the requested project value is not the rendered source. |
| Safe zones clear of seal/cutter areas | **Mostly present** for enabled safe zones through live-area and clearance checks. Cross-feature exclusions such as zipper/notch/die-cut are not unified. |
| Tear notch position rules | **Missing as a dedicated validator.** Position is pack-specific and largely constrained by renderer/interaction logic. Half-moon checks reference notches, but that does not validate the notch itself. |
| Fold-line movement restrictions | **Partial.** Rendering clamps vertical lines and UI movement is horizontal-only, but invalid persisted offsets are not rejected; horizontal offset semantics are not implemented consistently. |
| Element persistence rules | **Missing.** No common uniqueness, required-ID, schema-version, coordinate-space, or serialisation validation exists for normal cutter projects. |

Additional gaps found:

- Unsupported eyemark counts outside the configured range are not explicitly added as an error; size/position checks only run when the count is supported.
- Perf lanes and eyemarks cannot be validated/reported by stable element ID.
- Hanger-slot constraints are mostly clamping/helpers and visual warnings rather than complete project-level validation.
- Window geometry is not comprehensively validated beyond the maximum count.
- Duplicate IDs are not checked for element arrays.
- Validation does not produce stable error codes and element references for most cutter messages.
- Export does not consume a structured validation result as an explicit gate.

Numeric production constraints that are not already documented must remain configurable/TBD; this audit does not invent new clearances.

## 9. Persistence and save readiness

### JSON serialisation

`FlowwrapSpec`, `Artboard` snapshots, saved-card records, `ActiveCutterState`, and artwork collections use plain JSON-compatible values. Existing code already clones or saves them through `JSON.stringify` / `JSON.parse`.

### Current persistence routes

- Normal Cutter Studio saved library: `cutter_saved_projects_v1` in local storage, containing `SavedProjectCard[]`.
- MVP route/project metadata: `cutnflow.currentProject` in local storage, accepted only for the exact MVP signature.
- Cutter-to-Artwork handoff: `cutnflow.activeCutterState` in session storage with a schema string.
- Artwork collection: separate local-storage record keyed by pack type, rounded dimensions, and prompt-derived signature.
- Custom sandbox projects: separate versioned storage with migration hooks and JSON import/export.

### Suitability for future project operations

| Operation | Readiness |
| --- | --- |
| Save Project | MVP implementation exists for cutter spec/name/pack type. Missing a common schema version, created time, validation on load, artwork link, layer/export settings, and durable project identity. |
| Load Project | MVP local load exists. It casts `item.spec` to `FlowwrapSpec` after shallow shape filtering and performs no migration/normalisation at the storage boundary. |
| Duplicate Project | Saved-card duplication exists and deep-clones the spec. New IDs are generated for the project record, while element IDs intentionally remain the same inside the independent copy. |
| Export Project JSON | Exists for sandbox custom projects only. Normal Cutter Studio projects have no JSON export/import contract. |

### UI-only or derived values mixed into cutter data

- `selected?: boolean` appears on safe zones, attribute boxes, windows, hanger slots, and half-moon cut-outs.
- `enabled?: boolean` is both a domain-presence flag and a UI toggle on some feature types.
- `EyeMarkSpec.selectedIndex` is selection state inside the domain object.
- `baseCustomisation` mixes presentation/output style into the geometry spec.
- `ActiveCutterState.baseGeometry`, `attributes`, layer IDs, and attribute types are derived duplicates of `spec`.

Layer manager instances, maps, listeners, DOM nodes, tool modes, and pointer drag state are non-serialisable but remain outside normal saved cutter data, which is correct. Artwork `sourceDataUrl` is serialisable but may make project JSON very large and should eventually be stored as an asset reference/blob strategy rather than duplicated text.

## 10. Coupling hotspots

1. **`main.ts`** couples project lifecycle, storage, undo, engine bridge, rendering, interaction registration, layer state, selection, and two export paths. It is a high-risk file.
2. **`controls.ts`** couples form state, model normalisation, quick-add behaviour, pack-specific controls, bridge requests, and rendered control subviews. `setSpec` has write side effects.
3. **`customisationPanel.ts`** couples UI state, base style mutation, layer presentation, saving, and export generation.
4. **App/package inversion**: `packages/cutter-engine` re-exports types and implementation from `apps/web/src`. The intended engine boundary depends on the UI application instead of owning stable contracts.
5. **DOM metadata contract**: interactions, issue reporting, artwork preflight, export framing, and selection discovery depend on renderer-emitted SVG IDs and `data-*` attributes.
6. **Pack-specific optional mega-spec**: one `FlowwrapSpec` carries fields for flowwrap, DOY, K-seal, sachet, plain web, and paper strip without a discriminated pack-type union.

## 10A. Current risks/problems

1. There is no single versioned project object shared by UI, engines, persistence, validation, and export.
2. Eyemarks, perf lanes, tear notches, seals, and gusset features cannot all be addressed by stable element ID.
3. Units are implicit and feature coordinates use several different origins/anchor conventions.
4. Concurrent spec copies and side-effecting UI synchronisation can overwrite or normalise state during remounts and view changes.
5. UI selection flags and presentation customisation are mixed into the cutter spec, while export-relevant layer state is held separately and not saved.
6. Validation coverage is incomplete and the Studio issue panel reads messages back from rendered SVG rather than consuming the structured validation result directly.
7. Normal project storage has no validated schema/migration boundary and no JSON import/export contract.
8. Cutter export is duplicated; PDF output is flattened to a JPEG and the `.ai` output is SVG markup rather than a native Illustrator contract.
9. Engine packages re-export app-owned types and implementation, so the intended engine boundary is inverted.
10. The largest orchestration and control files are coupling hotspots, making a broad refactor unsafe without staged adapters and regression fixtures.

## 11. Duplication map

| Concept | Duplicated representations |
| --- | --- |
| Live cutter spec | `Artboard.spec`, `main.currentSpec`, controls `spec`, custom panel `currentSpec`, interaction `pendingSpec`, `ActiveCutterState.spec` |
| Project identity | `Artboard`, `SavedProjectCard`, `CurrentProject`, `SavedCustomProjectRecord`, artwork storage signature |
| Cutter features | Canonical fields in `spec` plus derived `ActiveCutterState.attributes` |
| Base geometry | `spec` plus `ActiveCutterState.baseGeometry` plus renderer SVG data attributes |
| Validation messages | Structured composer/validator output plus SVG `data-error`/`data-warning` plus UI `IssueEntry[]` |
| Layer state | Static `LayerManager` definitions plus rendered SVG groups plus handoff `layerIds`; visibility/lock/order are runtime-only |
| Export | Current SVG export, saved-card re-render export, and artwork proof export each implement framing/PDF logic |
| Eyemark identity | One aggregate model plus DOM/index IDs and artwork warning IDs |

## 12. Recommended final stable model

The final contract should use explicit millimetres, one cutter coordinate origin, stable IDs, a discriminated element union, and a versioned project envelope. UI state should be separated from the production document. Validation should be derived from the document and carry stable codes/element IDs.

```ts
type CutNFlowProjectV1 = {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  cutter: CutterDocumentV1;
  artwork?: ArtworkDocumentV1;
  exportSettings?: ExportSettingsV1;
};

type CutterDocumentV1 = {
  units: "mm";
  coordinateSpace: "cutter-origin";
  pack: PackModelV1;
  elements: CutterElementV1[];
};

type PackModelV1 = {
  packType: PackTypeId;
  widthMm: number;
  heightMm: number;
  sealsMm: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  bleedMm: number;
  sealClearanceMm?: number;
  substrate?: "clear" | "white" | "paper";
  construction?: PackConstructionV1; // discriminated DOY/K-seal/sachet/etc.
};

type BaseCutterElementV1 = {
  id: string;
  type: string;
  label?: string;
  visible: boolean;
  locked: boolean;
};

type CutterElementV1 =
  | EyemarkElementV1
  | SafeZoneElementV1
  | FoldLineElementV1
  | TearNotchElementV1
  | HangerSlotElementV1
  | PerfElementV1
  | WindowElementV1
  | AttributeBoxElementV1
  | HalfMoonElementV1
  | GuideLineElementV1;

type EyemarkElementV1 = BaseCutterElementV1 & {
  type: "eyemark";
  side: "left" | "right" | "top" | "bottom";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  color: "black" | "white" | "dark-blue";
};

type ValidationResultV1 = {
  projectId: string;
  evaluatedRevision: string;
  valid: boolean;
  messages: Array<{
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
    elementIds: string[];
  }>;
};

type CutterStudioState = {
  projectId: string;
  selectedElementIds: string[];
  activeLayerId: string | null;
  viewport: { zoom: number; panXMm: number; panYMm: number };
};
```

`ValidationResultV1` should not become an independently editable source of truth. It may be stored as a cache only when tied to an immutable project revision/hash. Cutter Studio state can be persisted separately for convenience, but render, validation, and export must consume the same `CutterDocumentV1`.

### Low-risk compatibility bridge

A direct migration from `FlowwrapSpec` to `CutterElementV1[]` would touch high-risk files and every renderer. The safe sequence is:

1. Introduce `CutNFlowProjectV1` as the storage/API envelope while retaining `FlowwrapSpec` as `cutter.legacySpec` or behind a typed adapter for one migration phase.
2. Define explicit `units: "mm"`, coordinate-space metadata, schema parsing, migrations, and ID normalisation at the boundary.
3. Route all writes through one project-update service that produces a new revision and validation result.
4. Adapt existing renderers/exporters from the project document without changing their output.
5. Migrate one feature family at a time from aggregate/pack-specific fields into stable element unions, starting with eyemarks and perf lanes.
6. Remove the legacy spec only after round-trip fixtures prove parity for every current pack type.

## 13. Minimal changes required before FlowAI command input

These are the minimum safe prerequisites; they do not require a UI redesign:

1. **Versioned project envelope and parser**
   - Add one shared project/type contract owned outside `apps/web`.
   - Include project ID, schema version, timestamps, pack type, units, coordinate-space version, and current cutter spec.
   - Add parse/normalise/migrate functions; never cast local-storage JSON directly.

2. **One update gateway**
   - Introduce `updateProject(command | updater)` as the only model write path.
   - Make UI `setSpec` methods read/synchronise only; they must not call model `onChange`.
   - Keep selection, viewport, open panels, and drag state outside the cutter document.

3. **Stable command targets**
   - Add IDs for individual eyemarks, perf lanes, tear notches, and any independently addressable gusset/fold feature.
   - Reject duplicate/missing IDs during project parsing.

4. **Explicit units and coordinate conversion**
   - Declare mm in the document.
   - Define one canonical cutter origin for stored element coordinates.
   - Convert current live-relative/anchor-relative values only in adapters.

5. **Structured validation contract**
   - Complete the MVP validation gaps using documented/configurable rules.
   - Return stable codes and element IDs directly to UI/export/FlowAI.
   - Do not use SVG attributes as the primary validation transport.

6. **One export service**
   - Export from a validated project/cutter revision.
   - Use one renderer/export document for live and saved projects.
   - Preserve vector paths, named layers, scale, and editability for repro output.

7. **Persistence and regression tests**
   - Add project JSON round-trip/migration fixtures for every current pack type.
   - Test artboard switching, save/load, duplicate, undo, one↔two eyemarks, layer state, and render/export geometry parity.

After these steps, FlowAI can safely emit typed commands such as `set-pack-dimension`, `add-eyemark`, or `move-element` against a project revision. It should not emit raw `FlowwrapSpec` replacements.

## 14. Proposed staged hardening plan

### Phase 1 — Low-risk contract foundation

- Add shared `CutNFlowProjectV1` envelope, parser, ID helper, and legacy `FlowwrapSpec` adapter.
- Add JSON round-trip and malformed-input tests.
- Reuse the migration pattern already present in `sandbox/storage/customProjectStorage.ts`.
- Do not change renderer output or the Cutter Studio shell.

### Phase 2 — Central update and persistence boundary

- Add a small project store/service with immutable updates and revision tracking.
- Adapt existing main/controls callbacks incrementally to it.
- Remove write side effects from UI synchronisation methods.
- Store normal projects through the versioned parser and expose import/export JSON.

### Phase 3 — Element identity and coordinate normalisation

- Migrate eyemarks first, preserving one/two-mark behaviour through adapters.
- Migrate perf lanes and tear notches next.
- Add explicit mm field names/new contract fields without forcing renderer rewrites in the same change.

### Phase 4 — Validation and export convergence

- Fill documented MVP validation gaps and produce structured messages with IDs.
- Make Studio issues and export readiness consume the structured result.
- Replace duplicated cutter export implementations with one vector-preserving service.
- Add geometry/layer parity tests between Studio and export.

### Phase 5 — FlowAI command layer

- Define revision-aware, typed commands over the stable project model.
- Validate before and after each command.
- Return structured diffs, warnings, and blocking errors.
- Keep FlowAI behind the engine/API boundary; never let prompt code mutate UI or SVG state directly.

## 15. Priority action list

### Priority 0 — before FlowAI mutation

1. Establish a versioned project envelope and validated JSON boundary.
2. Centralise writes and make control/view synchronisation side-effect free.
3. Give every independently addressable element a stable ID.
4. Declare mm and canonical coordinate-space semantics.
5. Add structured validation codes/element references for the required MVP checks.
6. Add save/load/switch/eyemark persistence regression tests.

### Priority 1 — before production cutter export

1. Converge live and saved-project export on one service.
2. Produce vector, editable output with consistent named layers.
3. Persist export-relevant layer state or make a deliberate immutable export-layer policy.
4. Gate export on a structured validation result.

### Priority 2 — project completeness

1. Link artwork storage by durable project ID.
2. Decide whether artwork is embedded or referenced in exported project JSON.
3. Migrate pack-specific optional fields to discriminated construction types/elements incrementally.
4. Move stable cutter contracts out of the web app so `packages/cutter-engine` owns rather than re-exports them.

## 16. Verification checklist for future implementation

- [ ] A project serialises and parses without value loss for every registered pack type.
- [ ] Schema version and migration behaviour are covered by fixtures.
- [ ] All independently selectable/actionable elements have unique stable IDs.
- [ ] All stored cutter coordinates declare mm and one canonical origin.
- [ ] UI selection, viewport, and panel state cannot overwrite cutter data.
- [ ] Switching artboards preserves all eyemark values, including the second mark.
- [ ] Render and export consume the same project revision.
- [ ] Validation runs against structured data and returns stable codes/element IDs.
- [ ] Required MVP checks are covered with pass/fail tests and documented configurable thresholds.
- [ ] PDF/Illustrator inspection confirms correct physical scale, vector editability, layer names, no duplicates, and no flattening.
- [ ] Save, load, duplicate, and project JSON import/export pass round-trip tests.
- [ ] `npm run verify` remains green.

## 17. Final recommendation

Keep the current renderer/composer foundation and harden the model around it. Do not perform a full cutter rewrite. The immediate architectural move should be a versioned project envelope plus a single update/validation boundary, with adapters preserving current `FlowwrapSpec` behaviour. Once that boundary is proven by round-trip and persistence tests, migrate positional aggregate features to stable elements one family at a time.

Until Priority 0 is complete, FlowAI may interpret prompts and propose typed engine requests, but it should not directly replace specs, target elements by array index, or write SVG/UI state.
