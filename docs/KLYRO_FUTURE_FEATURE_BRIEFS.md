# Klyro future feature briefs

Source: Sean's Amends.pdf, reviewed 11 October 2026. Retained product requirements, not implemented functionality or engineering rules. The dashboard illustrates these plans and labels each Coming soon. Existing Validation Centre and Export Release remain available elsewhere.

## Legends

Create customised, job-specific legend templates/layouts, usable inside Cutter Studio and exports. Users choose predefined elements: date, created by, customer, sizing, eyemarks, key, disclaimer and logo. Layout options include logo at the top or bottom. Preserve engine-owned geometry and technical colours.

## Cutter preferences

Store default cutter illustration and behaviour preferences. Define cutter-line, seal and perf styles and save presets. Switching presets in the studio applies that preset's defined appearance/settings (for example preset 3 to preset 2). Users define starting dimensions by pack type; supplied examples are Flowwrap 400 × 240 mm and DOY 190 × 90 mm. These are user-configurable examples, not manufacturing constraints.

## Assets

Import/upload, organise and place reusable artwork assets before the automated artwork workflow. The asset library will integrate with the Artwork service, supporting stable branding and consistent inputs for later automation/AI. Do not imply an asset-library backend exists in the beta.

## Artwork

Automated artwork workflows across the app, aimed at consistent, reliable and accurate print proofs, guided by branding, vision and colour systems. Placement, preflight and production checks remain engine-owned. Present automation as planned, not current production approval.

## Current presentation decisions

- Showcase: Legends, Cutter Preferences, Assets and Artwork with relevant animated illustrations. No visible pause button; pointer/focus pause and reduced-motion/manual navigation remain.
- Measurement display bands: below 400% = 1 decimal; 400% to below 1600% = 2; 1600% to 6400% = 3. Coordinates/snapping are not rounded. The 300 ppi grid remains a reference, not an artwork resolution guarantee.
- Appearance is visual only, retained in project data and shared by preview/export. Reset removes an override to restore the renderer default.
- Selected outputs use the existing validation-review/export pipeline for each format. Unavailable formats remain disabled. Critical validation remains visible and blocks by default; the explicit Override errors checkbox permits a single export while recording the failed validation, issue IDs, Project revision and cutter specification snapshot.
