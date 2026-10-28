import type { EngineError, EngineName } from "../shared/engine-api/types"

export const createEngineError = (
  code: string,
  message: string,
  meta?: Record<string, unknown>
): EngineError => ({
  code,
  message,
  meta
})

export const createUnsupportedEngineError = (
  engine: string,
  meta?: Record<string, unknown>
) =>
  createEngineError(
    "UNSUPPORTED_ENGINE",
    `Engine "${engine}" is not supported by the current Engine API bridge.`,
    meta
  )

export const createUnsupportedActionError = (
  engine: EngineName,
  action: string,
  meta?: Record<string, unknown>
) =>
  createEngineError(
    "UNSUPPORTED_ACTION",
    `Action "${action}" is not supported for engine "${engine}".`,
    meta
  )

export const createInvalidPayloadError = (
  message = "Request payload is invalid for this engine action.",
  meta?: Record<string, unknown>
) => createEngineError("INVALID_PAYLOAD", message, meta)
