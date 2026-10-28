import type {
  AiPackPromptRequest,
  AiPackPromptResponse,
  AiProviderName
} from "../types"

export interface AiProvider {
  name: AiProviderName
  interpretPackPrompt(request: AiPackPromptRequest): Promise<AiPackPromptResponse>
}
