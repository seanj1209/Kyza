---
document_name: Kyza Marketing Website
file_name: 11_Marketing_Website.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Sean Johnston / Kyza
last_reviewed: 2026-07-19
source_replaces: 11_Marketing_Website.md v1.0
authority: Public positioning, website purpose, messaging hierarchy, page structure, capability claims, conversion routes, website content, SEO direction and marketing implementation rules
related_sources:
  - 01_Product_Architecture.md
  - 04_Engineering_Knowledge_Base.md
  - 05_API_Architecture.md
  - 06_Database_Schema.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 10_Testing_QA.md
---

# Kyza Marketing Website

## Document Purpose

This document defines the public website and marketing direction for Kyza.

It establishes:

- The role of the Kyza website
- Public product positioning
- Brand and technology hierarchy
- Audience and customer problems
- Website messaging priorities
- Homepage structure
- Product, technology, solution and resource pages
- Current versus future capability claims
- Beta and early-access messaging
- Product screenshot and demo rules
- Calls to action
- Website-to-app relationship
- Tone of voice
- SEO direction
- Content governance
- Website QA
- Gemini and Codex implementation rules

This document is the source of truth for public-facing Kyza website messaging.

It does not replace:

- Product Architecture
- Engineering rules
- Application UI rules
- FlowAI architecture
- Development sequencing
- QA release gates

`01_Product_Architecture.md` controls the product hierarchy and current release scope.

`07_UI_Design_System.md` controls the Kyza visual and interaction system.

`09_Development_Roadmap.md` controls when the public website should link to the Kyza App and how beta access is introduced.

`10_Testing_QA.md` controls website and release verification.

There is no separate `00_Master_Context.md`.

---

# 1. Product and Brand Hierarchy

## 1.1 Kyza

Kyza is the master customer-facing brand.

The public website should present Kyza as the company, product family and trusted customer-facing identity.

Kyza owns:

- The public website
- Kyza App positioning
- Customer-facing services
- Product messaging
- Account and access experiences
- Brand identity
- Marketing and education

## 1.2 Kyza App

The Kyza App is the main connected working environment.

The website may describe and show the Kyza App, but the website must not become a substitute for it.

The app is where users:

- Create or open Projects
- Define packs
- Generate cutters
- Review engineering
- Validate work
- Save and reopen Project state
- Export supported technical output

## 1.3 Kyza / Kyza Tech

Kyza/Kyza Tech is the underlying packaging-engineering capability used within Kyza.

Public marketing may refer to it as:

- Kyza’s packaging-engineering technology
- Kyza Tech
- The engineering system behind Kyza

It should not compete with Kyza as a second master brand.

Detailed technology messaging belongs on a Product or Technology page rather than dominating the homepage hero.

The working public term remains `Kyza Tech` unless a later brand decision approves another name.

## 1.4 FlowAI

FlowAI is Kyza’s intelligence, explanation and guided-assistance layer.

Public messaging should describe FlowAI as:

- Packaging-aware assistance
- Guided interpretation
- Validation explanation
- Assumption visibility
- Practical next-step guidance

FlowAI must not be marketed as an unrestricted autonomous packaging engineer.

## 1.5 Public Relationship

The public relationship is:

```text
Kyza
├── Kyza Website
└── Kyza App
    ├── Kyza Tech — deterministic packaging engineering
    └── FlowAI — intelligence, explanation and guidance
```

---

# 2. Website Role

The Kyza website exists to:

- Explain Kyza clearly
- Build trust
- Show the real product
- Communicate practical value
- Demonstrate manufacturing awareness
- Educate potential users
- Support beta access
- Support future search discovery
- Guide suitable users towards the Kyza App

The website should sell, explain and educate.

The Kyza App should create, engineer, validate, save and export.

The website must remain separate from application workspace logic.

---

# 3. Current Website Position

A Kyza website concept and working implementation already exist.

The next stage is refinement, not an automatic rebuild.

Current website work should prioritise:

- Copy refinement
- Better feature/value hierarchy
- Real Kyza App screenshots
- Correct current product claims
- Improved section alignment
- Stronger visual depth
- Consistent light and dark section treatment
- Clearer current-versus-future messaging
- Responsive polish
- Beta access route when approved

Do not discard the current website structure without first identifying which parts already work.

The website should be adapted in controlled sections.

---

# 4. Website Access State

The website must not link publicly to a development application until the access route is approved and tested.

Current rule:

- Do not publish an active app link merely because a development URL exists.
- Do not expose an internal or unstable Gemini development app.
- Do not direct public users into an incomplete route.
- Do not use a misleading `Open App` CTA before access is ready.

Until a controlled access route exists, use an appropriate CTA such as:

- Explore Kyza
- See How It Works
- Join the Beta
- Request Early Access
- Follow Development
- Register Interest

When app access becomes ready, CTA options may include:

- Open Kyza
- Sign In
- Start a Project
- Enter Beta

The approved domain and access path must be verified before being hardcoded into this source or implementation.

The old `kyza.co.uk` and `app.kyza.co.uk` assumptions are not treated as the confirmed Kyza domain strategy.

---

# 5. Public Product Positioning

## 5.1 Primary Position

Kyza is a connected packaging-engineering environment for flexible packaging.

It helps users turn product requirements into structured pack specifications, engineered cutter starting points, validation insight and controlled technical output.

## 5.2 Short Positioning

Recommended direction:

```text
Flexible packaging engineering, made clearer.
```

Alternative:

```text
A connected workspace for flexible packaging engineering.
```

Alternative:

```text
From product requirement to controlled technical output.
```

## 5.3 Expanded Positioning

Recommended direction:

```text
Kyza brings pack definition, cutter engineering, validation and technical export into one connected Project — supported by deterministic packaging technology and practical AI guidance.
```

## 5.4 Technology Position

Recommended direction:

```text
Kyza Tech handles structured packaging-engineering logic. FlowAI helps users understand requirements, assumptions, risks and next actions.
```

## 5.5 What Kyza Is Not

Kyza is not:

- A generic AI chatbot
- A decorative cutter-drawing toy
- A replacement for responsible engineering approval
- A generic project-management board
- A promise of universal production compatibility
- A collection of disconnected packaging calculators
- A finished Artwork Studio when that module remains post-beta

