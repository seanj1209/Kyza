# Paper Strip stepping: Amends v5

## User-facing contract

- A / Sync-Mirror: only cutter 1 is editable. Geometry mirrors to the other cutters, including live drag previews. Selection frames, handles and temporary measurement guides never mirror.
- B / Independent: each repeat has its own elements. Choose a left canvas tab, bottom cutter tag or click another cutter to activate it. Editing and measurement coordinates are local to that cutter, not the full sheet. The former Edit Step dropdown has been replaced by these selectors.
- A moved element can change ownership when its centre is dropped inside another cutter. Destination coordinates are translated into that cutter's local space. Existing destination objects are retained; duplicate IDs are renamed.
- Resize/rotation do not change ownership. The gap between repeats and the outside of the sheet are not destinations.
- Normal constraints remain: clear-strip bounds, seal clearance, hanger-slot clearances/mirroring, top-edge half-moon placement, and a maximum of two eyemarks per cutter. Perforation lanes only merge into a destination with compatible mode and separation. Horizontal folds retain their existing fixed-centre behaviour.
- No eyemark is a non-blocking advisory. Labels/text-direction tags do not raise seal-overlap warnings; physical cutter bounds and positive dimensions still apply. BBE/barcode/QR warnings remain.

## Data and editor boundary

The top-level element collections are the active cutter's normal editor projection. `paperStrip.stepping.activeStep` identifies the projection. `elementsByStep` holds inactive collections. Switching cutters snapshots the outgoing projection and restores the destination, including explicit empty optional fields after JSON persistence.

`syncMirror` defaults to true for existing specs. Switching to A preserves dormant independent work and activates cutter 1. Increasing independent step count seeds new snapshots from cutter 1; decreasing count returns to cutter 1 if the active cutter was removed.

Each rendered repeat has a nested SVG in its own cutter coordinate system. Only the active SVG receives element interaction, selection and context-action handlers. The outer SVG owns shared construction, canvas pan/zoom and the freehand measure tool. Engine actions own snapshot activation and cross-step transfers; the UI supplies raw pointer displacement for tools that clamp at the old cutter edge.

## Verification

Run `npm run verify` from `frontend/frontend`. V5 coverage is in `tests/studio-amends-v5.test.js` and the local-boundary assertions in `tests/dynamic-element-measures.test.js`.

Manual checks: three-step A mirror movement/resize without repeated selection frames; B step-3 movement without changes to steps 1/2; B transfer from step 3 to step 2 retaining its existing BBE; eyemark 1 then 0 with export readiness showing no critical/warning; label dropdown insertion and paper texture/contrast.

## Baseline and release

Source baseline: `c1e1ae8e8397095ebea53f728754ae248aa6684f` on `design/klyro-soft-shell`. These changes are local; no production deployment or remote push is implied. Revert the dedicated v5 commit to roll back; do not reset the whole repository or delete test projects.
