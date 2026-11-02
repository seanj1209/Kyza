import assert from "node:assert/strict"
import { readFile, access } from "node:fs/promises"

for (const file of ["vercel.json", "../../vercel.json"]) {
  const config = JSON.parse(await readFile(file, "utf8"))
  for (const route of ["/artwork", "/artwork.html", "/artwork/:path*"]) {
    assert(config.redirects.some(rule => rule.source === route && rule.destination === "/?notice=beta-scope"), `${file}: ${route} must be rejected by the deployment before the SPA`)
  }
  assert(!config.rewrites.some(rule => rule.destination === "/artwork.html"))
}
await assert.rejects(access("dist/artwork.html"), "Beta must not ship the Artwork entry")
console.log("Beta deployment route and shipped-entry guards passed.")