---

# 6. Core Marketing Principle

The website should lead with what Kyza gives users, not a list of software modules.

Priority messages are:

- Connected working truth
- Engineering confidence
- Clear assumptions
- Practical control
- Reduced fragmentation
- More consistent output
- Guided technical understanding
- Real manufacturing awareness

Features and modules support those outcomes.

They should not become the entire story.

---

# 7. Primary Value Proposition

Recommended value statement:

```text
Turn packaging requirements into clearer, more controlled technical Projects.
```

Supporting statement:

```text
Kyza connects pack definition, cutter engineering, validation and export so users can work with greater confidence, fewer gaps and a clear record of the decisions behind each Project.
```

Alternative concise statement:

```text
One Project. Connected engineering. Clearer decisions.
```

---

# 8. Value Pillars

The homepage should communicate Kyza through a limited set of strong, benefit-led pillars.

Recommended pillars:

## 8.1 Built Around the Project

Kyza keeps pack requirements, cutter structure, validation state, assumptions and outputs connected.

Expanded direction:

```text
The Project remains the working source of truth. Pack Gen, Cutter Studio, Validation Centre and Export Release use the same structured state rather than passing disconnected files between tools.
```

## 8.2 Engineering Before Assumption

Kyza uses structured packaging rules and pack-specific logic before presenting a technical result.

Expanded direction:

```text
Kyza Tech separates deterministic calculations and validation from AI explanation, helping users understand what is confirmed, what is assumed and what still needs review.
```

## 8.3 Clarity Without Oversimplification

Kyza makes technical packaging work easier to understand without hiding its engineering detail.

Expanded direction:

```text
New users can begin with guided inputs while experienced users retain access to dimensions, seals, folds, layers, rules and export structure.
```

## 8.4 Control Stays Visible

Kyza explains and recommends, but production-critical decisions remain user-controlled.

Expanded direction:

```text
FlowAI can suggest a pack direction or explain a validation issue. It cannot silently approve a Project, change geometry or bypass an export block.
```

## 8.5 Fewer Hand-Offs, Fewer Gaps

Kyza reduces the loss of context between pack definition, cutter creation, validation and export.

Expanded direction:

```text
Assumptions, decisions and validation remain attached to the same Project so users can understand how a technical result was reached.
```

## 8.6 Built for Real Packaging Work

Kyza is shaped by flexible-packaging, reprographics, prepress and production workflow knowledge.

Expanded direction:

```text
The product focuses on practical elements such as seals, folds, gussets, eyemarks, safe zones, cutter attributes and technical output — not generic design automation.
```

---

# 9. Interactive Value Section

A homepage value section may use expandable or focus-driven interactions.

The objective is to let the user scan the benefit first and reveal practical detail deliberately.

Approved interaction directions include:

- Expandable panels
- Focus cards
- Controlled hover expansion on desktop
- Tap-to-expand on touch devices
- A selected pillar that enlarges while others reduce
- Progressive detail with a related product visual

Requirements:

- The collapsed title must communicate value independently.
- Expanded copy must remain concise.
- Keyboard users must be able to open and close each item.
- Hover must not be the only trigger.
- Motion must remain controlled.
- The layout must not jump or misalign.
- One expanded item must not obscure another section.
- Mobile should use accordion-style behaviour.
- Content must remain readable without JavaScript where practical.

Do not use the phrase `Rules are Rules`.

Do not fill the section with generic claims such as:

- Easy to use
- Fast
- Accurate
- Reliable

Those outcomes should be demonstrated through stronger, specific wording and real product evidence.

---

# 10. Audience

## 10.1 Primary Audiences

- Packaging engineers
- Reprographics operators
- Prepress operators
- Flexible-packaging converters
- Flexographic printers
- Packaging technologists
- Technical packaging teams
- Artwork operators working with flexible packaging
- Print and packaging houses

## 10.2 Secondary Audiences

- Brands developing flexible packaging
- Start-ups with limited packaging knowledge
- Product and innovation teams
- Designers requiring a packaging-engineering starting point
- Pack houses and co-packers
- Technical account managers
- Production coordinators

## 10.3 Audience Balance

The website must remain credible to experienced technical users without excluding new users.

Messaging should avoid:

- Explaining every engineering term in the hero
- Using jargon with no context
- Oversimplifying Kyza into a consumer design tool
- Presenting new users as the only audience
- Presenting packaging engineers as replaceable

---

# 11. Audience Problems

Kyza should connect its value to real workflow problems.

Examples:

- Pack requirements begin in inconsistent formats.
- Cutter starting points take time to construct.
- Technical assumptions are often hidden.
- Pack, cutter and validation information may sit in separate files.
- Seal, fold, gusset and eyemark decisions are easy to miscommunicate.
- Artwork and prepress risks are often identified late.
- Teams depend on scattered knowledge.
- Generic AI lacks packaging-engineering authority.
- Existing software can be powerful but fragmented or difficult for new users.
- Export files may lose context, structure or validation status.
- Project decisions can be difficult to trace.

The website should not attack existing tools or professionals.

It should show a clearer connected alternative.

---

# 12. Tone of Voice

The Kyza website tone should be:

- Professional
- Precise
- Calm
- Confident
- Technical but readable
- Manufacturing-aware
- Direct
- Modern
- Practical
- Trustworthy

The tone should feel like a capable technical partner.

## 12.1 Use

- Clear active sentences
- Specific technical benefits
- Short supporting paragraphs
- Practical verbs
- Honest limitations
- Controlled confidence
- Concrete examples

## 12.2 Avoid

- Generic AI hype
- Claims of revolutionising everything
- Overuse of `intelligent`, `smart` and `powerful`
- Casual chatbot language
- Empty SaaS slogans
- Packaging-industry criticism
- Claims of perfect accuracy
- Guaranteed production-readiness
- Claims that Kyza replaces engineers, printers or responsible review
- Long feature lists in the hero

---

# 13. Claim Standards

Marketing claims must be supported by current product capability or clearly labelled direction.

## 13.1 Safe Current-Language Patterns

Use:

- Designed to help
- Supports
- Helps identify
- Provides a structured starting point
- Keeps assumptions visible
- Uses deterministic packaging rules
- Connects Project information
- Prepares supported technical output
- Built for controlled beta
- Packaging-aware guidance

## 13.2 Restricted Claims

Use only with evidence:

- Accurate
- Reliable
- Production-ready
- Export-ready
- Validated
- Automated
- Compatible
- Secure
- Fast

Where used, scope the claim.

`Validated` may describe a Project only when the validation result applies to the current Project revision. A prior Passed result becomes stale after an engineering-affecting change.

Example:

```text
Pack-specific validation helps identify supported cutter risks before export.
```

Not:

```text
Kyza guarantees accurate packaging.
```

## 13.3 Prohibited Claims

Do not use:

- Always correct
- Guaranteed production-ready
- Replaces packaging engineers
- Fully automated production approval
- Works with every machine
- Universal packaging rules
- No printer review required
- Zero-error packaging
- One-click production-ready artwork
- AI does everything

---

# 14. Brand Feel

The website should feel:

- Premium
- Precise
- Technical
- Dynamic
- Crisp
- Confident
- Manufacturing-aware
- Modern
- Distinctive
- Controlled rather than sterile

The website may be more expressive than the Kyza App.

It must still feel related to the app.

Avoid:

- Generic technology gradients
- Random neon colour
- Decorative particle backgrounds
- Stock-photo dependency
- Misaligned mockups
- Oversized feature cards with weak content
- Excessive glassmorphism
- Consumer-app illustration style
- A different brand personality on every section

---

# 15. Brand and Visual System

Use the approved Kyza assets and current font system.

Core colours:

- Spartan Red: `#9E1316`
- Dusky Cream: `#DBC8B6`
- Dark Charcoal: `#1D1D1D`

Supporting values and theme tokens should come from `07_UI_Design_System.md`.

Rules:

- Use the official Kyza logo.
- Do not recreate it as typed text.
- Use the correct light/dark logo variant.
- Do not visually promote Kyza/Kyza Tech above Kyza.
- Keep Spartan Red selective.
- Use Dusky Cream for warmth, not as a low-contrast wash.
- Use layered charcoal rather than pure black everywhere.
- Preserve crisp, high-resolution screenshots.
- Avoid visibly stretched or soft app mockups.

---

# 16. Website Theme Direction

The website may use a mixed editorial light/dark composition rather than copying the app theme toggle.

Acceptable direction:

- Dark technical hero
- Warm light value sections
- Dark product demonstration section
- Warm light workflow/resources section
- Dark closing CTA/footer

If a website-wide theme toggle is implemented, it must follow the shared Kyza theme rules.

Do not add a theme toggle merely as decoration.

Every section transition should feel intentional.

---

# 17. Website Navigation

Recommended primary navigation:

- Product
- Technology
- Solutions
- Resources
- About

Primary CTA depends on access state:

- Join the Beta
- Request Early Access
- Open Kyza
- Sign In

A simpler early website may use:

- Product
- Resources
- About
- Request Early Access

Rules:

- Keep the header compact.
- Do not list every app module in navigation.
- Do not add Pricing before the offer is defined.
- Do not link to empty pages.
- Do not use a development app URL publicly.
- Mobile navigation must be complete and keyboard-accessible.

---

# 18. Homepage Objectives

The homepage should answer:

1. What is Kyza?
2. What does it help users achieve?
3. Why is it different from a generic tool or AI assistant?
4. What is working now?
5. What does the connected workflow look like?
6. Who is it for?
7. How can the visitor explore or join?

The homepage should create confidence without pretending the full long-term platform is complete.

---

# 19. Recommended Homepage Structure

Recommended structure:

1. Header
2. Hero
3. Credibility/value strip
4. Expandable value pillars
5. Connected workflow
6. Real Kyza App product showcase
7. Current core capabilities
8. Kyza Tech and FlowAI technology section
9. Use cases/audiences
10. Beta/early-access section
11. Resource preview
12. Closing CTA
13. Footer

The final implementation may combine sections where the page becomes too long.

The homepage should not present twelve modules with equal visual weight.

---

# 20. Hero Section

## 20.1 Purpose

The hero should communicate the core value quickly.

It should not attempt to explain the entire platform.

## 20.2 Recommended Hero Direction

### Eyebrow

```text
Flexible packaging engineering
```

### Heading

```text
Packaging workflows, made clearer.
```

### Supporting Copy

```text
Kyza connects pack definition, cutter engineering, validation and technical export inside one Project — giving packaging and prepress teams a clearer route from requirement to controlled output.
```

### Primary CTA

Current pre-access:

```text
Explore Kyza
```

or:

```text
Join the Beta
```

Future approved app access:

```text
Open Kyza
```

### Secondary CTA

```text
See How It Works
```

## 20.3 Alternative Hero Direction

### Heading

```text
One Project. Connected packaging engineering.
```

### Supporting Copy

```text
Move from product requirement to structured pack specification, engineered cutter and validation-aware export without losing the assumptions and decisions behind the work.
```

## 20.4 Hero Visual

Use a real or accurately staged Kyza App visual.

Preferred:

- Dashboard flowing into Pack Gen and Cutter Studio
- Cutter Studio focal view
- Project cards connected to validation state
- A controlled multi-screen composition using actual interface captures

Avoid:

- Abstract AI brain imagery
- Generic packaging stock collage
- Fake code panels
- Screens that do not exist in the app
- Soft or misaligned screenshots
- Product mockups with incorrect light/dark theme

---

# 21. Credibility and Value Strip

A concise strip may communicate four connected outcomes.

Recommended options:

- Define
- Engineer
- Validate
- Release

Alternative:

- One Project
- Pack-specific logic
- Visible assumptions
- Controlled output

Alternative:

- Built for packaging
- Guided by rules
- Explained clearly
- Kept in your control

The strip should reinforce the hero.

It should not become another full module menu.

---

# 22. Expandable Value Pillars Section

Recommended heading:

```text
Designed for clearer technical decisions.
```

Recommended introduction:

```text
Kyza does more than place packaging tools beside each other. It keeps the Project connected, makes assumptions visible and separates deterministic engineering from AI guidance.
```

