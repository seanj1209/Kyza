import type { EngineApiRequest, PackGenerateRequest } from "../shared/engine-api/types"

export type AiProviderName = "mock"

export type AiEngineWarning = {
  code: string
  message: string
  meta?: Record<string, unknown>
}

export type AiEngineError = {
  code: string
  message: string
  meta?: Record<string, unknown>
}

export type AiGeneratedEngineRequest = EngineApiRequest

export type AiEngineRequest = {
  requestId: string
  provider?: AiProviderName
  meta?: Record<string, unknown>
}

export type AiEngineResponse = {
  success: boolean
  warnings: AiEngineWarning[]
  errors: AiEngineError[]
}

export type AiPackPromptRequest = AiEngineRequest & {
  userPrompt: string
  preferredPackType?: string
  currentProjectId?: string
  context?: Record<string, unknown>
}

export type AiPackPromptResponse = AiEngineResponse & {
  generatedRequest?: PackGenerateRequest | AiGeneratedEngineRequest
  packGenResult?: PackGenResult
  explanation?: string
  confidence?: number
}

export type PackGenFreeTextInput = {
  rawPrompt: string
}

export type PackGenExtractedSignals = {
  productCategory?: string
  productName?: string
  productWeightG?: number
  productVolumeMl?: number
  productFormat?: string
  packTypeHint?: string
  sizeHint?: "small" | "medium" | "large" | "xl"
  requestedWidthMm?: number
  requestedHeightMm?: number
  requestedDepthMm?: number
  substrateHint?: string
  machineHint?: string
  printHint?: string
  storageHint?: string
  zipRequested?: boolean
  eyemarkCount?: 0 | 1 | 2
  eyemarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "centre-left" | "centre-right" | "centre"
  detectedKeywords: string[]
  missingCriticalInfo: string[]
}

export type PackGenConfidence = "low" | "medium" | "high" | "needs_review"

export type PackGenBuildability =
  | "buildable"
  | "recommended-not-buildable-yet"
  | "fallback-buildable"
  | "unsupported"

export type PackTypeSuitability = {
  packType: string
  score: number
  reasons: string[]
  penalties: string[]
}

export type PackGenRecommendation = {
  id: string
  title: string
  packType: string
  widthMm: number
  heightMm: number
  sealsMm: {
    top: number
    bottom: number
    left: number
    right: number
  }
  bleedMm: number
  eyemarks: {
    count: 0 | 1 | 2
    widthMm: number
    heightMm: number
    suggestedSide?: string
  }
  zipEnabled?: boolean
  substrateSuggestion?: string
  exportTierSuggestion?: "pdf-proof" | "illustrator-ready" | "repro-ready-pack"
  suitability: PackTypeSuitability
  score: number
  reasons: string[]
  penalties: string[]
  buildability: PackGenBuildability
  available: boolean
  fallback: boolean
  confidence: PackGenConfidence
  assumptions: string[]
  warnings: string[]
  questions: string[]
  extractedSignals: PackGenExtractedSignals
  detectedSignals: PackGenExtractedSignals
}

export type PackGenResult = {
  ok: boolean
  input: PackGenFreeTextInput
  extractedSignals: PackGenExtractedSignals
  recommendations: PackGenRecommendation[]
  errors: string[]
}

export type PackGenHeuristicProfile = {
  matchKeywords: string[]
  productCategory: string
  defaultPackTypes: string[]
  sizeBands: Array<{
    weightMinG?: number
    weightMaxG?: number
    sizeHint?: PackGenExtractedSignals["sizeHint"]
    suggestedWidthMm: number
    suggestedHeightMm: number
    confidence: PackGenConfidence
  }>
  defaultSubstrateSuggestion?: string
  assumptions: string[]
  questions: string[]
}

export type PackGenBenchmarkCase = {
  prompt: string
  expectedTopPackTypes: string[]
  acceptableFallbackPackTypes: string[]
  rejectedTopPackTypes?: string[]
  expectedCategory?: string
  expectedWeightG?: number
  expectedSizeClass?: PackGenExtractedSignals["sizeHint"]
  expectedConfidence?: PackGenConfidence
  expectedDimensionsMm?: { width: number; height?: number }
  requiresMultipleOptions?: boolean
  requiresQuestions?: boolean
  shouldBeBuildable?: boolean | "depends-on-pack-support"
}
