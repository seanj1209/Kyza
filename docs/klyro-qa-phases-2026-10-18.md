# Klyro QA completion programme

Baseline: main `71a8f74d1b332db1c61730dea8e251bf328a8767`, 18 October 2026.
Authorised sequence: phases 1, 2, 4 and 6. Phases 3 (engineering matrix review) and 5 (independent release review) remain pending.

## Phase 1 — baseline and scope

Public pack registry (`apps/web/src/packs/index.ts`): Flowwrap, Pillow Pack, DOY Pouch, K Seal Pouch, 3-Side Seal Sachet, 4-Side Seal Sachet, Strip Laminate (`paper-strip`). `plain-web` remains an internal compatibility module and is excluded from public UI workflows, while its unit coverage remains required.

Airtable ER Pack Types currently lists Flow Wrap, Pillow Pack, DOY, K-Seal and WEB/Strip Laminate. This differs from the app: the app displays Strip Laminate for `paper-strip`, and has separate sachet modules. Preserve existing IDs/links; catalogue reconciliation needs a separate explicit mapping rather than renaming internal IDs.

Engineering authority: existing engine-owned rules plus Airtable ER Rules and the latest user amendments. Do not promote Proposed manufacturing rules solely on automated testing. `SACHET-FIT-001` seal/fold interpretation and `LABEL-PLACE-001` FOP/BOP mapping require phase 3 review if not established in approved sources.

### Observed defaults (snapshot, not approval of manufacturing values)

| Pack | Raw spec width × height mm | Seal defaults mm | Clearance mm | Eyemark defaults | Trim |
|---|---|---|---|---|---|
| Flowwrap | 460 × 200 | 20 all sides | 5 | 2, top, 15 × 5 each | none |
| Pillow Pack | 440 × 200 | 15 all sides | 3 | 1, top-right, 10 × 5 | none |
| DOY Pouch | 488 × 135 | left/right 10; base seal 10 | 3 | 1, centre, 10 × 5 | disabled; stored width 15 |
| K Seal Pouch | 510 × 190 rendered; finished fields use K-Seal mapping | side/bottom 7.5 | Pack Gen fallback 3; raw spec unset | 1, centre, 15 × 5 | enabled, 15 |
| 3SS | 76 × 100 per step | top/bottom 5; left/right 3 | 1 | 1, top-left, 5 × 5 | left, 8 |
| 4SS | 50 × 100 per face | top/bottom 5; left/right 3 | 1 | raw count 1, 5 × 5; paired renderer semantics | no track trim |
| Strip Laminate | 310 × 260 | 10 all sides | 5 | not applicable in Builder defaults | clear-strip features are separate |

Required Builder inputs: Project name, supported pack type, positive finished width/height. Pack-specific seal, eyemark, substrate, clearance and gusset defaults come from `packGenFieldPolicy.ts`; explicit user values remain attributed to their source. Dimensions use engine millimetres. Supported outputs are PDF Proof (raster), editable SVG, Illustrator-compatible SVG and JSON. Vector PDF, native AI, DXF and Repro Pack remain planned.

Phase 3 must reconcile observed source discrepancies before engineering approval: Pillow's 3 mm raw clearance versus the general 5 mm working guidance; K-Seal's current preset 45-degree custom K arm versus Airtable KS-KARM-001's 30-degree default; and 4SS stored eyemark count versus paired face semantics. Existing values have not been silently changed by this QA rollout.

The new FlowAI browser coverage proves explicit left/right intent for Flowwrap. Phase 3 must extend the placement boundary matrix to the other constructions: K-Seal renders single marks from centre-relative offsets rather than the position name, so a requested side needs that mapping and a valid trim-width decision. DOY/3SS requests likewise need permitted-zone and adjustment-message cases. Do not infer these cases passed from the Flowwrap tests or close the general spatial-intent rule on that evidence alone.

## Phase 2 — known failures

- Replace obsolete per-format export buttons with current output checkboxes and Export selected; retain real download, validation and evidence assertions.
- Replace removed Artwork feature layout expectations with eight clearly Planned preview sections, retaining both themes and responsive checks.
- Replace ambiguous panel labels and old accordion/RTL assumptions with current Elements category tabs, actionable panels and scroll/layout checks.
- Investigate remaining unit/browser failures against current intended behaviour; do not skip failures or relax engineering checks.

## Phase 4 — workflow matrix

