---
document_name: Klyro Engineering Knowledge Base
file_name: 04_Engineering_Knowledge_Base.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Sean Johnston / Klyro
last_reviewed: 2026-07-19
source_replaces: 04_Engineering_Knowledge_Base.md v1.1
authority: Packaging-engineering rules, cutter construction, active defaults, validation intent, artwork/prepress rules, manufacturing knowledge and rule governance
related_sources:
  - 01_Product_Architecture.md
  - 05_API_Architecture.md
  - 06_Database_Schema.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 10_Testing_QA.md
---

# Klyro Engineering Knowledge Base

## Document Purpose

This document is the engineering source of truth for the Klyro App and its underlying CutNFlow/CnF Tech capability.

It stores the packaging, cutter, artwork, flexographic print, colour, substrate, validation and production knowledge used to:

- Interpret pack requirements
- Create structured Pack Specifications
- Generate cutter geometry
- Apply engineering defaults
- Control editable cutter features
- Validate Projects
- Explain production risks
- Support FlowAI guidance
- Prepare technical exports
- Record customer-, press- and process-specific exceptions
- Build repeatable engineering tests

This document must be practical, structured and implementation-aware.

It is not only a collection of notes.

Every rule intended for implementation should be identifiable, scoped, status-controlled and capable of being referenced by validation, FlowAI, tests and Airtable.

`01_Product_Architecture.md` controls the Klyro product hierarchy and release boundary.

This document controls engineering meaning.

`07_UI_Design_System.md` controls visual presentation, but it must not redefine engineering geometry.

There is no separate `00_Master_Context.md`.

---

# 1. Product and Engineering Context

## 1.1 Klyro

Klyro is the customer-facing master brand.

## 1.2 Klyro App

The Klyro App is the connected working environment containing Pack Gen, Cutter Studio, Validation Centre, Export Release and future artwork and production capability.

## 1.3 CutNFlow / CnF Tech

CutNFlow/CnF Tech is the underlying packaging-engineering capability.

It owns or uses:

- Pack-type logic
- Pack composers
- Cutter-generation logic
- Seal, fold, gusset and eyemark calculations
- Cutter attributes
- Pack-specific validation
- Engineering defaults
- Structured technical output

## 1.4 FlowAI

FlowAI is the intelligence, explanation and guided-assistance layer.

FlowAI may:

- Interpret a prompt
- Recommend a pack starting point
- Identify missing information
- Explain a rule
- Explain a validation result
- Suggest a next step
- Retrieve relevant engineering knowledge

FlowAI is not the deterministic rule authority.

A rule outcome must come from structured engineering or validation logic.

---

# 2. Core Engineering Principle

Klyro must be based on real manufacturing practice.

Engineering knowledge should prioritise:

1. Pack functionality
2. Seal integrity
3. Cutter geometry
4. Machine and process suitability
5. Artwork safety
6. Barcode and legal-content safety
7. Export completeness
8. Visual presentation

Visual appearance must not override manufacturing correctness.

A polished cutter that contains invalid geometry is not acceptable.

A warning that is not fully supported by known geometry must not be presented as a confirmed critical failure.

---

# 3. Knowledge Domains

The Engineering Knowledge Base is organised into these domains:

```text
Engineering Knowledge Base
├── Rule Governance
├── Global Cutter Defaults
├── Pack Types
├── Packaging Components
├── Cutter Construction
├── Seals and Folds
├── Eyemarks and Registration
├── Tear and Opening Features
├── Perforations and Functional Features
├── Artwork and Prepress
├── Materials and Substrates
├── Colour Management
├── Flexographic Printing
├── Press and Production
├── Fingerprinting
├── Validation
├── Export Engineering
├── Customer Standards
├── Retailer Standards
├── Troubleshooting
└── Industry Reference
```

Beta work should focus first on:

- Pack-type definitions used by the current app
- Cutter defaults
- Seal and fold rules
- Eyemark rules
- K-seal and DOY geometry
- Sachet rules
- Pack-specific validation
- Save/reopen compatibility
- Export-critical structure

Artwork, press, fingerprint, retailer and troubleshooting knowledge remain important but are not all Beta Core implementation requirements.

---

# 4. Rule Governance

## 4.1 Rule Status

Every engineering rule must use one status.

| Status | Meaning |
|---|---|
| Draft | Proposed rule; not ready to act as a general default |
| Working Standard | Current Klyro/CnF Tech default or behaviour |
| Validated | Confirmed through practical production use, controlled testing or accepted technical evidence |
| Customer Specific | Applies only to a named customer or controlled customer profile |
| Press Specific | Applies only to a named press, machine, site or production route |
| Experimental | Implemented or explored for testing but not approved as a working standard |
| Deprecated | Superseded and no longer to be used for new work |

A rule is not Validated merely because it appears in this document.

## 4.2 Rule Authority Order

Where rules conflict, use this order unless a controlled exception says otherwise:

1. Explicit Project/customer-approved specification
2. Customer-specific rule
3. Press-, machine- or site-specific rule
4. Pack-type rule
5. Material/process-specific rule
6. Global Working Standard
7. Draft recommendation
8. FlowAI suggestion

FlowAI never overrides a higher-authority rule.

## 4.3 Rule Certainty

Use one certainty classification where useful:

- Confirmed
- Assumed
- Inferred
- Unknown
- Requires Production Confirmation

Certainty is separate from severity.

An unknown value is not automatically a critical defect.

## 4.4 Rule ID Format

Use stable IDs.

Recommended pattern:

```text
CNF-[DOMAIN]-[PACK OR GLOBAL]-[NUMBER]
```

Examples:

- `CNF-CUT-GLOBAL-001`
- `CNF-EYE-GLOBAL-001`
- `CNF-KSL-GEOM-001`
- `CNF-VAL-GLOBAL-001`
- `CNF-ART-GLOBAL-001`

