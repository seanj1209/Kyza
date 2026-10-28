import { createPackValidator } from "../../engines/validation-engine"
import {
  resolveFlowwrapGeometry,
  type FlowwrapGeometry
} from "../../geometry/flowwrapGeometry"
import type { FlowwrapSpec } from "../../types/flowwrap"
import {
  resolvePlainWebLayout,
  type ResolvedPlainWebLayout
} from "../geometry/resolvers/resolvePlainWebLayout"
import { normalizeSpec } from "../model/normalization"
import { applyIdentityRules, composePack } from "./packComposer"
import type { PackCompositionResult } from "./types"

type PlainWebValidation = {
  errors: string[]
  warnings?: string[]
}

function validateComposedPlainWeb(spec: FlowwrapSpec): PlainWebValidation {
  const validate = createPackValidator("plain-web")
  const result = validate(spec)
  return {
    errors: result.errors,
    warnings: result.warnings ?? []
  }
}

export type ComposedPlainWebPack = PackCompositionResult<
  FlowwrapSpec,
  FlowwrapGeometry,
  ResolvedPlainWebLayout,
  PlainWebValidation
>

export function composePlainWebPack(spec: FlowwrapSpec): ComposedPlainWebPack {
  return composePack({
    packId: "plain-web",
    spec,
    normalize: normalizeSpec,
    resolveGeometry: resolveFlowwrapGeometry,
    applyRules: applyIdentityRules,
    validate: validateComposedPlainWeb,
    getErrors: validation => validation.errors,
    getWarnings: validation => validation.warnings ?? [],
    resolveLayout: (resolvedSpec, geometry) =>
      resolvePlainWebLayout(resolvedSpec, geometry)
  })
}
