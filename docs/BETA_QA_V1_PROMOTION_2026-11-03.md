# Approved QA v1 promotion to Beta

User authorised promotion of merged QA PR #1 and enabling Plain Film on 3 November 2026. Source: Kyza-QA-Dev main `b40fcc5` (feature commits `f020aa8`, `27214a2`, `b75c9ac`). This release excludes the subsequent AMENDS v2 PDF, which belongs in QA review only.

The existing seven approved constructions remain, with Plain Film added first and Flow Wrap second. Lidding, Plain Web, 2/3-side pouches, Sandbox, Artwork and unreleased asset tools remain unavailable. Existing guards are retained for the registry, Flow, project admission/import/storage, engine dispatch, export and deployment routes. Plain Film's shared plain-web metadata is admitted only when the actual pack identity is Plain Film; relabelling other constructions remains blocked.

Promotes the approved Plain Film/strip fixes, fold and measurement refinements, Flow statuses/artwork, per-object styling, associated text editing, font library and scaling/export changes. QA workspace branding is excluded. Font data is allowed specifically by `font-src 'self' data:` to support the approved self-contained SVG webfonts; script, frame and authentication policies are unchanged.

Verification: production build; eight-pack release-scope tests including save/reopen/import/export, duplicate direct URLs, engine restrictions and preserved blocked saved records; shipped-entry/route guards; focused browser amendments and promotion scenarios. Vercel preview is checked before promotion and the production app after deployment. Existing QA baseline Pack Generator/type-check limitations are documented in the source review and remain outside this promotion.

Rollback: revert the Beta promotion PR and redeploy the previous Beta main `8fa6cb9`. Do not delete saved projects; the existing blocked-record presentation preserves raw data if a construction becomes unavailable again.
