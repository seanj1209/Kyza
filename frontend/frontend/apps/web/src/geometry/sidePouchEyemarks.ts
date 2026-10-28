import type { FlowwrapSpec } from "../types/flowwrap"

export const SIDE_POUCH_CANVAS_MARGIN = 38

export function sidePouchEyemarkRects(spec: FlowwrapSpec) {
  const trim = spec.sideSealPouch?.trimEnabled ? Math.max(0, spec.sideSealPouch.trimWidth) : 0
  const marks = spec.eyeMarks
  if (!trim || !marks) return []
  const panel = spec.height
  const webHeight = spec.width
  const contentWidth = 2 * panel + 2 * trim
  return Array.from({ length: Math.min(2, marks.count) }, (_, index) => {
    const width = index ? marks.width2 ?? marks.width : marks.width
    const height = index ? marks.height2 ?? marks.height : marks.height
    const bandX = SIDE_POUCH_CANVAS_MARGIN + (index ? contentWidth - trim : 0)
    const offsetX = (index ? marks.offsetX2 : marks.offsetX) ?? 0
    const offsetY = (index ? marks.offsetY2 : marks.offsetY) ?? 0
    const baseX = bandX + (trim - width) / 2
    const baseY = SIDE_POUCH_CANVAS_MARGIN + 1.5
    const x = Math.max(bandX, Math.min(bandX + trim - width, baseX + offsetX))
    const y = Math.max(SIDE_POUCH_CANVAS_MARGIN, Math.min(SIDE_POUCH_CANVAS_MARGIN + webHeight - height, baseY + offsetY))
    return { index, x, y, width, height, bandX, bandWidth: trim, baseX, baseY }
  })
}
