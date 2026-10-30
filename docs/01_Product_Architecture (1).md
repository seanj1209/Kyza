---
document_name: Kyza Product Architecture
file_name: 01_Product_Architecture.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Kyza
last_reviewed: 2026-07-19
source_replaces: 06_Product_Architecture.md
authority: Product hierarchy, module responsibilities, release boundaries, shared workflows and cross-module architecture
related_sources:
  - 04_Engineering_Knowledge_Base.md
  - 05_API_Architecture.md
  - 06_Database_Schema.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 10_Testing_QA.md
  - 11_Marketing_Website.md
---

# Kyza Product Architecture

## Document Purpose

This document defines how Kyza should operate as a connected flexible-packaging engineering product.

It establishes:

- The relationship between Kyza, the Kyza App, Kyza/Kyza Tech and FlowAI
- The product’s project-centric structure
- The responsibilities of each application module
- The initial beta boundary
- The distinction between current, supporting and post-beta capabilities
- The flow of project data between Pack Gen, Cutter Studio, Validation Centre and Export Release
- The boundaries between deterministic engineering logic, AI assistance and human approval
- The architectural rules Codex and future contributors must preserve

This document is the highest-level product architecture source currently available.

There is no separate `00_Master_Context.md`. Until one is intentionally created, this document owns the product hierarchy, product boundaries and beta release classification.

Detailed engineering rules, visual design, API structure, data schemas, AI behaviour, delivery sequencing and test requirements belong in their dedicated source files.

---

# 1. Product Hierarchy

## 1.1 Kyza

Kyza is the master customer-facing brand.

Kyza includes:

- The public Kyza website
- The Kyza App
- Product positioning and messaging
- Customer-facing services and modules
- Account, access and future subscription experiences
- The Kyza visual and interaction system

Kyza should be the name users recognise, access and trust.

## 1.2 Kyza App

The Kyza App is the main working environment.

It connects packaging definition, cutter engineering, validation, export and future artwork-preparation capabilities inside one project-centred system.

The Kyza App must not behave like a collection of disconnected tools.

Every working module must read from or write to the same Project.

## 1.3 Kyza / Kyza Tech

Kyza, referred to operationally as Kyza Tech where suitable, is the underlying packaging-engineering capability used by Kyza.

It may provide:

- Pack-type logic
- Pack specification rules
- Cutter-generation logic
- Pack composers
- Engineering defaults
- Seal, fold, gusset and eyemark calculations
- Cutter attributes
- Pack-specific validation rules
- Structured technical export data
- Production constraints

Kyza/Kyza Tech is not a competing customer-facing platform within the current architecture.

The working name remains Kyza/Kyza Tech unless a later formal decision replaces it. “K-Tech” is not adopted by this document.

## 1.4 FlowAI

FlowAI is Kyza’s intelligence, explanation and guided-assistance layer.

FlowAI may support:

- Prompt interpretation in Pack Gen
- Pack-type suggestions
- Assumption identification
- Validation explanations
- Guided corrections
- Engineering knowledge retrieval
- Context-aware assistance
- Future artwork and production guidance

FlowAI is not the deterministic engineering authority.

A deterministic engineering or validation rule must remain responsible for pass, warning and failure outcomes. FlowAI may explain the result, provide context and suggest next steps.

## 1.5 Product Relationship

The product relationship is:

```text
Kyza
└── Kyza App
    ├── Customer-facing modules and workflows
    ├── Kyza / Kyza Tech engineering capability
    └── FlowAI intelligence and explanation capability
```

---

# 2. Product Definition

Kyza is a connected flexible-packaging engineering and prepress platform.

It is intended to help users move from an early product or pack requirement towards a controlled, validated and exportable technical result.

Kyza is not only a cutter-drawing application.

It should bring together the practical functions of:

- A packaging engineer
- A reprographics operator
- A prepress assistant
- A cutter-guide builder
- A validation system
- A production knowledge source
- An AI-assisted workflow guide

The product must remain:

- Professional
- Technical
- Clear
- Accurate
- Manufacturing-aware
- Project-centric
- User-controlled
- Expandable without becoming cluttered

---

# 3. Product Mission

Kyza exists to help packaging, reprographics, design and print users:

- Create suitable flexible-packaging starting points more quickly
- Build and review cutter guides safely
- Understand engineering assumptions and decisions
- Reduce avoidable technical errors
- Validate cutter and future artwork layouts
- Prepare structured technical outputs
- Keep project information connected
- Use AI without surrendering control of production-critical decisions

The long-term ambition is to develop Kyza into a trusted operating environment for flexible-packaging engineering, prepress automation, validation and production intelligence.

The initial beta must prove the core connected workflow before the platform expands into every long-term capability.

---

# 4. Target Users

Kyza should support different experience levels without splitting into unrelated products.

Primary user groups include:

- Packaging engineers
- Reprographics and prepress operators
- Artwork operators and designers
- Flexible-packaging converters
- Flexographic printers
- Print and packaging houses
- Pack houses and co-packers
- Brand and product teams
- Start-ups with limited packaging knowledge
- Technical packaging and manufacturing users

The interface should adapt information depth to the task.

A new user may need guided inputs and clear explanations.

An experienced user may need direct access to dimensions, rules, layers, validation and exports.

Both users must operate on the same underlying Project and engineering model.

---

# 5. Core Product Principles

Kyza must follow these principles.

1. Engineering accuracy comes before decoration.
2. The user remains in control of production-critical decisions.
3. AI may recommend, explain and warn, but must not silently override.
4. Every working module must connect to the same Project.
5. Pack generation must support minimal and detailed input.
6. Manual pack construction must remain available where prompt generation is unsuitable.
7. Validation must use practical language and identify real production risk.
8. Cutter geometry must remain structured, layered and exportable.
9. Visual customisation must not alter engineering dimensions accidentally.
10. Project save and restoration must preserve meaningful working state.
11. Modules must share services, types and domain logic rather than duplicating them.
12. Beta scope must prioritise a complete reliable workflow over a large number of incomplete modules.
13. Future capabilities must not be presented as complete or production-ready.
14. Human approval remains required for release-critical decisions.
15. Kyza should feel advanced without becoming unfamiliar or unnecessarily complex.

---

# 6. Release Boundaries

The product architecture distinguishes four release levels.

## 6.1 Beta Core

Beta Core proves the primary Kyza workflow.

It includes:

- Global application shell and navigation
- Dashboard
- Project creation
- Project search and recent projects
- Pack Gen
- Prompt-based pack generation
- Manual Build Pack workflow
- Cutter Studio
- Project save and restoration
- Basic project metadata
- Connected Pack Specification and Cutter Specification
- Reliable navigation between the core modules

Beta Core is not complete until users can begin, save, leave and reopen a project without losing the required state.

## 6.2 Beta Supporting and Launch-Gate Capabilities

These capabilities may be smaller than their long-term versions, but they are required to make the beta responsible and usable.

They include:

- Minimum viable Validation Centre
- Cutter validation summary and issue details
- Critical versus soft-error handling
- Minimum viable Export Release
- Validation-aware export warnings or blocking
- Account & Specs essentials
- Basic user and unit preferences
- Error, empty, loading and recovery states
- Light and dark mode support
- Responsive desktop and practical smaller-screen behaviour
- Regression and release testing

## 6.3 Limited Beta or Presentational Capability

These areas may appear in the interface but can remain limited, preview-only or clearly unavailable where they are not yet functional.

They include:

- Template previews
- General Template Library entry
- AI & Press Config
- Additional configuration shortcuts
- Upload routes that are not yet connected to a complete workflow
- Future module navigation marked TBA or Coming Soon

A presentational control must not navigate to a broken page or imply that an unavailable action has completed.

## 6.4 Post-Beta Expansion

Post-beta areas include:

- Full Artwork Studio
- Artwork validation and preflight
- Full Template Library
- Save-as-template workflows
- Full Print Config
- Customer and printer profiles
- Advanced FlowAI assistance
- Engineering Knowledge Base user interface
- Reports and manufacturing intelligence
- Roles, permissions and company workspaces
- Administration
- Approval workflows
- Customer or printer portals
- Advanced export packages and release history
- Full press, colour and substrate intelligence

These remain part of the product architecture but must not compete with Beta Core delivery.

---

# 7. Project-Centric Architecture

Kyza is project-centric, not file-centric.

A Project is the central working object and the connection point between modules.

Files may be attached to or generated by a Project, but a file is not the complete source of project meaning.

A Project should contain, directly or through related records:

- Project identity
- Product information
- Pack Specification
- Cutter Specification
- Cutter attributes
- Artwork references when available
- Validation results
- Validation summary
- Engineering assumptions
- Notes
- User decisions
- Production or preference snapshots where required
- Export records
- Created and updated timestamps
- Basic version or revision information

All modules must operate on the current Project or create one as part of a controlled workflow.

A module must not create an isolated result that cannot be reopened, validated or exported through the Project.

Detailed entities and relationships belong in `06_Database_Schema.md`.

---

# 8. Shared Project Structure

## 8.1 Project Identity

Minimum project identity should support:

- Project ID
- Project name
- Project reference or job number
- Customer or brand where available
- Owner or user where available
- Created date
- Last updated date
- Current workflow stage

## 8.2 Product Information

Product information may include:

- Product name
- Product category
- Fill weight or volume
- Storage condition
- Pack purpose
- Filling method
- Customer notes
- Known production requirements

Product information should improve pack interpretation without becoming a mandatory barrier to starting.

## 8.3 Pack Specification

The Pack Specification is the structured result produced by prompt generation, manual Build Pack or a future template route.

It may include:

- Pack type
- Finished dimensions
- Web or unfolded dimensions
- Seal dimensions
- Gusset information
- Fold behaviour
- Eyemark requirements
- Features
- Material or process assumptions
- Production notes
- Confidence and missing-information indicators where generated through FlowAI

The Pack Specification must be shared with Cutter Studio rather than converted into a disconnected drawing.

## 8.4 Cutter Specification

The Cutter Specification is the structured engineering representation used by Cutter Studio.

It may include:

- Base cutter geometry
- Seal areas
- Fold lines
- Gusset folds
- Safe zones
- Eyemarks
- Tear notches
- Perforations
- Windows
- Hanger slots
- Barcode or information boxes
- Measurement references
- Layer and grouping information
- Display customisation that does not change geometry
- Validation references

## 8.5 Assumptions

When the product creates output from incomplete information, assumptions must be recorded.

Examples include:

- Default seal width
- Default bleed
- Default safe-zone offset
- Default eyemark count
- Assumed material family
- Assumed print method
- Assumed filling method
- No zip or feature requested
- No barcode supplied

Assumptions must be visible and editable where appropriate.

## 8.6 Validation and Export Records

Validation results and export records must remain connected to the Project.

The Project should be able to answer:

- Whether validation has been run
- Whether it passed
- How many soft and critical issues remain
- Which module or element is affected
- Whether an export was produced
- Which format was produced
- When it was produced
- Which project state it represented

---

# 9. Kyza App Structure

The current Kyza App navigation is organised as follows.

## Dashboard

- Dashboard

## Generator

- Pack Gen

## Studios

- Cutter Studio
- Artwork Studio — TBA / unavailable for beta

## QC & Export

- Validation Centre
- Export Release

## Configuration

- AI & Press Config
- Print Config — unavailable until implemented
- Preferences — limited or unavailable until implemented

## User

- Account & Specs

The global navigation is part of the application shell and should remain available across modules.

The current design direction starts the main navigation in a collapsed icon-tray state. Detailed sizing, transitions, responsive behaviour and visual styling belong in `07_UI_Design_System.md`.

Navigation entries must reflect real capability:

- Working items open their existing route or interface.
- Limited items communicate their status.
- Unavailable items do not navigate to empty routes.
- Renaming a menu item must not unnecessarily break existing working routes or stored links.

---

# 10. Module Responsibility Map

## 10.1 Dashboard

### Product Role

Dashboard is the user’s starting point and recent-work overview.

It should help the user:

- Understand how to begin
- Start a new workflow
- Open common services
- Search projects
- Continue recent work

### Current Accepted Structure

The Dashboard should contain, in order:

1. Short hero introduction
2. `Start Here` action linked to Pack Gen
3. Quick Links
4. Project search
5. Recent Projects

Current Quick Links are:

- Template Library
- Legend Config
- New Project
- Cutter Preferences
- Upload Items
- Export

Dashboard must remain minimal and clear.

It must not become a dense reporting centre during beta.

### Beta Responsibility

Dashboard must support:

- Entry into Pack Gen
- Opening the manual New Project workflow where connected
- Project search
- Recent-project ordering
- Opening an existing Project
- Clear empty and loading states

### Post-Beta Expansion

Future Dashboard capability may include:

- Validation alerts
- Projects needing review
- Export summaries
- Workflow queues
- Team activity
- Production intelligence
- Configurable dashboard views

These must not be treated as current beta requirements.

---

## 10.2 Project Access

A full standalone Projects module may be introduced later, but project capability is already required across the beta.

Beta project capability must include:

- Create Project
- Name or identify Project
- Save Project
- Update Project
- Search Project
- Show recent Projects
- Open Project
- Restore Pack and Cutter state
- Preserve meaningful validation and export status
- Handle missing or corrupt state safely

Advanced filtering, assignment, approvals and team workflows are post-beta unless already implemented.

---

## 10.3 Pack Gen

### Product Role

Pack Gen helps the user create a structured Pack Specification from minimal or detailed input.

It offers different ways to begin without creating incompatible project types.

### Current Accepted Page Structure

The visible page should contain:

1. Short hero text
2. `Build Pack` action
3. Large prompt composer
4. `Generate Pack` action
5. `Explore Our Templates` section

Detailed layout and component styling belong in `07_UI_Design_System.md`.

### Prompt Route

The prompt route is:

```text
User description
→ FlowAI interpretation
→ proposed Pack Specification
→ assumptions and missing information
→ user review or continuation
→ Project update
→ Cutter generation
```

FlowAI may interpret natural-language requirements, but deterministic pack and cutter services remain responsible for structured output.

### Manual Build Pack Route

The manual route is:

```text
Build Pack
→ existing manual/barebones builder
→ user-selected pack inputs
→ Pack Specification
→ Project update
→ Cutter generation
```

The manual builder must reuse the current underlying project and engineering architecture.

It must not create a separate incompatible pack model.

### Template Route

The template route is:

```text
Template preview or library
→ recognised starting specification
→ user adjustment
→ Pack Specification
→ Project update
```

Until templates are functional, previews must remain clearly presentational or unavailable.

### Pack Gen Output

Pack Gen should produce or update:

- Pack Specification
- Pack type
- Dimensions
- Relevant features
- Engineering assumptions
- Missing-information indicators
- Suggested next step
- Cutter-generation input

Possible generated recommendations, confidence indicators and alternatives should be presented after generation without overcrowding the initial page.

---

## 10.4 Cutter Studio

### Product Role

Cutter Studio is Kyza’s controlled engineering workspace for creating, reviewing and editing cutter structures.

It is not a freeform drawing application.

### Core Responsibilities

Cutter Studio must support:

- Rendering the current Cutter Specification
- Selecting supported elements
- Inspecting dimensions
- Editing permitted values and features
- Protecting required engineering geometry
- Managing visible layer groups
- Visual customisation without accidental geometry changes
- Displaying validation state
- Saving changes back to the Project
- Opening Pack Specification
- Importing supported items
- Saving or exporting through the existing workflow

### Current Workspace Zones

The accepted Cutter Studio direction contains:

- Studio header and compact status summary
- Pack Type, Validated, Errors and Notes status information
- Main cutter workspace
- Horizontal tool dock floating within the cutter workspace
- Right configuration area containing Base, Attributes, Customise and Layers
- Centred Pack Spec, Import and Save/Export actions
- Cutter canvas as the visual focus

Detailed control placement, component dimensions and styling belong in `07_UI_Design_System.md`.

### Editing Protection

Cutter Studio must prevent invalid accidental editing.

Examples:

- Required base geometry cannot be deleted casually.
- Locked elements cannot be moved or edited.
- Eyemarks must respect valid placement constraints.
- Fold, seal, gusset and safe-zone relationships must remain rule-driven.
- Visual colour changes must not change dimensions.
- Validation overlays must not rewrite geometry without an approved action.
- Pack-specific rules must remain pack-specific.

### Layers Responsibility

Layers must represent actual Cutter Specification elements and groups.

The Layers interface may provide:

- Selection
- Visibility
- Locking
- Permitted deletion
- Grouping
- Ordering where supported
- Preview chips or thumbnails
- Synchronisation with canvas selection

Layers must not maintain a separate copy of cutter state.

### Customise Responsibility

Customise may control supported visual properties such as:

- Display colour
- Opacity
- Line style
- Stroke treatment
- Presets

Customise must remain context-aware and use the selected cutter element.

It must not alter engineering dimensions unless a field is explicitly an engineering control owned by another section.

---

## 10.5 Validation Centre

