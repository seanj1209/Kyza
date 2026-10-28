import { INTERNAL_BLEED_MM } from "../constraints/bleed"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { Rect } from "./rect"

export type SealSizes = {
  top: number
  bottom: number
  left: number
  right: number
}

export type FlowwrapGeometry = {
  cutterRect: Rect
  liveRect: Rect
  sealRects: {
    top: Rect
    bottom: Rect
    left: Rect
    right: Rect
  }
  seals: SealSizes
  bleedInset: number
}

export function resolveSealSizes(spec: FlowwrapSpec): SealSizes {
  const base = spec.seal
  return {
    top: spec.seals?.top ?? base,
    bottom: spec.seals?.bottom ?? base,
    left: spec.seals?.left ?? base,
    right: spec.seals?.right ?? base
  }
}

export function resolveFlowwrapGeometry(spec: FlowwrapSpec): FlowwrapGeometry {
  const seals = resolveSealSizes(spec)
  const cutterRect: Rect = {
    x: 0,
    y: 0,
    width: spec.width,
    height: spec.height
  }
  const liveRect: Rect = {
    x: seals.left,
    y: seals.top,
    width: spec.width - seals.left - seals.right,
    height: spec.height - seals.top - seals.bottom
  }
  const sealRects = {
    top: {
      x: 0,
      y: 0,
      width: spec.width,
      height: seals.top
    },
    bottom: {
      x: 0,
      y: spec.height - seals.bottom,
      width: spec.width,
      height: seals.bottom
    },
    left: {
      x: 0,
      y: 0,
      width: seals.left,
      height: spec.height
    },
    right: {
      x: spec.width - seals.right,
      y: 0,
      width: seals.right,
      height: spec.height
    }
  }
  return {
    cutterRect,
    liveRect,
    sealRects,
    seals,
    bleedInset: INTERNAL_BLEED_MM
  }
}
