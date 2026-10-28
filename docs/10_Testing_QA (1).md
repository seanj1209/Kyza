---
document_name: Klyro Testing and QA
file_name: 10_Testing_QA.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Sean Johnston / Klyro
last_reviewed: 2026-07-19
source_replaces: 10_Testing_QA.md v1.0
authority: Test strategy, quality gates, test matrices, regression coverage, evidence standards, bug classification and beta release QA
related_sources:
  - 01_Product_Architecture.md
  - 04_Engineering_Knowledge_Base.md
  - 05_API_Architecture.md
  - 06_Database_Schema.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 11_Marketing_Website.md
---

# Klyro Testing and QA

## Document Purpose

This document defines the testing and quality-assurance strategy for the Klyro App and its underlying CutNFlow/CnF Tech engineering capability.

It establishes:

- Quality principles
- Beta release gates
- Test levels and ownership
- Required evidence
- Documentation and source consistency checks
- Project lifecycle tests
- Pack Gen tests
- Cutter Studio tests
- Pack-specific engineering regression tests
- Validation tests
- FlowAI tests
- Export tests
- UI, accessibility and responsive tests
- API, database and persistence tests
- Security and permission checks
- Deployment verification
- Bug severity
- Acceptance-criteria standards
- Codex testing rules
- Airtable QA alignment

This document protects Klyro from becoming visually polished but technically unreliable.

Testing must confirm that the product works as one connected Project workflow:

```text
Dashboard
→ create/open Project
→ Pack Gen
→ Prompt or Build Pack
→ Pack Specification
→ Cutter Studio
→ Validation
→ Save
→ Reopen
→ Export Release
```

`01_Product_Architecture.md` controls product scope.

`04_Engineering_Knowledge_Base.md` controls engineering rules and expected technical behaviour.

`05_API_Architecture.md` controls service and contract boundaries.

`06_Database_Schema.md` controls persistence and migration requirements.

`07_UI_Design_System.md` controls accepted presentation and interaction behaviour.

`08_AI_Architecture.md` controls FlowAI behaviour, safety and structured responses.

`09_Development_Roadmap.md` controls delivery sequence and release milestones.

There is no separate `00_Master_Context.md`.

---

# 1. Product and QA Context

## 1.1 Klyro

Klyro is the customer-facing master brand.

## 1.2 Klyro App

The Klyro App is the connected working environment.

The first controlled beta centres on:

- Dashboard
- Project lifecycle
- Pack Gen
- Cutter Studio
- Validation Centre
- Export Release
- Account & Specs essentials

## 1.3 CutNFlow / CnF Tech

CutNFlow/CnF Tech is the deterministic packaging-engineering capability.

Testing must verify:

- Pack-type logic
- Engineering defaults
- Cutter geometry
- Cutter constraints
- Pack-specific validation
- Structured technical export

## 1.4 FlowAI

FlowAI is the intelligence, explanation and guided-assistance layer.

Testing must verify that FlowAI:

- Interprets and explains
- Uses structured Project context
- Exposes assumptions
- Preserves deterministic validation authority
- Requires approval for production changes
- Does not silently mutate engineering state

---

# 2. Core QA Principle

Klyro QA must test technical truth, workflow continuity and user control.

A feature is not complete because:

- The page renders
- The UI matches a concept image
- A button exists
- A model returns an answer
- A cutter looks approximately correct
- A file downloads
- A local build succeeds

A feature is complete only when its required behaviour, state, engineering rules, failure states and regression risks are verified.

Engineering accuracy takes priority over visual polish.

Visual defects remain important, but a visually correct screen must not hide invalid technical behaviour.

---

# 3. QA Principles

Klyro QA follows these principles.

1. Project continuity is a release-critical requirement.
2. Engineering behaviour must be tested independently from appearance.
3. Pack-specific geometry must have pack-specific tests.
4. Existing working behaviour must not regress during UI work.
5. Deterministic validation controls pass, failure and severity.
6. FlowAI explanation must remain faithful to deterministic results.
7. Production-critical AI actions require explicit user approval.
8. Saved Projects must remain compatible or migrate safely.
9. Export output must be technically inspected, not only downloaded.
10. Light and dark mode are both required states.
11. Disabled future features must not open broken routes.
12. Mock, local and remote adapters should follow the same contracts.
13. Tests must state what was actually run.
14. Failed or unavailable tests must be recorded honestly.
15. Every beta-critical task requires evidence.
16. A known data-loss or critical geometry defect blocks beta release.
17. Artwork Studio and advanced production features remain post-beta unless deliberately enabled.
18. Testing effort should follow risk, not visual prominence.

---

# 4. Quality Status Vocabulary

Use these QA statuses consistently.

## Not Tested

No valid evidence exists.

## Test Planned

Required tests are identified but not yet run.

## In Test

Testing is actively underway.

## Passed

All required checks for the stated scope passed.

## Passed with Limitations

The required scope passed, but named non-blocking limitations remain.

## Failed

One or more acceptance criteria failed.

## Blocked

Testing cannot proceed because a dependency or environment is unavailable.

## Not Applicable

The check does not apply to the feature or release scope.

Do not mark a feature Ready for Beta while its required QA status is Not Tested.

---

# 5. Test Levels

## 5.1 Static Checks

Static checks include:

- TypeScript
- Linting
- Build
- Import resolution
- Schema validation
- Markdown/source checks
- Dead-code warnings where available

## 5.2 Unit Tests

Unit tests isolate deterministic behaviour such as:

- Pack inference helpers
- Engineering defaults
- Geometry calculations
- Validation rules
- State transformations
- Runtime schemas
- Error mapping
- FlowAI response parsing
- Export naming and option construction

## 5.3 Contract Tests

Contract tests verify:

- API request and response shapes
- Mock/local/remote adapter parity
- Project document schemas
- FlowAI structured responses
- Validation issue shapes
- Export capability reporting
- Migration input/output

## 5.4 Integration Tests

Integration tests verify connected modules and services.

Examples:

- Pack Gen → Project
- Pack Specification → Cutter generation
- Cutter change → Project revision
- Cutter change → revalidation
- Validation → Cutter status
- Validation → Export Release
- FlowAI proposal → approved domain action
- Save → reopen

## 5.5 End-to-End Tests

End-to-end tests verify complete user journeys in the running application.

## 5.6 Manual Engineering QA

Manual engineering QA remains required for:

- Cutter visual inspection
- Geometry sense checks
- Zoom/pan behaviour
- Feature placement
- Layer meaning
- Export inspection
- Production-language review
- Pack recommendation reasonableness

## 5.7 Visual and Interaction QA

Visual QA verifies:

- Accepted layout
- Theme
- Spacing
- Responsiveness
- Interaction feedback
- Focus and keyboard behaviour
- Overlay placement
- Canvas usability

## 5.8 Exploratory QA

Exploratory QA should be used for:

- Unexpected state transitions
- Rapid repeated actions
- Contradictory inputs
- Boundary dimensions
- Corrupt Project data
- Back/forward navigation
- Interrupted save/export/AI calls
- Unusual pack-feature combinations

---

# 6. Test Ownership

## Codex

Codex should:

- Add and run automated tests
- Run build/type/lint checks
- Report exact commands
- Report failures and limitations
- Add fixtures for changed engineering logic
- Preserve unrelated working tests

## Manual QA

Manual QA should:

- Verify engineering sense
- Inspect visual output
- Inspect exported files
- Test real workflows
- Test themes and screen sizes
- Confirm acceptance criteria

## Gemini

Gemini may support:

- Visual concept comparison
- Layout review
- Light/dark concept exploration

Gemini output is not implementation or QA evidence.

## Airtable

Airtable records:

- QA status
- Evidence
- Defects
- Release-gate state
- Regression requirements

Airtable does not replace the test suite or source files.

---

# 7. Required Evidence

Acceptable evidence includes:

- Automated test output
- Build/type-check output
- Named manual test steps and results
- Before/after screenshots
- Exported file inspection
- Geometry comparison
- Saved/reopened Project comparison
- Browser matrix result
- Validation issue output
- FlowAI structured response fixture
- Deployment commit and URL verification

Evidence should identify:

- Environment
- App commit
- Test date
- Feature/pack type
- Input
- Expected result
- Actual result
- Pass/fail
- Limitation

A statement such as `looks good` is not sufficient evidence for engineering work.

---

# 8. Codex Testing Rules

Codex must:

- Inspect package scripts before choosing commands.
- Run the most relevant available tests.
- Run build/type checks for changed TypeScript code where practical.
- Add tests for new deterministic logic.
- Add regression tests for fixed defects.
- Use existing testing frameworks unless a change is approved.
- Keep fixtures deterministic.
- State commands and results.
- State tests not run.
- State manual checks still required.
- Avoid claiming visual or export inspection it did not perform.
- Avoid large refactors solely to make one test pass.
- Preserve pack-specific tests during shared-engine changes.
- Include saved-project migration tests when data shapes change.

Codex must not:

- Delete failing tests without explaining why.
- Replace a meaningful assertion with a weaker snapshot.
- mock the behaviour being tested so completely that the test proves nothing.
- Mark FlowAI responses correct without schema and safety checks.
- Treat a downloaded file as technically valid without content checks.
- Treat a successful render as proof of correct cutter geometry.

---

# 9. Definition of Done

A task is Done only when:

- Required behaviour is implemented.
- Acceptance criteria are met.
- Relevant tests pass.
- Existing supported behaviour remains intact.
- Engineering rules are followed.
- Shared services/types are used.
- Error and loading states are handled.
- Light/dark checks are complete where relevant.
- Responsive checks are complete where relevant.
- Accessibility checks are complete where relevant.
- Saved Project compatibility is preserved.
- Evidence is recorded.
- Limitations are recorded.
- Airtable is updated.
- The change is committed and pushed.
- Deployment is verified where deployment is part of the task.

A feature may be `Implemented — Awaiting QA` before these conditions are complete.

---

# 10. Beta Release Quality Gates

## Gate 1 — Source Consistency

Required:

- One active version of each source file
- Klyro terminology consistent
- No required reference to nonexistent sources
- Beta and post-beta scope aligned
- Cross-references valid

## Gate 2 — Build and Static Quality

Required:

- Production build succeeds
- TypeScript passes or all exceptions are documented and accepted
- No blocking lint/import errors
- No critical console errors on core workflow

## Gate 3 — Project Continuity

Required:

- Create Project
- Save Project
- Search Project
- Open Project
- Restore Pack Specification
- Restore Cutter Specification
- Preserve meaningful edits
- Handle corrupt/missing state safely

Any known data-loss defect blocks release.

## Gate 4 — Pack Gen

Required:

- Prompt path works
- Build Pack path works
- Both create compatible Pack Specifications
- Supported pack types are accurate
- Assumptions are visible
- Supplied dimensions are retained
- Unsupported formats are handled honestly

## Gate 5 — Cutter Studio

Required:

- Supported cutters render
- Core tools work
- Protected geometry remains protected
- Layers and canvas stay synchronised
- Customise does not change geometry
- Save/reopen preserves cutter state
- Pack-specific regression tests pass

## Gate 6 — Validation

Required:

- Deterministic validation runs
- Severity is consistent
- Passed means the current Project revision has no open Critical issues; Warnings and Advisories may remain
- Failed means the current Project revision has one or more open Critical issues
- Engineering-affecting changes make prior validation Stale
- Validation service failure produces Error without losing Project state
- Critical and Warning counts are correct
- Export blocking is correct
- Cutter Studio and Validation Centre use the same result
- Revalidation works

## Gate 7 — Export Release

Required:

- At least one supported useful export format
- Validation state is respected
- Output scale/units are correct
- Vector structure is preserved where required
- Export failure preserves Project work
- Export record identifies Project revision

## Gate 8 — FlowAI Safety

Required:

- Structured responses validate
- Assumptions are visible
- Validation severity is preserved
- Critical actions require approval
- Unsupported actions are rejected
- Service failure does not change Project state

## Gate 9 — UX and Accessibility

Required:

- Light mode usable
- Dark mode usable
- Core workflow keyboard-accessible
- Focus visible
- No inaccessible critical status
- Desktop and narrow layouts usable
- Disabled future routes behave honestly

## Gate 10 — Deployment

Required:

- Deployed build matches approved commit
- Routes work after refresh
- Required environment variables present
- No missing brand assets
- Beta limitations published
- Feedback route available

---

# 11. Documentation QA

Check every source for:

- Correct file name
- Correct document title
- Correct version
- Clear authority
- Current related sources
- Klyro terminology
- No active duplicate
- No unfinished code fence
- No pasted chat artefacts
- No contradictory duplicate rule
- No accidental dependency on `00_Master_Context.md`
- No active dependency on unconfirmed `02_Development_Standards.md` or `03_Decision_Log.md`
- Correct beta/post-beta classification
- Change log present
- Markdown readable by Codex

Current expected active sources:

- `01_Product_Architecture.md`
- `04_Engineering_Knowledge_Base.md`
- `05_API_Architecture.md`
- `06_Database_Schema.md`
- `07_UI_Design_System.md`
- `08_AI_Architecture.md`
- `09_Development_Roadmap.md`
- `10_Testing_QA.md`
- `11_Marketing_Website.md`

GitHub `/docs` is the master source.