Suggested items:

1. Built Around the Project
2. Engineering Before Assumption
3. Clarity Without Oversimplification
4. Control Stays Visible
5. Fewer Hand-Offs, Fewer Gaps
6. Built for Real Packaging Work

Each item should include:

- Short value-led title
- One-line collapsed summary
- Expandable practical explanation
- Relevant UI or technical visual
- Optional link to Product or Technology page

---

# 23. Connected Workflow Section

Recommended heading:

```text
From product requirement to controlled technical output.
```

Beta workflow:

1. Describe or build the pack
2. Review the Pack Specification
3. Generate the cutter
4. Inspect and refine in Cutter Studio
5. Run validation
6. Save, reopen and export

Expanded copy:

```text
Each step works on the same Project. Pack dimensions, cutter geometry, assumptions, validation and export state remain connected rather than being recreated at every hand-off.
```

Artwork Studio should not appear as a completed step in the current beta workflow.

A future label may show:

```text
Artwork preparation — planned expansion
```

---

# 24. Product Screenshot Strategy

Real app screenshots should replace conceptual product cards as the interface stabilises.

## 24.1 Screenshot Priorities

1. Dashboard
2. Pack Gen
3. Cutter Studio
4. Validation Centre when functional
5. Export Release when functional
6. Account & Specs only where useful

## 24.2 Screenshot Standards

Every screenshot must:

- Match the current app
- Use the current Kyza logo
- Use the current font
- Use the approved navigation
- Use real or clearly labelled demo Project data
- Be high resolution
- Be correctly cropped
- Avoid browser/debug clutter
- Avoid unreadably small text
- Avoid confidential data
- Match current light/dark theme
- Avoid displaying unavailable features as active

## 24.3 Screenshot Composition

Use:

- One primary focal screen
- Supporting close-up crops
- Controlled device/browser framing where useful
- Callouts that explain actual capability
- Responsive assets for mobile

Avoid:

- Six tiny screenshots in one row
- Misaligned perspective mockups
- UI screens with inconsistent versions
- Faked controls
- Images that cannot be read

---

# 25. Current Core Capabilities

The public website may describe these current/beta-target capabilities.

## 25.1 Pack Gen

Recommended title:

```text
Start with what you know.
```

Short copy:

```text
Describe the product or build the pack manually. Kyza converts the requirement into a structured Pack Specification with visible assumptions and a clear route into cutter engineering.
```

Current/beta-target capability:

- Prompt interpretation
- Manual Build Pack
- Supported pack types
- Structured dimensions and features
- Assumptions
- Missing-information guidance
- Cutter handoff

Do not claim universal automatic pack selection.

## 25.2 Cutter Studio

Recommended title:

```text
Engineer the structure, not just the drawing.
```

Short copy:

```text
Review seals, folds, gussets, eyemarks, attributes and measurements inside a controlled cutter workspace designed around pack-specific geometry.
```

Current/beta-target capability:

- Structured cutter
- Layered elements
- Pack-specific engineering
- Protected geometry
- Selection and controlled editing
- Measurements
- Save and restore
- Validation state
- Supported technical export

## 25.3 Validation Centre

Recommended title:

```text
Understand the risk before release.
```

Short copy:

```text
Deterministic rules identify supported engineering issues. FlowAI helps explain what they mean, why they matter and what the user can do next.
```

Beta-target capability:

- Critical, Warning and Advisory results
- Not Run, Running, Passed, Failed, Stale and Error states
- Affected module/element
- Practical messages
- Revalidation
- Current-revision export-blocking state
- FlowAI explanation

Validation Centre must not be marketed as fully complete before it passes the beta release gate.

## 25.4 Export Release

Recommended title:

```text
Release the Project with context intact.
```

Short copy:

```text
Prepare supported technical output with the Project revision, validation state and engineering structure clearly controlled.
```

Beta-target capability:

- Supported vector/technical formats
- Validation-aware release
- File naming
- Project revision
- Export status
- Clear limitations

Only verified formats should be named as available.

---

# 26. Kyza Tech Section

Recommended heading:

```text
Packaging engineering beneath the interface.
```

Supporting copy:

```text
Kyza Tech is the deterministic capability behind Kyza’s pack specifications, cutter geometry, engineering defaults and validation rules.
```

Supporting points:

- Pack-type logic
- Cutter composers
- Seal, fold and gusset relationships
- Eyemark and feature rules
- Pack-specific validation
- Structured technical output

Important boundary:

```text
Kyza Tech calculates and validates. It is not a marketing chatbot and it does not rely on AI to decide engineering pass or failure.
```

Do not overexpose internal implementation detail on the homepage.

Link to a Technology page for deeper explanation.

---

# 27. FlowAI Section

Recommended heading:

```text
Guidance that knows its limits.
```

Supporting copy:

```text
FlowAI interprets requirements, exposes assumptions and explains validation in practical language while deterministic Kyza services remain responsible for engineering outcomes.
```

Supporting points:

- Pack-prompt interpretation
- Missing-information guidance
- Assumption visibility
- Validation explanations
- Cutter guidance
- Project summaries
- Approval-based proposed actions

Safety statement:

```text
Production-critical changes remain user-reviewed and user-approved.
```

Do not call FlowAI a general `AI Assistant` on the homepage unless that interface becomes a real active product area.

---

# 28. Current and Future Capability Labels

Every marketed capability should use one state where needed:

- Available
- Beta
- In Development
- Planned
- Future Direction

Examples:

- Pack Gen — Beta
- Cutter Studio — Beta
- Validation Centre — In Development until release gate passes
- Export Release — In Development until supported output passes QA
- Artwork Studio — Planned
- Print Config — Planned
- Press intelligence — Future Direction

Do not use `Coming Soon` everywhere.

Use specific status only where it helps the user understand availability.

---

# 29. Artwork Studio Messaging

Artwork Studio is post-beta unless its status changes through the Product Architecture and Roadmap.

It may appear on:

- Product roadmap
- Future capabilities section
- Technology vision
- Early-access update
- Resource content

It must not be presented as an active core module on the homepage.

Safe wording:

```text
Planned artwork preparation and preflight will extend the same Project into artwork placement, bleed, safe-zone and print-awareness workflows.
```

Unsafe wording:

```text
Upload artwork and receive complete production-ready preflight.
```

---

# 30. Solutions and Audience Section

The website may organise solutions by workflow rather than by large industry labels.

Recommended groups:

## Packaging and Technical Teams

Value:

- Structured pack requirements
- Project continuity
- Engineering assumptions
- Cutter review
- Validation

## Reprographics and Prepress

Value:

- Cutter structure
- Technical zones
- Eyemark and feature awareness
- Validation explanations
- Export handoff

## Converters and Print Houses

Value:

- More consistent technical starting points
- Rule-based validation
- Customer and printer rules in future
- Clearer handover
- Controlled expansion towards production configuration

## Brands and New Product Teams

Value:

- Guided starting point
- Clear assumptions
- Better communication with technical suppliers
- Less dependence on unstructured briefs

## Designers

Value:

- Correct cutter starting point
- Technical-zone visibility
- Future artwork-preparation workflow
- Better connection to manufacturing requirements

Do not claim Kyza replaces converter or printer approval.

---

# 31. Use-Case Examples

Use realistic, supported or clearly labelled scenarios.

Current/beta examples:

- 20g sauce sachet
- Three-side seal sample pack
- K-Seal pouch
- DOY pouch
- Flow-wrap bar where supported
- Pillow pack where supported

Future examples:

- Lidded film
- Artwork validation
- Press-profile guidance
- Customer-specific rules

A use case must not imply that every format is active.

---

# 32. Early-Access and Beta Positioning

Recommended messaging:

```text
Kyza is being developed through a controlled beta focused on one complete packaging-engineering journey: define the pack, generate the cutter, validate the Project, save the work and prepare supported technical output.
```

Supporting wording:

```text
Beta capability will expand in stages. Artwork preparation, press configuration and advanced production intelligence remain planned extensions.
```

Recommended beta CTA:

- Join the Beta
- Request Early Access
- Register Interest
- Follow Development

A beta form should collect only the information required to evaluate and contact participants.

Possible fields:

- Name
- Email
- Company
- Role
- Packaging workflow
- Primary problem
- Pack formats used
- Interest in beta feedback

Do not publish a fake signup confirmation if the form is not connected.

---

# 33. App Preview or Demo Section

A demo should show a real connected workflow.

Recommended example:

```text
20g sauce packet
→ Three-Side Seal Sachet proposal
→ visible assumptions
→ cutter generation
→ validation summary
→ supported export route
```

Demo content may show:

- Prompt
- Proposed pack
- Dimensions
- Assumptions
- Cutter preview
- Validation state
- Next action

Rules:

- Use supported or clearly staged data.
- Do not imply a production approval.
- Do not show mock output as a completed live AI result without a demo label.
- Keep the example consistent across screenshots.
- Do not require a fully public app before the website can explain the workflow.

---

# 34. Product Page

The Product page should explain the connected Kyza App more deeply than the homepage.

Recommended structure:

1. Product overview
2. Project-centred architecture
3. Pack Gen
4. Cutter Studio
5. Validation Centre
6. Export Release
7. FlowAI
8. Kyza Tech
9. Current beta scope
10. Planned expansion
11. Beta/request-access CTA

The Product page may include more technical detail, but it should remain readable.

Avoid treating each future module as equally available.

---

# 35. Technology Page

Recommended title:

```text
Technology designed for controlled engineering.
```

Recommended sections:

- Project-centred data
- Kyza Tech
- Deterministic validation
- FlowAI
- Assumptions and confidence
- User approval
- Pack-specific rules
- Structured output
- Security and access direction
- Technical roadmap

This page should explain why Kyza is more controlled than a generic AI tool.

It should not expose private source code, prompts, credentials or proprietary implementation detail.

---

# 36. Solutions Pages

Future or staged solution pages may include:

- Packaging Engineering
- Reprographics and Prepress
- Flexible-Packaging Converters
- Brands and Product Teams
- Designers
- Small Packaging Teams

Each page should include:

- Workflow problem
- Current Kyza value
- Relevant beta capability
- Planned capability clearly labelled
- Example Project
- Limitations
- CTA

Do not duplicate the same generic copy across every page.

---

# 37. Resources

Resources should build trust through useful packaging-specific knowledge.

Potential topics:

- Flexible-packaging cutter basics
- Seal and safe-zone guidance
- Eyemark placement
- Three-side seal sachets
- K-Seal pouch structure
- DOY pouch structure
- Flow-wrap cutter principles
- Packaging artwork bleed
- Reverse print and white backing
- Barcode placement
- Flexographic artwork preparation
- Reprographics checklist
- Packaging-engineering glossary
- Validation severity and technical risk

Resource articles must distinguish:

- General guidance
- Kyza Working Standard
- Customer/press-specific rule
- Production confirmation required

Do not publish internal Draft engineering rules as general fact.

---

# 38. Resource Article Template

Recommended structure:

```text
Title
Short summary
Who this is for
Why it matters
Key concepts
Common mistakes
General guidance
What varies by printer/machine/customer
How Kyza supports the workflow
Related pack types
Related resources
CTA
Disclaimer
```

Example:

```text
Eyemark Placement for Flexible Packaging
```

Possible sections:

- What an eyemark does
- Common positions
- Contrast
- Track clearance
- Slit tolerance
- What varies by machine
- How Kyza represents eyemark rules
- Related sachet and flow-wrap guidance

---

# 39. About Page

The About page should explain why Kyza exists.

Recommended points:

- Built from real flexible-packaging and reprographics workflow experience
- Focused on practical engineering clarity
- Designed to connect technical decisions
- Built to make packaging tools more accessible without hiding technical detail
- Developed as a controlled, growing product
- Driven by real production and prepress problems

The About page may mention the founder’s industry experience where intentionally approved.

Avoid:

- Inflated company-size claims
- Fake team profiles
- Invented customer numbers
- Generic corporate history

---

# 40. Contact Page

Current useful contact options:

- Request Early Access
- Share a packaging workflow problem
- Provide product feedback
- General enquiry

Future:

- Demo request
- Support
- Partnership enquiry
- Press/media
- Sales

The page must not display personal details unless intentionally approved.

Forms require:

- Validation
- Success/failure state
- Privacy wording
- Spam protection
- Accessible labels
- Real delivery route

---

# 41. Pricing

Pricing remains future until the commercial offer is defined.

Do not publish:

- Invented tiers
- Placeholder prices
- Fake discounts
- Enterprise claims
- AI usage limits that are not implemented

Possible future product packaging may include:

- Individual
- Professional
- Team
- Converter/Enterprise
- Controlled usage or export tiers

No pricing structure is approved by this document.

Until then, use:

- Join the Beta
- Request Early Access
- Contact Kyza

---

# 42. Calls to Action

## 42.1 Current Pre-Access CTA

Preferred:

- Explore Kyza
- Join the Beta
- Request Early Access
- See How It Works

## 42.2 Future App CTA

After access is ready:

- Open Kyza
- Start a Project
- Sign In
- Enter Beta

## 42.3 Secondary CTA

- Explore Product
- View Technology
- Read Resources
- See the Workflow
- Contact Kyza

## 42.4 CTA Rules

- One primary CTA per section.
- Use consistent wording.
- Do not use `Get Started` when the destination is unclear.
- Do not link to empty forms or routes.
- Do not open the development app.
- External links should behave predictably.
- CTA states must be tested.

---

# 43. Working Homepage Copy Direction

The following is a working content direction, not a mandatory locked copy deck.

## Hero

Eyebrow:

```text
Flexible packaging engineering
```

Heading:

```text
Packaging workflows, made clearer.
```

Body:

```text
Kyza connects pack definition, cutter engineering, validation and technical export inside one Project — helping packaging and prepress teams work with greater clarity and control.
```

Primary CTA:

```text
Explore Kyza
```

Secondary CTA:

```text
See How It Works
```

## Value Section

Heading:

```text
Designed for clearer technical decisions.
```

Body:

```text
Kyza keeps the Project connected, makes assumptions visible and separates deterministic engineering from AI guidance.
```

## Workflow Section

Heading:

```text
One connected route from requirement to output.
```

Body:

```text
Start with a prompt or build the pack manually. Review the structured specification, generate the cutter, validate the Project and prepare supported output without losing the decisions behind the work.
```

## Technology Section

Heading:

```text
Engineering beneath the interface. Guidance where it helps.
```

Body:

```text
Kyza Tech manages structured packaging logic and deterministic validation. FlowAI interprets, explains and recommends while production-critical changes stay under user control.
```

## Closing CTA

Heading:

```text
Help shape the next stage of Kyza.
```

Body:

```text
Kyza is moving towards a controlled beta focused on pack definition, cutter engineering, validation and export.
```

CTA:

```text
Join the Beta
```

---

# 44. Copy Governance

Website copy should identify its state.

Possible labels:

- Draft
- Approved
- Live
- Superseded
- Needs Product Verification
- Needs Legal Review
- Needs SEO Review

Before publishing a capability claim, verify it against:

1. Product Architecture
2. Development Roadmap
3. Testing & QA
4. Current deployed product
5. Engineering Knowledge Base where technical

The website must not become a second product roadmap.

---

# 45. SEO Positioning

Kyza is a new brand name and should be paired with descriptive packaging terms.

Potential priority topics:

- Flexible packaging engineering software
- Flexible packaging cutter software
- Cutter guide generator
- Flexible packaging prepress software
- Packaging validation software
- Sachet cutter guide
- K-Seal pouch cutter
- DOY pouch cutter
- Flow-wrap cutter guide
- Packaging artwork validation
- Eyemark placement
- Packaging safe zones
- Flexible-packaging reprographics

Do not depend on the brand name alone for search discovery.

Avoid keyword stuffing.

---

# 46. SEO Metadata Direction

## Homepage

Title direction:

```text
Kyza | Flexible Packaging Engineering Software
```

Description direction:

```text
Kyza connects pack definition, cutter engineering, validation and technical export inside one flexible-packaging Project.
```

## Product

Title direction:

```text
Kyza App | Pack Generation, Cutter Engineering and Validation
```

## Technology

Title direction:

```text
Kyza Technology | Kyza Tech and FlowAI
```

## Resources

Title direction:

```text
Flexible Packaging Engineering Resources | Kyza
```

Metadata must reflect current capability.

Do not use `production-ready` without evidence and context.

---

# 47. Structured Data and Technical SEO

Where appropriate, support:

- Organisation
- SoftwareApplication
- WebSite
- BreadcrumbList
- Article
- FAQPage

Rules:

- Structured data must match visible content.
- Do not insert fake ratings or review counts.
- Do not mark future pricing as current offers.
- Do not identify unavailable software features as active.
- Canonical URLs must match the approved domain.
- Sitemap and robots configuration must match launch state.
- Development environments should not be indexed unintentionally.

---

# 48. Social Preview

Define:

- Open Graph title
- Open Graph description
- Preview image
- Twitter/X card where relevant
- Kyza logo
- Correct site URL

The preview image should use:

- Kyza brand
- High-resolution real product visual
- Short readable message
- No tiny UI collage
- No old Kyza public-brand header

---

# 49. Analytics and Privacy

Before adding analytics:

- Define what is required.
- Use an appropriate consent approach.
- Avoid collecting unnecessary personal data.
- Avoid tracking sensitive Project/app content.
- Keep website analytics separate from engineering Project telemetry.
- Document the provider and retention.

Beta forms require clear privacy wording.

Do not add multiple marketing trackers by default.

---

# 50. Performance Direction

The website should:

- Load quickly
- Use optimised images
- Use responsive image sizes
- Lazy-load below-the-fold screenshots
- Avoid oversized video backgrounds
- Avoid unnecessary animation libraries
- Minimise layout shift
- Preserve readable content before animation
- Use modern image formats where supported
- Keep the hero visual sharp

A premium page should not feel slow.

---

# 51. Accessibility

The website must support:

- Semantic heading order
- Keyboard navigation
- Visible focus
- Accessible navigation
- Labelled forms
- Alt text
- Sufficient contrast
- Reduced-motion preferences
- Touch-friendly controls
- Expandable section semantics
- Accessible modal/dialog use where present
- Clear validation errors
- Descriptive links

