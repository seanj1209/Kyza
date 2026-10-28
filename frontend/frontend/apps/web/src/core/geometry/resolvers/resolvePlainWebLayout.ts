import type { FlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import { resolveFlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import type { FlowwrapSpec, PlainWebGuideLineSpec } from "../../../types/flowwrap"

export type ResolvedPlainWebGuideLine = Readonly<{
  id: string
  kind: "cut" | "slit"
  orientation: "vertical" | "horizontal"
  x1: number
  y1: number
  x2: number
  y2: number
}>

export type ResolvedPlainWebLayout = Readonly<{
  cutterRect: FlowwrapGeometry["cutterRect"]
  liveRect: FlowwrapGeometry["liveRect"]
  guideLines: readonly ResolvedPlainWebGuideLine[]
  hangerSlots: NonNullable<FlowwrapSpec["hangerSlots"]>
}>

function resolveGuideLine(
  guideLine: PlainWebGuideLineSpec,
  geometry: FlowwrapGeometry
): ResolvedPlainWebGuideLine {
  const { liveRect } = geometry
  if (guideLine.orientation === "vertical") {
    const x = liveRect.x + guideLine.offset
    const start = guideLine.start ?? 0
    const end = guideLine.end ?? liveRect.height
    return {
      id: guideLine.id,
      kind: guideLine.kind,
      orientation: guideLine.orientation,
      x1: x,
      y1: liveRect.y + start,
      x2: x,
      y2: liveRect.y + end
    }
  }

  const y = liveRect.y + guideLine.offset
  const start = guideLine.start ?? 0
  const end = guideLine.end ?? liveRect.width
  return {
    id: guideLine.id,
    kind: guideLine.kind,
    orientation: guideLine.orientation,
    x1: liveRect.x + start,
    y1: y,
    x2: liveRect.x + end,
    y2: y
  }
}

export function resolvePlainWebLayout(
  spec: FlowwrapSpec,
  geometry: FlowwrapGeometry = resolveFlowwrapGeometry(spec)
): ResolvedPlainWebLayout {
  const guideLines = (spec.plainWeb?.guideLines ?? []).map(guideLine =>
    resolveGuideLine(guideLine, geometry)
  )

  return {
    cutterRect: geometry.cutterRect,
    liveRect: geometry.liveRect,
    guideLines,
    hangerSlots: spec.hangerSlots ?? []
  }
}