### Product Role

Validation Centre is the central project-level quality and risk-review area.

It is the primary current user-facing location for FlowAI-assisted validation explanation.

### Validation Authority

The deterministic validation engine is responsible for rule outcomes.

FlowAI may:

- Explain an issue
- Summarise risk
- Translate technical language
- Suggest a next step
- Link to relevant knowledge
- Help the user understand an assumption

FlowAI must not change a failed rule into a pass.

### Severity Model

Validation severity levels are:

#### Critical

The issue may produce invalid output, serious production risk or an unacceptable technical result.

#### Warning

The result may be usable but carries manufacturing, artwork or process risk.

#### Advisory

A best-practice improvement or non-blocking recommendation.

#### Pass

No issue was detected under the current rule and available project data.

The interface may also describe non-critical warnings as soft errors where this matches existing Cutter Studio status language.

### Validation Summary State

The shared validation summary uses:

- `Not Run` — no completed Validation Run exists.
- `Running` — validation is currently executing for the current Project revision.
- `Passed` — the latest completed Validation Run matches the current Project revision and contains no open Critical issues. Warnings and Advisories may remain.
- `Failed` — the latest completed Validation Run matches the current Project revision and contains one or more open Critical issues.
- `Stale` — a completed Validation Run exists, but the Project has changed since it was produced.
- `Error` — validation could not complete.

A Project change that affects engineering or export readiness must invalidate the previous current-validation state.

### Minimum Beta Capability

Validation Centre must support:

- Validation not run
- Validation running
- Validation passed
- Validation failed
- Validation stale
- Validation error
- Critical and soft issue counts
- Issue description
- Affected module
- Affected element where available
- Practical reason
- Suggested resolution
- Export blocking state
- Re-run after changes

### Future Capability

Future validation may add:

- Artwork checks
- Press-specific profiles
- Customer-specific rules
- Historical validation runs
- Trend reporting
- Guided or semi-automated correction
- Full project readiness scoring

---

## 10.6 Export Release

### Product Role

Export Release turns the current Project into a controlled technical output.

It must remain validation-aware and preserve technical meaning where supported.

### Beta Responsibility

Minimum beta export capability should support:

- Save Project separately from export
- Existing working output formats
- Correct project and file naming
- Validation status check against the current Project revision
- Clear warning or blocking behaviour
- Export failure handling
- Download or release confirmation
- Basic export record attached to the Project

### Export Formats

Supported or planned formats may include:

- PDF
- SVG
- DXF
- JSON
- AI in a later phase
- CAD integrations in a later phase

Only formats that genuinely work should be shown as available.

### Export Safety

If critical validation issues exist:

- The user must be warned clearly.
- Release export is blocked where the active rule marks the issue export-blocking.
- Overrides, if ever supported, must be intentional, permission-aware and recorded.
- Export must not silently ignore critical issues.

If validation is Not Run, Stale or in Error, a release export must not be represented as ready. Draft/non-release output may be allowed only through an explicitly defined Export Service policy.

### Quick Export

Quick Export may use saved defaults or a reduced configuration path.

It must show the user what will be produced before confirmation.

---

## 10.7 Account & Specs

### Product Role

Account & Specs combines essential user information and practical saved defaults for the beta.

### Beta Responsibility

It may include:

- User identity
- Basic account information
- Unit preference
- Saved pack or cutter defaults
- Basic specification preferences
- Theme preference where not handled globally
- Export defaults where supported

It must not become a full administration or company-management area during beta.

### Future Expansion

Future capability may include:

- Company workspace
- Roles and permissions
- Customer profiles
- Printer profiles
- Shared specification libraries
- Subscription and billing
- Audit and access controls

---

# 11. Supporting and Future Modules

## 11.1 Artwork Studio

Artwork Studio remains part of the long-term connected workflow.

Its future responsibilities include:

- Artwork upload and placement
- Cutter overlay
- Bleed and safe-zone checks
- Barcode and QR review
- Text and legal-content checks
- White-plate requirements
- Reverse and surface print considerations
- Spot colour and process analysis
- Varnish and overprint checks
- Artwork validation
- Handoff to Export Release

Artwork Studio is not a Beta Core requirement.

The navigation must identify it as unavailable until a functional workflow exists.

## 11.2 Template Library

Templates provide reusable Pack Specification starting points.

Future templates may include:

- Flow wrap
- Three-side seal sachet
- Four-side seal sachet
- DOY pouch
- K-seal pouch
- Lidded film
- Pillow pack
- Customer-specific templates
- Printer-specific templates

Templates must remain editable after project creation.

Template previews must not imply working application behaviour until connected.

## 11.3 AI & Press Config

AI & Press Config is the future home for combined intelligence and production-context settings where that grouping remains appropriate.

Potential capability includes:

- Generic press assumptions
- Production defaults
- Validation profiles
- AI behaviour preferences
- Company or site rules
- Supported materials and processes

The beta may expose only a limited placeholder or existing settings route.

## 11.4 Print Config

Future Print Config may contain:

- Printer profiles
- Press profiles
- Unit limits
- Repeat and web-width constraints
- LPI and plate settings
- Substrate compatibility
- White ink and varnish capability
- Eyemark and barcode rules
- Customer or printer exceptions

This must not delay Beta Core.

## 11.5 Engineering Knowledge Base

The engineering source is required even before a customer-facing knowledge browser exists.

It may support:

- Engineering rules
- Pack-type guidance
- Validation explanations
- FlowAI retrieval
- Internal development reference

A full searchable Knowledge Base user interface is post-beta.

## 11.6 Reports, Administration and Approval

Reports, Administration and Approval are future modules.

They may later support:

- Project status reporting
- Validation trends
- Export history
- Team activity
- Users and roles
- Workspace configuration
- Customer review
- Printer review
- Technical approval
- Release approval

They must not be represented as complete during beta.

---

# 12. Core Beta Workflow

The primary beta workflow is:

```text
Dashboard
→ Start Here or New Project
→ Pack Gen
→ Prompt Generate or Build Pack
→ Pack Specification
→ Project create/update
→ Cutter generation
→ Cutter Studio
→ Validation
→ Save
→ Export Release
```

The workflow must support return and recovery:

```text
Dashboard or search
→ open existing Project
→ restore Pack Specification
→ restore Cutter Specification
→ continue editing
→ revalidate
→ save or export
```

The beta is not successful if a user can create a cutter but cannot reliably save and reopen it.

---

# 13. Future Artwork Workflow

The future connected workflow is:

```text
Cutter Studio
→ Artwork Studio
→ artwork placement and checks
→ project validation
→ issue resolution
→ Export Release
```

Artwork Studio must consume the same Cutter Specification used by Cutter Studio.

It must not rely on a separately recreated cutter that can drift from the Project.

---

# 14. Validation and FlowAI Workflow

The validation and explanation flow is:

```text
Project or module change
→ deterministic validation
→ structured Validation Result
→ issue severity and affected element
→ FlowAI explanation when requested or appropriate
→ user review
→ approved correction or manual change
→ revalidation
→ updated Project status
```

FlowAI explains validation; it does not replace it.

Any AI-suggested production change must require explicit user approval before it modifies Project data.

---

# 15. Shared Product States

## 15.1 Beta-Required States

Common beta states include:

- Loading
- Empty
- Draft
- In Progress
- Unsaved Changes
- Saving
- Saved
- Error
- Validation Not Run
- Validation Running
- Validation Passed
- Validation Failed
- Validation Stale
- Validation Error
- Export Pending
- Export Ready
- Export Failed
- Feature Unavailable

These states should be named and represented consistently across modules.

## 15.2 Future Workflow States

Future states may include:

- Awaiting Artwork
- Needs Review
- Customer Review
- Printer Review
- Approved
- Archived
- Assigned
- Released

Validation must not silently change a user-controlled approval state.

## 15.3 Empty States

Empty states must explain what the user can do next.

Examples:

- No projects yet — start in Pack Gen or create a new project.
- No matching projects — clear or change the search.
- Validation has not been run — run validation.
- No export exists — choose a supported export path.
- Feature unavailable — state that it is planned rather than opening a broken route.

---

# 16. Service and Dependency Boundaries

Modules must share domain services and types.

Recommended responsibilities include:

- `ProjectService` — create, load, save, search and update Projects
- `PackService` — create and validate Pack Specifications
- `CutterService` — generate and update Cutter Specifications
- `ValidationService` — execute deterministic validation rules
- `ExportService` — create supported technical outputs
- `FlowAIService` — prompt interpretation, explanation and guided assistance
- `PreferenceService` — user and project defaults where supported
- `TemplateService` — future template retrieval and application
- `ArtworkService` — future artwork state and operations

