# Kyza beta review and pack-rule audit

Reviewed 14 October 2026. This is the first delivery step towards the user's manufacturing-led beta roadmap, not a certification of current pack types.

## Beta review decision

A user may explicitly override critical findings to export an **unapproved beta review bundle**. Required: self-declared reviewer name, reason, acknowledgement of all current critical/warning findings, matching Project ID/revision, completed pre-export validation and current ruleset.

The bundle contains a marked scaled PDF proof and SVG where renderable, a human-readable report and full structured JSON design/specification/validation evidence. Render/PDF failures are declared in the manifest; diagnostic evidence remains available. Production export retains its existing controls. An override never changes a failed validation result to passed and never declares production approval.

The Project export history retains the review decision, reviewer, reason, acknowledged issue IDs, revision, validation run and ruleset. Identity is self-declared because beta has no authenticated reviewer/role system. The downloadable snapshot preserves the exact design; prior histories are excluded from the nested design snapshot to avoid recursive growth.

The snapshot also captures module version, configured pack defaults, registered beta checks and registry implementation statuses. A registered rule is not proof it ran or that an industry requirement was met. Actual findings remain in the Validation Run. No new AI calls or automatic feedback submission are added.

## Current rule implementation matrix

| Pack type | Current construction/validation path | Main evidence/tuning work next |
| --- | --- | --- |
| Flowwrap | Flowwrap composer, resolver and shared `validateFlowwrapSpec`; default two-eyemark state; shared beta checks | Machine/web/repeat and substrate profiles; traceable seal/eyemark/clearance limits and production boundary cases |
| Pillow pack | Dedicated pillow layout/composer; validation delegates to shared Flowwrap validation | Pillow-specific fold/seal construction requirements and machine/filling assumptions, separated from generic defaults |
| DOY pouch | DOY parameters and layout within Flowwrap composition; shared Flowwrap validator | Dedicated DOY construction profile: panel/gusset relationships, bottom construction, zip/notch and process-specific clearances |
| K-Seal pouch | K-Seal composer, resolver and dedicated K-Seal validator; additional beta trim/eyemark checks | Evidence for finished/flat dimension mapping, trim/gusset/arm/seal relationships and per-process optical-register limits |
| 3-side sachet | Sachet composer/resolver; shared validation across each cutter step | Explicit three-side construction profile, independent-step boundaries, fill/opening assumptions and seal requirements |
| 4-side sachet | Sachet composer/resolver; shared validation across each cutter step | Explicit four-side construction profile, seal/tear feature relationships and process-specific allowed dimensions |
| Paper strip | Paper-strip normalisation, composer/resolver and specialised validator | Band construction/material limits, clear-strip windows and independent-step evidence tied to finishing equipment |
| Plain web (internal) | Plain-web composer/resolver and specialised validator | Bespoke open-web/cut/slit profile evidence; keep its internal status explicit |

Sources inspected: pack modules, `core/packComposer`, `engines/validation-engine/createPackValidator.ts`, `constraints`, `packages/cutter-engine/validation/betaValidation.ts`, Reference Index pack pages and the Engineering Knowledge Base.

The shared beta ruleset currently registers seven checks: required dimensions, supported eyemark count, minimum eyemark size, dual-eyemark trim fit, eyemark bounds, eyemark track placement and existing cutter safety compatibility. Shared validation is useful but is not complete pack-specific manufacturing assurance.

## Sandbox findings

Sandbox currently composes supported base families using geometry selection, constraint defaults, features and spec overrides. It is a bespoke parametric builder within those families, not unrestricted arbitrary geometry.

- Existing clear/white/paper profiles use schema defaults and `machine: default`. They are not verified machine specifications.
- Selected rule IDs are reported in the Sandbox rule-selection result; composition still chooses an existing family composer. Selection must not be presented as arbitrary executable manufacturing rules.
- The `die-cut` registry entry is planned, not an implemented dedicated rule module.
- Saved custom definitions retain construction/profile choices in custom-project storage. The normal Cutter Project currently retains the resolved spec; a stable association with the original Sandbox definition/profile must be added before claiming complete bespoke-design provenance.

Next Sandbox work: persist the construction definition/profile version with the canonical Cutter Project; distinguish mandatory safety rules from selectable features; validate bespoke definitions against explicit manufacturing profiles; test unknown/unsupported rule selection and save/reopen/export continuity.

23 October 2026 first Sandbox increment: reopening and saving a custom definition now keeps its ID and updates the existing saved entry; the saved-project controls stay visible inside the dialog. A browser check covers save, load, rename and save again. Canonical Cutter Project linkage and profile provenance remain the next implementation step.

## Rule governance required for each tuned profile

Each rule needs: stable rule ID/version; affected pack types; component/field; units; allowed values or formula; severity; override policy; authoritative source/reference/version; source scope (project/customer/press/material/pack/global); evidence status; acceptance fixtures; and a clear explanation.

Evidence status distinguishes draft/experimental defaults, current working standards and practically validated requirements. UI defaults are not proof of a manufacturing constraint. Rule decisions remain engine-owned.

Authority follows the Engineering Knowledge Base: approved project/customer specification, customer rules, machine/site rules, pack rules, material/process rules, global working defaults, draft recommendations, then AI suggestions.

## External standards scope

FTA FIRST 7.0 provides flexographic reproduction specifications, procedures and best-practice communication across the print workflow. ISO 12647-6:2020 addresses data exchange and process-control aims/tolerances for flexographic printing. These references do not, by themselves, establish universal pouch dimensions or seal/gusset limits.

Primary references checked:
- https://www.flexography.org/training-resources/resource-library/flexographic-image-reproduction-specifications-and-tolerances-first/
- https://www.iso.org/standard/75219.html

Actual construction limits require the applicable converter/customer/machine/material specification and appropriate evidence. This batch deliberately introduces no invented manufacturing thresholds or compliance claims.

## Next delivery order

1. Use the beta review bundles to collect rule disagreements and real manufacturing references.
2. Create versioned manufacturing profiles and provenance for existing parameters.
3. Tune K-Seal and DOY construction profiles first, then sachets, Flowwrap/Pillow, Paper Strip and internal Plain Web.
4. Retain Sandbox definition/profile identity in canonical projects and apply the same shared mandatory checks.
5. Promote individual rules to Validated only after controlled tests or production evidence; keep override history tied to exact design revisions.
