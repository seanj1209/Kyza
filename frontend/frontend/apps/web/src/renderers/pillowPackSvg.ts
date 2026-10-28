import { composePillowPack } from "../core/packComposer"
import { DEFAULT_PILLOW_PACK_SEAL_MM } from "../geometry/eyemarkPlacement"
import {
  renderResolvedFlowwrap,
  type FlowwrapResolvedLayout
} from "./flowwrapSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"

export function renderPillowPack(
  spec: FlowwrapSpec = {
    width: 440,
    height: 200,
    seal: DEFAULT_PILLOW_PACK_SEAL_MM
  },
  options: RenderOptions = {}
): SVGSVGElement {
  const layout: FlowwrapResolvedLayout = composePillowPack(spec).layout
  return renderResolvedFlowwrap(spec, layout, options)
}
