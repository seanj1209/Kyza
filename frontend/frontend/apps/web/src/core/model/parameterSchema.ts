import type {
  DoyPouchSpec,
  KSealPouchSpec,
  SachetSpec
} from "../../types/flowwrap"
import type {
  EyeMarkColor,
  EyeMarkPositionOne,
  EyeMarkPositionTwo,
  EyeMarkSpec
} from "../../types/eyeMarks"
import {
  clampNumber,
  ensureFinite,
  normalizeSpec
} from "./normalization"

export type NumericConstraint = Readonly<{
  min: number
  max: number
}>

export type NumericParameterDefinition = NumericConstraint & Readonly<{
  default: number
}>

export type BooleanParameterDefinition = Readonly<{
  default: boolean
}>

export type EnumParameterDefinition<T extends string> = Readonly<{
  default: T
  options: readonly T[]
}>

export type NumericParameterGroup = Record<string, NumericParameterDefinition>

export const PARAMETER_DEFAULTS = {
  base: {
    width: 460,
    height: 200,
    seal: 20,
    bleed: 3,
    sealClearance: 5
  },
  seals: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10
  },
  eyeMarks: {
    count: 1,
    width: 10,
    height: 5,
    width2: 10,
    height2: 5,
    offsetX: 0,
    offsetY: 0
  },
  doy: {
    sideBleed: 45,
    bottomSeal: 7.5,
    gripSeal: 10,
    centerWidth: 80,
    ovalWidth: 80,
    ovalOffsetX: 0,
    centerOffsetX: 0,
    arcOffsetX: 0,
    gussetDepth: 83,
    trim: 15
  },
  zipper: {
    offsetX: 60,
    offsetY: 14,
    width: 10,
    height: 2,
    stopWidth: 8,
    jawGap: 2
  },
  tearNotch: {
    offsetX: 35,
    offsetY: 0,
    width: 6,
    depth: 3
  },
  kSeal: {
    pouchHeight: 200,
    pouchWidth: 190,
    sideSeal: 7.5,
    trim: 15,
    bottomSeal: 7.5,
    gussetSize: 40,
    armDegree: 45,
    armWidth: 7.5,
    sealWidth: 10,
    gussetDepth: 40,
    topApexY: 10,
    bottomApexY: 190,
    gussetDepthRatio: 0.5,
    centerOffsetX: 0,
    midSectionWidthRatio: 83 / 480,
    shoulderHeightRatio: 23 / 205,
    sideGuideOffset: 10
  },
  sachet: {
    trackWidth: 5,
    rightTrim: 0,
    stepCount: 1,
    safeZoneBuffer: 2,
    tearNotchOffsetX: 6,
    tearNotchWidth: 6,
    tearNotchDepth: 3
  }
} as const

