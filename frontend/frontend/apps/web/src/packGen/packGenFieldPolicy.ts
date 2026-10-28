import {
  toEnginePackTypeId,
  type PackSpecificationFieldsV1,
} from "../../../../packages/cutter-engine/project"
import { getMinimumSealClearanceMm } from "../constraints/flowwrap"
import { PARAMETER_DEFAULTS, PARAMETER_ENUMS } from "../core/model/parameterSchema"
import { getPackModule } from "../packs"
import type { FlowwrapSpec } from "../types/flowwrap"

export type PackGenWorkspaceField = keyof PackSpecificationFieldsV1
export type PackGenSubstrate = FlowwrapSpec["substrate"] & string
export type PackGenEyemarkBehaviour = "supported" | "not-applicable"

export type PackGenFieldPolicy = {
  packType?: string
  packLabel?: string
  available: boolean
  visibleFields: readonly PackGenWorkspaceField[]
  optionalFields: readonly PackGenWorkspaceField[]
  minimumCutterFields: readonly PackGenWorkspaceField[]
  notApplicableFields: readonly PackGenWorkspaceField[]
  deterministicDefaults: Partial<Record<PackGenWorkspaceField, string | number | boolean>>
  supportedSubstrates: readonly PackGenSubstrate[]
  eyemarkBehaviour: PackGenEyemarkBehaviour
}

export const PACK_GEN_SUBSTRATES = PARAMETER_ENUMS.substrate.options
export const K_SEAL_PACK_GEN_DEFAULT_TRIM_MM = 10

const ALL_FIELDS = [
  "packType",
  "finishedWidthMm",
  "finishedHeightMm",
  "gussetMm",
  "trimMm",
  "productDescription",
  "fillWeightG",
  "fillVolumeMl",
  "orientation",
  "materialNotes",
  "machineConstraints",
  "openingRequirements",
  "sealTopMm",
  "sealBottomMm",
  "sealLeftMm",
  "sealRightMm",
  "eyemarkCount",
  "eyemarkPosition",
  "zipEnabled",
  "minimumSafeZoneMm",
  "bleedMm",
  "foldsOrGussetNotes",
  "featuresNotes",
] as const satisfies readonly PackGenWorkspaceField[]

const CORE_FIELDS = [
  "packType",
  "finishedWidthMm",
  "finishedHeightMm",
] as const satisfies readonly PackGenWorkspaceField[]

const COMMON_OPTIONAL_FIELDS = [
  "productDescription",
  "fillWeightG",
  "fillVolumeMl",
] as const satisfies readonly PackGenWorkspaceField[]

const sealFields = (spec: FlowwrapSpec): PackGenWorkspaceField[] => {
  const explicitlyDefined = Object.keys(spec.seals ?? {})
  const sides = explicitlyDefined.length > 0
    ? explicitlyDefined
    : ["top", "bottom", "left", "right"]
  return sides.map((side) => `seal${side[0].toUpperCase()}${side.slice(1)}Mm` as PackGenWorkspaceField)
}

const packSpecificOptionalFields = (spec: FlowwrapSpec): PackGenWorkspaceField[] => {
  if (spec.doyPouch || spec.kSealPouch) {
    return [
      "gussetMm",
      ...(spec.kSealPouch ? ["trimMm" as const] : []),
      ...(spec.doyPouch ? ["zipEnabled" as const] : []),
      "openingRequirements",
      "featuresNotes",
    ]
  }
  if (spec.sideSealPouch) return ["trimMm", "openingRequirements", "featuresNotes"]
  if (spec.sachet) return ["openingRequirements", "featuresNotes"]
  return []
}

const resolvedSeal = (spec: FlowwrapSpec, side: "top" | "bottom" | "left" | "right") => (
  spec.seals?.[side] ?? spec.seal
)

export function normalizePackGenSubstrate(value: unknown): PackGenSubstrate {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : ""
  if (normalized === "white" || normalized.includes("white")) return "white"
  if (normalized === "paper" || normalized.includes("paper")) return "paper"
  return PARAMETER_ENUMS.substrate.default
}

