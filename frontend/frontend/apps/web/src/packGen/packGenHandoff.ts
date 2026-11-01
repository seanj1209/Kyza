import { setOpeningStyle } from "../../../../packages/cutter-engine/actions/openingStyle"
import { runPackGenerateRequest } from "../../../../packages/engine-api/runPackGenerateRequest"
import { getMinimumSealClearanceMm } from "../constraints/flowwrap"
import { PARAMETER_ENUMS } from "../core/model/parameterSchema"
import {
  resolveKSealPouchSettings,
  toKSealComposerDimensions,
} from "../geometry/kSealPouchGeometry"
import { getPackModule } from "../packs"
import { createKSealEyemarkDefaults } from "../rules/kSealEyemarkRules"
import { doyCutterWidth } from "../core/geometry/resolvers/doyBounds"
import { syncLiddingCutterSize, updateLiddingSpec } from "../constraints/lidding"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { EyeMarkPositionOne, EyeMarkPositionTwo, EyeMarkSpec } from "../types/eyeMarks"

export type PackGenCutterSpecificationInputs = {
  packType: string
  finishedWidthMm: number
  finishedHeightMm: number
  sealTopMm: number
  sealBottomMm: number
  sealLeftMm: number
  sealRightMm: number
  bleedMm: number
  eyemarkCount: 0 | 1 | 2
  eyemarkPosition?: string
  zipEnabled: boolean
  minimumSafeZoneMm: number
  substrate: NonNullable<FlowwrapSpec["substrate"]>
  gussetMm?: number
  trimMm?: number
}

export type PackGenCutterSpecResult =
  | { ok: true; packType: string; spec: FlowwrapSpec; unsupportedMappings: string[] }
  | { ok: false; errors: string[] }

const cloneSpec = (spec: FlowwrapSpec) => JSON.parse(JSON.stringify(spec)) as FlowwrapSpec

const SINGLE_EYEMARK_POSITIONS = new Set<string>(PARAMETER_ENUMS.eyeMarkPositionSingle.options)
const DOUBLE_EYEMARK_POSITIONS = new Set<string>(PARAMETER_ENUMS.eyeMarkPositionDouble.options)

const singlePositionFor = (position: EyeMarkSpec["position"]): EyeMarkPositionOne => {
  if (SINGLE_EYEMARK_POSITIONS.has(position)) return position as EyeMarkPositionOne
  if (position === "top") return "top-left"
  if (position === "bottom") return "bottom-left"
  if (position === "centre") return "centre"
  return PARAMETER_ENUMS.eyeMarkPositionSingle.default
}

const doublePositionFor = (position: EyeMarkSpec["position"]): EyeMarkPositionTwo => {
  if (DOUBLE_EYEMARK_POSITIONS.has(position)) return position as EyeMarkPositionTwo
  if (position.startsWith("bottom")) return "bottom"
  if (position.startsWith("centre")) return "centre"
  return PARAMETER_ENUMS.eyeMarkPositionDouble.default
}

export function normalizePackGenEyeMarks(
  moduleDefaults: EyeMarkSpec,
  count: 0 | 1 | 2,
): EyeMarkSpec {
  const primary = {
    width: moduleDefaults.width,
    height: moduleDefaults.height,
    color: moduleDefaults.color,
  }
  if (count === 0) {
    return {
      ...primary,
      count,
      position: singlePositionFor(moduleDefaults.position),
    }
  }
  if (count === 1) {
    return {
      ...primary,
      count,
      position: singlePositionFor(moduleDefaults.position),
      ...(moduleDefaults.offsetX === undefined ? {} : { offsetX: moduleDefaults.offsetX }),
      ...(moduleDefaults.offsetY === undefined ? {} : { offsetY: moduleDefaults.offsetY }),
      ...(moduleDefaults.manualPositioned === undefined
        ? {}
        : { manualPositioned: moduleDefaults.manualPositioned }),
    }
  }
  return {
    ...primary,
    count,
    position: doublePositionFor(moduleDefaults.position),
    width2: moduleDefaults.width2 ?? moduleDefaults.width,
    height2: moduleDefaults.height2 ?? moduleDefaults.height,
    ...(moduleDefaults.offsetX === undefined ? {} : { offsetX: moduleDefaults.offsetX }),
    ...(moduleDefaults.offsetY === undefined ? {} : { offsetY: moduleDefaults.offsetY }),
    ...(moduleDefaults.offsetX2 === undefined ? {} : { offsetX2: moduleDefaults.offsetX2 }),
    ...(moduleDefaults.offsetY2 === undefined ? {} : { offsetY2: moduleDefaults.offsetY2 }),
    ...(moduleDefaults.manualPositioned === undefined
      ? {}
      : { manualPositioned: moduleDefaults.manualPositioned }),
    ...(moduleDefaults.manualPositioned2 === undefined
      ? {}
      : { manualPositioned2: moduleDefaults.manualPositioned2 }),
  }
}

export function getKyzaTechPackSpecificationDefaults(packType: string, projectId: string) {
  const generated = runPackGenerateRequest({
    requestId: `pack-gen-defaults-${projectId}`,
    projectId,
    engine: "pack-generator",
    action: "generatePack",
    payload: { packId: packType },
    meta: { source: "pack-gen-specification-defaults" },
  })
  const spec = generated.updatedState?.spec
  if (!generated.success || !spec) return null
  return {
    minimumSafeZoneMm: Math.max(
      spec.sealClearance ?? spec.sachet?.safeZoneBuffer ?? (spec.doyPouch || spec.kSealPouch ? 3 : getMinimumSealClearanceMm(spec, packType)),
      getMinimumSealClearanceMm(spec, packType),
    ),
  }
}

