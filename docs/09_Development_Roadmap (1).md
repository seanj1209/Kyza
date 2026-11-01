---
document_name: Kyza Development Roadmap
file_name: 09_Development_Roadmap.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Kyza
last_reviewed: 2026-07-19
source_replaces: 09_Development_Roadmap.md v1.0
authority: Delivery sequence, release tracks, milestones, phase gates, current programme direction and beta readiness
related_sources:
  - 01_Product_Architecture.md
  - 04_Engineering_Knowledge_Base.md
  - 05_API_Architecture.md
  - 06_Database_Schema.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 10_Testing_QA.md
  - 11_Marketing_Website.md
---

# Kyza Development Roadmap

## Document Purpose

This document defines the delivery roadmap for Kyza.

It converts the approved product architecture into an ordered programme of work leading towards a controlled beta, followed by post-beta expansion.

This document owns:

- Development sequencing
- Release tracks
- Milestones
- Phase gates
- Current programme priorities
- Beta scope and launch readiness
- Dependencies between product areas
- Gemini and Codex delivery workflow
- Roadmap-level risk control
- Definition of phase completion

This document does not replace Airtable.

Airtable is the active action tracker for individual tasks, owners, KYZA IDs, priorities, dependencies, evidence and sprint assignment.

This roadmap defines why work is being performed, the order in which it should be performed and the conditions required to move to the next phase.

`01_Product_Architecture.md` controls product hierarchy and module responsibilities.

`07_UI_Design_System.md` controls approved visual and interaction direction.

There is no separate `00_Master_Context.md`.

---

# 1. Product Context

## 1.1 Kyza

Kyza is the master customer-facing brand.

It includes:

- The public Kyza website
- The Kyza App
- Customer-facing services
- Account and access experiences
- Product positioning
- The shared visual and interaction system

## 1.2 Kyza App

The Kyza App is the main working product environment.

The initial beta is centred on a connected workflow across:

- Dashboard
- Pack Gen
- Cutter Studio
- Validation Centre
- Export Release
- Account & Specs

## 1.3 Kyza / Kyza Tech

Kyza/Kyza Tech is the underlying packaging-engineering capability.

It provides or will provide:

- Pack specification logic
- Pack-type rules
- Cutter generation
- Geometry
- Attributes
- Deterministic validation
- Structured technical output

## 1.4 FlowAI

FlowAI is the intelligence, explanation and guided-assistance layer.

Its first practical roles are:

- Pack Gen prompt interpretation
- Assumption identification
- Validation explanation
- Guided correction
- Engineering assistance

FlowAI does not replace deterministic engineering or validation authority.

---

# 2. Roadmap Objective

The immediate objective is to deliver a controlled Kyza beta that proves one complete and reliable packaging-engineering journey.

The beta must allow a user to:

1. Enter the Kyza App.
2. Create or open a Project.
3. Begin through Pack Gen.
4. Use either a natural-language prompt or Build Pack.
5. Produce a structured Pack Specification.
6. Generate and open a cutter.
7. Review and safely edit the cutter in Cutter Studio.
8. Run or review minimum viable validation.
9. Save the Project.
10. Reopen the Project with required state intact.
11. Export a supported technical output.
12. Understand assumptions, warnings and limitations.

The roadmap must not prioritise a large number of incomplete modules over this connected journey.

---

# 3. Current Programme Position

As of 19 July 2026:

## 3.1 Brand and Product Direction

Established direction:

- Kyza is the customer-facing brand.
- The Kyza App is the main connected workspace.
- Kyza/Kyza Tech is the underlying engineering capability.
- FlowAI is the intelligence and validation-explanation layer.
- The product is project-centric.
- Beta delivery takes priority over full long-term platform breadth.

## 3.2 Public Website

The Kyza public website exists as a developed concept and working site.

Current limitations include:

- It is not yet the active launch website.
- It requires copy refinement.
- It requires real app screenshots.
- Feature descriptions must be aligned with actual beta capability.
- It does not currently provide a public link into the development app.

The public website is not the immediate engineering priority.

It should be aligned after the core beta workflow is stable enough to demonstrate honestly.

## 3.3 Kyza App UI

The Kyza App has been visually reworked from the previous Kyza presentation.

Approved current directions include:

- Revised global top header
- Collapsible left navigation tray
- Left navigation collapsed by default
- Revised Dashboard
- Revised Pack Gen
- Revised Cutter Studio layout
- On-canvas horizontal Cutter Studio tool dock
- Right-side Base, Attributes, Customise and Layers organisation
- Roundel actions for Pack Spec, Import and Save/Export
- Revised Layers panel
- Revised Customise panel
- Kyza light and dark theme direction

These are approved design directions.

Each must still be verified in the real application as:

- Implemented
- Connected to existing state
- Responsive
- Accessible
- Free from regression
- Compatible with saved Projects

Visual completion alone does not make the feature complete.

## 3.4 Core Engineering

Existing engineering work includes support or partial support for:

- Pack-type generation
- Cutter rendering
- Pack-specific rules
- Eyemarks
- Seals
- Safe zones
- Fold lines
- Attributes
- Validation
- SVG/PDF-related export work
- State retention within current studio workflows

The detailed engineering status must be verified against the code and `04_Engineering_Knowledge_Base.md`.

The roadmap must not assume every documented engineering rule is fully implemented.

## 3.5 Areas Not Yet Reworked

The following areas have not yet received the same product and UI realignment:

- Validation Centre
- Export Release
- Account & Specs
- AI & Press Config
- Print Config
- Preferences

Artwork Studio remains post-beta/TBA unless the release boundary is changed deliberately.

---

# 4. Development Principles

Kyza development must follow these principles.

1. Build incrementally.
2. Preserve working behaviour unless a task explicitly replaces it.
3. Keep Project data central.
4. Avoid large rewrites where controlled adaptation is possible.
5. Separate engineering logic from UI presentation.
6. Separate deterministic validation from FlowAI explanation.
7. Use shared types, services and state.
8. Avoid duplicate stores, routes, panels and modals.
9. Connect visual controls to real application behaviour.
10. Test each meaningful change.
11. Record limitations honestly.
12. Do not activate unavailable features with empty pages.
13. Keep beta scope controlled.
14. Use Gemini for approved visual exploration.
15. Use Codex/VS Code for real implementation and integration.
16. Keep `/docs` in GitHub as the master source of documentation truth.
17. Keep Project Sources as reference copies of the current GitHub documents.
18. Keep Airtable as the active action tracker, not the product source of truth.
19. Preserve pack-specific engineering protections.
20. Require human approval for release-critical AI suggestions.

---

# 5. Roadmap Status Vocabulary

Use the following status values consistently.

## Not Started

No approved implementation work has begun.

## Planned

The requirement is accepted and sequenced, but implementation has not begun.

## In Progress

Implementation or source adaptation is actively underway.

## Implemented — Awaiting QA

The code or document exists, but the acceptance criteria have not been fully verified.

## Ready for Beta

The feature meets the defined beta scope and has passed required tests.

## Done

The work is complete for its intended release boundary and evidence has been recorded.

## Blocked

Work cannot proceed because a named dependency, decision or defect is unresolved.

## Superseded

The task or direction has been replaced by a newer approved requirement.

## Post-Beta

The capability remains valid but is not required for the initial beta.

Do not mark work Done only because a screen is visually present.

---

# 6. Release Tracks

## 6.1 Track A — Source and Programme Re-baseline

Purpose:

- Align product sources with Kyza
- Remove obsolete dependencies
- Establish one authoritative version per source
- Rebuild Airtable around beta delivery
- Remove duplicated and superseded actions

## 6.2 Track B — Beta Core

Purpose:

- Deliver the complete Project → Pack Gen → Cutter Studio → Save/Reopen workflow

Includes:

- App shell
- Dashboard
- Project lifecycle
- Pack Gen
- Build Pack
- Cutter Studio
- Shared Project state

## 6.3 Track C — Beta Launch Gates

Purpose:

- Make the beta responsible and releasable

Includes:

- Validation Centre MVP
- Export Release MVP
- Account & Specs essentials
- Error recovery
- Testing
- Performance
- Browser checks
- Feedback capture
- Documentation

## 6.4 Track D — Limited Beta / Presentational

Purpose:

- Show planned product direction without creating false functionality

May include:

- Template previews
- Template Library entry
- AI & Press Config shell
- Disabled Print Config
- Disabled Preferences
- Disabled Artwork Studio

## 6.5 Track E — Post-Beta Expansion

Includes:

- Artwork Studio
- Artwork validation
- Advanced FlowAI
- Full Template Library
- Print and press configuration
- Customer and printer profiles
- Knowledge Base interface
- Reports
- Administration
- Company workspaces
- Advanced release packages
- Commercial systems

---

# 7. Milestone Overview

The revised delivery sequence is:

1. Source and Airtable Re-baseline
2. Current App and Code Baseline
3. App Shell and Approved UI Stabilisation
4. Project Lifecycle Foundation
5. Pack Gen Beta Completion
6. Cutter Studio Beta Stabilisation
7. Validation Centre MVP
8. Export Release MVP
9. Account & Specs Essentials
10. End-to-End Beta Integration
11. Beta Hardening and Controlled Release
12. Public Website Beta Alignment
13. Post-Beta Artwork and Production Expansion
14. Commercial Readiness

Milestones may overlap where dependencies are controlled.

They must not be reordered simply because a future module is visually appealing.

---

# 8. Milestone 1 — Source and Airtable Re-baseline

## Goal

Create a reliable Kyza-aligned source set and convert it into a streamlined beta action plan.

## Current Status

**In Progress — source set aligned; Airtable re-baseline pending**

## Completed Source Work

The active Kyza v2.1 source set has been audited, adapted and cross-checked:

1. `01_Product_Architecture.md`
2. `04_Engineering_Knowledge_Base.md`
3. `05_API_Architecture.md`
4. `06_Database_Schema.md`
5. `07_UI_Design_System.md`
6. `08_AI_Architecture.md`
7. `09_Development_Roadmap.md`
8. `10_Testing_QA.md`
9. `11_Marketing_Website.md`

Cross-source alignment confirmed:

- Kyza is the master customer-facing brand.
- Kyza App is the connected working environment.
- Kyza/Kyza Tech is the deterministic packaging-engineering capability.
- FlowAI is the intelligence, explanation and guided-assistance layer.
- Project is the parent object.
- Beta Core and launch-gate boundaries are consistent.
- Validation lifecycle and Project revision rules are shared.
- Artwork Studio, advanced production configuration and administration remain post-beta.

## Source Governance Rules

- Do not recreate a nonexistent `00_Master_Context.md` merely because an old roadmap listed it.
- `01_Product_Architecture.md` currently owns top-level product context.
- Do not retain duplicate active source variants.
- Rename or archive superseded copies.
- Update cross-references when a source name changes.
- GitHub `/docs` remains the master source.
- Project Sources contain current uploaded reference copies.
- Long sources should remain downloadable `.md` files.

## Airtable Re-baseline

With the source set aligned:

- Export or review the current Airtable actions.
- Retain KYZA IDs where practical.
- Update wording rather than creating unnecessary replacements.
- Mark obsolete tasks Superseded.
- Move future work to Post-Beta.
- Add Launch Track.
- Add Source Document.
- Add Requirement Reference.
- Add Release Gate.
- Add Evidence / Test Result.
- Reduce the main working view to beta-relevant actions.

## Gate to Exit Milestone

This milestone is complete when:

- Each real source has one authoritative active version.
- Product terminology is consistent.
- Beta and post-beta requirements are separated.
- Cross-references are accurate.
- Airtable reflects the revised source set.
- No active Airtable task relies on the nonexistent Master Context.
- The next implementation milestone can be selected from evidence rather than assumption.

---

# 9. Milestone 2 — Current App and Code Baseline

## Goal

Establish what is genuinely implemented before creating a new implementation sprint.

## Status

**Planned**

## Required Audit

Review the real repository and identify:

- Current routes
- Current application shell
- Project state source
- Pack Gen state and handlers
- Manual Build Pack component
- Cutter Studio state and geometry sources
- Validation engine and rules
- Export formats and handlers
- Account/user state
- Theme tokens
- Saved-project persistence
- Mock versus real data
- Dead or duplicated components
- Current test coverage
- Current build and TypeScript status

## Required Output

Create an implementation baseline containing:

- Implemented and verified
- Implemented but unverified
- Partially implemented
- UI only
- Mock only
- Not implemented
- Broken or regressed
- Duplicate or superseded
- Post-beta

## Gate to Exit Milestone

- The app builds successfully or all build blockers are recorded.
- The current primary routes are known.
- The real source of Project state is known.
- The real source of Pack and Cutter state is known.
- Existing save/reopen behaviour is understood.
- Existing validation and export capability is documented.
- The next sprint is based on the code baseline.

---

# 10. Milestone 3 — App Shell and Approved UI Stabilisation

## Goal

Ensure the approved Kyza shell and recently revised pages are implemented correctly in the real app.

## Status

**Implemented in part / requires verification**

## Scope

### Global Shell

- Kyza top header
- Dynamic active-page pill
- Utility and user controls
- Correct light/dark logo
- Left tray navigation
- Collapsed-by-default state
- No first-render open/close flash
- Correct route grouping
- Disabled future items

### Dashboard

- Hero
- Start Here
- Quick Links
- Project search
- Recent Projects
- Real project connections where available

### Pack Gen

- Hero
- Build Pack
- Prompt composer
- Generate Pack
- Template previews
- Removal of the Pack Selector slider

### Cutter Studio

- Status strip
- On-canvas horizontal toolbar
- Right Base/Attributes/Customise/Layers organisation
- Pack Spec/Import/Save-Export roundels
- Revised Layers panel
- Revised Customise panel

## Constraints

- Do not change engineering geometry during visual stabilisation.
- Do not create duplicate state.
- Do not replace existing handlers with mock actions.
- Preserve saved-project compatibility.
- Preserve zoom, pan and selected-element behaviour.
- Keep future routes unavailable until functional.

## Gate to Exit Milestone

- Approved layouts are present in the real app.
- Controls invoke existing real behaviour.
- Light mode passes visual checks.
- Dark mode passes visual checks.
- Desktop and narrower layouts are usable.
- No duplicate menus or stores remain.
- No console, import or TypeScript errors remain.
- Existing supported Projects still open.
- Cutter geometry remains unchanged by UI-only work.

---

# 11. Milestone 4 — Project Lifecycle Foundation

## Goal

Make Project the reliable shared object across beta modules.

## Status

**Critical — implementation status to be verified**

## Beta Project Requirements

A user must be able to:

- Create a Project
- Enter or edit Project identity
- Save a Project
- Update a Project
- Search Projects
- See recent Projects
- Open a Project
- Restore Pack Specification
- Restore Cutter Specification
- Restore relevant notes and assumptions
- Restore validation state where appropriate
- Preserve last-updated data
- Recover safely from missing or invalid stored data

## Shared Types

Required or equivalent shared types include:

- Project
- ProductInformation
- PackSpecification
- CutterSpecification
- EngineeringAssumption
- ValidationSummary
- ValidationIssue
- ExportRecord
- UserPreference

Artwork-specific structures may remain post-beta.

## Persistence Strategy

The controlled beta may use the existing persistence method only if it is reliable for the release audience.

Before external beta, confirm whether the release requires:

- Local persistence
- File-based Project storage
- Hosted database
- Authentication
- User-specific Project access

Do not postpone this decision until after beta testing begins.

## Gate to Exit Milestone

- Dashboard and search use the same Project source.
- Pack Gen creates or updates the shared Project.
- Cutter Studio reads and writes the shared Project.
- Save and reopen preserve the required beta state.
- No module maintains an incompatible second Project model.
- Persistence limitations are documented.
- Recovery behaviour is tested.

---

# 12. Milestone 5 — Pack Gen Beta Completion

## Goal

Complete both primary Pack Gen entry paths and connect them to the shared Project model.

## Status

**In Progress / requires implementation verification**

## Prompt Route

Required flow:

```text
Prompt
→ interpretation
→ Pack Specification proposal
→ assumptions and missing information
→ user continuation
→ Project update
→ Cutter generation
```

## Build Pack Route

Required flow:

```text
Build Pack
→ existing manual builder
→ pack inputs
→ Pack Specification
→ Project update
→ Cutter generation
```

Both routes must create compatible Pack Specifications.

## Beta Pack Types

The exact supported beta pack-type list must be confirmed against the engineering source and code.

Only genuinely supported pack types should be presented as active.

## Required Behaviour

- Common prompts produce sensible pack starting points.
- Sachet/packet prompts do not default to unrelated pouch formats.
- Known dimensions are retained.
- Missing critical information is identified.
- Assumptions are visible.
- Generate Pack prevents duplicate submission.
- Empty prompt handling is clear.
- Build Pack preserves current manual options.
- Both routes continue into Cutter Studio.
- Template previews remain honest where not functional.

## FlowAI Boundary

FlowAI may interpret and explain.

Pack and Cutter services must create structured engineering data.

## Gate to Exit Milestone

- Prompt route creates a valid shared Pack Specification.
- Build Pack creates the same compatible structure.
- Both routes can generate/open a cutter.
- Assumptions are recorded.
- Invalid or incomplete input is handled.
- Supported prompts have regression tests.
- Saved Pack Gen state can be reopened.

---

# 13. Milestone 6 — Cutter Studio Beta Stabilisation

## Goal

Make Cutter Studio reliable enough for controlled engineering use within the beta boundary.

## Status

**In Progress**

## Required Capability

- Render the current Cutter Specification
- Keep the cutter sharp and readable
- Support zoom
- Support pan
- Support fit/reset view
- Support permitted selection
- Protect required geometry
- Show measurements
- Show supported attributes
- Use Layers as a real view of cutter state
- Use Customise for visual properties only
- Preserve state while panels change
- Save changes to the Project
- Open Pack Spec
- Import supported items
- Open Save/Export

## Pack-Specific Validation

Existing pack-specific rules must remain authoritative.

The roadmap must not replace them with a single generic visual check.

## K-Seal and Other Active Engineering Work

Pack-type geometry changes such as:

- K-seal support arms
- Eyemark defaults
- Tac-hole limits
- Seal blending
- Dimension labels

must be tracked as focused engineering tasks with:

- Source rule
- Acceptance criteria
- Visual evidence
- Regression coverage
- Pack-type scope

They must not be hidden inside broad Cutter Studio redesign tasks.

## Gate to Exit Milestone

- Supported cutters render correctly.
- Geometry rules remain pack-specific.
- Zoom, pan and selection are reliable.
- Required elements cannot be accidentally removed.
- Layers and canvas selection stay synchronised.
- Lock, visibility and permitted delete work.
- Customise does not alter dimensions accidentally.
- Save/reopen preserves cutter state.
- UI changes do not regress engineering output.
- Key pack types have regression tests.

---

# 14. Milestone 7 — Validation Centre MVP

## Goal

Deliver the minimum validation experience required for a responsible beta.

## Status

**Not reworked / planned**

## Deterministic Validation

The validation engine owns:

- Rule result
- Severity
- Affected element
- Pass/fail state
- Export-blocking state

FlowAI may explain the result.

## Minimum Beta Scope

- Validation Not Run
- Validation Running
- Validation Passed
- Validation Failed
- Validation Stale
- Validation Error
- Critical issue count
- Soft issue/warning count
- Practical issue message
- Affected module
- Affected element where available
- Why the issue matters
- Suggested next step
- Re-run after change
- Export blocking state
- Status reflected in Cutter Studio

