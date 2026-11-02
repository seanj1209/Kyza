import { access } from "node:fs/promises"
import assert from "node:assert/strict"
import { resolve } from "node:path"

const expectedOutputs = [
  "index.html",
  "cutter.html",
  "ai-studio.html",
  "validation.html",
  "account.html",
]

await Promise.all(
  expectedOutputs.map((output) => access(resolve("dist", output))),
)
await assert.rejects(access(resolve("dist", "artwork.html")), "Artwork entry must not ship in Beta")

console.log(`Build route outputs verified: ${expectedOutputs.join(", ")}`)