Project Sources should be updated reference copies.

---

# 12. Repository Baseline QA

Before the next implementation sprint, record:

- Repository and branch
- Latest commit
- Package manager
- Scripts
- Build result
- Test result
- Type-check result
- Lint result
- Core routes
- Project persistence method
- Current stores
- Current Pack and Cutter types
- Current validators
- Current export functions
- Current mock/real FlowAI state
- Deployment branch and host
- Known defects

Classify code areas as:

- Implemented and verified
- Implemented but unverified
- Partial
- UI only
- Mock only
- Broken
- Duplicate
- Superseded
- Post-beta

---

# 13. Project Lifecycle QA

## 13.1 Create

Test:

- Required and optional fields
- Stable Project ID
- Default status/stage
- Created timestamp
- Initial revision
- Duplicate submit protection
- Error recovery

## 13.2 Save

Test:

- Save indicator
- Unsaved changes
- Successful revision increment
- Failed save
- Retry
- No false success
- Data not lost when save fails

## 13.3 Search and Recent Projects

Test:

- Recent ordering by real updated time
- Maximum Dashboard count
- Full authorised search
- Search by name
- Reference
- Customer/brand
- Pack type where supported
- No-result state
- Case/spacing behaviour

## 13.4 Reopen

Verify restoration of:

- Project identity
- Product Information
- Pack Specification
- Cutter Specification
- Layers
- Visibility
- Locks
- Appearance
- Assumptions
- Notes
- Validation summary
- Export history/reference where intended

## 13.5 Revision Conflict

Test:

- Load revision A
- Update Project elsewhere to revision B
- Attempt save from revision A
- Conflict is rejected
- User receives recovery path
- Newer data is not overwritten silently
- Passed validation becomes Stale after a relevant revision change
- `ready_for_export` is invalidated after an engineering-affecting revision change

## 13.6 Corrupt or Old Data

Test:

- Missing field
- Invalid enum
- Invalid geometry
- Old schema version
- Unsupported schema version
- Migration failure
- Recovery/backup
- No application crash

---

# 14. Dashboard QA

The accepted Dashboard contains:

1. Hero
2. Start Here
3. Quick Links
4. Project search
5. Recent Projects

Verify:

- Start Here opens Pack Gen
- Quick Links use real existing routes or interfaces
- Disabled links do not open empty pages
- Project search uses canonical Project data
- Recent Projects use real updated order
- Card click opens the correct Project
- Maximum 24 recent cards by default
- Empty state contains a useful action
- Search no-result state is clear
- No old command-centre content is reintroduced
- No fake Project values are presented as real

Quick Links order:

1. Template Library
2. Legend Config
3. New Project
4. Cutter Preferences
5. Upload Items
6. Export

---

# 15. Pack Gen UI QA

Accepted order:

1. Short hero
2. Build Pack
3. Prompt composer
4. Generate Pack
5. Explore Our Templates

Verify:

- Pack Selector slider is absent
- Build Pack opens the existing manual builder
- Prompt content persists during normal use
- Empty prompt validation is inline
- Duplicate generation is prevented
- Generate Pack loading is clear
- Templates do not falsely apply if unavailable
- Unsupported pack types are not shown as active
- Layout works in light/dark mode
- Narrow-screen stacking is usable

---

# 16. Pack Gen Functional QA

## 16.1 Prompt Path

Expected:

```text
Prompt
→ interpretation
→ structured proposal
→ assumptions/missing information
→ user continuation
→ Pack Service validation
→ Project update
→ Cutter generation
```

Verify:

- User-stated dimensions are retained
- User-stated pack type is respected where supported
- Missing values are visible assumptions
- FlowAI does not directly persist authoritative Pack data
- Pack Service rejects impossible values
- Result uses the shared Pack Specification
- Continuation opens the correct Project/Cutter

## 16.2 Build Pack Path

Verify:

- Existing manual builder is reused
- Fields map to the shared Pack Specification
- Required values are validated
- Pack-specific defaults apply correctly
- User overrides are retained
- Result generates the same Cutter model used by prompt path

## 16.3 Prompt and Build Pack Parity

For an equivalent requirement, both routes should produce compatible:

- Pack type
- Dimensions
- Seal configuration
- Eyemark configuration
- Features
- Assumptions
- Cutter-generation input

---

# 17. Pack Recommendation Matrix

## 17.1 Sachet

Prompts:

- `20g sauce packet`
- `Small ketchup sachet`
- `10g condiment portion`
- `Single-use sauce sample`
- `Powder sample sachet`
- `Medical wipe sachet`
- `30g liquid packet`

Expected:

- Three-side seal sachet as a strong primary direction where supported
- Four-side seal sachet as a relevant alternative where supported
- No unrelated default to DOY or K-Seal
- Assumptions visible
- Missing dimensions/material identified

## 17.2 Flow Wrap

Prompts:

- `Flow wrap cake bar`
- `Chocolate bar wrapper`
- `Biscuit flow wrap`
- `Snack bar pack`
- `Bakery bar wrapper`

Expected:

- Flow wrap/pillow direction
- Crimp/end-seal awareness
- Eyemark/registration awareness
- No stand-up pouch unless user requests it

## 17.3 DOY / K-Seal

Prompts:

- `Doy pouch 500g`
- `Stand-up pouch with zip`
- `Pet food pouch`
- `Refillable pouch`
- `K-Seal pouch 250mm wide with 50mm gusset`

Expected:

- DOY or K-Seal according to wording and support
- Gusset/base assumptions visible
- Zip/tear relationship mentioned where relevant
- K-Seal prompt remains K-Seal
- User dimensions retained

## 17.4 Pillow Pack

Prompts:

- `Pillow pack frozen vegetables`
- `Vertical form fill seal bag for snacks`

Expected:

- Pillow/VFFS direction where supported
- Back/longitudinal seal awareness
- End-seal and eyemark awareness

## 17.5 Lidded Film

Lidded Film is tested only if active.

Prompts:

- `Lidded film for ready meal tray`
- `Peel film for tray`
- `Top film for produce tray`

Expected:

- Lidded film
- Seal-flange/tray context
- Clear unsupported-state message if not beta-supported

## 17.6 Ambiguous

Prompts:

- `Pack for 200g powder`
- `Plastic bag for food`
- `Need a pouch`

Expected:

- Useful questions or controlled assumptions
- No false high confidence
- No unsupported production approval

---

# 18. Engineering Default QA

Verify current active rules:

- Generic fallback seal width: 15 mm
- Bleed: 3 mm
- Critical-artwork safe-zone offset from inner seal: 5 mm
- Fold-line critical-artwork clearance: 3 mm
- Eyemark default: 15 mm × 5 mm
- Applicable automatic eyemark edge offset: 1.5 mm
- Engineering units: millimetres
- Pack-specific rules override global defaults