export function createCutterSpecFromConfirmedPackValues(
  values: PackGenCutterSpecificationInputs,
  projectId: string,
): PackGenCutterSpecResult {
  const generated = runPackGenerateRequest({
    requestId: `pack-gen-cutter-${projectId}`,
    projectId,
    engine: "pack-generator",
    action: "generatePack",
    payload: { packId: values.packType },
    meta: { source: "pack-gen-confirmed-specification" },
  })
  const output = generated.updatedState
  if (!generated.success || !output?.spec || !output.packId) {
    return {
      ok: false,
      errors: generated.errors.map((error) => error.message).concat(
        generated.errors.length === 0
          ? ["Kyza Tech could not create a deterministic Cutter for this pack type."]
          : [],
      ),
    }
  }

  let spec = cloneSpec(output.spec)
  spec.width = spec.doyPouch && !spec.kSealPouch
    ? doyCutterWidth(values.finishedHeightMm, spec.doyPouch.panelWidths.center)
    : spec.kSealPouch ? spec.width : values.finishedWidthMm
  spec.height = spec.doyPouch || spec.kSealPouch ? values.finishedWidthMm : values.finishedHeightMm
  if (spec.kSealPouch) {
    spec.kSealPouch = {
      ...spec.kSealPouch,
      ...toKSealComposerDimensions(values),
      ...(values.trimMm === undefined ? {} : { trimEnabled: true, trim: values.trimMm }),
    }
  }
  if (spec.sideSealPouch) {
    const trimWidth = values.trimMm ?? spec.sideSealPouch.trimWidth
    spec.sideSealPouch = { ...spec.sideSealPouch, trimEnabled: values.eyemarkCount > 0, trimWidth }
    spec.sachet = { ...spec.sachet, trimPosition: "both", trimWidth }
  }
  const suppliedSeals = {
    top: values.sealTopMm,
    bottom: values.sealBottomMm,
    left: values.sealLeftMm,
    right: values.sealRightMm,
  }
  const explicitSealSides = Object.keys(spec.seals ?? {}) as Array<keyof typeof suppliedSeals>
  const applicableSealSides = explicitSealSides.length > 0
    ? explicitSealSides
    : Object.keys(suppliedSeals) as Array<keyof typeof suppliedSeals>
  spec.seals = Object.fromEntries(
    applicableSealSides.map((side) => [side, suppliedSeals[side]]),
  )
  // DOY side seals are intentionally absent by default. Its top/bottom seal
  // must still define the base seal instead of averaging two zero side bands.
  spec.seal = spec.doyPouch
    ? (values.sealTopMm + values.sealBottomMm) / 2
    : applicableSealSides.reduce((total, side) => total + suppliedSeals[side], 0) / applicableSealSides.length
  spec.bleed = values.bleedMm
  spec.substrate = values.substrate
  if (spec.doyPouch) {
    spec = setOpeningStyle(spec, "zip", values.zipEnabled)
  } else if (values.zipEnabled) {
    return {
      ok: false,
      errors: ["The selected pack type does not support reclosable zip geometry."],
    }
  }
  if (spec.eyeMarks) {
    spec.eyeMarks = normalizePackGenEyeMarks(spec.eyeMarks, values.eyemarkCount)
    if (spec.kSealPouch && values.eyemarkCount > 0) {
      spec.eyeMarks = {
        ...spec.eyeMarks,
        ...createKSealEyemarkDefaults(
          values.eyemarkCount === 2 ? 2 : 1,
          resolveKSealPouchSettings(spec).trimWidth,
        ),
      }
    }
    // Prompted spatial intent is applied after pack defaults, while still
    // remaining inside the deterministic one-eyemark position set.
    if (values.eyemarkPosition && values.eyemarkCount === 1 && ["top-left", "top-right", "bottom-left", "bottom-right", "centre-left", "centre-right", "centre"].includes(values.eyemarkPosition)) {
      spec.eyeMarks = { ...spec.eyeMarks, position: values.eyemarkPosition as EyeMarkPositionOne }
    }
  } else if (values.eyemarkCount > 0) {
    return {
      ok: false,
      errors: ["The selected deterministic pack service cannot map eyemark requirements yet."],
    }
  }
  spec.sealClearance = values.minimumSafeZoneMm
  if (spec.sachet) {
    spec.sachet = { ...spec.sachet, safeZoneBuffer: values.minimumSafeZoneMm }
  }
  if (values.gussetMm !== undefined) {
    if (spec.kSealPouch) {
      spec.kSealPouch = {
        ...spec.kSealPouch,
        gussetSize: values.gussetMm,
        gussetDepth: values.gussetMm,
      }
    } else if (spec.doyPouch) {
      spec.doyPouch = { ...spec.doyPouch, gussetDepth: values.gussetMm }
    } else {
      return { ok: false, errors: ["The selected pack module does not support a gusset input."] }
    }
  }
  if (spec.kSealPouch) {
    const resolved = resolveKSealPouchSettings(spec)
    spec.width = resolved.renderedWidth
    spec.height = resolved.renderedHeight
  }
  if (spec.lidding) {
    spec = syncLiddingCutterSize(updateLiddingSpec(spec, {
      outerCutWidth: values.finishedWidthMm,
      outerCutHeight: spec.lidding.style === "round" ? values.finishedWidthMm : values.finishedHeightMm,
    }))
  }

  const packModule = getPackModule(output.packId)
  if (!packModule) return { ok: false, errors: ["The selected pack type is not supported."] }
  const validation = packModule.validate(spec)
  if (validation.errors.length > 0) {
    return { ok: false, errors: validation.errors }
  }

  return {
    ok: true,
    packType: output.packId,
    spec,
    unsupportedMappings: [],
  }
}
