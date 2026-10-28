# Gemini App Builder Copy/Paste Prompt

Copy everything inside the block below into Gemini App Builder.

```text
Create or refine the CutNFlow UI prototype using CutNFlow-specific packaging production language.

CutNFlow is a packaging cutter, pack generator, and artwork/preflight platform. The UI must feel like a premium packaging production tool for flexo, repro, cutter-guide, and preflight workflows—not generic CAD or CNC software.

Use these workflow stages:
- Pack Setup
- Cutter Build
- Artwork Check
- Export

Use these module and product names:
- CutNFlow Studio
- Pack Generator
- Cutter Studio
- Artwork Studio
- Pack Spec
- Cutter Guide
- FlowAI Beta

Use packaging-specific properties and layers where relevant, including Pack Type, Width, Height, Flat Size, Repeat Length, Web Width, Substrate, Seal Areas, Cutter Lines, Fold Lines, Safe Zones, Bleed / Buffer, Eyemarks, Slit Tolerance, Perfs, Regulated Perfs, Round Holes, Hanger Slots, Tear Notches, Barcode / QR Placeholders, Dimensions, Scale, and Units.

For Pack Generator controls, use Pack Type, Product Format, Width, Height, Top Seal, Bottom Seal, Side Seals, Gusset, Zip, Tear Notch, Eyemark Count, Hanger Slot, Safe Zones, Substrate Type, Orientation, and Export Intent.

Use packaging-specific actions from the cutter attributes/functions catalogue, including Add Eyemark, Fix Slit Tolerance, Add Safe Zone, Add Fold Line, Add Perf, Add Round Hole, Add Hanger Slot, Add Tear Notch, Add Dummy Barcode, Toggle Layer, Validate Cutter, Export PDF, and Send to Artwork Studio. In Artwork Studio, use Import Artwork, Overlay Cutter, Check Safe Zones, Check Barcode, Check White Plate, Check Overprint, Check Fingerprint/Profile, Check Approval Status, Validate Artwork, and Send to Export.

Use validation concepts such as Closed Cutter Contour, Cutter Line Present, Fold Line Alignment, Eyemark Position, Slit Tolerance, Safe Zone Clearance, Seal Area Clearance, Perf Placement, Hanger Slot Clearance, Barcode Placement, Export Readiness, Warnings, and Blocking Errors.

Remove or replace generic terms:
- CAD Engine → CutNFlow Studio
- CNC Markers → Eyemarks / Optical Register
- Vector Net → Cutter Validation
- Workspace Console → Studio Dock / Navigation Dock
- Device → Workspace
- Tear slit → Tear Notch / Slit Feature
- User Assets → Cutter Elements
- Purge Assets → Clear Selected Elements
- Generic cutlines → Cutter Lines
- Generic target markers → Eyemarks

Keep the existing floating dock UI and overall prototype shell. Keep the interface technical, clean, precise, production-focused, modern, and workflow-driven. Use millimetres by default and show units beside dimensional values.

All actions and statuses must remain mock-only. They may update visible prototype state, selections, badges, panels, and notifications, but they must not create real pack-generation logic, cutter geometry, validation-engine logic, artwork processing, PDF production, API calls, authentication, billing, subscriptions, databases, or backend integrations. Do not replace the current MVP shell and do not imply that a mock result is production-approved.

Use the supplied cutter-guide attributes/functions catalogue and cutter-studio mock JSON as the source for UI labels, menus, properties, layers, available actions, and validation states.
```
