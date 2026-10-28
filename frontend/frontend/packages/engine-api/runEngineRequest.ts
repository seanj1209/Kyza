import type {
  EngineApiRequest,
  EngineApiResponse
} from "../shared/engine-api/types"
import {
  createInvalidPayloadError,
  createUnsupportedEngineError
} from "./errors"
import { isEngineApiRequestLike, isEngineName } from "./guards"
import { runArtworkActionRequest } from "./runArtworkActionRequest"
import { runCutterActionRequest } from "./runCutterActionRequest"
import { runPackGenerateRequest } from "./runPackGenerateRequest"

// Future AI-built screens should call the Engine API bridge with structured
// EngineApiRequest objects only. The bridge coordinates access, but the engines
// remain the source of truth for geometry and validation rules.
export const runEngineRequest = (
  request: EngineApiRequest | unknown
): EngineApiResponse => {
  if (!isEngineApiRequestLike(request)) {
    const error = createInvalidPayloadError(
      "Engine API request is missing required fields."
    )
    return {
      success: false,
      engine: "pack-generator",
      action: "unknown",
      warnings: [],
      errors: [error],
      validationReport: {
        valid: false,
        messages: [
          {
            code: error.code,
            message: error.message,
            severity: "error"
          }
        ]
      }
    }
  }

  if (!isEngineName(request.engine)) {
    const error = createUnsupportedEngineError(request.engine, {
      action: request.action
    })
    return {
      success: false,
      engine: request.engine as never,
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [error],
      validationReport: {
        valid: false,
        messages: [
          {
            code: error.code,
            message: error.message,
            severity: "error"
          }
        ]
      }
    }
  }

  switch (request.engine) {
    case "pack-generator":
      return runPackGenerateRequest(request)
    case "cutter":
      return runCutterActionRequest(request)
    case "artwork":
      return runArtworkActionRequest(request)
    default: {
      const error = createUnsupportedEngineError(request.engine, {
        action: request.action
      })
      return {
        success: false,
        engine: request.engine,
        action: request.action,
        requestId: request.requestId,
        warnings: [],
        errors: [error],
        validationReport: {
          valid: false,
          messages: [
            {
              code: error.code,
              message: error.message,
              severity: "error"
            }
          ]
        }
      }
    }
  }
}
