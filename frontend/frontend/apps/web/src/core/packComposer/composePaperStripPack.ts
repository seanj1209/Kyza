import { createPackValidator } from "../../engines/validation-engine"
import {
  resolveFlowwrapGeometry,
  type FlowwrapGeometry
} from "../../geometry/flowwrapGeometry"
import type { FlowwrapSpec } from "../../types/flowwrap"
import {
  resolvePaperStripLayout,
  type ResolvedPaperStripLayout
} from "../geometry/resolvers/resolvePaperStripLayout"
import { normalizePaperStripSpec } from "../model/paperStripNormalization"
import { applyIdentityRules, composePack } from "./packComposer"
import type { PackCompositionResult } from "./types"

type PaperStripValidation = {
  errors: string[]
  warnings?: string[]
}

function validateComposedPaperStrip(spec: FlowwrapSpec): PaperStripValidation {
  const validate = createPackValidator("paper-strip")
  const result = validate(spec)
  return {
    errors: result.errors,
    warnings: result.warnings ?? []
  }
}

export type ComposedPaperStripPack = PackCompositionResult<
  FlowwrapSpec,
  FlowwrapGeometry,
  ResolvedPaperStripLayout,
  PaperStripValidation
>

export function composePaperStripPack(spec: FlowwrapSpec): ComposedPaperStripPack {
  return composePack({
    packId: "paper-strip",
    spec,
    normalize: normalizePaperStripSpec,
    resolveGeometry: resolveFlowwrapGeometry,
    applyRules: applyIdentityRules,
    validate: validateComposedPaperStrip,
    getErrors: validation => validation.errors,
    getWarnings: validation => validation.warnings ?? [],
    resolveLayout: (resolvedSpec, geometry) =>
      resolvePaperStripLayout(resolvedSpec, geometry)
  })
}
