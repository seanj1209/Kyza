import type { ArtworkBounds } from "./artworkTypes"
import type {
  ArtworkCutterOrientation,
  ArtworkMdTdEdges,
  ArtworkPrintDirectionMode,
  ArtworkSlitAllowanceMm
} from "./artworkRules.types"
import type { PrintRules } from "../config/activeCutterState"

const createBounds = (x: number, y: number, width: number, height: number): ArtworkBounds => ({
  x,
  y,
  width,
  height
})

const buildEdgeStrip = (
  bounds: ArtworkBounds,
  edge: "top" | "bottom" | "left" | "right",
  thicknessMm: number
) => {
  const thickness = Math.max(0.5, thicknessMm)
  if (edge === "top") {
    return createBounds(bounds.x, bounds.y, bounds.width, thickness)
  }
  if (edge === "bottom") {
    return createBounds(bounds.x, bounds.y + bounds.height - thickness, bounds.width, thickness)
  }
  if (edge === "left") {
    return createBounds(bounds.x, bounds.y, thickness, bounds.height)
  }
  return createBounds(bounds.x + bounds.width - thickness, bounds.y, thickness, bounds.height)
}

export const getMdTdEdges = (
  cutterBounds: ArtworkBounds,
  settings: {
    cutterOrientation: ArtworkCutterOrientation
    printDirectionMode: ArtworkPrintDirectionMode
  }
): ArtworkMdTdEdges => {
  const usePortraitMapping =
    settings.cutterOrientation === "portrait" || settings.printDirectionMode === "display-orientation"

  if (usePortraitMapping) {
    return {
      cutterOrientation: settings.cutterOrientation,
      printDirectionMode: settings.printDirectionMode,
      mdEdges: {
        start: buildEdgeStrip(cutterBounds, "left", 5),
        end: buildEdgeStrip(cutterBounds, "right", 5)
      },
      tdEdges: {
        left: buildEdgeStrip(cutterBounds, "top", 5),
        right: buildEdgeStrip(cutterBounds, "bottom", 5)
      }
    }
  }

  return {
    cutterOrientation: settings.cutterOrientation,
    printDirectionMode: settings.printDirectionMode,
    mdEdges: {
      start: buildEdgeStrip(cutterBounds, "top", 5),
      end: buildEdgeStrip(cutterBounds, "bottom", 5)
    },
    tdEdges: {
      left: buildEdgeStrip(cutterBounds, "left", 5),
      right: buildEdgeStrip(cutterBounds, "right", 5)
    }
  }
}

export const getSlitAllowanceZone = (
  cutterBounds: ArtworkBounds,
  mdTdEdges: ArtworkMdTdEdges,
  slitAllowanceMm: ArtworkSlitAllowanceMm
) => {
  if (slitAllowanceMm <= 0) {
    return [] as ArtworkBounds[]
  }
  const thickness = Math.max(0.5, slitAllowanceMm)
  const usePortraitMapping =
    mdTdEdges.cutterOrientation === "portrait" ||
    mdTdEdges.printDirectionMode === "display-orientation"
  if (usePortraitMapping) {
    return [
      createBounds(cutterBounds.x, cutterBounds.y, cutterBounds.width, thickness),
      createBounds(
        cutterBounds.x,
        cutterBounds.y + cutterBounds.height - thickness,
        cutterBounds.width,
        thickness
      )
    ]
  }
  return [
    createBounds(cutterBounds.x, cutterBounds.y, thickness, cutterBounds.height),
    createBounds(
      cutterBounds.x + cutterBounds.width - thickness,
      cutterBounds.y,
      thickness,
      cutterBounds.height
    )
  ]
}

export const applySlitAllowanceState = (
  ruleState: PrintRules,
  allowanceMm: ArtworkSlitAllowanceMm
): PrintRules => ({
  ...ruleState,
  slitAllowanceEnabled: allowanceMm > 0,
  slitAllowanceMm: allowanceMm,
  slitAllowanceAxis: "TD",
  slitAllowanceReason: allowanceMm > 0 ? "full-width-flood" : "manual"
})