export function getPackGenFieldPolicy(packType?: string): PackGenFieldPolicy {
  const module = packType ? getPackModule(toEnginePackTypeId(packType)) : undefined
  if (!module) {
    return {
      ...(packType ? { packType } : {}),
      available: false,
      visibleFields: [...CORE_FIELDS],
      optionalFields: [],
      minimumCutterFields: [...CORE_FIELDS],
      notApplicableFields: ALL_FIELDS.filter((field) => !CORE_FIELDS.includes(field as typeof CORE_FIELDS[number])),
      deterministicDefaults: {
        materialNotes: PARAMETER_ENUMS.substrate.default,
        eyemarkCount: PARAMETER_DEFAULTS.eyeMarks.count,
        bleedMm: PARAMETER_DEFAULTS.base.bleed,
        minimumSafeZoneMm: PARAMETER_DEFAULTS.base.sealClearance,
      },
      supportedSubstrates: PACK_GEN_SUBSTRATES,
      eyemarkBehaviour: "supported",
    }
  }

  const spec = module.getDefaults() as FlowwrapSpec
  const applicableSealFields = sealFields(spec)
  const eyemarkBehaviour: PackGenEyemarkBehaviour = spec.eyeMarks ? "supported" : "not-applicable"
  const packSpecific = packSpecificOptionalFields(spec)
  const optionalFields: PackGenWorkspaceField[] = [
    ...COMMON_OPTIONAL_FIELDS,
    "materialNotes",
    ...applicableSealFields,
    ...(eyemarkBehaviour === "supported" ? ["eyemarkCount" as const] : []),
    "minimumSafeZoneMm",
    "bleedMm",
    ...packSpecific,
  ]
  const visibleFields = [...CORE_FIELDS, ...optionalFields]
  const gussetDefault = spec.kSealPouch?.gussetSize
    ?? spec.kSealPouch?.gussetDepth
    ?? spec.doyPouch?.gussetDepth
  const finishedWidthMm = spec.lidding?.outerCutWidth ?? spec.kSealPouch?.pouchWidth ?? (spec.doyPouch ? spec.height : spec.width)
  const finishedHeightMm = spec.lidding?.outerCutHeight ?? spec.kSealPouch?.pouchHeight ?? (spec.doyPouch ? (spec.width - spec.doyPouch.panelWidths.center) / 2 : spec.height)

  return {
    packType: module.id,
    packLabel: module.name,
    available: true,
    visibleFields,
    optionalFields,
    minimumCutterFields: [...CORE_FIELDS],
    notApplicableFields: ALL_FIELDS.filter((field) => !visibleFields.includes(field)),
    deterministicDefaults: {
      packType: module.id,
      finishedWidthMm,
      finishedHeightMm,
      sealTopMm: resolvedSeal(spec, "top"),
      sealBottomMm: resolvedSeal(spec, "bottom"),
      sealLeftMm: resolvedSeal(spec, "left"),
      sealRightMm: resolvedSeal(spec, "right"),
      materialNotes: normalizePackGenSubstrate(spec.substrate),
      eyemarkCount: eyemarkBehaviour === "supported"
        ? (spec.sideSealPouch || module.id === "plain-film" ? spec.eyeMarks!.count : PARAMETER_DEFAULTS.eyeMarks.count)
        : 0,
      ...(spec.doyPouch ? { zipEnabled: spec.doyPouch.showZipper !== false } : {}),
      bleedMm: spec.bleed ?? PARAMETER_DEFAULTS.base.bleed,
      minimumSafeZoneMm: Math.max(
        spec.sealClearance ?? spec.sachet?.safeZoneBuffer ?? (spec.doyPouch || spec.kSealPouch ? 3 : getMinimumSealClearanceMm(spec, module.id)),
        getMinimumSealClearanceMm(spec, module.id),
      ),
      ...(gussetDefault === undefined ? {} : { gussetMm: gussetDefault }),
      ...(spec.kSealPouch ? { trimMm: K_SEAL_PACK_GEN_DEFAULT_TRIM_MM } : {}),
      ...(spec.sideSealPouch ? { trimMm: spec.sideSealPouch.trimWidth } : {}),
    },
    supportedSubstrates: PACK_GEN_SUBSTRATES,
    eyemarkBehaviour,
  }
}