Existing Airtable CNF task IDs remain separate from engineering rule IDs.

## 4.5 Required Rule Fields

Each implementation-ready rule should contain:

```text
Rule ID:
Rule Name:
Status:
Certainty:
Applies To:
Modules:
Source:
Effective Date:
Supersedes:
Rule:
Reason:
Inputs:
Output / Constraint:
Validation Impact:
Export Impact:
FlowAI Explanation:
Test Requirement:
Notes:
```

Not every narrative knowledge entry needs every field, but any rule used by code should be traceable.

---

# 5. Validation Severity and Action Types

## 5.1 Canonical Severity

Use four canonical validation severities.

### Critical

The rule is definitely violated and may create invalid geometry, serious production risk or an unusable technical output.

Critical issues may block export.

### Warning

A known risk or likely issue exists, but the Project may remain usable with review or an intentional decision.

Warnings are sometimes described in the UI as soft errors.

### Advisory

A best-practice recommendation, incomplete-information note or optimisation suggestion.

### Pass

The rule was evaluated and no issue was detected under the current known data.

## 5.2 Not a Severity

The following are action or workflow concepts, not canonical severities:

- Auto-fix
- Recommendation
- Information
- Acknowledged
- Overridden
- Resolved

These may be attached to a validation issue without replacing its severity.

## 5.3 Validation Summary Lifecycle

Validation issue severity and Validation Summary status are separate.

Use these shared summary states:

- `Not Run` — no completed Validation Run exists.
- `Running` — validation is executing for the current Project revision.
- `Passed` — the latest completed run matches the current Project revision and has no open Critical issues. Warnings and Advisories may remain.
- `Failed` — the latest completed run matches the current Project revision and has one or more open Critical issues.
- `Stale` — the Project revision has changed since the latest completed run.
- `Error` — the validation process did not complete.

Any engineering change that may affect a rule result must make the previous validation summary Stale until revalidation completes.

## 5.4 Unknown Geometry Rule

If geometry or context is unresolved, incomplete or not measurable with confidence:

- Do not mark it Critical solely because it is unknown.
- Use Warning or Advisory.
- Explain the missing input.
- Do not block export unless the absence itself makes the technical output definitely invalid.

Only definite invalid or impossible geometry should trigger a Critical issue.

Warnings and Advisories do not block release by default. Release blocking is controlled by an explicit Critical validation rule and the Export Service policy.

---

# 6. Global Engineering Defaults

Global defaults are fallbacks.

A pack-type, customer, machine or explicit Project rule may override them.

## 6.1 Generic Seal Width

**Rule ID:** `CNF-SEAL-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed as current beta fallback  
**Applies To:** Flexible-packaging Pack Specifications without a more specific seal rule  
**Modules:** Pack Gen, Cutter Studio, Validation Centre  

**Rule**

Use `15 mm` as the generic beta fallback seal width unless a pack-type, customer, machine or explicit Project setting provides another value.

**Reason**

A fallback is required for generation and visualisation, but seal requirements vary materially by pack and production method.

**Validation Impact**

Do not treat a value below 15 mm as automatically invalid.

Validate against the selected pack/process minimum where that rule exists.

**Supersedes**

The older generic `10 mm` default.

## 6.2 Bleed

**Rule ID:** `CNF-ART-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed  
**Applies To:** Artwork-to-cutter relationship  
**Modules:** Future Artwork Studio, Validation Centre, Export Release  

**Rule**

Use a default bleed of `3 mm` where no customer, print or pack-specific requirement overrides it.

Bleed extends beyond the trim/cut boundary or into the appropriate production allowance according to the artwork workflow.

Do not describe bleed as a safe-zone distance.

**Validation Impact**

Warn when required artwork bleed is missing or below the active requirement.

Artwork validation is post-beta unless a limited implementation is active.

## 6.3 Safe Zone from Inner Seal

**Rule ID:** `CNF-SAFE-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed  
**Applies To:** Critical artwork relative to seal areas  
**Modules:** Cutter Studio visual zones, future Artwork Studio, Validation Centre  

**Rule**

Use `5 mm` as the default critical-artwork safe-zone offset from the inner seal edge unless a pack, customer or process rule requires more.

**Reason**

Critical information should remain clear of sealing variation, distortion and heat.

**Validation Impact**

Critical artwork within the active safe zone should create a warning or critical issue according to the affected content and certainty.

## 6.4 Fold-Line Clearance

**Rule ID:** `CNF-FOLD-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed as current beta rule  
**Applies To:** Critical artwork relative to fold lines  
**Modules:** Cutter Studio visual zones, future Artwork Studio, Validation Centre  

**Rule**

Use `3 mm` as the default critical-artwork clearance from fold lines unless a more specific rule applies.

**Reason**

Artwork close to a fold may distort, become difficult to read or move across panels.

**Validation Impact**

Use Warning by default.

Escalate only where the affected feature or pack rule makes the issue definitely critical.

## 6.5 Units

**Rule ID:** `CNF-DATA-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed  
**Applies To:** Engineering dimensions  

**Rule**

Store engineering dimensions in millimetres unless the data model explicitly defines another unit.

Display conversions must not alter stored engineering values.

## 6.6 Pack-Specific Priority

**Rule ID:** `CNF-CUT-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed  

**Rule**

Pack-specific geometry and validation override generic rules.

Do not use one generic validator for all pack types where the geometry differs.

---

# 7. Pack-Type Knowledge Registry

The presence of a rule in this document does not prove full code support.

Code support must be verified against the repository.

## 7.1 Beta-Focus Pack Types

The current engineering focus includes:

- K-Seal / K-style stand-up pouch
- DOY / stand-up pouch
- Three-side seal sachet
- Flow wrap / pillow formats where currently supported

## 7.2 Additional Defined or Future Pack Types

- Four-side seal sachet
- Stick pack
- Shaped sachet
- Twin sachet
- Sachet strip
- Quad seal pack
- Lidded film
- Rollstock
- Rewind / laminate web
- Custom format

Unavailable pack types must not appear as fully working generation options.

## 7.3 Pack-Type Record Requirements

Each pack type should eventually define:

- Rule ID prefix
- Support status
- Primary use
- Typical production method
- Required Project inputs
- Default engineering assumptions
- Cutter construction
- Seal and fold model
- Eyemark model
- Optional features
- Artwork risk zones
- Production considerations
- Validation rules
- Export requirements
- FlowAI recommendation guidance
- Test fixtures

---

# 8. Pack-Type Selection Guidance

**Rule ID:** `CNF-PACK-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed  

Pack Gen may infer a likely pack type from limited input, but must expose uncertainty and assumptions.

Example:

```text
User input:
20g sauce packet
```

Likely initial directions include:

- Three-side seal sachet
- Four-side seal sachet
- Small pillow/FFS format where the production method supports it

Do not default to a generic stand-up pouch when the description strongly indicates a small flat portion pack.

FlowAI may recommend.

The structured Pack Service must create the Pack Specification.

---

# 9. Flow Wrap and Pillow Knowledge

## 9.1 Overview

Flow wrap and pillow formats are produced from rollstock around a product or fill.

They normally require:

- Pack width
- Cut-off or repeat
- Film direction
- Longitudinal fin or lap seal
- End/crimp seals
- Eyemark/registration logic
- Product clearance
- Print-to-cut relationship

## 9.2 Common Risks

- Wrong film direction
- Incorrect repeat/cut-off
- Eyemark not readable
- Critical artwork in crimp or back-seal areas
- Barcode across a seal
- Insufficient product clearance
- Seal contamination
- Registration movement
- Film stretch

## 9.3 Rule Status

Detailed flow-wrap equations and machine-specific allowances remain dependent on the selected machine/process and must not be guessed from pack name alone.

---

# 10. Sachet Knowledge

## 10.1 Three-Side Seal Sachet

Typical use:

- Sauces
- Powders
- Condiments
- Samples
- Cosmetics
- Medical or hygiene samples
- Portion packs

Required engineering concepts:

- Three seal zones
- Defined fill/open edge
- Internal safe area
- Optional tear notch
- Optional perforation
- Eyemark where web-fed
- Orientation/filling direction

Common risks:

- Critical artwork in seals
- Tear notch through text or barcode
- Insufficient safe area
- Undefined fill edge
- Barcode quiet-zone risk
- Small-text legibility
- Incorrect web orientation

## 10.2 Four-Side Seal Sachet

Typical engineering concepts:

- Four perimeter seals
- Restricted internal artwork area
- Tear feature
- Web registration
- Cut registration
- Filling allowance

A four-side seal sachet must not reuse a three-side seal model without explicitly closing the fourth side.

## 10.3 Sachet Rule Status

Pack-specific seal minimums, tear-feature clearances and machine requirements must be defined by the active sachet rule set or production profile.

Do not infer a universal minimum from the generic fallback.

---

# 11. DOY / Stand-Up Pouch Knowledge

## 11.1 Overview

A DOY pouch uses a bottom gusset to support standing.

Common features include:

- Front and back panels
- Bottom gusset
- Side seals
- Top seal
- Fold lines
- Tear notch
- Grip Seal (Zip) where requested
- Grip Seal (Default) where the existing product model distinguishes it
- Hanger hole
- Safe zones
- Eyemark

## 11.2 Common Risks

- Bottom gusset not centred
- Inconsistent gusset geometry
- Artwork across gusset folds
- Tear notch too close to zip
- Hanger hole too close to top seal
- Barcode in a distorted area
- Critical artwork in side seals
- Incorrect folded/unfolded relationship

## 11.3 DOY Scope Protection

K-Seal-specific naming or geometry changes must not be applied globally to DOY unless a separate DOY rule explicitly approves them.

---

# 12. K-Seal Engineering

K-Seal rules are a current high-priority engineering area.

The geometry must be driven from finished pouch requirements and structured pack inputs.

## 12.1 K-Seal Baseline Inputs

A K-Seal Pack Specification should support, where applicable:

- Finished pouch width
- Finished pouch height
- Gusset size
- Side-seal width
- Bottom-seal width
- Trim
- Eyemark count
- Eyemark dimensions
- Grip Seal (Zip) or supported opening type
- Tear notch
- Hanger hole
- Arm angle
- Arm thickness derived from the bottom-seal setting
- Feature-specific offsets
- Material or machine constraints where known

## 12.2 K-Seal Side Seal

**Rule ID:** `CNF-KSL-SEAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed current K-Seal default  

**Rule**

Default K-Seal side seals to `7.5 mm` unless the user, customer, machine or Project rule overrides them.

## 12.3 K-Seal Bottom Seal

**Rule ID:** `CNF-KSL-SEAL-002`  
**Status:** Working Standard  
**Certainty:** Confirmed current K-Seal default  

**Rule**

Default the K-Seal bottom seal to `7.5 mm` unless overridden.

## 12.4 K-Seal Trim

**Rule ID:** `CNF-KSL-TRIM-001`  
**Status:** Working Standard  
**Certainty:** Confirmed current K-Seal default  

**Rule**

Default trim to ON at `10 mm` for the current K-Seal workflow unless the Project or production route specifies otherwise.

Trim state may affect eyemark availability and web construction.

## 12.5 K-Seal Support-Arm Angle