export const PARAMETER_CONSTRAINTS = {
  base: {
    width: { min: 1, max: Number.POSITIVE_INFINITY },
    height: { min: 1, max: Number.POSITIVE_INFINITY },
    seal: { min: 1, max: Number.POSITIVE_INFINITY },
    bleed: { min: 0, max: Number.POSITIVE_INFINITY },
    sealClearance: { min: 0, max: Number.POSITIVE_INFINITY }
  },
  seals: {
    top: { min: 0, max: Number.POSITIVE_INFINITY },
    bottom: { min: 0, max: Number.POSITIVE_INFINITY },
    left: { min: 0, max: Number.POSITIVE_INFINITY },
    right: { min: 0, max: Number.POSITIVE_INFINITY }
  },
  eyeMarks: {
    count: { min: 1, max: 2 },
    width: { min: 1, max: Number.POSITIVE_INFINITY },
    height: { min: 1, max: Number.POSITIVE_INFINITY },
    width2: { min: 1, max: Number.POSITIVE_INFINITY },
    height2: { min: 1, max: Number.POSITIVE_INFINITY },
    offsetX: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
    offsetY: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY }
  },
  doy: {
    sideBleed: { min: 0, max: Number.POSITIVE_INFINITY },
    gripSeal: { min: 0, max: Number.POSITIVE_INFINITY },
    centerWidth: { min: 10, max: Number.POSITIVE_INFINITY },
    ovalWidth: { min: 0, max: Number.POSITIVE_INFINITY },
    ovalOffsetX: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
    centerOffsetX: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
    arcOffsetX: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
    gussetDepth: { min: 0, max: Number.POSITIVE_INFINITY },
    trim: { min: 5, max: 25 }
  },
  zipper: {
    offsetX: { min: 0, max: Number.POSITIVE_INFINITY },
    offsetY: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
    width: { min: 1, max: Number.POSITIVE_INFINITY },
    height: { min: 1, max: Number.POSITIVE_INFINITY },
    stopWidth: { min: 0, max: Number.POSITIVE_INFINITY },
    jawGap: { min: 0, max: Number.POSITIVE_INFINITY }
  },
  tearNotch: {
    offsetX: { min: 0, max: Number.POSITIVE_INFINITY },
    offsetY: { min: 0, max: Number.POSITIVE_INFINITY },
    width: { min: 1, max: Number.POSITIVE_INFINITY },
    depth: { min: 1, max: Number.POSITIVE_INFINITY }
  },
  kSeal: {
    pouchHeight: { min: 1, max: Number.POSITIVE_INFINITY },
    pouchWidth: { min: 1, max: Number.POSITIVE_INFINITY },
    sideSeal: { min: 5, max: 20 },
    trim: { min: 5, max: 25 },
    bottomSeal: { min: 0.1, max: Number.POSITIVE_INFINITY },
    gussetSize: { min: 0, max: Number.POSITIVE_INFINITY },
    armDegree: { min: 30, max: 60 },
    armWidth: { min: 5, max: 20 },
    sealWidth: { min: 0, max: Number.POSITIVE_INFINITY },
    gussetDepth: { min: 0, max: Number.POSITIVE_INFINITY },
    topApexY: { min: 0, max: Number.POSITIVE_INFINITY },
    bottomApexY: { min: 0, max: Number.POSITIVE_INFINITY },
    gussetDepthRatio: { min: 0, max: Number.POSITIVE_INFINITY },
    centerOffsetX: { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
    midSectionWidthRatio: { min: 0, max: 1 },
    shoulderHeightRatio: { min: 0, max: 1 },
    sideGuideOffset: { min: 0, max: Number.POSITIVE_INFINITY }
  },
  sachet: {
    trackWidth: { min: 0, max: Number.POSITIVE_INFINITY },
    rightTrim: { min: 0, max: Number.POSITIVE_INFINITY },
    stepCount: { min: 1, max: Number.POSITIVE_INFINITY },
    safeZoneBuffer: { min: 0, max: Number.POSITIVE_INFINITY },
    tearNotchOffsetX: { min: 0, max: Number.POSITIVE_INFINITY },
    tearNotchWidth: { min: 1, max: Number.POSITIVE_INFINITY },
    tearNotchDepth: { min: 1, max: Number.POSITIVE_INFINITY }
  }
} as const

export const PARAMETER_ENUMS = {
  substrate: {
    default: "clear",
    options: ["clear", "white", "paper", "white-paper", "black-paper"]
  },
  eyeMarkColor: {
    default: "black",
    options: ["black", "white", "dark-blue"]
  },
  eyeMarkPositionSingle: {
    default: "top-right",
    options: [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "centre",
      "centre-left",
      "centre-right"
    ]
  },
  eyeMarkPositionDouble: {
    default: "top",
    options: ["top", "bottom", "centre"]
  },
  sachetTrackSide: {
    default: "left",
    options: ["left", "right"]
  },
  sachetTearNotchStyle: {
    default: "triangle",
    options: ["triangle", "halfmoon", "jagged"]
  }
} as const satisfies Record<string, EnumParameterDefinition<string>>

