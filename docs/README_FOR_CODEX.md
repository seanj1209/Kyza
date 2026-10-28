# README_FOR_CODEX

Start here before making any change in this workspace.

## Canonical Platform Documentation

The numbered platform documentation is ordered as follows:

1. `00_Master_Context.md` — product vision and enduring principles
2. `01_Product_Architecture.md` — Project-centric platform architecture
3. `02_Development_Standards.md` — documentation and development governance
4. `03_Decision_Log.md` — approved architecture and workflow decisions
5. `04_Engineering_Knowledge_Base.md` — packaging engineering knowledge and rules
6. `05_API_Architecture.md` — future API and service contracts
7. `06_Database_Schema.md` — future persistence model
8. `07_UI_Design_System.md` — platform UI and interaction direction
9. `08_AI_Architecture.md` — AI boundaries, intents and structured responses
10. `09_Development_Roadmap.md` — staged delivery direction
11. `10_Testing_QA.md` — testing and acceptance strategy
12. `11_Marketing_Website.md` — public website and product-positioning direction

Project-centric architecture is the governing product direction. Lower-numbered documents establish context and architecture; later documents should implement or extend that direction rather than contradict it. Approved decisions in `03_Decision_Log.md` take precedence over older draft wording. Supporting RFCs live in `docs/RFCs/`.

Document ownership boundaries:

- `04_Engineering_Knowledge_Base.md` owns engineering rules and manufacturing guidance.
- `05_API_Architecture.md` owns service contracts, transport shapes, ID mappings and implementation-readiness labels.
- `06_Database_Schema.md` owns persistence direction and must reference, not redefine, domain contracts.
- `08_AI_Architecture.md` owns AI boundaries and structured AI behaviour; validation remains engine-owned.
- `09_Development_Roadmap.md` owns sequencing and delivery phases.
- `10_Testing_QA.md` owns verification and acceptance expectations.

Where guidance overlaps, the owning document above is authoritative and other documents should link back rather than create a second competing rule.

## What CutnFlow Is

CutnFlow is a Project-centric flexible-packaging engineering platform. The current implementation is founded on a deterministic flexo cutter-guide engine; the numbered platform documents define the broader product direction around that engine.

Current engine goal:
- generate deterministic cutter-guide geometry
- apply packaging constraints consistently
- keep pack logic parameter-driven and modular

Treat engineering and validation engines as the implementation source of truth, with Project data coordinating the wider platform workflow.

## Non-Goals

Do not:
- redesign the UI
- refactor high-risk files unless explicitly asked
- invent packaging rules that are not documented
- hardcode new pack-specific logic into shared systems without instruction

## What Not To Touch

High-risk files. Do not edit unless the user explicitly instructs you:
- `frontend/frontend/src/main.ts`
- `frontend/frontend/src/ui/controls.ts`
- `frontend/frontend/src/ui/customisationPanel.ts`

Also avoid broad edits to large or central orchestration files unless the task requires them.

## Workspace Rules

- Make the smallest diff that solves the task.
- Work on one module or one extraction target at a time.
- Prefer composition over refactoring unrelated code.
- Do not move files until logic has been extracted and the user has asked for that step.

## How To Run Locally

Work from:
- `frontend/frontend`

Available npm scripts:
- `npm run dev` -> starts the Vite dev server
- `npm run build` -> builds the frontend
- `npm run preview` -> previews the production build
- `npm run test:constraints` -> runs the current constraint test flow

## Where Things Live

Current pack-type modules:
- `frontend/frontend/src/packs/`

Current shared constraint logic:
- `frontend/frontend/src/constraints/`

Current geometry helpers:
- `frontend/frontend/src/geometry/`

Target architecture for shared rule logic:
- shared packaging rules should live in `frontend/frontend/src/rules/`
- shared construction and geometry helpers should live in `frontend/frontend/src/geometry/shared/`
- pack types should compose shared rules instead of embedding them directly

## Rules Source Of Truth

Read these first:
- `AGENT_RULES.md`
- `ARCHITECTURE_TARGET.md`
- `docs/RULES_AND_CONSTRAINTS.md`
- `docs/WORKFLOW_GUARDRAILS.md`
- `docs/GLOSSARY_PACKAGING.md`

If a rule is missing, do not invent it. Leave a configurable placeholder and call it out.

## Unit Discipline

- Always use `mm` internally unless a module is explicitly documented otherwise.
- Do not mix inches and mm inside the same rule path.
- Do not invent pack rules, manufacturing allowances, or clearances.
- Any numeric rule value should be config-driven, not silently hardcoded into a pack module.