**Rule ID:** `CNF-KSL-GEOM-001`  
**Status:** Working Standard  
**Certainty:** Confirmed current default  

**Rule**

Use `30°` as the default K-Seal support-arm angle.

Allow a controlled custom range of `25°–35°` where the current product supports user adjustment.

**Reason**

The arm angle should provide a practical starting geometry while allowing controlled adaptation.

**Constraint**

Do not allow an unrestricted angle input.

## 12.6 K-Seal Auto-Adjustment

**Rule ID:** `CNF-KSL-GEOM-002`  
**Status:** Working Standard / implementation refinement  
**Certainty:** Confirmed principle; final equation requires code-backed validation  

**Rule**

K-Seal support-arm geometry may adjust according to:

- Pouch width
- Gusset geometry
- Side-seal geometry
- Bottom-seal geometry
- Arm endpoints
- Apex or join position
- Tooling or process constraints where defined

Overall pouch height should have little or no direct influence unless a real geometric dependency is demonstrated.

Arm length should be derived from the intended endpoints and angle, not from an unrelated visual constant.

## 12.7 K-Seal Arm Count

**Rule ID:** `CNF-KSL-GEOM-003`  
**Status:** Working Standard  
**Certainty:** Confirmed current visual/engineering representation  

**Rule**

Display eight K-Seal support arms in total to represent both sides/faces of the seal construction.

The arms must:

- Use the same controlled angle
- Use consistent thickness
- Align to the intended centre and gusset references
- Remain within the permitted pouch/bottom-seal geometry
- Avoid protruding beyond the bottom-seal boundary

## 12.8 K-Seal Arm Thickness

**Rule ID:** `CNF-KSL-GEOM-004`  
**Status:** Working Standard  
**Certainty:** Confirmed latest direction  

**Rule**

The visible support-arm band thickness must match the configured bottom-seal width unless a future validated rule defines a separate arm-band input.

Do not double the bottom-seal thickness.

Examples:

- Bottom seal `7.5 mm` → arm thickness `7.5 mm`
- Bottom seal `5 mm` → arm thickness `5 mm`

An older fixed or doubled arm-width approach is deprecated.

## 12.9 K-Seal Arm Position and Limits

**Rule ID:** `CNF-KSL-GEOM-005`  
**Status:** Working Standard  
**Certainty:** Confirmed principle  

**Rule**

All arms must:

- Use consistent start and end references
- Remain aligned across the construction
- Terminate at the intended bottom-seal boundary
- Never protrude outside the permitted geometry
- Avoid asymmetric angle or thickness
- Preserve the intended W/M-style construction impression where shown in the unfolded representation

Exact coordinate names and equations must match the code-backed geometry model.

## 12.10 K-Seal Visual Union

**Rule ID:** `CNF-KSL-RENDER-001`  
**Status:** Working Standard  
**Certainty:** Confirmed current rendering requirement  

**Rule**

Side seals, bottom seals and support-arm regions may remain logically separate engineering elements, but their rendered seal fill should appear as one clean continuous construction where they meet.

Avoid:

- Visible seams
- Double outlines
- Overlapping opacity
- Gaps caused only by component rendering
- Separate shapes that visually appear unjoined
- Arms extending through the bottom seal

The visual union must not destroy logical layer identity required for editing or export.

## 12.11 K-Seal Eyemarks

K-Seal may support:

- 0 eyemarks
- 1 eyemark
- 2 eyemarks

Availability may depend on trim and the active web/production model.

Use the current Eyemark Standards in this document.

## 12.12 K-Seal Tac-Hole Boundary

**Rule ID:** `CNF-KSL-TAC-001`  
**Status:** Working Standard requiring formal geometry names  
**Certainty:** Confirmed behavioural limit  

**Rule**

The tac-hole feature must originate within its permitted start region and must not cross the defined maximum boundary.

The current design annotations described this as:

- Start inside the permitted start band
- Do not extend beyond the maximum limit line

Implementation must use named geometry references rather than colour descriptions such as red or yellow.

**Validation Impact**

- Definite boundary violation: Critical or Warning according to production consequence
- Missing formal reference geometry: Warning, not automatic export block

## 12.13 K-Seal Sub-Measurements

Relevant K-Seal height sub-measurements should be available on the right side of the cutter where required by the current engineering view.

Measurement presentation belongs in the UI Design System.

Measurement values must derive from real geometry.

## 12.14 K-Seal Validation Priorities

K-Seal validation should check:

- Finished dimensions
- Side-seal consistency
- Bottom-seal consistency
- Gusset centring
- Arm count
- Arm angle
- Arm thickness
- Arm symmetry
- Arm boundary limits
- Join continuity
- Fold/gusset relationship
- Eyemark placement
- Tear/zip/hanger conflicts
- Tac-hole boundary where present

A rendering seam without a geometry defect is a UI/rendering issue, not automatically an engineering failure.

---

# 13. Eyemark Engineering

## 13.1 Default Eyemark Size

**Rule ID:** `CNF-EYE-GLOBAL-001`  
**Status:** Working Standard  
**Certainty:** Confirmed current default  

**Rule**

Use `15 mm × 5 mm` as the default eyemark size unless a pack, machine, customer or Project rule overrides it.

Do not replace the default with `10 mm × 10 mm`.

Where a minimum eyemark rule exists, it must be stored separately from the default.

A minimum is not a default.

## 13.2 Eyemark Count

**Rule ID:** `CNF-EYE-GLOBAL-002`  
**Status:** Working Standard  
**Certainty:** Confirmed  

Support:

- 0 eyemarks
- 1 eyemark
- 2 eyemarks

Count availability may depend on trim, web layout and pack type.

The existing Cutter Studio eyemark settings are the source of truth for eyemark count and dimensions.

