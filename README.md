# Kyza

Public landing page and protected staging shell for Kyza.

## Current state

- Public, read-only landing page in `index.html`
- Illustrative cutter preview with no upload, save, or write actions
- No secrets committed
- Full application access is not exposed by this public shell
- Source reference: `seanj1209/ArtworkSandbox` at commit `fd8564f6cb86a1f8ee22f34daf65346cdbae6681`

## Deployment rules

Deploy this repository as a separate Vercel staging project. Keep the existing ArtworkSandbox projects and production domain unchanged.

The full application must sit behind Vercel/GitHub deployment protection plus server-side authorization before an app route or any write endpoint is enabled. Do not rely on client-side hiding for access control.

## Local preview

Open `index.html` directly or serve this folder with any static file server. The preview is intentionally dependency-free.
