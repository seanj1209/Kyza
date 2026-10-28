import {
  getEyeMarkOffsetsForIndex,
  setEyeMarkOffsetsForIndex,
  setEyeMarkSizeForIndex
} from "../../apps/web/src/geometry/eyeMarkState"
import {
  getTdEyemarkReduceAction,
  getTdEyemarkWidthIncreaseAction
} from "../../apps/web/src/artwork/tdEyemarkActions"
import type { EyeMarkSpec } from "../../apps/web/src/types/eyeMarks"
import type {
  CutterActionRequest,
  EngineApiResponse,
  ValidationReport
} from "../shared/engine-api/types"
import {
  createInvalidPayloadError,
  createUnsupportedActionError
} from "./errors"
import { isRecord } from "./guards"

type TdEyemarkMoveTarget = {
  eyemarkIndex: number
  affectedSide: "left" | "right"
  currentTdClearanceMm: number
  requiredTdClearanceMm: number
}

type MoveTdEyemarksPayload = {
  eyeMarks?: EyeMarkSpec
  portraitMapping?: boolean
  affectedEyemarks?: TdEyemarkMoveTarget[]
}

type ReduceTdEyemarksPayload = {
  eyeMarks?: EyeMarkSpec
  affectedEyemarks?: TdEyemarkMoveTarget[]
  isGrouped?: boolean
}

type IncreaseTdEyemarksPayload = {
  eyeMarks?: EyeMarkSpec
  affectedEyemarks?: TdEyemarkMoveTarget[]
  isGrouped?: boolean
  recommendedWidthIncreaseMm?: number
  currentWidth?: number
}

type SetEyemarkCountPayload = {
  eyeMarks?: EyeMarkSpec
  count?: number
}

type CutterUpdatedState = {
  eyeMarks: EyeMarkSpec
  width?: number
}

const DEFAULT_EYEMARK_WIDTH = 10
const DEFAULT_EYEMARK_HEIGHT = 5

const createValidationReport = (valid: boolean, message?: string): ValidationReport => ({
  valid,
  messages: message
    ? [
        {
          code: valid ? "CUTTER_ACTION_OK" : "CUTTER_ACTION_ERROR",
          message,
          severity: valid ? "info" : "error"
        }
      ]
    : []
})

const createDefaultEyeMarks = (): EyeMarkSpec => ({
  count: 1,
  position: "top-left",
  width: DEFAULT_EYEMARK_WIDTH,
  height: DEFAULT_EYEMARK_HEIGHT,
  width2: DEFAULT_EYEMARK_WIDTH,
  height2: DEFAULT_EYEMARK_HEIGHT,
  color: "black"
})

const moveTdEyemarksInward = (payload: MoveTdEyemarksPayload) => {
  let nextEyeMarks = payload.eyeMarks!
  payload.affectedEyemarks!.forEach(target => {
    const shiftAmount = target.requiredTdClearanceMm - target.currentTdClearanceMm
    if (!(shiftAmount > 0)) {
      return
    }

    const shiftDirection = target.affectedSide === "left" ? 1 : -1
    const currentOffsets = getEyeMarkOffsetsForIndex(nextEyeMarks, target.eyemarkIndex)
    const nextOffsetX = payload.portraitMapping
      ? currentOffsets.offsetX
      : currentOffsets.offsetX + shiftDirection * shiftAmount
    const nextOffsetY = payload.portraitMapping
      ? currentOffsets.offsetY + shiftDirection * shiftAmount
      : currentOffsets.offsetY

    nextEyeMarks = setEyeMarkOffsetsForIndex(
      nextEyeMarks,
      target.eyemarkIndex,
      nextOffsetX,
      nextOffsetY
    )
  })

  return {
    eyeMarks: nextEyeMarks
  } satisfies CutterUpdatedState
}