Test:

- Default is applied only when value is missing
- Explicit Project value is preserved
- Customer/press rule overrides when active
- Different pack-type rule overrides the global fallback
- Assumption source is recorded
- Old 10 mm generic seal assumption is not reintroduced

---

# 19. Cutter Studio General QA

Verify:

- Cutter Specification loads
- Cutter remains visual focus
- Status strip uses real data
- Horizontal tool dock stays anchored to workspace
- Right panel contains Base, Attributes, Customise and Layers
- Pack Spec, Import and Save/Export actions use existing logic
- Cutter canvas remains sharp
- Panel changes do not reset geometry
- Selection, zoom and pan remain stable
- UI overlays are not exported

---

# 20. Cutter Canvas QA

Test:

- Initial fit
- Zoom in/out
- Pan
- Fit/reset
- Large and small cutters
- Right panel open/closed
- Main tray expanded/collapsed
- Window resize
- Selected element
- Validation overlay
- Theme change

Verify:

- Cutter stays visible
- No page-level scroll hijacking
- Zoom uses sensible limits
- Pan affects canvas content only
- Tool dock does not move with pan
- Fit accounts for usable workspace
- Lines remain readable
- Canvas state is not reset unnecessarily

---

# 21. Selection and Editing QA

Test:

- Double-click selection where implemented
- Selection tool
- Move
- Edge resize
- Corner rotate
- Deselect
- Locked element
- Hidden element
- Protected base geometry
- Multi-feature overlap
- Invalid move

Verify:

- Selected state appears in canvas and Layers
- Move requires intended interaction
- Resize/rotate cursor appears only in valid zones
- Removed legacy overlay handles do not reappear
- Locked element cannot be changed
- Protected element cannot be deleted
- Invalid action returns a useful result
- Selection alone does not change geometry

---

# 22. Layers QA

Verify:

- Group navigation derives from real groups
- Selecting tab scrolls to correct group
- Manual scroll updates active group
- Active group does not flicker
- Landscape rows display correctly
- Visibility works
- Lock works
- Delete appears only where allowed
- Protected elements remain protected
- Canvas selection highlights the layer
- Layer selection highlights the canvas element
- Hidden layer remains listed
- No duplicate layer state exists
- Removed Validation and Artwork footer actions remain absent

Test current relevant groups:

- Base
- Cutter Edges
- Seals
- Fold Lines
- Safe Zones
- Eyemarks
- Attributes
- Imported Items
- Annotations

---

# 23. Customise QA

Verify:

- Compact no-selection state
- Selected-element summary
- Colour & Appearance
- Opacity
- Line & Stroke
- Presets
- Context-aware controls
- Locked element restrictions
- Reset Appearance where supported

Test:

- Colour update
- Hex input
- Opacity
- Line style
- Preset
- Undo/save/reopen where supported

Critical rule:

- Appearance changes must not alter geometry, engineering dimensions, seals, folds, gussets or eyemark parameters.

Removed actions must remain absent:

- Browse Attributes
- Validate Cutter Guide
- Send to Artwork Studio

---

# 24. Pack-Specific Geometry QA

Every supported pack type requires fixtures with known expected values.

A geometry fixture should record:

- Input Pack Specification
- Expected flat dimensions
- Expected panels
- Expected seals
- Expected folds
- Expected gusset
- Expected eyemarks
- Expected attributes
- Expected protected elements
- Expected validation state
- Expected export bounds

Compare geometry numerically where possible.

Do not rely only on screenshot comparison.

---

# 25. K-Seal QA

## 25.1 Defaults

Verify:

- Side seal default: 7.5 mm
- Bottom seal default: 7.5 mm
- Trim default: ON at 10 mm
- Support-arm angle default: 30°
- Allowed controlled range: 25°–35°
- Eight support arms
- Arm thickness equals configured bottom-seal width

## 25.2 Arm Geometry

Test:

- Standard dimensions
- Narrow pouch
- Wide pouch
- Small gusset
- Large gusset
- 5 mm bottom seal
- 7.5 mm bottom seal
- 25°, 30° and 35°
- Invalid angle
- Boundary condition
- Save/reopen

Verify:

- All eight arms use the same angle
- All arms use the correct thickness
- No doubled 15 mm band from a 7.5 mm seal
- Arms remain symmetrical
- Start/end references are consistent
- Arms do not protrude beyond bottom-seal limits
- Overall height does not distort arm logic without a real dependency
- Geometry remains valid after change

## 25.3 Visual Union

Verify:

- Side seals, arms and bottom seals appear continuous
- No unwanted gaps
- No double-opacity overlap
- No stray outline seam
- Logical element identity remains intact
- Export remains structured

A visual seam without invalid coordinates is recorded as a rendering defect, not a geometry defect.

## 25.4 Tac Hole

Verify:

- Starts inside the permitted region
- Does not cross maximum boundary
- Boundary rule uses named geometry references
- Definite violation receives correct severity
- Missing reference geometry does not become false Critical

## 25.5 K-Seal Regression

Any K-Seal change must also verify:

- DOY unchanged
- Sachet unchanged
- Eyemark unchanged unless scoped
- Save/reopen
- Validation
- Export

---

# 26. DOY QA

Verify separately from K-Seal:

- Front/back panels
- Bottom gusset
- Gusset centring
- Side/top seals
- Fold lines
- Eyemark
- Optional tear notch
- Optional Grip Seal/Zip behaviour where supported
- Hanger hole where supported
- Save/reopen
- Validation
- Export

Ensure K-Seal arm rules and naming are not applied globally to DOY.

---

# 27. Sachet QA

## Three-Side Seal

Verify:

- Three seal zones
- Correct open/fill edge
- Internal safe area
- Tear notch where enabled
- Eyemark where enabled
- Valid finished/flat relationship

## Four-Side Seal

Verify if supported:

- Four perimeter seals
- Fourth side is actually closed
- Restricted internal area
- Correct tear/opening behaviour

Test:

- Very small sachet
- Wide sachet
- Narrow/tall sachet
- Missing dimensions
- Invalid seal widths
- Feature conflict

---

# 28. Flow Wrap / Pillow QA

Verify where supported:

- Repeat/cut-off
- Pack width
- Longitudinal seal
- End/crimp seals
- Eyemark
- Product clearance
- Print-to-cut relationship
- Save/reopen
- Validation
- Export

Machine-specific rules must not be guessed if no profile exists.

---

# 29. Eyemark QA

Verify:

- Default 15 × 5 mm
- User override
- 0, 1 and 2 eyemarks
- Applicable 1.5 mm edge placement
- Pack-specific availability
- Trim dependency
- Track-clear setting
- Print-in-seal setting
- Flood print interaction
- Save/reopen