Do not create a second independent eyemark settings panel in Artwork Studio or zone-rule UI.

## 13.3 Default Edge Offset

**Rule ID:** `CNF-EYE-GLOBAL-003`  
**Status:** Working Standard  
**Certainty:** Confirmed current engine direction  

**Rule**

Use an automatic default placement offset of `1.5 mm` from the relevant MD/TD edge in the current engine where that placement model applies.

Pack- and machine-specific rules may override it.

The older generic `3 mm from cutter edge` placement statement is deprecated as a universal rule.

## 13.4 Eyemark Track

**Rule ID:** `CNF-EYE-GLOBAL-004`  
**Status:** Working Standard  
**Certainty:** Confirmed  

The eyemark track is a controlled production region.

The Project may support:

- `Keep eyemark track clear`
- `Print in seal`
- Flood-print interaction
- Slit-tolerance checks

An eyemark track must not be treated as a generic safe zone.

## 13.5 Slit-Tolerance Trigger

**Rule ID:** `CNF-EYE-SLIT-001`  
**Status:** Working Standard  
**Certainty:** Confirmed current Cutter Studio behaviour  

**Rule**

Slit-tolerance warnings should trigger only when:

- Flood print is active, and
- The eyemark is positioned in the relevant track/edge condition

Slit tolerance is currently a Cutter Studio concern.

Do not duplicate it as a separate Artwork Studio setting.

## 13.6 Slit-Tolerance User Options

Where the current workflow detects a slit-tolerance conflict, supported user options may include:

- Reduce eyemark size
- Increase available width
- Move the eyemark inward
- Ignore/acknowledge where permitted

These are workflow actions.

They must not silently alter geometry.

## 13.7 Two-Eyemark Allowance

**Rule ID:** `CNF-EYE-SLIT-002`  
**Status:** Working Standard / implementation behaviour  
**Certainty:** Confirmed current direction  

Where the two-eyemark workflow requires additional web allowance, increase width by `3 mm total` according to the current implementation rule.

This must be verified against the active web-width calculation before being treated as a general production standard.

## 13.8 Eyemark Validation

Check:

- Count supported by pack/web model
- Width and height
- Edge offset
- Track position
- Cutter-feature collision
- Seal relationship
- Flood-print/slit-tolerance condition
- Two-eyemark allowance
- Machine/profile rule where available

If the track geometry is unknown or unresolved, use Warning rather than Critical.

---

# 14. Seal Engineering

## 14.1 Seal Model

A seal should have:

- Named type
- Width
- Position
- Geometry
- Inner edge
- Outer edge or trim relationship
- Pack-type ownership
- Optional process/customer override
- Validation rule reference

## 14.2 Seal Types

Possible seal concepts include:

- Side seal
- Top seal
- Bottom seal
- Perimeter seal
- Crimp/end seal
- Fin seal
- Lap seal
- K-seal bottom construction
- Lidding flange/seal area
- Grip Seal (Zip) relationship
- Other customer- or machine-specific seals

## 14.3 Seal Validation

Validate:

- Positive dimensions
- Pack-type presence
- Symmetry where required
- Fold/gusset relationship
- Feature clearance
- Artwork clearance where artwork exists
- Machine/customer minimum where known
- Impossible geometry

Do not mark a generic seal width as critical solely because it differs from the global fallback.

## 14.4 Print in Seal

`Print in seal` is a user-controlled production/artwork condition.

When enabled:

- The UI may show the printable or flood region.
- Validation must distinguish allowed print from critical artwork.
- Heat, distortion and readability risk may still require warning.
- The setting does not guarantee production approval.

---

# 15. Fold and Gusset Engineering

## 15.1 Fold Lines

Fold lines must remain separate from cut lines.

A fold line should store:

- Type
- Position
- Orientation
- Related panel/gusset
- Display style
- Validation relationship

Display stroke width is not the same as physical fold clearance.

## 15.2 Gussets

A gusset should store:

- Type
- Size
- Centre reference
- Fold references
- Relationship to seals
- Relationship to finished dimensions
- Pack-specific geometry

Validate:

- Positive gusset size
- Centring
- Fold consistency
- Seal intersection
- Finished/unfolded relationship
- Pack-type compatibility

## 15.3 Artwork Distortion

Critical artwork across gusset folds or high-distortion regions should trigger Warning by default.

Escalate only when a definite legal, barcode or production failure exists.

---

# 16. Tear, Opening and Functional Features

## 16.1 Tear Notch

**Status:** Working Standard

A tear notch should:

- Sit on the intended opening edge
- Respect the active seal
- Avoid critical artwork
- Avoid zip/grip-seal conflict
- Avoid structural gusset conflict
- Remain within the permitted cut boundary

Do not use one universal notch-to-zip distance unless the pack or process rule confirms it.

## 16.2 Half-Moon Cut

A half-moon cut should:

- Remain within permitted geometry
- Avoid zips, notches, gussets and critical seal zones
- Preserve pack strength
- Use real cutter geometry

## 16.3 Grip Seal Terminology

Use the current K-Seal labels where applicable:

- `Grip Seal (Zip)`
- `Grip Seal (Default)`

Do not apply the naming or behaviour globally to DOY until a DOY rule approves it.

## 16.4 Hanger Hole

Validate:

- Top-seal relationship
- Structural clearance
- Tear-feature conflict
- Artwork clearance
- Pack symmetry where required

## 16.5 Barcode, BBE and Information Boxes

These are artwork/annotation attributes, not base cutter geometry.

Their position may be shown in Cutter Studio where supported.

Future Artwork Studio must use the same attribute data.

---

# 17. Perforation Engineering

## 17.1 Continuous Perforation

A continuous perforation must:

