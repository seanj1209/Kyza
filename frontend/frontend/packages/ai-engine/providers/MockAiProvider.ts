import type { PackGenerateRequest } from "../../shared/engine-api/types"
import { generatePackGenRecommendations } from "../pack-spec/packGenService"
import type {
  AiEngineError,
  AiEngineWarning,
  AiPackPromptRequest,
  AiPackPromptResponse,
  PackGenConfidence
} from "../types"
import type { AiProvider } from "./AiProvider"

const confidenceScore: Record<PackGenConfidence, number> = {
  needs_review: 0.2,
  low: 0.4,
  medium: 0.7,
  high: 0.9
}

export class MockAiProvider implements AiProvider {
  name = "mock" as const

  async interpretPackPrompt(
    request: AiPackPromptRequest
  ): Promise<AiPackPromptResponse> {
    const packGenResult = generatePackGenRecommendations(request.userPrompt)
    if (!packGenResult.ok || packGenResult.recommendations.length === 0) {
      const errors: AiEngineError[] = packGenResult.errors.map((message, index) => ({
        code: index === 0 && !request.userPrompt.trim()
          ? "PROMPT_EMPTY"
          : "PROMPT_UNSAFE_OR_UNSUPPORTED",
        message
      }))
      return {
        success: false,
        packGenResult,
        warnings: [],
        errors,
        explanation: "The deterministic Pack Gen service could not create a safe starting recommendation."
      }
    }

    const recommendation = request.preferredPackType
      ? packGenResult.recommendations.find(item => item.packType === request.preferredPackType)
        ?? packGenResult.recommendations[0]
      : packGenResult.recommendations[0]
    const generatedRequest: PackGenerateRequest = {
      requestId: request.requestId,
      engine: "pack-generator",
      action: "generatePack",
      projectId: request.currentProjectId,
      payload: {
        packType: recommendation.packType,
        spec: {
          width: recommendation.widthMm,
          height: recommendation.heightMm
        },
        promptSource: request.userPrompt,
        recommendationId: recommendation.id
      },
      meta: {
        provider: this.name,
        source: "flowai-pack-gen-v1-deterministic",
        ...request.meta
      }
    }
    const warnings: AiEngineWarning[] = recommendation.warnings.map((message, index) => ({
      code: index === 0 ? "STARTING_ESTIMATE" : "PACK_GEN_REVIEW",
      message
    }))

    return {
      success: true,
      generatedRequest,
      packGenResult,
      explanation: `${packGenResult.recommendations.length} starting recommendation${packGenResult.recommendations.length === 1 ? "" : "s"} generated from the supplied free text.`,
      warnings,
      errors: [],
      confidence: confidenceScore[recommendation.confidence]
    }
  }
}
