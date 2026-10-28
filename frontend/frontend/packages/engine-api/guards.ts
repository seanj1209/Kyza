import type { EngineApiRequest, EngineName } from "../shared/engine-api/types"

const SUPPORTED_ENGINES: EngineName[] = ["pack-generator", "cutter", "artwork"]

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isEngineName = (value: unknown): value is EngineName =>
  typeof value === "string" && SUPPORTED_ENGINES.includes(value as EngineName)

export const isEngineApiRequestLike = (
  value: unknown
): value is EngineApiRequest<EngineName, unknown, unknown> => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.requestId === "string" &&
    typeof value.engine === "string" &&
    typeof value.action === "string" &&
    "payload" in value
  )
}
