# Kyza Element Identity — Phase 3

## Purpose

Phase 3 adds stable command targets around the existing `FlowwrapSpec` without changing the renderer contract. Future FlowAI or engine commands must address an element by a stored ID rather than a DOM ID, array position, or temporary interaction index.

The compatibility scope now covers eyemarks (Phase 3A), perf lanes (Phase 3B), and DOY/sachet tear-notch configurations (Phase 3C). Their renderers continue to consume the same legacy fields.

## Project metadata

`KyzaProjectV1.cutter.identityMap.elements` stores compatibility refs. The renderer continues to consume `cutter.legacySpec`.

Each eyemark ref records:

- a stable generated ID;
- `type: "eyemark"`;
- its legacy primary or secondary slot (`index: 0 | 1`);
- explicit `widthMm`, `heightMm`, `offsetXMm`, and `offsetYMm` values;
- active or inactive status;
- the aggregate legacy path, `cutter.legacySpec.eyeMarks`;
- `coordinateSpace: "anchor-relative-mm"`.

The index is adapter metadata, not the element identity. Commands resolve the stored ID first and then use the index only to bridge to the aggregate legacy fields.

Perf-lane refs record stable IDs, mode, `originXMm`, optional `originYMm`, and `diameterMm`. Their coordinate space is `live-area-mm`, matching the existing perf model. Explicit legacy lane objects receive an optional bridge `id`; renderers ignore it, while add/delete/move paths preserve it through their existing object copies.

Tear-notch refs are keyed by construction (`doy` or `sachet`) and record width, depth, and current legacy offsets in millimetres. Their coordinate space remains `legacy-flowwrap` because DOY and sachet placement use different pack-specific anchors. A ref identifies the configured notch feature; it does not invent separate identities for repeated/stepped rendered instances.

## Legacy eyemark mapping

| Ref | Legacy fields |
| --- | --- |
| Primary (`index: 0`) | `width`, `height`, `offsetX`, `offsetY`, `manualPositioned` |
| Secondary (`index: 1`) | `width2`, `height2`, `offsetX2`, `offsetY2`, `manualPositioned2` |

One active eyemark creates one ref. Increasing the count to two preserves the primary ID and creates or reactivates a secondary ref. Reducing the count to one preserves the secondary ref as inactive and writes its secondary dimensions and offsets back to `legacySpec`, so a later restore does not invent new values or identity.

Projects without identity metadata are normalised during creation, parsing, or storage loading. Safe repairs—missing refs, duplicate eyemark IDs, duplicate slots, and active-count mismatches—produce parse warnings. Invalid non-eyemark refs and duplicate IDs that cannot be repaired without losing unknown element identity are rejected.

## Coordinate meaning

Eyemark values are millimetres, but they are not yet canonical cutter-origin coordinates. Current offsets remain relative to renderer-calculated eyemark anchors and seal placement, so refs declare `anchor-relative-mm` rather than pretending that `offsetXMm`/`offsetYMm` are absolute positions.

A later coordinate-normalisation pass must resolve those anchors through tested pack geometry and prove renderer parity before refs can adopt `cutter-origin-mm`. Phase 3 does not change visual placement.

Perf origins remain live-area-relative, and tear-notch offsets retain their existing pack-specific edge/anchor meanings. The explicit coordinate labels prevent future commands from treating these values as interchangeable absolute positions.

## Update and persistence behaviour

The Phase 2 `updateKyzaProject()` boundary synchronises refs from every accepted legacy-spec edit and increments the project revision. `updateEyemarkById()`, `updatePerfLaneById()`, and `updateTearNotchById()` resolve stable refs, apply typed updates, synchronise the corresponding legacy fields, and then delegate to the same revision-aware service.

Read-only artboard and controls synchronisation do not regenerate IDs or increment revisions. Versioned save/load and JSON import/export parse and retain the identity map. Storage loading persists safely generated legacy refs after the first migration. Duplicated projects receive a new project ID and revision history while preserving the independent document's internal eyemark IDs.

This closes an important disappearing/reverting failure mode: one-to-two, two-to-one, unrelated dimension edits, controls remounts, and artboard switches no longer redefine an eyemark solely by its current visual index. The existing secondary legacy values remain present for renderer and control compatibility.

## Current coverage

Stable compatibility refs now exist for:

- primary eyemarks;
- secondary eyemarks, including inactive retention.
- continuous and regulated perf lanes, including inactive retention after deletion;
- DOY tear-notch configuration;
- sachet tear-notch configuration, including disabled/inactive retention.

Existing IDs inside safe-zone, fold-line, hanger-slot, window, attribute-box, half-moon, and plain-web-guide legacy collections have not yet been promoted into `identityMap`. Their current renderer behaviour is unchanged.

Still pending beyond the Phase 3 compatibility scope:

- canonical cutter-origin conversion for anchor-relative eyemarks, live-area-relative perf lanes, and pack-relative tear notches;
- promotion of existing safe-zone, fold-line, hanger-slot, window, attribute-box, half-moon, and plain-web-guide IDs into the shared identity map;
- stable identity for independently addressable seals or gusset features if future commands require them.

## Phase 4 boundary

Phase 4 will add structured validation codes and element references, make Studio issues/export readiness consume those results directly, and converge export paths. This Phase 3 metadata does not change validation rules, SVG output, export behaviour, the Cutter Studio shell, or enable FlowAI mutation.
