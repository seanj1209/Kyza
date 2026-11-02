# Controlled Beta scope

The `Kyza` repository ships the controlled Beta. All continued experiments live in the separate private `Kyza-QA-Dev` repository and deployment. ArtworkSandbox remains frozen.

## Included

- Flowwrap, Pillow Pack, DOY Pouch, K Seal Pouch, 3-Side Seal Sachet, 4-Side Seal Sachet and Strip Laminate.
- Compatible elements: eyemarks, safe zones, perforations, hanger slots, windows, tear notches, grip seals and information boxes. Barcode, QR and BBE areas reserve space; they do not generate or validate codes.
- Dimension and construction editing, selection, moving, supported resizing, duplication, deletion, undo/redo, snapping and measuring.
- Flow Assist suggestions for the included constructions, specification review and cutter handoff.
- Browser-local projects and supported JSON import/backup, validation and review, editable SVG, Illustrator-compatible SVG and raster PDF proofs.

## Excluded

Sandbox/custom construction, Artwork Studio, lidding, Plain Film, internal Plain Web, and the separate 2-Side/3-Side Seal Pouch constructions. The included 3-Side Seal **Sachet** is a different construction. Vector PDF, native AI, DXF and production/repro packages remain unavailable.

`packages/shared/releaseScope.ts` is the checked-in allowlist. There is no browser, URL, localStorage, account-name or owner bypass. The registry, recommendation service, project admission and export authorization all enforce it. Excluded saved records stay in storage unchanged; they are not silently converted to another pack type. Vercel redirects Artwork routes and the Beta build omits its HTML entry.

These are product release restrictions in a browser app. They do not replace authentication or a server entitlement system. Keep Vercel Authentication enabled; the private QA deployment has its own independent protection. Never copy QA URLs, credentials or owner-role switches into Beta code. Projects are local to each deployment origin, so use deliberate JSON transfers between environments.

Promote a feature by reviewing and testing it in QA, then opening a separate release PR in Beta that explicitly updates scope, tests and public claims. Do not merge QA wholesale into Beta and accidentally restore experimental entry points.

## Verification

Run the production build, then `npm run test:beta-scope`. The suite checks all seven pack types, rejected imports and saved opens, retention of excluded saved data when another project is saved, Flow recommendations, engine requests, direct exports, deployment redirects and absence of the Artwork HTML entry. Existing project continuity, creation, handoff, export review and selection tests remain applicable.