## Initial Rule Scope

The first validated rule set should focus on the pack types and features active in beta.

Potential areas include:

- Dimensions
- Seal width
- Safe-zone clearance
- Fold-line clearance
- Eyemark placement
- Tear notch placement
- Zip clearance
- Perforation placement
- Gusset logic
- Protected geometry
- Export readiness

The exact rules and thresholds belong in `04_Engineering_Knowledge_Base.md`.

## Gate to Exit Milestone

- Validation results attach to the Project.
- Severity is consistent.
- Passed means the current revision has no open Critical issues; Warnings and Advisories may remain.
- Failed means the current revision has one or more open Critical issues.
- Engineering changes make prior validation Stale.
- Critical and soft issues are distinguished.
- Cutter Studio status reflects the same result source.
- Issue detail is understandable.
- Revalidation updates state.
- Export receives validation for the current Project revision.
- FlowAI explanation cannot override deterministic result.

---

# 15. Milestone 8 — Export Release MVP

## Goal

Create a controlled route from Project state to supported technical output.

## Status

**Existing capability requires audit and realignment**

## Minimum Beta Scope

- Save Project remains separate from export
- Existing working export formats only
- Clear format selection
- File naming
- Validation status
- Warning or block for critical issues
- Export loading state
- Export failure state
- Successful download/release confirmation
- Basic Export Record attached to Project

## Export and Quick Export

The Dashboard Export action may expose:

- Export
- Quick Export

Quick Export must show the selected default or preset before confirmation.

## Format Policy

Potential formats include:

- PDF
- SVG
- JSON
- DXF later
- AI later

Only formats that pass the required output checks may be shown as active.

## Gate to Exit Milestone

- At least one technically useful vector output passes QA.
- Required cutter layers remain distinguishable.
- File naming works.
- Critical validation state is respected.
- Export errors do not lose Project work.
- Export Record is created or the limitation is documented.
- Quick Export cannot silently use unknown settings.

---

# 16. Milestone 9 — Account & Specs Essentials

## Goal

Provide the minimum user and saved-default experience required for beta.

## Status

**Not reworked / planned**

## Beta Scope

Potential essentials:

- User name or identity
- Unit preference
- Basic account information
- Saved pack defaults
- Cutter defaults
- Export defaults
- Basic specification preferences
- Theme preference where not already global

## Exclusions

Not required for the first controlled beta unless the release model requires them:

- Billing
- Subscription management
- Company workspaces
- Complex permissions
- Customer portals
- Full team administration
- Advanced audit controls

## Gate to Exit Milestone

- Required user preferences persist.
- Units are consistent across the app.
- Saved defaults do not override Project-specific values silently.
- Account pages use real or clearly labelled development data.
- Unimplemented commercial functions are not shown as working.

---

# 17. Milestone 10 — End-to-End Beta Integration

## Goal

Prove the complete beta workflow as one connected product.

## Status

**Planned**

## Required Scenario

```text
Open Kyza
→ create Project
→ enter Pack Gen
→ use Prompt or Build Pack
→ review Pack Specification
→ generate cutter
→ edit safely in Cutter Studio
→ run validation
→ resolve or acknowledge issues
→ save Project
→ reopen Project
→ export supported output
```

## Integration Checks

- Route transitions preserve state.
- Back and forward navigation do not corrupt Project data.
- Project status updates consistently.
- Dashboard recency updates.
- Validation state is shared.
- Export uses current Project state.
- Unsaved changes are handled.
- Loading and failures are recoverable.
- Disabled post-beta routes remain honest.

## Gate to Exit Milestone

- The full workflow passes without manual developer intervention.
- At least one supported pack type completes the full journey.
- Additional beta pack types pass their defined path.
- Save/reopen is reliable.
- Validation and export share the correct Project revision.
- No critical open integration defect remains.

---

# 18. Milestone 11 — Beta Hardening and Controlled Release

## Goal

Prepare Kyza for controlled use by selected beta participants.

## Status

**Planned**

## Quality Work

- Unit and rule tests
- Integration tests
- End-to-end workflow tests
- Browser compatibility
- Light/dark checks
- Responsive checks
- Accessibility checks
- Performance review
- Build and TypeScript checks
- Save/recovery checks
- Export output review
- Validation regression
- Error-message review
- Security review appropriate to the release model

## Beta Operations

- Define beta audience
- Define access method
- Define supported browsers
- Define supported pack types
- Define known limitations
- Define feedback route
- Define issue triage process
- Define rollback or hotfix process
- Define release notes
- Define data backup/recovery where applicable
- Add production disclaimers
- Add basic user guidance

## Beta Release Gate

The beta may begin only when:

- Beta Core workflow passes.
- Critical validation and export gates work.
- Project persistence is appropriate for the beta audience.
- No known data-loss defect remains.
- No known critical geometry regression remains.
- Supported pack types are explicitly listed.
- Known limitations are documented.
- Feedback and issue response routes exist.
- The current deployed build matches the approved commit.
- The website and app do not overstate capability.

