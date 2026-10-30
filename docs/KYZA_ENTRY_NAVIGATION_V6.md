# Kyza entry and navigation — Amends v6

Approved source: Sean's three-page Amends v6.pdf, inspected 14 October 2026. This supersedes the earlier Pack Gen navigation and Cutter Sandbox/Updates presentation for the current UI.

- Primary navigation keeps its existing groups and spacing: Dashboard; Cutter Studio and Artwork Studio; Validation Centre and Export Release; Account.
- Cutter landing retains the pack carousel. Its side column offers conditional Resume Work, Create Manually (the existing custom builder), Import Cutter (existing saved custom JSON import), and Help Me Choose (inline FlowAI prompt).
- The existing suggestion, Kyza Score, specification builder, project creation and validation/export services remain authoritative. The prompt and overlays reuse the existing Pack Gen implementation; no new recommendation, geometry or production rules are introduced.
- Pack Gen no longer has a standalone user-facing page or navigation entry. `/ai-studio` and `/ai-studio.html` remain compatibility redirects to `/cutter?choose=1&studio=start`, preserving all existing query values and the hash. Saved specifications open in their existing builder without regenerating reviewed values.
- Canonical cutters and legacy saved cutters feed the Cutter recent-project cards. Engine-rendered thumbnails have isolated IDs and no canvas interaction markers. Cutter action menus open upward; dashboard menus sit above the project card.
- Removed Sandbox/Updates cards are not relocated to Dashboard.
- `/artwork` is a Kyza Coming Soon preview. Planned features are grounded in `KYZA_FUTURE_FEATURE_BRIEFS.md` and product architecture: reusable assets, artwork/cutter overlay, engine-owned preflight and consistent proofs guided by brand/colour context. No artwork upload, approval or production processing is exposed by the preview.
- Existing artwork implementation and all engines remain in source. No persistence schema or storage keys change.

Deployment: local implementation only. No push, release or hosting changes are part of this amendment.
