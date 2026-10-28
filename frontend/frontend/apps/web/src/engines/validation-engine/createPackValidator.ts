import { validateFlowwrapSpec } from "../../constraints/flowwrap"
import { validatePaperStripSpec } from "../../constraints/paperStrip"
import type { PackValidationResult } from "../../packs/packModule"
import type { FlowwrapSpec } from "../../types/flowwrap"
import { validateKSealSpec } from "./validateKSealSpec"
import { validatePlainWebSpec } from "./validatePlainWebSpec"
import { validateLiddingSpec } from "../../constraints/lidding"
import { getSachetStepSpec, sachetStepIds } from "../../../../../packages/cutter-engine/actions/sachetSteps"

type PackValidator = (spec: FlowwrapSpec) => PackValidationResult

const validateFlowwrapPack: PackValidator = spec => {
  const result = validateFlowwrapSpec(spec)
  return { errors: result.errors, warnings: result.warnings }
}

const validateKSealPack: PackValidator = spec => {
  return validateKSealSpec(spec)
}

const validatePlainWebPack: PackValidator = spec => {
  return validatePlainWebSpec(spec)
}

const validatePaperStripPack: PackValidator = spec => {
  return validatePaperStripSpec(spec)
}

export function createPackValidator(packId: string): PackValidator {
  switch (packId) {
    case "lidding":
      return validateLiddingSpec
    case "k-seal-pouch":
      return validateKSealPack
    case "plain-web":
    case "plain-film":
      return validatePlainWebPack
    case "paper-strip":
      return validatePaperStripPack
    case "sachet-4-side-seal":
    case "sachet-3-side-seal":
    case "2-side-seal-pouch":
    case "3-side-seal-pouch":
      return spec => {
        const errors:string[]=[],warnings:string[]=[]
        if (packId === "sachet-3-side-seal") {
          const count = spec.eyeMarks?.count ?? 0
          const trimPosition = spec.sachet?.trimPosition ?? spec.sachet?.trackSide ?? "left"
          const validCount = trimPosition === "both" ? count === 1 || count === 2 : count === 1
          if (!validCount) {
            errors.push(trimPosition === "both"
              ? "3-side sachet with Both trim requires one or two eyemarks."
              : "3-side sachet with Left or Right trim requires exactly one eyemark.")
          }
        }
        for(const id of sachetStepIds(spec)){
          const result=validateFlowwrapSpec(getSachetStepSpec(spec,id))
          errors.push(...result.errors.map(message=>`Cutter ${id}: ${message}`))
          warnings.push(...(result.warnings??[]).map(message=>`Cutter ${id}: ${message}`))
        }
        return {errors,warnings}
      }
    case "flowwrap":
    case "doy-pouch":
    default:
      return validateFlowwrapPack
    case "pillow-pack":
      return spec => {const result=validateFlowwrapSpec(spec,"pillow-pack");return {errors:result.errors,warnings:result.warnings}}
  }
}
