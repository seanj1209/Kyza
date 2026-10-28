import type { EyeMarkSpec } from "./eyeMarks"
import type { PerfSpec } from "./perfs"
import type { FoldLineSpec } from "../geometry/foldLines"

export interface SafeZoneSpec {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  enabled?: boolean
  selected?: boolean
  /** Construction panel used by Fit; fitOutline supplies its actual boundary. */
  fitContour?: "doy-left" | "doy-right" | "kseal-left" | "kseal-right"
  /** Engine-resolved contour in normalized editable bounds. */
  fitOutline?: { x: number; y: number }[]
  paperFit?: { leftId: string; rightId: string; geometryKey?: string }
}

export interface DoyPouchSpec {
  bottomSeal?: number
  trimEnabled?: boolean
  trim?: number
  gussetSync?: boolean
  panelWidths: {
    left: number
    center: number
    right: number
  }
  sideBleed: number
  gripSeal: number
  ovalSelected?: boolean
  gussetSelected?: boolean
  centerSelected?: boolean
  ovalWidth?: number
  ovalOffsetX?: number
  centerOffsetX?: number
  arcOffsetX?: number
  gussetDepth: number
  showGusset?: boolean
  showCenterBox?: boolean
  showOval?: boolean
  showGripSeal?: boolean
  zipper: {
    offsetY: number
    height: number
    stopWidth: number
    jawGap: number
    offsetX?: number
    width?: number
  }
  showZipper?: boolean
  tearNotch: {
    offsetX?: number
    offsetY?: number
    width: number
    depth: number
  }
  showTearNotch?: boolean
}

export type AttributeBoxKind = "barcode" | "qr" | "bbe" | "label" | "clear-strip"

export interface AttributeBoxSpec {
  id: string
  kind: AttributeBoxKind
  labelKey?: string
  label?: string
  laneSide?: "A" | "B"
  laneIndex?: number
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  enabled?: boolean
  selected?: boolean
  /** Set by the label Place action (Amends v12): the seal or FOP/BOP panel this label holds. */
  placedSlot?: string
}

export interface KSealPouchSpec {
  gussetSync?: boolean
  pouchHeight?: number
  pouchWidth?: number
  sideSeal?: number
  trimEnabled?: boolean
  trim?: number
  bottomSeal?: number
  gussetSize?: number
  armDegree?: number
  customArmDegreeEnabled?: boolean
  armWidth?: number
  gussetDepth: number
  sealWidth: number
  topApexY?: number
  bottomApexY?: number
  gussetDepthRatio?: number
  centerOffsetX?: number
  midSectionWidthRatio?: number
  shoulderHeightRatio?: number
  sideGuideOffset?: number
}

export interface SachetSpec {
  /** Legacy track fields are retained for saved-project compatibility. */
  trackSide?: "left" | "right"
  trackWidth?: number
  rightTrim?: number
  trimPosition?: "left" | "right" | "both"
  trimWidth?: number
  stepEnabled?: boolean
  stepCount?: number
  stepPair?: boolean
  syncMirror?: boolean
  activeStepId?: string
  elementsByStep?: Record<string, SachetStepElements>
  safeZoneBuffer?: number
  showOverallMeasure?: boolean
  showTrackMeasure?: boolean
  showLaneLabels?: boolean
  tearNotch?: {
    enabled?: boolean
    style?: "jagged" | "halfmoon" | "triangle"
    offsetX?: number
    width?: number
    depth?: number
  }
}

export type HangerSlotSubtype =
  | "round-hole"
  | "standard-euro-slot"
  | "keyhole-euro-slot"
  | "keyhole-slot"
  | "delta-slot"
  | "sombrero-slot"

export type WindowShape =
  | "rectangle"
  | "circle"
  | "oval"
  | "rounded-rectangle"
  | "triangle"
  | "rounded-triangle"
  | "half-circle"

export interface WindowSpec {
  id: string
  shape: WindowShape
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  selected?: boolean
}

export interface HangerSlotSpec {
  id: string
  type: "hanger-slot"
  subtype: HangerSlotSubtype
  diameter: number
  width?: number
  height?: number
  centerX: number
  centerY: number
  mirrored: true
  purpose?: "tac-hole"
  placementVersion?: 2 | 3 | 4
  selected?: boolean
}

export interface PlainWebGuideLineSpec {
  id: string
  kind: "cut" | "slit"
  orientation: "vertical" | "horizontal"
  offset: number
  start?: number
  end?: number
}

export interface PlainWebSpec {
  guideLines?: PlainWebGuideLineSpec[]
}