---

# 19. Milestone 12 — Public Website Beta Alignment

## Goal

Align the Kyza public website with the product that can actually be demonstrated.

## Status

**Planned after beta workflow stabilisation**

## Required Work

- Replace concepts with real app screenshots
- Refine feature wording
- Present Kyza as the master brand
- Explain Kyza Tech only where useful
- Present FlowAI accurately
- Separate current and future capability
- Add beta access, waitlist or login route as appropriate
- Update legal and production disclaimers
- Update SEO metadata
- Confirm responsive behaviour
- Confirm light/dark brand assets
- Remove claims that cannot be demonstrated

## Gate to Exit Milestone

- Website language matches the current beta.
- Screenshots match the deployed app.
- CTAs lead to real destinations.
- Future modules are not presented as available.
- Beta access path is clear.
- The development environment is not exposed unintentionally.

---

# 20. Post-Beta Phase A — Artwork Studio

## Goal

Add connected artwork preparation and preflight after the core cutter workflow is reliable.

## Planned Scope

- Artwork upload
- Artwork canvas
- Cutter overlay
- Bleed overlay
- Safe-zone overlay
- Selection and placement
- Barcode and QR review
- Colour summary
- White-plate summary
- Varnish/lacquer summary
- Artwork validation
- FlowAI artwork guidance
- Export Release handoff

## Entry Gate

Artwork Studio should not become an active delivery priority until:

- Project lifecycle is reliable.
- Cutter Studio is stable.
- Validation architecture is established.
- Export Release is working.
- Artwork data structures are aligned with the shared Project.

---

# 21. Post-Beta Phase B — Advanced FlowAI and Knowledge

## Planned Scope

- Rich validation explanation
- Contextual cutter guidance
- Engineering knowledge retrieval
- Guided issue resolution
- Pack recommendation improvement
- Assumption comparison
- Press-aware advice
- Customer and printer rule explanation
- Future standalone assistant interface where justified

## Constraints

- Deterministic rules remain authoritative.
- AI actions require approval.
- Confidence and assumptions remain visible.
- AI must use structured Project context.
- AI must not become a generic disconnected chatbot.

---

# 22. Post-Beta Phase C — Templates and Configuration

## Planned Scope

- Functional Template Library
- Create Project from template
- Save as template
- Customer templates
- Printer templates
- AI & Press Config
- Print Config
- Press profiles
- Substrate constraints
- Repeat and web-width constraints
- LPI and plate settings
- White and varnish capability
- Customer-specific rules
- Printer-specific rules

These capabilities should be layered onto the established Project, Validation and Export architecture.

---

# 23. Post-Beta Phase D — Reports, Administration and Workspaces

## Planned Scope

- Company workspaces
- Users
- Roles
- Permissions
- Project assignment
- Approval workflow
- Export history
- Validation trends
- Activity reporting
- Customer or printer review
- Audit logs
- Workspace configuration

These are not initial beta requirements.

---

# 24. Commercial Readiness

## Goal

Prepare Kyza for broader availability and commercial use.

## Planned Work

- Pricing strategy
- Subscription and billing
- Onboarding
- Help documentation
- Demo Projects
- Customer support process
- Terms and privacy
- Production disclaimers
- Analytics
- Backup and retention policy
- Service monitoring
- Release management
- Support SLAs where appropriate
- Commercial export packages
- Security and permission hardening

## Commercial Gate

Commercial launch requires:

- Reliable beta evidence
- Clear supported capability
- Stable persistence
- User and access control
- Operational support
- Legal and privacy coverage
- Appropriate security review
- Repeatable deployment
- Product documentation
- Customer onboarding

---

# 25. Current Priority Order

With the source set cross-aligned, priority is:

1. Re-baseline Airtable against the Kyza v2.1 source set.
2. Audit the real repository against the updated sources.
3. Verify the app shell and recent UI amendments.
4. Stabilise Project create/save/search/reopen.
5. Complete Pack Gen Prompt and Build Pack connection.
6. Stabilise Cutter Studio.
7. Build Validation Centre MVP.
8. Build Export Release MVP.
9. Complete Account & Specs essentials.
10. Run end-to-end beta integration.
11. Harden and release controlled beta.
12. Align the public website.
13. Begin Artwork Studio and advanced expansion.

---

# 26. Immediate Next Actions

After the cross-source check:

1. Re-baseline Airtable using the updated release tracks and source requirements.
2. Mark obsolete or duplicate actions Superseded.
3. Separate Beta Launch and Post-Beta views.
4. Audit the current repository and deployed app.
5. Identify the canonical Project, Pack, Cutter and Validation sources of truth in code.
6. Record build, TypeScript, test and deployment baselines.
7. Create the first evidence-based beta implementation sprint.

Do not create the new sprint solely from the old roadmap or unverified UI state.

---

# 27. Airtable Alignment