Module UIs must not duplicate these responsibilities locally.

Examples:

- Pack Gen must not keep an incompatible pack model that Cutter Studio cannot use.
- Cutter Studio must not maintain a second Project source of truth.
- Validation Centre must display Validation Results from the shared validation system.
- FlowAI must consume structured context rather than infer the entire Project from visible text.
- Export Release must use current Project and validation data.
- Dashboard must use the shared Project source for search and recency.

Detailed endpoint and service contracts belong in `05_API_Architecture.md`.

---

# 17. High-Level Data Flow

The standard flow is:

```text
User action
→ module interface
→ shared service
→ domain rule or engineering engine
→ Project update
→ deterministic validation where required
→ FlowAI assistance where useful
→ history or timestamp update
→ interface feedback
```

The pack-to-cutter flow is:

```text
Pack Gen
→ Pack Specification
→ Cutter Service
→ Cutter Specification
→ Validation Service
→ Project save
→ Cutter Studio
```

The cutter-to-export flow is:

```text
Cutter Specification
→ Validation Result
→ user review
→ Export Service
→ output file
→ Export Record
→ Project update
```

---

# 18. AI and Human-Control Boundaries

FlowAI must:

- Make assumptions clear
- State uncertainty
- Ask only useful questions
- Use structured Project context where available
- Respect deterministic validation
- Respect pack-specific engineering rules
- Explain production risk
- Keep the user in control
- Avoid presenting future capability as completed

FlowAI must not:

- Silently change production geometry
- Mark a Project approved
- Hide critical issues
- Invent confirmed specifications
- Override customer, printer or user rules
- Claim guaranteed production readiness
- Replace deterministic pass/fail logic
- Create separate Project data outside the shared architecture

A human must remain responsible for approving release-critical decisions.

---

# 19. Frontend Product Structure

The exact repository structure may evolve, but modules should remain clearly separated and share domain logic.

A suitable product-level structure is:

```text
src/
  app/
  components/
  modules/
    dashboard/
    projects/
    packGen/
    cutterStudio/
    validationCentre/
    exportRelease/
    accountSpecs/
    artworkStudio/
    templates/
    configuration/
  services/
  domain/
  types/
  state/
```

Rules:

- Shared logic belongs in services or domain modules.
- Module-specific UI belongs inside its module.
- Types used by several modules must not be redefined independently.
- Mock data must not become a permanent parallel source of truth.
- Presentational experiments must not replace working engineering logic without approval.
- Existing working routes should be preserved unless a controlled migration is required.

Detailed coding standards belong in the development standards source when available.

---

# 20. Current Architecture Priorities

Current priority order is:

1. Keep the product hierarchy stable.
2. Keep the Kyza App project-centric.
3. Stabilise the global application shell.
4. Complete Dashboard connections to real Project data.
5. Complete Pack Gen prompt and Build Pack paths.
6. Ensure both Pack Gen paths produce the same Pack Specification model.
7. Connect Pack Specification reliably to Cutter Studio.
8. Preserve and test current Cutter Studio engineering behaviour.
9. Complete Project save, search, reopen and state restoration.
10. Build minimum viable Validation Centre.
11. Build minimum viable Export Release.
12. Complete Account & Specs essentials.
13. Harden error, empty, loading and recovery states.
14. Complete beta regression and release testing.
15. Align the public Kyza website with real app capability.
16. Expand into Artwork Studio, full configuration and advanced FlowAI after the core workflow is reliable.

---

# 21. Product Success Criteria

Kyza’s initial beta is successful when a user can:

- Understand where to begin
- Create or open a Project
- Describe a pack requirement or use Build Pack
- Produce a structured Pack Specification
- Generate a suitable cutter starting point
- Review and edit permitted cutter properties safely
- Understand current validation status
- Identify critical and soft issues
- Save the Project
- Reopen the Project with required state intact
- Produce a supported technical export
- Understand assumptions and limitations
- Use FlowAI assistance without losing control
- Complete the workflow without encountering broken placeholder routes

Long-term success includes:

- Artwork preparation and validation
- Press- and customer-specific intelligence
- Reusable templates
- Advanced production configuration
- Approval and release workflows
- Reporting and manufacturing intelligence

---

# 22. What Kyza Must Not Become

