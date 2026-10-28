import { createPackValidator } from "../../engines/validation-engine"
import {
  resolveKSealPouchGeometry,
  type KSealPouchGeometry
} from "../../geometry/kSealPouchGeometry"
import type { FlowwrapSpec } from "../../types/flowwrap"
import {
  resolveKSealLayout,
  type ResolvedKSealLayout
} from "../geometry/resolvers/resolveKSealLayout"
import { normalizeSpec } from "../model/normalization"
import { applyIdentityRules, composePack } from "./packComposer"
import type { PackCompositionResult } from "./types"

type KSealValidation = {
  errors: string[]
  warnings?: string[]
}

function validateComposedKSeal(spec: FlowwrapSpec): KSealValidation {
  const validate = createPackValidator("k-seal-pouch")
  const result = validate(spec)
  return {
    errors: result.errors,
    warnings: result.warnings ?? []
  }
}

export type ComposedKSealPack = PackCompositionResult<
  FlowwrapSpec,
  KSealPouchGeometry,
  ResolvedKSealLayout,
  KSealValidation
>

export function composeKSealPack(spec: FlowwrapSpec): ComposedKSealPack {
  return composePack({
    packId: "k-seal-pouch",
    spec,
    normalize: normalizeSpec,
    resolveGeometry: resolveKSealPouchGeometry,
    applyRules: applyIdentityRules,
    validate: validateComposedKSeal,
    getErrors: validation => validation.errors,
    getWarnings: validation => validation.warnings ?? [],
    resolveLayout: resolvedSpec => resolveKSealLayout(resolvedSpec)
  })
}
