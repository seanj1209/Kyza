# RFC-006: Explicit Critical Export Override

- Status: Accepted
- Date: 15 October 2026
- Decision: DEC-007

## Context

Klyro is being used for live cutter work while beta validation coverage is still incomplete for some pack types. A Critical result must remain visible and block export by default, but an operator needs a direct way to export a known cutter without pretending the validation passed.

## Decision

When the current pre-export Validation Run contains Critical issues, Save/Export displays one **Override errors** checkbox. The **Export selected** action remains disabled until the checkbox is ticked.

The pre-export review continues to show every Critical, Warning and Advisory issue. It offers **Export with overridden errors** only when the Save/Export checkbox was explicitly selected.

No reason field or separate permission workflow is required for this beta override.

## Evidence retained

Every completed overridden export records:

- the export ID, format, filename, delivery result and output metadata;
- the exact Project ID and revision;
- the exact Validation Run, ruleset and all structured issues;
- the Critical issue IDs that were overridden;
- any Warning issue IDs acknowledged by the same action;
- a snapshot of the cutter specification and pack type at export time.

The override acknowledgement is valid only for the matching export request, Project revision, Validation Run, ruleset and exact Critical/Warning issue set. A Project edit or changed Validation Run requires the user to tick the checkbox again.

## Consequences

- Validation remains failed; the override does not alter or hide errors.
- Unchecked Critical results continue to fail closed.
- Existing saved projects and legacy export records remain loadable because new evidence fields are optional in the persisted contract.
- All supported export formats use the same authorization and evidence path.
