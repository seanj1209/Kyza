# Klyro Phase 3 acceptance and Phase 5 release QA — 19 October 2026

## Phase 3 decision
The product owner requested Phase 3 closure after passing **12/12 manual checks** covering microperf (5), K-Seal (4), and regression (3) on deployed main commit `915dbc6632618d733f8461cd87952fca819b1c6a`. GitHub validation-export and both Vercel status contexts passed for this commit.

**Product-owner acceptance: recorded. Engineering sign-off: conditional.** Remaining items in `docs/klyro-phase3-engineering-matrix-2026-10-19.md` are *not* automatically verified or production-proven: Pillow clearance, 4SS paired eyemarks/Fit, FOP/BOP mapping, FlowAI non-Flowwrap intent, Airtable seven-pack catalogue alignment, all-pack numerical boundaries, converter profiles, and Airtable microperf record correction. These must be tracked as beta release constraints or resolved before unrestricted release.

## Phase 5 started — release gate remains open
Phase 5 covers:
- Independent code review and coverage of changes in the October amendments
- Test account settings persistence (existing saved browser preferences unaffected)
- Test hanger slot rotation in live SVG, PDF, hit area, cursor/drag, dimensions, mirrored variants, and older saved projects
- Verify microperf nonblocking 0–150 mm / 151+ advisory in app and exports
- All-pack boundary tests including negative and fractional inputs
- Cross-browser, mobile, keyboard and accessibility smoke testing
- Representative SVG/PDF/JSON export review and reimport where supported
- `npm run verify`, `npm run build`, `npm run test:e2e` and deployment smoke
- Reconcile all open Airtable engineering records without promoting unapproved assumptions

## Amends 19.10 scoped implementation
- Rename navigation Account to Accounts & Preferences with user/cog icon
- Rename UI preferences sub-page to User Preferences
- Relocate Units of measure selection to Cutter preferences; legacy storage preserved
- Remove UI for obsolete Quick Export without deleting stored legacy values
- Rotate non-round hanger slot silhouettes 90° in shared SVG output; round-hole unchanged
- Microperf advisory already deployed on main as part of PR #30

**No claims of full Phase 5 completion or beta-readiness.** Branch is for review/QA, and merge requires passing checks plus manual hanger-slot confirmation.

## 19 October v2 decision and staged beta gates
The product owner approved the v2 amendments and specifically limited this pass to hanger slots, 4SS Centre, pack-specific clearances, K-Seal arm range, DOY side-seal defaults, Pillow-only FOP/BOP mapping, export background, Cutter toolbar, contour measurements, Airtable catalogue alignment, and portrait/landscape legend selection with the K logo. The previously reviewed hanger orientation and PR #31 have already been accepted and merged; this is a separate follow-up branch.

Gate 1 — implementation and automated checks: complete only when unit/fixture, build, and relevant browser checks pass, including persisted projects and SVG/AI-compatible SVG export. Review status of the new pull request and its deployed preview before calling this gate complete.

Gate 2 — export review, **still requiring product-owner confirmation**: export representative cutters for all seven pack types, including mirrored and non-round hanger slots, displaced/recentred 4SS eyemarks, DOY with zero left/right seals, K-Seal arc/arm measurements, and both legend orientations. Inspect SVG and AI-compatible SVG in an actual vector editor for editable paths/text, transparent canvas, proportions and physical millimetres; inspect PDF proof for intentional white page, layer visibility, dimensions and clipping. Confirm older saved projects reopen and re-export without shape changes. Record samples, discrepancies and approval against the review checklist rather than inferring approval from automated tests.

Gate 3 — beta release decision: independent engineering review, cross-browser/mobile/accessibility smoke, resolved critical defects, catalogue review of the two new Airtable pack records, and a documented go/no-go from the owner. A successful merge or deployment alone does not satisfy this gate.

Deferred pending a narrower specification: broader all-pack spatial prompt intent, a full numerical boundary/converter matrix (including fraction/negative inputs and inch round-trip), and expansion of FOP/BOP placement beyond Pillow. Keep these as explicit follow-up work, not as implicit beta-pass claims.