export const PARAMETER_TOGGLES = {
  doy: {
    showGusset: { default: true },
    showCenterBox: { default: true },
    showOval: { default: true },
    showGripSeal: { default: false },
    showZipper: { default: false },
    showTearNotch: { default: false },
    trimEnabled: { default: false }
  },
  kSeal: {
    trimEnabled: { default: false },
    customArmDegreeEnabled: { default: true }
  },
  sachet: {
    stepEnabled: { default: false },
    stepPair: { default: false },
    showOverallMeasure: { default: true },
    showTrackMeasure: { default: true },
    showLaneLabels: { default: false },
    tearNotchEnabled: { default: false }
  }
} as const satisfies Record<string, Record<string, BooleanParameterDefinition>>

export { clampNumber, ensureFinite, normalizeSpec }

export function normalizeNumber(
  value: number | null | undefined,
  definition: NumericParameterDefinition
) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return definition.default
  }
  return clampNumber(ensureFinite(value, definition.default), definition)
}

export function createNumericDefinitions<TGroup extends NumericParameterGroup>(
  defaults: TGroup,
  constraints: { [K in keyof TGroup]: NumericConstraint }
): { [K in keyof TGroup]: NumericParameterDefinition } {
  const entries = Object.keys(defaults).map(key => {
    const typedKey = key as keyof TGroup
    return [
      typedKey,
      {
        default: defaults[typedKey].default,
        min: constraints[typedKey].min,
        max: constraints[typedKey].max
      }
    ]
  })
  return Object.fromEntries(entries) as { [K in keyof TGroup]: NumericParameterDefinition }
}

export function normalizeNumericGroup<
  TValues extends Record<string, number | null | undefined>,
  TDefinitions extends Record<string, NumericParameterDefinition>
>(values: TValues, definitions: TDefinitions) {
  const entries = Object.keys(definitions).map(key => {
    const typedKey = key as keyof TDefinitions & keyof TValues
    return [typedKey, normalizeNumber(values[typedKey], definitions[typedKey])]
  })
  return Object.fromEntries(entries) as {
    [K in keyof TDefinitions]: number
  }
}

export const BASE_PARAMETER_DEFINITIONS = {
  width: { default: PARAMETER_DEFAULTS.base.width, ...PARAMETER_CONSTRAINTS.base.width },
  height: { default: PARAMETER_DEFAULTS.base.height, ...PARAMETER_CONSTRAINTS.base.height },
  seal: { default: PARAMETER_DEFAULTS.base.seal, ...PARAMETER_CONSTRAINTS.base.seal },
  bleed: { default: PARAMETER_DEFAULTS.base.bleed, ...PARAMETER_CONSTRAINTS.base.bleed },
  sealClearance: {
    default: PARAMETER_DEFAULTS.base.sealClearance,
    ...PARAMETER_CONSTRAINTS.base.sealClearance
  }
} as const satisfies Record<string, NumericParameterDefinition>

type BaseSpecDefaults = Readonly<{
  width: number
  height: number
  seal: number
  bleed?: number
  sealClearance?: number
}>

export function createBaseSpecDefaults(
  overrides: Partial<BaseSpecDefaults> = {},
  options: { includeBleed?: boolean; includeSealClearance?: boolean } = {}
): BaseSpecDefaults {
  const includeBleed = options.includeBleed ?? true
  const includeSealClearance = options.includeSealClearance ?? true
  return {
    width: overrides.width ?? PARAMETER_DEFAULTS.base.width,
    height: overrides.height ?? PARAMETER_DEFAULTS.base.height,
    seal: overrides.seal ?? PARAMETER_DEFAULTS.base.seal,
    ...(includeBleed
      ? { bleed: overrides.bleed ?? PARAMETER_DEFAULTS.base.bleed }
      : {}),
    ...(includeSealClearance
      ? {
          sealClearance:
            overrides.sealClearance ?? PARAMETER_DEFAULTS.base.sealClearance
        }
      : {})
  }
}

