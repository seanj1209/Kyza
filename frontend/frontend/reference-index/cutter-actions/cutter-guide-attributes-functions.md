# Cutter Guide Attributes and Mock Functions

## Purpose

This catalogue gives Gemini App Builder packaging-specific attributes and UI actions for a CutNFlow prototype. Every function below is mock-only: it may change local prototype state or show feedback, but it must not implement cutter geometry, pack generation, artwork processing, or production validation.

## A. Base Cutter Attributes

| Attribute | Mock UI meaning |
| --- | --- |
| Pack Type | Packaging construction, such as DOY pouch, pillow pack, flow wrap, K-seal, or 3-side-seal sachet. |
| Width | Finished pack width. Display in the selected units. |
| Height | Finished pack height. Display in the selected units. |
| Flat Size | Overall flat cutter-guide dimensions. |
| Repeat Length | Machine-direction repeat represented by the mock pack specification. |
| Web Width | Total transverse web width represented by the mock cutter guide. |
| Substrate | Selected packaging material or film construction label. |
| Seal Areas | Non-printing or clearance regions reserved for package seals. |
| Cutter Line | Primary cutter contour shown as a named production layer. |
| Fold Lines | Crease, fold, or construction references distinct from the cutter line. |
| Safe Zones | Artwork-clearance regions for important content. |
| Bleed / Buffer | Artwork extension or working clearance outside a defined boundary. |
| Eyemarks | Optical register marks, including count, size, and position. |
| Slit Tolerance | Clearance between an eyemark or critical feature and the slit/web edge. |
| Perfs | Standard perforation features. |
| Regulated Perfs | Perforation features identified as requiring regulated or controlled treatment. |
| Round Holes | Circular die-cut or punch features. |
| Hanger Slots | Retail hanging features, such as a euro slot. |
| Tear Notches | Defined package-opening notch features. |
| Barcodes / QR Placeholders | Non-live placement boxes for code position and clearance checks. |
| Dimensions | Visible measurements and dimension annotations. |
| Scale | Display or export scale label, for example `1:1`. |
| Units | Measurement units; use `mm` by default. |

Seal areas, safe zones, zipper areas, and tear-notch areas should read as production constraints, not decorative overlays. Important artwork should be represented as clear of those regions where applicable.

## B. Pack Generator Attributes

| Attribute | Mock UI meaning |
| --- | --- |
| Pack Type | Selected packaging construction. |
| Product Format | Intended product or fill-format label used to contextualise the mock setup. |
| Width | Finished pack width. |
| Height | Finished pack height. |
| Top Seal | Top seal depth or enabled state. |
| Bottom Seal | Bottom seal depth or enabled state. |
| Side Seals | Side seal depth or enabled state. |
| Gusset | Gusset type, depth, or enabled state where applicable. |
| Zip | Zipper type, position, or enabled state where applicable. |
| Tear Notch | Tear-notch type, side, position, or enabled state. |
| Eyemark Count | Number of optical register eyemarks represented by the mock. |
| Hanger Slot | Hanger-slot type, position, or enabled state. |
| Safe Zones | Safe-zone preset or clearance summary. |
| Substrate Type | Material or film construction label. |
| Orientation | Portrait/landscape or web/repeat orientation label. |
| Export Intent | Intended mock handoff, such as cutter PDF, artwork setup, or review proof. |

These controls collect and display a `Pack Spec`; they do not calculate real cutter geometry.

## C. Cutter Studio Mock Functions

| Mock function | Prototype behaviour |
| --- | --- |
| Add 1 Eyemark | Set the visible mock eyemark count to one and update the layer summary. |
| Add 2 Eyemarks | Set the visible mock eyemark count to two without implying engine-owned geometry. |
| Remove Eyemark | Remove the selected mock eyemark after a simple confirmation. |
| Reduce Eyemark Size | Change the displayed eyemark dimensions and show a mock status message. |
| Increase Eyemark Width | Increase the displayed width value for the selected mock eyemark. |
| Move Eyemark Inward | Update a mock position label and clearance status. |
| Move Eyemark Outward | Update a mock position label and clearance status. |
| Fix Slit Tolerance | Show a proposed mock clearance adjustment; do not calculate or mutate real geometry. |
| Add Safe Zone | Add a named safe-zone item to the mock layer group. |
| Add Fold Line | Add a named fold-line item to the mock layer group. |
| Add Perf | Add a standard perf item to the mock layer group. |
| Add Regulated Perf | Add a regulated-perf item with a visible status badge. |
| Add Round Hole | Add a round-hole item with mock diameter and position properties. |
| Add Hanger Slot | Add a hanger-slot item with mock type and clearance properties. |
| Add Tear Notch | Add a tear-notch item with mock side and position properties. |
| Add Dummy Barcode | Add a non-scannable barcode placeholder for placement checking. |
| Toggle Layer | Switch a mock layer group's visibility state. |
| Hide / Unhide Element | Change the selected element's mock visibility state. |
| Lock / Unlock Element | Change the selected element's mock editability state. |
| Select Element | Focus an element and populate the mock properties panel. |
| Delete Element | Remove a selected mock element after confirmation. |
| Validate Cutter | Display predefined warning, blocking-error, and pass statuses only. |
| Export PDF | Show a mock export summary or completion notification; create no production PDF. |
| Send to Artwork Studio | Advance the visible workflow stage with the same mock project context. |

## D. Artwork Studio Mock Functions

| Mock function | Prototype behaviour |
| --- | --- |
| Import Artwork | Display a mock artwork filename and preview state; upload or parse nothing. |
| Overlay Cutter | Toggle the mock cutter-guide overlay above the artwork preview. |
| Check Safe Zones | Display predefined safe-zone results. |
| Check Barcode | Display mock barcode placement and clearance results; do not verify scan quality. |
| Check White Plate | Display a predefined white-plate status. |
| Check Overprint | Display a predefined overprint status. |
| Check Fingerprint/Profile | Compare labels in mock data and display a predefined result. |
| Check Approval Status | Display the current mock approval stage and reviewer status. |
| Validate Artwork | Summarise predefined repro/preflight statuses only. |
| Send to Export | Advance the visible workflow to a mock export-readiness view. |

## E. Validation Concepts

| Concept | Mock status to communicate |
| --- | --- |
| Closed Cutter Contour | Whether the cutter contour is represented as closed. |
| Cutter Line Present | Whether the required cutter-line layer is represented. |
| Fold Line Alignment | Whether fold-line positioning is shown as acceptable. |
| Eyemark Position | Whether eyemark placement is shown as acceptable. |
| Slit Tolerance | Whether represented edge clearance meets the mock status. |
| Safe Zone Clearance | Whether important artwork is represented as clear of safe-zone boundaries. |
| Seal Area Clearance | Whether important artwork is represented as clear of seal areas. |
| Perf Placement | Whether perf placement is shown as acceptable. |
| Hanger Slot Clearance | Whether the slot and surrounding important content are shown as clear. |
| Barcode Placement | Whether the barcode placeholder is shown in an acceptable area. |
| Export Readiness | Summary of predefined checks before the mock export stage. |
| Warnings | Non-blocking items that need review. |
| Blocking Errors | Items represented as preventing mock export readiness. |

Use clear states such as `Pass`, `Warning`, `Blocking Error`, and `Not Checked`. Actual thresholds, geometry decisions, and final validation outcomes remain engine-owned and must not be invented by the prototype.
