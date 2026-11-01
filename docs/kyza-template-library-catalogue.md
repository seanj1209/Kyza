# Kyza Cutter Guide Library Catalogue

Working catalogue for the first reusable cutter-guide library. This is an offline planning artefact: it does not claim that every row is production-ready or that a pack type has approved manufacturing dimensions.

Experiment baseline: `fc39a9f8a03520ec3c4a088815de275ed1fb7bb6` (`kyza-claude-baseline-fc39a9f`). Compare generated template work against this SHA, not against an incidental working-tree state.

## Operating principle

Each library item is a reusable Pack Specification starting point. Kyza remains the source of truth for geometry, validation and SVG export. An assistant may help map a brief to a structured template, but it should not invent manufacturing rules or replace the pack engines.

Dimensions, seal allowances, substrate settings and machine-specific rules must be supplied or approved by the packaging team before a template is marked `approved`.

## Initial catalogue

| ID | Display name | Pack ID | Tier | Intended use | Current status |
| --- | --- | --- | --- | --- | --- |
| `flowwrap-standard` | Flowwrap · Standard | `flowwrap` | Core | General roll-fed flowwrap starting point | Needs approved dimensions |
| `flowwrap-eyemark` | Flowwrap · Dual Eyemark | `flowwrap` | Core | Flowwrap with the current dual-eyemark default | Needs approved dimensions |
| `pillow-pack-standard` | Pillow Pack · Standard | `pillow-pack` | Core | Pillow-style pack for general products | Needs approved dimensions |
| `doy-pouch-standard` | DOY Pouch · Standard Gusset | `doy-pouch` | Core | Stand-up pouch with bottom gusset | Needs approved dimensions |
| `doy-pouch-zipper-notch` | DOY Pouch · Zipper + Tear Notch | `doy-pouch` | Variant | Resealable pouch with opening features | Needs rule review |
| `k-seal-standard` | K Seal Pouch · Standard | `k-seal-pouch` | Core | K-seal pouch starting point | Needs approved dimensions |
| `k-seal-zipper-notch` | K Seal Pouch · Zipper + Tear Notch | `k-seal-pouch` | Variant | Resealable K-seal pouch | Needs rule review |
| `sachet-3-side-standard` | 3-Side Seal Sachet · Standard | `sachet-3-side-seal` | Core | Three-side-seal sachet | Needs approved dimensions |
| `sachet-4-side-standard` | 4-Side Seal Sachet · Standard | `sachet-4-side-seal` | Core | Four-side-seal sachet | Needs approved dimensions |
| `paper-strip-standard` | Paper Strip · Lane Laminate | `paper-strip` | Core | Lane-based paper strip / laminate guide | Needs approved dimensions |
| `plain-web-technical` | Plain Web · Technical Base | `plain-web` | Internal | Technical baseline for engine and validation checks | Internal only |

The first customer-facing release should start with the eight Core rows. Variants should be added only after the Core rows pass the acceptance matrix. `plain-web-technical` is useful for testing but should not appear as a normal customer template.

## Required template record

The eventual JSON/TypeScript record should contain these fields:

```text
templateId
schemaVersion
displayName
packId
tier                 // core, variant, internal, future
status               // draft, needs-review, approved, retired
purpose
dimensions           // width, height, units; never inferred silently
substrate
seals
gusset
zipper
tearNotch
eyemarks
safeZones
windows
attributeBoxes
hangerSlots
perforations
expectedValidation
exportProfile
sourceReferences
ownerReview
revision
```

Optional features should be omitted or explicitly disabled. Do not encode geometry calculations in the catalogue; reference the registered pack engine and let Kyza calculate the resolved guide.

## Recommended first batch

To minimise assistant usage, process the first batch as four representative templates:

1. `flowwrap-standard`
2. `pillow-pack-standard`
3. `doy-pouch-standard`
4. `sachet-3-side-standard`

This exercises the main construction families. Add K-seal, 4-side sachet, paper strip and feature variants only after the first batch has a clean build, reopen, validation and export record.

## Provenance fields for every generated guide

Record these alongside each exported file:

- template ID and revision
- source Git commit SHA
- Kyza project ID or saved-project name
- pack ID and dimensions
- validation result and warnings
- export format, filename and timestamp
- human reviewer and review notes
- assistant used, if any

This makes later Codex/Claude comparisons and selective cherry-picks safe and auditable.