## 27.1 Airtable Role

Airtable should track:

- KYZA ID
- Task
- Product Area
- Launch Track
- Status
- Planning Status
- Build Status
- QA Status
- Priority
- Sprint
- Source Document
- Requirement Reference
- Dependency
- Acceptance Criteria
- Evidence / Test Result
- Release Gate
- Superseded By
- Notes

## 27.2 Recommended Views

- Beta Launch
- Current Sprint
- Needs Re-evaluation
- Blocked
- Ready for QA
- Post-Beta Roadmap
- Done / Evidence Confirmed
- Superseded

## 27.3 Existing IDs

Retain existing KYZA IDs where practical.

When direction changes:

- Update the action title and criteria.
- Preserve historical context.
- Mark replaced tasks Superseded.
- Do not create a second active task for the same requirement without reason.

## 27.4 Roadmap Mapping

Every Beta Launch action should map to:

- One roadmap milestone
- One authoritative source
- One clear acceptance outcome

Airtable must not contain requirements that conflict with the current source set.

---

# 28. Gemini and Codex Delivery Strategy

## 28.1 Gemini

Use Gemini for:

- UI concepts
- Layout exploration
- Light/dark comparisons
- Visual refinements
- Component presentation
- Interaction concepts

Gemini outputs are proposals until:

- Reviewed
- Approved
- Written into `07_UI_Design_System.md`
- Converted into focused implementation tasks

## 28.2 Codex

Use Codex for:

- Real application implementation
- State integration
- Engineering logic
- Refactors
- API and database work
- Validation
- Export
- Tests
- Documentation updates where instructed

## 28.3 Prompt Quality

A Codex task should include:

- Exact scope
- Current behaviour
- Required behaviour
- Source references
- Constraints
- Acceptance criteria
- Tests to run
- Expected summary

Avoid broad prompts such as:

`Make the Cutter Studio better.`

## 28.4 Reasoning Level

Use reasoning level proportionate to task complexity.

Examples:

- Light: copy, labels, isolated styling, simple component movement
- Medium: state-connected UI, route changes, component refactor
- High: engineering geometry, shared data model, validation, export
- Extra High: cross-module architecture, difficult regressions, high-risk engine changes

Do not use maximum reasoning automatically for every task.

---

# 29. Dependencies

Key dependencies include:

- Pack Gen depends on shared Pack Specification.
- Cutter Studio depends on Pack and Cutter Specifications.
- Dashboard project cards depend on Project persistence.
- Validation Centre depends on deterministic validation results.
- Cutter status depends on the same validation source.
- Export Release depends on current Project and validation state.
- Account defaults depend on clear preference ownership.
- Artwork Studio depends on stable Project and Cutter state.
- Advanced FlowAI depends on structured context and stable deterministic rules.
- Public website screenshots depend on a stable app build.
- Commercial readiness depends on reliable persistence, access control and operational support.

Tasks must name their dependencies rather than proceeding through assumptions.

---

# 30. Roadmap Risks

## 30.1 Documentation Drift

Risk:

- GitHub docs, Project Sources, Airtable and current code describe different products.

Control:

- GitHub `/docs` is master.
- Update Project Sources after Git changes.
- Link Airtable actions to exact sources.
- Review cross-references after each source adaptation.

## 30.2 Visual Completion Mistaken for Feature Completion

Risk:

- A polished Gemini or app screen is marked Done while controls remain disconnected.

Control:

- Separate Design, Implementation and QA status.
- Require evidence.
- Test actions and state.
- Do not accept screenshot-only completion.

## 30.3 Project State Fragmentation

Risk:

- Dashboard, Pack Gen and Cutter Studio use incompatible local state.

Control:

- Shared Project model.
- Shared services.
- Save/reopen tests.
- No duplicate stores.

## 30.4 Engineering Regression

Risk:

- UI work changes cutter geometry or pack-specific rules.

Control:

- Separate visual and engineering tasks.
- Pack-specific regression tests.
- Compare output before and after.
- Protect geometry source files.

## 30.5 Beta Scope Expansion

Risk:

- Artwork Studio, press configuration and advanced AI delay beta.

Control:

- Launch Track field.
- Post-Beta view.
- Release-gate review before adding scope.
- Prioritise complete workflow.

## 30.6 Export Overstatement

Risk:

- An available button produces an output that is not technically suitable.

Control:

- Show only verified formats.
- Test vector/layer structure.
- State limitations.
- Use validation-aware release.

## 30.7 AI Overreach

Risk:

- FlowAI is treated as engineering authority.

Control:

- Deterministic validation.
- Explicit assumptions.
- Approval before changes.
- AI architecture review.

## 30.8 Persistence and Data Loss

Risk:

- Controlled beta begins before Project persistence is suitable.

Control:

- Define the beta audience and persistence requirement.
- Test recovery.
- Document limits.
- Do not release with known data-loss defects.

## 30.9 Deployment Drift

Risk:

- Vercel or another deployed environment does not match the latest GitHub commit.