Decorative graphics should have empty alt text.

Product screenshots need concise descriptions of what they demonstrate.

---

# 52. Responsive Behaviour

## Desktop

- Strong hero composition
- Controlled full-width sections
- Readable product visuals
- Expandable value interaction
- Clear navigation

## Tablet

- Simplified hero split
- Two-column or stacked value sections
- Readable screenshot crops
- Touch-friendly expansion

## Mobile

- One-column content
- No tiny multi-screen mockups
- Accordion value pillars
- Clear CTA
- Full navigation drawer
- No horizontal page overflow
- Correct screenshot crop
- Forms fit viewport

The website should not be desktop-only.

---

# 53. Motion

Use motion for:

- Controlled section reveal
- Value-pillar expansion
- Product-screen transitions
- Hover/focus feedback
- Workflow progression
- Navigation

Avoid:

- Constant motion
- Parallax that affects readability
- Floating decorative objects
- Rapid zoom
- Excessive card movement
- Animation that causes layout shift
- Motion as the only explanation of content

Respect reduced motion.

---

# 54. Website Components

Recommended shared components:

- `MarketingHeader`
- `MarketingNavigation`
- `MarketingFooter`
- `HeroSection`
- `ValueStrip`
- `ExpandableValuePillars`
- `ConnectedWorkflow`
- `ProductShowcase`
- `CapabilitySection`
- `TechnologySection`
- `AudienceSection`
- `BetaCTA`
- `ResourceCard`
- `StatusLabel`
- `ScreenshotFrame`
- `FAQAccordion`
- `ContactForm`

Reuse shared Kyza tokens.

Do not copy application components blindly where website presentation requires different spacing or content hierarchy.

---

# 55. Product Status Components

Use controlled labels where needed:

- Beta
- In Development
- Planned
- Future Direction

Rules:

- Do not attach a status badge to every sentence.
- Use status where availability could be misunderstood.
- Keep wording consistent.
- Link to beta scope where useful.
- Do not use a green success treatment for planned work.

---

# 56. FAQ Direction

Potential FAQ questions:

- What is Kyza?
- Who is Kyza for?
- Is Kyza a CAD tool?
- What is Kyza Tech?
- What is FlowAI?
- Can Kyza create cutter guides?
- Which pack formats are supported?
- Does Kyza validate artwork?
- Can FlowAI change cutter geometry?
- What export formats are supported?
- Is Kyza production-ready?
- Does Kyza replace packaging engineers?
- How can I join the beta?

Answers must match the current Product Architecture and release state.

---

# 57. Suggested FAQ Answers

## Is Kyza a CAD tool?

```text
Kyza is a packaging-engineering environment rather than a general-purpose CAD package. Cutter Studio provides structured controls for supported flexible-packaging geometry and technical output.
```

## Can FlowAI change cutter geometry?

```text
FlowAI may recommend a change, but production-critical changes require explicit user review and are applied through deterministic Kyza engineering services.
```

## Is Kyza production-ready?

```text
Kyza is moving through a controlled beta. Supported workflows and formats are tested in stages, and printer, converter or customer review remains important for production decisions.
```

## Does Kyza validate artwork?

```text
The first beta focuses on pack definition, cutter engineering, validation and export. Full Artwork Studio and artwork preflight are planned extensions unless explicitly shown as available.
```

---

# 58. Website QA

Website QA must verify:

- Kyza is the master brand
- No old Kyza website branding remains unintentionally
- Kyza Tech is positioned as underlying technology
- FlowAI claims are controlled
- Current and future capability are separated
- Navigation works
- CTAs have real destinations
- Development app is not exposed
- Product screenshots match the current app
- Light/dark section contrast is correct
- Responsive layouts work
- Expandable sections work by keyboard and touch
- No broken links
- Forms submit correctly
- Success/failure states are real
- SEO metadata exists
- Social preview exists
- No spelling/copy errors
- No unsupported claims
- Performance is acceptable
- Accessibility checks pass
- Deployed commit is verified

Detailed release QA belongs in `10_Testing_QA.md`.

---

# 59. Screenshot Approval Checklist

Before publishing a screenshot:

- Current app version?
- Correct Kyza logo?
- Correct navigation?
- Correct theme?
- No old module names?
- No confidential Project data?
- No console/debug UI?
- No placeholder text presented as fact?
- No unavailable feature shown active?
- Text readable at displayed size?
- High-resolution source?
- Correct crop?
- Alt text prepared?
- Linked website claim supported?

---

# 60. Current Website Priorities

Current priorities are:

1. Preserve the current Kyza website implementation where it remains useful.
2. Replace old Kyza product positioning.
3. Make Kyza the clear master brand.
4. Replace module-led homepage messaging with value-led messaging.
5. Add the expandable value-pillar section.
6. Align the hero with the connected Project workflow.
7. Add real Dashboard, Pack Gen and Cutter Studio screenshots.
8. Remove or relabel Artwork Studio and other post-beta claims.
9. Clarify Kyza Tech and FlowAI responsibilities.
10. Keep app access disabled until the approved beta route exists.
11. Add beta/request-access CTA.
12. Verify light/dark section contrast and responsive layout.
13. Update SEO metadata from Kyza to Kyza.
14. Add accessibility and performance checks.
15. Align the website after the core beta workflow stabilises.

---

# 61. Implementation Workflow

Recommended workflow:

1. Review the live/current website.
2. Map existing sections to this source.
3. Keep structurally useful components.
4. Identify outdated copy and claims.
5. Capture approved Kyza App screenshots.
6. Use Gemini for section and interaction refinement where needed.
7. Record approved behaviour in this source.
8. Create focused Codex tasks by section.
9. Implement without rewriting unrelated areas.
10. Test responsiveness, accessibility and links.
11. Verify claims against the deployed app.
12. Push to GitHub.
13. Verify website deployment.
14. Update Airtable evidence.

Do not ask Gemini or Codex to rebuild the entire site in one uncontrolled prompt.

---

# 62. Gemini Rules

Gemini may be used to:

- Refine section layout
- Explore expandable value interactions
- Create light/dark section variants
- Improve product screenshot presentation
- Refine responsive composition
- Explore product/technology page concepts

Gemini should be instructed to:

- Preserve the Kyza logo
- Preserve the current font
- Preserve the brand palette
- Keep the current site approach where possible
- Use actual supplied screenshots
- Avoid invented modules
- Avoid generic AI visuals
- Keep copy aligned with this source

Gemini output is a proposal, not the live source of truth.

---

# 63. Codex Implementation Rules

Codex must:

- Read `01_Product_Architecture.md`, `07_UI_Design_System.md`, `09_Development_Roadmap.md` and this source before major website work.
- Preserve useful existing website components.
- Keep website and Kyza App logic separate.
- Use official Kyza assets.
- Preserve the current font.
- Use shared brand tokens.
- Use real screenshots.
- Implement current-versus-future labels honestly.
- Keep app access disabled until approved.
- Use accessible interactions.
- Optimise responsive images.
- Preserve metadata and routing.
- Keep changes scoped.
- Report files changed, tests run and limitations.

Codex must not:

- Rebrand the website back to Kyza.
- Replace Kyza with Kyza Tech as the public brand.
- Add a public development-app link.
- Invent pricing.
- Invent customers, testimonials or usage data.
- Present Artwork Studio as complete.
- Claim guaranteed production-readiness.
- Add generic AI imagery as the main visual.
- Rebuild the site unnecessarily during a section amendment.
- Use low-resolution or distorted screenshots.
- Add fake working forms or success messages.
- Introduce an unrelated font or colour system.

---

# 64. Airtable Alignment

Retain existing website action IDs where practical and reword them around Kyza.

Suggested action direction:

- `KYZA-2601` — Align Kyza website positioning and navigation
- `KYZA-2602` — Rewrite homepage messaging around value pillars
- `KYZA-2603` — Implement expandable Kyza value section
- `KYZA-2604` — Capture and implement real Kyza App screenshots
- `KYZA-2605` — Align Product and Technology pages
- `KYZA-2606` — Add current/future capability status labels
- `KYZA-2607` — Implement beta/request-access route
- `KYZA-2608` — Update Kyza SEO and social metadata
- `KYZA-2609` — Complete website accessibility/responsive QA
- `KYZA-2610` — Verify public app-link and deployment readiness

Completion of this source does not mean the website amendments are implemented.

Track separately:

- Content approved
- Design approved
- Implemented
- QA passed
- Deployed
- Claims verified

---

# 65. Website Completion Criteria

The Kyza website realignment is complete when:

- Kyza is consistently the master brand.
- Kyza Tech and FlowAI roles are accurate.
- The hero communicates connected packaging engineering.
- The homepage leads with outcomes rather than a module list.
- Value pillars are clear and interaction works accessibly.
- Real current app screenshots are used.
- Current and future capabilities are separated.
- Artwork Studio is not presented as active unless its status changes.
- CTAs lead to real destinations.
- The development app is not publicly exposed.
- Responsive and accessibility checks pass.
- SEO and social metadata are updated.
- No unsafe claim remains.
- Deployed website matches the approved Git commit.
- Airtable evidence is recorded.

---

# 66. Source Ownership

This document controls:

- Public product positioning
- Website purpose
- Messaging hierarchy
- Website pages and sections
- Capability claims
- CTA language
- Website/app relationship
- SEO direction
- Resource direction
- Marketing implementation guidance

Other sources control:

- `01_Product_Architecture.md` — product hierarchy and capability scope
- `04_Engineering_Knowledge_Base.md` — engineering facts and rule status
- `05_API_Architecture.md` — service capability
- `06_Database_Schema.md` — persistence capability
- `07_UI_Design_System.md` — brand and interaction system
- `08_AI_Architecture.md` — FlowAI capability and safety
- `09_Development_Roadmap.md` — current delivery status and access timing
- `10_Testing_QA.md` — verification and release gates

Where a marketing claim conflicts with current tested product capability, the tested product capability controls.

---

# 67. Final Marketing Website Rule

The Kyza website should make the product feel credible, precise and distinctly useful to real packaging, reprographics and prepress users.

It should communicate that Kyza is:

- Connected
- Engineering-aware
- Project-centred
- Pack-specific
- Validation-driven
- AI-assisted
- User-controlled
- Manufacturing-aware
- Clear about assumptions
- Honest about current capability
- Built to grow without pretending the future is already complete

The website should build confidence and create a clear route towards the Kyza App without overpromising what the product can currently do.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Aligned public validation language with the shared current-revision lifecycle.
- Added Stale and Error states to Validation Centre capability wording.
- Prevented a prior Passed result from being marketed as current after Project changes.
- Clarified that export-readiness claims must use current-revision validation.

## Version 2.1 — 19 July 2026

- Reframed the source from Kyza Marketing Website to Kyza Marketing Website.
- Established Kyza as the master customer-facing brand.
- Repositioned Kyza/Kyza Tech as underlying packaging-engineering technology.
- Repositioned FlowAI as intelligence, explanation and guided assistance.
- Removed references to the nonexistent `00_Master_Context.md`.
- Removed active dependencies on unconfirmed Development Standards and Decision Log sources.
- Removed the old confirmed-domain assumptions pending Kyza domain/access verification.
- Added a rule preventing public links to the development app.
- Changed the homepage from module-led to outcome/value-led messaging.
- Added expandable value pillars focused on Project continuity, engineering clarity and user control.
- Updated hero and working copy direction.
- Added the current connected beta workflow.
- Reclassified Artwork Studio, press configuration and advanced production intelligence as planned/future.
- Added current, beta, in-development, planned and future capability labels.
- Added real Kyza App screenshot standards and approval checks.
- Added Kyza Tech and FlowAI website sections.
- Added beta/early-access messaging and CTA strategy.
- Updated Product, Technology, Solutions, Resources and About page direction.
- Updated SEO from Kyza-first to Kyza plus descriptive flexible-packaging terms.
- Added structured data, analytics, accessibility, performance and responsive rules.
- Added Gemini and Codex implementation workflows.
- Added Airtable alignment, completion criteria and claim governance.