Each public pack must create through the actual UI, edit a dimension, persist a higher revision, retain geometry and element identity after reopen, validate and download parseable SVG with matching Project/validation evidence. Shared tests additionally cover Pack Gen/FlowAI, explicit eyemark intent within engine constraints, layer lock/visibility/selection, nudge, accessible dialogs, available output formats, theme and navigation continuity.

| Pack | Internal ID | Workflow check | Phase 3 engineering checks still required |
|---|---|---|---|
| Flowwrap | flowwrap | public-pack-workflows | seals, folds, eyemark track, steps and boundaries |
| Pillow Pack | pillow-pack | public-pack-workflows | folds, permitted profile-aware eyemark overhang, steps |
| DOY Pouch | doy-pouch | public-pack-workflows | outer trim, gusset/arc bounds, safe-zone contours, mark zones |
| K Seal Pouch | k-seal-pouch | public-pack-workflows | finished-dimension interpretation, K arms, trim, mark offsets |
| 3-Side Seal Sachet | sachet-3-side-seal | public-pack-workflows | left/right/both trim and width measures, no sub-measures, 1 mm clearance, eyemark band |
| 4-Side Seal Sachet | sachet-4-side-seal | public-pack-workflows | inter-step eyemark pair, no Track, seal/fold Fit eligibility |
| Strip Laminate | paper-strip | public-pack-workflows | clear strips, explicit Fit, independent stepped state |
| Internal plain web | plain-web | unit/compatibility checks | public workflow not applicable |

## Phase 6 — publication and evidence

Run required verification/build and browser checks, commit only scoped changes, push main after checking remote state, verify deployment commit and live smoke, update existing Airtable actions with precise evidence and read back changes. Keep overall pack sign-off pending phases 3 and 5. No planned Hot Needle capability receives a pass through existing perforation tests.

## Handover

Record final results, changes, remaining decisions, deployment evidence and exact Airtable updates here before closing this rollout. A subsequent model should resume Phase 3 using this file and the workflow test evidence; Phase 5 follows engineering verification.

### Completed software checks

All 74 Chromium browser tests passed in the final local run (4.0 minutes), with no skipped/expected-failure annotations. This includes the original 11 failures, all seven public pack workflows, four available outputs, Flowwrap left/right intent, all three nudge increments, locks, themes, responsive checks and validation/export evidence.

Final `npm run verify`: all 27 scripts passed, including the updated validation-version/cache regressions, constraints, 39-prompt benchmark, 20 layout fixtures, persistence/identity/export checks, shell checks and production route build. Existing non-blocking large-bundle and dependency `use client` build warnings remain.

Actual product correction: Pillow validation now shares the renderer's symmetric fold resolver rather than treating old preset fold offsets as authoritative after resize. The rule version advances to `beta-cutter-3`; tests prove earlier cached runs are rechecked and invalid explicit folds on other packs still fail. Validation remains read-only.

Removed requests for the unshipped preview video/poster; the existing CSS background remains. Aligned DPI tooltip, tests and reference documentation with the Amends v10 150/200/300/600 reference tiers and 600 ppi readout. Updated obsolete Studio-tour, gusset, settings, panel and export tests while retaining their current functional checks. Test configuration now supports an explicit deployed base URL and prevents reusing a local server owned by another run.

Visual spot checks: DOY controls/Customise and K-Seal legend screenshots were inspected for overlap, readable controls and cutter/legend positioning. This is not the independent Phase 5 review.

### Next model handover

Phase 1 baseline and Phase 2 known-failure repairs are complete. Phase 4's automated workflow matrix is complete for the documented cases; broader spatial-intent adjustments and engineering-boundary approval remain dependent on Phase 3. Run Phase 3 next, then Phase 5. Re-run affected software checks after any engineering fixes and refresh deployment/Airtable evidence.

Phase 3 open list: K-Seal angle source precedence, Pillow clearance guidance, 4SS pair semantics and Fit eligibility, FOP/BOP approved mapping, permitted-zone/adjustment-message spatial intent for non-Flowwrap packs, catalogue mapping, all pack numerical boundary fixtures and converter assumptions. Phase 5 open list: independent code/coverage review, representative export inspection and agreed browser coverage beyond the configured Chromium suite.

Rollback: revert the scoped QA rollout commit, push main, and verify the replacement Vercel deployment. Historical Project export records retain their recorded snapshots; older validation runs are refreshed by the current rule version. Do not reset or delete user projects to roll back app code.