const reduceTdEyemarkSize = (payload: ReduceTdEyemarksPayload) => {
  const reductions = payload.affectedEyemarks!.map(target =>
    getTdEyemarkReduceAction({
      leftDistance:
        target.affectedSide === "left"
          ? target.currentTdClearanceMm
          : Number.POSITIVE_INFINITY,
      rightDistance:
        target.affectedSide === "right"
          ? target.currentTdClearanceMm
          : Number.POSITIVE_INFINITY,
      currentWidthMm:
        target.eyemarkIndex === 1
          ? payload.eyeMarks!.width2 ?? payload.eyeMarks!.width
          : payload.eyeMarks!.width,
      currentOffsetXMm: getEyeMarkOffsetsForIndex(payload.eyeMarks!, target.eyemarkIndex).offsetX,
      thresholdMm: target.requiredTdClearanceMm
    })
  )

  const blockedReduction = reductions.find(reduction => !reduction.enabled)
  if (blockedReduction) {
    return {
      error: createInvalidPayloadError(
        payload.isGrouped
          ? "One or more eyemarks cannot be reduced further without going below minimum size."
          : blockedReduction.reason
      )
    }
  }

  let nextEyeMarks = payload.eyeMarks!
  payload.affectedEyemarks!.forEach((target, index) => {
    const reduction = reductions[index]
    if (!reduction?.enabled) {
      return
    }
    const currentHeight =
      target.eyemarkIndex === 1
        ? nextEyeMarks.height2 ?? nextEyeMarks.height
        : nextEyeMarks.height
    const currentOffsetY = getEyeMarkOffsetsForIndex(nextEyeMarks, target.eyemarkIndex).offsetY
    nextEyeMarks = setEyeMarkOffsetsForIndex(
      setEyeMarkSizeForIndex(
        nextEyeMarks,
        target.eyemarkIndex,
        reduction.nextWidthMm,
        currentHeight
      ),
      target.eyemarkIndex,
      reduction.nextOffsetXMm,
      currentOffsetY
    )
  })

  return {
    updatedState: {
      eyeMarks: nextEyeMarks
    } satisfies CutterUpdatedState
  }
}

const increaseTdEyemarkCutterWidth = (payload: IncreaseTdEyemarksPayload) => {
  const primaryTarget = payload.affectedEyemarks![0]
  const increase = payload.isGrouped
    ? {
        enabled: true,
        widthIncreaseMm: payload.recommendedWidthIncreaseMm ?? 3
      }
    : getTdEyemarkWidthIncreaseAction({
        leftDistance:
          primaryTarget?.affectedSide === "left"
            ? primaryTarget.currentTdClearanceMm
            : Number.POSITIVE_INFINITY,
        rightDistance:
          primaryTarget?.affectedSide === "right"
            ? primaryTarget.currentTdClearanceMm
            : Number.POSITIVE_INFINITY,
        thresholdMm: primaryTarget?.requiredTdClearanceMm,
        minimumIncreaseMm: payload.recommendedWidthIncreaseMm ?? 2
      })

  if (!increase.enabled) {
    return {
      error: createInvalidPayloadError(increase.reason)
    }
  }

  if (!Number.isFinite(payload.currentWidth)) {
    return {
      error: createInvalidPayloadError(
        "Cutter width increase request requires the current cutter width."
      )
    }
  }

  let nextEyeMarks = payload.eyeMarks!
  payload.affectedEyemarks!.forEach(target => {
    const deficit = target.requiredTdClearanceMm - target.currentTdClearanceMm
    const currentOffsets = getEyeMarkOffsetsForIndex(nextEyeMarks, target.eyemarkIndex)
    const nextOffsetX =
      target.affectedSide === "right"
        ? currentOffsets.offsetX - increase.widthIncreaseMm
        : currentOffsets.offsetX + Math.max(0, deficit)

    nextEyeMarks = setEyeMarkOffsetsForIndex(
      nextEyeMarks,
      target.eyemarkIndex,
      nextOffsetX,
      currentOffsets.offsetY
    )
  })

  return {
    updatedState: {
      eyeMarks: nextEyeMarks,
      width: payload.currentWidth! + increase.widthIncreaseMm
    } satisfies CutterUpdatedState
  }
}