type EyeMarkOverrides = Partial<EyeMarkSpec> & {
  position?: EyeMarkPositionOne | EyeMarkPositionTwo
  color?: EyeMarkColor
}

export function createEyeMarkDefaults(
  overrides: EyeMarkOverrides = {}
): EyeMarkSpec {
  const count = overrides.count ?? PARAMETER_DEFAULTS.eyeMarks.count
  const width2 =
    overrides.width2 !== undefined
      ? overrides.width2
      : count === 2
        ? PARAMETER_DEFAULTS.eyeMarks.width2
        : undefined
  const height2 =
    overrides.height2 !== undefined
      ? overrides.height2
      : count === 2
        ? PARAMETER_DEFAULTS.eyeMarks.height2
        : undefined
  return {
    count,
    position:
      overrides.position ??
      (PARAMETER_ENUMS.eyeMarkPositionSingle.default as EyeMarkPositionOne),
    width: overrides.width ?? PARAMETER_DEFAULTS.eyeMarks.width,
    height: overrides.height ?? PARAMETER_DEFAULTS.eyeMarks.height,
    ...(width2 !== undefined ? { width2 } : {}),
    ...(height2 !== undefined ? { height2 } : {}),
    color:
      overrides.color ??
      (PARAMETER_ENUMS.eyeMarkColor.default as EyeMarkColor),
    ...(overrides.offsetX !== undefined ? { offsetX: overrides.offsetX } : {}),
    ...(overrides.offsetY !== undefined ? { offsetY: overrides.offsetY } : {}),
    ...(count === 2 && (overrides.offsetY2 ?? overrides.offsetY) !== undefined
      ? { offsetY2: overrides.offsetY2 ?? overrides.offsetY } : {}),
    ...(count === 2 && overrides.offsetX2 !== undefined ? {offsetX2:overrides.offsetX2} : {})
  }
}

