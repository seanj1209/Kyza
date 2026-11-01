import { getPackModule } from "../../apps/web/src/packs"
import type { FlowwrapSpec } from "../../apps/web/src/types/flowwrap"
import { projectFromLegacySpec } from "../cutter-engine/project"
import { validateKyzaProject } from "../cutter-engine/validation"
import type {
  EngineApiResponse,
  EngineError,
  EngineWarning,
  PackGenerateRequest,
  ValidationMessage,
  ValidationReport
} from "../shared/engine-api/types"
import {
  createInvalidPayloadError,
  createUnsupportedActionError
} from "./errors"
import { isRecord } from "./guards"

type GeneratePackPayload = {
  packId?: string
  packType?: string
}

type GeneratePackState = {
  packId: string
  packName: string
  spec: FlowwrapSpec
}

const toValidationMessages = (
  errors: EngineError[],
  warnings: EngineWarning[]
): ValidationMessage[] => [
  ...errors.map(error => ({
    code: error.code,
    message: error.message,
    severity: "error" as const,
    meta: error.meta
  })),
  ...warnings.map(warning => ({
    code: warning.code,
    message: warning.message,
    severity: "warning" as const,
    meta: warning.meta
  }))
]

const createValidationReport = (
  errors: EngineError[],
  warnings: EngineWarning[]
): ValidationReport => ({
  valid: errors.length === 0,
  messages: toValidationMessages(errors, warnings)
})

export const runPackGenerateRequest = (
  request: PackGenerateRequest
): EngineApiResponse<"pack-generator", GeneratePackState, GeneratePackState> => {
  if (request.action !== "generatePack") {
    return {
      success: false,
      engine: "pack-generator",
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [createUnsupportedActionError("pack-generator", request.action)],
      validationReport: {
        valid: false,
        messages: []
      }
    }
  }

  if (!isRecord(request.payload)) {
    const error = createInvalidPayloadError()
    return {
      success: false,
      engine: "pack-generator",
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [error],
      validationReport: createValidationReport([error], [])
    }
  }

  const payload = request.payload as GeneratePackPayload
  const packId = payload.packId ?? payload.packType
  if (!packId) {
    const error = createInvalidPayloadError(
      "Pack generation request requires a packId or packType."
    )
    return {
      success: false,
      engine: "pack-generator",
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [error],
      validationReport: createValidationReport([error], [])
    }
  }

  const packModule = getPackModule(packId)
  if (!packModule) {
    const error = createInvalidPayloadError(`Pack "${packId}" is not available in the current project.`, {
      packId
    })
    return {
      success: false,
      engine: "pack-generator",
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [error],
      validationReport: createValidationReport([error], [])
    }
  }

  const spec = packModule.getDefaults()
  const now = new Date().toISOString()
  const project = projectFromLegacySpec(
    packModule.id,
    packModule.name,
    spec,
    {
      id: `engine-api-${request.requestId}`,
      createdAt: now,
      updatedAt: now
    }
  )
  const validation = validateKyzaProject(project)
  const toMeta = (message: (typeof validation.messages)[number]) => ({
    packId: packModule.id,
    packType: message.packType,
    elementIds: message.elementIds,
    fieldPath: message.fieldPath,
    source: "structured-validation"
  })
  const warnings: EngineWarning[] = validation.messages
    .filter(message => message.severity === "warning")
    .map(message => ({
      code: message.code,
      message: message.message,
      meta: toMeta(message)
    }))
  const errors: EngineError[] = validation.messages
    .filter(message => message.severity === "error")
    .map(message => ({
      code: message.code,
      message: message.message,
      meta: toMeta(message)
    }))
  const updatedState: GeneratePackState = {
    packId: packModule.id,
    packName: packModule.name,
    spec
  }

  return {
    success: true,
    engine: "pack-generator",
    action: request.action,
    requestId: request.requestId,
    updatedState,
    output: updatedState,
    warnings,
    errors,
    validationReport: createValidationReport(errors, warnings)
  }
}
