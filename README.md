# Kyza

Kyza is a browser-based workspace for packaging specification, cutter engineering, validation and export.

## Current state

- The Kyza app is served at `/` and `/app`
- Kyza app copied from `ArtworkSandbox` main at `fd8564f6cb86a1f8ee22f34daf65346cdbae6681`
- App entry point: `/app`; Cutter, Artwork, Validation and Account routes are preserved
- No secrets committed

## Deployment rules

Deploy this repository as a separate Vercel staging project. Keep the existing ArtworkSandbox projects and production domain unchanged.

The Kyza Vercel project serves `kyza.co.uk`. Keep `ArtworkSandbox` separate as a frozen historical repository. Vercel Authentication / Deployment Protection remains enabled for all Kyza deployments.

The full application must sit behind Vercel/GitHub deployment protection plus server-side authorization before an app route or any write endpoint is enabled. Do not rely on client-side hiding for access control.

## Local preview

Run `npm --prefix frontend/frontend ci` followed by `npm --prefix frontend/frontend run dev`. Run `npm --prefix frontend/frontend run verify` for the full verification suite.

## Brand

The exact owner-supplied Origin PNGs are used across the application, including separate light/dark horizontal logos and symbols. Assets live in `frontend/frontend/public/branding`; SHA-256 hashes are recorded in `manifest.json`. SVG viewports only trim surrounding whitespace. The logo is not traced, recoloured or recreated. Export legends embed the original symbol image; cutter geometry and legend text remain editable.

The current source tree, stylesheet names, application copy, tests and export producers use Kyza naming. The isolated `brandCompatibility.ts` adapter accepts historical storage keys and export-audit version identifiers so existing projects, preferences, IDs and revisions remain recoverable. Those historical identifiers are not product branding.
