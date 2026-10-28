---
document_name: Klyro UI Design System
file_name: 07_UI_Design_System.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Klyro
last_reviewed: 2026-07-19
source_replaces:
  - 07_UI_Design_System.md
  - 07_UI_Design_System_MERGED_CORRECTED.md
authority: Visual language, application shell, layout, component behaviour, interaction patterns, accessibility and responsive UI rules
related_sources:
  - 01_Product_Architecture.md
  - 04_Engineering_Knowledge_Base.md
  - 05_API_Architecture.md
  - 06_Database_Schema.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 10_Testing_QA.md
  - 11_Marketing_Website.md
---

# Klyro UI Design System

## Document Purpose

This document defines the visual and interaction standards for the Klyro App.

It converts approved Klyro design direction into a stable implementation reference for Gemini, Codex and future contributors.

This document owns:

- Klyro App visual language
- Theme behaviour
- Typography usage
- Application shell
- Navigation behaviour
- Page layout patterns
- Component styling and interaction rules
- Dashboard UI
- Pack Gen UI
- Cutter Studio UI
- Validation and export presentation
- Empty, loading, error and unavailable states
- Responsive behaviour
- Accessibility
- Gemini-to-Codex design workflow
- Approved UI direction register

This document does not own:

- Product hierarchy or release boundaries
- Packaging-engineering calculations
- Database entities
- API contracts
- AI prompt and retrieval architecture
- Delivery sequencing
- Test matrices

Those responsibilities belong to their dedicated source files.

`01_Product_Architecture.md` controls the product hierarchy, module responsibilities and beta boundary. This document must not contradict it.

There is no separate `00_Master_Context.md`.

---

# 1. Product and Brand Context

## 1.1 Klyro

Klyro is the customer-facing master brand.

The Klyro visual system applies to:

- The public Klyro website
- The Klyro App
- Customer-facing services
- Account and access experiences
- Product communication
- Shared interaction patterns

## 1.2 Klyro App

The Klyro App is the main connected working environment.

Its UI must make Dashboard, Pack Gen, Cutter Studio, Validation Centre, Export Release and Account & Specs feel like parts of one product.

## 1.3 CutNFlow / CnF Tech

CutNFlow/CnF Tech is the underlying packaging-engineering capability.

It may appear in technical context where useful, but must not compete visually with Klyro as the application brand.

## 1.4 FlowAI

FlowAI is the intelligence, explanation and guided-assistance layer.

FlowAI should appear as embedded assistance within workflows, particularly Pack Gen and Validation Centre.

It must not dominate the product as a generic chatbot identity.

---

# 2. Design Position

Klyro should feel:

- Professional
- Precise
- Technical
- Confident
- Minimal
- Premium
- Manufacturing-aware
- Fast
- Calm
- Project-centred
- Suitable for sustained engineering work

Klyro should not feel like:

- A generic SaaS dashboard
- A playful design toy
- A consumer chat application
- A decorative AI product
- A cluttered CAD clone
- A spreadsheet with oversized buttons
- A collection of unrelated visual experiments
- A website placed inside an application shell

Engineering clarity and workflow confidence take priority over decoration.

The interface should look advanced without becoming unfamiliar or difficult to operate.

---

# 3. Core UI Principles

1. The cutter, project or current task is the visual focus.
2. Primary actions must be obvious, but not repeated unnecessarily.
3. Technical information must remain readable at compact sizes.
4. Complex detail should use progressive disclosure.
5. The user should understand what is interactive, disabled, selected and validated.
6. Colour must communicate hierarchy or status, not decorate every surface.
7. Light and dark modes must be designed independently, not mechanically inverted.
8. Existing working controls should be reused rather than duplicated.
9. Future features must not navigate to broken or empty pages.
10. Disabled states must explain availability where confusion is likely.
11. Canvas overlays must not become part of exported engineering artwork.
12. Visual customisation must remain separate from engineering geometry.
13. Status must not rely on colour alone.
14. Keyboard, focus and screen-size behaviour must be considered during implementation.
15. The UI must preserve project and selected-element state during normal navigation.
16. Studio layouts may be denser than Dashboard and Pack Gen.
17. Every module must use the shared Klyro shell and component language.
18. Screenshots support implementation, but the written design system is authoritative.

---

# 4. Brand Assets

Use the approved Klyro logo assets.

Rules:

- Do not recreate the logo as typed text.
- Do not redraw or alter the official Klyro mark during normal UI work.
- Use the correct logo variant for its background.
- Light surfaces use the approved dark or primary logo.
- Dark surfaces use the approved reverse/light logo.
- Preserve clear space.
- Do not distort, stretch or crop the logo.
- Do not place the logo on a surface where it loses contrast.
- The compact navigation state may use the approved Klyro icon where available.
- CutNFlow/CnF Tech should not replace the Klyro brand mark in customer-facing app chrome.

---

# 5. Brand Colour System

Klyro uses a restrained technical palette.

## 5.1 Core Brand Colours

- Spartan Red: Pantone 194 C / `#9E1316`
- Dusky Cream: Pantone 482 C / `#DBC8B6`
- Dark Charcoal: Pantone 419 C / `#1D1D1D`

## 5.2 Spartan Red

Use Spartan Red for:

- Primary actions
- Active navigation accents
- Selected states
- Important focus points
- Klyro brand accents
- Controlled progress emphasis
- Critical action emphasis where context supports it

Do not use Spartan Red for every button, border, icon and heading.

Too much red makes the interface feel alarming and reduces the distinction between normal action and critical status.

## 5.3 Dusky Cream

Use Dusky Cream for:

- Warm light-mode influence
- Supporting surfaces
- Selected or highlighted neutral regions
- Warm contrast
- Brand-consistent text or accents in dark mode
- Subtle empty-state treatment

Do not use cream-on-white combinations that reduce legibility.

## 5.4 Dark Charcoal

Use Dark Charcoal for:

- Dark-mode foundations
- Structural surfaces
- Primary light-mode text
- Technical panels
- Strong outlines
- App chrome
- Canvas support surfaces
- Icon and label contrast

Dark mode should use layered charcoal surfaces rather than pure black throughout.

## 5.5 Supporting Neutrals

