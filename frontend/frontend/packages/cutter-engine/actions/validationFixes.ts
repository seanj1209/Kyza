import type { FlowwrapSpec } from "../../../apps/web/src/types/flowwrap"
import {
  applyKSealEyemarkCentreFix,
  applyKSealEyemarkSizeFix,
  fitKSealDualEyemarksToTrim
} from "../../../apps/web/src/rules/kSealEyemarkRules"
import { centreKSealTacHoles } from "../../../apps/web/src/rules/kSealTacHoleRules"
import { resolveKSealPouchGeometry } from "../../../apps/web/src/geometry/kSealPouchGeometry"

export type CutterValidationFixId =
  | "kseal-eyemark-size"
  | "kseal-fit-dual-eyemarks-to-trim"
  | "kseal-eyemark-centre"
  | "kseal-tac-centre"

export const applyCutterValidationFix = (
  spec: FlowwrapSpec,
  fixId: string
): FlowwrapSpec => {
  if (!spec.kSealPouch) {
    return spec
  }
  if (fixId === "kseal-tac-centre") {
    return centreKSealTacHoles(spec)
  }
  if (!spec.eyeMarks) {
    return spec
  }
  const trimWidth = resolveKSealPouchGeometry(spec).trimWidth
  if (fixId === "kseal-eyemark-size") {
    return {
      ...spec,
      eyeMarks: applyKSealEyemarkSizeFix(spec.eyeMarks, trimWidth)
    }
  }
  if (fixId === "kseal-fit-dual-eyemarks-to-trim") {
    return {
      ...spec,
      eyeMarks: fitKSealDualEyemarksToTrim(spec.eyeMarks, trimWidth)
    }
  }
  if (fixId === "kseal-eyemark-centre") {
    return {
      ...spec,
      eyeMarks: applyKSealEyemarkCentreFix(spec.eyeMarks, trimWidth)
    }
  }
  return spec
}