## Slit-Tolerance

Trigger only when:

- Flood print is active
- Eyemark is in the relevant track condition

Verify options:

- Reduce size
- Increase width
- Move inward
- Ignore/acknowledge where permitted

Verify:

- No silent geometry change
- Two-eyemark width allowance behaviour
- No duplicate Artwork Studio slit-tolerance control
- Unknown track geometry is Warning/Advisory, not false Critical

---

# 30. Feature QA

Test supported:

- Tear notches
- Grip Seal (Zip)
- Grip Seal (Default)
- Perforations
- Hanger holes
- Half-moons
- Windows
- Barcode boxes
- BBE/date-code boxes
- Safe zones
- Flood print
- Tac holes
- Imported items

For each:

- Creation
- Position
- Resize where allowed
- Rotation where allowed
- Lock
- Visibility
- Delete permission
- Pack compatibility
- Validation
- Save/reopen
- Export inclusion/exclusion

---

# 31. Validation Service QA

Validation must be deterministic and pack-specific.

Verify:

- Validation run creates one shared result
- Status progresses through Not Run, Running and Passed/Failed
- Engineering-affecting changes move the summary to Stale
- Service failure moves the summary to Error
- Passed can coexist with Warnings and Advisories but not open Critical issues
- Counts match issues
- Severity matches rule
- Affected module is correct
- Affected element is correct
- Export blocking is correct
- Re-run updates result and validated Project revision
- Old result is traceable or superseded
- Validated and current Project revisions are compared
- Cutter Studio and Validation Centre match
- FlowAI does not modify result

Canonical severity:

- Critical
- Warning
- Advisory
- Pass

Not severity:

- Auto-fix
- Recommendation
- Acknowledged
- Resolved

---

# 32. Validation Rule QA

Test at minimum:

- Not Run summary
- Running summary
- Passed with no issues
- Passed with Warning/Advisory only
- Failed with Critical issue
- Stale after Project revision change
- Error after validation service failure
- Invalid dimensions
- Impossible Pack geometry
- Seal inconsistency
- Safe-zone conflict
- Fold clearance
- Gusset centring
- Eyemark size
- Eyemark edge/track position
- Tear/zip conflict
- Perforation through critical seal
- Protected-element deletion
- K-Seal arm count
- K-Seal arm angle
- K-Seal arm thickness
- K-Seal arm boundary
- Tac-hole boundary
- Missing export-critical structure

For every rule, verify:

- Valid fixture passes
- Invalid fixture fails
- Boundary fixture
- Correct severity
- Correct message
- Correct affected object
- Correct export-block state
- No automatic geometry mutation

---

# 33. Unknown and Incomplete Geometry QA

Unknown or unresolved geometry must not become a false Critical issue.

Test:

- Missing track reference
- Unresolved optional production profile
- Missing customer rule
- Incomplete artwork context
- Unknown machine clearance

Expected:

- Warning or Advisory
- Missing information explained
- No export block unless output is definitely invalid
- FlowAI states need for production confirmation

---

# 34. Validation Message QA

Every message should state:

1. What is wrong
2. Why it matters
3. Where it is
4. Likely production consequence
5. Suggested next step
6. Whether export is blocked

Good:

`The eyemark is too close to the permitted track boundary. This may reduce registration reliability during cutting. Move it inward or confirm the machine-specific allowance.`

Poor:

`Invalid eyemark.`

Good:

`The bottom gusset is not centred relative to the pouch width. This may create inconsistent K-seal geometry and stand-up performance.`

Poor:

`Gusset error.`

---

# 35. Validation Centre UI QA

Verify:

- Not Run
- Running
- Passed
- Failed
- Critical count
- Warning/soft-error count
- Advisory handling
- Export-block state
- Re-run
- Issue details
- Affected element navigation where supported
- FlowAI explanation
- Light/dark mode
- Keyboard interaction
- Loading/error state

FlowAI explanation must remain visually distinct from deterministic severity.

---

# 36. FlowAI Contract QA

Verify:

- Request intent is valid
- Context is intent-specific
- Response schema validates
- Invalid response is rejected
- References are preserved
- Assumptions are structured
- Confidence is valid
- Risks are structured
- Unsupported actions are removed/rejected
- Mock and real shapes match
- Project is unchanged on failure

Beta intents:

- `pack_interpretation`
- `pack_recommendation`
- `missing_information`
- `validation_explanation`
- `cutter_guidance`
- `knowledge_lookup`
- `project_summary`
- `export_readiness_summary`

---

# 37. FlowAI Pack Gen QA

Use prompts from the Pack Recommendation Matrix.

Verify:

- Correct intent
- Stated facts extracted
- Dimensions retained
- Pack direction sensible
- Supported status accurate
- Assumptions visible
- Missing questions prioritised
- Confidence sensible
- No production approval claim
- Proposal requires Pack Service acceptance

Fail if FlowAI:

- Chooses unrelated pack without reason
- Hides important assumption
- Drops dimensions
- Claims an unsupported pack can be generated
- Writes authoritative Project state directly

---

# 38. FlowAI Validation QA

Use deterministic fixtures:

- Critical export-blocking issue
- Warning
- Advisory
- Pass
- Unknown geometry
- Missing rule mapping

Verify:

- Severity copied exactly
- Export block copied exactly
- Explanation is practical
- Suggested action is relevant
- Unknown state remains uncertain
- FlowAI cannot mark resolved/passed
- Missing rule mapping is disclosed

---

# 39. FlowAI Action Safety QA

Risk classes:

- Safe
- Review
- Critical

Test actions:

- Open Validation Centre
- Save recommendation
- Create assumption
- Propose Pack Specification
- Propose cutter change
- Apply cutter change
- Prepare export
- Archive Project
- Unsupported arbitrary action

Verify:

- Safe navigation may execute with permission
- Project-data updates require review/confirmation
- Geometry/release actions require explicit approval
- Permission checked in trusted service
- Before/after values shown
- Approved domain service applies the change
- Revalidation runs where required
- Unsupported action never executes
- Raw model payload never executes

---

# 40. FlowAI Security QA

Test:

- Prompt injection inside uploaded text
- Retrieved article containing instructions
- User asks to ignore validation
- User asks to reveal system prompt
- User asks to access another Project
- Client sends fake permission
- Model returns unknown action type
- Provider response malformed

Expected:

- System boundaries remain
- Retrieved content treated as data
- Permissions enforced
- No secret exposure
- No cross-user data
- Invalid action rejected
- Project unchanged

---

# 41. Export Release QA

## 41.1 Capability

Verify:

- Only supported formats enabled
- Unsupported formats explain why
- Format enum alone does not activate a format

## 41.2 Prepare

Verify:

- Current Project revision
- Validated Project revision
- Validation state
- Not Run, Running, Stale and Error are not presented as release-ready
- Blocking issues
- Warnings
- Assumptions
- Proposed file name
- Format options

## 41.3 Generate

Verify:

- Correct revision exported
- Critical block enforced
- Warning acknowledgement recorded where allowed
- Loading/progress state
- Failure state
- Retry behaviour
- Project work preserved
- Export Record created

## 41.4 Quick Export

Verify:

- Preset/default is visible
- Format is visible
- User confirms
- Unknown settings are not used silently

---

# 42. SVG QA

Verify:

- Vector paths preserved
- Units correct
- Scale correct
- Cutter boundary correct
- Fold lines separate
- Seal groups meaningful
- Safe zones separate where intended
- Eyemarks correct
- Element/group IDs meaningful where supported
- No UI overlays
- No view-only selection boxes
- Opens in at least one common vector application
- Reimport or parse test where practical

---

# 43. PDF QA

Verify:

- Cutter visible
- Vector content preserved where supported
- Page size sensible
- Scale correct
- Measurements readable
- Line types distinguishable
- No unintended rasterisation
- No clipped content
- Project metadata correct where intended
- Opens in standard PDF viewer

If layers are not preserved by the chosen PDF route, document the limitation honestly.

---

# 44. JSON QA

Verify:

- Schema version
- Project ID
- Project revision
- Pack Specification
- Cutter Specification
- Units
- Assumptions
- Validation summary where intended
- Export metadata
- Parseability
- Runtime schema validation
- Import/migration compatibility where supported

---

# 45. Project Persistence and Database QA

Verify:

- Stable IDs
- UTC timestamps
- Millimetre units
- Pack revision
- Cutter revision
- Project revision
- API/database revision-token mapping
- Active-record references
- Same-Project relationships
- Runtime validation
- Save/reopen
- Archive
- Search
- Migration
- Conflict handling

Test local/mock/remote repository parity where adapters exist.

---

# 46. Migration QA

For each migration:

- Valid old fixture migrates
- Current fixture remains unchanged
- Unsupported version fails clearly
- Unknown engineering fields are preserved or explicitly reported
- Backup exists where practical
- Project revision updates correctly
- Validation re-runs where required
- No silent data loss

Required fixtures:

- Previous schema
- Current schema
- Corrupt schema
- Missing optional field
- Unknown future field
- Invalid geometry

---

# 47. API and Service QA

Verify:

- Standard success/error response
- Request ID
- API version
- Source adapter
- Runtime request validation
- Runtime response validation
- Permission checks
- Revision checks
- Idempotency where required
- Validation Issue separated from API Error
- Recoverable/retryable flags
- No fake success

Integration flows:

- Create Project
- Save Project
- Accept Pack Specification
- Generate Cutter
- Apply Cutter action
- Run Validation
- Prepare Export
- Generate Export
- Request FlowAI explanation
- Apply approved FlowAI action

---

# 48. Error and Empty-State QA

Test:

- Dashboard no Projects
- Search no results
- Pack Gen empty prompt
- Unsupported pack type
- Cutter missing
- Validation not run
- Validation service failure
- FlowAI unavailable
- Export unsupported
- Export failed
- Save failed
- Revision conflict
- Permission denied
- Corrupt Project
- Future feature unavailable

Verify:

- User understands the state
- User knows next action
- No Project data is lost
- No false success is shown
- Technical detail is available where helpful
- Copy matches Klyro tone

---

# 49. UI Design System QA

Verify current Klyro design rules:

- Correct logo variant
- Current font preserved
- Spartan Red used selectively
- Dusky Cream used appropriately
- Dark Charcoal structural surfaces
- Theme tokens used
- No CSS inversion theme hack
- Shared buttons
- Shared panels
- Shared status chips
- Shared modal/drawer behaviour
- Consistent spacing and radius
- No old purple/retired scheme
- No old CutNFlow public-brand chrome
- No duplicate component created unnecessarily

---

# 50. Light and Dark Mode QA

Test every Beta Core route in both themes.

## Light Mode

- Dark/primary Klyro logo visible
- Text readable
- Cards/panels separated
- Inputs visible
- Selected state clear
- Cutter canvas clear
- Validation colours clear
- Disabled controls readable

## Dark Mode

- Reverse/light Klyro logo visible
- Cream/off-white text readable
- Layered charcoal surfaces
- No bright cream foreground blocks left over
- No black text on dark surface
- Inputs and borders visible
- Cutter canvas clear
- Tooltips/modals readable

Test theme change while:

- Dashboard open
- Pack Gen prompt entered
- Cutter Studio open
- Element selected
- Modal open where supported

Theme change must not lose Project state.

---

# 51. Navigation QA

Verify:

- Main tray collapsed by default
- No first-render expansion flash
- Expand/collapse persists as designed
- Active route correct
- Tooltips available in collapsed mode
- Disabled future routes do not navigate
- Artwork Studio marked TBA/unavailable
- Print Config/Preferences unavailable state honest
- Header page pill updates
- Browser refresh retains valid route
- Back/forward navigation works
- No route redirects silently to Dashboard without reason

---

# 52. Responsive QA

Primary screen classes:

- Large desktop
- Standard desktop/laptop
- Narrow desktop
- Tablet-width review
- Mobile basic viewing

Verify:

- Dashboard grid adapts
- Pack Gen hero stacks
- Prompt remains usable
- Main navigation becomes appropriate drawer
- Cutter right panel becomes usable drawer/overlay
- Cutter tools remain accessible
- Modals fit viewport
- No page-level horizontal overflow
- Controls do not disappear
- Touch targets usable

Full Cutter Studio editing is not required as a primary mobile workflow, but basic app viewing must not be broken.

---

# 53. Accessibility QA

Verify:

- Semantic buttons and links
- Input labels
- Accessible icon names
- Visible focus
- Logical tab order
- Modal focus trap
- Focus returns after close
- Escape closes appropriate overlays
- Status not colour-only
- Error linked to field
- Keyboard access to core actions
- Tooltip on focus
- Reduced motion honoured
- Text contrast
- Technical text remains legible
- Dynamic validation status announced appropriately

Automated accessibility scans support but do not replace keyboard/manual review.

---

# 54. Browser QA

Controlled beta priority:

- Current Chrome
- Current Edge

Secondary where practical:

- Firefox
- Safari/macOS
- Mobile Safari/Chrome for basic viewing

Verify:

- Routing
- Local storage/IndexedDB
- SVG rendering
- Canvas interaction
- Downloads
- File upload
- Fonts
- Modals
- Theme
- Keyboard
- Export links
- Clipboard where used

