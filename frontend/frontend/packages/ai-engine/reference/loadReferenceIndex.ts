import type { ReferenceIndexSummary } from "./referenceIndexTypes"

export const loadReferenceIndex = async (): Promise<ReferenceIndexSummary> => {
  // TODO: Future server-side or build-time loading can read the real reference-index
  // documents. Keep this browser-safe placeholder for now.
  return {
    version: "mock-reference-index-v1",
    allowedEngines: ["pack-generator"],
    allowedActions: ["generatePack"],
    hardRules: [
      "AI must output structured engine requests only.",
      "AI must not directly edit cutter geometry.",
      "AI must not directly edit artwork geometry.",
      "Engine API Bridge must execute generated requests.",
      "Engines remain the source of truth for geometry and validation."
    ]
  }
}
