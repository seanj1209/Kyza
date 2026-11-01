# Kyza text-direction reference

Implementation reference for the wind-direction chart supplied in Amends v4.pdf.
This records the user's chart convention, not a separate manufacturing standard.

## Cutter Studio front-print directions

| Code | Reading orientation on the flat guide | SVG rotation |
| --- | --- | --- |
| 1 | Upright | 0 degrees |
| 2 | Upside down | 180 degrees |
| 3 | Reads upwards | 270 degrees |
| 4 | Reads downwards | 90 degrees |

Both the ABC menu symbol and the two-line "Text Reads / This Way" label follow
these orientations. The label has no arrow. The technical green and 40% default
opacity remain separate from Kyza's brand colours.

Selecting a PIFA code changes rotation only. It must not resize or reposition
the user's label. Existing stored rotations are preserved, not automatically
migrated: select the required PIFA code to apply this chart convention.

## Future Artwork Studio reverse print

The supplied chart also includes reverse-print counterparts 5-8 for front-print
directions 1-4. The amendment specifically calls out 5-6 for future memory.
Retain the full chart context when Artwork Studio is implemented. These are not
currently selectable Cutter Studio codes. Do not infer mirroring, side-of-film,
or print/export transformations from a rotation alone; implement those only
with an approved artwork contract and the supplied chart as a reference.

## Place and grid boundaries

Place is an explicit engine-owned resize/reposition action within a closed,
straight-sided seal/fold panel. It prefers clear space above a BBE within that
panel, uses a modest capped target size, and scales down to available space.
Repeated Place is stable. Safe zones are content regions, not solid obstacles;
BBEs, other attributes, windows and eyemarks remain obstacles. Curved DOY and
K-seal placement retains its existing unsupported explanation.

The DPI grid is presentation-only: 150, 200, 300 and 600 DPI reference tiers
(Amends v10, commit 19a5571, supersedes the original 80–300 tiers).
At wide views, multiple physical cells share a displayed line to avoid subpixel
aliasing; the legend states that stride. It neither changes nor verifies actual
artwork resolution and is excluded from exports.
