import type { FlowwrapSpec } from "../../types/flowwrap"
import {
  clampPaperStripClearStripAttribute,
  getMigratedPaperStripClearStripAttributes,
  clampPaperStripStripWidth,
  getDefaultPaperStripPositionX,
  getPaperStripSelectedLaneIndex,
  getResolvedPaperStripLanes,
  PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW,
  PAPER_STRIP_DEFAULT_PAPER_COLOR,
  PAPER_STRIP_DEFAULT_STEPPING
} from "../../constraints/paperStrip"
import { ensureFinite, normalizeSpec } from "./normalization"
import { refitPaperSafeZones } from "../../../../../packages/cutter-engine/actions/paperSafeZones"

function normalizeInteger(value: unknown, fallback: number) {
  return Math.round(ensureFinite(value, fallback))
}

export function normalizePaperStripSpec(spec: FlowwrapSpec): FlowwrapSpec {
  const base = normalizeSpec(spec)
  const clearStripWindow = spec.paperStrip?.clearStripWindow
  const stepping = spec.paperStrip?.stepping
  const migratedClearStripAttributes =
    (spec.attributeBoxes ?? []).some(box => box.kind === "clear-strip")
      ? []
      : getMigratedPaperStripClearStripAttributes(spec)
  const normalizedSpec: FlowwrapSpec = {
    ...base,
    substrate: spec.substrate ?? "paper",
    bleed: ensureFinite(spec.bleed, spec.bleed ?? 3),
    sealClearance: ensureFinite(spec.sealClearance, spec.sealClearance ?? 5),
    seals: {
      top: ensureFinite(spec.seals?.top, base.seal),
      bottom: ensureFinite(spec.seals?.bottom, base.seal),
      left: ensureFinite(spec.seals?.left, base.seal),
      right: ensureFinite(spec.seals?.right, base.seal)
    },
    paperStrip: {
      ...spec.paperStrip,
      paperColor: spec.paperStrip?.paperColor ?? PAPER_STRIP_DEFAULT_PAPER_COLOR,
      clearStripWindow: {
        stripCount: normalizeInteger(
          clearStripWindow?.stripCount,
          PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripCount
        ),
        stripWidth: ensureFinite(
          clearStripWindow?.stripWidth,
          PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripWidth
        ),
        positionX: ensureFinite(
          clearStripWindow?.positionX,
          PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.positionX
        ),
        selectedLaneIndex:
          clearStripWindow?.selectedLaneIndex !== undefined
            ? normalizeInteger(clearStripWindow.selectedLaneIndex, 0)
            : undefined,
        lanes: clearStripWindow?.lanes?.map(lane => ({
          laneIndex: normalizeInteger(lane.laneIndex, 0),
          positionX: ensureFinite(lane.positionX, 0),
          stripWidth: ensureFinite(
            lane.stripWidth,
            PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripWidth
          )
        }))
      },
      stepping: {
        ...stepping,
        stepCount: normalizeInteger(
          stepping?.stepCount,
          PAPER_STRIP_DEFAULT_STEPPING.stepCount
        ),
        gap: ensureFinite(stepping?.gap, PAPER_STRIP_DEFAULT_STEPPING.gap)
      }
    },
    attributeBoxes: [
      ...((spec.attributeBoxes ?? []).map(box =>
        box.kind === "clear-strip"
          ? clampPaperStripClearStripAttribute(base, box)
          : { ...box }
      )),
      ...migratedClearStripAttributes
    ]
  }
  const resolvedLanes = getResolvedPaperStripLanes(normalizedSpec)
  const defaultPositionX = getDefaultPaperStripPositionX(normalizedSpec)
  const defaultStripWidth = clampPaperStripStripWidth(
    normalizedSpec,
    defaultPositionX,
    normalizedSpec.paperStrip?.clearStripWindow?.stripWidth ??
      PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripWidth
  )

  return refitPaperSafeZones({
    ...normalizedSpec,
    attributeBoxes: (normalizedSpec.attributeBoxes ?? []).map(box =>
      box.kind === "clear-strip"
        ? clampPaperStripClearStripAttribute(normalizedSpec, box)
        : { ...box }
    ),
    paperStrip: {
      ...normalizedSpec.paperStrip,
      clearStripWindow: {
        ...normalizedSpec.paperStrip?.clearStripWindow,
        lanes: resolvedLanes.map(lane => ({
          laneIndex: lane.laneIndex,
          positionX: lane.positionX,
          stripWidth: clampPaperStripStripWidth(
            normalizedSpec,
            lane.positionX,
            lane.stripWidth
          )
        })),
        selectedLaneIndex: getPaperStripSelectedLaneIndex(normalizedSpec),
        positionX: resolvedLanes[0]?.positionX ?? defaultPositionX,
        stripWidth: resolvedLanes[0]?.stripWidth ?? defaultStripWidth
      }
    }
  })
}