Recommended existing neutral direction:

- Near Black: `#111111`
- Dark Charcoal: `#1D1D1D`
- Charcoal Surface: `#282828`
- Mid Grey: `#666666`
- Soft Grey: `#E8E3DD`
- Warm Off White: `#F7F1EA`
- Clean White: `#FFFFFF`

Use warm greys where possible.

Avoid default cold blue-grey SaaS styling unless the state genuinely requires it.

---

# 6. Semantic Colour Roles

Semantic colours must use theme tokens rather than repeated hardcoded values.

Required roles:

- `status.neutral`
- `status.inProgress`
- `status.pass`
- `status.warning`
- `status.critical`
- `status.info`
- `status.disabled`
- `focus.visible`
- `selection.active`
- `surface.canvas`
- `surface.panel`
- `surface.overlay`

Meanings:

- Neutral: not started, not run or informational
- In Progress: processing, active work or partial completion
- Pass: validated, successful or export ready
- Warning: soft error or non-blocking risk
- Critical: blocking error, failed validation or destructive risk
- Info: guidance or contextual information
- Disabled: visible but unavailable

Status colour must be paired with:

- Text
- Icon
- Shape
- Tooltip or accessible description where useful

Do not communicate status by colour alone.

---

# 7. Theme System

## 7.1 Theme Architecture

The app must use shared theme variables or design tokens.

Do not implement theme behaviour through:

- CSS inversion filters
- One-off hardcoded colour overrides
- Separate duplicated component markup
- Logo opacity tricks
- Page-specific theme hacks

Each shared component must define light and dark states through the same component API.

## 7.2 Light Mode

Light mode should use:

- Warm off-white or controlled cream page surfaces
- Dark Charcoal primary text
- Soft warm panel surfaces
- Restrained borders
- Spartan Red primary action
- Clear field and card separation
- Correct dark/primary Klyro logo

Light mode should feel:

- Clean
- Warm
- Technical
- Premium
- Easy to scan

Avoid:

- Cream text on cream surfaces
- White cards disappearing into white backgrounds
- Excessive beige tint
- Heavy dark shadows
- Red borders around every component

## 7.3 Dark Mode

Dark mode should use:

- Dark Charcoal foundations
- Layered charcoal panels
- Warm off-white or cream text
- Restrained warm borders
- Spartan Red accent
- Correct reverse/light Klyro logo
- Clear cutter and control contrast

Dark mode should feel:

- Focused
- Studio-like
- Premium
- Comfortable during long sessions

Avoid:

- Pure black across all surfaces
- Neon red accents
- Low-contrast grey labels
- Cream surfaces used as large bright blocks
- Icons disappearing against dark controls

## 7.4 Theme Verification

Every new or amended interface must be checked in both themes.

A component is not complete because it works in one mode.

Verify:

- Logo variant
- Text contrast
- Input borders
- Selected state
- Hover state
- Focus-visible state
- Disabled state
- Panel separation
- Status colours
- Canvas visibility
- Tooltip contrast
- Modal and drawer surfaces

---

# 8. Typography

## 8.1 Font Policy

Preserve the approved Klyro application font stack already used by the app.

Do not replace the application font during a module amendment unless a separate approved brand decision requires it.

The font must remain:

- Highly readable
- Suitable for engineering measurements
- Suitable for compact controls
- Suitable for mixed-case labels
- Clear at small sizes
- Consistent across Klyro App modules

Use system fallbacks behind the approved primary font.

## 8.2 Type Scale

Recommended working ranges:

- App/page title: 28–36px
- Hero heading: 30–44px depending on page purpose
- Section title: 20–24px
- Card title: 16–18px
- Body: 14–16px
- Secondary text: 13–14px
- Technical label: 12–13px
- Status label: 11–12px
- Measurement label: 11–13px
- Tooltip: 12–13px

Studio interfaces should avoid oversized headings.

## 8.3 Weight

Recommended ranges:

- Page or hero heading: 600–700
- Section heading: 600
- Card or panel heading: 600
- Body: 400–500
- Button: 600
- Status: 600
- Technical labels: 500–600

Use weight to guide attention.

Do not make every label bold.

## 8.4 Copy Style

Application copy should be:

- Direct
- Practical
- Calm
- Specific
- Helpful
- Free from inflated marketing language

Prefer:

- `Generate Pack`
- `Build Pack`
- `Open Cutter Studio`
- `Run Validation`
- `Save Project`
- `Export Release`

Avoid vague labels such as:

- `Go`
- `Submit`
- `OK`
- `Continue` without context
- `Do It`

---

# 9. Spacing, Radius, Borders and Shadows

## 9.1 Spacing Scale

Use a shared spacing scale:

- 4px — micro
- 8px — compact
- 12px — panel internal
- 16px — standard
- 24px — section
- 32px — large
- 48px — page
- 64px — major page separation where required

Dashboard and Pack Gen can use more breathing room.

Cutter Studio should use compact controlled spacing.

## 9.2 Radius

Use:

- Small radius for technical controls
- Medium radius for buttons, cards and compact panels
- Larger radius only for major hero or modal surfaces where it suits the existing Klyro language
- Circular treatment for approved roundel actions

Avoid excessive pill and bubble styling.

## 9.3 Borders

Use borders to communicate:

- Component boundary
- Focus
- Selection
- Panel hierarchy
- Disabled or warning state

Prefer subtle borders over heavy shadows.

## 9.4 Shadows

Use restrained elevation only when a component floats above another surface.

Examples:

- On-canvas toolbar
- Modal
- Drawer
- Popover
- Tooltip

Avoid heavy card shadows.

---

# 10. Motion and Transitions

Motion must be functional.

Use motion for:

- Main tray expansion and collapse
- Panel opening and closing
- Modal entry and exit
- Dropdown and accordion expansion
- Hover or focus feedback
- Validation state update
- Loading feedback

Recommended duration:

- Fast state feedback: 120–180ms
- Panels and navigation: 180–240ms
- Larger overlays: 200–280ms

Use controlled ease-out behaviour.

Avoid:

- Springy motion
- Decorative bounce
- Large scale changes
- Continuous background animation
- Animated gradients
- Motion that delays engineering interaction

