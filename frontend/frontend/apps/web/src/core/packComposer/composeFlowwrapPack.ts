import { resolveFlowwrapGeometry, type FlowwrapGeometry } from "../../geometry/flowwrapGeometry"
import { createPackValidator } from "../../engines/validation-engine"
import { normalizeSpec } from "../model/normalization"
import { resolveFlowwrapLayout, type ResolvedFlowwrapLayout } from "../geometry/resolvers/resolveFlowwrapLayout"
import type { FlowwrapSpec } from "../../types/flowwrap"
import { applyIdentityRules, composePack } from "./packComposer"
import type { PackCompositionResult } from "./types"

type FlowwrapValidation = {
  errors: string[]
  warnings?: string[]
}

function validateComposedFlowwrap(spec: FlowwrapSpec): FlowwrapValidation {
  const validate = createPackValidator("flowwrap")
  const result = validate(spec)
  return {
    errors: result.errors,
    warnings: result.warnings ?? []
  }
}

export type ComposedFlowwrapPack = PackCompositionResult<
  FlowwrapSpec,
  FlowwrapGeometry,
  ResolvedFlowwrapLayout,
  FlowwrapValidation
>

export function composeFlowwrapPack(spec: FlowwrapSpec): ComposedFlowwrapPack {
  return composePack({
    packId: "flowwrap",
    spec,
    normalize: normalizeSpec,
    resolveGeometry: resolveFlowwrapGeometry,
    applyRules: applyIdentityRules,
    validate: validateComposedFlowwrap,
    getErrors: validation => validation.errors,
    getWarnings: validation => validation.warnings ?? [],
    resolveLayout: resolvedSpec => resolveFlowwrapLayout(resolvedSpec)
  })
}
