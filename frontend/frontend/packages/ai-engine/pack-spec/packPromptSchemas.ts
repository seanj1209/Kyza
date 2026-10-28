export type InterpretedPackPrompt = {
  packType: string
  width: number
  height: number
  requestedFeatures?: string[]
}

export const SUPPORTED_AI_PACK_TYPES = [
  "doy-pouch",
  "pillow-pack",
  "flowwrap"
] as const