export function createDoyPouchDefaults(
  overrides: Partial<DoyPouchSpec> = {}
): DoyPouchSpec {
  return {
    trimEnabled: overrides.trimEnabled ?? PARAMETER_TOGGLES.doy.trimEnabled.default,
    bottomSeal: overrides.bottomSeal ?? PARAMETER_DEFAULTS.doy.bottomSeal,
    trim: overrides.trim ?? PARAMETER_DEFAULTS.doy.trim,
    panelWidths: {
      left: overrides.panelWidths?.left ?? 199,
      center:
        overrides.panelWidths?.center ?? PARAMETER_DEFAULTS.doy.centerWidth,
      right: overrides.panelWidths?.right ?? 199
    },
    sideBleed: overrides.sideBleed ?? PARAMETER_DEFAULTS.doy.sideBleed,
    gripSeal: overrides.gripSeal ?? PARAMETER_DEFAULTS.doy.gripSeal,
    gussetDepth: overrides.gussetDepth ?? PARAMETER_DEFAULTS.doy.gussetDepth,
    showGusset:
      overrides.showGusset ?? PARAMETER_TOGGLES.doy.showGusset.default,
    showCenterBox:
      overrides.showCenterBox ?? PARAMETER_TOGGLES.doy.showCenterBox.default,
    showOval: overrides.showOval ?? PARAMETER_TOGGLES.doy.showOval.default,
    showGripSeal:
      overrides.showGripSeal ?? PARAMETER_TOGGLES.doy.showGripSeal.default,
    zipper: {
      offsetY:
        overrides.zipper?.offsetY ?? PARAMETER_DEFAULTS.zipper.offsetY,
      height: overrides.zipper?.height ?? PARAMETER_DEFAULTS.zipper.height,
      stopWidth:
        overrides.zipper?.stopWidth ?? PARAMETER_DEFAULTS.zipper.stopWidth,
      jawGap: overrides.zipper?.jawGap ?? PARAMETER_DEFAULTS.zipper.jawGap,
      offsetX:
        overrides.zipper?.offsetX ?? PARAMETER_DEFAULTS.zipper.offsetX,
      width: overrides.zipper?.width ?? PARAMETER_DEFAULTS.zipper.width
    },
    showZipper:
      overrides.showZipper ?? PARAMETER_TOGGLES.doy.showZipper.default,
    tearNotch: {
      offsetX:
        overrides.tearNotch?.offsetX ?? PARAMETER_DEFAULTS.tearNotch.offsetX,
      width:
        overrides.tearNotch?.width ?? PARAMETER_DEFAULTS.tearNotch.width,
      depth:
        overrides.tearNotch?.depth ?? PARAMETER_DEFAULTS.tearNotch.depth
    },
    showTearNotch:
      overrides.showTearNotch ?? PARAMETER_TOGGLES.doy.showTearNotch.default,
    ...(overrides.ovalWidth !== undefined
      ? { ovalWidth: overrides.ovalWidth }
      : {}),
    ...(overrides.ovalOffsetX !== undefined
      ? { ovalOffsetX: overrides.ovalOffsetX }
      : {}),
    ...(overrides.centerOffsetX !== undefined
      ? { centerOffsetX: overrides.centerOffsetX }
      : {}),
    ...(overrides.arcOffsetX !== undefined
      ? { arcOffsetX: overrides.arcOffsetX }
      : {}),
    ...(overrides.tearNotch?.offsetY !== undefined
      ? { tearNotch: { ...overrides.tearNotch, offsetX: overrides.tearNotch.offsetX ?? PARAMETER_DEFAULTS.tearNotch.offsetX, width: overrides.tearNotch.width ?? PARAMETER_DEFAULTS.tearNotch.width, depth: overrides.tearNotch.depth ?? PARAMETER_DEFAULTS.tearNotch.depth } }
      : {}),
    ...(overrides.ovalSelected !== undefined
      ? { ovalSelected: overrides.ovalSelected }
      : {}),
    ...(overrides.gussetSelected !== undefined
      ? { gussetSelected: overrides.gussetSelected }
      : {}),
    ...(overrides.centerSelected !== undefined
      ? { centerSelected: overrides.centerSelected }
      : {})
  }
}

export function createKSealDefaults(
  overrides: Partial<KSealPouchSpec> = {}
): KSealPouchSpec {
  const armWidth = Math.min(
    PARAMETER_CONSTRAINTS.kSeal.armWidth.max,
    Math.max(
      PARAMETER_CONSTRAINTS.kSeal.armWidth.min,
      overrides.armWidth ?? PARAMETER_DEFAULTS.kSeal.armWidth
    )
  )

  return {
    pouchHeight:
      overrides.pouchHeight ?? PARAMETER_DEFAULTS.kSeal.pouchHeight,
    pouchWidth:
      overrides.pouchWidth ?? PARAMETER_DEFAULTS.kSeal.pouchWidth,
    sideSeal: overrides.sideSeal ?? PARAMETER_DEFAULTS.kSeal.sideSeal,
    trimEnabled:
      overrides.trimEnabled ??
      PARAMETER_TOGGLES.kSeal.trimEnabled.default,
    trim: overrides.trim ?? PARAMETER_DEFAULTS.kSeal.trim,
    bottomSeal:
      overrides.bottomSeal ?? PARAMETER_DEFAULTS.kSeal.bottomSeal,
    gussetSize:
      overrides.gussetSize ??
      overrides.gussetDepth ??
      PARAMETER_DEFAULTS.kSeal.gussetSize,
    armDegree:
      overrides.armDegree ?? PARAMETER_DEFAULTS.kSeal.armDegree,
    customArmDegreeEnabled:
      overrides.customArmDegreeEnabled ??
      PARAMETER_TOGGLES.kSeal.customArmDegreeEnabled.default,
    armWidth,
    gussetDepth:
      overrides.gussetDepth ??
      overrides.gussetSize ??
      PARAMETER_DEFAULTS.kSeal.gussetDepth,
    sealWidth:
      overrides.sealWidth ??
      overrides.sideSeal ??
      PARAMETER_DEFAULTS.kSeal.sealWidth,
    topApexY: overrides.topApexY ?? PARAMETER_DEFAULTS.kSeal.topApexY,
    bottomApexY:
      overrides.bottomApexY ?? PARAMETER_DEFAULTS.kSeal.bottomApexY,
    centerOffsetX:
      overrides.centerOffsetX ?? PARAMETER_DEFAULTS.kSeal.centerOffsetX,
    midSectionWidthRatio:
      overrides.midSectionWidthRatio ??
      PARAMETER_DEFAULTS.kSeal.midSectionWidthRatio,
    shoulderHeightRatio:
      overrides.shoulderHeightRatio ??
      PARAMETER_DEFAULTS.kSeal.shoulderHeightRatio,
    sideGuideOffset:
      overrides.sideGuideOffset ?? PARAMETER_DEFAULTS.kSeal.sideGuideOffset,
    ...(overrides.gussetDepthRatio !== undefined
      ? { gussetDepthRatio: overrides.gussetDepthRatio }
      : {})
  }
}

