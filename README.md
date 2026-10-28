# Kyza

Flagship Kyza deployment containing the Klyro app.

## Current state

- The Klyro app is served at `/` and `/app`
- Illustrative cutter preview with no upload, save, or write actions
- Klyro app copied from `ArtworkSandbox` main at `fd8564f6cb86a1f8ee22f34daf65346cdbae6681`
- App entry point: `/app`; Cutter, Artwork, Validation and Account routes are preserved
- No secrets committed

## Deployment rules

Deploy this repository as a separate Vercel staging project. Keep the existing ArtworkSandbox projects and production domain unchanged.

The Kyza Vercel project is the canonical public deployment. Keep `ArtworkSandbox` separate as the source/backup repository and do not attach its Vercel project to `kyza.co.uk`. Vercel Authentication / Deployment Protection should remain enabled for development previews and private routes.

The full application must sit behind Vercel/GitHub deployment protection plus server-side authorization before an app route or any write endpoint is enabled. Do not rely on client-side hiding for access control.

## Local preview

Open `index.html` directly or serve this folder with any static file server. To run the full app locally, run `npm --prefix frontend/frontend ci` followed by `npm --prefix frontend/frontend run dev`.
