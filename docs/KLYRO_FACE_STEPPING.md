# Face-aware stepping and canvas selectors

## Behaviour

- One global Linked / Individual choice; no arbitrary selective link groups.
- Paper Strip and 3SS counts advance by one; 4SS counts advance by two, counting individual faces, not pairs. Six faces are three front/back pairs.
- 4SS keeps the existing centred web construction: `3A 2A 1A | 1B 2B 3B`. A/B are front/back. IDs are stable as count changes.
- Linked 4SS has two editable sources, 1A and 1B. A elements never mirror to B or vice versa. Clicking a linked repeat focuses its matching source. Individual mode edits exactly the selected face.
- The left canvas selector stays fixed; bottom tags follow their cutter and remain readable as zoom changes. Both highlight the active cutter red. Keyboard arrows move selector focus; Enter/Space activates. Sachet Ref controls bottom tag visibility.
- Additions belong to the active face. Movement can transfer ownership across faces; resizing/rotation never does. Linked A-to-B transfers move the entire matching series. The original destination content is retained.
- Pan, Measure and Alt-pan do not switch active cutters. Selection and dynamic measurements use only the active cutter's local bounds. Helpers and active outlines are excluded from exports.
- Sachet web eyemarks, seals, tear-notch construction and dimensions stay shared construction; they are not artwork repeated independently on each face.
- Brown/White/Black Paper, PIFA labels and prior unrelated amendments are retained. The live clear-strip width-preserving movement patch from ArtworkSandbox/main `37cb794` is merged, not overwritten.

## Data boundary

`sachet.activeStepId` identifies the top-level editor projection. `sachet.elementsByStep` stores inactive face collections keyed by stable IDs. `syncMirror` is global. Unlink freezes visible copies; relink uses source A/B (or cutter 1 on 3SS). On a fresh/legacy 4SS spec, explicit B presets stay B and unassigned elements receive a single A owner. Eyemarks remain outside face snapshots.

The existing Paper Strip snapshot representation is retained. Its renderer and the sachet renderer share local SVG element rendering and selection/navigation, while engine actions resolve ownership. Validation checks inactive sachet faces too. Existing clearance and eyemark validation rules are not relaxed by this release.

## Verification and rollback

Run `npm run verify` from `frontend/frontend`; `tests/sachet-steps.test.js` covers counts, source mapping, independent editing, persistence, transfers and 3SS. Existing v5 tests cover Paper Strip and prior amendments.

Before live publication, check four-side source BBE insertion (B-only copies), cross-face movement, Individual 2B insertion, tab/tag agreement, count stepping, refresh persistence, and Paper Strip/3SS increments. Test export readiness without bypassing validation. The default sachet's 2mm clearance can still trigger the existing 5mm engine minimum; this is not a new stepping rule.

Production baseline is `37cb79467c8e316004e7911685e0515b5e958edf`. Roll back a published release by reverting its merge commit with mainline parent 1, preserving later unrelated work. Do not force-push or reset production.
