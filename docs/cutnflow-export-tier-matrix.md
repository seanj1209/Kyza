# CutNFlow Export Tier Matrix

This matrix separates review output from editable production candidates and future repro handoff products. It describes export products only; pricing, payment and entitlement logic are not implemented here.

## Export tiers

| Tier | Current output | Editable vector | Production ready | Availability | Business mapping |
| --- | --- | --- | --- | --- | --- |
| PDF Proof | Flattened raster PDF proof | No | No | Available | Review/proof output suitable for a basic tier |
| AI Ready File | Editable SVG, including the Illustrator-compatible SVG variant | Yes | Yes, as a production cutter candidate subject to validation and repro approval | Available | Premium editable-file output |
| GMG/Repro Ready Pack | Planned handoff package | Planned | Not yet | Coming soon/disabled | Future premium repro handoff tier |

## PDF Proof

PDF Proof uses the current raster preview path. It is for review, approval and visual reference only. It is not an editable vector cutter file and must not be represented as production ready.

The internal format name is `raster-preview-pdf`. PDF remains raster unless and until CutNFlow implements and verifies a true vector PDF export path.

## AI Ready File

AI Ready File produces editable SVG geometry that opens in Adobe Illustrator. Both current SVG variants remain available:

- `svg` for the standard editable SVG export;
- `ai-compatible-svg` for the Illustrator-compatible editable SVG export.

The user-facing tier name does not imply native Adobe Illustrator `.ai` output. Internal code and documentation must use “Illustrator-compatible SVG” or “Illustrator-ready SVG”. The export preserves millimetre dimensions, vector paths and cutter groups/layers and does not rasterise cutter geometry.

## GMG/Repro Ready Pack

GMG/Repro Ready Pack is a future premium output and is currently disabled. A future implementation may package:

- cutter geometry;
- proof output;
- validation report;
- artwork and specification metadata;
- colour and profile notes.

CutNFlow does not currently generate a GMG proof, and the tier must not suggest that it does. Availability should only be enabled after the complete handoff package and its validation are implemented.

## Export metadata

Where the output format permits, exports carry:

- project name;
- pack type;
- dimensions in millimetres;
- export tier ID;
- export format;
- creation date and time;
- validation status;
- warning count;
- error count.

SVG stores this metadata in its document metadata and root attributes. PDF Proof stores simple identifying metadata in the PDF information dictionary. Validation reports include the same export metadata.

## Pricing and entitlement direction

The tier IDs provide stable business-product boundaries without implementing billing:

- `pdf-proof` can map to a proof/review entitlement;
- `illustrator-ready` can map to an editable production-file entitlement;
- `repro-ready-pack` can map to a future premium repro entitlement.

Pricing, subscriptions and payment services remain outside this change. Product availability should be controlled through the tier contract rather than inferred from button text.

## Manual Adobe Illustrator check

For both the standard SVG and Illustrator-compatible SVG exports:

1. Export a cutter with known millimetre dimensions.
2. Open the file directly in Adobe Illustrator.
3. Confirm the artboard/document scale matches the expected millimetre dimensions.
4. Confirm cutter geometry is selectable as vector paths, not a placed bitmap.
5. Confirm cutter groups/layers remain independently selectable.
6. Confirm technical cutter colours and line roles remain distinguishable.
7. Confirm no Cutter Studio UI or preview-only raster content appears.
8. Save a copy from Illustrator without changing the original exported SVG.

For PDF Proof, confirm it is visibly labelled as a proof/preview and do not use it as the production cutter source.
