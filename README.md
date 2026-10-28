# Kyza

Public landing page and protected staging copy of the Klyro app for Kyza.

## Current state

- Public, read-only landing page served at `/` from `landing.html`
- Illustrative cutter preview with no upload, save, or write actions
- Klyro app copied from `ArtworkSandbox` main at `fd8564f6cb86a1f8ee22f34daf65346cdbae6681`
- App entry point: `/app`; Cutter, Artwork, Validation and Account routes are preserved
- No secrets committed

## Deployment rules

Deploy this repository as a separate Vercel staging project. Keep the existing ArtworkSandbox projects and production domain unchanged.

The staging build is configured to publish the landing page at `/` and the app at `/app`. Before sharing `/app`, enable Vercel Authentication / Deployment Protection for the staging project. The static app itself does not provide server-side authentication.

The full application must sit behind Vercel/GitHub deployment protection plus server-side authorization before an app route or any write endpoint is enabled. Do not rely on client-side hiding for access control.

## Local preview

Open `index.html` directly or serve this folder with any static file server. To run the full app locally, run `npm --prefix frontend/frontend ci` followed by `npm --prefix frontend/frontend run dev`.
