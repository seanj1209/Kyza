import type {
  ArtworkActionRequest,
  EngineApiResponse
} from "../shared/engine-api/types"
import { createUnsupportedActionError } from "./errors"

export const runArtworkActionRequest = (
  request: ArtworkActionRequest
): EngineApiResponse<"artwork"> => ({
  success: false,
  engine: "artwork",
  action: request.action,
  requestId: request.requestId,
  warnings: [
    {
      code: "ARTWORK_ENGINE_NOT_IMPLEMENTED",
      message: "Artwork Engine API actions are not implemented yet."
    }
  ],
  errors: [
    createUnsupportedActionError("artwork", request.action, {
      reason: "Artwork bridge actions are intentionally deferred for a later task."
    })
  ],
  validationReport: {
    valid: false,
    messages: [
      {
        code: "ARTWORK_ENGINE_NOT_IMPLEMENTED",
        message: "Artwork Engine API actions are not implemented yet.",
        severity: "warning"
      }
    ]
  }
})
