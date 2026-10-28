# Klyro beta end-to-end tests

This suite uses Playwright against the real Vite routes and browser persistence. It exercises the connected Dashboard, Pack Gen, Pack Spec Builder, Cutter Studio, validation and export workflow. FlowAI uses the repository's deterministic local provider/parser; no live external AI service is called.

## Commands

From `frontend/frontend`:

```text
npx playwright install chromium
npm run test:e2e
npm run test:beta-e2e
npm run test:e2e:headed
npm run test:e2e:report
```

`npm run test:e2e` starts Vite automatically on `127.0.0.1:4178` and runs headlessly. The headed command is intended for local diagnosis. The suite is intentionally separate from `npm run verify` because full browser coverage is a release/merge gate rather than a per-edit unit check.

Run only one Playwright invocation at a time in a checkout. A runner owns its local server and output directory; concurrent runs can stop each other's server or overwrite traces. The config rejects an already running local server.

For a deployed smoke check, set `PLAYWRIGHT_BASE_URL` to the deployment URL and run `npx playwright test e2e/public-pack-workflows.spec.ts e2e/flowai-editing-workflows.spec.ts --workers=2`. This bypasses the local server. Tests using development-only source imports are local-only. Unset the variable before normal local runs.

`public-pack-workflows.spec.ts` covers all seven public pack modules through create, dimension edit, explicit Save, reopen, validation and SVG download, including stable element identity and export evidence after reload. It also checks PDF Proof, Illustrator-compatible SVG and JSON downloads. `flowai-editing-workflows.spec.ts` checks left/right intent and all nudge increments with locked-mark protection. These are software workflow checks; engineering and independent review remain separate gates in `docs/klyro-qa-phases-2026-10-18.md`.

## Isolation and evidence

- Every Playwright test gets a fresh browser context and clears browser storage before the first application document loads.
- Primary workflow tests create Projects through the real UI; they do not seed completed Projects.
- The Warning acknowledgement scenario creates a real Project through the UI, then applies one controlled fixture mutation to produce the already-approved `EYEMARK_TRIM_FIT` Warning. It does not introduce or override a validation rule.
- Console errors, page exceptions and failed requests are attached to the test result. Unexpected console/page exceptions fail the test.
- Screenshots and traces are retained only for failed tests. The HTML report is written to `playwright-report/`.
- Export tests wait for the real browser download, parse SVG through `DOMParser`, and verify persisted validation/acknowledgement/export evidence.

## Known product defects isolated by the suite

Expected-failure annotations are deliberate release blockers. Playwright reports an unexpected pass when a defect is fixed, forcing removal of the annotation and preserving regression coverage.

There are currently no active expected-failure annotations. KLYRO-E2E-002 and KLYRO-E2E-008 remain covered as normal regression tests.

## CI integration

No CI workflow exists in this repository. A future CI job should install dependencies, run `npx playwright install --with-deps chromium`, run core `npm run test:beta-e2e` checks on pull requests, and run the full `npm run test:e2e` suite before beta release or merge to a protected release branch. Upload `playwright-report/` and `test-results/playwright-artifacts/` only on failure.