Respect reduced-motion preferences.

---

# 11. Application Shell

The application shell is shared across all Klyro App modules.

It includes:

- Global top header
- Left main navigation tray
- Main content region
- Optional right contextual panel
- Module-specific workspace controls
- Modal and drawer layers

The shell must remain visually stable during module changes.

Users should not feel that each route is a different application.

---

# 12. Global Top Header

## 12.1 Structure

The top header contains:

### Left

- Official Klyro logo or lock-up

### Centre

- Compact current-route or active-page status pill
- The value updates from the active route

Examples:

- Dashboard
- Pack Gen
- Cutter Studio
- Validation Centre

### Right

- Existing utility controls
- Theme control where implemented
- Help or notification controls where implemented
- Signed-in user display
- PRO or account status treatment where implemented

## 12.2 Behaviour

The header should:

- Remain compact
- Align controls vertically
- Use the existing Klyro dark structural surface where accepted
- Remain fixed or sticky where this is the established shell behaviour
- Prevent page content from moving underneath it
- Work in both themes
- Use real route and user state
- Avoid hardcoded usernames or page titles

Do not place module-specific Cutter Studio tools in the global header.

---

# 13. Left Main Navigation Tray

## 13.1 Default State

The main navigation starts collapsed in icon-only mode.

Requirements:

- No initial expanded-to-collapsed flash
- Collapsed state is the default when no stored preference exists
- Icons remain centred and legible
- Tooltips identify items
- Active state remains visible
- The user can expand and collapse the tray
- The tray does not reset on every route change

## 13.2 Recommended Widths

- Expanded: approximately 248–264px
- Collapsed: approximately 80–88px
- Expanded icon size: approximately 18–20px
- Collapsed icon size: approximately 22–24px

Use the app’s actual component tokens rather than repeated page-specific values.

## 13.3 Navigation Structure

### Dashboard

- Dashboard

### Generator

- Pack Gen

### Studios

- Cutter Studio
- Artwork Studio — TBA / disabled until functional

### QC & Export

- Validation Centre
- Export Release

### Configuration

- AI & Press Config
- Print Config — disabled until functional
- Preferences — disabled or limited until functional

### User

- Account & Specs

Section headings are labels, not routes.

## 13.4 Disabled Navigation

Disabled items must:

- Remain visible where product direction requires it
- Use muted but readable text and icon
- Avoid active hover styling
- Prevent click and keyboard navigation
- Use `TBA` or `Coming soon` where helpful
- Never use `href="#"`
- Never redirect to Dashboard as a fallback
- Never open an empty page

## 13.5 Responsive Behaviour

Desktop:

- Expanded and collapsed tray states

Smaller screens:

- Overlay drawer
- Clear close control
- No permanent narrow tray covering content
- Keyboard and focus management
- No page-level horizontal overflow

---

# 14. Page and Workspace Density

Use different visual density by context.

- Dashboard: medium spacious
- Pack Gen: medium, prompt-focused
- Cutter Studio: high density but controlled
- Validation Centre: medium density with clear severity
- Export Release: medium density
- Account & Specs: medium density
- Artwork Studio future: high density but readable

Do not force one card and spacing pattern across every page.

---

# 15. Buttons

## 15.1 Primary Button

Use for the strongest page action.

Examples:

- Start Here
- Generate Pack
- Run Validation
- Confirm Export
- Save Changes

Style:

- Spartan Red background
- High-contrast label
- Controlled radius
- Clear hover and focus states
- Loading and disabled states

Only one primary action should dominate a local area.

## 15.2 Secondary Button

Use for alternative or supporting actions.

Examples:

- Build Pack
- View Details
- Save Draft
- Edit Specification
- Browse Template Library

Style:

- Neutral or outlined treatment
- Clear contrast in both themes
- Visually weaker than the local primary action

## 15.3 Tertiary and Ghost Actions

Use for:

- Cancel
- Reset
- View more
- Clear search
- Close secondary detail

These must remain discoverable without competing with primary actions.

## 15.4 Destructive Actions

Use only for:

- Delete
- Remove
- Discard
- Archive where destructive

Rules:

- Use explicit labels
- Use confirmation or undo where established
- Do not use the standard primary action treatment
- Do not place large destructive controls throughout dense panels

## 15.5 Icon Buttons

Icon buttons must:

- Use the existing icon family
- Include tooltip and accessible name
- Have clear hover, selected, disabled and focus states
- Retain a sufficient target size
- Not rely on unfamiliar symbols without explanation

## 15.6 Roundel Actions

Roundels are approved for selected studio and dashboard actions.

A roundel contains:

- Circular icon container
- Visible text label
- Consistent size
- Restrained hover/focus treatment

Recommended diameter:

- 44–64px depending on context

Roundels must not become generic oversized floating action buttons.

---

# 16. Forms and Inputs

Inputs must:

- Have visible labels
- Show units where relevant
- Keep helper and validation text close to the field
- Use consistent height and spacing
- Have clear focus-visible state
- Preserve entered state appropriately
- Avoid placeholder-only labelling

Engineering examples:

- Width (mm)
- Height (mm)
- Seal Width (mm)
- Gusset (mm)
- Bleed (mm)
- Safe Zone (mm)
- Repeat Length (mm)
- Web Width (mm)

Use progressive disclosure for advanced settings.

Do not display unsupported fields as if they work.

---

# 17. Cards and Tiles

Cards are suitable for:

- Recent Projects
- Template previews
- Validation summaries
- Export options
- Settings groups

Card rules:

- Show the most important information first
- Use restrained borders
- Use minimal or no shadow
- Avoid large decorative imagery
- Provide a clear click target
- Keep metadata secondary
- Use progressive disclosure for extra detail
- Remain consistent in height within a grid where practical

Do not place every page section inside a large card.

---

# 18. Modals, Drawers and Popovers

## 18.1 Modal Use

Use modals for focused workflows such as:

- Manual Build Pack
- Pack Specification
- Export configuration
- Quick Export
- Cutter Preferences
- Validation issue detail
- Confirmation
- Upload
- Account or specification edit where suitable

## 18.2 Modal Rules

A modal must:

- Have a clear title
- Have a visible close action
- Use one primary and appropriate secondary actions
- Trap focus where required
- Close with Escape where consistent
- Return focus to the initiating control
- Fit within the viewport
- Use internal scrolling for long content
- Preserve critical warnings
- Avoid becoming a hidden multi-page application

## 18.3 Drawers and Panels

Use drawers for:

- Right-side Cutter Studio configuration
- Layers
- Customise
- Narrow-screen contextual panels

A drawer must:

- Have a clear title and close action
- Preserve context
- Use internal scrolling
- Not scroll the complete app unnecessarily
- Remain below global modals
- Avoid obscuring essential controls without a clear way to close

---

# 19. Progressive Disclosure

Use progressive disclosure for:

- Engineering assumptions
- Recommendation reasons
- Missing information
- Validation explanation
- Advanced pack settings
- Press-specific settings
- Customer-specific rules
- Export detail
- FlowAI reasoning

The default view should show:

- Current state
- Main action
- Important warning
- Essential value

The user can expand deeper detail without being forced through it.

---

# 20. Dashboard

## 20.1 Required Page Order

Dashboard uses this order:

1. Hero
2. Quick Links
3. Project search
4. Recent Projects

Do not reintroduce a dense command-centre dashboard during beta.

## 20.2 Hero

The hero contains:

- Short heading
- Approximately four to five balanced lines of supporting copy
- `Start Here` primary action linked to Pack Gen

Current copy direction:

### Heading

`Packaging workflows, made clearer.`

### Supporting Copy

`Start with an idea, an existing specification or a production-ready brief.`  
`Klyro guides each user through the same connected workflow at the level they need.`  
`Generate pack specifications, configure cutters and prepare files with greater clarity.`  
`Built for first-time users, designers, repro teams and packaging professionals alike.`

The final line wrapping may adapt responsively.

Do not add:

- Production Control Center
- Active System
- Version labels
- System-health decoration
- Competing hero actions
- Generic technical marketing badges

## 20.3 Quick Links

Use this exact order:

1. Template Library
2. Legend Config
3. New Project
4. Cutter Preferences
5. Upload Items
6. Export

Use prominent roundel-style icons with visible labels.

Desktop:

- One row where space allows

Tablet:

- 3 × 2

Mobile:

- 2 × 3

Hover and focus may use:

- Restrained lift
- Border emphasis
- Controlled glow
- Roundel emphasis

Avoid neon effects and large scale animation.

## 20.4 Quick-Link Behaviour

- New Project opens the existing manual Pack Gen input pop-up.
- Export opens a modal with `Export` and `Quick Export` tabs.
- Other links reuse existing routes, modals or drawers.
- An unavailable link must show a clear unavailable state.
- Do not create an empty destination solely to make a tile clickable.

## 20.5 Project Search

Place search immediately before Recent Projects.

Placeholder:

`Search projects and files…`

Search should support available project metadata such as:

- Project name
- Reference
- Customer or brand
- Pack type
- File name where supported

Search must use the full available project collection, not only visible cards.

## 20.6 Recent Projects

Default behaviour:

- Most recently worked on first
- Maximum 24 visible by default
- Four columns on large desktop where space allows
- Up to six rows
- Search locates older or non-visible projects

Responsive:

- Large desktop: 4 columns
- Standard desktop: 3 columns where needed
- Tablet: 2 columns
- Mobile: 1 column

## 20.7 Project Cards

Display only available real data.

Preferred hierarchy:

- Project name
- Reference or job number
- Customer or brand
- Pack type
- Current stage
- Last updated
- Compact preview where available

Clicking a card opens the existing Project.

Do not fill the card with permanent competing actions.

Use an overflow or existing details action for secondary controls.

## 20.8 Dashboard Empty States

No projects:

- Explain that no projects exist
- Provide Start Here or New Project
- Do not show fake samples

No search results:

- `No projects or files match your search.`
- Provide clear-search action

---

# 21. Pack Gen

## 21.1 Required Page Order

Pack Gen uses this order:

1. Short hero with Build Pack
2. Large prompt composer
3. Explore Our Templates

Remove from the visible page:

- `CUSTOM LAYOUT_4`
- Pack Selector slider
- Slider track, controls and empty container

Do not remove the underlying pack model or manual builder.

## 21.2 Hero

Left:

- Heading
- Supporting text

Right:

- `Build Pack` secondary action

Heading:

`Tell us about your product…`

Supporting text:

`Describe what you are packing, the format you need and any known dimensions or production requirements.`

Desktop:

- Copy left
- Build Pack right

Narrow screens:

- Stack Build Pack below the copy

## 21.3 Build Pack

Build Pack opens the existing manual/barebones build interface.

Rules:

- Reuse the existing component and logic
- Do not create a second manual builder
- Do not navigate to a blank page
- Do not reset valid state unnecessarily
- Preserve close, cancel and continue behaviour
- Return focus to Build Pack when closed

Build Pack is secondary to Generate Pack.

## 21.4 Prompt Composer

The prompt composer is the main page focus.

Placeholder:

`Describe your product, pack type, dimensions, material or production requirements…`

Requirements:

- Multiline textarea
- Wide but readable
- Approximately 180–240px initial desktop height
- Clear label
- Clear focus state
- Preserve entered content during normal page use
- Reuse existing Pack Gen state
- Do not resemble a consumer chat bubble

## 21.5 Generate Pack

Label:

`Generate Pack`

Rules:

- Primary action
- High contrast in both themes
- Associated clearly with the prompt
- Reuse existing generation flow
- Prevent duplicate submission while loading
- Show inline empty-prompt validation
- Do not add a second Submit button

## 21.6 Explore Our Templates

Heading:

`Explore Our Templates`

Supporting text:

`Start from a familiar pack format and adapt the specification to your product.`

Use compact visual previews.

Possible recognised examples:

- Doypack
- K-Seal Pouch
- Three-Side Seal
- Pillow Pack
- Flow Wrap
- Custom Format

Only display supported or recognised formats.

Until individual shortcuts work:

- Use Preview, TBA or Coming Soon
- Do not navigate to broken routes
- Do not alter project state
- Do not claim a template was applied

A working general Template Library action may be reused.

---

# 22. Cutter Studio

