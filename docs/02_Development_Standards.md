# Kyza Development Standards

## Document Status

Document: Development Standards  
Version: 1.0  
Status: Approved  
Owner: Sean Johnston  
Created: 04 July 2026  
Last Updated: 04 July 2026  

---

# 1. Purpose

This document defines how Kyza decisions, documentation, development tasks and implementation work should be managed.

It ensures that the platform remains organised, consistent, traceable and scalable as it grows.

---

# 2. Source of Truth

Official documentation is the source of truth for Kyza.

Chats are used for discussion and decision-making.

Approved decisions must be transferred into the relevant official document.

Official documents live in the `/docs` folder.

---

# 3. Tool Responsibilities

## ChatGPT Project

Used for:

- Product thinking
- Architecture discussion
- Strategy
- Documentation drafting
- RFC creation
- Decision review

## GitHub Docs Folder

Used for:

- Official documentation
- Version-controlled records
- Approved source documents

## Gemini / Google AI Studio

Used for:

- UI exploration
- Visual design concepts
- Dashboard layouts
- Component styling
- Prototype direction

Gemini is not the source of truth.

Approved Gemini designs must be documented in the UI Design System before Codex implementation.

## Codex

Used for:

- Code implementation
- Refactoring
- Feature development
- Technical changes
- App integration

Codex must follow the approved documentation.

## Airtable

Used for:

- Roadmap
- Tasks
- Deliverables
- Bugs
- Sprint planning
- Status tracking

---

# 4. Documentation Workflow

Every major change should follow this process:

1. Discuss the idea in the relevant ChatGPT Project chat.
2. Decide whether the change requires an RFC.
3. Create an RFC if needed.
4. Approve or reject the RFC.
5. Update the relevant official documentation.
6. Update the Decision Log.
7. Create Airtable tasks if implementation is required.
8. Send approved Codex prompt for implementation.
9. Test the result.
10. Record release notes if required.

---

# 5. Versioning Rules

## Major Version

Example: 1.0 → 2.0

Used for major architecture or workflow changes.

## Minor Version

Example: 1.0 → 1.1

Used for new sections, new rules or functional additions.

## Patch Version

Example: 1.1 → 1.1.1

Used for small corrections, wording updates or clarifications.

---

# 6. RFC Process

RFC means Request for Change.

An RFC is required when a proposed change affects:

- Product architecture
- API structure
- Database structure
- Major UI workflow
- AI behaviour
- Validation logic
- Core business direction
- Major module behaviour

An RFC is not required for:

- Small wording changes
- Minor visual fixes
- Simple bug fixes
- Small documentation corrections

---

# 7. RFC Statuses

Each RFC must have one of the following statuses:

- Draft
- Under Review
- Approved
- Rejected
- Implemented
- Superseded

---

# 8. RFC Template

Each RFC should use this structure:

## RFC Number

RFC-000

## Title

Name of proposed change.

## Status

Draft / Under Review / Approved / Rejected / Implemented / Superseded

## Date

Date created.

## Author

Sean Johnston

## Summary

Short description of the proposed change.

## Problem Statement

What problem does this solve?

## Proposed Solution

What is being changed?

## Benefits

Why is this a good change?

## Risks

What could go wrong?

## Affected Documents

Which official documents need updating?

## Affected Modules

Which parts of the app are affected?

## Implementation Notes

What should Codex or future developers know?

## Decision

Approved / Rejected / Deferred

---

# 9. Decision Log

Every approved RFC must be recorded in the Decision Log.

The Decision Log should include:

- Decision ID
- Date
- Decision
- RFC reference
- Affected document
- Status

---

# 10. Change Approval Levels

## Level 1 — Minor Change

Examples:

- Wording correction
- Small styling fix
- Minor UI polish
- Bug fix

RFC required: No

## Level 2 — Functional Change

Examples:

- New feature
- New validation rule
- New UI component
- New export option

RFC required: Recommended

## Level 3 — Architectural Change

Examples:

- New module
- Database structure change
- API restructure
- Workflow redesign
- AI behaviour change

RFC required: Yes

---

# 11. Gemini to Codex Workflow

Gemini is used to explore and prototype UI ideas.

Once a Gemini design is approved:

1. Record the design in the UI Design System.
2. Define the affected components.
3. Define colours, layout, spacing and behaviour.
4. Create an Airtable task.
5. Send Codex a prompt referencing the UI Design System.
6. Codex implements the approved design in the real app.

Codex should not guess the visual style from screenshots alone.

---

# 12. Codex Prompt Rule

Every Codex prompt should include:

- Objective
- Files likely affected
- Required behaviour
- UI rules
- Data/API impact
- Acceptance criteria
- Testing checklist

Codex should follow the latest approved documentation.

---

# 13. Core Rule

No major Kyza change should be implemented unless it has been discussed, approved, documented and linked to the correct source document.