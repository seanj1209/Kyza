import { spawnSync } from "node:child_process"

const scripts = [
  "test:constraints",
  "test:metric",
  "test:selection",
  "test:project-contract",
  "test:project-update",
  "test:project-continuity",
  "test:element-identity",
  "test:validation-export",
  "test:packgen",
  "test:packgen-project",
  "test:packgen-benchmark",
  "test:layout-fixtures",
  "test:klyro-dashboard",
  "test:klyro-new-project",
  "test:project-open-handoff",
  "test:project-creation",
  "test:beta-validation",
  "test:beta-eyemark-refinement",
  "test:amends-v10",
  "test:pre-export-validation",
  "test:project-export-service",
  "test:hanger-slot-orientation",
  "test:amends-v6-1",
  "test:amends-v8-2",
  "test:amends-v8-3-lidding-v1-2",
  "test:pre-export-review-ui",
  "test:amends-v11",
  "test:amends-v12",
  "test:amends-v12-ui",
  "test:klyro-shell",
  "test:build-routes",
]

const npmCliPath = process.env.npm_execpath

if (!npmCliPath) {
  throw new Error("npm_execpath is required to run the verification suite")
}

for (const script of scripts) {
  const result = spawnSync(process.execPath, [npmCliPath, "run", script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`Verification complete: ${scripts.length} scripts passed.`)
