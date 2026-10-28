import type { PackValidationResult } from "../../packs/packModule"
import type { FlowwrapSpec, PlainWebGuideLineSpec } from "../../types/flowwrap"
import { validateFlowwrapSpec } from "../../constraints/flowwrap"

function normalizePlainFilmSpec(spec: FlowwrapSpec): FlowwrapSpec {
  return {
    ...spec,
    seal: 0,
    sealClearance: spec.sealClearance ?? 0,
    seals: {
      top: spec.seals?.top ?? 0,
      bottom: spec.seals?.bottom ?? 0,
      left: spec.seals?.left ?? 0,
      right: spec.seals?.right ?? 0
    }
  }
}

function validateGuideLine(
  spec: FlowwrapSpec,
  guideLine: PlainWebGuideLineSpec,
  index: number,
  errors: string[]
) {
  const label = guideLine.id || `guide line ${index + 1}`
  const limit =
    guideLine.orientation === "vertical" ? spec.width : spec.height
  const axisLimit =
    guideLine.orientation === "vertical" ? spec.height : spec.width

  if (!Number.isFinite(guideLine.offset) || guideLine.offset < 0 || guideLine.offset > limit) {
    errors.push(`Plain web ${label} offset must be inside the live area.`)
  }

  const start = guideLine.start ?? 0
  const end = guideLine.end ?? axisLimit
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) {
    errors.push(`Plain web ${label} span must use finite non-negative values.`)
    return
  }
  if (end <= start) {
    errors.push(`Plain web ${label} span end must be greater than span start.`)
    return
  }
  if (end > axisLimit) {
    errors.push(`Plain web ${label} span must stay inside the live area.`)
  }
}

export function validatePlainWebSpec(spec: FlowwrapSpec): PackValidationResult {
  const baseValidation = validateFlowwrapSpec(normalizePlainFilmSpec(spec))
  const errors = [...baseValidation.errors]
  const warnings = [...(baseValidation.warnings ?? [])]

  ;(spec.plainWeb?.guideLines ?? []).forEach((guideLine, index) => {
    validateGuideLine(spec, guideLine, index, errors)
  })

  return { errors, warnings }
}
