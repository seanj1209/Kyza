import { createPackValidator } from "../../engines/validation-engine"
import {
  resolveFlowwrapGeometry,
  type FlowwrapGeometry
} from "../../geometry/flowwrapGeometry"
import type { FlowwrapSpec } from "../../types/flowwrap"
import {
  resolveSachetLayout,
  type ResolvedSachetLayout
} from "../geometry/resolvers/resolveSachetLayout"
import { normalizeSpec } from "../model/normalization"
import { applyIdentityRules, composePack } from "./packComposer"
import type { PackCompositionResult } from "./types"

type SachetValidation = {
  errors: string[]
  warnings?: string[]
}

function validateComposedSachet(
  packId: string,
  spec: FlowwrapSpec
): SachetValidation {
  const validate = createPackValidator(packId)
  const result = validate(spec)
  return {
    errors: result.errors,
    warnings: result.warnings ?? []
  }
}

export type ComposedSachetPack = PackCompositionResult<
  FlowwrapSpec,
  FlowwrapGeometry,
  ResolvedSachetLayout,
  SachetValidation
>

export function composeSachetPack(
  packId: "sachet-3-side-seal" | "sachet-4-side-seal" | "2-side-seal-pouch" | "3-side-seal-pouch",
  spec: FlowwrapSpec
): ComposedSachetPack {
  return composePack({
    packId,
    spec,
    normalize: normalizeSpec,
    resolveGeometry: resolveFlowwrapGeometry,
    applyRules: applyIdentityRules,
    validate: resolvedSpec => validateComposedSachet(packId, resolvedSpec),
    getErrors: validation => validation.errors,
    getWarnings: validation => validation.warnings ?? [],
    resolveLayout: resolvedSpec => resolveSachetLayout(resolvedSpec)
  })
}