Control:

- Verify commit SHA.
- Verify deployment source and branch.
- Confirm build completion.
- Record deployed version during beta releases.

---

# 31. Testing Checkpoints

Detailed testing belongs in `10_Testing_QA.md`.

Roadmap-level checkpoints are:

## Documentation

- Cross-references
- One active version per source
- Correct Kyza terminology
- Beta/post-beta clarity

## App Shell

- Header
- Navigation
- Route state
- Light/dark
- Responsive
- Accessibility

## Project

- Create
- Save
- Search
- Open
- Restore
- Corrupt/missing data

## Pack Gen

- Prompt interpretation
- Build Pack
- Missing information
- Assumptions
- Generate
- Continue to cutter

## Cutter Studio

- Render
- Geometry
- Zoom
- Pan
- Selection
- Layers
- Customise
- Save/reopen
- Pack-specific regression

## Validation

- Severity
- Counts
- Affected elements
- Re-run
- Export block
- Explanation boundary

## Export

- File generation
- Vector/layers
- Naming
- Metadata
- Failure
- Validation warning
- Download

## End to End

- Full workflow
- Navigation recovery
- Unsaved changes
- Reopen
- Current revision exported

---

# 32. Definition of Done

A task is Done only when:

- The requested behaviour is implemented.
- Acceptance criteria are met.
- Existing working behaviour is not unintentionally broken.
- Shared state and services are used where required.
- UI follows the design system.
- Engineering rules follow the knowledge base.
- Errors, loading and empty states are handled.
- Relevant tests pass.
- Build and TypeScript checks pass where available.
- Light and dark mode are checked where relevant.
- Responsive behaviour is checked where relevant.
- Limitations are recorded.
- Evidence is attached or described.
- Airtable is updated.
- The change is committed and pushed.
- The deployed version is verified where deployment is part of the task.

A task is not Done merely because:

- Gemini produced a concept.
- Code was generated.
- The screen renders once.
- A button exists.
- A commit was made.
- A local build worked without workflow testing.

---

# 33. Phase Completion Rules

A milestone is complete only when:

- Its gate criteria are met.
- Blocking defects are closed or formally accepted.
- Evidence exists.
- Dependent sources are updated.
- Airtable reflects the status.
- The next milestone can safely use the result.

The roadmap should be reviewed whenever:

- Product hierarchy changes
- Beta scope changes
- A major dependency changes
- A module moves into or out of beta
- Persistence strategy changes
- A release gate fails
- A significant engineering limitation is discovered

---

# 34. Beta Definition

The first Kyza beta is a controlled release of the connected packaging specification and cutter workflow.

It is not the complete long-term Kyza platform.

The beta must feel:

- Coherent
- Professional
- Stable
- Engineering-aware
- Clear about limitations
- Safe enough for controlled testing
- Recoverable when common errors occur

The beta does not require:

- Full Artwork Studio
- Full press-profile system
- Full customer rule system
- Full company administration
- Full reports
- Billing
- Customer portals
- Full AI automation
- Every planned export format
- Every flexible-packaging format

These remain planned without delaying proof of the core workflow.

---

# 35. Final Roadmap Rule

Kyza must be developed as one connected product, not as a collection of visually separate features.

Every phase should move the product closer to a reliable journey from product requirement to validated technical output.

The roadmap must prioritise:

- Project continuity
- Engineering reliability
- Clear user control
- Validation
- Save and recovery
- Honest export capability
- Focused beta scope
- Evidence-based completion

The platform should expand only after the core Kyza workflow is stable enough to support that expansion.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Marked all nine active Kyza v2.1 sources as audited and cross-aligned.
- Replaced the remaining source-audit list with the completed source set.
- Moved Airtable re-baselining to the immediate next programme action.
- Added Stale and Error to the Validation Centre milestone.
- Aligned Passed/Failed validation with the current Project revision.
- Required release export to use current-revision validation.

## Version 2.1 — 18 July 2026

- Reframed the roadmap from Kyza platform delivery to Kyza beta delivery.
- Defined Kyza, the Kyza App, Kyza/Kyza Tech and FlowAI roles.
- Removed the nonexistent `00_Master_Context.md` requirement.
- Replaced the previous 15-phase broad rollout with beta-focused milestones.
- Added Source and Airtable Re-baseline as the current programme phase.
- Added a real-code baseline milestone before new sprint planning.
- Updated the current Kyza app and UI position.
- Reclassified Artwork Studio, advanced FlowAI, press configuration, reports and administration as post-beta.
- Added Validation Centre MVP, Export Release MVP and Account & Specs essentials as beta launch gates.
- Made Project save, search, reopen and state restoration Beta Core.
- Added controlled beta release gates.
- Added public website alignment after core workflow stabilisation.
- Added Airtable alignment and KYZA ID retention rules.
- Added Gemini/Codex reasoning-level guidance.
- Added deployment-drift, persistence and scope-expansion risks.
- Strengthened Definition of Done and phase completion requirements.
