# Kyza Validation and Export — Phase 4

## Scope

Phase 4 introduces structured cutter validation and a vector-safe SVG export boundary while preserving the current renderer/composer and Cutter Studio shell. It does not add FlowAI mutation, replace `FlowwrapSpec`, or claim native Illustrator/PDF support that the current dependency stack cannot provide.

## Structured validation contract

The contract lives in `packages/cutter-engine/validation` and returns:

```ts
type ValidationResult = {
  projectId: string;
  revision: string;
  valid: boolean;
  messages: Array<{
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
    elementIds: string[];
    packType?: string;
    fieldPath?: string;
    fixable?: boolean;
    suggestedFixId?: string;
  }>;
};
```

`validateKyzaProject()` parses the Phase 1 envelope, reads `cutter.legacySpec`, runs the existing pack validator, and adds stable-code checks. Existing validators remain in place; legacy messages are adapted as `PACK_VALIDATION_ERROR` or `PACK_VALIDATION_WARNING` rather than scraped back out of rendered SVG.

Stable codes use uppercase domain names, for example `EYEMARK_COUNT_UNSUPPORTED`, `SAFE_ZONE_OUTSIDE_LIVE_AREA`, and `ELEMENT_ID_DUPLICATE`. Phase 3 IDs are attached for eyemarks and tear notches. Existing safe-zone and fold-line IDs are attached directly. `fieldPath` is used when no element identity exists.

## MVP checks covered

- Positive cutter dimensions and possible seal/live-area geometry.
- Non-negative seal dimensions.
- Eyemark count, positive per-mark size, seal/track fit, and the existing configurable 1.5mm cutter-edge clearance.
- Non-negative bleed, bleed fitting within the live area, and a warning when `spec.bleed` differs from the renderer's fixed `INTERNAL_BLEED_MM`.
- Safe-zone positive dimensions, live-area bounds, rotation-aware bounds, and existing seal/bleed clearance.
- DOY and sachet tear-notch positive size and non-negative legacy offsets.
- Vertical fold offsets within live width and a warning that horizontal offsets are currently rendered at centre.
- Missing, duplicate, or mismatched critical element identity metadata.
- Existing pack-specific validators, retained through the adapter.

No new production tear-notch clearance, machine allowance, or MD eyemark threshold was invented. Those remain configurable/TBD until an approved packaging rule exists.

## Studio issues

The existing issue panel now prefers:

```text
active KyzaProjectV1
  → validateKyzaProject(project)
  → ValidationResult.messages
  → existing IssueEntry layout
```

SVG `data-error` and `data-warning` attributes remain available for renderer highlighting and as a fallback when no active versioned project exists. They are no longer the preferred issue-list source.

### Active UI and Engine API wiring

The Cutter Studio issue panel now uses `getStructuredValidationState(project)` whenever an active `KyzaProjectV1` exists. The presentation adapter preserves each structured code and severity, so warning rows are labelled `Warning` and are not presented as errors. SVG `data-error` / `data-warning` parsing is isolated to `svg-fallback` state when no versioned project is available and never controls export readiness.

The start-project Pack Generator bridge also validates its generated default project through `validateKyzaProject()`. It no longer calls `packModule.validate()` and wraps every returned string as `PACK_VALIDATION_ERROR`. Consequently, the generic `Seal clearance must be at least 5mm.` fallback is returned as `SEAL_CLEARANCE_UNRESOLVED` with warning severity for affected defaults.

Development wiring diagnostics log `[Kyza][Validation Wiring]` with:

- issue-panel source (`structured` or `svg-fallback`);
- export-gate source (`structured`);
- validation code, severity, message, and pack type;
- `blocksExport`, which is true only for structured export errors.

## Export readiness

`validateForExport()`, `canExportProject()`, and `getExportBlockingReasons()` form the export gate. Schema errors, invalid dimensions, impossible live areas, unsupported eyemark counts, duplicate identities, and missing critical identity metadata block export. Warnings do not block unless export safety requires upgrading them, as with missing critical IDs.

Saved-project and current-project PDF/Illustrator actions now pass the readiness gate. Both Illustrator actions use the shared vector-safe service.

## Eyemark validation and export severity

Eyemark validation resolves the actual mark rectangle with the same legacy placement geometry used by the current FlowwrapSpec renderer path. Phase 3 eyemark refs supply stable `elementIds`; validation reads those IDs and does not regenerate them.

Blocking eyemark codes are limited to definite failures:

- `EYEMARK_COUNT_UNSUPPORTED` — the mark count is not supported.
- `EYEMARK_SIZE_INVALID` — a resolved width or height is not positive.
- `EYEMARK_OUTSIDE_CUTTER` — the resolved mark rectangle is outside cutter bounds.
- `EYEMARK_ALLOWED_ZONE_VIOLATION` — the mark is definitely outside a known mandatory seal/track zone.
- Critical identity errors such as `ELEMENT_ID_DUPLICATE` and export-upgraded `ELEMENT_ID_MISSING` remain blocking.

`flowwrap`, `pillow-pack`, and `paper-strip` currently expose seal rectangles that can be used as known eyemark allowed zones for edge/track positions. A single centred mark has no explicit track contract and returns `EYEMARK_ALLOWED_ZONE_UNRESOLVED`. DOY and K-seal also return that warning when the renderer-resolved mark is otherwise inside the cutter. Sachet, plain-web, and future constructions without renderer-parity position geometry return `EYEMARK_POSITION_UNRESOLVED`. These warnings replace the former global `EYEMARK_OUTSIDE_SEAL` error, which incorrectly tested centred DOY and K-seal marks against a generic top-seal rectangle.

Unresolved or legacy coordinate semantics must not block export because they do not prove unsafe geometry. `getValidationDebugSnapshot()` exposes the pack type, codes, severity, stable IDs, field path, count, resolved mark size/position, seal zones, allowed zone, and whether the decision is definite.

## Seal and live-area validation

Resolved cutter bounds, rectangular seal zones, and live area come from `resolveFlowwrapGeometry()`, the geometry basis used by the current composers. Definite failures remain blocking:

- `SEAL_INVALID_DIMENSION` — a required seal is not positive or a seal value is non-finite/negative.
- `SEAL_LIVE_AREA_IMPOSSIBLE` — seals consume the available width or height.
- `SAFE_ZONE_SEAL_OVERLAP` — a safe zone definitely violates the known seal/bleed boundary.
- `CUTTER_DIMENSIONS_INVALID`, `BLEED_NEGATIVE`, and `BLEED_OUTSIDE_LIVE_AREA` retain their blocking behaviour.

The following are warning-only:

- `SEAL_CLEARANCE_UNRESOLVED` — a generic legacy minimum-clearance threshold is not backed by a pack-specific resolved violation.
- `SEAL_GEOMETRY_UNRESOLVED` — the pack type does not expose a supported seal-geometry contract.
- `BLEED_RENDERER_VALUE_MISMATCH` — `spec.bleed` differs from fixed `INTERNAL_BLEED_MM` but does not make geometry impossible.

The former generic `PACK_VALIDATION_ERROR` message `Seal clearance must be at least 5mm.` blocked valid pillow and DOY defaults. It is now adapted to `SEAL_CLEARANCE_UNRESOLVED` and cannot block export. Exact production clearance values remain configurable/TBD unless an approved pack-specific rule and geometry contract make a violation definite; the export gate is not disabled and impossible geometry still fails.

`getValidationDebugSnapshot()` also returns raw seal values, cutter bounds, resolved seal zones/live area/inner boundary, bleed, checked safe-zone IDs, whether geometry is definite, and whether seal validation blocks export.

## Export service and formats

`packages/cutter-engine/export/cutterExportService.ts` owns the new shared contract:

- `svg` — vector SVG with physical `mm` dimensions, project/revision metadata, and preserved groups;
- `ai-compatible-svg` — the same SVG/XML contract with Illustrator/Inkscape-compatible layer metadata where the DOM source provides layers;
- `pdf-vector` — explicitly returns an unsupported error.

The service never silently rasterises `pdf-vector`. It can return a validation report containing project identity, revision, export time, messages, and blocking state.

The saved-project Illustrator action now downloads `.illustrator.svg` with MIME type `image/svg+xml`. This is not native Adobe Illustrator `.ai` or PostScript.

## Remaining legacy export paths

- Saved-project PDF still uses the existing 600dpi JPEG-in-PDF implementation after structured readiness validation. It is raster and not editable cutter geometry.
- Current-project PDF remains the legacy raster implementation. Current and saved Illustrator actions now share the honest `ai-compatible-svg` serializer.
- Artwork proof PDF remains separate because it is an A4 proof workflow, not cutter repro export.

Converging the current-project buttons and implementing a genuine vector PDF writer requires a dedicated follow-up with parity testing. Phase 4 keeps those buttons operational rather than replacing them with incomplete output.

## Before FlowAI mutation

FlowAI must still wait for:

- approved/configurable production rules for remaining validation gaps;
- current-project export convergence and genuine vector PDF support where required;
- structured command schemas with revision checks and pre/post validation;
- canonical cutter-origin coordinates for features still using anchor/live/legacy spaces;
- regression evidence that all command-targeted feature families have stable identity.