export function createSachetDefaults(
  overrides: Partial<SachetSpec> = {}
): SachetSpec {
  return {
    trackSide:
      overrides.trackSide ??
      (PARAMETER_ENUMS.sachetTrackSide.default as SachetSpec["trackSide"]),
    trackWidth: overrides.trackWidth ?? PARAMETER_DEFAULTS.sachet.trackWidth,
    rightTrim: overrides.rightTrim ?? PARAMETER_DEFAULTS.sachet.rightTrim,
    stepEnabled:
      overrides.stepEnabled ?? PARAMETER_TOGGLES.sachet.stepEnabled.default,
    stepCount: overrides.stepCount ?? PARAMETER_DEFAULTS.sachet.stepCount,
    safeZoneBuffer:
      overrides.safeZoneBuffer ?? PARAMETER_DEFAULTS.sachet.safeZoneBuffer,
    tearNotch: {
      enabled:
        overrides.tearNotch?.enabled ??
        PARAMETER_TOGGLES.sachet.tearNotchEnabled.default,
      style:
        overrides.tearNotch?.style ??
        (PARAMETER_ENUMS.sachetTearNotchStyle.default as NonNullable<
          SachetSpec["tearNotch"]
        >["style"]),
      offsetX:
        overrides.tearNotch?.offsetX ??
        PARAMETER_DEFAULTS.sachet.tearNotchOffsetX,
      width:
        overrides.tearNotch?.width ??
        PARAMETER_DEFAULTS.sachet.tearNotchWidth,
      depth:
        overrides.tearNotch?.depth ??
        PARAMETER_DEFAULTS.sachet.tearNotchDepth
    },
    ...(overrides.trimPosition !== undefined
      ? { trimPosition: overrides.trimPosition }
      : {}),
    ...(overrides.trimWidth !== undefined
      ? { trimWidth: overrides.trimWidth }
      : {}),
    ...(overrides.stepPair !== undefined
      ? { stepPair: overrides.stepPair }
      : {}),
    ...(overrides.showOverallMeasure !== undefined
      ? { showOverallMeasure: overrides.showOverallMeasure }
      : {}),
    ...(overrides.showTrackMeasure !== undefined
      ? { showTrackMeasure: overrides.showTrackMeasure }
      : {}),
    ...(overrides.showLaneLabels !== undefined
      ? { showLaneLabels: overrides.showLaneLabels }
      : {})
  }
}
