# RULES_AND_CONSTRAINTS

Phase 1 scope: cutter guides for flexible packaging.

Core rule: all values must be config-driven. Do not hardcode manufacturing values inside pack modules.

## Seals

What the rule does:
- reserves seal zones and keeps incompatible features out of them

Inputs:
- pack dimensions
- seal locations
- seal widths
- configurable seal exclusions in `mm`

Outputs:
- seal-zone boundaries
- exclusion regions
- usable area reductions

Must never happen:
- important content inside seal zones
- tear, slot, or die-cut features colliding with required seals

Placeholder values:
- default seal exclusion: `{x} mm` (configurable)

## Safe Zones

What the rule does:
- derives the area where important content can safely exist

Inputs:
- trim boundary
- bleed
- seal exclusions
- zipper, notch, and die-cut exclusions

Outputs:
- safe-zone geometry
- live-area geometry
- reduced live width and live height where applicable

Must never happen:
- safe zone extending into trim loss, seal, zipper, or cut-feature exclusions

Placeholder values:
- default artwork inset: `{x} mm` (configurable)

## Gussets

What the rule does:
- defines fold/gusset lines and any keep-clear behavior tied to those folds

Inputs:
- gusset type
- gusset depth
- fold positions
- pack geometry

Outputs:
- gusset-line positions
- fold references
- any derived restriction bands if configured

Must never happen:
- gusset lines drifting from actual panel geometry
- shared gusset logic being duplicated across pack modules without need

Placeholder values:
- default gusset keep-clear: `{x} mm` (configurable if needed)

## Zippers

What the rule does:
- places zipper-related constraints and keeps nearby features clear of the zipper flange

Inputs:
- zipper enabled state
- zipper position
- zipper flange depth
- configurable zipper clearance in `mm`

Outputs:
- zipper flange region
- zipper keep-clear region
- reduced usable area near the top structure

Must never happen:
- tear notches, die-cuts, or important content overlapping zipper flange clearances

Placeholder values:
- default zipper flange clear: `{x} mm` (configurable)

## Tear Notches

What the rule does:
- places tear notches and reserves clearance around them

Inputs:
- tear-notch position
- notch size
- side selection
- configurable exclusion distance in `mm`

Outputs:
- tear-notch geometry
- tear-notch exclusion region

Must never happen:
- notch placement inside incompatible seal structure
- overlap with zipper hardware, hanger slots, or other critical features

Placeholder values:
- default tear-notch exclusion: `{x} mm` (configurable)

## Die-Cuts

What the rule does:
- controls placement of windows, half-moon cutouts, and similar cut features

Inputs:
- feature type
- feature geometry
- position
- surrounding clearances
- trim and seal boundaries

Outputs:
- cut-feature geometry
- exclusion zones
- validity result against pack constraints

Must never happen:
- die-cuts entering seal zones unless explicitly allowed by a documented rule
- two cut features intersecting without a defined composition rule

Placeholder values:
- default die-cut edge clearance: `{x} mm` (configurable)

## Hanger Slots

What the rule does:
- places hanger-slot geometry and enforces clearances to seals, trim, and other top-of-pack features

Inputs:
- slot type
- slot dimensions
- top offset
- center position
- configurable clearances in `mm`

Outputs:
- hanger-slot geometry
- hanger-slot exclusion region

Must never happen:
- hanger slot breaking required top seals
- hanger slot colliding with zipper regions, eye marks, or tear features

Placeholder values:
- default hanger-slot top clearance: `{x} mm` (configurable)
- default hanger-slot side clearance: `{x} mm` (configurable)

## Implementation Guidance

- Pack modules should declare structure and parameters, not own shared manufacturing rules.
- Shared rules should live in reusable rule modules, not be reimplemented per pack.
- Validation outputs should be deterministic and explain which rule failed.
- If a value is unknown, keep the rule shape and use an explicit configurable placeholder instead of inventing a number.
