import { migrateBrandStorage } from "../../../packages/cutter-engine/project/brandCompatibility"

// Every entry imports this before modules that read browser preferences or drafts.
if (typeof window !== "undefined") {
  for (const kind of ["localStorage", "sessionStorage"] as const) {
    try {
      migrateBrandStorage(window[kind])
    } catch {
      // The app still runs when the browser refuses access to storage.
    }
  }
}
