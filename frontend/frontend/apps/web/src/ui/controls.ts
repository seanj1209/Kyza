import { setOpeningStyle } from "../../../../packages/cutter-engine/actions/openingStyle"
import { getDefaultHangerSlotPosition } from "../../../../packages/cutter-engine/actions/hangerSlotPlacement"
import { updateGussetControl } from "../../../../packages/cutter-engine/actions/gussetControls"
import { createStudioIcon } from "./studioIcons"
import { PIFA_ROTATIONS } from "../../../../packages/cutter-engine/actions/textDirection"
import { paperStripSynced, setPaperStripSync, setPaperStripStepCount } from "../../../../packages/cutter-engine/actions/paperStripSteps"
import { sachetSynced, setSachetSync, setSachetStepCount } from "../../../../packages/cutter-engine/actions/sachetSteps"
import { clampCanvasZoom, formatMeasurement, MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from "./canvasViewport"
import { loadZoomStepPercent } from "../klyro/account/preferenceService"
import { updateLiddingSpec } from "../constraints/lidding"
import { createVerticalTabs } from "./verticalTabs"
import {
  PAPER_STRIP_DEFAULT_STEPPING,
  createPaperStripClearStripAttribute
} from "../constraints/paperStrip"
import {
  HANGER_SLOT_MAX_DIAMETER_MM,
  HANGER_SLOT_MAX_WIDTH_MM,
  HANGER_SLOT_MIN_DIAMETER_MM,
  HANGER_SLOT_MIN_WIDTH_MM,
  HANGER_SLOT_SIDE_CLEARANCE_MM,
  clampHangerSlotDiameter,
  clampHangerSlotHeight,
  clampHangerSlotWidth,
  getHangerSlotAxisX,
  getHangerSlotHalfHeight,
  getHangerSlotHalfWidth,
  getHangerSlotRecommendedRange
} from "../constraints/hangerSlots"
import {
  DEFAULT_HALF_MOON_RADIUS,
  clampHalfMoonRadius
} from "../constraints/halfMoonCutouts"
import {
  DEFAULT_SEAL_CLEARANCE_MM,
  MAX_SAFE_ZONES,
  MIN_SEAL_CLEARANCE_MM
} from "../constraints/flowwrap"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { doyCutterWidth, doyFinishedWidth } from "../core/geometry/resolvers/doyBounds"
import {
  resolveKSealDimensionSemantics,
  resolveKSealPouchGeometry
} from "../geometry/kSealPouchGeometry"
import {
  clampKSealDualEyemarkOffset,
  createKSealEyemarkDefaults,
  getKSealDualEyemarkTarget,
  reconcileKSealDualEyemarksForTrim
} from "../rules/kSealEyemarkRules"
import {
  KSEAL_TAC_HOLE_DEFAULT_MM,
  clampKSealTacHole,
  centreKSealTacHoles,
  getKSealTacCentreX,
  getKSealTacCentreY,
  isKSealTacHole
} from "../rules/kSealTacHoleRules"
import { formatMetricValue, parseMetricDraft } from "../core/formatMetric"
import { runEngineRequest } from "../../../../packages/engine-api"
import { addTextDirection } from "../../../../packages/cutter-engine/actions/textDirection"
import { createControlSpecSynchroniser } from "../project/controlSpecSynchronisation"
import type { FoldLineSpec } from "../geometry/foldLines"
import { HANGER_SLOT_STYLES, hangerSlotPath } from "../geometry/hangerSlotShapes"
import type { FlowwrapSpec, HalfMoonCutoutSpec, HangerSlotSpec, SafeZoneSpec, WindowSpec, WindowShape } from "../types/flowwrap"
import type { EyeMarkColor, EyeMarkSpec } from "../types/eyeMarks"
import type { PerfStyle } from "../types/perfs"

export type ControlsSpecChangeReason = "controls-edit" | "engine-action"

type FlowwrapUIConfig = {
  container: HTMLElement
  initialSpec: FlowwrapSpec
  onChange: (spec: FlowwrapSpec, reason: ControlsSpecChangeReason) => void
  onMeasureToggle?: (enabled: boolean) => void
  onPanToggle?: (enabled: boolean) => void
  onSelectToggle?: (enabled: boolean) => void
  onElementAdded?: (id: string) => void
  onPouchPreviewToggle?: (enabled: boolean) => void
  onZoomChange?: (zoom: number) => void
  onReferenceGridToggle?: (enabled: boolean) => void
  packPanel?: HTMLElement
  baseModelPanelHost?: HTMLElement
  attributesPanelHost?: HTMLElement
  enablePackPanel?: boolean
  onFocusLayer?: (layerId: string) => void
}

type PaperStripSteppingSpec = NonNullable<
  NonNullable<FlowwrapSpec["paperStrip"]>["stepping"]
>

const DEFAULT_SAFE_ZONE_SIZE = 40
const DEFAULT_HANGER_SLOT_DIAMETER = 8
const DEFAULT_HANGER_SLOT_WIDTH = 18
const DEFAULT_HANGER_SLOT_HEIGHT = 6
const DEFAULT_PERF_DIAMETER = 1.5
const DEFAULT_PERF_COLOR = "#B80F0A"
const DEFAULT_PERF_STYLE: PerfStyle = "circles"
const DEFAULT_PERF_FILL_OPACITY = 1
const DEFAULT_PERF_STROKE_COLOR = DEFAULT_PERF_COLOR
const DEFAULT_PERF_STROKE_WIDTH = 0.25
const DEFAULT_PERF_SEPARATION = 10
const DEFAULT_PERF_COUNT = 6
const DEFAULT_EYEMARK_WIDTH = 10
const DEFAULT_EYEMARK_HEIGHT = 5
const ICON_FOLD =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZvbGQtaG9yaXpvbnRhbC1pY29uIGx1Y2lkZS1mb2xkLWhvcml6b250YWwiPjxwYXRoIGQ9Ik0yIDEyaDYiLz48cGF0aCBkPSJNMjIgMTJoLTYiLz48cGF0aCBkPSJNMTIgMnYyIi8+PHBhdGggZD0iTTEyIDh2MiIvPjxwYXRoIGQ9Ik0xMiAxNHYyIi8+PHBhdGggZD0iTTEyIDIwdjIiLz48cGF0aCBkPSJtMTkgOS0zIDMgMyAzIi8+PHBhdGggZD0ibTUgMTUgMy0zLTMtMyIvPjwvc3ZnPg=="
const ICON_SAFE_ZONE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXNxdWFyZS1kYXNoZWQtaWNvbiBsdWNpZGUtc3F1YXJlLWRhc2hlZCI+PHBhdGggZD0iTTUgM2EyIDIgMCAwIDAtMiAyIi8+PHBhdGggZD0iTTE5IDNhMiAyIDAgMCAxIDIgMiIvPjxwYXRoIGQ9Ik0yMSAxOWEyIDIgMCAwIDEtMiAyIi8+PHBhdGggZD0iTTUgMjFhMiAyIDAgMCAxLTItMiIvPjxwYXRoIGQ9Ik05IDNoMSIvPjxwYXRoIGQ9Ik05IDIxaDEiLz48cGF0aCBkPSJNMTQgM2gxIi8+PHBhdGggZD0iTTE0IDIxaDEiLz48cGF0aCBkPSJNMyA5djEiLz48cGF0aCBkPSJNMjEgOXYxIi8+PHBhdGggZD0iTTMgMTR2MSIvPjxwYXRoIGQ9Ik0yMSAxNHYxIi8+PC9zdmc+"
const ICON_MEASURE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXJ1bGVyLWRpbWVuc2lvbi1saW5lLWljb24gbHVjaWRlLXJ1bGVyLWRpbWVuc2lvbi1saW5lIj48cGF0aCBkPSJNMTAgMTV2LTMiLz48cGF0aCBkPSJNMTQgMTV2LTMiLz48cGF0aCBkPSJNMTggMTV2LTMiLz48cGF0aCBkPSJNMiA4VjQiLz48cGF0aCBkPSJNMjIgNkgyIi8+PHBhdGggZD0iTTIyIDhWNCIvPjxwYXRoIGQ9Ik02IDE1di0zIi8+PHJlY3QgeD0iMiIgeT0iMTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSI4IiByeD0iMiIvPjwvc3ZnPg=="
const ICON_PAN =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWhhbmQtaWNvbiBsdWNpZGUtaGFuZCI+PHBhdGggZD0iTTE4IDExVjZhMiAyIDAgMCAwLTItMmEyIDIgMCAwIDAtMiAyIi8+PHBhdGggZD0iTTE0IDEwVjRhMiAyIDAgMCAwLTItMmEyIDIgMCAwIDAtMiAydjIiLz48cGF0aCBkPSJNMTAgMTAuNVY2YTIgMiAwIDAgMC0yLTJhMiAyIDAgMCAwLTIgMnY4Ii8+PHBhdGggZD0iTTE4IDhhMiAyIDAgMSAxIDQgMHY2YTggOCAwIDAgMS04IDhoLTJjLTIuOCAwLTQuNS0uODYtNS45OS0yLjM0bC0zLjYtMy42YTIgMiAwIDAgMSAyLjgzLTIuODJMNyAxNSIvPjwvc3ZnPg=="
const ICON_SELECT =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDNsNyAxNyAyLTcgNy0yeiIvPjwvc3ZnPg=="
const ICON_PERF =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZvY3VzLWljb24gbHVjaWRlLWZvY3VzIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PHBhdGggZD0iTTMgN1Y1YTIgMiAwIDAgMSAyLTJoMiIvPjxwYXRoIGQ9Ik0xNyAzaDJhMiAyIDAgMCAxIDIgMnYyIi8+PHBhdGggZD0iTTIxIDE3djJhMiAyIDAgMCAxLTIgMmgtMiIvPjxwYXRoIGQ9Ik03IDIxSDVhMiAyIDAgMCAxLTItMnYtMiIvPjwvc3ZnPg=="
const ICON_EYEMARK =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWFsaWduLXZlcnRpY2FsLXNwYWNlLWFyb3VuZC1pY29uIGx1Y2lkZS1hbGlnbi12ZXJ0aWNhbC1zcGFjZS1hcm91bmQiPjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSI2IiB4PSI3IiB5PSI5IiByeD0iMiIvPjxwYXRoIGQ9Ik0yMiAyMEgyIi8+PHBhdGggZD0iTTIyIDRIMiIvPjwvc3ZnPg=="
const ICON_MENU =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMiAxMmMwIDAgNCA3IDEwIDdzMTAtNyAxMC03LTQtNy0xMC03LTEwIDctMTAgN1oiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PC9zdmc+"
const ICON_TRASH =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXRyYXNoLWljb24gbHVjaWRlLXRyYXNoIj48cGF0aCBkPSJNMTkgNnYxNGEyIDIgMCAwIDEtMiAySDdhMiAyIDAgMCAxLTItMlY2Ii8+PHBhdGggZD0iTTMgNmgxOCIvPjxwYXRoIGQ9Ik04IDZWNGEyIDIgMCAwIDEgMi0yaDRhMiAyIDAgMCAxIDIgMnYyIi8+PC9zdmc+"
const ICON_PACK =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWJvb2stdHlwZS1pY29uIGx1Y2lkZS1ib29rLXR5cGUiPjxwYXRoIGQ9Ik0xMCAxM2g0Ii8+PHBhdGggZD0iTTEyIDZ2NyIvPjxwYXRoIGQ9Ik0xNiA4VjZIOHYyIi8+PHBhdGggZD0iTTQgMTkuNXYtMTVBMi41IDIuNSAwIDAgMSA2LjUgMkgxOWExIDEgMCAwIDEgMSAxdjE4YTEgMSAwIDAgMS0xIDFINi41YTEgMSAwIDAgMSAwLTVIMjAiLz48L3N2Zz4="
const ICON_CUTTER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWdyaWQyeDItaWNvbiBsdWNpZGUtZ3JpZC0yeDIiPjxwYXRoIGQ9Ik0xMiAzdjE4Ii8+PHBhdGggZD0iTTMgMTJoMTgiLz48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIi8+PC9zdmc+"
const ICON_SEAL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWRvY2staWNvbiBsdWNpZGUtZG9jayI+PHBhdGggZD0iTTIgOGgyMCIvPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIxNiIgeD0iMiIgeT0iNCIgcng9IjIiLz48cGF0aCBkPSJNNiAxNmgxMiIvPjwvc3ZnPg=="
const ICON_UI_PLUS_STATIC = "/Icons/UI Icons/Add_STATIC.png"
const ICON_UI_PLUS_CLICKED = "/Icons/UI Icons/Add_Clicked.png"
const ICON_UI_BIN_STATIC = "/Icons/UI Icons/Bin_STATIC.png"
const ICON_UI_BIN_HOVER = "/Icons/UI Icons/Bin_Hover.png"
const ATTRIBUTE_ICON_PATH = "/Icons/Attribute Icons"
const ATTRIBUTE_ICONS: Record<string, { static: string; hover: string }> = {
  fold: {
    static: `${ATTRIBUTE_ICON_PATH}/Fold Line_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Fold Line_HOVER.png`
  },
  perf: {
    static: `${ATTRIBUTE_ICON_PATH}/MicroPerf_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Microperf_HOVER.png`
  },
  safe: {
    static: `${ATTRIBUTE_ICON_PATH}/Safe Zone_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Safe Zone_HOVER.png`
  },
  hanger: {
    static: `${ATTRIBUTE_ICON_PATH}/Hanger Slots_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Hanger Slots_HOVER.png`
  },
  "half-moon": {
    static: `${ATTRIBUTE_ICON_PATH}/HalfMoon_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/HalfMoon_HOVER.png`
  },
  window: {
    static: `${ATTRIBUTE_ICON_PATH}/Window_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window_HOVER.png`
  },
  "window-rectangle": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Rectangle_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Rectangle_STATIC.png`
  },
  "window-circle": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Circle_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Circle_HOVER.png`
  },
  "window-oval": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Oval_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Oval_HOVER.png`
  },
  "window-rounded-rectangle": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Rectangle Rounded_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Rectangle Rounded_STATIC.png`
  },
  "window-triangle": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Triangle_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Triangle_HOVER.png`
  },
  "window-rounded-triangle": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Triangle Rounded_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/Triangle Rounded_HOVER.png`
  },
  "window-half-circle": {
    static: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Window Attribute Icons/HOVER.png`
  },
  zipper: {
    static: `${ATTRIBUTE_ICON_PATH}/Zip Path_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Zip Path_HOVER.png`
  },
  tear: {
    static: `${ATTRIBUTE_ICON_PATH}/Tear Notch_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Tear Notch_HOVER.png`
  },
  "gusset-arch": {
    static: `${ATTRIBUTE_ICON_PATH}/Doy Gusset_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Doy Gusset_HOVER.png`
  },
  grip: {
    static: `${ATTRIBUTE_ICON_PATH}/Grip Seal_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Grip Seal_HOVER.png`
  },
  barcode: {
    static: `${ATTRIBUTE_ICON_PATH}/Barcode_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Barcode_HOVER.png`
  },
  "qr-code": {
    static: `${ATTRIBUTE_ICON_PATH}/QR Code_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/QR Code_HOVER.png`
  },
  "hole-punch": {
    static: `${ATTRIBUTE_ICON_PATH}/Hole Punch_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Hole Punch_HOVER.png`
  },
  "hot-needle": {
    static: `${ATTRIBUTE_ICON_PATH}/Hot Needle_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Hot Needle_HOVER.png`
  },
  scribe: {
    static: `${ATTRIBUTE_ICON_PATH}/Scribe_STATIC.png`,
    hover: `${ATTRIBUTE_ICON_PATH}/Scribe_HOVER.png`
  }
}

function createSection(title: string) {
  const section = document.createElement("section")
  section.className = "panel dock-panel"
  const heading = document.createElement("div")
  heading.className = "panel-heading"
  const titleEl = document.createElement("h2")
  titleEl.textContent = title
  const collapseButton = document.createElement("button")
  collapseButton.type = "button"
  collapseButton.className = "panel-collapse"
  collapseButton.textContent = "–"
  collapseButton.setAttribute("aria-label", `Toggle ${title}`)
  collapseButton.addEventListener("click", event => {
    event.stopPropagation()
    section.classList.toggle("is-collapsed")
    collapseButton.textContent = section.classList.contains("is-collapsed")
      ? "+"
      : "–"
  })
  heading.addEventListener("click", () => {
    section.classList.toggle("is-collapsed")
    collapseButton.textContent = section.classList.contains("is-collapsed")
      ? "+"
      : "–"
  })
  heading.appendChild(titleEl)
  heading.appendChild(collapseButton)
  const body = document.createElement("div")
  body.className = "panel-body"
  section.appendChild(heading)
  section.appendChild(body)
  return { section, body, titleEl }
}

function createDockButton(label: string, title: string) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "dock-button"
  button.textContent = label
  button.setAttribute("title", title)
  return button
}

function createDockIconButton(title: string, iconSrc: string) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "dock-button icon-button"
  button.setAttribute("aria-label", title)
  button.setAttribute("title", title)
  const icon = document.createElement("img")
  icon.src = iconSrc
  icon.alt = ""
  button.appendChild(icon)
  return button
}

function createFieldLabel(text: string) {
  const label = document.createElement("label")
  label.className = "field"
  const span = document.createElement("span")
  span.textContent = text
  label.appendChild(span)
  return label
}

function createNumberInput(
  labelText: string,
  value: number,
  options: { min?: number; step?: number },
  onChange: (next: number) => void
) {
  return createDeferredNumberInput(labelText, value, options, onChange)
}

function createDeferredNumberInput(
  labelText: string,
  value: number,
  options: { min?: number; step?: number },
  onCommit: (next: number) => void
) {
  const label = createFieldLabel(labelText)
  const input = document.createElement("input")
  input.type = "number"
  input.value = formatMetricValue(value)
  input.min = options.min?.toString() ?? ""
  input.step = labelText.includes("(mm)")
    ? "0.5"
    : options.step?.toString() ?? "0.5"
  let lastValid = value
  let dirty = false

  const applyValue = (next: number) => {
    lastValid = next
    dirty = false
    input.value = formatMetricValue(next)
    onCommit(next)
  }

  const commit = () => {
    if (!dirty) {
      return
    }
    const raw = input.value.trim()
    const min = input.min === "" ? undefined : Number(input.min)
    const max = input.max === "" ? undefined : Number(input.max)
    const next = parseMetricDraft(raw, { min, max })
    if (next === null) {
      dirty = false
      input.value = formatMetricValue(lastValid)
      return
    }
    applyValue(next)
  }

  input.addEventListener("input", () => {
    dirty = true
  })
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      commit()
      input.blur()
    } else if (event.key === "Escape") {
      dirty = false
      input.value = formatMetricValue(lastValid)
      input.blur()
    }
  })
  input.addEventListener("blur", () => {
    commit()
  })

  label.appendChild(input)
  return {
    field: label,
    input,
    setValue: (next: number) => {
      lastValid = next
      if (document.activeElement !== input || !dirty) {
        input.value = formatMetricValue(next)
      }
    },
    getValue: () => lastValid
  }
}

function createTextInput(
  labelText: string,
  value: string,
  onChange: (next: string) => void
) {
  const label = createFieldLabel(labelText)
  const input = document.createElement("input")
  input.type = "text"
  input.value = value
  input.addEventListener("input", () => {
    onChange(input.value)
  })
  label.appendChild(input)
  return label
}

function createToggle(
  labelText: string,
  checked: boolean,
  onChange: (next: boolean) => void
) {
  const label = createFieldLabel(labelText)
  const input = document.createElement("input")
  input.type = "checkbox"
  input.checked = checked
  input.addEventListener("change", () => {
    onChange(input.checked)
  })
  label.appendChild(input)
  return label
}

function createTogglePair(
  labelText: string,
  active: boolean,
  onChange: (next: boolean) => void
) {
  const row = document.createElement("div")
  row.className = "toggle-pair"
  const label = document.createElement("span")
  label.textContent = labelText
  const group = document.createElement("div")
  group.className = "toggle-pair-buttons"
  const onButton = document.createElement("button")
  onButton.type = "button"
  onButton.className = "toggle-pill"
  onButton.textContent = "On"
  const offButton = document.createElement("button")
  offButton.type = "button"
  offButton.className = "toggle-pill"
  offButton.textContent = "Off"
  group.appendChild(onButton)
  group.appendChild(offButton)
  row.appendChild(label)
  row.appendChild(group)

  const setActive = (next: boolean) => {
    onButton.classList.toggle("is-active", next)
    offButton.classList.toggle("is-active", !next)
  }
  const setDisabled = (disabled: boolean) => {
    onButton.disabled = disabled
    offButton.disabled = disabled
    row.classList.toggle("is-disabled", disabled)
  }

  setActive(active)
  onButton.addEventListener("click", () => {
    if (onButton.classList.contains("is-active")) {
      return
    }
    setActive(true)
    onChange(true)
  })
  offButton.addEventListener("click", () => {
    if (offButton.classList.contains("is-active")) {
      return
    }
    setActive(false)
    onChange(false)
  })

  return { row, setActive, setDisabled }
}

function createAspectToggle(locked: boolean, onChange: (next: boolean) => void) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "aspect-lock"
  button.setAttribute("aria-pressed", locked ? "true" : "false")
  button.setAttribute("aria-label", "Aspect ratio lock")
  const setLocked = (next: boolean) => {
    button.classList.toggle("is-active", next)
    button.setAttribute("aria-pressed", next ? "true" : "false")
    const icon = createStudioIcon(next ? "linked" : "unlinked")!
    icon.classList.add("aspect-lock-icon")
    button.replaceChildren(icon)
    button.title = next ? "Sizes linked — click to unlink" : "Sizes independent — click to link"
  }
  setLocked(locked)
  button.addEventListener("click", () => {
    const next = !button.classList.contains("is-active")
    setLocked(next)
    onChange(next)
  })
  return { button, setLocked }
}

function createSelect(
  labelText: string,
  value: string,
  options: { value: string; label: string }[],
  onChange: (next: string) => void
) {
  const label = createFieldLabel(labelText)
  const select = document.createElement("select")
  for (const option of options) {
    const optionEl = document.createElement("option")
    optionEl.value = option.value
    optionEl.textContent = option.label
    if (option.value === value) {
      optionEl.selected = true
    }
    select.appendChild(optionEl)
  }
  select.addEventListener("change", () => {
    onChange(select.value)
  })
  label.appendChild(select)
  return { field: label, select }
}

function applyIconButtonStates(
  button: HTMLButtonElement,
  img: HTMLImageElement,
  states: {
    static: string
    hover?: string
    active?: string
    activeDurationMs?: number
  }
) {
  let activeTimeout: ReturnType<typeof setTimeout> | null = null
  const sync = () => {
    const isHover = button.matches(":hover") || button.matches(":focus-visible")
    img.src = isHover && states.hover ? states.hover : states.static
  }
  const activate = () => {
    if (!states.active) {
      return
    }
    if (activeTimeout) {
      clearTimeout(activeTimeout)
    }
    img.src = states.active
    activeTimeout = setTimeout(() => {
      activeTimeout = null
      sync()
    }, states.activeDurationMs ?? 1500)
  }
  img.src = states.static
  button.addEventListener("mouseenter", sync)
  button.addEventListener("mouseleave", sync)
  button.addEventListener("focus", sync)
  button.addEventListener("blur", sync)
  return { activate, sync }
}

function cloneZone(zone: SafeZoneSpec, updates: Partial<SafeZoneSpec>) {
  return { ...zone, ...updates }
}

export function initFlowwrapControls({
  container,
  initialSpec,
  onChange,
  onMeasureToggle,
  onPanToggle,
  onSelectToggle,
  onElementAdded,
  onPouchPreviewToggle,
  onZoomChange,
  onReferenceGridToggle,
  packPanel,
  baseModelPanelHost,
  attributesPanelHost,
  enablePackPanel = true,
  onFocusLayer
}: FlowwrapUIConfig) {
  const specSynchroniser = createControlSpecSynchroniser<
    FlowwrapSpec,
    ControlsSpecChangeReason
  >(onChange)
  const initial = specSynchroniser.syncFromProject(initialSpec)
  let spec: FlowwrapSpec = {
    ...initial,
    safeZones: initial.safeZones ? [...initial.safeZones] : [],
    attributeBoxes: initial.attributeBoxes ? [...initial.attributeBoxes] : [],
    foldLines: initial.foldLines ? [...initial.foldLines] : [],
    hangerSlots: initial.hangerSlots ? [...initial.hangerSlots] : [],
    windows: initial.windows ? [...initial.windows] : [],
    halfMoonCutouts: initial.halfMoonCutouts ? [...initial.halfMoonCutouts] : []
  }
  const usesBaseModelPanel = Boolean(baseModelPanelHost)
  const usesAttributesPanel = Boolean(attributesPanelHost)

  container.innerHTML = ""
  container.setAttribute("data-measurement-active", "false")

  const dockShell = document.createElement("div")
  dockShell.id = "dock-shell"
  const notchTop = document.createElement("div")
  notchTop.className = "dock-notch"
  notchTop.setAttribute("aria-hidden", "true")
  const dock = document.createElement("div")
  dock.id = "dock"
  dock.setAttribute("role", "toolbar")
  dock.setAttribute("aria-label", "Cutter canvas tools")
  const panelStack = document.createElement("div")
  panelStack.id = "dock-panel"
  const notchBottom = document.createElement("div")
  notchBottom.className = "dock-notch"
  notchBottom.setAttribute("aria-hidden", "true")
  dockShell.appendChild(notchTop)
  dockShell.appendChild(dock)
  dockShell.appendChild(panelStack)
  dockShell.appendChild(notchBottom)
  container.appendChild(dockShell)

  const panels = new Map<string, HTMLElement>()
  const dockButtons = new Map<string, HTMLButtonElement>()
  let activePanel: string | null = null
  const setActivePanel = (key: string) => {
    if (activePanel === key) {
      activePanel = null
      panelStack.classList.remove("is-visible")
      dockButtons.forEach(button => button.classList.remove("is-active"))
      return
    }
    activePanel = key
    panels.forEach((panel, panelKey) => {
      panel.classList.toggle("is-active", panelKey === key)
    })
    dockButtons.forEach((button, buttonKey) => {
      button.classList.toggle("is-active", buttonKey === key)
    })
    panelStack.classList.toggle("is-visible", panels.get(key)?.classList.contains("is-active") ?? false)
  }
  const registerPanel = (key: string, button: HTMLButtonElement, panel: HTMLElement) => {
    panel.setAttribute("data-panel", key)
    panels.set(key, panel)
    dockButtons.set(key, button)
    dock.appendChild(button)
    panelStack.appendChild(panel)
  }

  const enableDockDrag = (handle: HTMLElement) => {
    let dragStart: { x: number; y: number; left: number; top: number } | null = null
    const clampDockPosition = (left: number, top: number) => {
      const canvas = document.getElementById("preview-frame")
      if (!canvas) {
        return { left, top }
      }
      const canvasRect = canvas.getBoundingClientRect()
      const rightRailRect = document.getElementById("right-rail")?.getBoundingClientRect()
      const bottomActionsRect = document.getElementById("studio-bottom-actions")?.getBoundingClientRect()
      const dockWidth = dockShell.offsetWidth
      const dockHeight = dockShell.offsetHeight
      const margin = 14
      const minimumLeft = canvasRect.left + margin
      const minimumTop = canvasRect.top + margin
      const maximumRight = rightRailRect && rightRailRect.width > 0
        ? Math.min(canvasRect.right - margin, rightRailRect.left - margin)
        : canvasRect.right - margin
      const maximumBottom = bottomActionsRect && bottomActionsRect.height > 0
        && bottomActionsRect.top > canvasRect.top && bottomActionsRect.top < canvasRect.bottom
        ? Math.min(canvasRect.bottom - margin, bottomActionsRect.top - margin)
        : canvasRect.bottom - margin
      return {
        left: Math.max(minimumLeft, Math.min(maximumRight - dockWidth, left)),
        top: Math.max(minimumTop, Math.min(maximumBottom - dockHeight, top))
      }
    }
    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) {
        return
      }
      if (handle === dock && event.target !== dock) {
        return
      }
      if (dockShell.getAttribute("data-dock-pinned") === "true") {
        return
      }
      dockShell.setAttribute("data-user-position", "true")
      const rect = dockShell.getBoundingClientRect()
      dockShell.style.left = `${rect.left}px`
      dockShell.style.top = `${rect.top}px`
      dockShell.style.transform = "none"
      dragStart = {
        x: event.clientX,
        y: event.clientY,
        left: rect.left,
        top: rect.top
      }
      handle.setPointerCapture(event.pointerId)
      event.preventDefault()
    })
    handle.addEventListener("pointermove", event => {
      if (!dragStart) {
        return
      }
      const dx = event.clientX - dragStart.x
      const dy = event.clientY - dragStart.y
      const nextPosition = clampDockPosition(dragStart.left + dx, dragStart.top + dy)
      dockShell.style.left = `${nextPosition.left}px`
      dockShell.style.top = `${nextPosition.top}px`
    })
    handle.addEventListener("pointerup", event => {
      if (!dragStart) {
        return
      }
      dragStart = null
      handle.releasePointerCapture(event.pointerId)
    })
    handle.addEventListener("pointercancel", event => {
      if (!dragStart) {
        return
      }
      dragStart = null
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId)
      }
    })
  }
  enableDockDrag(notchTop)
  enableDockDrag(notchBottom)
  enableDockDrag(dock)

  const sizeSection = createSection("Cutter Size (mm)")
  const sealSection = createSection("Seals")
  const safeSection = createSection("Safe Zones")
  const hangerSection = createSection("Hanger Slots")
  const halfMoonSection = usesAttributesPanel ? createSection("Half-Moon Cut-Out") : null
  const windowSection = usesAttributesPanel ? createSection("Window") : null
  const foldSection = createSection("Fold Lines")
  const perfSection = createSection("Perforations")
  const eyemarkSection = createSection("Eyemarks")
  const baseEyemarkSection = createSection("Eyemarks (mm)")
  const packSpecificSection = createSection("Pack Type")
  packSpecificSection.section.classList.add("pack-specific-section")
  const baseSealSection = createSection("Seals (mm)")
  const baseTrimSection = createSection("Trim (mm)")
  const substrateSection = createSection("Substrate")
  const doySection = usesAttributesPanel ? null : createSection("Doy Pouch")
  const zipperSection = usesAttributesPanel ? createSection("Grip Seal (Zip)") : null
  const tearNotchSection = usesAttributesPanel ? createSection("Tear Notch") : null
  const gussetArchSection = usesAttributesPanel ? createSection("Gusset Architecture") : null
  const sachetStepSection = usesAttributesPanel ? createSection("Stepping") : null
  const sachetTearSection = usesAttributesPanel ? createSection("Sachet Tear Notch") : null
  const gripSection = usesAttributesPanel ? createSection("Grip Seal (Default)") : null
  const barcodeSection = usesAttributesPanel ? createSection("Barcodes") : null
  const qrSection = usesAttributesPanel ? createSection("QR Code") : null
  const bbeSection = usesAttributesPanel ? createSection("BBE Box") : null
  const labelSection = usesAttributesPanel ? createSection("Tags / Labels") : null
  const measureSection = createSection("Measures")
  const viewSection = createSection("View")
  const packSectionObj = packPanel ? null : createSection("Pack")
  const packSection = packPanel ?? packSectionObj!.section
  if (packPanel) {
    packPanel.classList.add("dock-panel")
  }

  if (baseModelPanelHost) {
    baseModelPanelHost.innerHTML = ""
    baseModelPanelHost.appendChild(sizeSection.section)
    baseModelPanelHost.appendChild(baseEyemarkSection.section)
    baseModelPanelHost.appendChild(packSpecificSection.section)
    baseModelPanelHost.appendChild(baseTrimSection.section)
    baseModelPanelHost.appendChild(baseSealSection.section)
    baseModelPanelHost.appendChild(substrateSection.section)
    baseModelPanelHost.appendChild(measureSection.section)
  }

  const windowButtons = new Map<WindowShape, HTMLButtonElement>()
  const windowShapes: Array<{ shape: WindowShape; label: string }> = [
    { shape: "rectangle", label: "Rectangle" },
    { shape: "circle", label: "Circle" },
    { shape: "oval", label: "Oval" },
    { shape: "rounded-rectangle", label: "Rounded Rectangle" },
    { shape: "triangle", label: "Triangle" },
    { shape: "rounded-triangle", label: "Rounded Triangle" },
    { shape: "half-circle", label: "Half Circle" }
  ]
  windowShapes.forEach(item => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "ghost"
    button.textContent = item.label
    windowButtons.set(item.shape, button)
  })

  const attributeButtons = new Map<string, HTMLButtonElement>()
  const syncLiddingMenus = () => {
    const excluded = new Set(["fold", "hanger", "half-moon", "zipper", "tear", "gusset-arch", "sachet-tear", "grip", "hole-punch"])
    for (const [id, button] of attributeButtons) button.hidden = Boolean(spec.lidding && excluded.has(id))
  }
  const attributePanels = new Map<string, HTMLElement>()
  let selectElementCategory: ((category: string) => void) | undefined
  const hangerSlotList = document.createElement("div")
  hangerSlotList.className = "safe-zone-list"
  hangerSlotList.style.gridColumn = "1 / -1"

  if (attributesPanelHost) {
    attributesPanelHost.innerHTML = ""
    const elementTabs = createVerticalTabs("elements", "Element categories")
    selectElementCategory = category => elementTabs.select(category, true)
    const menu = elementTabs.root
    menu.classList.add("attributes-groups")
    attributesPanelHost.appendChild(menu)

    const groupBodies = new Map<string, HTMLElement>()
    const createGroup = (id: string, label: string, open = false) => {
      const group = document.createElement("section")
      group.className = "elements-category"
      const heading = document.createElement("h3")
      heading.className = "elements-category-title"
      heading.textContent = label
      const grid = document.createElement("div")
      grid.className = "attributes-menu"
      group.append(heading, grid)
      elementTabs.add(id, label, group)
      groupBodies.set(id, grid)
    }

    createGroup("basic", "Basic", true)
    createGroup("barcodes", "Barcodes / BBEs")
    createGroup("other", "Labels")
    createGroup("perforation", "Perforations")
    createGroup("windows", "Windows")
    createGroup("die-cut", "Die Cut Outs")
    createGroup("openings", "Openings")

    const createFloatingPanel = (id: string, title: string, section: HTMLElement) => {
      const panel = document.createElement("div")
      panel.className = "floating-panel"
      panel.setAttribute("data-panel", id)
      const header = document.createElement("div")
      header.className = "floating-panel-header"
      const titleEl = document.createElement("span")
      titleEl.className = "floating-panel-title"
      titleEl.textContent = title
      const controls = document.createElement("div")
      controls.className = "floating-panel-controls"
      const minimizeButton = document.createElement("button")
      minimizeButton.type = "button"
      minimizeButton.className = "floating-panel-control"
      minimizeButton.textContent = "-"
      minimizeButton.setAttribute("aria-label", `Minimise ${title}`)
      const closeButton = document.createElement("button")
      closeButton.type = "button"
      closeButton.className = "floating-panel-control"
      closeButton.textContent = "x"
      closeButton.setAttribute("aria-label", `Close ${title}`)
      controls.appendChild(minimizeButton)
      controls.appendChild(closeButton)
      header.appendChild(titleEl)
      header.appendChild(controls)
      panel.appendChild(header)

      const body = document.createElement("div")
      body.className = "floating-panel-body"
      section.classList.remove("dock-panel")
      section.classList.add("floating-panel-content")
      section.classList.remove("is-collapsed")
      body.appendChild(section)
      panel.appendChild(body)

      let dragStart: { x: number; y: number; left: number; top: number } | null = null
      header.addEventListener("pointerdown", event => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(".floating-panel-control")
        ) {
          return
        }
        if (event.button !== 0) {
          return
        }
        const rect = panel.getBoundingClientRect()
        panel.style.left = `${rect.left}px`
        panel.style.top = `${rect.top}px`
        panel.style.transform = "none"
        panel.dataset.userPosition = "true"
        dragStart = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
        header.setPointerCapture(event.pointerId)
        event.preventDefault()
      })
      header.addEventListener("pointermove", event => {
        if (!dragStart) {
          return
        }
        const dx = event.clientX - dragStart.x
        const dy = event.clientY - dragStart.y
        panel.style.left = `${dragStart.left + dx}px`
        panel.style.top = `${dragStart.top + dy}px`
      })
      header.addEventListener("pointerup", event => {
        if (!dragStart) {
          return
        }
        dragStart = null
        header.releasePointerCapture(event.pointerId)
      })
      header.addEventListener("pointerleave", event => {
        if (!dragStart) {
          return
        }
        dragStart = null
        header.releasePointerCapture(event.pointerId)
      })

      minimizeButton.addEventListener("click", event => {
        event.stopPropagation()
        panel.classList.toggle("is-minimized")
      })
      closeButton.addEventListener("click", event => {
        event.stopPropagation()
        panel.classList.remove("is-open")
      })

      container.appendChild(panel)
      attributePanels.set(id, panel)
      return panel
    }

    const openPanel = (id: string) => {
      const panel = attributePanels.get(id)
      if (!panel) {
        return
      }
      panel.classList.add("is-open")
      panel.classList.remove("is-minimized")
      if (!panel.dataset.userPosition) {
        // Centre new floating menus over the cutter, rather than anchoring
        // them beside the left-side attributes host. User-dragged positions
        // are deliberately left untouched.
        const cutterRect = document.getElementById("preview-frame")?.getBoundingClientRect()
        const hostRect = attributesPanelHost.getBoundingClientRect()
        const panelWidth = panel.getBoundingClientRect().width || 320
        const cutterCentreX = cutterRect ? cutterRect.left + cutterRect.width / 2 : window.innerWidth / 2
        panel.style.left = `${Math.max(12, Math.min(window.innerWidth - panelWidth - 12, cutterCentreX - panelWidth / 2))}px`
        panel.style.top = `${Math.max(24, hostRect.top - 40)}px`
        panel.style.transform = "none"
      }
    }

    const createMenuButton = (
      groupId: string,
      id: string,
      label: string,
      iconSrc?: string,
      iconText?: string,
      onClick?: () => void
    ) => {
      const target = groupBodies.get(groupId)
      if (!target) {
        return null
      }
      const button = document.createElement("button")
      button.type = "button"
      button.className = "attributes-menu-item"
      button.setAttribute("title", label)
      button.setAttribute("aria-label", label)
      button.setAttribute("data-tooltip", label)
      const icon = document.createElement("span")
      icon.className = "attributes-menu-icon"
      const mappedIcons = ATTRIBUTE_ICONS[id]
      const vectorIcon = createStudioIcon(id)
      if (vectorIcon) {
        icon.appendChild(vectorIcon)
      } else if (mappedIcons) {
        const img = document.createElement("img")
        img.src = mappedIcons.static
        img.alt = ""
        icon.appendChild(img)
        const setHover = (active: boolean) => {
          img.src = active ? mappedIcons.hover : mappedIcons.static
        }
        button.addEventListener("mouseenter", () => setHover(true))
        button.addEventListener("mouseleave", () => setHover(false))
        button.addEventListener("focus", () => setHover(true))
        button.addEventListener("blur", () => setHover(false))
      } else if (iconSrc) {
        const img = document.createElement("img")
        img.src = iconSrc
        img.alt = ""
        icon.appendChild(img)
      } else if (iconText) {
        icon.classList.add("is-text")
        if (iconText.includes("\n")) {
          icon.classList.add("is-stacked")
          iconText.split("\n").forEach(line => {
            const lineEl = document.createElement("span")
            lineEl.textContent = line
            icon.appendChild(lineEl)
          })
        } else {
          icon.textContent = iconText
        }
      }
      button.appendChild(icon)
      const caption = document.createElement("span")
      caption.className = "attributes-menu-label"
      caption.textContent = label
      button.appendChild(caption)
      button.addEventListener("click", () => {
        const focusedLayerId = resolveLayerFocusFromAttribute(id)
        if (onClick) {
          onClick()
          if (focusedLayerId) {
            onFocusLayer?.(focusedLayerId)
          }
          return
        }
        if (triggerQuickAddFromMenu(id)) {
          if (focusedLayerId) {
            onFocusLayer?.(focusedLayerId)
          }
          return
        }
        openPanel(id)
        if (focusedLayerId) {
          onFocusLayer?.(focusedLayerId)
        }
      })
      target.appendChild(button)
      attributeButtons.set(id, button)
      return button
    }

    const triggerQuickAddFromMenu = (id: string) => {
      switch (id) {
        case "fold":
          addFoldLine()
          return true
        case "safe":
          addSafeZone()
          return true
        case "half-moon":
          addHalfMoonCutout()
          return true
        case "zipper":
          if (spec.doyPouch) {
            spec = setOpeningStyle(spec, "zip", true)
            emitChange()
          }
          return true
        case "tear":
          if (spec.doyPouch) {
            spec = { ...spec, doyPouch: { ...spec.doyPouch, showTearNotch: true } }
            emitChange()
          }
          return true
        case "grip":
          if (spec.doyPouch) {
            spec = setOpeningStyle(spec, "grip", true)
            emitChange()
          }
          return true
        case "barcode":
          setAttributeBoxEnabled("barcode", true)
          return true
        case "qr-code":
          setAttributeBoxEnabled("qr", true)
          return true
        case "bbe":
          setAttributeBoxEnabled("bbe", true)
          return true
        case "clear-strip":
          addPaperStripClearStripAttribute()
          return true
        default:
          return false
      }
    }

    const resolveLayerFocusFromAttribute = (id: string): string | null => {
      switch (id) {
        case "perf":
        case "hole-punch":
        case "hot-needle":
        case "scribe":
          return "perf-lines"
        case "fold":
          return "fold-lines"
        case "safe":
          return "safe-zones"
        case "window":
        case "window-rectangle":
        case "window-circle":
        case "window-oval":
        case "window-rounded-rectangle":
        case "window-triangle":
        case "window-rounded-triangle":
        case "window-half-circle":
          return "windows"
        case "zipper":
          return "zips"
        case "tear":
          return "tear-notches"
        case "grip":
          return "grip-seals"
        case "barcode":
        case "qr-code":
        case "bbe":
        case "clear-strip":
        case "labels":
          return "notes"
        case "hanger":
          return "hanger-slots"
        default:
          return null
      }
    }

    if (foldSection.section) {
      createFloatingPanel("fold", "Fold Lines", foldSection.section)
      createMenuButton("basic", "fold", "Fold Lines", ICON_FOLD)
    }
    if (perfSection.section) {
      createMenuButton("perforation", "perf", "MicroPerf", ICON_PERF, undefined, () => {
        if (!spec.perfs) {
          updatePerfs({})
        }
      })
    }
    if (safeSection.section) {
      createMenuButton("basic", "safe", "Safe Zones", ICON_SAFE_ZONE)
    }
    if (hangerSection.section) {
      const options=document.createElement("div");options.className="labels-option-grid";options.hidden=true
      const button=createMenuButton("die-cut","hanger","Hanger Slots",undefined,"HS",()=>{options.hidden=!options.hidden;button?.setAttribute("aria-expanded",String(!options.hidden))})!
      button.setAttribute("aria-expanded","false")
      const shell=document.createElement("div");shell.className="labels-dropdown";shell.append(button,options);groupBodies.get("die-cut")!.appendChild(shell)
      for(const style of HANGER_SLOT_STYLES){
        const choice=document.createElement("button");choice.type="button";choice.className="labels-option";choice.setAttribute("aria-label",`Add ${style.name}`)
        const icon=document.createElementNS("http://www.w3.org/2000/svg","svg")
        icon.setAttribute("viewBox","-18 -10 36 20");icon.setAttribute("width","60");icon.setAttribute("height","34")
        icon.innerHTML=style.id==="round-hole"?'<circle r="6" fill="none" stroke="currentColor"/>':`<path d="${hangerSlotPath(style.id)}" transform="scale(${style.id==="keyhole-slot"?12:30} ${style.id==="keyhole-slot"?15:10})" fill="none" stroke="currentColor" vector-effect="non-scaling-stroke"/>`
        const caption=document.createElement("span");caption.textContent=style.name;choice.append(icon,caption)
        choice.addEventListener("click",()=>{const slot=createHangerSlot(style.id);spec={...spec,hangerSlots:[slot]};emitChange();onElementAdded?.(`hanger-slot:${slot.id}`);renderHangerSlots()})
        options.append(choice)
      }
      
    }
    if (halfMoonSection?.section) {
      createFloatingPanel("half-moon", "Half-Moon Cut-Out", halfMoonSection.section)
      createMenuButton("die-cut", "half-moon", "Half-Moon Cut-Out", undefined, "HM")
    }
    if (windowSection?.section) {
      createFloatingPanel("window", "Window", windowSection.section)
      createMenuButton("windows", "window-rectangle", "Rectangle", undefined, undefined, () => {
        windowButtons.get("rectangle")?.click()
      })
      createMenuButton("windows", "window-circle", "Circle", undefined, undefined, () => {
        windowButtons.get("circle")?.click()
      })
      createMenuButton("windows", "window-oval", "Oval", undefined, undefined, () => {
        windowButtons.get("oval")?.click()
      })
      createMenuButton("windows", "window-rounded-rectangle", "Rounded Rectangle", undefined, undefined, () => {
        windowButtons.get("rounded-rectangle")?.click()
      })
      createMenuButton("windows", "window-triangle", "Triangle", undefined, undefined, () => {
        windowButtons.get("triangle")?.click()
      })
      createMenuButton("windows", "window-rounded-triangle", "Rounded Triangle", undefined, undefined, () => {
        windowButtons.get("rounded-triangle")?.click()
      })
      createMenuButton("windows", "window-half-circle", "Half Circle", undefined, undefined, () => {
        windowButtons.get("half-circle")?.click()
      })
      createMenuButton("windows", "clear-strip", "Clear Strip", undefined, "Paper\nStrip")
    }
    if (zipperSection?.section) {
      createFloatingPanel("zipper", "Grip Seal (Zip)", zipperSection.section)
      createMenuButton("openings", "zipper", "Grip Seal (Zip)", undefined, "ZP")
    }
    if (tearNotchSection?.section) {
      createFloatingPanel("tear", "Tear Notch", tearNotchSection.section)
      createMenuButton("die-cut", "tear", "Tear Notch", undefined, "TN")
    }
    if (gussetArchSection?.section) {
      createMenuButton("basic","gusset-arch","Gusset",undefined,"GA",()=>{
        const toggle=document.querySelector<HTMLButtonElement>('.gusset-dock button[aria-expanded]')
        if(toggle?.getAttribute("aria-expanded")==="false")toggle.click()
      })
    }
    if (sachetStepSection?.section) {
      createFloatingPanel("sachet-step", "Stepping", sachetStepSection.section)

    }
    if (sachetTearSection?.section) {
      createFloatingPanel("sachet-tear", "Sachet Tear Notch", sachetTearSection.section)
      createMenuButton("sachet-tear", "Sachet Tear Notch", undefined, "SN")
    }
    if (gripSection?.section) {
      createFloatingPanel("grip", "Grip Seal (Default)", gripSection.section)
      createMenuButton("openings", "grip", "Grip Seal (Default)", undefined, "GS")
    }
    if (barcodeSection?.section) {
      createFloatingPanel("barcode", "Barcodes", barcodeSection.section)
      createMenuButton("barcodes", "barcode", "Barcode", undefined, "BC")
    }
    if (qrSection?.section) {
      createFloatingPanel("qrcode", "QR Code", qrSection.section)
      createMenuButton("barcodes", "qr-code", "QR Code")
    }
    if (bbeSection?.section) {
      createFloatingPanel("bbe", "BBE Box", bbeSection.section)
      createMenuButton("barcodes", "bbe", "BBE Box", undefined, "BBE")
    }
    if (labelSection?.section) {
      const dropdown=(id:string,title:string)=>{
        const options=document.createElement("div");options.className="labels-option-grid";options.hidden=true
        const button=createMenuButton("other",id,title,undefined,undefined,()=>{options.hidden=!options.hidden;button?.setAttribute("aria-expanded",String(!options.hidden))})!
        button.setAttribute("aria-expanded","false")
        const shell=document.createElement("div");shell.className="labels-dropdown";shell.append(button,options);groupBodies.get("other")!.appendChild(shell)
        return options
      }
      const directions=dropdown("text-direction","Text Direction")
      for(const code of [1,2,3,4]){
        const button=document.createElement("button");button.type="button";button.className="labels-option";button.setAttribute("aria-label",`Add Text Direction PIFA ${code}`)
        const icon=createStudioIcon("text-direction")!;icon.style.transform=`rotate(${PIFA_ROTATIONS[code-1]}deg)`
        const caption=document.createElement("span");caption.textContent=`PIFA ${code}`;button.append(icon,caption)
        button.addEventListener("click",()=>{spec=addTextDirection(spec,code);emitChange("engine-action")});directions.appendChild(button)
      }
      const tags=dropdown("labels","Tags / Labels")
      for(const option of [{key:"fop",label:"FOP"},{key:"bop",label:"BOP"},{key:"seal-area",label:"SEAL AREA"},{key:"text-this-way",label:"TEXT THIS WAY"},{key:"clear-window",label:"CLEAR WINDOW"},{key:"side-seal",label:"SIDE SEAL"},{key:"top-seal",label:"TOP SEAL"},{key:"bottom-seal",label:"BOTTOM SEAL"}]){
        const button=document.createElement("button");button.type="button";button.className="labels-option";button.setAttribute("aria-label",`Add ${option.label} label`)
        const icon=createStudioIcon(`label-${option.key}`)??createStudioIcon("labels")!
        const caption=document.createElement("span");caption.textContent=option.label;button.append(icon,caption)
        button.addEventListener("click",()=>setLabelCount(option.key,option.label,getLabelCount(option.key)+1));tags.appendChild(button)
      }
      for (const [id,title] of [["custom-measure","Custom Measure"],["custom-label","Custom Label"]]) {
        const button=createMenuButton("other",id,title,undefined,id==="custom-measure"?"↔":"Aa")
        if(button){button.disabled=true;button.classList.add("is-disabled");button.title=title+" · Coming soon"}
      }
    }
    createMenuButton("perforation", "hole-punch", "Hole Punch")
    createMenuButton("perforation", "hot-needle", "Hot Needle")
    createMenuButton("perforation", "scribe", "Scribe")
    syncLiddingMenus()
  }

  const safeZoneList = document.createElement("div")
  safeZoneList.className = "safe-zone-list"


  const halfMoonList = document.createElement("div")
  halfMoonList.className = "safe-zone-list"

  const windowList = document.createElement("div")
  windowList.className = "safe-zone-list"

  const labelList = document.createElement("div")
  labelList.className = "safe-zone-list"

  const foldLineList = document.createElement("div")
  foldLineList.className = "fold-line-list"

  const perfLaneList = document.createElement("div")
  perfLaneList.className = "safe-zone-list"

  const addPerfLaneButton = document.createElement("button")
  addPerfLaneButton.type = "button"
  addPerfLaneButton.className = "ghost"
  addPerfLaneButton.textContent = "+"

  const addFoldLineButton = document.createElement("button")
  addFoldLineButton.type = "button"
  addFoldLineButton.className = "ghost icon-button fold-line-add-button"
  addFoldLineButton.setAttribute("aria-label", "Add fold line")
  const addFoldLineIcon = document.createElement("img")
  addFoldLineIcon.alt = ""
  const addFoldLineIconState = applyIconButtonStates(addFoldLineButton, addFoldLineIcon, {
    static: ICON_UI_PLUS_STATIC,
    active: ICON_UI_PLUS_CLICKED,
    activeDurationMs: 1500
  })
  addFoldLineButton.appendChild(addFoldLineIcon)

  const addSafeZoneButton = document.createElement("button")
  addSafeZoneButton.type = "button"
  addSafeZoneButton.className = "ghost icon-button"
  addSafeZoneButton.setAttribute("aria-label", "Add safe zone")
  const addSafeZoneIcon = document.createElement("img")
  addSafeZoneIcon.src = ICON_SAFE_ZONE
  addSafeZoneIcon.alt = ""
  addSafeZoneButton.appendChild(addSafeZoneIcon)

  const addHangerSlotButton = document.createElement("button")
  addHangerSlotButton.type = "button"
  addHangerSlotButton.className = "ghost"
  addHangerSlotButton.textContent = spec.kSealPouch ? "TAC Hole" : "Round Hole"

  const addEuroSlotButton = document.createElement("button")
  addEuroSlotButton.type = "button"
  addEuroSlotButton.className = "ghost"
  addEuroSlotButton.textContent = "Standard Euro Slot"

  const addKeyholeSlotButton = document.createElement("button")
  addKeyholeSlotButton.type = "button"
  addKeyholeSlotButton.className = "ghost"
  addKeyholeSlotButton.textContent = "Keyhole Euro Slot"

  const addHalfMoonButton = document.createElement("button")
  addHalfMoonButton.type = "button"
  addHalfMoonButton.className = "ghost"
  addHalfMoonButton.textContent = "Half-Moon Cut-Out"

  const labelOptions = [
    { key: "fop", label: "FOP" },
    { key: "bop", label: "BOP" },
    { key: "seal-area", label: "SEAL AREA" },
    { key: "text-this-way", label: "TEXT THIS WAY" },
    { key: "clear-window", label: "CLEAR WINDOW" },
    { key: "side-seal", label: "SIDE SEAL" },
    { key: "top-seal", label: "TOP SEAL" },
    { key: "bottom-seal", label: "BOTTOM SEAL" }
  ]
  const labelCountInputs = new Map<string, HTMLInputElement>()

  const getLabelCount = (key: string) =>
    spec.attributeBoxes?.filter(
      box => box.kind === "label" && box.labelKey === key && box.enabled !== false
    ).length ?? 0

  const getLabelBaseSize = (label: string) => {
    const baseWidth = Math.min(
      60,
      Math.max(16, spec.width * 0.18, label.length * 3)
    )
    const baseHeight = Math.min(20, Math.max(6, spec.height * 0.05))
    return { width: baseWidth, height: baseHeight }
  }

  const setLabelCount = (key: string, label: string, count: number) => {
    const target = Math.max(0, Math.round(count))
    const boxes = spec.attributeBoxes ? [...spec.attributeBoxes] : []
    const existing = boxes.filter(
      box => box.kind === "label" && box.labelKey === key
    )
    const remaining = boxes.filter(
      box => box.kind !== "label" || box.labelKey !== key
    )
    const geometry = resolveFlowwrapGeometry(spec)
    const liveWidth = Math.max(4, geometry.liveRect.width)
    const liveHeight = Math.max(4, geometry.liveRect.height)
    const baseSize = getLabelBaseSize(label)
    const next = [...remaining, ...existing.slice(0, target)]
    let addedId: string | null = null

    for (let i = existing.length; i < target; i += 1) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = Math.min(
        liveWidth - baseSize.width - 2,
        4 + col * (baseSize.width + 4)
      )
      const y = Math.min(
        liveHeight - baseSize.height - 2,
        4 + row * (baseSize.height + 4)
      )
      const id = `label-${key}-${Date.now()}-${i}`
      addedId ??= id
      next.push({
        id,
        kind: "label",
        labelKey: key,
        label,
        x,
        y,
        width: baseSize.width,
        height: baseSize.height,
        enabled: true,
        selected: false
      })
    }

    spec = { ...spec, attributeBoxes: next }
    emitChange()
    if (addedId) onElementAdded?.(`attribute-box:${addedId}`)
  }

  const labelFields = labelOptions.map(option => {
    const field = createNumberInput(
      option.label,
      getLabelCount(option.key),
      { min: 0, step: 1 },
      next => setLabelCount(option.key, option.label, next)
    )
    labelCountInputs.set(option.key, field.input)
    return field.field
  })

  const sachetStepToggle = createToggle(
    "Step Cutter",
    spec.sachet?.stepEnabled ?? false,
    next => updateSachet({ stepEnabled: next })
  )
  const sachetStepInput = sachetStepToggle.querySelector("input")
  const sachetLaneField = createNumberInput(
    "Lanes across",
    spec.sachet?.stepCount ?? 1,
    { min: 1, step: 1 },
    next => updateSachet({ stepCount: Math.max(1, Math.round(next)) })
  )
  const sachetTrackField = createSelect(
    "Trim Position",
    spec.sachet?.trimPosition ?? spec.sachet?.trackSide ?? "left",
    [
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
      { value: "both", label: "Both" }
    ],
    next => updateSachet({ trimPosition: next as "left" | "right" | "both" })
  )

  const sachetTearToggle = createToggle(
    "Enable Tear Notch",
    spec.sachet?.tearNotch?.enabled ?? false,
    next => updateSachet({ tearNotch: { enabled: next } })
  )
  const sachetTearInput = sachetTearToggle.querySelector("input")
  const sachetTearStyleField = createSelect(
    "Tear Style",
    spec.sachet?.tearNotch?.style ?? "triangle",
    [
      { value: "jagged", label: "Jagged Edge" },
      { value: "halfmoon", label: "Halfmoon" },
      { value: "triangle", label: "Triangle" }
    ],
    next => updateSachet({ tearNotch: { style: next as "jagged" | "halfmoon" | "triangle" } })
  )
  const sachetTearOffsetField = createNumberInput(
    "Offset X (mm)",
    spec.sachet?.tearNotch?.offsetX ?? 6,
    { min: 0, step: 1 },
    next => updateSachet({ tearNotch: { offsetX: next } })
  )
  const sachetTearWidthField = createNumberInput(
    "Width (mm)",
    spec.sachet?.tearNotch?.width ?? 6,
    { min: 1, step: 1 },
    next => updateSachet({ tearNotch: { width: next } })
  )
  const sachetTearDepthField = createNumberInput(
    "Depth (mm)",
    spec.sachet?.tearNotch?.depth ?? 3,
    { min: 1, step: 1 },
    next => updateSachet({ tearNotch: { depth: next } })
  )

  function emitChange(reason: ControlsSpecChangeReason = "controls-edit") {
    specSynchroniser.emitUserChange({
      ...spec,
      safeZones: spec.safeZones ? [...spec.safeZones] : [],
      attributeBoxes: spec.attributeBoxes ? [...spec.attributeBoxes] : [],
      windows: spec.windows ? [...spec.windows] : [],
      hangerSlots: spec.hangerSlots ? [...spec.hangerSlots] : [],
      halfMoonCutouts: spec.halfMoonCutouts ? [...spec.halfMoonCutouts] : []
    }, reason)
  }

  let refreshPerfFields = () => {}
  let perfMeasureToggle: ReturnType<typeof createTogglePair> | null = null
  let perfMeasuresMenuItem: HTMLButtonElement | null = null
  let perfMeasuresEnabled = false

  const normalizePerfLanes = (base: NonNullable<FlowwrapSpec["perfs"]>) => {
    const lanes = base.lanes?.length
      ? base.lanes
      : [{ originX: base.originX, originY: base.originY }]
    return lanes.map(lane => ({
      ...lane,
      style: lane.style ?? base.style ?? DEFAULT_PERF_STYLE,
      color: lane.color ?? base.color ?? DEFAULT_PERF_COLOR,
      fillColor: lane.fillColor ?? base.fillColor ?? lane.color ?? base.color ?? DEFAULT_PERF_COLOR,
      fillOpacity: Math.max(0, Math.min(1, lane.fillOpacity ?? base.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)),
      strokeColor:
        lane.fillColor ??
        lane.color ??
        base.fillColor ??
        base.color ??
        DEFAULT_PERF_COLOR,
      strokeWidth: Math.max(0.1, Math.min(6, lane.strokeWidth ?? base.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)),
      diameter: Math.max(0.1, Math.min(12, lane.diameter ?? base.diameter))
    }))
  }

  function updatePerfs(updates: Partial<FlowwrapSpec["perfs"]>) {
    const created = !spec.perfs
    const base = spec.perfs ?? {
      mode: "continuous",
      count: DEFAULT_PERF_COUNT,
      separation: DEFAULT_PERF_SEPARATION,
      originX: MIN_SEAL_CLEARANCE_MM,
      originY: MIN_SEAL_CLEARANCE_MM,
      diameter: DEFAULT_PERF_DIAMETER,
      sealEdge: "top",
      style: DEFAULT_PERF_STYLE,
      color: DEFAULT_PERF_COLOR,
      fillColor: DEFAULT_PERF_COLOR,
      fillOpacity: DEFAULT_PERF_FILL_OPACITY,
      strokeColor: DEFAULT_PERF_COLOR,
      strokeWidth: DEFAULT_PERF_STROKE_WIDTH
    }
    const lanes = normalizePerfLanes(base)
    spec = { ...spec, perfs: { ...base, ...updates } }
    if (spec.perfs) {
      spec.perfs.diameter = Math.max(0.1, Math.min(12, spec.perfs.diameter))
      spec.perfs.style = spec.perfs.style ?? DEFAULT_PERF_STYLE
      spec.perfs.color = spec.perfs.color ?? DEFAULT_PERF_COLOR
      spec.perfs.fillColor = spec.perfs.fillColor ?? spec.perfs.color
      spec.perfs.fillOpacity = Math.max(
        0,
        Math.min(1, spec.perfs.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)
      )
      spec.perfs.strokeColor =
        spec.perfs.fillColor ?? spec.perfs.color ?? DEFAULT_PERF_COLOR
      spec.perfs.strokeWidth = Math.max(
        0.1,
        Math.min(6, spec.perfs.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)
      )
      spec.perfs.lanes = lanes.map((lane, index) => ({
        ...lane,
        ...(spec.perfs?.lanes?.[index] ?? {})
      }))
    }
    emitChange()
    if (created) onElementAdded?.("perf-lane:0")
    refreshPerfFields()
  }

  function withKSealDerivedSize(source: FlowwrapSpec): FlowwrapSpec {
    if (!source.kSealPouch) {
      return source
    }
    const geometry = resolveKSealPouchGeometry(source)
    return {
      ...source,
      width: geometry.renderedWidth,
      height: geometry.renderedHeight,
      seal: geometry.sideSeal,
      seals: {
        top: geometry.sideSeal,
        bottom: geometry.sideSeal,
        left: geometry.trimWidth,
        right: geometry.trimWidth
      }
    }
  }

  function coerceKSealEyeMarks(source: FlowwrapSpec): FlowwrapSpec {
    if (!source.kSealPouch || !source.eyeMarks) {
      return source
    }
    const geometry = resolveKSealPouchGeometry(source)
    const nextEyeMarks = { ...source.eyeMarks }
    if (
      !geometry.trimEnabled &&
      nextEyeMarks.count === 2
    ) {
      nextEyeMarks.count = 1
      nextEyeMarks.position = "centre"
      nextEyeMarks.offsetX2 = undefined
      nextEyeMarks.offsetY2 = undefined
      nextEyeMarks.manualPositioned2 = false
    } else if (nextEyeMarks.count === 2) {
      nextEyeMarks.position = "centre"
    } else if (nextEyeMarks.count === 1) {
      nextEyeMarks.position = "centre"
    }
    return {
      ...source,
      eyeMarks: nextEyeMarks
    }
  }

  function updateKSealPouch(
    updates: Partial<NonNullable<FlowwrapSpec["kSealPouch"]>>
  ) {
    if (!spec.kSealPouch) {
      return
    }
    const previousTrimWidth = resolveKSealPouchGeometry(spec).trimWidth
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value))
    const nextKSeal = {
      ...spec.kSealPouch,
      ...updates
    }
    if (updates.sideSeal !== undefined) {
      nextKSeal.sideSeal = clamp(updates.sideSeal, 5, 20)
      nextKSeal.sealWidth = nextKSeal.sideSeal
    }
    if (updates.bottomSeal !== undefined) {
      nextKSeal.bottomSeal = Math.max(0.1, updates.bottomSeal)
    }
    if (updates.gussetSize !== undefined) {
      nextKSeal.gussetSize = Math.max(0, updates.gussetSize)
      nextKSeal.gussetDepth = nextKSeal.gussetSize
    }
    if (updates.armDegree !== undefined) {
      nextKSeal.armDegree = clamp(updates.armDegree, 30, 60)
      nextKSeal.customArmDegreeEnabled = true
    }
    if (updates.armWidth !== undefined) {
      nextKSeal.armWidth = clamp(updates.armWidth, 5, 20)
    }
    if (updates.trim !== undefined) {
      nextKSeal.trim = Math.min(25, Math.max(5, updates.trim))
    }
    if (updates.pouchHeight !== undefined) {
      nextKSeal.pouchHeight = Math.max(1, updates.pouchHeight)
    }
    if (updates.pouchWidth !== undefined) {
      nextKSeal.pouchWidth = Math.max(1, updates.pouchWidth)
    }
    let nextSpec = coerceKSealEyeMarks(
      withKSealDerivedSize({
        ...spec,
        kSealPouch: nextKSeal
      })
    )
    for(const key of ["sideSeal","bottomSeal","gussetSize","armDegree","armWidth"] as const){
      if(updates[key]!==undefined)nextSpec=updateGussetControl(nextSpec,key,updates[key]!)
    }
    if (
      nextSpec.eyeMarks?.count === 2 &&
      (updates.trim !== undefined || updates.trimEnabled !== undefined)
    ) {
      const nextTrimWidth = resolveKSealPouchGeometry(nextSpec).trimWidth
      nextSpec = {
        ...nextSpec,
        eyeMarks: reconcileKSealDualEyemarksForTrim(
          nextSpec.eyeMarks,
          previousTrimWidth,
          nextTrimWidth
        )
      }
    }
    spec = centreKSealTacHoles(nextSpec)
    emitChange()
    refreshBaseEyemarkCountUi()
    syncBaseEyemarkSizeInputs()
    syncBaseTrimControls()
  }

  function updateDoyPouch(
    updates: Partial<NonNullable<FlowwrapSpec["doyPouch"]>>
  ) {
    if (!spec.doyPouch) {
      return
    }
    const nextDoy = { ...spec.doyPouch, ...updates }
    if (updates.trim !== undefined) {
      nextDoy.trim = Math.min(25, Math.max(5, updates.trim))
    }
    spec = { ...spec, doyPouch: nextDoy }
    if (!nextDoy.trimEnabled && spec.eyeMarks?.count === 2) {
      spec = { ...spec, eyeMarks: { ...spec.eyeMarks, count: 1, position: "top-left", offsetX2: undefined, offsetY2: undefined, manualPositioned2: false } }
    }
    emitChange()
    syncBaseTrimControls()
    refreshBaseEyemarkCountUi()
  }

  spec = coerceKSealEyeMarks(withKSealDerivedSize(spec))

  function updateEyeMarks(updates: Partial<FlowwrapSpec["eyeMarks"]>) {
    if (updates.count === 2 && spec.doyPouch && !spec.kSealPouch && !spec.doyPouch.trimEnabled) return
    const base = spec.eyeMarks ?? {
      count: 1,
      position: "top-left",
      width: DEFAULT_EYEMARK_WIDTH,
      height: DEFAULT_EYEMARK_HEIGHT,
      width2: DEFAULT_EYEMARK_WIDTH,
      height2: DEFAULT_EYEMARK_HEIGHT,
      color: "black"
    }
    const previousCount = base.count ?? 1
    const nextEyeMarks = { ...base, ...updates }
    if (nextEyeMarks.count === 1) {
      const validSingle = new Set([
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "centre",
        "centre-left",
        "centre-right"
      ])
      if (!validSingle.has(nextEyeMarks.position)) {
        nextEyeMarks.position = "top-left"
      }
      nextEyeMarks.offsetX2 = undefined
      nextEyeMarks.offsetY2 = undefined
      nextEyeMarks.manualPositioned2 = false
    } else if (nextEyeMarks.count === 2) {
      const validDouble = new Set(["top", "bottom", "centre"])
      if (!validDouble.has(nextEyeMarks.position)) {
        nextEyeMarks.position = "top"
      }
      if (previousCount !== 2) {
        if (spec.kSealPouch) {
          Object.assign(
            nextEyeMarks,
            createKSealEyemarkDefaults(2, resolveKSealPouchGeometry(spec).trimWidth)
          )
        }
        nextEyeMarks.offsetX2 = undefined
        nextEyeMarks.offsetY2 = undefined
        nextEyeMarks.manualPositioned2 = false
      }
      if (spec.kSealPouch) {
        const trimWidth = resolveKSealPouchGeometry(spec).trimWidth
        const maximumWidth = getKSealDualEyemarkTarget(trimWidth)
        nextEyeMarks.width = Math.min(
          maximumWidth,
          Math.max(0.1, nextEyeMarks.width)
        )
        nextEyeMarks.height = Math.max(0.1, nextEyeMarks.height)
        nextEyeMarks.width2 = Math.min(
          maximumWidth,
          Math.max(0.1, nextEyeMarks.width2 ?? nextEyeMarks.width)
        )
        nextEyeMarks.height2 = Math.max(
          0.1,
          nextEyeMarks.height2 ?? nextEyeMarks.height
        )
        nextEyeMarks.offsetX = clampKSealDualEyemarkOffset(
          trimWidth,
          nextEyeMarks.width,
          nextEyeMarks.offsetX ?? 0
        )
        nextEyeMarks.offsetX2 = clampKSealDualEyemarkOffset(
          trimWidth,
          nextEyeMarks.width2,
          nextEyeMarks.offsetX2 ?? 0
        )
      }
    }
    if (spec.kSealPouch && nextEyeMarks.count === 1 && previousCount !== 1) {
      Object.assign(
        nextEyeMarks,
        createKSealEyemarkDefaults(1, resolveKSealPouchGeometry(spec).trimWidth)
      )
    }
    spec = coerceKSealEyeMarks({ ...spec, eyeMarks: nextEyeMarks })
    emitChange()
    refreshBaseEyemarkCountUi()
    syncBaseEyemarkSizeInputs()
  }

  const applyBridgeEyemarkCount = (count: 1 | 2) => {
    if (count === 2 && spec.doyPouch && !spec.kSealPouch && !spec.doyPouch.trimEnabled) return false
    const bridgeResponse = runEngineRequest({
      requestId: `eyemark-count-${Date.now()}`,
      engine: "cutter",
      action: "setEyemarkCount",
      payload: {
        eyeMarks: spec.eyeMarks,
        count
      },
      meta: {
        source: "controls-eyemark-count"
      }
    })

    if (!bridgeResponse.success || !bridgeResponse.updatedState?.eyeMarks) {
      console.warn("[CutNFlow][Engine API Bridge] Eyemark count action failed.", bridgeResponse.errors)
      return false
    }

    const updatedEyeMarks = bridgeResponse.updatedState.eyeMarks
    spec = {
      ...spec,
      eyeMarks: spec.kSealPouch
        ? {
            ...updatedEyeMarks,
            ...createKSealEyemarkDefaults(
              count,
              resolveKSealPouchGeometry(spec).trimWidth
            )
          }
        : updatedEyeMarks
    }
    spec = coerceKSealEyeMarks(spec)
    emitChange("engine-action")
    refreshBaseEyemarkCountUi()
    syncBaseEyemarkSizeInputs()
    return true
  }

  function updateSafeZone(index: number, updates: Partial<SafeZoneSpec>) {
    if (!spec.safeZones) {
      return
    }
    spec.safeZones = spec.safeZones.map((zone: SafeZoneSpec, i: number) =>
      i === index ? cloneZone(zone, updates) : zone
    )
    emitChange()
    renderSafeZones()
  }

  function removeSafeZone(index: number) {
    if (!spec.safeZones) {
      return
    }
    spec.safeZones = spec.safeZones.filter((_: SafeZoneSpec, i: number) => i !== index)
    emitChange()
    renderSafeZones()
  }

  function createHangerSlot(subtype: HangerSlotSpec["subtype"]): HangerSlotSpec {
    const geometry = resolveFlowwrapGeometry(spec)
    const liveWidth = geometry.liveRect.width
    const liveHeight = geometry.liveRect.height
    const isEuro = subtype !== "round-hole"
    const diameter = clampHangerSlotDiameter(DEFAULT_HANGER_SLOT_DIAMETER, liveWidth)
    const width = isEuro
      ? clampHangerSlotWidth(subtype==="keyhole-slot"?12:DEFAULT_HANGER_SLOT_WIDTH, liveWidth)
      : diameter
    const height = isEuro ? clampHangerSlotHeight(subtype==="keyhole-slot"?15:DEFAULT_HANGER_SLOT_HEIGHT) : diameter
    const slot: HangerSlotSpec = {
      id: `hanger-${Date.now()}`,
      type: "hanger-slot",
      subtype,
      diameter,
      width: isEuro ? width : undefined,
      height: isEuro ? height : undefined,
      centerX: 0,
      centerY: 0,
      mirrored: true,
      placementVersion: 4
    }
    return { ...slot, ...getDefaultHangerSlotPosition(spec, slot) }
  }

  function updateHangerSlot(updates: Partial<HangerSlotSpec>) {
    const slot = spec.hangerSlots?.[0]
    if (!slot) {
      return
    }
    const geometry = resolveFlowwrapGeometry(spec)
    const liveWidth = geometry.liveRect.width
    const liveHeight = geometry.liveRect.height
    const isEuro =
      slot.subtype !== "round-hole"
    const nextDiameter = clampHangerSlotDiameter(
      updates.diameter ?? slot.diameter,
      liveWidth
    )
    let nextWidth = isEuro
      ? clampHangerSlotWidth(updates.width ?? slot.width ?? nextDiameter, liveWidth)
      : nextDiameter
    let nextHeight = isEuro
      ? clampHangerSlotHeight(updates.height ?? slot.height ?? nextDiameter)
      : nextDiameter
    if (isEuro) {
      const baseWidth = slot.width ?? DEFAULT_HANGER_SLOT_WIDTH
      const baseHeight = slot.height ?? DEFAULT_HANGER_SLOT_HEIGHT
      const desiredScale=updates.width!==undefined?updates.width/baseWidth:updates.height!==undefined?updates.height/baseHeight:1
      const minScale=Math.max(HANGER_SLOT_MIN_WIDTH_MM/baseWidth,HANGER_SLOT_MIN_DIAMETER_MM/baseHeight)
      const cutterHalf=spec.width/2-HANGER_SLOT_SIDE_CLEARANCE_MM
      const maxScale=Math.max(minScale,Math.min(HANGER_SLOT_MAX_WIDTH_MM/baseWidth,HANGER_SLOT_MAX_DIAMETER_MM/baseHeight,cutterHalf/Math.max(.001,getHangerSlotHalfWidth(slot))))
      const scale=Math.max(minScale,Math.min(maxScale,desiredScale))
      nextWidth=baseWidth*scale
      nextHeight=baseHeight*scale
    }
    const halfWidth = getHangerSlotHalfWidth({
      id: slot.id,
      type: "hanger-slot",
      subtype: slot.subtype,
      diameter: nextDiameter,
      width: nextWidth,
      height: nextHeight,
      centerX: slot.centerX,
      centerY: slot.centerY,
      mirrored: true
    })
    const halfHeight = getHangerSlotHalfHeight({
      id: slot.id,
      type: "hanger-slot",
      subtype: slot.subtype,
      diameter: nextDiameter,
      width: nextWidth,
      height: nextHeight,
      centerX: slot.centerX,
      centerY: slot.centerY,
      mirrored: true
    })
    const maxCenterY = Math.max(halfHeight, liveHeight - halfHeight)
    const isTacHole = Boolean(spec.kSealPouch && isKSealTacHole(slot))
    const nextCenterY = isTacHole
      ? getKSealTacCentreY(nextDiameter)
      : updates.centerY ?? slot.centerY
    const nextCenterX = isTacHole
      ? getKSealTacCentreX(spec, nextDiameter)
      : getHangerSlotAxisX({ ...slot, width: nextWidth, height: nextHeight, diameter: nextDiameter },liveWidth,geometry.seals.left)
    const updatedSlot: HangerSlotSpec = {
      ...slot,
      ...updates,
      diameter: nextDiameter,
      width: isEuro ? nextWidth : undefined,
      height: isEuro ? nextHeight : undefined,
      centerX: nextCenterX,
      centerY: Math.min(maxCenterY, Math.max(halfHeight, nextCenterY))
    }
    const nextSlot = isTacHole ? clampKSealTacHole(spec, updatedSlot) : updatedSlot
    spec = { ...spec, hangerSlots: [nextSlot] }
    emitChange()
    renderHangerSlots()
  }

  function removeHangerSlot() {
    spec = { ...spec, hangerSlots: [] }
    emitChange()
    renderHangerSlots()
  }

  function renderHangerSlots() {
    hangerSlotList.innerHTML = ""
    const slot = spec.hangerSlots?.[0]
    if (!slot) {
      return
    }

    const row = document.createElement("div")
    row.className = "safe-zone-row"

    const header = document.createElement("div")
    header.className = "safe-zone-header"

    const title = document.createElement("strong")
    title.textContent = HANGER_SLOT_STYLES.find(style=>style.id===slot.subtype)?.name ?? "Hanger Slot"

    const removeButton = document.createElement("button")
    removeButton.type = "button"
    removeButton.className = "icon-button"
    removeButton.setAttribute("aria-label", "Remove hanger slot")
    const removeIcon = document.createElement("img")
    removeIcon.src = ICON_TRASH
    removeIcon.alt = ""
    removeButton.appendChild(removeIcon)
    removeButton.addEventListener("click", () => removeHangerSlot())

    header.appendChild(title)
    if (slot.purpose !== "tac-hole") {
      const centre = document.createElement("button")
      centre.type = "button"
      centre.textContent = "Centre on pack"
      centre.addEventListener("click", () => updateHangerSlot({
        ...getDefaultHangerSlotPosition(spec, slot), placementVersion: 4
      }))
      header.appendChild(centre)
    }
    header.appendChild(removeButton)

    const fields = document.createElement("div")
    fields.className = "safe-zone-fields"

    if (slot.subtype !== "round-hole") {
      const widthField = createNumberInput(
        "Width (mm)",
        slot.width ?? DEFAULT_HANGER_SLOT_WIDTH,
        { min: HANGER_SLOT_MIN_WIDTH_MM, step: 0.1 },
        next => updateHangerSlot({ width: next })
      )
      widthField.input.max = HANGER_SLOT_MAX_WIDTH_MM.toString()
      fields.appendChild(widthField.field)
      const heightField = createNumberInput(
        "Height (mm)",
        slot.height ?? DEFAULT_HANGER_SLOT_HEIGHT,
        { min: HANGER_SLOT_MIN_DIAMETER_MM, step: 0.1 },
        next => updateHangerSlot({ height: next })
      )
      heightField.input.max = HANGER_SLOT_MAX_DIAMETER_MM.toString()
      fields.appendChild(heightField.field)
    } else {
      const diameterField = createNumberInput(
        "Diameter (mm)",
        slot.diameter,
        { min: HANGER_SLOT_MIN_DIAMETER_MM, step: 0.1 },
        next => updateHangerSlot({ diameter: next })
      )
      diameterField.input.max = HANGER_SLOT_MAX_DIAMETER_MM.toString()
      fields.appendChild(diameterField.field)
    }

    row.appendChild(header)
    row.appendChild(fields)
    const guidance=document.createElement("p")
    guidance.className="panel-note"
    const range=getHangerSlotRecommendedRange(resolveFlowwrapGeometry(spec).liveRect.width,resolveFlowwrapGeometry(spec).liveRect.height)
    guidance.textContent=`Recommended for this pack: ${range.min}–${range.max}mm; editable range 3–100mm. Keep at least 10mm from the cutter edge.`
    row.appendChild(guidance)
    hangerSlotList.appendChild(row)
  }

  function createHalfMoonCutout(centerX: number): HalfMoonCutoutSpec {
    const geometry = resolveFlowwrapGeometry(spec)
    const radius = clampHalfMoonRadius(spec, DEFAULT_HALF_MOON_RADIUS)
    const centerY = 0
    return {
      id: `half-moon-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      radius,
      centerX,
      centerY,
      alignedCutterEdgeId: "top"
    }
  }

  function updateHalfMoonCutout(
    cutoutId: string,
    updates: Partial<HalfMoonCutoutSpec>
  ) {
    const cutout = spec.halfMoonCutouts?.find(item => item.id === cutoutId)
    if (!cutout) {
      return
    }
    const geometry = resolveFlowwrapGeometry(spec)
    const seals = geometry.seals
    const radius = clampHalfMoonRadius(spec, updates.radius ?? cutout.radius)
    const minX = seals.left + radius
    const maxX = geometry.cutterRect.width - seals.right - radius
    const centerX = Math.min(
      maxX,
      Math.max(minX, updates.centerX ?? cutout.centerX)
    )
    const nextCutout: HalfMoonCutoutSpec = {
      ...cutout,
      ...updates,
      radius,
      centerX,
      centerY: 0,
      alignedCutterEdgeId: "top"
    }
    spec = {
      ...spec,
      halfMoonCutouts: (spec.halfMoonCutouts ?? []).map((item, index, list) => {
        const leftCenterX = nextCutout.centerX
        const liveOriginX = geometry.seals.left
        const liveWidth = Math.max(
          0,
          geometry.cutterRect.width - geometry.seals.left - geometry.seals.right
        )
        const foldCenterX =
          liveOriginX + liveWidth / 2 + (spec.doyPouch?.centerOffsetX ?? 0)
        const mirrored = foldCenterX + (foldCenterX - nextCutout.centerX)
        const rightCenterX = Math.min(
          maxX,
          Math.max(minX, mirrored)
        )
        const useLeft = index === 0
        return {
          ...item,
          radius: nextCutout.radius,
          centerX: useLeft ? leftCenterX : rightCenterX,
          centerY: 0,
          alignedCutterEdgeId: "top"
        }
      })
    }
    emitChange()
    renderHalfMoonCutouts()
  }

  function renderHalfMoonCutouts() {
    halfMoonList.innerHTML = ""
    const cutouts = spec.halfMoonCutouts ?? []
    if (!cutouts.length) {
      return
    }

    const row = document.createElement("div")
    row.className = "safe-zone-row"

    const header = document.createElement("div")
    header.className = "safe-zone-header"

    const title = document.createElement("strong")
    title.textContent = "Half-Moon Cut-Out"

    const removeButton = document.createElement("button")
    removeButton.type = "button"
    removeButton.className = "icon-button"
    removeButton.setAttribute("aria-label", "Remove half-moon cut-out")
    const removeIcon = document.createElement("img")
    removeIcon.src = ICON_TRASH
    removeIcon.alt = ""
    removeButton.appendChild(removeIcon)
    removeButton.addEventListener("click", () => {
      spec = { ...spec, halfMoonCutouts: [] }
      emitChange()
      renderHalfMoonCutouts()
    })

    header.appendChild(title)
    header.appendChild(removeButton)

    const fields = document.createElement("div")
    fields.className = "safe-zone-fields"
    const primary = cutouts[0]

    const radiusField = createNumberInput(
      "Radius (mm)",
      primary.radius,
      { min: 3, step: 1 },
      next => {
        spec = {
          ...spec,
          halfMoonCutouts: cutouts.map(item => ({ ...item, radius: next }))
        }
        emitChange()
        renderHalfMoonCutouts()
      }
    )
    fields.appendChild(radiusField.field)

    const centerXField = createNumberInput(
      "Center X (mm)",
      primary.centerX,
      { min: 0, step: 0.1 },
      next => updateHalfMoonCutout(primary.id, { centerX: next })
    )
    fields.appendChild(centerXField.field)

    row.appendChild(header)
    row.appendChild(fields)
    halfMoonList.appendChild(row)
  }

    function createWindow(shape: WindowShape): WindowSpec {
      const geometry = resolveFlowwrapGeometry(spec)
      const liveWidth = geometry.liveRect.width
      const liveHeight = geometry.liveRect.height
    const width = shape === "circle" ? 20 : 40
    const height = shape === "circle" ? 20 : 20
    const x = Math.max(0, (liveWidth - width) / 2)
    const y = Math.max(0, (liveHeight - height) / 2)
      return {
        id: `window-${Date.now()}`,
        shape,
        x,
        y,
        width,
        height,
        rotation: 0
      }
    }

  function updateWindow(updates: Partial<WindowSpec>) {
    const window = spec.windows?.[0]
    if (!window) {
      return
    }
    const geometry = resolveFlowwrapGeometry(spec)
    const liveWidth = geometry.liveRect.width
    const liveHeight = geometry.liveRect.height
    const minSize = 5
    const width = Math.max(minSize, updates.width ?? window.width)
    const height = Math.max(minSize, updates.height ?? window.height)
    const x = Math.min(
      liveWidth - width,
      Math.max(0, updates.x ?? window.x)
    )
    const y = Math.min(
      liveHeight - height,
      Math.max(0, updates.y ?? window.y)
    )
    const nextWindow: WindowSpec = {
      ...window,
      ...updates,
      width,
      height,
      x,
      y
    }
    spec = { ...spec, windows: [nextWindow] }
    emitChange()
    renderWindows()
  }

  function renderWindows() {
    windowList.innerHTML = ""
    const window = spec.windows?.[0]
    if (!window) {
      return
    }

    const row = document.createElement("div")
    row.className = "safe-zone-row"

    const header = document.createElement("div")
    header.className = "safe-zone-header"

    const title = document.createElement("strong")
    title.textContent = "Window"

    const removeButton = document.createElement("button")
    removeButton.type = "button"
    removeButton.className = "icon-button"
    removeButton.setAttribute("aria-label", "Remove window")
    const removeIcon = document.createElement("img")
    removeIcon.src = ICON_TRASH
    removeIcon.alt = ""
    removeButton.appendChild(removeIcon)
    removeButton.addEventListener("click", () => {
      spec = { ...spec, windows: [] }
      emitChange()
      renderWindows()
    })

    header.appendChild(title)
    header.appendChild(removeButton)

    const fields = document.createElement("div")
    fields.className = "safe-zone-fields"

    const widthField = createNumberInput(
      "Width (mm)",
      window.width,
      { min: 5, step: 0.1 },
      next => updateWindow({ width: next })
    )
    fields.appendChild(widthField.field)

    const heightField = createNumberInput(
      "Height (mm)",
      window.height,
      { min: 5, step: 0.1 },
      next => updateWindow({ height: next })
    )
    fields.appendChild(heightField.field)

    row.appendChild(header)
    row.appendChild(fields)
    windowList.appendChild(row)
  }

  function updatePaperStripStepping(updates: Partial<PaperStripSteppingSpec>) {
    const currentPaperStrip = spec.paperStrip ?? {}
    const currentStepping =
      currentPaperStrip.stepping ?? PAPER_STRIP_DEFAULT_STEPPING
    spec = {
      ...spec,
      paperStrip: {
        ...currentPaperStrip,
        stepping: {
          ...currentStepping,
          ...updates
        }
      }
    }
    emitChange()
  }

  function renderPaperStripControls() {
    const stepping = spec.paperStrip?.stepping
    if (!spec.paperStrip || !stepping) {
      packSpecificPaperStripFields.forEach(field => {
        field.style.display = "none"
      })
      return false
    }

    packSpecificPaperStripFields.forEach(field => {
      field.style.display = ""
    })
    packSpecificSection.section.style.display = "none"
    paperStripStepCountField.input.value = stepping.stepCount.toString()
    paperStripSyncButton.setAttribute("aria-pressed",String(paperStripSynced(spec)))
    paperStripSyncButton.replaceChildren(createStudioIcon(paperStripSynced(spec)?"linked":"unlinked")!,document.createTextNode(paperStripSynced(spec)?"Linked repeats":"Individual repeats"))
    return true
  }

  function renderSachetControls() {
    const sachet = spec.sachet
    if (!sachet) {
      baseEyemarkTrackWidthField.field.style.display = "none"
      packSpecificSachetFields.forEach(field => {
        field.style.display = "none"
      })
      return false
    }
    packSpecificSachetFields.forEach(field => {
      field.style.display = ""
    })
    const is4Side = sachet.stepPair === true
    const is3Side = !is4Side
    packSpecificSection.titleEl.textContent = is4Side
      ? "4 Side Seal Sachet"
      : "Trim Options"
    sachetSteppingCountField.input.value = (sachet.stepCount ?? 1).toString()
    for(const input of [sachetSteppingCountField.input,sachetLaneField.input]){input.step=is4Side?"2":"1";input.min=is4Side?"2":"1"}
    sachetSyncButton.setAttribute("aria-pressed",String(sachetSynced(spec)))
    sachetSyncButton.replaceChildren(createStudioIcon(sachetSynced(spec)?"linked":"unlinked")!,document.createTextNode(sachetSynced(spec)?"Linked repeats":"Individual repeats"))
    sachetSyncButton.title=is4Side?"Linked: A repeats copy A only; B repeats copy B only. Individual: edit each face separately.":"Linked: all repeats copy cutter 1. Individual: edit each cutter separately."
    sachetRightTrimField.input.value = (sachet.trimWidth ?? sachet.rightTrim ?? 0).toString()
    sachetRightTrimField.field.style.display = is3Side ? "" : "none"
    sachetTrackField.field.style.display = is3Side ? "" : "none"
    sachetRefToggle.style.display = is4Side ? "" : "none"
    if (sachetRefToggleInput) {
      sachetRefToggleInput.checked = sachet.showLaneLabels ?? true
    }
    baseEyemarkTrackWidthField.field.style.display = "none"
    if (sachetStepInput) {
      sachetStepInput.checked = sachet.stepEnabled ?? false
    }
    sachetLaneField.input.value = (sachet.stepCount ?? 1).toString()
    sachetTrackField.select.value = sachet.trimPosition ?? sachet.trackSide ?? "left"
    sachetLaneField.input.disabled = !(sachet.stepEnabled ?? false)

    if (sachetTearInput) {
      sachetTearInput.checked = sachet.tearNotch?.enabled ?? false
    }
    sachetTearStyleField.select.value = sachet.tearNotch?.style ?? "triangle"
    sachetTearOffsetField.input.value = (sachet.tearNotch?.offsetX ?? 6).toString()
    sachetTearWidthField.input.value = (sachet.tearNotch?.width ?? 6).toString()
    sachetTearDepthField.input.value = (sachet.tearNotch?.depth ?? 3).toString()
    const tearEnabled = sachet.tearNotch?.enabled ?? false
    sachetTearStyleField.select.disabled = !tearEnabled
    sachetTearOffsetField.input.disabled = !tearEnabled
    sachetTearWidthField.input.disabled = !tearEnabled
    sachetTearDepthField.input.disabled = !tearEnabled
    return true
  }

  function renderPackSpecificControls() {
    const hasPaperStrip = renderPaperStripControls()
    if (hasPaperStrip) {
      packSpecificSachetFields.forEach(field => {
        field.style.display = "none"
      })
      // Paper Strip's stepping controls live elsewhere; don't show an empty
      // pack-specific heading in the Base menu.
      packSpecificSection.section.style.display = "none"
      baseEyemarkTrackWidthField.field.style.display = "none"
      return
    }

    packSpecificPaperStripFields.forEach(field => {
      field.style.display = "none"
    })
    const hasSachet = renderSachetControls()
    // The 4SS stepping dock owns its controls; the old 4SS menu entry was
    // redundant. Keep the sachet trim panel for 3SS only.
    packSpecificSection.section.style.display = hasSachet && spec.sachet?.stepPair !== true ? "" : "none"
  }

  function renderSafeZones() {
    safeZoneList.innerHTML = ""
    const zones = spec.safeZones ?? []

    zones.forEach((zone: SafeZoneSpec, index: number) => {
      const row = document.createElement("div")
      row.className = "safe-zone-row"

      const header = document.createElement("div")
      header.className = "safe-zone-header"

      const title = document.createElement("strong")
      title.textContent = zone.label || `Safe Zone ${index + 1}`

      const removeButton = document.createElement("button")
      removeButton.type = "button"
      removeButton.className = "icon-button"
      removeButton.setAttribute("aria-label", "Remove safe zone")
      const removeIcon = document.createElement("img")
      removeIcon.alt = ""
      applyIconButtonStates(removeButton, removeIcon, {
        static: ICON_UI_BIN_STATIC,
        hover: ICON_UI_BIN_HOVER
      })
      removeButton.appendChild(removeIcon)
      removeButton.addEventListener("click", () => removeSafeZone(index))

      header.appendChild(title)
      header.appendChild(removeButton)

      const fields = document.createElement("div")
      fields.className = "safe-zone-fields"

      fields.appendChild(
        createToggle("Enabled", zone.enabled !== false, next =>
          updateSafeZone(index, { enabled: next })
        )
      )
      fields.appendChild(
        createTextInput("Label", zone.label, next =>
          updateSafeZone(index, { label: next })
        )
      )
      const xField = createNumberInput(
        "X (mm)",
        zone.x,
        { min: 0, step: 0.1 },
        next => updateSafeZone(index, { x: next })
      )
      xField.field.setAttribute("data-role", "safe-zone-x")
      xField.field.style.display = "none"
      fields.appendChild(xField.field)

      const yField = createNumberInput(
        "Y (mm)",
        zone.y,
        { min: 0, step: 0.1 },
        next => updateSafeZone(index, { y: next })
      )
      yField.field.setAttribute("data-role", "safe-zone-y")
      yField.field.style.display = "none"
      fields.appendChild(yField.field)

      const widthField = createNumberInput(
        "Width (mm)",
        zone.width,
        { min: 0.1, step: 0.1 },
        next => updateSafeZone(index, { width: next })
      )
      fields.appendChild(widthField.field)

      const heightField = createNumberInput(
        "Height (mm)",
        zone.height,
        { min: 0.1, step: 0.1 },
        next => updateSafeZone(index, { height: next })
      )
      fields.appendChild(heightField.field)

      row.appendChild(header)
      row.appendChild(fields)
      safeZoneList.appendChild(row)
    })

    addSafeZoneButton.disabled = zones.length >= MAX_SAFE_ZONES
  }

  function updateFoldLine(index: number, updates: Partial<FoldLineSpec>) {
    if (!spec.foldLines) {
      return
    }
    spec.foldLines = spec.foldLines.map((line: FoldLineSpec, i: number) =>
      i === index ? { ...line, ...updates } : line
    )
    emitChange()
    renderFoldLines()
  }

  function removeFoldLine(index: number) {
    if (!spec.foldLines) {
      return
    }
    spec.foldLines = spec.foldLines.filter(
      (_: FoldLineSpec, i: number) => i !== index
    )
    emitChange()
    renderFoldLines()
  }

  function renderFoldLines() {
    foldLineList.innerHTML = ""
    const lines = spec.foldLines ?? []

    lines.forEach((line: FoldLineSpec, index: number) => {
      const row = document.createElement("div")
      row.className = "fold-line-row"

      const header = document.createElement("div")
      header.className = "fold-line-row-header"

      const title = document.createElement("strong")
      title.className = "fold-line-row-title"
      title.textContent = `Fold Line - ${index + 1}`

      const removeButton = document.createElement("button")
      removeButton.type = "button"
      removeButton.className = "icon-button fold-line-remove-button"
      removeButton.setAttribute("aria-label", "Remove fold line")
      const removeIcon = document.createElement("img")
      removeIcon.alt = ""
      applyIconButtonStates(removeButton, removeIcon, {
        static: ICON_UI_BIN_STATIC,
        hover: ICON_UI_BIN_HOVER
      })
      removeButton.appendChild(removeIcon)
      removeButton.addEventListener("click", () => removeFoldLine(index))

      header.appendChild(title)
      header.appendChild(removeButton)

      const fields = document.createElement("div")
      fields.className = "fold-line-hidden-fields"

      const offsetField = createNumberInput(
        "X Offset (mm)",
        line.offset,
        { min: 0, step: 0.1 },
        next => updateFoldLine(index, { offset: next })
      )
      offsetField.field.setAttribute("data-role", "fold-line-offset")
      offsetField.field.style.display = "none"
      fields.appendChild(offsetField.field)

      row.appendChild(header)
      row.appendChild(fields)
      foldLineList.appendChild(row)
    })
  }

  function renderPerfLanes() {
    perfLaneList.innerHTML = ""
    if (!spec.perfs) {
      addPerfLaneButton.disabled = true
      return
    }
    const lanes = spec.perfs.lanes?.length
      ? spec.perfs.lanes
      : [{ originX: spec.perfs.originX, originY: spec.perfs.originY }]
    lanes.forEach((_, index) => {
      const row = document.createElement("div")
      row.className = "safe-zone-row"

      const header = document.createElement("div")
      header.className = "safe-zone-header"

      const title = document.createElement("strong")
      title.textContent = `Perf Lane ${index + 1}`

      const removeButton = document.createElement("button")
      removeButton.type = "button"
      removeButton.className = "icon-button"
      removeButton.setAttribute("aria-label", "Remove perf lane")
      const removeIcon = document.createElement("img")
      removeIcon.src = ICON_TRASH
      removeIcon.alt = ""
      removeButton.appendChild(removeIcon)
      removeButton.disabled = lanes.length <= 1
      removeButton.addEventListener("click", () => {
        if (!spec.perfs || lanes.length <= 1) {
          return
        }
        const nextLanes = lanes.filter((_, i) => i !== index)
        spec = { ...spec, perfs: { ...spec.perfs, lanes: nextLanes } }
        emitChange()
        renderPerfLanes()
      })

      header.appendChild(title)
      header.appendChild(removeButton)

      row.appendChild(header)
      perfLaneList.appendChild(row)
    })

    addPerfLaneButton.disabled = lanes.length >= 3
  }

  let cutterAspectLocked = false
  let cutterAspectRatio = spec.width / Math.max(0.1, spec.height)
  let heightField: ReturnType<typeof createDeferredNumberInput>
  const initialKSealDimensions = spec.kSealPouch
    ? resolveKSealDimensionSemantics(spec)
    : null
  const widthField = createDeferredNumberInput(
    "Width",
    initialKSealDimensions?.finishedWidthMm ?? (spec.doyPouch ? spec.height : spec.width),
    { min: 0.1, step: 0.5 },
    next => {
      if (spec.kSealPouch) {
        updateKSealPouch({ pouchWidth: next })
        return
      }
      if (spec.doyPouch) {
        spec = { ...spec, height: next }
        emitChange()
        return
      }
      if (cutterAspectLocked) {
        const roundedWidth = Math.max(1, Math.round(next))
        const height = Math.max(1, Math.round(roundedWidth / cutterAspectRatio))
        spec = { ...spec, width: roundedWidth, height }
        widthField.setValue(roundedWidth)
        heightField.setValue(height)
        emitChange()
        return
      }
      spec = { ...spec, width: next }
      emitChange()
    }
  )
  const cutterAspectToggle = createAspectToggle(cutterAspectLocked, next => {
    cutterAspectLocked = next
    if (cutterAspectLocked) {
      cutterAspectRatio = widthField.getValue() / Math.max(0.1, heightField.getValue())
    }
  })
  widthField.field.classList.add("has-aspect")
  widthField.input.setAttribute("data-cutter-field", "width")
  widthField.field.appendChild(cutterAspectToggle.button)
  sizeSection.body.appendChild(widthField.field)

  heightField = createDeferredNumberInput(
    "Height",
    initialKSealDimensions?.finishedHeightMm ?? (spec.doyPouch ? doyFinishedWidth(spec) : spec.height),
    { min: 0.1, step: 0.5 },
    next => {
      if (spec.kSealPouch) {
        updateKSealPouch({ pouchHeight: next })
        return
      }
      if (spec.doyPouch) {
        spec = { ...spec, width: doyCutterWidth(next, spec.doyPouch.panelWidths.center) }
        emitChange()
        return
      }
      if (cutterAspectLocked) {
        const roundedHeight = Math.max(1, Math.round(next))
        const width = Math.max(1, Math.round(roundedHeight * cutterAspectRatio))
        spec = { ...spec, width, height: roundedHeight }
        widthField.setValue(width)
        heightField.setValue(roundedHeight)
        emitChange()
        return
      }
      spec = { ...spec, height: next }
      emitChange()
    }
  )
  heightField.field.classList.add("no-aspect")
  heightField.input.setAttribute("data-cutter-field", "height")
  sizeSection.body.appendChild(heightField.field)

  const widthFieldLabel = widthField.field.querySelector("span")
  const heightFieldLabel = heightField.field.querySelector("span")
  const syncSizeFieldLabels = () => {
    sizeSection.section.style.display = spec.lidding ? "none" : ""
    if (spec.lidding) {
      baseSealSection.section.style.display = "none"
      baseTrimSection.section.style.display = "none"
      return
    }
    if (spec.kSealPouch || spec.doyPouch) {
      sizeSection.titleEl.textContent = "Pouch Size (mm)"
      sizeSection.titleEl.setAttribute("title", "Input Finished Pouch Spec")
      baseSealSection.section.style.display = spec.kSealPouch ? "none" : ""
      baseTrimSection.section.style.display = spec.kSealPouch ? "" : "none"
      if (widthFieldLabel) {
        widthFieldLabel.textContent = "Pouch Width"
      }
      if (heightFieldLabel) {
        heightFieldLabel.textContent = "Pouch Height"
      }
      cutterAspectToggle.button.style.display = "none"
      return
    }
    sizeSection.titleEl.textContent = "Cutter Size (mm)"
    sizeSection.titleEl.removeAttribute("title")
    baseSealSection.section.style.display = spec.sideSealPouch ? "none" : ""
    baseTrimSection.section.style.display = "none"
    if (widthFieldLabel) {
      widthFieldLabel.textContent = "Width"
    }
    if (heightFieldLabel) {
      heightFieldLabel.textContent = "Height"
    }
    cutterAspectToggle.button.style.display = ""
  }
  syncSizeFieldLabels()

  const resolveSeals = () => ({
    top: spec.seals?.top ?? spec.seal,
    bottom: spec.seals?.bottom ?? spec.seal,
    left: spec.seals?.left ?? spec.seal,
    right: spec.seals?.right ?? spec.seal
  })

  const applySeals = (updates: Partial<FlowwrapSpec["seals"]>) => {
    const current = resolveSeals()
    const nextSeals = { ...current, ...updates }
    const average =
      (nextSeals.top + nextSeals.bottom + nextSeals.left + nextSeals.right) / 4
    spec = { ...spec, seals: nextSeals, seal: average }
    emitChange()
  }
  const resolveUniformSealMax = () =>
    Math.max(0, Math.min(spec.width / 2, spec.height / 2))
  let sealAspectLocked = false
  const applyLinkedSeals = (next: number) => {
    const uniform = Math.min(next, resolveUniformSealMax())
    baseSealLeftField.setValue(uniform)
    baseSealRightField.setValue(uniform)
    baseSealTopField.setValue(uniform)
    baseSealBottomField.setValue(uniform)
    applySeals({
      left: uniform,
      right: uniform,
      top: uniform,
      bottom: uniform
    })
  }
  const baseSealInputs = document.createElement("div")
  baseSealInputs.className = "base-seal-inputs"

  const baseSealLeftField = createDeferredNumberInput(
    "Left",
    resolveSeals().left,
    { min: 0, step: 0.5 },
    next => {
      if (sealAspectLocked) {
        applyLinkedSeals(next)
        return
      }
      const max = Math.max(0, spec.width / 2)
      const clamped = Math.min(next, max)
      baseSealLeftField.setValue(clamped)
      applySeals({ left: clamped })
    }
  )
  baseSealLeftField.field.classList.add("has-aspect")
  baseSealInputs.appendChild(baseSealLeftField.field)

  const baseSealRightField = createDeferredNumberInput(
    "Right",
    resolveSeals().right,
    { min: 0, step: 0.5 },
    next => {
      if (sealAspectLocked) {
        applyLinkedSeals(next)
        return
      }
      const max = Math.max(0, spec.width / 2)
      const clamped = Math.min(next, max)
      baseSealRightField.setValue(clamped)
      applySeals({ right: clamped })
    }
  )
  baseSealRightField.field.classList.add("has-aspect")
  baseSealInputs.appendChild(baseSealRightField.field)

  const baseSealTopField = createDeferredNumberInput(
    "Top",
    resolveSeals().top,
    { min: 0, step: 0.5 },
    next => {
      if (sealAspectLocked) {
        applyLinkedSeals(next)
        return
      }
      const max = Math.max(0, spec.height / 2)
      const clamped = Math.min(next, max)
      baseSealTopField.setValue(clamped)
      applySeals({ top: clamped })
    }
  )
  baseSealTopField.field.classList.add("has-aspect")
  baseSealInputs.appendChild(baseSealTopField.field)

  const baseSealBottomField = createDeferredNumberInput(
    "Bottom",
    resolveSeals().bottom,
    { min: 0, step: 0.5 },
    next => {
      if (sealAspectLocked) {
        applyLinkedSeals(next)
        return
      }
      const max = Math.max(0, spec.height / 2)
      const clamped = Math.min(next, max)
      baseSealBottomField.setValue(clamped)
      applySeals({ bottom: clamped })
    }
  )
  baseSealBottomField.field.classList.add("has-aspect")
  baseSealInputs.appendChild(baseSealBottomField.field)

  const sealAspectToggle = createAspectToggle(sealAspectLocked, next => {
    sealAspectLocked = next
  })
  sealAspectToggle.button.classList.add("seal-link-toggle")
  baseSealInputs.appendChild(sealAspectToggle.button)
  baseSealSection.body.appendChild(baseSealInputs)

  const baseClearanceField = createDeferredNumberInput(
    "Seal Clearance",
    spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM,
    { min: 0, step: 0.5 },
    next => {
      spec = { ...spec, sealClearance: next }
      emitChange()
    }
  )
  baseClearanceField.field.classList.add("no-aspect")
  baseSealSection.body.appendChild(baseClearanceField.field)

  const initialBaseTrimGeometry = spec.kSealPouch
    ? resolveKSealPouchGeometry(spec)
    : spec.doyPouch
      ? { trimEnabled: spec.doyPouch.trimEnabled ?? false, trim: spec.doyPouch.trim ?? 15 }
      : null
  const baseTrimToggle = createToggle(
    "Trim",
    initialBaseTrimGeometry?.trimEnabled ?? false,
    next => {
      if (spec.kSealPouch) updateKSealPouch({ trimEnabled: next })
      else updateDoyPouch({ trimEnabled: next })
    }
  )
  const baseTrimToggleInput = baseTrimToggle.querySelector("input")
  const baseTrimWidthField = createDeferredNumberInput(
    "Trim Width",
    initialBaseTrimGeometry?.trim ?? 15,
    { min: 5, step: 0.5 },
    next => {
      if (spec.kSealPouch) updateKSealPouch({ trim: next })
      else updateDoyPouch({ trim: next })
    }
  )
  baseTrimWidthField.input.max = "25"
  baseTrimSection.body.appendChild(baseTrimToggle)
  baseTrimSection.body.appendChild(baseTrimWidthField.field)

  function syncBaseTrimControls() {
    const geometry = spec.kSealPouch
      ? resolveKSealPouchGeometry(spec)
      : spec.doyPouch
        ? { trimEnabled: spec.doyPouch.trimEnabled ?? false, trim: spec.doyPouch.trim ?? 15 }
        : null
    baseTrimSection.section.style.display = geometry ? "" : "none"
    baseSealSection.section.style.display = geometry || spec.sideSealPouch || spec.lidding ? "none" : ""
    ;(geometry || spec.sideSealPouch ? sizeSection.body : baseSealSection.body).appendChild(baseClearanceField.field)
    if (!geometry) {
      return
    }
    if (baseTrimToggleInput) {
      baseTrimToggleInput.checked = geometry.trimEnabled
    }
    baseTrimWidthField.setValue(geometry.trim)
    baseTrimWidthField.input.disabled = !geometry.trimEnabled
  }
  syncBaseTrimControls()

  const sealField = createNumberInput(
    "Seal (mm)",
    spec.seal,
    { min: 0.1, step: 0.1 },
    next => {
      spec = { ...spec, seal: next }
      emitChange()
    }
  )
  sealSection.body.appendChild(sealField.field)

  const clearanceField = createNumberInput(
    "Seal Clearance (mm)",
    spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM,
    { min: 0, step: 0.1 },
    next => {
      spec = { ...spec, sealClearance: next }
      emitChange()
    }
  )
  sealSection.body.appendChild(clearanceField.field)

  // External artwork bleed is separate; no competing internal seal-buffer control.

  const perfModeField = createSelect(
    "Mode",
    spec.perfs?.mode ?? "continuous",
    [
      { value: "continuous", label: "Continuous" },
      { value: "regulated", label: "Regulated" }
    ],
    next => updatePerfs({ mode: next as "continuous" | "regulated" })
  )
  perfSection.body.appendChild(perfModeField.field)

  const perfCountField = createNumberInput(
    "Perf Count",
    spec.perfs?.count ?? DEFAULT_PERF_COUNT,
    { min: 1, step: 1 },
    next => updatePerfs({ count: next })
  )
  perfSection.body.appendChild(perfCountField.field)

  const perfSeparationField = createNumberInput(
    "Separation (mm)",
    spec.perfs?.separation ?? DEFAULT_PERF_SEPARATION,
    { min: 0.1, step: 0.1 },
    next => updatePerfs({ separation: next })
  )
  perfSection.body.appendChild(perfSeparationField.field)

  const perfOriginXField = createNumberInput(
    "Origin X (mm)",
    spec.perfs?.originX ?? MIN_SEAL_CLEARANCE_MM,
    { min: 0, step: 0.1 },
    next => updatePerfs({ originX: next })
  )
  perfSection.body.appendChild(perfOriginXField.field)

  const perfOriginYField = createNumberInput(
    "Origin Y (mm)",
    spec.perfs?.originY ?? MIN_SEAL_CLEARANCE_MM,
    { min: 0, step: 0.1 },
    next => updatePerfs({ originY: next })
  )
  perfSection.body.appendChild(perfOriginYField.field)

  const perfEdgeField = createSelect(
    "Seal Edge",
    spec.perfs?.sealEdge ?? "top",
    [
      { value: "top", label: "Top" },
      { value: "bottom", label: "Bottom" }
    ],
    next => updatePerfs({ sealEdge: next as "top" | "bottom" })
  )
  perfSection.body.appendChild(perfEdgeField.field)

  const perfStyleField = createSelect(
    "Style",
    spec.perfs?.style ?? DEFAULT_PERF_STYLE,
    [
      { value: "circles", label: "Circles" },
      { value: "x-markers", label: "X Markers" },
      { value: "scope", label: "Scope" },
      { value: "crosshair", label: "Crosshair" }
    ],
    next => updatePerfs({ style: next as PerfStyle })
  )
  perfSection.body.appendChild(perfStyleField.field)

  const perfDiameterField = createNumberInput(
    "Diameter (mm)",
    spec.perfs?.diameter ?? DEFAULT_PERF_DIAMETER,
    { min: 0.1, step: 0.1 },
    next => updatePerfs({ diameter: Math.max(0.1, Math.min(12, next)) })
  )
  perfSection.body.appendChild(perfDiameterField.field)

  perfSection.body.appendChild(
    createToggle("Enable Perfs", spec.perfs !== undefined, next => {
      if (next) {
        updatePerfs({})
      } else {
        spec = { ...spec, perfs: undefined }
        emitChange()
      }
    })
  )

  perfSection.body.appendChild(perfLaneList)
  perfSection.body.appendChild(addPerfLaneButton)

  refreshPerfFields = () => {
    const enabled = spec.perfs !== undefined
    const mode = spec.perfs?.mode ?? "continuous"
    perfModeField.select.disabled = !enabled
    perfCountField.input.disabled = !enabled || mode !== "regulated"
    perfSeparationField.input.disabled = !enabled
    perfOriginXField.input.disabled = !enabled || mode !== "continuous"
    perfOriginYField.input.disabled = true
    perfEdgeField.select.disabled = !enabled || mode !== "continuous"
    perfStyleField.select.disabled = !enabled
    perfDiameterField.input.disabled = !enabled
    perfOriginXField.field.style.display = "none"
    perfOriginYField.field.style.display = "none"
    perfLaneList.style.display = enabled ? "" : "none"
    addPerfLaneButton.style.display = enabled ? "" : "none"
    addPerfLaneButton.disabled = !enabled
    renderPerfLanes()
    syncPerfMeasureAvailability()
  }
  refreshPerfFields()

  let eyemarkAspectLocked = false
  let eyemarkAspectRatio =
    (spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH) /
    Math.max(0.1, spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT)
  let eyemark2AspectLocked = false
  let eyemark2AspectRatio =
    (spec.eyeMarks?.width2 ?? spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH) /
    Math.max(
      0.1,
      spec.eyeMarks?.height2 ?? spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT
    )
  let baseEyemarkHeightField: ReturnType<typeof createDeferredNumberInput>
  let baseEyemarkHeight2Field: ReturnType<typeof createDeferredNumberInput>
  const baseEyemarkWidthField = createDeferredNumberInput(
    "Width",
    spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH,
    { min: 0.1, step: 0.5 },
    next => {
      if (eyemarkAspectLocked) {
        const roundedWidth = Math.max(1, Math.round(next))
        const height = Math.max(1, Math.round(roundedWidth / eyemarkAspectRatio))
        updateEyeMarks({ width: roundedWidth, height })
        baseEyemarkWidthField.setValue(roundedWidth)
        baseEyemarkHeightField.setValue(height)
        return
      }
      updateEyeMarks({ width: next })
    }
  )
  const eyemarkAspectToggle = createAspectToggle(eyemarkAspectLocked, next => {
    eyemarkAspectLocked = next
    if (eyemarkAspectLocked) {
      eyemarkAspectRatio =
        baseEyemarkWidthField.getValue() /
        Math.max(0.1, baseEyemarkHeightField.getValue())
    }
  })
  baseEyemarkWidthField.field.classList.add("has-aspect")
  baseEyemarkWidthField.field.appendChild(eyemarkAspectToggle.button)

  baseEyemarkHeightField = createDeferredNumberInput(
    "Height",
    spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT,
    { min: 0.1, step: 0.5 },
    next => {
      if (eyemarkAspectLocked) {
        const roundedHeight = Math.max(1, Math.round(next))
        const width = Math.max(1, Math.round(roundedHeight * eyemarkAspectRatio))
        updateEyeMarks({ width, height: roundedHeight })
        baseEyemarkWidthField.setValue(width)
        baseEyemarkHeightField.setValue(roundedHeight)
        return
      }
      updateEyeMarks({ height: next })
    }
  )
  baseEyemarkHeightField.field.classList.add("no-aspect")
  const baseEyemarkTrackWidthField = createDeferredNumberInput(
    "Trim Width",
    spec.sachet?.trimWidth ?? spec.sachet?.rightTrim ?? DEFAULT_EYEMARK_WIDTH,
    { min: 0, step: 0.5 },
    next => updateSachet({ trimWidth: Math.max(0, next) })
  )

  const baseEyemarkCountRow = document.createElement("div")
  baseEyemarkCountRow.className = "field base-eyemark-count"
  const baseEyemarkCountLabel = document.createElement("span")
  baseEyemarkCountLabel.textContent = "Count"
  const baseEyemarkCountButtons = document.createElement("div")
  baseEyemarkCountButtons.className = "eyemark-count-buttons"
  const countZeroButton = document.createElement("button")
  countZeroButton.type = "button"
  countZeroButton.className = "eyemark-count-button"
  countZeroButton.textContent = "0"
  const countOneButton = document.createElement("button")
  countOneButton.type = "button"
  countOneButton.className = "eyemark-count-button"
  countOneButton.textContent = "1"
  const countTwoButton = document.createElement("button")
  countTwoButton.type = "button"
  countTwoButton.className = "eyemark-count-button"
  countTwoButton.textContent = "2"
  const setBaseEyemarkCount = (count: 0 | 1 | 2) => {
    if (count === 2 && spec.kSealPouch && !resolveKSealPouchGeometry(spec).trimEnabled) {
      window.dispatchEvent(new CustomEvent("klyro:flow-prompt", { detail: {
        message: "Two K Seal eyemarks need trim. Enable trim to add the second eyemark?",
        actionLabel: "Enable trim and add eyemark",
        action: () => { updateKSealPouch({ trimEnabled: true }); setBaseEyemarkCount(2) }
      } }))
      return
    }
    if (count === 2 && spec.doyPouch && !spec.kSealPouch && !spec.doyPouch.trimEnabled) return
    if (count === 0) {
      if(spec.paperStrip){spec={...spec,eyeMarks:undefined};emitChange()}
      else updateEyeMarks({ count: 0 })
      refreshBaseEyemarkCountUi()
      return
    }
    const current = spec.eyeMarks
    const nextWidth = current?.width ?? DEFAULT_EYEMARK_WIDTH
    const nextHeight = current?.height ?? DEFAULT_EYEMARK_HEIGHT
    const nextWidth2 = current?.width2 ?? nextWidth
    const nextHeight2 = current?.height2 ?? nextHeight
    const applied = applyBridgeEyemarkCount(count)
    if (!applied) {
      updateEyeMarks({
        count,
        position: count === 2 ? "top" : "top-left",
        width2: nextWidth2,
        height2: nextHeight2
      })
    }
    refreshBaseEyemarkCountUi()
  }
  countZeroButton.addEventListener("click", () => setBaseEyemarkCount(0))
  countOneButton.addEventListener("click", () => setBaseEyemarkCount(1))
  countTwoButton.addEventListener("click", () => setBaseEyemarkCount(2))
  baseEyemarkCountButtons.appendChild(countZeroButton)
  baseEyemarkCountButtons.appendChild(countOneButton)
  baseEyemarkCountButtons.appendChild(countTwoButton)
  baseEyemarkCountRow.appendChild(baseEyemarkCountLabel)
  baseEyemarkCountRow.appendChild(baseEyemarkCountButtons)
  baseEyemarkSection.body.appendChild(baseEyemarkCountRow)
  baseEyemarkSection.body.appendChild(baseEyemarkWidthField.field)
  baseEyemarkSection.body.appendChild(baseEyemarkHeightField.field)

  const baseEyemarkSecondSize = document.createElement("div")
  baseEyemarkSecondSize.className = "base-eyemark-second-size"

  const baseEyemarkWidth2Field = createDeferredNumberInput(
    "2 Width",
    spec.eyeMarks?.width2 ?? spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH,
    { min: 0.1, step: 0.5 },
    next => {
      if (eyemark2AspectLocked) {
        const roundedWidth = Math.max(1, Math.round(next))
        const height = Math.max(1, Math.round(roundedWidth / eyemark2AspectRatio))
        updateEyeMarks({ width2: roundedWidth, height2: height })
        baseEyemarkWidth2Field.setValue(roundedWidth)
        baseEyemarkHeight2Field.setValue(height)
        return
      }
      updateEyeMarks({ width2: next })
    }
  )
  const eyemark2AspectToggle = createAspectToggle(eyemark2AspectLocked, next => {
    eyemark2AspectLocked = next
    if (eyemark2AspectLocked) {
      eyemark2AspectRatio =
        baseEyemarkWidth2Field.getValue() /
        Math.max(0.1, baseEyemarkHeight2Field.getValue())
    }
  })
  baseEyemarkWidth2Field.field.classList.add("has-aspect")
  baseEyemarkWidth2Field.field.appendChild(eyemark2AspectToggle.button)
  baseEyemarkSecondSize.appendChild(baseEyemarkWidth2Field.field)

  baseEyemarkHeight2Field = createDeferredNumberInput(
    "2 Height",
    spec.eyeMarks?.height2 ?? spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT,
    { min: 0.1, step: 0.5 },
    next => {
      if (eyemark2AspectLocked) {
        const roundedHeight = Math.max(1, Math.round(next))
        const width = Math.max(1, Math.round(roundedHeight * eyemark2AspectRatio))
        updateEyeMarks({ width2: width, height2: roundedHeight })
        baseEyemarkWidth2Field.setValue(width)
        baseEyemarkHeight2Field.setValue(roundedHeight)
        return
      }
      updateEyeMarks({ height2: next })
    }
  )
  baseEyemarkHeight2Field.field.classList.add("no-aspect")
  baseEyemarkSecondSize.appendChild(baseEyemarkHeight2Field.field)
  baseEyemarkSection.body.appendChild(baseEyemarkSecondSize)

  const multipack = document.createElement("div")
  multipack.className = "lidding-multipack-control"
  const multipackHeading = document.createElement("strong")
  multipackHeading.textContent = "Multipack"
  const multipackSwitch = document.createElement("label")
  const multipackCheck = document.createElement("input")
  multipackCheck.type = "checkbox"
  multipackCheck.setAttribute("aria-label", "Multipack eyemarks")
  multipackSwitch.append(multipackCheck, document.createTextNode("Enable multipack"))
  const multipackSide = document.createElement("div")
  multipackSide.setAttribute("role", "group")
  multipackSide.setAttribute("aria-label", "Single eyemark position")
  const multipackButtons = (["left", "right"] as const).map(side => {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = side === "left" ? "Left" : "Right"
    button.setAttribute("aria-label", `Single eyemark ${side}`)
    button.addEventListener("click", () => {
      if (!spec.lidding) return
      spec = updateLiddingSpec(spec, { multipackSingleSide: side })
      emitChange()
      refreshBaseEyemarkCountUi()
    })
    multipackSide.append(button)
    return button
  })
  multipackCheck.addEventListener("change", () => {
    if (!spec.lidding || spec.lidding.around <= 1 || spec.eyeMarks?.count !== 2) { multipackCheck.checked = false; return }
    spec = updateLiddingSpec(spec, { multipack: multipackCheck.checked })
    emitChange()
    refreshBaseEyemarkCountUi()
  })
  const multipackHint = document.createElement("small")
  multipackHint.textContent = "Available with two eyemarks and two or more Around repeats."
  multipack.append(multipackHeading, multipackSwitch, multipackSide, multipackHint)
  baseEyemarkSection.body.appendChild(multipack)

  function refreshBaseEyemarkCountUi() {
    multipack.hidden = !spec.lidding
    multipackCheck.checked = spec.lidding?.multipack === true && spec.eyeMarks?.count === 2 && spec.lidding.around > 1
    multipackCheck.disabled = !spec.lidding || spec.lidding.around <= 1 || spec.eyeMarks?.count !== 2
    multipackSide.hidden = !multipackCheck.checked
    multipackButtons.forEach((button, index) => button.setAttribute("aria-pressed", String((spec.lidding?.multipackSingleSide ?? "right") === (index === 0 ? "left" : "right"))))
    const rawCount = spec.eyeMarks?.count ?? 0
    const count = rawCount === 2 ? 2 : rawCount === 1 ? 1 : 0
    const kSealGeometry = spec.kSealPouch
      ? resolveKSealPouchGeometry(spec)
      : null
    const twoMarksAvailable =
      (!kSealGeometry || kSealGeometry.trimEnabled) &&
      (!spec.doyPouch || !!spec.kSealPouch || spec.doyPouch.trimEnabled === true)
    const sachet = spec.sachet
    const sachetCountRule = !!sachet && !sachet.stepPair
    const singleTrimOnly = sachetCountRule && sachet.trimPosition !== "both"
    countZeroButton.style.display = kSealGeometry || spec.paperStrip || singleTrimOnly ? "" : "none"
    countZeroButton.classList.toggle("is-active", count === 0)
    countOneButton.classList.toggle("is-active", count === 1)
    countTwoButton.classList.toggle("is-active", count === 2)
    countOneButton.disabled = false
    countZeroButton.disabled = singleTrimOnly
    countTwoButton.disabled = (!twoMarksAvailable && !kSealGeometry) || singleTrimOnly
    countTwoButton.title = singleTrimOnly
      ? "Select Both trims to use two eyemarks."
      : twoMarksAvailable ? "" : "Trim is off: this pouch supports one eyemark only."
    baseEyemarkSecondSize.classList.toggle("is-visible", count === 2)
  }

  function syncBaseEyemarkSizeInputs() {
    baseEyemarkWidthField.setValue(spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH)
    baseEyemarkHeightField.setValue(spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT)
    baseEyemarkWidth2Field.setValue(
      spec.eyeMarks?.width2 ?? spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH
    )
    baseEyemarkHeight2Field.setValue(
      spec.eyeMarks?.height2 ?? spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT
    )
  }
  refreshBaseEyemarkCountUi()

  const sachetSteppingCountField = createNumberInput(
    "Stepping Count",
    spec.sachet?.stepCount ?? 1,
    { min: 1, step: 1 },
    next => {
      const count = Math.max(1, Math.round(next))
      const pairMode = spec.sachet?.stepPair ?? false
      updateSachet({
        stepEnabled: count > 1,
        stepCount: pairMode ? Math.max(2, count) : count
      })
    }
  )
  const sachetRightTrimField = createNumberInput(
    "Trim Width",
    spec.sachet?.trimWidth ?? spec.sachet?.rightTrim ?? 0,
    { min: 0, step: 0.5 },
    next => updateSachet({ trimWidth: Math.max(0, next) })
  )
  const sachetRefToggle = createToggle(
    "Sachet Ref",
    spec.sachet?.showLaneLabels ?? true,
    next => updateSachet({ showLaneLabels: next })
  )
  const sachetRefToggleInput = sachetRefToggle.querySelector("input")
  const paperStripStepCountField = createNumberInput(
    "Step Count",
    spec.paperStrip?.stepping?.stepCount ??
      PAPER_STRIP_DEFAULT_STEPPING.stepCount,
    { min: 1, step: 1 },
    next => {spec=setPaperStripStepCount(spec,next);renderPaperStripControls();emitChange("engine-action")}
  )
  const paperStripSyncButton=document.createElement("button")
  paperStripSyncButton.type="button";paperStripSyncButton.className="paper-strip-sync";paperStripSyncButton.setAttribute("aria-label","Sync or independently edit Paper Strip steps")
  paperStripSyncButton.title="A: only step 1 edits; other steps mirror it. B: edit each step independently."
  paperStripSyncButton.addEventListener("click",()=>{spec=setPaperStripSync(spec,!paperStripSynced(spec));renderPaperStripControls();emitChange("engine-action")})
  const sachetSyncButton=document.createElement("button")
  sachetSyncButton.type="button";sachetSyncButton.className="paper-strip-sync";sachetSyncButton.setAttribute("aria-label","Link or individually edit sachet repeats")
  sachetSyncButton.addEventListener("click",()=>{spec=setSachetSync(spec,!sachetSynced(spec));renderSachetControls();emitChange("engine-action")})
  const packSpecificSachetFields = [
    sachetRightTrimField.field,
    sachetTrackField.field
  ]
  const packSpecificPaperStripFields: HTMLElement[] = []
  packSpecificSachetFields.forEach(field => {
    packSpecificSection.body.appendChild(field)
  })
  packSpecificPaperStripFields.forEach(field => {
    packSpecificSection.body.appendChild(field)
  })

  const eyemarkCountField = createNumberInput(
    "Count",
    spec.eyeMarks?.count ?? 1,
    { min: 0, step: 1 },
    next => {
      if (next === 1 || next === 2) {
        if (applyBridgeEyemarkCount(next)) {
          return
        }
      }
      // TODO: Freeform eyemark count edits remain direct until the bridge safely
      // supports the broader legacy control behavior beyond stable 1/2 states.
      updateEyeMarks({ count: next })
    }
  )
  eyemarkSection.body.appendChild(eyemarkCountField.field)

  const eyemarkPositionField = createSelect(
    "Position",
    spec.eyeMarks?.position ?? "top-left",
    [
      { value: "top-left", label: "Top Left" },
      { value: "top-right", label: "Top Right" },
      { value: "bottom-left", label: "Bottom Left" },
      { value: "bottom-right", label: "Bottom Right" },
      { value: "centre", label: "Centre" },
      { value: "centre-left", label: "Centre Left" },
      { value: "centre-right", label: "Centre Right" },
      { value: "top", label: "Top (2 marks)" },
      { value: "bottom", label: "Bottom (2 marks)" },
      { value: "centre", label: "Centre (2 marks)" }
    ],
    next => updateEyeMarks({
      position: next as EyeMarkSpec["position"],
      ...(spec.lidding ? { offsetX: 0, offsetY: 0, offsetX2: 0, offsetY2: 0, manualPositioned: false, manualPositioned2: false } : {})
    })
  )
  eyemarkSection.body.appendChild(eyemarkPositionField.field)

  const eyemarkWidthField = createNumberInput(
    "Width (mm)",
    spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH,
    { min: 0.1, step: 0.1 },
    next => updateEyeMarks({ width: next })
  )
  eyemarkSection.body.appendChild(eyemarkWidthField.field)

  const eyemarkHeightField = createNumberInput(
    "Height (mm)",
    spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT,
    { min: 0.1, step: 0.1 },
    next => updateEyeMarks({ height: next })
  )
  eyemarkSection.body.appendChild(eyemarkHeightField.field)

  const eyemarkColorField = createSelect(
    "Color",
    spec.eyeMarks?.color ?? "black",
    [
      { value: "black", label: "Black" },
      { value: "white", label: "White" },
      { value: "dark-blue", label: "Dark Blue" }
    ],
    next => updateEyeMarks({ color: next as EyeMarkColor })
  )
  eyemarkSection.body.appendChild(eyemarkColorField.field)

  eyemarkSection.body.appendChild(
    createToggle("Enable Eyemarks", spec.eyeMarks !== undefined, next => {
      if (next) {
        if (!applyBridgeEyemarkCount((spec.eyeMarks?.count ?? 1) === 2 ? 2 : 1)) {
          updateEyeMarks({})
        }
      } else {
        spec = { ...spec, eyeMarks: undefined }
        emitChange()
      }
    })
  )

  const substrateField = createSelect(
    "Type",
    spec.substrate ?? "clear",
    [
      { value: "clear", label: "Clear Film" },
      { value: "white", label: "White Film" },
      { value: "paper", label: "Brown Paper" },
      { value: "white-paper", label: "White Paper" },
      { value: "black-paper", label: "Black Paper" }
    ],
    next => {
      spec = {
        ...spec,
        substrate: next as FlowwrapSpec["substrate"]
      }
      emitChange()
    }
  )
  substrateSection.body.appendChild(substrateField.field)

  const doyZipperToggle = createToggle(
    "ZP",
    spec.doyPouch?.showZipper ?? true,
    next => {
      if (!spec.doyPouch) {
        return
      }
      spec = setOpeningStyle(spec, "zip", next)
      emitChange()
    }
  )
  const doyNotchToggle = createToggle(
    "TN",
    spec.doyPouch?.showTearNotch ?? true,
    next => {
      if (!spec.doyPouch) {
        return
      }
      spec = { ...spec, doyPouch: { ...spec.doyPouch, showTearNotch: next } }
      emitChange()
    }
  )
  const doyGussetToggle = createToggle(
    "Side Gusset",
    spec.doyPouch?.showGusset ?? true,
    next => {
      if (!spec.doyPouch) {
        return
      }
      spec = { ...spec, doyPouch: { ...spec.doyPouch, showGusset: next } }
      emitChange()
    }
  )
  const doyCenterBoxToggle = createToggle(
    "Gusset Fold Line",
    spec.doyPouch?.showCenterBox ?? true,
    next => {
      if (!spec.doyPouch) {
        return
      }
      spec = { ...spec, doyPouch: { ...spec.doyPouch, showCenterBox: next } }
      emitChange()
    }
  )
  const doyOvalToggle = createToggle(
    "Bottom Gusset",
    spec.doyPouch?.showOval ?? true,
    next => {
      if (!spec.doyPouch) {
        return
      }
      spec = { ...spec, doyPouch: { ...spec.doyPouch, showOval: next } }
      emitChange()
    }
  )
  const doyGripToggle = createToggle(
    "GS",
    spec.doyPouch?.showGripSeal ?? true,
    next => {
      if (!spec.doyPouch) {
        return
      }
      spec = setOpeningStyle(spec, "grip", next)
      emitChange()
    }
  )
  const ensureAttributeBox = (
    kind: "barcode" | "qr" | "bbe",
    defaults: { x: number; y: number; width: number; height: number }
  ) => {
    const boxes = spec.attributeBoxes ? [...spec.attributeBoxes] : []
    const existing = boxes.find(box => box.kind === kind)
    if (existing) {
      return { boxes, box: existing }
    }
    const created = {
      id: `attr-${kind}`,
      kind,
      x: defaults.x,
      y: defaults.y,
      width: defaults.width,
      height: defaults.height,
      enabled: false,
      selected: false
    }
    boxes.push(created)
    return { boxes, box: created }
  }

  const addPaperStripClearStripAttribute = () => {
    if (!spec.paperStrip) {
      return
    }
    // The current editor is one cutter. Repeat ownership lives in the step
    // snapshots, not in an attribute's old sheet-wide laneIndex.
    const laneIndex = 0
    const nextId = `attr-clear-strip-${(spec.attributeBoxes ?? []).filter(
      box => box.kind === "clear-strip"
    ).length + 1}`
    const created = createPaperStripClearStripAttribute(spec, laneIndex, {
      id: nextId,
      enabled: true,
      selected: false
    })
    spec = {
      ...spec,
      attributeBoxes: [...(spec.attributeBoxes ?? []), created]
    }
    emitChange()
    onElementAdded?.(`attribute-box:${created.id}`)
  }

  const setAttributeBoxEnabled = (
    kind: "barcode" | "qr" | "bbe",
    enabled: boolean
  ) => {
    const defaults =
      kind === "barcode"
        ? { x: 20, y: 20, width: 25, height: 15 }
        : kind === "qr"
          ? { x: 20, y: 40, width: 10, height: 10 }
          : { x: 20, y: 55, width: 25, height: 15 }
    const { boxes, box } = ensureAttributeBox(kind, defaults)
    const nextBoxes = boxes.map(item =>
      item.id === box.id ? { ...item, enabled } : item
    )
    spec = { ...spec, attributeBoxes: nextBoxes }
    emitChange()
    if (enabled) onElementAdded?.(`attribute-box:${box.id}`)
  }

  function updateSachet(updates: Partial<FlowwrapSpec["sachet"]>) {
    const base = spec.sachet ?? {
      trackSide: "left",
      trackWidth: spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH,
      rightTrim: 0,
      trimPosition: "left" as const,
      trimWidth: 0,
      stepEnabled: false,
      stepCount: 1,
      safeZoneBuffer: 2,
      tearNotch: {
        enabled: false,
        style: "triangle",
        offsetX: 6,
        width: 6,
        depth: 3
      }
    }
    const next = { ...base, ...updates }
    if (!next.stepPair && next.trimPosition !== "both" && (spec.eyeMarks?.count ?? 0) !== 1) {
      spec = { ...spec, eyeMarks: { ...(spec.eyeMarks ?? {}), count: 1, position: "top-left" } }
    }
    const pairMode = next.stepPair ?? false
    if (pairMode && next.stepCount !== undefined) {
      let count = Math.max(2, Math.round(next.stepCount))
      if (count % 2 !== 0) {
        count += 1
      }
      next.stepCount = count
    }
    if (updates?.tearNotch) {
      next.tearNotch = { ...base.tearNotch, ...updates.tearNotch }
    }
    if(updates?.stepCount!==undefined){
      const counted=setSachetStepCount(spec,updates.stepCount)
      spec={...counted,sachet:{...next,...counted.sachet,...updates,stepCount:counted.sachet!.stepCount,stepEnabled:counted.sachet!.stepEnabled}}
    }else if(updates?.stepEnabled===false){
      spec=setSachetStepCount(spec,spec.sachet?.stepPair?2:1)
    }else spec = { ...spec, sachet: next }
    emitChange()
    renderPackSpecificControls()
    syncLiddingMenus()
  }
  const getAttributeBoxEnabled = (kind: "barcode" | "qr" | "bbe") => {
    const box = spec.attributeBoxes?.find(item => item.kind === kind)
    return box ? box.enabled !== false : false
  }
  const barcodeToggle = createToggle("Barcode", getAttributeBoxEnabled("barcode"), next => {
    setAttributeBoxEnabled("barcode", next)
  })
  const barcodeToggleInput = barcodeToggle.querySelector("input")
  const qrToggle = createToggle("QR", getAttributeBoxEnabled("qr"), next => {
    setAttributeBoxEnabled("qr", next)
  })
  const qrToggleInput = qrToggle.querySelector("input")
  const bbeToggle = createToggle("BBE", getAttributeBoxEnabled("bbe"), next => {
    setAttributeBoxEnabled("bbe", next)
  })
  const bbeToggleInput = bbeToggle.querySelector("input")
  const barcodeNote = document.createElement("p")
  barcodeNote.className = "panel-note"
  barcodeNote.textContent = "Barcode 25mm × 15mm"
  const qrNote = document.createElement("p")
  qrNote.className = "panel-note"
  qrNote.textContent = "QR 10mm × 10mm"
  const bbeNote = document.createElement("p")
  bbeNote.className = "panel-note"
  bbeNote.textContent = "BBE 25mm × 15mm"
  const gussetCurveNote = document.createElement("p")
  gussetCurveNote.className = "panel-note"
  gussetCurveNote.style.color = "#8b5cf6"
  gussetCurveNote.textContent = "Curve: --°"
  if (usesAttributesPanel) {
    zipperSection?.body.appendChild(doyZipperToggle)
    tearNotchSection?.body.appendChild(doyNotchToggle)
    gussetArchSection?.body.appendChild(doyGussetToggle)
    gussetArchSection?.body.appendChild(doyCenterBoxToggle)
    gussetArchSection?.body.appendChild(doyOvalToggle)
    gussetArchSection?.body.appendChild(gussetCurveNote)
    gripSection?.body.appendChild(doyGripToggle)
    if (barcodeSection?.body) {
      barcodeSection.body.appendChild(barcodeToggle)
      barcodeSection.body.appendChild(barcodeNote)
    }
    if (qrSection?.body) {
      qrSection.body.appendChild(qrToggle)
      qrSection.body.appendChild(qrNote)
    }
    if (bbeSection?.body) {
      bbeSection.body.appendChild(bbeToggle)
      bbeSection.body.appendChild(bbeNote)
    }
    if (labelSection?.body) {
      labelFields.forEach(field => labelList.appendChild(field))
      labelSection.body.appendChild(labelList)
    }
  } else {
    doySection?.body.appendChild(doyZipperToggle)
    doySection?.body.appendChild(doyNotchToggle)
    doySection?.body.appendChild(doyGussetToggle)
    doySection?.body.appendChild(doyCenterBoxToggle)
    doySection?.body.appendChild(doyOvalToggle)
    doySection?.body.appendChild(gussetCurveNote)
    doySection?.body.appendChild(doyGripToggle)
  }

  const measureField = createNumberInput(
    "Measurement (mm)",
    0,
    { min: 0, step: 0.1 },
    () => {}
  )
  measureField.input.disabled = true
  if (!usesBaseModelPanel) {
    measureSection.body.appendChild(measureField.field)
  }
  const viewNote = document.createElement("p")
  viewNote.className = "panel-note"
  viewNote.textContent = "Pan uses left-drag on the artboard when enabled."
  viewSection.body.appendChild(viewNote)
  const themeOptions = [
    { value: "basic", label: "Basic" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ]
  const savedTheme =
    typeof window !== "undefined"
      ? window.localStorage.getItem("theme")
      : null
  const initialTheme = savedTheme && themeOptions.some(opt => opt.value === savedTheme)
    ? savedTheme
    : "basic"
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", initialTheme)
  }
  const themeField = createSelect("Theme", initialTheme, themeOptions, next => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next)
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", next)
    }
  })
  viewSection.body.appendChild(themeField.field)

  const addSafeZone = () => {
    const nextZone: SafeZoneSpec = {
      id: `sz-${Date.now()}`,
      label: `Safe Zone ${(spec.safeZones?.length ?? 0) + 1}`,
      x: MIN_SEAL_CLEARANCE_MM,
      y: MIN_SEAL_CLEARANCE_MM,
      width: DEFAULT_SAFE_ZONE_SIZE,
      height: DEFAULT_SAFE_ZONE_SIZE,
      enabled: true
    }
    const zones = spec.safeZones ? [...spec.safeZones, nextZone] : [nextZone]
    spec = { ...spec, safeZones: zones }
    emitChange()
    onElementAdded?.(`safe-zone:${nextZone.id}`)
    renderSafeZones()
  }
  addSafeZoneButton.addEventListener("click", addSafeZone)

  addHangerSlotButton.addEventListener("click", () => {
    const nextSlot = createHangerSlot("round-hole")
    if (spec.kSealPouch) {
      nextSlot.diameter = KSEAL_TAC_HOLE_DEFAULT_MM
      nextSlot.purpose = "tac-hole"
      nextSlot.centerX = getKSealTacCentreX(spec, nextSlot.diameter)
      nextSlot.centerY = getKSealTacCentreY(nextSlot.diameter)
    }
    spec = { ...spec, hangerSlots: [nextSlot] }
    emitChange()
    onElementAdded?.(`hanger-slot:${nextSlot.id}`)
    renderHangerSlots()
  })

  addEuroSlotButton.addEventListener("click", () => {
    const nextSlot = createHangerSlot("standard-euro-slot")
    spec = { ...spec, hangerSlots: [nextSlot] }
    emitChange()
    onElementAdded?.(`hanger-slot:${nextSlot.id}`)
    renderHangerSlots()
  })

  addKeyholeSlotButton.addEventListener("click", () => {
    const nextSlot = createHangerSlot("keyhole-euro-slot")
    spec = { ...spec, hangerSlots: [nextSlot] }
    emitChange()
    onElementAdded?.(`hanger-slot:${nextSlot.id}`)
    renderHangerSlots()
  })

  const addHalfMoonCutout = () => {
    const geometry = resolveFlowwrapGeometry(spec)
    const radius = clampHalfMoonRadius(spec, DEFAULT_HALF_MOON_RADIUS)
    const minX = geometry.seals.left + radius
    const maxX = geometry.cutterRect.width - geometry.seals.right - radius
    let leftX = Math.max(minX, Math.min(maxX, spec.doyPouch?.tearNotch?.offsetX ?? 35))
    let rightX = Math.max(minX, Math.min(maxX, geometry.cutterRect.width - (spec.doyPouch?.tearNotch?.offsetX ?? 35)))
    if (spec.doyPouch) {
      const defaultCenterWidth = 70
      const liveOriginX = geometry.seals.left
      const liveWidth = Math.max(0, spec.width - geometry.seals.left - geometry.seals.right)
      const centerWidth = Math.min(
        liveWidth,
        Math.max(10, spec.doyPouch.panelWidths?.center ?? defaultCenterWidth)
      )
      const coreCenterX = liveOriginX + liveWidth / 2
      const foldCenterX = coreCenterX + (spec.doyPouch.centerOffsetX ?? 0)
      const gussetMin = Math.max(minX, foldCenterX - centerWidth / 2 + radius)
      const gussetMax = Math.min(maxX, foldCenterX + centerWidth / 2 - radius)
      if (gussetMax > gussetMin) {
        const span = gussetMax - gussetMin
        const inset = span * 0.25
        leftX = gussetMin + inset
        rightX = gussetMax - inset
      }
    }
    const existing = spec.halfMoonCutouts ?? []
    if (existing.length >= 2) {
      return
    }
    const nextCutouts =
      existing.length === 1
        ? [...existing, createHalfMoonCutout(geometry.cutterRect.width - existing[0].centerX)]
        : [createHalfMoonCutout(leftX), createHalfMoonCutout(rightX)]
    spec = { ...spec, halfMoonCutouts: nextCutouts }
    emitChange()
    onElementAdded?.(`half-moon:${nextCutouts[existing.length].id}`)
    renderHalfMoonCutouts()
  }
  addHalfMoonButton.addEventListener("click", addHalfMoonCutout)

  windowButtons.forEach((button, shape) => {
    button.addEventListener("click", () => {
      const nextWindow = createWindow(shape)
      spec = { ...spec, windows: [nextWindow] }
      emitChange()
      onElementAdded?.(`window:${nextWindow.id}`)
      renderWindows()
    })
  })

  safeSection.body.appendChild(safeZoneList)
  safeSection.body.appendChild(addSafeZoneButton)

  
  hangerSection.body.appendChild(addHangerSlotButton)
  hangerSection.body.appendChild(addEuroSlotButton)
  hangerSection.body.appendChild(addKeyholeSlotButton)

  if (halfMoonSection?.section) {
    halfMoonSection.body.appendChild(halfMoonList)
    halfMoonSection.body.appendChild(addHalfMoonButton)
  }

  if (windowSection?.section) {
    windowSection.body.appendChild(windowList)
    renderWindows()
  }

  if (sachetStepSection?.section) {
    packSpecificSection.body.appendChild(sachetTrackField.field)
  }
  if (sachetTearSection?.section) {
    sachetTearSection.body.appendChild(sachetTearToggle)
    sachetTearSection.body.appendChild(sachetTearStyleField.field)
    sachetTearSection.body.appendChild(sachetTearOffsetField.field)
    sachetTearSection.body.appendChild(sachetTearWidthField.field)
    sachetTearSection.body.appendChild(sachetTearDepthField.field)
  }

  const addFoldLine = () => {
    const geometry = resolveFlowwrapGeometry(spec)
    const liveWidth = Math.max(0, geometry.liveRect.width)
    const nextLine: FoldLineSpec = {
      id: `fold-${Date.now()}`,
      orientation: "vertical",
      offset: liveWidth / 2
    }
    const lines = spec.foldLines ? [...spec.foldLines, nextLine] : [nextLine]
    spec = { ...spec, foldLines: lines }
    emitChange()
    onElementAdded?.(`fold-line:${nextLine.id}`)
    renderFoldLines()
    addFoldLineIconState.activate()
  }
  addFoldLineButton.addEventListener("click", addFoldLine)

  foldSection.body.classList.add("fold-line-panel-body")
  foldSection.body.appendChild(addFoldLineButton)
  foldSection.body.appendChild(foldLineList)

  addPerfLaneButton.addEventListener("click", () => {
    if (!spec.perfs) {
      return
    }
    const lanes = spec.perfs.lanes?.length
      ? [...spec.perfs.lanes]
      : [{ originX: spec.perfs.originX, originY: spec.perfs.originY }]
    if (lanes.length >= 3) {
      return
    }
    const base = lanes[0] ?? {
      originX: MIN_SEAL_CLEARANCE_MM,
      originY: MIN_SEAL_CLEARANCE_MM,
      style: DEFAULT_PERF_STYLE,
      color: DEFAULT_PERF_COLOR,
      fillColor: DEFAULT_PERF_COLOR,
      fillOpacity: DEFAULT_PERF_FILL_OPACITY,
      strokeColor: DEFAULT_PERF_COLOR,
      strokeWidth: DEFAULT_PERF_STROKE_WIDTH,
      diameter: DEFAULT_PERF_DIAMETER
    }
    lanes.push({
      originX: base.originX,
      originY: base.originY,
      style: base.style ?? DEFAULT_PERF_STYLE,
      color: base.color ?? DEFAULT_PERF_COLOR,
      fillColor: base.fillColor ?? base.color ?? DEFAULT_PERF_COLOR,
      fillOpacity: Math.max(0, Math.min(1, base.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)),
      strokeColor: base.fillColor ?? base.color ?? DEFAULT_PERF_COLOR,
      strokeWidth: Math.max(0.1, Math.min(6, base.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)),
      diameter: Math.max(0.1, Math.min(12, base.diameter ?? DEFAULT_PERF_DIAMETER))
    })
    spec = { ...spec, perfs: { ...spec.perfs, lanes } }
    emitChange()
    onElementAdded?.(`perf-lane:${lanes.length - 1}`)
    renderPerfLanes()
  })

  // Line icons inherit the shared theme and pressed-state colour.
  const createDockToolButton = (label: string, paths: readonly string[]) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "dock-tool-button"
    button.setAttribute("aria-label", label)
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    icon.setAttribute("class", "dock-tool-icon")
    icon.setAttribute("viewBox", "0 0 24 24")
    icon.setAttribute("aria-hidden", "true")
    icon.setAttribute("fill", "none")
    icon.setAttribute("stroke", "currentColor")
    icon.setAttribute("stroke-width", "1.7")
    icon.setAttribute("stroke-linecap", "round")
    icon.setAttribute("stroke-linejoin", "round")
    for (const d of paths) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      path.setAttribute("d", d)
      icon.appendChild(path)
    }
    button.appendChild(icon)
    return { button, icon }
  }

  let dockMode: "dark" | "light" =
    document.documentElement.dataset.klyroTheme === "light" ? "light" : "dark"
  let dockPinned = false
  let selectEnabled = false
  let panEnabled = true
  let measureToolEnabled = false

  const selectTool = createDockToolButton("Selection Mode inactive", ["m4 3 7 18 2-8 8-2Z"])
  const measureTool = createDockToolButton("Measure", ["m3 16 13-13 5 5-13 13Z", "m7 12 2 2m2-6 2 2m2-6 2 2"])
  const moreTool = createDockToolButton("More cutter tools", ["M5 12h.01M12 12h.01M19 12h.01"])
  const pinTool = createDockToolButton("Pin dock position", ["M9 3h6m-5 0v5l-3 4v2h10v-2l-3-4V3m-2 11v7"])
  const dockSelectButton = selectTool.button
  const dockMeasureButton = measureTool.button
  const dockMoreButton = moreTool.button
  const dockPinButton = pinTool.button
  dockSelectButton.setAttribute("aria-pressed", "false")
  dockSelectButton.setAttribute(
    "title",
    "Selection Mode: select, move and resize editable cutter elements"
  )
  dockSelectButton.dataset.tool = "select"
  dockMeasureButton.setAttribute("aria-pressed", "false")
  dockMeasureButton.setAttribute("title", "Measure edge to edge — drag between lines; Alt bypasses snapping")
  dockMeasureButton.dataset.tool = "measure"
  dockMoreButton.setAttribute("aria-expanded", "false")
  dockMoreButton.dataset.tool = "more"
  dockPinButton.setAttribute("aria-pressed", "false")
  dockPinButton.setAttribute("title", "Unpin canvas toolbar")

  const zoomWrap = document.createElement("div")
  zoomWrap.className = "dock-zoom-wrap"
  zoomWrap.setAttribute("role", "group")
  zoomWrap.setAttribute("aria-label", "Canvas zoom")
  const zoomOutButton = document.createElement("button")
  zoomOutButton.type = "button"
  zoomOutButton.className = "dock-zoom-button"
  zoomOutButton.setAttribute("aria-label", `Zoom out ${loadZoomStepPercent()} percent`)
  zoomOutButton.textContent = "−"
  const zoomReadout = document.createElement("output")
  zoomReadout.className = "dock-zoom-readout"
  zoomReadout.setAttribute("aria-live", "polite")
  zoomReadout.setAttribute("aria-label", "Current canvas zoom")
  const zoomInButton = document.createElement("button")
  zoomInButton.type = "button"
  zoomInButton.className = "dock-zoom-button"
  zoomInButton.setAttribute("aria-label", `Zoom in ${loadZoomStepPercent()} percent`)
  zoomInButton.textContent = "+"
  let zoomPercent = 100
  let lastMeasurement: number | null = null
  const zoomPresets = document.createElement("select")
  zoomPresets.className = "dock-zoom-presets"
  zoomPresets.setAttribute("aria-label", "Set canvas zoom")
  zoomPresets.title = "Zoom relative to the fitted cutter — not artwork resolution"
  const zoomValues = [20, 50, 100, 200, 400, 800, 1600, 3200, 6400]
  zoomValues.forEach(value => { const option = document.createElement("option"); option.value = String(value); option.textContent = `${value}%`; zoomPresets.appendChild(option) })
  const customZoomOption = document.createElement("option")
  customZoomOption.value = "custom"
  customZoomOption.hidden = true
  zoomPresets.appendChild(customZoomOption)
  const setCanvasZoom = (zoom: number) => {
    zoomPercent = clampCanvasZoom(zoom) * 100
    if (lastMeasurement !== null) measureField.input.value = formatMeasurement(lastMeasurement, zoomPercent / 100)
    const rounded = Math.round(zoomPercent)
    zoomReadout.value = `${rounded}%`
    customZoomOption.textContent = `${rounded}%`
    zoomPresets.value = zoomValues.includes(rounded) ? String(rounded) : "custom"
    zoomOutButton.disabled = zoomPercent <= MIN_CANVAS_ZOOM * 100
    zoomInButton.disabled = zoomPercent >= MAX_CANVAS_ZOOM * 100
  }
  zoomPresets.addEventListener("change", () => {
    if (zoomPresets.value === "custom") return
    const zoom = Number(zoomPresets.value) / 100
    setCanvasZoom(zoom)
    onZoomChange?.(zoom)
  })
  const updateZoom = (direction: -1 | 1) => {
    const step = loadZoomStepPercent()
    zoomOutButton.setAttribute("aria-label", `Zoom out ${step} percent`)
    zoomInButton.setAttribute("aria-label", `Zoom in ${step} percent`)
    setCanvasZoom((zoomPercent + direction * step) / 100)
    onZoomChange?.(zoomPercent / 100)
  }
  const bindRepeatingZoom = (button: HTMLButtonElement, direction: -1 | 1) => {
    let repeatDelay: number | null = null
    let repeatInterval: number | null = null
    const stopRepeating = () => {
      if (repeatDelay !== null) window.clearTimeout(repeatDelay)
      if (repeatInterval !== null) window.clearInterval(repeatInterval)
      repeatDelay = null
      repeatInterval = null
    }
    button.addEventListener("pointerdown", event => {
      if (event.button !== 0) return
      event.preventDefault()
      button.focus()
      updateZoom(direction)
      repeatDelay = window.setTimeout(() => {
        repeatInterval = window.setInterval(() => updateZoom(direction), 80)
      }, 350)
    })
    button.addEventListener("click", event => {
      if (event.detail === 0) updateZoom(direction)
    })
    button.addEventListener("pointerup", stopRepeating)
    button.addEventListener("pointercancel", stopRepeating)
    button.addEventListener("pointerleave", stopRepeating)
  }
  bindRepeatingZoom(zoomOutButton, -1)
  bindRepeatingZoom(zoomInButton, 1)
  setCanvasZoom(1)
  // The select is the visible readout; retain the output as an accessible status.
  zoomReadout.className += " sr-only"
  zoomWrap.append(zoomOutButton, zoomPresets, zoomReadout, zoomInButton)
  const referenceGridButton = document.createElement("button")
  referenceGridButton.type = "button"
  referenceGridButton.className = "dock-pixel-grid"
  referenceGridButton.textContent = "DPI"
  referenceGridButton.setAttribute("aria-label", "Toggle DPI reference grid")
  referenceGridButton.setAttribute("aria-pressed", "false")
  referenceGridButton.title = "Zoom-dependent 150–600 DPI reference grid. Does not change or verify artwork resolution."
  referenceGridButton.addEventListener("click", () => {
    const enabled = referenceGridButton.getAttribute("aria-pressed") !== "true"
    referenceGridButton.setAttribute("aria-pressed", String(enabled))
    onReferenceGridToggle?.(enabled)
  })

  const syncDockIcons = () => {
    dockShell.setAttribute("data-dock-mode", dockMode)
    dockShell.setAttribute("data-dock-pinned", dockPinned ? "true" : "false")
    dockSelectButton.classList.toggle("is-active", selectEnabled)
    dockMeasureButton.classList.toggle("is-active", measureToolEnabled)
    dockPinButton.classList.toggle("is-active", dockPinned)
    dockPinButton.setAttribute("title", dockPinned ? "Unpin canvas toolbar" : "Pin canvas toolbar")
    dockPinButton.setAttribute("aria-label", dockPinned ? "Unpin canvas toolbar" : "Pin canvas toolbar")
  }
  let mainMeasureToggle: ReturnType<typeof createTogglePair> | null = null
  let subMeasureToggle: ReturnType<typeof createTogglePair> | null = null
  let measureEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-main-measures") !== "false"
  let subMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-sub-measures") === "true"
  if (typeof document !== "undefined") {
    if (!document.documentElement.hasAttribute("data-main-measures")) {
      document.documentElement.setAttribute("data-main-measures", "true")
      measureEnabled = true
    }
    if (!document.documentElement.hasAttribute("data-sub-measures")) {
      document.documentElement.setAttribute("data-sub-measures", "false")
    }
  }
  const updateMainMeasures = (active: boolean) => {
    measureEnabled = active
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-main-measures",
        active ? "true" : "false"
      )
    }
    syncDockIcons()
    mainMeasureToggle?.setActive(measureEnabled)
    emitChange()
  }
  const updateSubMeasures = (active: boolean) => {
    subMeasuresEnabled = active
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-sub-measures-user-set", "true")
      document.documentElement.setAttribute(
        "data-sub-measures",
        active ? "true" : "false"
      )
    }
    subMeasureToggle?.setActive(active)
    emitChange()
  }
  perfMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-perf-measures") === "true"
  const updatePerfMeasures = (active: boolean) => {
    if (!spec.perfs && active) {
      return
    }
    perfMeasuresEnabled = active
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-perf-measures",
        active ? "true" : "false"
      )
    }
    perfMeasureToggle?.setActive(active)
    perfMeasuresMenuItem?.classList.toggle("is-active", active)
    emitChange()
  }
  function syncPerfMeasureAvailability() {
    const hasPerfs = Boolean(spec.perfs)
    if (!hasPerfs && perfMeasuresEnabled) {
      perfMeasuresEnabled = false
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-perf-measures", "false")
      }
    }
    perfMeasureToggle?.setDisabled(!hasPerfs)
    perfMeasureToggle?.setActive(hasPerfs && perfMeasuresEnabled)
    perfMeasuresMenuItem?.classList.toggle("is-disabled", !hasPerfs)
    perfMeasuresMenuItem?.classList.toggle("is-active", hasPerfs && perfMeasuresEnabled)
  }

  dock.appendChild(dockSelectButton)
  dock.appendChild(dockMeasureButton)
  dock.appendChild(zoomWrap)
  dock.appendChild(referenceGridButton)
  dock.appendChild(dockMoreButton)
  dock.appendChild(dockPinButton)
  const moreMenu = document.createElement("div")
  moreMenu.className = "dock-menu dock-more-menu"
  moreMenu.setAttribute("role", "menu")
  const pouchPreviewItem = document.createElement("button")
  pouchPreviewItem.type = "button"
  pouchPreviewItem.className = "dock-menu-item"
  pouchPreviewItem.setAttribute("role", "menuitemcheckbox")
  pouchPreviewItem.setAttribute("aria-checked", "false")
  pouchPreviewItem.innerHTML = '<span class="dock-menu-icon" aria-hidden="true">▣</span><span>Pouch Preview</span><span class="dock-menu-check" aria-hidden="true">✓</span>'
  moreMenu.appendChild(pouchPreviewItem)
  dockShell.appendChild(moreMenu)
  let pouchPreviewEnabled = false
  const setPouchPreviewAvailable = (available: boolean) => {
    pouchPreviewItem.disabled = !available
    pouchPreviewItem.classList.toggle("is-disabled", !available)
    pouchPreviewItem.title = available ? "Preview a finished pouch face" : "Available for pouch cutters"
  }
  setPouchPreviewAvailable(Boolean(spec.sideSealPouch || spec.doyPouch || spec.kSealPouch))
  const setPouchPreviewEnabled = (enabled: boolean) => {
    pouchPreviewEnabled = enabled
    pouchPreviewItem.classList.toggle("is-active", enabled)
    pouchPreviewItem.setAttribute("aria-checked", String(enabled))
  }
  dockMoreButton.addEventListener("click", () => {
    const open = !moreMenu.classList.contains("is-open")
    moreMenu.classList.toggle("is-open", open)
    dockMoreButton.setAttribute("aria-expanded", String(open))
  })
  pouchPreviewItem.addEventListener("click", () => {
    setPouchPreviewEnabled(!pouchPreviewEnabled)
    moreMenu.classList.remove("is-open")
    dockMoreButton.setAttribute("aria-expanded", "false")
    onPouchPreviewToggle?.(pouchPreviewEnabled)
  })
  document.addEventListener("pointerdown", event => {
    if (!dockShell.contains(event.target as Node)) {
      moreMenu.classList.remove("is-open")
      dockMoreButton.setAttribute("aria-expanded", "false")
    }
  })
  syncDockIcons()
  window.addEventListener("klyro-theme-change", event => {
    const nextTheme = (event as CustomEvent<{ theme?: string }>).detail?.theme
    dockMode = nextTheme === "light" ? "light" : "dark"
    syncDockIcons()
  })

  mainMeasureToggle = createTogglePair("Main", measureEnabled, next => {
    updateMainMeasures(next)
  })
  subMeasureToggle = createTogglePair("Sub", subMeasuresEnabled, next => {
    if (spec.sachet?.stepPair !== true) updateSubMeasures(next)
  })
  subMeasureToggle.setDisabled(spec.sachet?.stepPair === true)
  subMeasureToggle.setActive(spec.sachet?.stepPair !== true && subMeasuresEnabled)
  perfMeasureToggle = createTogglePair("Perf", perfMeasuresEnabled, next => {
    updatePerfMeasures(next)
  })
  measureSection.body.appendChild(mainMeasureToggle.row)
  measureSection.body.appendChild(subMeasureToggle.row)
  measureSection.body.appendChild(perfMeasureToggle.row)
  for (const [name,attribute] of [["Centre","data-centre-guides"],["Squared","data-squared-guides"]]) {
    const toggle=createTogglePair(name,document.documentElement.getAttribute(attribute)!=="false",next=>{
      document.documentElement.setAttribute(attribute,next?"true":"false")
    })
    measureSection.body.appendChild(toggle.row)
  }
  syncPerfMeasureAvailability()
  const updateMeasureToolEnabled = (enabled: boolean, notify: boolean) => {
    measureToolEnabled = enabled
    dockMeasureButton.setAttribute("aria-pressed", measureToolEnabled ? "true" : "false")
    syncDockIcons()
    if (notify && onMeasureToggle) {
      onMeasureToggle(measureToolEnabled)
    }
  }

  dockMeasureButton.addEventListener("click", () => {
    updateMeasureToolEnabled(!measureToolEnabled, true)
  })

  const updateSelectEnabled = (enabled: boolean, notify: boolean) => {
    selectEnabled = enabled
    dockSelectButton.setAttribute("aria-pressed", selectEnabled ? "true" : "false")
    dockSelectButton.setAttribute(
      "aria-label",
      selectEnabled
        ? "Selection Mode active"
        : "Selection Mode inactive"
    )
    dockSelectButton.setAttribute(
      "title",
      selectEnabled
        ? "Selection Mode active — editable cutter elements can be selected, moved and resized"
        : "Selection Mode inactive — editable cutter elements are protected from accidental movement"
    )
    syncDockIcons()
    if (notify && onSelectToggle) {
      onSelectToggle(selectEnabled)
    }
  }

  dockSelectButton.addEventListener("click", () => {
    updateSelectEnabled(!selectEnabled, true)
  })

  const updatePanEnabled = (enabled: boolean, notify: boolean) => {
    panEnabled = enabled
    syncDockIcons()
    if (notify && onPanToggle) {
      onPanToggle(panEnabled)
    }
  }

  dockPinButton.addEventListener("click", () => {
    dockPinned = !dockPinned
    dockPinButton.setAttribute("aria-pressed", dockPinned ? "true" : "false")
    syncDockIcons()
  })

  panelStack.addEventListener("pointerdown", event => {
    if (event.target === panelStack) {
      panelStack.classList.remove("is-visible")
      dockButtons.forEach(button => button.classList.remove("is-active"))
    }
  })

  renderSafeZones()
  renderHangerSlots()
  renderWindows()
  renderHalfMoonCutouts()
  renderPackSpecificControls()
  renderFoldLines()
  renderPerfLanes()
  updateDoyVisibility(spec)
  updateKSealVisibility(spec)
  updateSachetVisibility(spec)
  updatePaperStripVisibility(spec)
  function updateDoyVisibility(next: FlowwrapSpec) {
    const enabled = Boolean(next.doyPouch || next.kSealPouch)
    if (usesAttributesPanel) {
      ;["zipper", "tear", "gusset-arch", "grip"].forEach(id => {
        const button = attributeButtons.get(id)
        if (button) {
          button.style.display = enabled ? "" : "none"
        }
        const panel = attributePanels.get(id)
        if (panel && !enabled) {
          panel.classList.remove("is-open")
        }
      })
      if (zipperSection?.section) {
        zipperSection.section.style.display = enabled ? "" : "none"
      }
      if (tearNotchSection?.section) {
        tearNotchSection.section.style.display = enabled ? "" : "none"
      }
      if (gussetArchSection?.section) {
        gussetArchSection.section.style.display = enabled ? "" : "none"
      }
      if (gripSection?.section) {
        gripSection.section.style.display = enabled ? "" : "none"
      }
      return
    }
    if (doySection) {
      doySection.section.style.display = enabled ? "" : "none"
    }
    const dockDoyButton = dockButtons.get("doy")
    if (dockDoyButton) {
      dockDoyButton.style.display = enabled ? "" : "none"
    }
    if (!enabled && activePanel === "doy") {
      setActivePanel("doy")
    }
  }

  function updateKSealVisibility(next: FlowwrapSpec) {
    const enabled = Boolean(next.kSealPouch)
    if (!usesAttributesPanel) {
      return
    }
    const hideForKSeal = ["fold", "gusset-arch"]
    hideForKSeal.forEach(id => {
      const button = attributeButtons.get(id)
      if (button) {
        button.style.display = enabled ? "none" : ""
      }
      const panel = attributePanels.get(id)
      if (panel && enabled) {
        panel.classList.remove("is-open")
      }
    })
    if (foldSection.section) {
      foldSection.section.style.display = enabled ? "none" : ""
    }
    if (gussetArchSection?.section) {
      gussetArchSection.section.style.display = enabled ? "none" : ""
    }
  }

  function updateSachetVisibility(next: FlowwrapSpec) {
    const enabled = Boolean(next.sachet)
    subMeasureToggle?.setDisabled(next.sachet?.stepPair === true)
    subMeasureToggle?.setActive(next.sachet?.stepPair !== true && subMeasuresEnabled)
    baseEyemarkTrackWidthField.field.style.display =
      enabled && next.sachet?.stepPair !== true ? "none" : "none"
    if (!usesAttributesPanel) {
      return
    }
    const sachetButtons = ["sachet-step", "sachet-tear"]
    sachetButtons.forEach(id => {
      const button = attributeButtons.get(id)
      if (button) {
        button.style.display = enabled ? "" : "none"
      }
      const panel = attributePanels.get(id)
      if (panel && !enabled) {
        panel.classList.remove("is-open")
      }
    })
    if (sachetStepSection?.section) {
      sachetStepSection.section.style.display = enabled ? "" : "none"
    }
    if (sachetTearSection?.section) {
      sachetTearSection.section.style.display = enabled ? "" : "none"
    }
  }

  function updatePaperStripVisibility(next: FlowwrapSpec) {
    if (!usesAttributesPanel) {
      return
    }
    const button = attributeButtons.get("clear-strip")
    if (button) {
      button.style.display = next.paperStrip ? "" : "none"
    }
  }

  function syncSpecFromProject(next: FlowwrapSpec) {
    if (typeof document !== "undefined") {
      measureEnabled = document.documentElement.getAttribute("data-main-measures") !== "false"
      subMeasuresEnabled = document.documentElement.getAttribute("data-sub-measures") === "true"
      mainMeasureToggle?.setActive(measureEnabled)
      subMeasureToggle?.setActive(subMeasuresEnabled)
    }
    const source = specSynchroniser.syncFromProject(next)
    const perfs = source.perfs
      ? (() => {
          const lanes = (source.perfs.lanes?.length
            ? [...source.perfs.lanes]
            : [{ originX: source.perfs.originX, originY: source.perfs.originY }]
          ).map(lane => ({
            ...lane,
            style: lane.style ?? source.perfs?.style ?? DEFAULT_PERF_STYLE,
            color: lane.color ?? source.perfs?.color ?? DEFAULT_PERF_COLOR,
            fillColor:
              lane.fillColor ??
              source.perfs?.fillColor ??
              lane.color ??
              source.perfs?.color ??
              DEFAULT_PERF_COLOR,
            fillOpacity: Math.max(
              0,
              Math.min(1, lane.fillOpacity ?? source.perfs?.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)
            ),
            strokeColor:
              lane.fillColor ??
              lane.color ??
              source.perfs?.fillColor ??
              source.perfs?.color ??
              DEFAULT_PERF_COLOR,
            strokeWidth: Math.max(
              0.1,
              Math.min(6, lane.strokeWidth ?? source.perfs?.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)
            ),
            diameter: Math.max(
              0.1,
              Math.min(12, lane.diameter ?? source.perfs?.diameter ?? DEFAULT_PERF_DIAMETER)
            )
          }))
          const primaryLane = lanes[0]
          return {
            ...source.perfs,
            originX: primaryLane?.originX ?? source.perfs.originX,
            originY: primaryLane?.originY ?? source.perfs.originY,
            style: source.perfs.style ?? DEFAULT_PERF_STYLE,
            color: source.perfs.color ?? DEFAULT_PERF_COLOR,
            fillColor:
              source.perfs.fillColor ??
              source.perfs.color ??
              DEFAULT_PERF_COLOR,
            fillOpacity: Math.max(
              0,
              Math.min(1, source.perfs.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)
            ),
            strokeColor:
              source.perfs.fillColor ??
              source.perfs.color ??
              DEFAULT_PERF_COLOR,
            strokeWidth: Math.max(
              0.1,
              Math.min(6, source.perfs.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)
            ),
            diameter: Math.max(0.1, Math.min(12, source.perfs.diameter ?? DEFAULT_PERF_DIAMETER)),
            lanes
          }
        })()
      : undefined
    spec = {
      ...source,
      perfs,
      safeZones: source.safeZones ? [...source.safeZones] : [],
      attributeBoxes: source.attributeBoxes ? [...source.attributeBoxes] : [],
      foldLines: source.foldLines ? [...source.foldLines] : [],
      hangerSlots: source.hangerSlots ? [...source.hangerSlots] : [],
      windows: source.windows ? [...source.windows] : [],
      halfMoonCutouts: source.halfMoonCutouts ? [...source.halfMoonCutouts] : []
    }
    spec = coerceKSealEyeMarks(withKSealDerivedSize(spec))
    setPouchPreviewAvailable(Boolean(spec.sideSealPouch || spec.doyPouch || spec.kSealPouch))
    const kSealGeometry = spec.kSealPouch
      ? resolveKSealPouchGeometry(spec)
      : null
    widthField.setValue(kSealGeometry?.pouchWidth ?? (spec.doyPouch ? spec.height : spec.width))
    heightField.setValue(kSealGeometry?.pouchHeight ?? (spec.doyPouch ? doyFinishedWidth(spec) : spec.height))
    syncSizeFieldLabels()
    syncBaseTrimControls()
    sealField.input.value = spec.seal.toString()
    clearanceField.input.value = (spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM).toString()
    const resolvedSeals = {
      top: spec.seals?.top ?? spec.seal,
      bottom: spec.seals?.bottom ?? spec.seal,
      left: spec.seals?.left ?? spec.seal,
      right: spec.seals?.right ?? spec.seal
    }
    baseSealLeftField.setValue(resolvedSeals.left)
    baseSealRightField.setValue(resolvedSeals.right)
    baseSealTopField.setValue(resolvedSeals.top)
    baseSealBottomField.setValue(resolvedSeals.bottom)
    baseClearanceField.setValue(spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM)
    perfModeField.select.value = spec.perfs?.mode ?? "continuous"
    perfCountField.input.value = (spec.perfs?.count ?? DEFAULT_PERF_COUNT).toString()
    perfSeparationField.input.value = (spec.perfs?.separation ?? DEFAULT_PERF_SEPARATION).toString()
    perfOriginXField.input.value = (spec.perfs?.originX ?? MIN_SEAL_CLEARANCE_MM).toString()
    perfOriginYField.input.value = (spec.perfs?.originY ?? MIN_SEAL_CLEARANCE_MM).toString()
    perfEdgeField.select.value = spec.perfs?.sealEdge ?? "top"
    perfStyleField.select.value = spec.perfs?.style ?? DEFAULT_PERF_STYLE
    perfDiameterField.input.value = (
      Math.max(0.1, Math.min(12, spec.perfs?.diameter ?? DEFAULT_PERF_DIAMETER))
    ).toString()
    eyemarkCountField.input.value = (spec.eyeMarks?.count ?? 0).toString()
    eyemarkPositionField.select.value = spec.eyeMarks?.position ?? "top-left"
    eyemarkWidthField.input.value = (spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH).toString()
    eyemarkHeightField.input.value = (spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT).toString()
    baseEyemarkWidthField.setValue(spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH)
    baseEyemarkHeightField.setValue(spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT)
    baseEyemarkWidth2Field.setValue(
      spec.eyeMarks?.width2 ?? spec.eyeMarks?.width ?? DEFAULT_EYEMARK_WIDTH
    )
    baseEyemarkHeight2Field.setValue(
      spec.eyeMarks?.height2 ?? spec.eyeMarks?.height ?? DEFAULT_EYEMARK_HEIGHT
    )
    refreshBaseEyemarkCountUi()
    syncBaseEyemarkSizeInputs()
    substrateField.select.value = spec.substrate ?? "clear"
    eyemarkColorField.select.value = spec.eyeMarks?.color ?? "black"
    const zipperInput = doyZipperToggle.querySelector("input")
    const notchInput = doyNotchToggle.querySelector("input")
    const gussetInput = doyGussetToggle.querySelector("input")
    const centerBoxInput = doyCenterBoxToggle.querySelector("input")
    const ovalInput = doyOvalToggle.querySelector("input")
    if (zipperInput) {
      zipperInput.checked = spec.doyPouch?.showZipper ?? true
    }
    if (notchInput) {
      notchInput.checked = spec.doyPouch?.showTearNotch ?? true
    }
    if (gussetInput) {
      gussetInput.checked = spec.doyPouch?.showGusset ?? true
    }
    if (centerBoxInput) {
      centerBoxInput.checked = spec.doyPouch?.showCenterBox ?? true
    }
    if (ovalInput) {
      ovalInput.checked = spec.doyPouch?.showOval ?? true
    }
    const gripInput = doyGripToggle.querySelector("input")
    if (gripInput) {
      gripInput.checked = spec.doyPouch?.showGripSeal ?? true
    }
    if (barcodeToggleInput) {
      barcodeToggleInput.checked = getAttributeBoxEnabled("barcode")
    }
    if (qrToggleInput) {
      qrToggleInput.checked = getAttributeBoxEnabled("qr")
    }
    if (bbeToggleInput) {
      bbeToggleInput.checked = getAttributeBoxEnabled("bbe")
    }
    labelOptions.forEach(option => {
      const input = labelCountInputs.get(option.key)
      if (input) {
        input.value = getLabelCount(option.key).toString()
      }
    })
    const computeGussetCurve = (current: FlowwrapSpec) => {
      const height = current.height
      if (!current.doyPouch || height <= 0) {
        return null
      }
      const GUSSET_DEPTH_TO_ARC_RATIO = 0.45
      const halfHeight = Math.max(1, height / 2)
      const gussetDepthBase = Math.max(0, (current.doyPouch.panelWidths.center ?? 80) - 2 * (current.doyPouch.bottomSeal ?? 7.5)) / GUSSET_DEPTH_TO_ARC_RATIO
      const gussetDepth = Math.min(
        140,
        Math.max(30, current.doyPouch.gussetDepth ?? gussetDepthBase)
      )
      const arcInsetDepth = Math.max(
        12,
        GUSSET_DEPTH_TO_ARC_RATIO * gussetDepth
      )
      return Math.round((Math.atan2(Math.abs(arcInsetDepth), height / 2) * 180) / Math.PI)
    }
    const curveValue = computeGussetCurve(spec)
    gussetCurveNote.textContent =
      curveValue === null ? "Curve: --°" : `Curve: ${curveValue}°`
    updateDoyVisibility(spec)
    updateKSealVisibility(spec)
    updateSachetVisibility(spec)
    updatePaperStripVisibility(spec)
    refreshPerfFields()
    renderSafeZones()
    renderHangerSlots()
    renderWindows()
    renderHalfMoonCutouts()
    renderPackSpecificControls()
    syncLiddingMenus()
    renderFoldLines()
  }

  function setMeasurement(value: number | null) {
    lastMeasurement = value
    if (value === null) {
      measureField.input.value = ""
      return
    }
    measureField.input.value = formatMeasurement(value, zoomPercent / 100)
  }

  function setMeasurementActive(active: boolean) {
    container.setAttribute("data-measurement-active", active ? "true" : "false")
  }

  return {
    setSpec: syncSpecFromProject,
    syncSpecFromProject,
    showPerforationsMenu: () => selectElementCategory?.("perforation"),
    setMeasurement,
    setCanvasZoom,
    setMeasurementActive,
    setMeasureToolEnabled: (enabled: boolean) => updateMeasureToolEnabled(enabled, false),
    setPanEnabled: (enabled: boolean) => updatePanEnabled(enabled, false),
    setPouchPreviewEnabled,
    setSelectEnabled: (enabled: boolean) => updateSelectEnabled(enabled, false),
    isSealAspectLocked: () => sealAspectLocked
  }
}

