import { createPackValidator } from "../../engines/validation-engine"
import {
  resolveFlowwrapGeometry,
  type FlowwrapGeometry
} from "../../geometry/flowwrapGeometry"
import { getEyemarkSealFitWarning } from "../../geometry/eyemarkPlacement"
import type { FlowwrapSpec } from "../../types/flowwrap"
import {
  resolvePillowLayout,
  type ResolvedPillowLayout
} from "../geometry/resolvers/resolvePillowLayout"
import { normalizeSpec } from "../model/normalization"
import { applyIdentityRules, composePack } from "./packComposer"
import type { PackCompositionResult } from "./types"

type PillowValidation = {
  errors: string[]
  warnings?: string[]
}

function validateComposedPillow(spec: FlowwrapSpec): PillowValidation {
  const validate = createPackValidator("pillow-pack")
  const result = validate(spec)
  return {
    errors: result.errors,
    warnings: result.warnings ?? []
  }
}

export type ComposedPillowPack = PackCompositionResult<
  FlowwrapSpec,
  FlowwrapGeometry,
  ResolvedPillowLayout,
  PillowValidation
>

export function composePillowPack(spec: FlowwrapSpec): ComposedPillowPack {
  const composed = composePack({
    packId: "pillow-pack",
    spec,
    normalize: normalizeSpec,
    resolveGeometry: resolveFlowwrapGeometry,
    applyRules: applyIdentityRules,
    validate: validateComposedPillow,
    getErrors: validation => validation.errors,
    getWarnings: validation => validation.warnings ?? [],
    resolveLayout: resolvedSpec => resolvePillowLayout(resolvedSpec)
  })
  const warning = getEyemarkSealFitWarning(
    composed.normalizedSpec.eyeMarks,
    composed.geometry.cutterRect,
    composed.geometry.seals
  )
  if (!warning) {
    return composed
  }
  return {
    ...composed,
    layout: {
      ...composed.layout,
      warnings: [...composed.layout.warnings, warning]
    },
    warnings: [...composed.warnings, warning]
  }
}
