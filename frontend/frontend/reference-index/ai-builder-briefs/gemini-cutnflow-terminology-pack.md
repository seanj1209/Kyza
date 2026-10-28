# Gemini CutNFlow Terminology Pack

## Purpose

Use this language guide when generating a CutNFlow UI prototype in Gemini App Builder. CutNFlow is a packaging cutter, pack generator, and artwork/preflight platform for packaging production workflows.

The interface should sound like it belongs in a flexographic print, repro, and cutter-guide environment. It should feel like a premium packaging production tool, not generic CAD or CNC software.

## Language Style

- Use concise, production-focused labels.
- Prefer packaging, flexo, repro, cutter-guide, and preflight language.
- Name the workflow stage or production object directly: `Pack Setup`, `Cutter Guide`, `Seal Areas`, `Artwork Check`, `Preflight`.
- Use millimetres (`mm`) as the default display unit unless mock project data specifies another unit.
- Describe a check as a `Warning` when work may continue and a `Blocking Error` when export readiness is prevented.
- Keep buttons action-led: `Add Eyemark`, `Validate Cutter`, `Send to Artwork Studio`.
- Refer to editable cutter features as `Cutter Elements`, not assets, devices, or machine parts.
- Use `Optical Register` as the broader production concept and `Eyemark` for an individual register mark.

## Product and Workflow Language

Use these product areas consistently:

1. `Pack Generator` — configure the pack specification and create a mock cutter-guide preview.
2. `Cutter Studio` — inspect cutter elements, layers, dimensions, clearances, and validation status.
3. `Artwork Studio` — overlay artwork, run repro/preflight checks, and review approval status.
4. `Export` — review export readiness and present mock cutter or artwork output actions.

Use `CutNFlow Studio` for the overall working environment. A typical workflow is `Pack Setup → Cutter Build → Artwork Check → Export`.

## Cutter-Guide Vocabulary

Prefer the following terms in properties, layers, validation messages, and mock actions:

- Pack Spec
- Cutter Guide
- Cutter Line
- Fold Line
- Seal Area
- Safe Zone
- Bleed / Buffer
- Eyemark
- Slit Tolerance
- Perf / Regulated Perf
- Round Hole
- Hanger Slot
- Tear Notch
- Barcode / QR Placeholder
- Flat Size
- Repeat Length
- Web Width
- Substrate
- Scale and Units

Use plural forms for layer groups (`Cutter Lines`, `Fold Lines`, `Seal Areas`) and singular forms for a selected element (`Cutter Line`, `Fold Line`, `Seal Area`).

## Repro and Artwork Vocabulary

Prefer:

- Artwork Overlay
- Safe Zone Check
- Barcode Check
- White Plate Check
- Overprint Check
- Fingerprint / Profile Check
- Approval Status
- Repro Check
- Preflight
- Export Readiness

Do not imply that the prototype performs colour separation, trapping, RIP processing, cutter geometry changes, or production validation. These are mock controls and statuses only.

## Avoid Generic CAD/CNC Language

Do not use generic labels such as:

- CAD Engine
- CNC Markers
- Vector Net
- Workspace Console
- Device
- User Assets
- Purge Assets
- generic cutlines
- generic target markers

Replace them with CutNFlow terms:

| Avoid | Use |
| --- | --- |
| CAD Engine | CutNFlow Studio |
| CNC Markers | Eyemarks / Optical Register |
| Vector Net | Cutter Validation |
| Workspace Console | Studio Dock / Navigation Dock |
| Device | Workspace |
| Tear slit | Tear Notch / Slit Feature |
| User Assets | Cutter Elements |
| Purge Assets | Clear Selected Elements |
| Generic cutlines | Cutter Lines |
| Generic target markers | Eyemarks |

## Prototype Boundaries

- Keep the existing floating dock UI direction.
- Use only mock project data and mock interactions.
- Actions may update visible prototype state, selections, badges, or notifications only.
- Do not create pack-generation, cutter-geometry, validation-engine, or artwork-engine logic.
- Do not present mock validation as a production decision.
- Do not add API calls, authentication, billing, subscriptions, databases, or backend services.
- Do not replace or modify the current CutNFlow MVP shell.

Use the companion cutter attributes/functions catalogue and UI terminology reference as the source for labels, panels, menus, actions, layers, and validation states.
