import { copyFile } from "node:fs/promises"

await copyFile("dist/index.html", "dist/app.html")
await copyFile("dist/landing.html", "dist/index.html")
