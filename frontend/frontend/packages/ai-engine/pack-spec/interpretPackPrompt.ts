import type { AiPackPromptRequest, AiPackPromptResponse } from "../types"
import { MockAiProvider } from "../providers/MockAiProvider"
import { validateAiGeneratedRequest } from "../safety/validateAiGeneratedRequest"

export const interpretPackPrompt = async (
  request: AiPackPromptRequest
): Promise<AiPackPromptResponse> => {
  const provider = new MockAiProvider()
  const response = await provider.interpretPackPrompt(request)

  if (!response.generatedRequest) {
    return response
  }

  const validation = validateAiGeneratedRequest(response.generatedRequest)
  if (!validation.valid) {
    return {
      ...response,
      success: false,
      generatedRequest: undefined,
      warnings: [...response.warnings, ...validation.warnings],
      errors: [...response.errors, ...validation.errors]
    }
  }

  return {
    ...response,
    warnings: [...response.warnings, ...validation.warnings],
    errors: [...response.errors, ...validation.errors]
  }
}