A supported-browser list should be published for beta.

---

# 55. Performance QA

Measure or observe:

- Initial app load
- Dashboard Project load
- Project search
- Project open
- Cutter render
- Zoom/pan responsiveness
- Layers interaction
- Save
- Validation
- Export
- FlowAI response start
- Large Project behaviour

Critical expectations:

- Pointer movement does not trigger a network save for every frame
- Cutter interaction remains responsive
- Validation shows progress
- Export shows progress
- FlowAI supports timeout/cancel handling where implemented
- Re-rendering does not cause visible tool/panel instability

Record actual thresholds when performance baselines are established.

---

# 56. Security and Permission QA

Test:

- Unauthenticated access
- Expired session
- Unauthorised Project read
- Unauthorised Project edit
- Unauthorised export
- Unauthorised FlowAI critical action
- File access
- Signed download expiry
- Invalid input
- Oversized file
- Unsupported file type
- Client-supplied fake role
- Cross-workspace ID manipulation
- Secret leakage in errors/logs

For local-only development mode, document which controls are not yet enforceable.

External beta requires a deliberate access model.

---

# 57. Deployment QA

Verify:

- Correct repository
- Correct branch
- Correct commit
- Build succeeds
- Hosting build completes
- Environment variables present
- Routes work after refresh
- Assets load
- Klyro logo loads in both themes
- API/service endpoint configuration correct
- FlowAI key not exposed to browser
- Downloads work
- Latest commit is live
- Rollback/hotfix route known

Deployment verification must include the deployed commit or build identifier.

---

# 58. Manual Smoke Test

Use after significant changes.

1. Open the deployed or local app.
2. Confirm the Klyro header and collapsed navigation.
3. Open Dashboard.
4. Use Start Here.
5. Enter `20g sauce packet`.
6. Confirm sachet direction.
7. Review assumptions.
8. Continue/create Project.
9. Open Cutter Studio.
10. Confirm cutter renders.
11. Zoom and pan.
12. Select an element.
13. Test Layers synchronisation.
14. Test one permitted Customise change.
15. Run validation.
16. Open Validation Centre.
17. Confirm counts and issue detail.
18. Save Project.
19. Return to Dashboard.
20. Search and reopen Project.
21. Confirm Pack and Cutter state.
22. Open Save/Export.
23. Prepare supported export.
24. Confirm validation behaviour.
25. Generate/download if permitted.
26. Repeat key visual checks in the other theme.
27. Confirm no critical console error.

---

# 59. Beta End-to-End Test

The mandatory beta E2E flow is:

```text
Dashboard
→ create/open Project
→ Pack Gen
→ Prompt or Build Pack
→ accepted Pack Specification
→ Cutter generation
→ Cutter Studio review/edit
→ deterministic validation
→ save
→ close/reload
→ search/open
→ state restoration
→ Export Release
→ supported output
```

Pass requires:

- No developer intervention
- No manual data patch
- No hidden mock success
- Correct Project revision
- Correct validation revision
- Correct exported revision
- No state loss
- No critical geometry defect
- Clear limitations

Run at least one full fixture for every active beta pack type.

---

# 60. Test Data Requirements

Test data should include:

- Empty Project collection
- Draft Project
- In-progress Project
- Needs-attention Project
- Ready-for-export Project
- Exported Project
- Archived Project
- Three-side seal Project
- K-Seal Project
- DOY Project
- Flow-wrap/pillow Project where active
- Project with assumptions
- Project with notes
- Project with Warning
- Project with Critical issue
- Project with no validation
- Project with successful export
- Project with failed export
- Revision-conflict Project
- Old-schema Project
- Corrupt Project
- FlowAI partial response
- FlowAI invalid response
- FlowAI critical action approval

Use stable fixture IDs and timestamps.

---

# 61. Regression Suite

The core regression suite should verify:

- App loads
- Header/navigation
- Dashboard
- Recent Projects
- Search
- Project create
- Project save
- Project reopen
- Prompt Pack Gen
- Build Pack
- Sachet recommendation
- K-Seal generation
- DOY unaffected by K-Seal changes
- Cutter render
- Zoom/pan
- Selection
- Layers
- Customise
- Eyemark
- Validation
- FlowAI explanation
- Export preparation
- Supported export
- Light mode
- Dark mode
- Build/type checks
- No critical console error

Every fixed bug should add or update a regression check where practical.

---

# 62. High-Risk Areas

High-risk areas include:

- Project persistence
- Saved-data migration
- Pack inference
- Pack-to-Cutter conversion
- K-Seal support arms
- Eyemark placement
- Slit tolerance
- Pack-specific validators
- Validation severity
- Export blocking
- Vector export
- Cutter selection/resize/rotate
- Layers synchronisation
- Theme switching
- FlowAI critical actions
- Deployment branch/commit mismatch

Changes in these areas require focused tests plus the relevant core regression checks.

---

# 63. Bug Severity

## Critical

Examples:

- Data loss
- Project cannot open
- Invalid geometry exported without required block
- Critical validation bypassed
- Cross-user data exposure
- Production-critical AI action applied without approval
- App unavailable for all users
- Corrupt migration destroys Projects

## High

Examples:

- Core beta workflow blocked
- Supported pack generates materially wrong geometry
- Save/reopen loses important state
- Validation severity materially wrong
- Supported export unusable
- Cutter tools unusable
- Authentication/permission failure with serious impact

## Medium

Examples:

- Important secondary action broken
- Incorrect non-blocking status
- Theme defect affecting readability
- Responsive defect on supported desktop width
- Warning text misleading but not dangerous
- Workaround exists

## Low

Examples:

- Minor spacing
- Non-critical copy
- Small visual inconsistency
- Cosmetic icon issue
- Rare non-blocking edge case

Severity is impact.

Priority may also consider frequency, release timing and effort.

---

# 64. Bug Report Template

```text
Bug ID:
Title:
Module:
Pack Type:
Environment:
App Commit / Build:
Project / Fixture:
Preconditions:
Steps to Reproduce:
Expected Result:
Actual Result:
Engineering Impact:
Data-Loss Risk:
Export Risk:
Screenshots / Files:
Console / Logs:
Severity:
Regression:
Likely Area:
Workaround:
Status:
```

Do not include customer-sensitive data in a broadly shared bug report.

---

# 65. Acceptance Criteria Template

```text
Feature / Fix:
Source Requirement:
Affected Module:
Pack Types:
Current Behaviour:
Required Behaviour:
Engineering Constraints:
State / Persistence Impact:
Validation Impact:
Export Impact:
AI Impact:
Do Not Change:
Acceptance Criteria:
Automated Tests:
Manual Tests:
Regression Tests:
Evidence Required:
Known Limitations:
```

