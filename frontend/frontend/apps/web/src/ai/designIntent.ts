import type { DesignIntent, DesignPalette } from "./types"

export const DEFAULT_DESIGN_PALETTE: DesignPalette = {
  primary: "#1f1b16",
  secondary: "#f4f4f1",
  accent: "#2eb774",
  neutral: "#c8c8bf"
}

export const DEFAULT_DESIGN_INTENT: DesignIntent = {
  backgroundStyle: "solid",
  motif: "minimal",
  palette: DEFAULT_DESIGN_PALETTE,
  brandTone: "clean",
  compositionHints: [],
  textPolicy: "minimal"
}

export function createDesignIntent(
  overrides: Partial<DesignIntent> = {}
): DesignIntent {
  return {
    ...DEFAULT_DESIGN_INTENT,
    ...overrides,
    palette: {
      ...DEFAULT_DESIGN_PALETTE,
      ...(overrides.palette ?? {})
    },
    compositionHints: [...(overrides.compositionHints ?? [])]
  }
}
