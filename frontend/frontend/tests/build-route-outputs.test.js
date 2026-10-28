import { access } from "node:fs/promises"
import { resolve } from "node:path"

const expectedOutputs = [
  "index.html",
  "cutter.html",
  "ai-studio.html",
  "artwork.html",
  "validation.html",
  "account.html",
]

await Promise.all(
  expectedOutputs.map((output) => access(resolve("dist", output))),
)

console.log(`Build route outputs verified: ${expectedOutputs.join(", ")}`)
