import type { FlowwrapSpec } from "../../../types/flowwrap"
import {
  resolveDoyBounds,
  type ResolvedDoyBounds
} from "./doyBounds"

export type ResolvedDoyLayout = ResolvedDoyBounds

export function resolveDoyLayout(
  spec: FlowwrapSpec,
  originX: number,
  liveOriginX: number,
  liveWidth: number,
  cutterWidth: number
): ResolvedDoyLayout | null {
  return resolveDoyBounds(spec, {
    originX,
    liveOriginX,
    liveWidth,
    cutterWidth
  })
}