Kyza must not become:

- A decorative drawing toy
- A generic AI chatbot
- A disconnected file-storage application
- A generic project-management board
- A fake CAD replacement without engineering logic
- A collection of visually polished but non-functional pages
- A tool that hides production risk
- A system that makes irreversible changes without user approval
- A platform where each module stores incompatible versions of the same Project
- A beta overloaded by unfinished long-term features

Kyza must remain focused on connected packaging engineering, prepress clarity and controlled production output.

---

# 23. Codex Implementation Rules

Codex should use this document as the product-architecture reference.

Codex must:

- Preserve working behaviour unless a task explicitly replaces it.
- Keep Project data central.
- Reuse shared services, types and state.
- Avoid duplicate stores and parallel models.
- Keep Pack Gen, Cutter Studio, Validation Centre and Export Release connected.
- Keep deterministic validation separate from FlowAI explanation.
- Require explicit approval for AI-suggested production changes.
- Respect Beta Core and post-beta classifications.
- Avoid activating unavailable routes with empty pages.
- Preserve saved-project compatibility.
- Preserve pack-specific engineering logic.
- Avoid changing geometry during visual-only UI amendments.
- Keep detailed visual rules in the UI Design System.
- Keep detailed engineering rules in the Engineering Knowledge Base.
- Keep detailed data entities in the Database Schema.
- Keep endpoint details in the API Architecture.
- Keep AI prompt and retrieval detail in the AI Architecture.
- Keep test matrices in Testing & QA.
- Keep sequencing and task status in the Development Roadmap and Airtable.

When sources disagree, this document controls product hierarchy, module responsibility and release classification. More specialised sources control their own detailed domain only where they do not contradict this architecture.

---

# 24. Source Ownership

This document owns:

- Product hierarchy
- Product definition
- Beta and post-beta boundaries
- Project-centric architecture
- Module responsibilities
- Core cross-module workflows
- AI/human authority boundaries
- Shared service expectations
- Product-level success criteria

Other sources should own:

- `04_Engineering_Knowledge_Base.md` — detailed packaging and validation rules
- `05_API_Architecture.md` — service and endpoint contracts
- `06_Database_Schema.md` — entities, relationships and persistence
- `07_UI_Design_System.md` — visual design, layout and component behaviour
- `08_AI_Architecture.md` — FlowAI prompts, context, retrieval and response rules
- `09_Development_Roadmap.md` — phases, sequencing and delivery status
- `10_Testing_QA.md` — test strategy, matrices and release checks
- `11_Marketing_Website.md` — public positioning, website content and messaging

Airtable tracks actions and progress. It is not the source of product truth.

---

# 25. Final Architecture Rule

Kyza must behave as one connected, intelligent and controlled packaging-engineering product.

Every working module should help the user move from an idea or specification towards a validated and exportable Project.

The product must remain:

- Professional
- Practical
- Engineering-aware
- AI-assisted
- User-controlled
- Project-centric
- Validation-driven
- Export-ready
- Scalable
- Manufacturing-focused

The initial beta must prove this connected journey before the platform expands into its full long-term vision.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Added the complete active source set to front matter.
- Standardised the shared Validation Summary lifecycle.
- Defined Passed as current-revision validation with no open Critical issues; Warnings and Advisories may remain.
- Added Stale and Error validation states.
- Clarified that release export must use validation for the current Project revision.
- Clarified that Not Run, Stale and Error states cannot be presented as release-ready.

## Version 2.1 — 18 July 2026

- Reframed Kyza as the customer-facing master brand.
- Defined the Kyza App as the connected working environment.
- Repositioned Kyza/Kyza Tech as the underlying engineering capability.
- Repositioned FlowAI as the intelligence and validation-explanation layer.
- Renamed the source from `06_Product_Architecture.md` to `01_Product_Architecture.md`.
- Added Beta Core, Beta Supporting, Limited Beta and Post-Beta boundaries.
- Updated Dashboard architecture.
- Updated Pack Gen to support Prompt, Build Pack and future Template routes.
- Updated Cutter Studio workspace responsibilities.
- Defined minimum Validation Centre, Export Release and Account & Specs responsibilities.
- Moved Artwork Studio and advanced platform modules to post-beta.
- Reduced overlap with UI, API, Database, AI, Roadmap and Testing sources.
- Updated Codex implementation and source-ownership rules.
