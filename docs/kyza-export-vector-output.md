# Kyza Vector Export Output

## MVP recommendation

Use **Editable SVG** as the production cutter handoff format. Use **Illustrator-Compatible SVG** when named Illustrator/Inkscape layer metadata is helpful. Both outputs remain SVG/XML and preserve cutter geometry as vector elements.

Do not use **Preview PDF (Raster)** when editable cutter geometry is required.

## Export formats

| Format | Internal name | Geometry | Intended use |
| --- | --- | --- | --- |
| Editable SVG | `svg` | Vector | Primary editable cutter export |
| Illustrator-Compatible SVG | `ai-compatible-svg` | Vector SVG/XML | Illustrator import with named layer metadata |
| Preview PDF (Raster) | `raster-preview-pdf` | 600dpi JPEG image embedded in PDF | Visual proof or preview only |
| Vector PDF | `pdf-vector` | Not implemented | Deferred until a reliable vector-PDF dependency/path is approved |

The preview PDF renders the SVG to a canvas, creates JPEG data, and embeds one PDF image XObject. It therefore opens in Illustrator as one flat image. Its filename uses `.preview.pdf`, and the UI/code no longer describe it as production vector output.

Artwork Studio's separate **Proof PDF (Raster)** follows the same raster principle for review sheets. It is explicitly a proof workflow, not an editable cutter export.

No current dependency provides a tested true vector-PDF conversion. `pdf-vector` returns an explicit unsupported result and never silently falls back to the raster preview implementation.

## Editable SVG behavior

The central cutter export service:

- preserves physical `width` and `height` in `mm`;
- preserves the resolved export `viewBox` and cutter scale;
- preserves SVG paths, lines, rectangles, text, and groups;
- removes selection overlays, issue flashes, hit areas, handles, move/rotate controls, scripts, and `foreignObject` HTML;
- removes raster `<image>` elements unless deliberately marked `data-export-include-raster="true"`;
- preserves `data-layer-id` and assigns readable layer names such as Cutter, Seal Area, Fold Lines, Eyemarks, Safe Zones, Dimensions, and Annotations;
- records the Kyza project ID and revision on the root SVG;
- applies the same structured export validation gate to current and saved projects.

`ai-compatible-svg` adds Illustrator/Inkscape-compatible layer attributes but remains an `.svg` file. It is not native Adobe Illustrator `.ai` format.

## Adobe Illustrator verification

1. In Cutter Studio, choose **Save / Export → Export Editable SVG** or **Export Illustrator-Compatible SVG**.
2. Open the exported `.svg` in Adobe Illustrator.
3. Select the cutter line and confirm it is an individual vector path, not one placed image.
4. Confirm the document/cutter dimensions are correct in millimetres at 1:1 scale.
5. Select an eyemark and confirm it is independently editable.
6. Inspect the Layers panel and confirm cutter, seals, folds, eyemarks, safe zones, dimensions, and annotations remain separate where those groups exist in the source cutter.
7. Confirm selection handles, hover targets, warning overlays, and other Cutter Studio controls are absent.
8. Use Illustrator's Links panel or Object inspection to confirm the cutter itself is not a single embedded raster image.

## Known limitations

- Illustrator may substitute fonts that are unavailable locally; outline text only as a controlled downstream production step.
- Deliberately included artwork images remain raster objects inside the SVG.
- Layer availability follows the groups emitted by the current renderer; the export service does not invent missing geometry layers.
- Native `.ai` and true vector PDF output are not implemented.
- Final Illustrator inspection remains a manual production acceptance check.
