# Klyro Template Build / Validate / Export Acceptance Matrix

Use one row per template revision. The checks below are deliberately deterministic wherever possible so that future assistant usage is reserved for interpretation and exceptions.

## Checklist

| Stage | Pass condition | Evidence to retain |
| --- | --- | --- |
| Catalogue | Record has a stable ID, pack ID, revision and owner | Catalogue row |
| Build | Template creates a new editable Klyro project without console errors | Project name and screenshot |
| Geometry | Preview resolves through the registered pack engine | Saved project / preview |
| Reopen | Saved project reopens with identical pack type and key features | Before/after comparison |
| Validation | Blocking errors are zero; warnings are understood and recorded | Validation result |
| Editability | Dimensions and optional features remain editable after applying the template | Short edit check |
| Export | SVG export completes and contains the expected guide layers/metadata | Export filename and file check |
| Repeatability | Reapplying the same template revision produces the same expected result | Repeat run ID |
| Review | Human approves manufacturing assumptions, not just visual appearance | Reviewer and notes |

## Status rules

- `draft`: catalogue entry exists, but no complete Klyro run.
- `needs-review`: build and technical checks pass, but manufacturing assumptions or visual output need approval.
- `approved`: all checks pass and a named reviewer has approved the assumptions.
- `retired`: no longer offered, but retained for provenance.

## Failure handling

When a row fails, capture the smallest reproducible input and classify the issue before asking an assistant to change code:

- template data problem
- pack-engine or geometry problem
- validation rule problem
- export problem
- UI/operator problem
- documentation or approval gap

Fix the shared engine or schema once where possible; do not create per-template workarounds for the same defect.

## Export naming convention

Use a stable, searchable name such as:

```text
<template-id>__r<revision>__<width>x<height><units>__<source-sha-7>__<yyyymmdd>.svg
```

Example:

```text
flowwrap-standard__r1__approved-dimensions__fc39a9f__20261009.svg
```

Do not use an example filename as evidence that dimensions are approved; replace the placeholder with the real approved values when the template is ready.

