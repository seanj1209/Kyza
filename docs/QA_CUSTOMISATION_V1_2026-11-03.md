# QA review: PDF v1 and element customisation

Branch: `feat/pdf-qa-amends`, extending the earlier unmerged QA amendments. Main, Beta, flagship and ArtworkSandbox are outside this change. Owner acceptance is pending.

Sources: `AMENDS - KYZA v1.0.pdf` (three annotated pages) and the supplied Element Customisation, Typography & Inline Text Editing brief.

## Result

- Fold Lines now expands compact Vertical/Horizontal add choices in Elements. Each choice adds another line; the floating fold popup is removed. Existing canvas dragging still controls position.
- Strip Film/Laminate omits the duplicate overall top width for one cutter. Two or more cutters retain the full stepped width, including gaps, above each cutter's width.
- K Seal retains the correct pack-height spans and adds the joined central gusset span (40 mm input gives 80 mm). Top labels are centred on their measurement lines. The previous inherited 190/100 mm row remains excluded.
- Flow artwork blends into the existing studio theme; Help Me Choose uses a smaller logo. Plain Film no longer draws the default dashed inset illustration.
- The Flow status is Ready/green, Advisory/yellow, Warning/orange or Critical/red, with highest severity taking precedence. The expansion is called Cutter checks, omits pass counts and manual rerun, and shows “No foreseen issues detected” for a clear result. Checks continue to refresh through the existing project/render validation workflow.
- Customise > Elements follows an individually selected object. Fill and stroke each have independent colour, opacity and enable state; stroke also has millimetre thickness and solid/dashed/dotted styles. Group-level styling remains available when no individual object is selected.
- BBE heading and date/placeholder, QR caption, barcode caption and labels have associated text settings: content, visibility, font, regular/bold weight, point size, colour, opacity, alignment and relative X/Y position. Existing BBE projects keep their original heading-only appearance until the date component is enabled.
- Double-click associated text to edit it at its parent position and rotation. Enter or clicking outside commits; Escape cancels. A single text click selects its parent/text controls. Editing does not detach text from the parent.
- Custom Label creates visible `Type here...` text with no fill or border and opens inline editing. Its existing parent selection, move, rotate and resize handles remain available.
- Automatic text size follows parent resizing. Only changing the point-size control sets fixed size, independently per component. Reset to Auto Scaling restores the reference scaling. Selecting an object or changing wording, family, colour or weight does not fix its size.
- Appearance, typography and scaling references remain in the existing saved specification and survive the existing JSON project round trip. Older projects require no destructive migration.

## Fonts and exports

The ten requested source families are bundled locally at regular (400) and bold (700), grouped in the existing menu. Webfonts load only when used. SVG glyph data loads only when an Illustrator-compatible export needs it. No runtime Google Fonts service is required.

OFL notices and copyright information accompany every family. `public/fonts/manifest.json` records source URLs and original SHA-256 hashes. Derived static assets have distinct internal KyzaStudio names; the menu identifies the source design families. The reproducible vendor script is `scripts/build-kyza-font-library.py` (Python fontTools and Brotli required only to rebuild font assets).

Editable SVG embeds the selected fonts and preserves text. Illustrator-compatible SVG converts library text to vector outlines using the same font data and browser text positions. It does not rasterise cutter geometry. PDF remains the existing raster proof. A pending inline edit must be confirmed or cancelled before export; font-load failures stop export rather than silently substituting a chosen library font.

## Key files

- `frontend/frontend/apps/web/src/ui/selectedObjectCustomise.ts`: existing-panel selected-object controls.
- `frontend/frontend/apps/web/src/ui/inlineElementText.ts`: transformed inline input and commit/cancel lifecycle.
- `frontend/frontend/apps/web/src/renderers/attributeText.ts`, `objectAppearance.ts`: shared text and independent appearance rendering.
- `frontend/frontend/apps/web/src/typography/fontLibrary.ts`: lazy font loading, embedded SVG fonts and outlined export.
- Existing controls, selection transforms, attribute interactions, pack render wrapper, project export service and Flow dock integrate these behaviours.
- `frontend/frontend/e2e/element-customisation-v1.spec.ts`: focused browser coverage, including real studio insertion and visual SVG/outline comparison.

## Verification

- Production build and generated route outputs pass.
- Ten focused Chromium scenarios pass: independent appearance, BBE text and JSON round trip; inline commit/cancel; independent fixed/auto scaling with parent transforms; all ten font families at both weights, editable SVG embedding, Illustrator vector outlines, pixel comparison and raster PDF generation; PDF measurements/statuses; actual Custom Label insertion; fold dropdown/group restoration; Plain Film compatible elements and eyemark dragging.
- All 23 layout fixtures pass. Only the three K Seal snapshots change, each adding the requested central gusset measurement; geometry stays unchanged.
- Strip normal/Pre-Slit SVG, Illustrator SVG and PDF tests and the K Seal callout fixtures pass.
- Existing constraints, selection transforms, project contract/update/continuity, identity, validation/export, Pack Generator interpretation and 39-case benchmark, dashboard/new-project/open/creation, Beta validation, eyemark refinement, v6.1/v8.2/v8.3/v10/v11/v12, pre-export review, export service and shell checks pass. Historical assertions for the superseded fold warning, old logo, fold-centre behaviour and single-strip duplicate measure were updated to the approved behaviour.
- The full verify command still stops at `test:packgen-project`: Plain Film safe-zone/seal-clearance expectation. The exact same failure was reproduced on the unchanged starting commit `f020aa8`. It is outside these amendments.
- Full application TypeScript checking reports the same 31 diagnostics on the starting commit and this implementation, with no new diagnostic messages. The targeted test compilation and production build pass.

## Limits and owner review

Barcode and QR objects remain the application's existing placement guides; this change customises associated captions. It adds no encoded symbol generator, GS1 certification or scan verification. No barcode payload or required human-readable data is edited by the caption controls.

The initial library exposes regular/bold upright faces and single-line text. Unsupported glyphs must use a suitable font; Illustrator outline export reports a missing glyph rather than substituting it. Native `.ai`, vector PDF and Artwork Studio remain outside the existing supported outputs. Illustrator output contains outlined library text; retain the project or editable SVG to edit wording later.

Owner real-job review and physical print/export QC remain outstanding. Check BBE heading/date independently, a custom label through resize/save/reopen, representative pack exports, both UI themes and the revised K Seal/strip measurements. The unrelated baseline Pack Generator and type-check issues should be tracked separately before a broader release decision.