- Follow the intended separation or opening route
- Avoid unintended seal weakness
- Avoid structural failure
- Store line and position data
- Remain distinguishable from cut and fold lines

## 17.2 Regulated Perforation

A regulated perforation should store:

- Hole count
- Hole size
- Spacing
- Pattern
- Start and end
- Orientation
- Functional purpose
- Pack/process rule

## 17.3 Validation

Check:

- Position
- Seal conflict
- Fold conflict
- Cut conflict
- Pattern validity
- Feature overlap
- Pack integrity

A perforation through a critical seal should be Critical where the conflict is definite and not intentionally specified.

---

# 18. Cutter Attribute Model

Cutter attributes may include:

- Eyemarks
- Tear notches
- Half-moon cuts
- Hanger holes
- Perforations
- Windows
- Barcode boxes
- BBE/date-code boxes
- Safe zones
- Print zones
- Flood-print region
- Slit tolerance
- Notes and measurements

An attribute should define:

- ID
- Type
- Geometry
- Pack ownership
- Visibility
- Lock state
- Deletable/protected state
- Engineering parameters
- Validation references
- Display customisation where supported

UI toggles must not become separate geometry sources.

---

# 19. Cutter State and Rendering

## 19.1 Structured Geometry

The cutter must be represented as structured elements, not a flattened image.

Required concepts include:

- Base boundary
- Seal regions
- Fold lines
- Gussets
- Attributes
- Safe/print zones
- Measurements
- Validation overlays
- Layer/group identity

## 19.2 Logical Element Versus Visual Union

Separate engineering elements may render as one continuous filled shape where appropriate.

The implementation must preserve:

- Selectability where required
- Rule ownership
- Layer identity
- Export structure
- Validation references

Visual seams should be solved in rendering, not by destroying engineering data.

## 19.3 Selection and Locking

Selection UI must not change geometry by itself.

Locked elements must resist:

- Move
- Resize
- Rotate
- Delete where protected

Hidden elements remain part of the Project unless deleted intentionally.

## 19.4 State Retention

Switching between Cutter Studio panels or modules must preserve:

- Cutter geometry
- Current Project
- Supported selection
- Lock/visibility
- User edits
- Validation state where appropriate

---

# 20. Artwork and Prepress Knowledge

Artwork Studio is post-beta unless implementation status changes.

The knowledge remains relevant to future validation and export.

## 20.1 Artwork Domains

- Bleed
- Safe zones
- Cutter alignment
- White layers
- Spot colours
- CMYK builds
- Barcodes
- QR codes
- Date-code/BBE areas
- Varnish/lacquer
- Registration
- Layer naming
- Print direction
- Reverse print
- Surface print
- Trapping
- Minimum text and line weights
- Legal and nutrition content
- Front-of-pack requirements

## 20.2 White Layer

Reverse-printed clear film commonly needs white backing where opacity or colour accuracy is required.

The rule depends on:

- Intended transparency
- Design intent
- Substrate
- Print sequence
- Customer requirement

Absence of a white layer is not automatically a critical error without context.

## 20.3 Barcode and QR

Check:

- Symbology
- Size
- Magnification
- Quiet zones
- Contrast
- Orientation
- Distortion
- Seal/fold/gusset interference
- Print process
- Verification requirement

Do not guess a customer barcode standard.

## 20.4 Critical Artwork

Critical artwork includes, according to Project context:

- Legal text
- Allergen information
- Barcode
- QR code
- Nutrition information
- Date-code area
- Mandatory marks
- Key brand information

Severity should reflect the actual affected content.

---

# 21. Colour Management Knowledge

Colour knowledge may include:

- CMYK builds
- Spot colours
- Pantone references
- Ink systems
- Substrate effect
- White backing
- Reverse print
- Surface print
- Varnish/lacquer effect
- Fingerprint profile
- Press limitations
- Proofing condition
- Density
- Dot gain
- Minimum dot
- Maximum printable tone

A colour recommendation must explain the production reason.

A generic digital colour conversion must not be treated as a guaranteed press match.

---

# 22. Flexographic Printing Knowledge

Flexographic print knowledge may include:

- Plate type and thickness
- LPI
- Anilox volume
- Ink system
- Substrate
- Print sequence
- Trap
- Dot gain
- Minimum dot
- Maximum ink
- Density targets
- Drying limits
- Registration tolerance
- Reverse print
- Surface print
- White opacity
- Varnish/lacquer
- Plate distortion/repeat
- Sleeve/cylinder information

These values are press- and site-dependent.

They should not become global defaults without evidence.

---

# 23. Materials and Substrates

Material knowledge may include:

- LDPE
- PE
- OPP
- CPP
- PET
- Paper
- Laminates
- Metallised films
- Recyclable structures
- Mono-material structures

Each material record should eventually store:

- Typical use
- Print behaviour
- Seal behaviour
- Stretch
- Heat sensitivity
- Opacity
- White-layer considerations
- Lamination requirements
- Production risks
- Compatible process/profile references
- Rule status

Material names alone are not enough to confirm full production suitability.

---

# 24. Press, Machine and Production Knowledge

A press or production profile may include:

- Press/machine name
- Site
- Process
- Web-width range
- Colour-station limit
- Reverse/surface capability
- Drying capability
- Registration capability
- Substrate range
- Ink system
- Plate specification
- Fingerprint profiles
- Known limitations
- Customer exceptions
- Review date

This is primarily post-beta configuration unless a current validation rule depends on it.

---

# 25. Fingerprinting Knowledge

A fingerprint profile may include:

- Press
- Site
- Substrate
- Ink system
- Plate type
- Plate thickness
- LPI
- Anilox setup
- Density targets
- Dot gain
- Minimum dot
- Maximum printable tone
- Colour profile
- Measurement condition
- Proofing relationship
- Approval date
- Review/expiry date
- Status

