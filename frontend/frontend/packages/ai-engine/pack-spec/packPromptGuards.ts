import { SUPPORTED_AI_PACK_TYPES, type InterpretedPackPrompt } from "./packPromptSchemas"

export const isSupportedAiPackType = (value: unknown): value is InterpretedPackPrompt["packType"] =>
  typeof value === "string" && SUPPORTED_AI_PACK_TYPES.includes(value as typeof SUPPORTED_AI_PACK_TYPES[number])

export const hasPositiveDimensions = (value: {
  width?: unknown
  height?: unknown
}): value is { width: number; height: number } =>
  typeof value.width === "number" &&
  Number.isFinite(value.width) &&
  value.width > 0 &&
  typeof value.height === "number" &&
  Number.isFinite(value.height) &&
  value.height > 0