const setEyemarkCount = (payload: SetEyemarkCountPayload) => {
  if (payload.count !== 1 && payload.count !== 2) {
    return {
      error: createInvalidPayloadError(
        "Eyemark count bridge support is currently limited to stable 1 or 2 eyemark states."
      )
    }
  }

  const base = payload.eyeMarks ?? createDefaultEyeMarks()
  const previousCount = base.count ?? 1
  const nextEyeMarks: EyeMarkSpec = {
    ...base,
    count: payload.count,
    position: payload.count === 2 ? "top" : "top-left",
    width2: base.width2 ?? base.width ?? DEFAULT_EYEMARK_WIDTH,
    height2: base.height2 ?? base.height ?? DEFAULT_EYEMARK_HEIGHT
  }

  if (nextEyeMarks.count === 1) {
    const validSingle = new Set([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "centre",
      "centre-left",
      "centre-right"
    ])
    if (!validSingle.has(nextEyeMarks.position)) {
      nextEyeMarks.position = "top-left"
    }
    nextEyeMarks.offsetX2 = undefined
    nextEyeMarks.offsetY2 = undefined
    nextEyeMarks.manualPositioned2 = false
  } else if (nextEyeMarks.count === 2) {
    const validDouble = new Set(["top", "bottom", "centre"])
    if (!validDouble.has(nextEyeMarks.position)) {
      nextEyeMarks.position = "top"
    }
    if (previousCount !== 2) {
      nextEyeMarks.offsetX2 = undefined
      nextEyeMarks.offsetY2 = undefined
      nextEyeMarks.manualPositioned2 = false
    }
  }

  return {
    updatedState: {
      eyeMarks: nextEyeMarks
    } satisfies CutterUpdatedState
  }
}

export const runCutterActionRequest = (
  request: CutterActionRequest
): EngineApiResponse<"cutter", CutterUpdatedState, CutterUpdatedState> => {
  if (!isRecord(request.payload)) {
    const error = createInvalidPayloadError()
    return {
      success: false,
      engine: "cutter",
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [error],
      validationReport: createValidationReport(false, error.message)
    }
  }

  let result:
    | { updatedState: CutterUpdatedState }
    | { error: ReturnType<typeof createInvalidPayloadError> }

  switch (request.action) {
    case "moveTdEyemarksInward": {
      const payload = request.payload as MoveTdEyemarksPayload
      if (!payload.eyeMarks || !Array.isArray(payload.affectedEyemarks) || payload.affectedEyemarks.length === 0) {
        result = {
          error: createInvalidPayloadError(
            "Cutter action request requires eyeMarks and affectedEyemarks."
          )
        }
        break
      }
      result = {
        updatedState: moveTdEyemarksInward(payload)
      }
      break
    }
    case "reduceTdEyemarkSize": {
      const payload = request.payload as ReduceTdEyemarksPayload
      if (!payload.eyeMarks || !Array.isArray(payload.affectedEyemarks) || payload.affectedEyemarks.length === 0) {
        result = {
          error: createInvalidPayloadError(
            "Reduce eyemark request requires eyeMarks and affectedEyemarks."
          )
        }
        break
      }
      result = reduceTdEyemarkSize(payload)
      break
    }
    case "increaseTdEyemarkCutterWidth": {
      const payload = request.payload as IncreaseTdEyemarksPayload
      if (!payload.eyeMarks || !Array.isArray(payload.affectedEyemarks) || payload.affectedEyemarks.length === 0) {
        result = {
          error: createInvalidPayloadError(
            "Increase width request requires eyeMarks and affectedEyemarks."
          )
        }
        break
      }
      result = increaseTdEyemarkCutterWidth(payload)
      break
    }
    case "setEyemarkCount": {
      result = setEyemarkCount(request.payload as SetEyemarkCountPayload)
      break
    }
    default:
      return {
        success: false,
        engine: "cutter",
        action: request.action,
        requestId: request.requestId,
        warnings: [],
        errors: [createUnsupportedActionError("cutter", request.action)],
        validationReport: createValidationReport(false)
      }
  }

  if ("error" in result) {
    return {
      success: false,
      engine: "cutter",
      action: request.action,
      requestId: request.requestId,
      warnings: [],
      errors: [result.error],
      validationReport: createValidationReport(false, result.error.message)
    }
  }

  return {
    success: true,
    engine: "cutter",
    action: request.action,
    requestId: request.requestId,
    updatedState: result.updatedState,
    output: result.updatedState,
    warnings: [],
    errors: [],
    validationReport: createValidationReport(true, "Cutter action completed.")
  }
}
