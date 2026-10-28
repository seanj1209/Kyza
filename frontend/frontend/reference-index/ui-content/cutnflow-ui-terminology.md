# CutNFlow UI Terminology

## Purpose

Use this reference for navigation, menus, panel headings, properties, actions, validation messages, and prototype copy. The UI should use packaging, flexo, repro, and cutter-guide language rather than generic CAD/CNC terminology.

## Preferred Terms

| Preferred term | Recommended use |
| --- | --- |
| CutNFlow Studio | Overall production workspace. |
| Pack Setup | Workflow stage for entering the pack specification. |
| Cutter Build | Workflow stage for preparing the cutter guide. |
| Artwork Check | Workflow stage for artwork overlay and checks. |
| Export | Final mock output/readiness stage. |
| Pack Generator | Module for configuring and previewing a pack. |
| Cutter Studio | Module for inspecting and editing mock cutter elements. |
| Artwork Studio | Module for mock artwork overlay and preflight. |
| Pack Spec | Group of pack dimensions, construction options, and production attributes. |
| Cutter Guide | Complete production guide represented in the studio. |
| Cutter Lines | Layer group for primary cutter contours. |
| Seal Areas | Layer group for seal regions and associated clearance. |
| Fold Lines | Layer group for folds, creases, and construction references. |
| Safe Zones | Layer group for important-content clearance. |
| Eyemarks | Individual optical register marks. |
| Slit Tolerance | Required clearance at a slit or web edge. |
| Optical Register | Broader register-mark concept. |
| Repro Check | Packaging reproduction check or status summary. |
| Preflight | Artwork checks before output. |
| Export Cutter | Mock action for preparing cutter output. |
| Send to Artwork Studio | Workflow handoff from cutter to artwork review. |
| FlowAI Beta | Label for clearly identified assistive, non-production AI features. |

## Avoid or Replace

| Avoid | Preferred replacement | Reason |
| --- | --- | --- |
| CAD Engine | CutNFlow Studio | Names the product workspace rather than a generic engine. |
| CNC Markers | Eyemarks / Optical Register | Uses flexo and packaging register language. |
| Vector Net | Cutter Validation | Describes the user-facing task. |
| Workspace Console | Studio Dock / Navigation Dock | Matches the floating production-tool navigation. |
| Device | Workspace | Avoids implying machine connectivity. |
| Tear slit | Tear Notch / Slit Feature | Distinguishes opening features from web slitting. |
| User Assets | Cutter Elements | Names the editable production objects. |
| Purge Assets | Clear Selected Elements | Makes the action specific and understandable. |
| Generic cutlines | Cutter Lines | Uses the established cutter-guide term. |
| Generic target markers | Eyemarks | Uses the established register-mark term. |

## Menu and Action Language

- Use `Pack Setup`, `Cutter Build`, `Artwork Check`, and `Export` for the workflow stages.
- Use `Projects`, `Templates`, `Pack Generator`, `Cutter Studio`, and `Artwork Studio` for destinations.
- Use `Studio Dock` for a floating module/action dock and `Navigation Dock` when it is primarily navigational.
- Use `Cutter Elements` for selectable content and label layer groups by their production names.
- Use specific actions: `Add Tear Notch`, `Add Round Hole`, `Check Safe Zones`, `Validate Cutter`.
- Use `Clear Selected Elements` only when the selection and consequence are visible; do not use vague destructive labels.
- Use `Send to Artwork Studio` and `Send to Export` for stage handoffs.

## Copy Patterns

Preferred status copy:

- `Cutter validation passed`
- `Slit tolerance needs review`
- `1 blocking error before export`
- `Artwork is clear of the seal areas`
- `Barcode placement not checked`
- `Ready to send to Artwork Studio`

Avoid copy that implies real production processing in the prototype, such as `Toolpath generated`, `Machine connected`, `RIP complete`, or `Production approved`.

## Naming Rules

- Use title case for module names and workflow stages.
- Use sentence case for helper text, warnings, and notifications.
- Use `mm` for millimetres and show values with their units.
- Use `Cutter Line` for one element and `Cutter Lines` for a group.
- Use `Eyemark` for one mark and `Eyemarks` for a group.
- Use `Warning` for reviewable conditions and `Blocking Error` when mock export readiness is prevented.
