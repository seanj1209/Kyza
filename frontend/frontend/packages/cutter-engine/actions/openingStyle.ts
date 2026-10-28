import type { FlowwrapSpec } from "../../../apps/web/src/types/flowwrap"

export type OpeningStyle = "grip" | "zip"

/** One reclosable opening; switching its appearance keeps both mirrored edges in place. */
export function setOpeningStyle(spec: FlowwrapSpec, style: OpeningStyle, enabled = true): FlowwrapSpec {
  const doy = spec.doyPouch
  if (!doy) return spec
  if (!enabled) return { ...spec, doyPouch: { ...doy, [style === "zip" ? "showZipper" : "showGripSeal"]: false } }
  const fromGrip = style === "zip" && doy.showGripSeal === true && doy.showZipper !== true
  const fromZip = style === "grip" && doy.showZipper === true
  return {
    ...spec,
    doyPouch: {
      ...doy,
      showZipper: style === "zip",
      showGripSeal: style === "grip",
      sideBleed: fromZip ? doy.zipper.offsetX ?? 0 : doy.sideBleed,
      gripSeal: fromZip ? doy.zipper.width ?? 3 : doy.gripSeal,
      zipper: fromGrip ? { ...doy.zipper, offsetX: doy.sideBleed, width: doy.gripSeal } : doy.zipper
    }
  }
}

/** Old documents can contain both flags. Keep the explicit zip at its saved location. */
export function normaliseOpeningStyle(spec: FlowwrapSpec): FlowwrapSpec {
  return spec.doyPouch?.showZipper === true && spec.doyPouch.showGripSeal !== false
    ? { ...spec, doyPouch: { ...spec.doyPouch, showGripSeal: false } }
    : spec
}