## 22.1 Workspace Hierarchy

Cutter Studio contains:

1. Global Klyro shell
2. Compact studio header/status area
3. Main cutter workspace
4. On-canvas horizontal tool dock
5. Right configuration panel
6. Centred studio roundel actions
7. Cutter canvas as the visual focus

Do not create multiple floating menus with overlapping responsibility.

## 22.2 Status Strip

Display left to right:

1. `Pack Type: [value]`
2. `VALIDATED`
3. `ERRORS: [count]`
4. `NOTES: [count/value]`

### Pack Type

- Dynamic
- Uses the current Project/pack state
- Shows `Not selected` when unavailable
- Does not retain stale data

### Validated

- Grey: validation not run
- Blue/neutral progress: validation running
- Green: current Project revision passed validation; Warnings or Advisories may still be listed
- Red: current Project revision failed because one or more Critical issues remain
- Amber: validation is stale because the Project changed after the latest completed run
- Red/neutral error treatment: validation could not complete

The text remains `VALIDATED`; the status must include an accessible explanation and must never show a prior Passed result as current after an engineering-affecting change.

### Errors

- Green: zero errors
- Orange: soft/non-critical issues only
- Red: at least one critical issue

Use actual validation severity data.

### Notes

- Neutral treatment
- Real count where available
- Must not appear as an error solely because notes exist

## 22.3 On-Canvas Horizontal Tool Dock

The Cutter Studio tool dock sits within the actual cutter workspace.

Placement:

- Upper-left of the usable cutter area
- Approximately 16–24px from the top
- Approximately 20–32px from the left
- Positioned relative to the workspace, not the browser
- Above the canvas/grid
- Below global modal layers

Behaviour:

- Horizontal landscape orientation
- Panning does not move it
- Zooming does not resize it
- Fit-to-view does not move it
- Right-panel opening keeps it aligned to usable workspace
- Main tray expansion keeps it aligned
- It must not become part of exported artwork

Use the existing tool set and handlers.

Common current tools may include:

- Select
- Pan
- Measure
- Zoom in
- Zoom out
- Reset or fit view

Do not hardcode away additional existing tools.

The overlay wrapper should not block canvas interaction outside the toolbar.

## 22.4 Cutter Canvas

The cutter canvas must remain:

- Sharp
- Measurable
- Centre-focused
- Responsive to available workspace
- Independent from UI overlays
- Stable during panel changes

Opening a menu must not unnecessarily reset:

- Zoom
- Pan
- Selected element
- Current tool

Fit-to-view calculations should account for available workspace without permanently offsetting the cutter excessively.

## 22.5 Canvas Visual Meanings

Use existing implementation tokens and engineering rules.

Typical visual roles include:

- Cutter edge: strong solid technical line
- Fold line: distinct thinner line
- Seal area: controlled filled or outlined region
- Safe zone: distinct dashed boundary
- Eyemark: clear technical mark
- Perforation: differentiated technical line
- Measurement: readable line and label
- Validation issue: non-destructive overlay or marker

Do not alter engineering meaning merely to improve appearance.

## 22.6 Right Configuration Panel

The right-side configuration area contains:

- Base
- Attributes
- Customise
- Layers

The panel should:

- Use internal vertical scrolling
- Preserve current section state
- Keep the cutter usable
- Avoid excessive width
- Become a drawer/overlay where required on narrower screens
- Use a clear close action
- Avoid resetting current values during section changes

## 22.7 Studio Roundel Actions

Use this exact order:

1. Pack Spec
2. Import
3. Save/Export

The group is centralised within the Cutter Studio page.

Each action uses:

- Roundel icon
- Visible label
- Consistent sizing
- Existing icon family
- Clear hover/focus state

Each action opens the existing interface.

Do not duplicate Pack Spec, Import or Save/Export logic.

---

# 23. Cutter Studio Layers

## 23.1 Panel Structure

Layers uses:

1. Fixed compact header
2. Slim vertical scroll rail
3. Vertical group navigation
4. Main landscape layer rows
5. No large footer action area

Concept:

```text
[ Scroll Rail ] [ Group Tabs ] [ Landscape Layer Rows ]
```

## 23.2 Group Navigation

Group tabs are derived from actual layer groups.

Possible groups include:

- Base
- Cutter Edges
- Seals
- Fold Lines
- Safe Zones
- Eyemarks
- Attributes
- Imported Items
- Annotations

Do not create empty groups only to fill the interface.

Behaviour:

- Selecting a tab scrolls to the group
- Manual scrolling updates the active tab
- The group navigation remains visible
- Avoid brittle fixed pixel mapping
- Avoid active-tab flicker

## 23.3 Landscape Layer Rows

Each row should contain:

### Left

- Preview, colour chip or element icon

### Centre

- Layer name
- Optional type/metadata

### Right

- Visibility
- Lock
- Delete where allowed
- Additional existing actions where required

Rows are stacked vertically.

Do not use a horizontal layer carousel.

## 23.4 Layer State

Selected:

- Clear row selection
- Synchronised with canvas

Hidden:

- Remains listed
- Muted but readable
- Eye control reflects state

Locked:

- Remains visible
- Canvas editing restrictions are enforced
- Lock control reflects state

Protected:

- Delete omitted or disabled
- Engineering protections remain authoritative

## 23.5 Selection Synchronisation

- Selecting a layer selects the canvas element
- Selecting a canvas element highlights and reveals its layer
- Do not create a separate panel-only selection source
- Do not reset zoom or pan
- Do not recalculate geometry merely because a layer is selected

## 23.6 Removed Footer Actions

Do not display these large actions in Layers:

- Validate Cutter Guide
- Send to Artwork Studio

Their underlying functionality remains elsewhere.

The panel should use the released space for layer content.

---

# 24. Cutter Studio Customise

## 24.1 Removed Sections

Remove from Customise:

- Large `NO ELEMENT SELECTED` card
- Long explanatory empty-state paragraph
- `BROWSE ATTRIBUTES`
- `VALIDATE CUTTER GUIDE`
- `SEND TO ARTWORK STUDIO`

Do not leave an empty footer.

## 24.2 No-Selection State

Use a compact notice:

### Heading

`No element selected`

