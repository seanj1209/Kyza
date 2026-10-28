import type { EngineApiRequest } from "../../shared/engine-api/types"
import type { AiEngineError, AiEngineWarning } from "../types"
import { AI_ENGINE_ALLOWED_ACTIONS, AI_ENGINE_ALLOWED_ENGINES } from "./aiEngineRules"

type AiGeneratedRequestValidationResult = {
  valid: boolean
  warnings: AiEngineWarning[]
  errors: AiEngineError[]
}

const createWarning = (
  code: string,
  message: string,
  meta?: Record<string, unknown>
): AiEngineWarning => ({
  code,
  message,
  meta
})

const createError = (
  code: string,
  message: string,
  meta?: Record<string, unknown>
): AiEngineError => ({
  code,
  message,
  meta
})

export const validateAiGeneratedRequest = (
  request: EngineApiRequest | undefined
): AiGeneratedRequestValidationResult => {
  if (!request) {
    return {
      valid: false,
      warnings: [],
      errors: [
        createError(
          "AI_REQUEST_MISSING",
          "AI-generated request is missing."
        )
      ]
    }
  }

  const warnings: AiEngineWarning[] = []
  const errors: AiEngineError[] = []

  if (!AI_ENGINE_ALLOWED_ENGINES.includes(request.engine as typeof AI_ENGINE_ALLOWED_ENGINES[number])) {
    errors.push(
      createError(
        "AI_ENGINE_NOT_ALLOWED",
        `AI-generated engine "${request.engine}" is not allowed at this stage.`,
        { engine: request.engine }
      )
    )
  }

  if (!AI_ENGINE_ALLOWED_ACTIONS.includes(request.action as typeof AI_ENGINE_ALLOWED_ACTIONS[number])) {
    errors.push(
      createError(
        "AI_ACTION_NOT_ALLOWED",
        `AI-generated action "${request.action}" is not allowed at this stage.`,
        { action: request.action }
      )
    )
  }

  if (request.payload == null) {
    errors.push(
      createError(
        "AI_PAYLOAD_MISSING",
        "AI-generated request must include a payload."
      )
    )
  }

  const packType =
    typeof request.payload === "object" && request.payload !== null
      ? (request.payload as Record<string, unknown>).packType
      : undefined

  if (request.engine === "pack-generator" && request.action === "generatePack" && typeof packType !== "string") {
    errors.push(
      createError(
        "AI_PACK_TYPE_MISSING",
        "AI-generated pack request must include packType in the payload."
      )
    )
  }

  if (request.projectId == null) {
    warnings.push(
      createWarning(
        "AI_PROJECT_ID_UNSET",
        "AI-generated request does not include a currentProjectId. This is safe for scaffolding but may be required later."
      )
    )
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}
