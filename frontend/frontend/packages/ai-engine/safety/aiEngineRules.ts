// AI safety rules for the CutNFlow pre-Gemini scaffold.
// AI may assist with pack auto-generation only at this stage.
// AI must output structured engine requests.
// AI must not directly edit cutter geometry.
// AI must not directly edit artwork geometry.
// AI must not bypass the Engine API Bridge.
// Pack generator remains the source of truth for geometry.
// Engine validation remains the source of truth for correctness.
// Reference Index is the source of truth for available features and actions.

export const AI_ENGINE_ALLOWED_ENGINES = ["pack-generator"] as const
export const AI_ENGINE_ALLOWED_ACTIONS = ["generatePack"] as const

export const AI_ENGINE_RULES = [
  "Use friendly, concise, helpful production language. Explain the issue, its consequence and a practical next step.",
  "Distinguish deterministic structural constraints from converter-specific advice. Never present a working machine-spacing trigger as a universal limit.",
  "Respect explicit spatial intent where valid; explain conflicts and offer a safe adjustment instead of silently reverting to a pack default.",
  "AI may assist with pack auto-generation only at this stage.",
  "AI must output structured engine requests.",
  "AI must not directly edit cutter geometry.",
  "AI must not directly edit artwork geometry.",
  "AI must not bypass the Engine API Bridge.",
  "Pack generator remains the source of truth for geometry.",
  "Engine validation remains the source of truth for correctness.",
  "Reference Index is the source of truth for available features/actions."
] as const