Fingerprint data may improve colour, artwork and production guidance.

A fingerprint is not required to create a basic Pack Specification or cutter.

It may be required for press-specific colour approval or advanced production validation.

---

# 26. Customer and Retailer Standards

## 26.1 Customer Rules

Customer rules may include:

- Material preferences
- Cutter rules
- Artwork rules
- Colour standards
- Barcode standards
- White-layer rules
- Approval workflow
- Retailer requirements
- Export requirements
- Naming conventions

Customer rules must be clearly identified and scoped.

They must not silently become global defaults.

## 26.2 Retailer Rules

Retailer rules may include:

- Barcode
- Nutrition panel
- Legal copy
- Recycling marks
- Colour expectations
- Proofing
- Minimum text
- Date-code areas
- Varnish restrictions
- Approval

Do not assume a retailer rule unless the Project/customer confirms it.

---

# 27. Validation Knowledge

Validation is divided into:

## 27.1 Cutter Validation

- Dimensions
- Pack-type geometry
- Seal widths
- Seal relationships
- Safe zones
- Fold lines
- Gussets
- Eyemarks
- Tear features
- Perforations
- Hanger holes
- Windows
- Protected geometry
- K-Seal arm rules
- Tac-hole rules where present

## 27.2 Artwork Validation

Future or limited:

- Bleed
- Safe areas
- Barcodes
- QR codes
- White layer
- Spot colours
- Text size
- Registration
- Layer structure
- Cutter alignment
- Legal/mandatory content

## 27.3 Production Validation

Future or profile-dependent:

- Press compatibility
- Substrate compatibility
- Colour count
- Ink system
- Fingerprint match
- Plate requirements
- Machine limitations
- Repeat/web-width constraints

## 27.4 Export Validation

- Required cutter structure
- Supported format
- Naming
- Project revision
- Validation state
- Technical metadata
- Output generation success
- Package completeness where applicable

---

# 28. Validation Message Standard

Every issue should answer:

1. What is wrong?
2. Why does it matter?
3. Where is it?
4. What is the likely production consequence?
5. What can the user do?
6. Is export blocked?

Good:

```text
The eyemark is too close to the permitted track boundary. This may reduce registration reliability during cutting. Move it inward or confirm the machine-specific allowance.
```

Poor:

```text
Invalid eyemark.
```

Good:

```text
The bottom gusset is not centred relative to the pouch width. This may create inconsistent K-seal geometry and stand-up performance.
```

Poor:

```text
Gusset error.
```

FlowAI may expand the explanation.

The Validation Service owns the result.

---

# 29. Export Engineering

A supported export should preserve, where the format allows:

- Cutter boundary
- Seal regions
- Fold lines
- Gusset references
- Eyemarks
- Functional attributes
- Measurements where requested
- Layer identity
- Project reference
- Revision
- Validation summary or reference
- Units
- Correct scale

Potential formats include:

- SVG
- PDF
- JSON
- DXF later
- AI later

Only verified formats should be active.

A visually correct rasterised proof is not equivalent to a structured vector engineering export.

---

# 30. Troubleshooting Knowledge

Troubleshooting entries should contain:

- Symptom
- Likely causes
- Checks
- Possible corrective actions
- Risk level
- Related press
- Related material
- Related customer
- Evidence/status
- Last reviewed

Potential topics include:

- Drying
- Blocking
- Ghosting
- Weak opacity
- Colour weakness
- Registration movement
- Plate wear
- Anilox mismatch
- Barcode failure
- Seal failure
- Lamination issues
- Cutter mismatch
- Artwork misalignment

Troubleshooting advice must not be presented as a confirmed diagnosis without evidence.

---

# 31. FlowAI Use of Engineering Knowledge

FlowAI may use this source to:

- Recommend likely pack types
- Suggest starting defaults
- Explain assumptions
- Explain validation
- Identify missing information
- Highlight production risk
- Support troubleshooting
- Educate users
- Summarise Project engineering state

FlowAI must:

- Quote or reference the applicable structured rule internally
- Preserve rule status
- Distinguish Working Standard from Validated
- Distinguish general rule from customer/press-specific rule
- State uncertainty
- Avoid inventing a production fact
- Avoid silently changing geometry
- Avoid marking validation passed
- Require approval before applying production-critical changes

Detailed AI behaviour belongs in `08_AI_Architecture.md`.

---

# 32. Knowledge-to-Code Relationship

The knowledge source, code and tests must remain aligned.

For an implementation-ready rule:

```text
Engineering Knowledge Rule
→ typed rule/configuration
→ Pack or Cutter Service
→ Validation rule
→ FlowAI explanation mapping
→ test fixture
→ Airtable evidence
```

The Markdown source is not automatically executable.

Code must not parse arbitrary prose as a production rule.

Stable rule IDs should link human knowledge to structured implementation.

---

# 33. Knowledge Update Workflow

When a new engineering rule is proposed:

1. Record the requirement and source.
2. Assign a rule ID.
3. Set status and certainty.
4. Define pack/process/customer scope.
5. Define the engineering rule.
6. Define validation and export impact.
7. Define FlowAI explanation.
8. Review conflicts with existing rules.
9. Update this document.
10. Update API/database sources if structured storage changes.
11. Update AI Architecture if FlowAI uses it.
12. Update Testing & QA.
13. Create or update the relevant Airtable action.
14. Implement through Codex where required.
15. Run focused regression tests.
16. Record evidence.
17. Promote status only when justified.

If the change affects core architecture, create a formal decision record or RFC in the available governance system.

Do not depend on a nonexistent `03_Decision_Log.md` unless that source is intentionally created later.

---

# 34. Engineering Change Categories

Use one category for each change:

- Documentation clarification
- Default change
- Pack-type rule
- Geometry change
- Rendering-only change
- Validation change
- Export change
- Customer-specific exception
- Press-specific exception
- Experimental feature
- Deprecated behaviour

A rendering-only change must not be implemented as a geometry change without approval.

---

# 35. Engineering Evidence

Useful evidence may include:

- Production-approved cutter
- Customer specification
- Machine manual
- Press fingerprint
- Repro specification
- Controlled test output
- Confirmed code fixture
- Expert review
- Production trial
- Supplier technical data
- Comparison against an approved reference

Screenshots may demonstrate visual behaviour but do not alone validate a manufacturing rule.

---

# 36. Beta Engineering Priorities

The initial engineering priorities are:

1. Confirm supported beta pack types.
2. Stabilise Pack Specifications.
3. Stabilise Cutter Specifications.
4. Formalise K-Seal geometry.
5. Formalise DOY geometry separately.
6. Confirm sachet geometry.
7. Confirm global defaults and pack overrides.
8. Confirm eyemark and slit-tolerance behaviour.
9. Confirm safe-zone and fold-clearance rules.
10. Link pack-specific validators.
11. Prevent false critical/export-blocking results.
12. Verify save/reopen.
13. Verify structured SVG/PDF output.
14. Create regression fixtures for each supported pack.
15. Separate rendering defects from engineering defects.

Press, artwork and customer-profile expansion follows after the core cutter workflow is stable.

---

# 37. Source Ownership

This document controls:

- Engineering terminology
- Pack rules
- Cutter rules
- Active defaults
- Geometry intent
- Validation intent
- Manufacturing reasoning
- Artwork/prepress rules
- Customer/press rule precedence
- Rule IDs and status

Other sources control:

- `01_Product_Architecture.md` — product hierarchy and release boundaries
- `05_API_Architecture.md` — service and endpoint contracts
- `06_Database_Schema.md` — persistence entities
- `07_UI_Design_System.md` — layout and visual behaviour
- `08_AI_Architecture.md` — FlowAI prompts, context and response structures
- `09_Development_Roadmap.md` — delivery order
- `10_Testing_QA.md` — formal test matrices
- `11_Marketing_Website.md` — public claims

When UI or marketing wording conflicts with an engineering rule, this document controls the engineering meaning.

---

# 38. Codex Engineering Rules

Codex must:

- Read the relevant pack and global rules before changing geometry.
- Preserve pack-specific logic.
- Avoid applying K-Seal rules globally to DOY.
- Keep geometry and rendering concerns separate.
- Reuse shared Pack and Cutter types.
- Use stable rule references where practical.
- Avoid duplicate validators.
- Treat unknown geometry as warning/advisory unless definitely invalid.
- Keep validation severity consistent.
- Preserve user-approved settings.
- Preserve save/reopen compatibility.
- Add focused tests for geometry changes.
- Compare the changed pack against unaffected pack types.
- Record the exact files and tests changed.

Codex must not:

- Invent an engineering rule from a screenshot.
- Turn a visual preference into a manufacturing rule.
- Change a global default during an isolated pack fix.
- Mark FlowAI output as validation truth.
- Block export based on unresolved geometry alone.
- Flatten structured cutter geometry to simplify UI work.
- Delete protected elements without an explicit rule.

---

# 39. Final Engineering Rule

Klyro must not merely draw packaging.

Through CutNFlow/CnF Tech, it must guide users towards packaging structures that are:

- Practical
- Manufacturable
- Structured
- Pack-specific
- Validated
- Explainable
- Exportable
- Controlled by the user

The Engineering Knowledge Base is the technical authority that allows Klyro to become intelligent without becoming unsafe or vague.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Added the shared Not Run, Running, Passed, Failed, Stale and Error validation lifecycle.
- Defined Passed as a current-revision result with no open Critical issues.
- Clarified that Warnings and Advisories may remain on a Passed Project.
- Clarified that engineering changes make prior validation Stale.
- Clarified the default relationship between Critical severity and release blocking.

## Version 2.1 — 18 July 2026

- Reframed the source around Klyro, Klyro App, CutNFlow/CnF Tech and FlowAI.
- Removed references to the nonexistent `00_Master_Context.md`.
- Removed dependence on unconfirmed Development Standards and Decision Log files.
- Added stable engineering rule governance and rule-ID guidance.
- Added certainty and authority precedence.
- Replaced the old generic 10 mm seal default with the current 15 mm beta fallback.
- Preserved 3 mm bleed.
- Preserved 5 mm safe-zone offset from inner seal.
- Added 3 mm fold-line artwork clearance.
- Confirmed 15 mm × 5 mm eyemark default.
- Deprecated the old universal 3 mm eyemark edge-offset statement.
- Added current 1.5 mm applicable edge-offset behaviour.
- Added eyemark count, track and slit-tolerance rules.
- Added current two-eyemark width-allowance behaviour with implementation caution.
- Added detailed K-Seal defaults and geometry governance.
- Added K-Seal side and bottom seal defaults of 7.5 mm.
- Added 10 mm trim-on default.
- Added 30° support-arm default and 25°–35° controlled range.
- Added eight-arm requirement.
- Defined arm thickness as equal to bottom-seal width and deprecated doubled/fixed arm thickness.
- Added K-Seal arm boundary, visual-union, tac-hole and sub-measurement rules.
- Protected DOY from automatic K-Seal rule propagation.
- Standardised validation severity as Critical, Warning, Advisory and Pass.
- Clarified that auto-fix and recommendation are action types, not severities.
- Added warning-only behaviour for unresolved geometry.
- Separated rendering defects from engineering defects.
- Added Knowledge-to-Code and evidence workflows.
- Reclassified artwork, press, fingerprint and customer-profile depth as later expansion unless required by beta.