### Supporting Text

`Select an editable cutter element or layer to customise its appearance.`

The notice should be compact.

The user should still see the structure of available settings, with unsupported controls disabled.

## 24.3 Selected Element Summary

When selected, show:

- Element name
- Type or group
- Small preview
- Lock status where relevant

Keep this summary compact and optionally sticky below the panel header.

## 24.4 Section Order

1. Selected element summary or compact notice
2. Colour & Appearance
3. Opacity
4. Line & Stroke
5. Presets
6. Reset Appearance where safely supported

## 24.5 Colour & Appearance

May include existing supported controls:

- Current colour preview
- Hex input
- Hue control
- Shade or brightness
- Fill/stroke target where supported

Labels must sit clearly with their controls.

Do not create multiple unsynchronised colour values.

## 24.6 Opacity

Show:

- Label
- Slider
- Current percentage

Keep the value aligned with the control.

Use the existing opacity state and keyboard-accessible slider.

## 24.7 Line & Stroke

Show relevant existing options such as:

- Solid
- Dashed
- Dotted
- Stroke width where already supported
- Existing line presets

Prefer visible rows or a compact grid rather than a one-item-at-a-time carousel.

## 24.8 Presets

Presets may include actual existing:

- Colour presets
- Style presets
- Element defaults
- User presets

Do not display fake saved presets.

Preset application must remain compatible with undo, save and restore.

## 24.9 Context-Aware Controls

Only show or enable controls supported by the selected element.

Examples:

- A line may expose colour, opacity and line style.
- A filled shape may expose fill and opacity.
- A locked element may restrict editing.
- A protected element may allow inspection but not modification.

Do not infer capability only from the visible element name where a capability model exists.

---

# 25. Validation Centre UI

## 25.1 Purpose

Validation Centre is the project-level quality and risk workspace.

FlowAI may explain results, but deterministic validation controls pass/fail state.

## 25.2 Validation Summary

Show:

- Validation status
- Total issues
- Critical issues
- Warnings/soft issues
- Passed checks or summary where useful
- Export blocking state
- Re-run action

## 25.3 Validation Items

Each item should show:

- Severity
- Title
- Practical short message
- Affected module
- Affected element where available
- Why it matters
- Suggested resolution
- Current resolution state
- Relevant action

## 25.4 Severity

- Critical: red, explicit label, strong icon, blocking where required
- Warning/soft error: orange/amber, explicit label
- Advisory: neutral technical treatment
- Pass: green or positive neutral

Do not rely on colour alone.

## 25.5 Message Style

Prefer:

`The eyemark is too close to the cutter edge. This may make machine registration unreliable.`

Avoid:

`Invalid eyemark geometry.`

Prefer:

`Critical artwork is inside the seal area. This may be distorted, hidden or affected by heat sealing.`

Avoid:

`Safe zone error.`

Use concise default text with expandable detail.

## 25.6 FlowAI Explanation

FlowAI explanation may include:

- Plain-language meaning
- Production consequence
- Assumption
- Suggested next step
- Link to relevant knowledge

It must not visually override the deterministic severity or status.

---

# 26. Export Release UI

## 26.1 Product-Level Export

The user-facing module is `Export Release`.

Cutter Studio may use `Save/Export` as the local action.

Dashboard may use `Export` as a shortcut.

## 26.2 Export Modal

Dashboard Export opens a modal with two primary tabs:

1. Export
2. Quick Export

## 26.3 Export Tab

Show existing full options:

- Supported format
- File naming
- Validation status
- Required configuration
- Release warnings
- Confirm action

## 26.4 Quick Export

Show:

- Saved default or preset
- Format
- Destination/download behaviour where relevant
- What will be produced
- Confirm action

Do not hide the chosen output behind an unexplained quick action.

## 26.5 Save Versus Export

Saving the Project and exporting a file are distinct.

The UI must not silently export when the user intends to save.

## 26.6 Critical Validation

When critical issues exist:

- Show a clear warning
- Block or require intentional override according to product rules
- Do not hide the issue in a tooltip
- Do not present a false green Export Ready state

When validation is Not Run, Running, Stale or in Error:

- Do not present the Project as release-ready.
- Explain that current-revision validation is required.
- Allow draft/non-release output only where the Export Service explicitly supports it.

---

# 27. Account & Specs UI

Account & Specs should remain practical during beta.

Possible sections:

- User details
- Unit preference
- Saved pack defaults
- Cutter defaults
- Export defaults
- Basic specification preferences
- Account status

Use standard forms and grouped panels.

Do not turn the beta area into a full administration portal.

Future company, billing, permissions and workspace controls should remain clearly separated.

---

# 28. Artwork Studio Future UI

Artwork Studio is post-beta unless implementation status changes.

Future UI may include:

- Artwork canvas
- Cutter overlay
- Bleed overlay
- Safe zone overlay
- Barcode and QR checks
- Colour summary
- White plate summary
- Varnish/lacquer summary
- Validation panel
- Artwork layers
- FlowAI assistance
- Preflight and Export Release handoff

Until functional:

- Keep navigation disabled/TBA
- Do not open an empty studio
- Do not imply artwork validation works
- Preserve future design compatibility without delaying beta

---

# 29. Status Components

## 29.1 StatusChip

Use for compact states such as:

- Draft
- In Progress
- Saved
- Validation Not Run
- Validation Running
- Validation Passed
- Validation Failed
- Validation Stale
- Validation Error
- Export Pending
- Export Ready
- Feature Unavailable

## 29.2 ValidationBadge

Use for:

- Critical
- Warning
- Advisory
- Pass

## 29.3 Status Rules

- Use consistent wording
- Pair colour with text/icon
- Avoid long sentences inside chips
- Do not use success green for an action that has not occurred
- Do not use red merely because validation has not been run
- Make status accessible to assistive technologies

---

# 30. Loading, Empty, Error and Unavailable States

## 30.1 Loading

Use:

- Restrained skeletons
- Spinner plus meaningful label
- Button progress for local actions

Avoid blank content that looks broken.

## 30.2 Empty

Explain:

- What is empty
- Why it may be empty
- What the user can do next

## 30.3 Error

Show:

- What failed
- Whether work was saved
- Suggested next action
- Retry where supported
- Technical detail only when helpful

Do not use silent failure.

## 30.4 Unavailable

Use for future or disabled features.

Show:

- Feature name
- TBA/Coming Soon where appropriate
- Concise explanation
- No fake controls
- No broken route

---

# 31. Tooltips

Use tooltips for:

- Collapsed navigation items
- Icon-only toolbar controls
- Layer visibility/lock/delete
- Status explanation
- Truncated labels
- Disabled reason where concise

Tooltips must:

- Appear on hover and keyboard focus
- Use readable contrast
- Not contain essential instructions that are unavailable elsewhere
- Avoid long paragraphs
- Remain above local panels but below modal layers

---

# 32. Accessibility

All implementation must consider:

- Keyboard navigation
- Visible focus
- Semantic buttons and links
- Labels for inputs
- Accessible names for icons
- Status not communicated by colour alone
- Modal focus trapping
- Focus return on close
- Escape behaviour where appropriate
- Disabled state semantics
- Touch-target size
- Readable contrast
- Reduced-motion preference
- Screen-reader descriptions for dynamic validation status
- Clear errors associated with fields

Do not remove focus outlines without providing an equivalent visible focus style.

---

# 33. Responsive Behaviour

Klyro is primarily a professional desktop and laptop application.

## 33.1 Desktop

Prioritise:

- Stable shell
- Usable canvas
- Visible contextual information
- Controlled density
- Docked right panels where suitable

## 33.2 Narrow Desktop and Tablet

Use:

- Collapsed main tray
- Overlay/drawer contextual panels
- Wrapped dashboard grids
- Stacked hero actions
- Scrollable tool strips where unavoidable
- Full-width modals within safe viewport margins

## 33.3 Mobile

Mobile may support:

- Basic review
- Project search/open
- Validation review
- Account
- Limited Pack Gen input

Full Cutter Studio engineering editing is not the primary mobile target.

However, the interface must not be completely broken.

Rules:

- Prevent page-level horizontal overflow
- Use a mobile navigation drawer
- Use full-width or near-full-width panels
- Keep touch targets usable
- Avoid squeezing desktop toolbars into unreadable controls
- Preserve a clear close action

---

# 34. Z-Index and Overlay Order

Use shared z-index tokens.

Recommended logical order:

1. Base page
2. Cutter/artwork canvas
3. Canvas interface overlays
4. Docked panels
5. Drawers/popovers
6. Tooltips
7. Modals
8. Critical confirmation dialogs

Do not solve layering issues with arbitrary page-specific extreme z-index values.

---

# 35. Component Naming

Use names that describe purpose.

Good examples:

- `GlobalAppHeader`
- `MainNavigationTray`
- `DashboardHero`
- `DashboardQuickLinks`
- `ProjectSearch`
- `RecentProjectsGrid`
- `ProjectCard`
- `PackGenHero`
- `BuildPackAction`
- `PackPromptComposer`
- `TemplateExplorer`
- `CutterStatusStrip`
- `CanvasToolDock`
- `StudioRoundelActions`
- `RightConfigurationPanel`
- `LayersPanel`
- `LayerGroupNavigation`
- `LandscapeLayerRow`
- `CustomisePanel`
- `SelectedElementSummary`
- `ValidationSummary`
- `ValidationIssue`
- `ExportReleaseModal`

Avoid:

- `NiceCard`
- `RedBoxThing`
- `NewPopup2`
- `MenuFinal`
- `TempComponent`

---

# 36. Shared Component Set

Recommended shared components include:

- Button
- IconButton
- RoundelAction
- Card
- Panel
- Drawer
- Modal
- Tabs
- Input
- Select
- Textarea
- Slider
- StatusChip
- ValidationBadge
- Tooltip
- EmptyState
- LoadingState
- ErrorState
- DisabledFeature
- ProjectCard
- PageHeader
- PanelHeader
- StudioToolbar
- LayerRow
- SearchInput

Reuse shared components instead of creating module-specific copies with slightly different styles.

---

# 37. Design Tokens

Recommended token categories:

- `brand`
- `surface`
- `text`
- `border`
- `status`
- `spacing`
- `typography`
- `radius`
- `shadow`
- `zIndex`
- `transition`
- `componentSize`
- `focus`
- `canvas`

Required brand values:

```text
brand.spartanRed = #9E1316
brand.duskyCream = #DBC8B6
brand.darkCharcoal = #1D1D1D
```

All semantic values should map through light and dark themes.

Avoid repeated raw hex values inside module components.

---

# 38. Gemini-to-Codex Workflow

Gemini is used for:

- Visual exploration
- Layout concepts
- Interaction concepts
- Light/dark comparison
- UI refinement

Codex is used for:

- Real application implementation
- Component integration
- State connection
- Route integration
- Accessibility implementation
- Testing
- Refactoring into shared components

Workflow:

1. Review the existing app and source files.
2. Explore or refine UI in Gemini.
3. Approve the direction.
4. Record the accepted rules in this document.
5. Create a focused Codex task.
6. Reuse current components and state.
7. Implement the accepted layout.
8. Test behaviour, themes and responsive states.
9. Update Airtable and documentation status.

Screenshots are supporting references.

They must not be the sole implementation specification for complex behaviour.

---

# 39. Approved UI Direction Register

## UI-GEM-001 — Previous Dashboard Project Workspace Modal

Status:

- Superseded for current beta Dashboard direction

Original direction:

- Project cards opened a large stage-based Project Workspace modal.

Current rule:

- Recent Project cards remain project-first and open the existing Project.
- A large stage-based modal must not be reintroduced unless separately reapproved.
- Useful project-detail behaviour may be retained if it does not conflict with the simplified Dashboard.

## UI-GEM-002 — Klyro App Shell and Navigation

Status:

- Approved direction
- Implementation must be verified

Includes:

- Compact Klyro top header
- Dynamic centre page pill
- User and utility controls on the right
- Tray navigation
- Collapsed by default
- Exact Klyro navigation grouping
- Disabled future routes

## UI-GEM-003 — Klyro Dashboard

Status:

- Approved direction
- Implementation must be verified

Includes:

- Hero
- Start Here
- Six Quick Links
- Project search
- Recent Projects
- Maximum 24 recent cards by default
- Minimal layout

## UI-GEM-004 — Klyro Pack Gen

Status:

- Approved direction
- Implementation must be verified

Includes:

- `Tell us about your product…`
- Build Pack
- Large prompt composer
- Generate Pack
- Explore Our Templates
- Removal of Pack Selector slider

## UI-GEM-005 — Cutter Studio Workspace

Status:

- Approved direction
- Implementation must be verified

Includes:

- Pack Type / Validated / Errors / Notes strip
- On-canvas horizontal tool dock
- Right Base / Attributes / Customise / Layers panel
- Pack Spec / Import / Save-Export roundels
- Cutter remains the visual focus

## UI-GEM-006 — Cutter Studio Layers

Status:

- Approved direction
- Implementation must be verified

Includes:

- Vertical scroll rail
- Vertical group navigation
- Landscape layer rows
- Selection synchronisation
- Visibility, lock and permitted delete
- Removed validation and Artwork footer actions

## UI-GEM-007 — Cutter Studio Customise

Status:

- Approved direction
- Implementation must be verified

Includes:

- Compact no-selection notice
- Selected-element summary
- Colour & Appearance
- Opacity
- Line & Stroke
- Presets
- Removed large footer actions

---

# 40. Codex Implementation Rules

Codex must:

- Read `01_Product_Architecture.md` and this document before major UI work.
- Preserve current application font and official logo assets.
- Reuse existing routes, stores, components and handlers.
- Avoid duplicate menus, modals and state stores.
- Preserve project save and restoration behaviour.
- Preserve Cutter Studio engineering logic during layout work.
- Preserve selected element, zoom and pan where the task does not require a reset.
- Use theme tokens.
- Use shared components.
- Implement disabled future routes honestly.
- Preserve TypeScript typing.
- Avoid `any` unless technically unavoidable and explained.
- Keep changes scoped to the requested area.
- Remove dead page-specific code after approved replacements.
- Test light and dark mode.
- Test keyboard and focus behaviour.
- Test desktop and narrower viewports.
- Report files changed, tests run and limitations.

Codex must not:

- Rebuild unrelated modules during a targeted UI task.
- Invent backend functionality to make a control appear active.
- Create mock success states in production flows.
- Replace deterministic validation with UI assumptions.
- Change pack geometry during visual work.
- Add a new UI framework without approval.
- Change the font or icon family casually.
- Treat screenshots as authority where written behaviour differs.

---

# 41. UI Completion Criteria

A UI amendment is complete only when:

- It matches the accepted Klyro hierarchy.
- It uses official logo and current font.
- Light mode works.
- Dark mode works.
- Keyboard focus is visible.
- Disabled features behave honestly.
- Existing state and routes remain connected.
- No duplicate component or store was introduced.
- Empty, loading and error states are handled.
- Responsive behaviour is usable.
- No important control overlaps the global header or navigation.
- No console errors exist.
- No broken imports exist.
- No TypeScript errors exist.
- The relevant workflow was manually tested.
- The implementation uses shared tokens and components where appropriate.

---

# 42. Source Ownership and Conflict Rules

This document controls:

- Visual design
- Component hierarchy
- Page layout
- Navigation presentation
- Theme behaviour
- Interaction patterns
- Responsive rules
- Accessibility presentation
- Approved Gemini UI direction

`01_Product_Architecture.md` controls:

- Product hierarchy
- Module role
- Beta versus post-beta classification
- Cross-module workflow
- AI/human authority

`04_Engineering_Knowledge_Base.md` controls:

- Pack rules
- Engineering defaults
- Geometry rules
- Validation thresholds

`08_AI_Architecture.md` controls:

- FlowAI prompts
- Context
- Retrieval
- AI response structure

`10_Testing_QA.md` controls:

- Formal test matrices
- Release checks
- Regression requirements

When a screenshot conflicts with this source, this source controls unless the screenshot is accompanied by an explicit approved amendment.

---

# 43. Final UI Rule

Klyro should feel like a purpose-built packaging-engineering product.

The interface must remain:

- Clear
- Technical
- Professional
- Project-centred
- Responsive
- Accessible
- Theme-consistent
- Manufacturing-aware
- AI-assisted without becoming AI-dominated
- Visually confident without becoming decorative

Every UI decision should improve clarity, speed, engineering confidence or workflow consistency.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Added Running, Stale and Error validation presentation.
- Defined Passed as current-revision validation with no open Critical issues.
- Clarified that Warnings and Advisories may remain on a Passed Project.
- Prevented prior validation state from remaining visually current after engineering changes.
- Aligned Export Release presentation with current-revision validation.

## Version 2.1 — 18 July 2026

- Rebranded the UI source from CutNFlow platform UI to Klyro App UI.
- Aligned the source with `01_Product_Architecture.md` v2.1.
- Removed the obsolete `00_Master_Context.md` dependency.
- Consolidated duplicate UI Design System variants.
- Defined official Klyro brand and logo usage.
- Preserved Spartan Red, Dusky Cream and Dark Charcoal.
- Replaced the old broad navigation with the current Klyro tray structure.
- Set the main navigation to collapsed-by-default behaviour.
- Defined the current global header.
- Replaced the old command-centre Dashboard with the accepted minimal Dashboard.
- Updated Quick Links, project search and Recent Projects.
- Replaced the old Pack Generator card/slider direction with the accepted Pack Gen page.
- Added Build Pack and prompt composer behaviour.
- Updated Cutter Studio workspace layout.
- Added on-canvas horizontal tool dock rules.
- Added Cutter status strip rules.
- Added Pack Spec, Import and Save/Export roundels.
- Consolidated Base, Attributes, Customise and Layers into the right panel.
- Added the vertical Layers navigation and landscape row pattern.
- Added the revised Customise panel.
- Removed validation and Artwork footer actions from Layers and Customise.
- Updated Validation Centre and Export Release UI responsibilities.
- Marked Artwork Studio as post-beta/unavailable until functional.
- Updated theme, accessibility, responsive and component rules.
- Superseded the old Dashboard Project Workspace modal as the current beta direction.
- Added a current approved UI direction register.