Acceptance criteria should be measurable.

Avoid:

`Make it look better.`

Prefer:

`The Cutter Studio tool dock remains 16–24 px from the top of the usable workspace and does not move when the canvas pans or zooms.`

---

# 66. Codex Completion Report

Codex should report:

```text
Summary:
Files Changed:
Domain/Schema Changes:
Tests Added or Updated:
Commands Run:
Results:
Manual QA Still Required:
Migration Impact:
Known Limitations:
Regression Risk:
Recommended Next Action:
```

Do not expose hidden reasoning.

Report decisions and evidence.

---

# 67. Automated Test Roadmap

Recommended sequence:

1. Add runtime Project-schema tests.
2. Add Project save/reopen tests.
3. Add Pack Gen inference tests.
4. Add engineering-default tests.
5. Add Pack Service tests.
6. Add K-Seal geometry tests.
7. Add DOY regression tests.
8. Add eyemark/slit-tolerance tests.
9. Add validation-rule tests.
10. Add Cutter action tests.
11. Add FlowAI schema and safety tests.
12. Add Export Service tests.
13. Add service/repository contract tests.
14. Add core route smoke tests.
15. Add beta E2E tests.
16. Add visual regression only after core layout stabilises.

Automated coverage should expand around high-risk deterministic behaviour first.

---

# 68. Recommended Tool Direction

Use the repository’s existing tools where possible.

A typical Vite/TypeScript direction may use:

- Vitest for unit/integration tests
- React Testing Library for component behaviour
- Playwright for end-to-end tests
- Runtime schema library tests
- Accessibility scanning as supporting evidence

Do not introduce a new test framework without checking the current stack and maintenance cost.

---

# 69. Airtable QA Alignment

Retain existing CNF IDs where practical.

Suggested updated actions:

- `CNF-2301` — Complete Klyro Testing & QA v2.1
- `CNF-2302` — Create Pack Gen prompt and expected-output fixtures
- `CNF-2303` — Create supported pack-type expectation matrix
- `CNF-2304` — Create pack-specific Cutter geometry regression suite
- `CNF-2305` — Create deterministic validation-rule suite
- `CNF-2306` — Create Export Release QA suite
- `CNF-2307` — Create Klyro UI and accessibility smoke checklist
- `CNF-2308` — Create pre-deployment regression and beta release gate
- `CNF-2309` — Create Project save/reopen and migration test suite
- `CNF-2310` — Create FlowAI schema, safety and approval suite
- `CNF-2311` — Create full beta end-to-end suite

Recommended Airtable fields:

- QA Status
- Test Level
- Source Requirement
- Fixture
- Environment
- App Commit
- Evidence
- Result
- Regression Added
- Release Gate
- Blocker
- Retest Required

Completion of this document is documentation completion, not completion of the test suites.

---

# 70. Current QA Priority

Current priority order:

1. Complete source consistency checks.
2. Audit the real repository and existing test setup.
3. Establish build/type baseline.
4. Test Project create/save/search/reopen.
5. Test Prompt and Build Pack parity.
6. Create Pack Gen prompt fixtures.
7. Create K-Seal geometry fixtures.
8. Create DOY and sachet regression fixtures.
9. Test Cutter selection, Layers and Customise.
10. Create deterministic validation tests.
11. Test shared validation state.
12. Create Export Release checks.
13. Create FlowAI safety and schema tests.
14. Run full beta E2E.
15. Complete accessibility/browser/deployment gates.

---

# 71. Source Ownership

This document controls:

- Test strategy
- QA status
- Test levels
- Test matrices
- Regression expectations
- Bug severity
- Acceptance-criteria format
- Evidence requirements
- Beta quality gates
- Release QA

Other sources control:

- `01_Product_Architecture.md` — product hierarchy and beta scope
- `04_Engineering_Knowledge_Base.md` — engineering rules and expected values
- `05_API_Architecture.md` — API/service contracts
- `06_Database_Schema.md` — persistent entities and migration requirements
- `07_UI_Design_System.md` — accepted layout and interaction behaviour
- `08_AI_Architecture.md` — FlowAI semantics and safety
- `09_Development_Roadmap.md` — sequencing and milestones
- `11_Marketing_Website.md` — public claims and website content

When a test expectation conflicts with a validated engineering rule, the Engineering Knowledge Base controls the engineering expectation.

When a test includes a post-beta module, it must be labelled post-beta and must not become a beta release blocker.

---

# 72. Final QA Rule

Klyro testing must prove that the product is:

- Connected
- Engineering-aware
- Pack-specific
- Project-centred
- Saveable
- Recoverable
- Validation-driven
- FlowAI-safe
- Export-capable
- Theme-consistent
- Accessible
- Honest about limitations
- Ready for controlled beta use

The first beta is successful only when a user can complete the supported workflow, leave, return and trust that the technical Project remains intact.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Added the shared Not Run, Running, Passed, Failed, Stale and Error validation lifecycle to release gates.
- Added Passed-with-Warnings testing.
- Added stale-validation and validation-service-error fixtures.
- Added validated-versus-current Project revision checks.
- Added `ready_for_export` invalidation tests.
- Added API/database revision-token mapping checks.
- Required Export Release to reject false current-validation readiness.

## Version 2.1 — 19 July 2026

- Reframed Testing & QA from CutNFlow platform QA to Klyro beta QA.
- Defined Klyro, Klyro App, CnF Tech and FlowAI testing boundaries.
- Removed references to the nonexistent `00_Master_Context.md`.
- Removed required dependencies on unconfirmed Development Standards and Decision Log sources.
- Replaced the old full-platform QA list with Beta Core and post-beta boundaries.
- Removed the old command-centre Dashboard and Project Workspace modal expectations.
- Updated Dashboard, Pack Gen and Cutter Studio tests to current approved UI.
- Added Project lifecycle, revision-conflict, migration and data-loss gates.
- Added Prompt and Build Pack parity testing.
- Updated engineering defaults to 15 mm generic seal fallback, 3 mm bleed, 5 mm safe zone, 3 mm fold clearance and 15 × 5 mm eyemark.
- Added detailed K-Seal geometry and regression testing.
- Added DOY isolation and sachet tests.
- Added eyemark and slit-tolerance tests.
- Standardised deterministic validation severity and unknown-geometry behaviour.
- Added shared Validation Result consistency checks.
- Added FlowAI schema, safety, permission and approval testing.
- Added export preparation, capability and revision testing.
- Added API, database, repository and migration QA.
- Strengthened light/dark, navigation, responsive and accessibility QA.
- Added beta release gates, evidence standards and deployment commit verification.
- Added Airtable QA mapping and expanded automated-test roadmap.