export interface LiddingSpec {
  style: "plain" | "square" | "round"
  mode: "manual" | "auto"
  outerCutWidth: number
  outerCutHeight: number
  outerBleed: number
  sealOuter: number
  sealInner: number
  artworkSafeArea: number
  pullTab: boolean
  /** Clockwise from the top edge; absent in older projects means 45° (top right). */
  pullTabAngle?: number
  across: number
  around: number
  /** Older projects have uniform repeats. */
  repeatMode?: "uniform" | "compensated"
  /** Extra cutter height assigned to one Around repeat. */
  compensatedExtra?: number
  /** 1-based Around repeat receiving the extra height, counted from the top. */
  compensatedRow?: number
  innerLines: boolean
  /** Multipack leaves repeated marks on one outer side and one repeat-spanning mark on the opposite side. */
  multipack?: boolean
  multipackSingleSide?: "left" | "right"
  activeStep?: string
  /** One 1A source or independent element collections for each across lane. */
  syncMirror?: boolean
  elementsByLane?: Record<string, Pick<FlowwrapSpec, "attributeBoxes" | "safeZones" | "windows">>
  /** V1.2 stores overallWidth/Height for one slit, not the full repeat. */
  slitSizingVersion?: 2
  /**
   * Requested overall slit/cutter width (the outer green cutter edge). It
   * never changes the lid's outer cut; values below the eyemark-clearance
   * minimum resolve to that minimum. Absent = the minimum.
   */
  overallWidth?: number
  /** Requested overall slit/cutter height, as overallWidth. */
  overallHeight?: number
}

export interface PaperStripClearStripWindowSpec {
  stripCount: number
  stripWidth: number
  positionX: number
  selectedLaneIndex?: number
  lanes?: readonly PaperStripLaneStripSpec[]
}

export interface PaperStripLaneStripSpec {
  laneIndex: number
  positionX: number
  stripWidth: number
}

export interface PaperStripSteppingSpec {
  stepCount: number
  gap: number
  syncMirror?: boolean
  activeStep?: number
  elementsByStep?: Record<string, PaperStripStepElements>
}
export type PaperStripStepElements = Pick<FlowwrapSpec,
  "attributeBoxes" | "safeZones" | "windows" | "hangerSlots" | "halfMoonCutouts" | "eyeMarks" | "foldLines" | "perfs">
// Registration marks belong to the web construction, not a sachet face.
export type SachetStepElements = Omit<PaperStripStepElements, "eyeMarks">

export interface PaperStripSpec {
  paperColor?: string
  clearStripWindow?: PaperStripClearStripWindowSpec
  stepping?: PaperStripSteppingSpec
}

export interface HalfMoonCutoutSpec {
  id: string
  radius: number
  centerX: number
  centerY: number
  alignedCutterEdgeId: "top"
  selected?: boolean
}

export interface BaseLayerCustomisationSpec {
  cutter: {
    style: "default" | "dashed" | "dotted"
    thickness: number
    color: string
    opacity: number
  }
  eyemark: {
    color: string
    opacity: number
  }
  seals: {
    style: "default" | "dashed" | "dotted"
    thickness: number
    color: string
    opacity: number
  }
}

export type RenderMode = "edit" | "artwork" | "export"

export type RenderOptions = {
  renderMode?: RenderMode
}

export interface FlowwrapSpec {
  /** Per-cutter, opt-in exported vector legend. */
  cutterLegend?: boolean
  cutterLegendOrientation?: "portrait" | "landscape"
  cutterLegendPosition?: "top" | "bottom" | "left" | "right"
  cutterLegendScale?: number
  width: number
  height: number
  seal: number
  substrate?: "clear" | "white" | "paper" | "white-paper" | "black-paper"
  seals?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
  bleed?: number
  sealClearance?: number
  perfs?: PerfSpec
  foldLines?: FoldLineSpec[]
  eyeMarks?: EyeMarkSpec
  safeZones?: SafeZoneSpec[]
  attributeBoxes?: AttributeBoxSpec[]
  windows?: WindowSpec[]
  hangerSlots?: HangerSlotSpec[]
  halfMoonCutouts?: HalfMoonCutoutSpec[]
  baseCustomisation?: BaseLayerCustomisationSpec
  /** Visual properties only; never used for construction or validation geometry. */
  elementAppearance?: Record<string, {
    color?: string
    thickness?: number
    opacity?: number
    lineStyle?: "solid" | "dashed" | "dotted"
    fill?: "none" | "solid" | "tint" | "hatch"
    fontSize?: number
  }>
  plainWeb?: PlainWebSpec
  lidding?: LiddingSpec
  paperStrip?: PaperStripSpec
  doyPouch?: DoyPouchSpec
  kSealPouch?: KSealPouchSpec
  sachet?: SachetSpec
  /** Pouch construction reuses the single-lane sachet layout, without sachet stepping rules. */
  sideSealPouch?: { sides: 2 | 3; trimEnabled: boolean; trimWidth: number; sealSync?: boolean }
}
