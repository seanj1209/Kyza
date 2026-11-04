import {
  resolveFlowwrapLayout,
  type ResolvedFlowwrapLayout
} from "./resolveFlowwrapLayout"
import type { FlowwrapSpec } from "../../../types/flowwrap"

export type ResolvedPillowLayout = ResolvedFlowwrapLayout

export function resolveSymmetricPillowFoldLines(spec: FlowwrapSpec) {
  const leftSeal = spec.seals?.left ?? spec.seal
  const rightSeal = spec.seals?.right ?? spec.seal
  const innerLeft = leftSeal
  const innerRight = spec.width - rightSeal
  const liveWidth = Math.max(0, innerRight - innerLeft)
  const quarter = liveWidth / 4
  const leftOffset = quarter
  const rightOffset = quarter * 3
  return [
    { id: "pillow-fold-left", orientation: "vertical" as const, offset: leftOffset },
    { id: "pillow-fold-right", orientation: "vertical" as const, offset: rightOffset }
  ]
}

/** Keep the two construction folds at 1:2:1 when the web or seals change. */
export function synchronisePillowFoldLines(spec: FlowwrapSpec): FlowwrapSpec {
  const symmetric = resolveSymmetricPillowFoldLines(spec)
  const existing = spec.foldLines ?? []
  return {
    ...spec,
    foldLines: [
      ...existing.filter(line => line.id !== "pillow-fold-left" && line.id !== "pillow-fold-right"),
      ...symmetric
    ]
  }
}

export function resolvePillowLayout(spec: FlowwrapSpec): ResolvedPillowLayout {
  return resolveFlowwrapLayout(synchronisePillowFoldLines(spec), "pillow-pack")
}
