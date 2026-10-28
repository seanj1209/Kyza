import type { ResolvedPaperStripLayout } from "../core/geometry/resolvers/resolvePaperStripLayout"
import type { FlowwrapSpec } from "../types/flowwrap"
import { renderPaperStripMeasurements } from "./paperStripMeasurements"
import type { RenderOptions } from "../types/flowwrap"
import { getPaperStripStepSpec, paperStripActiveStep, paperStripSynced } from "../../../../packages/cutter-engine/actions/paperStripSteps"
import { renderPaperStripStepElements } from "./paperStripStepElements"
import { applySubstrateAppearance } from "./substrateAppearance"

const SVG_NS = "http://www.w3.org/2000/svg"
const DEFAULT_PAPER_COLOR = "#8B5A2B"
const FRAME_PADDING_X = 24
const FRAME_PADDING_Y = 24

function createGroup(layerId: string, id = layerId) {
  const group = document.createElementNS(SVG_NS, "g")
  group.setAttribute("id", id)
  group.setAttribute("data-layer-id", layerId)
  return group
}

function appendRect(
  group: SVGGElement,
  rect: { x: number; y: number; width: number; height: number },
  attrs: Record<string, string>
) {
  const node = document.createElementNS(SVG_NS, "rect")
  node.setAttribute("x", rect.x.toString())
  node.setAttribute("y", rect.y.toString())
  node.setAttribute("width", rect.width.toString())
  node.setAttribute("height", rect.height.toString())
  Object.entries(attrs).forEach(([key, value]) => {
    node.setAttribute(key, value)
  })
  group.appendChild(node)
}

export function renderResolvedPaperStrip(
  spec: FlowwrapSpec,
  layout: ResolvedPaperStripLayout,
  options: RenderOptions = {}
): SVGSVGElement {
  const renderMode = options.renderMode ?? "edit"
  const svg = document.createElementNS(SVG_NS, "svg")
  const frameWidth = layout.totalWidth + FRAME_PADDING_X * 2
  const frameHeight = layout.totalHeight + FRAME_PADDING_Y * 2
  svg.setAttribute("xmlns", SVG_NS)
  svg.setAttribute("viewBox", `0 0 ${frameWidth} ${frameHeight}`)
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.style.background = "#fff"

  const artboardBackground = document.createElementNS(SVG_NS, "rect")
  artboardBackground.setAttribute("x", "0")
  artboardBackground.setAttribute("y", "0")
  artboardBackground.setAttribute("width", frameWidth.toString())
  artboardBackground.setAttribute("height", frameHeight.toString())
  artboardBackground.setAttribute("fill", "#ffffff")

  const contentRoot = document.createElementNS(SVG_NS, "g")
  contentRoot.setAttribute(
    "transform",
    `translate(${FRAME_PADDING_X} ${FRAME_PADDING_Y})`
  )

  const cutterLayer = createGroup("cutter-outline", "cutter_outline")
  const substrateLayer = createGroup("substrate")
  const sealLayer = createGroup("seal-areas", "seal_areas")
  const foldLayer = createGroup("fold-lines", "fold_lines")
  const perfLayer = createGroup("perf-lines", "perf_layer")
  const safeZoneLayer = createGroup("safe-zones", "safe_zones")
  const eyeMarkLayer = createGroup("eyemarks", "eyemark_track")
  const noteLayer = createGroup("notes", "attribute_boxes")
  const clearStripLayer = createGroup("clear-strip-window", "clear_strip_window")
  const measurementLayer = createGroup("measurement-guides", "measurement_guides")
  const annotationLayer = createGroup("annotations", "annotations")

  const substrate = spec.substrate ?? "paper"
  const substrateFill =
    substrate === "paper"
      ? spec.paperStrip?.paperColor ?? DEFAULT_PAPER_COLOR
      : substrate === "white"
        ? "#f5f5f5"
        : "#b9dfe8"
  const substrateOpacity = substrate === "clear" ? 0.6 : 0.35
  const mainMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-main-measures") !== "false"
  const subMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-sub-measures") === "true"
  const firstInstance = layout.instances[0]
  const stepCount = Math.max(1, layout.instances.length)
  const stepSpan =
    stepCount > 1 && layout.instances[1] && firstInstance
      ? layout.instances[1].cutterRect.x - firstInstance.cutterRect.x
      : 0
  svg.setAttribute("data-substrate", substrate)
  if (layout.clearStrip.selectedLaneIndex !== undefined) {
    clearStripLayer.setAttribute(
      "data-selected-lane-index",
      layout.clearStrip.selectedLaneIndex.toString()
    )
  }

  if (firstInstance) {
    safeZoneLayer.setAttribute("data-live-origin-x", firstInstance.liveRect.x.toString())
    safeZoneLayer.setAttribute("data-live-origin-y", firstInstance.liveRect.y.toString())
    safeZoneLayer.setAttribute("data-live-width", firstInstance.liveRect.width.toString())
    safeZoneLayer.setAttribute("data-live-height", firstInstance.liveRect.height.toString())
    safeZoneLayer.setAttribute("data-handle-size", "12")

    noteLayer.setAttribute("data-live-origin-x", firstInstance.liveRect.x.toString())
    noteLayer.setAttribute("data-live-origin-y", firstInstance.liveRect.y.toString())
    noteLayer.setAttribute("data-pack-id", "paper-strip")
    noteLayer.setAttribute(
      "data-cutter-origin-x",
      firstInstance.cutterRect.x.toString()
    )
    noteLayer.setAttribute(
      "data-cutter-origin-y",
      firstInstance.cutterRect.y.toString()
    )
    noteLayer.setAttribute(
      "data-cutter-height",
      firstInstance.cutterRect.height.toString()
    )
    noteLayer.setAttribute(
      "data-sachet-step-enabled",
      stepCount > 1 ? "true" : "false"
    )
    noteLayer.setAttribute("data-sachet-step-count", stepCount.toString())
    noteLayer.setAttribute("data-sachet-step-span", stepSpan.toString())

    sealLayer.setAttribute("data-origin-x", firstInstance.cutterRect.x.toString())
    sealLayer.setAttribute("data-origin-y", firstInstance.cutterRect.y.toString())
    sealLayer.setAttribute("data-live-width", firstInstance.liveRect.width.toString())
    sealLayer.setAttribute("data-live-height", firstInstance.liveRect.height.toString())
    sealLayer.setAttribute(
      "data-cutter-width",
      firstInstance.cutterRect.width.toString()
    )
    sealLayer.setAttribute(
      "data-cutter-height",
      firstInstance.cutterRect.height.toString()
    )

    perfLayer.setAttribute(
      "data-pack-step-enabled",
      stepCount > 1 ? "true" : "false"
    )
    perfLayer.setAttribute("data-pack-step-count", stepCount.toString())
    perfLayer.setAttribute("data-pack-step-span", stepSpan.toString())

    eyeMarkLayer.setAttribute(
      "data-cutter-origin-x",
      firstInstance.cutterRect.x.toString()
    )
    eyeMarkLayer.setAttribute(
      "data-cutter-origin-y",
      firstInstance.cutterRect.y.toString()
    )
    eyeMarkLayer.setAttribute(
      "data-cutter-width",
      firstInstance.cutterRect.width.toString()
    )
    eyeMarkLayer.setAttribute(
      "data-cutter-height",
      firstInstance.cutterRect.height.toString()
    )
    eyeMarkLayer.setAttribute("data-seal-top", firstInstance.seals.top.toString())
    eyeMarkLayer.setAttribute(
      "data-seal-bottom",
      firstInstance.seals.bottom.toString()
    )
    eyeMarkLayer.setAttribute("data-seal-left", firstInstance.seals.left.toString())
    eyeMarkLayer.setAttribute(
      "data-seal-right",
      firstInstance.seals.right.toString()
    )
  }

  layout.instances.forEach(instance => {
    appendRect(substrateLayer, instance.cutterRect, {
      fill: substrateFill,
      opacity: substrateOpacity.toString()
    })

    appendRect(cutterLayer, instance.cutterRect, {
      fill: "none",
      stroke: "#111111",
      "stroke-width": "0.6",
      "data-role": "cutter-outline"
    })

    ;([
      instance.sealRects.top,
      instance.sealRects.bottom,
      instance.sealRects.left,
      instance.sealRects.right
    ] as const).forEach(rect => {
      if (rect.width <= 0 || rect.height <= 0) {
        return
      }
      appendRect(sealLayer, rect, {
        fill: "#d97706",
        opacity: "0.18",
        stroke: "#d97706",
        "stroke-width": "0.2",
        "data-role": "seal-rect"
      })
    })

    const active=instance.index===paperStripActiveStep(spec)
    const elements=renderPaperStripStepElements(getPaperStripStepSpec(spec,instance.index),instance.index,active,renderMode)
    elements.setAttribute("x",String(instance.cutterRect.x));elements.setAttribute("y",String(instance.cutterRect.y))
    elements.setAttribute("data-paper-mirror",String(paperStripSynced(spec)&&instance.index!==0))
    elements.setAttribute("data-repeat-id",String(instance.index+1))
    elements.setAttribute("data-repeat-source",paperStripSynced(spec)?"1":String(instance.index+1))
    contentRoot.appendChild(elements)
  })

  if (mainMeasuresEnabled || subMeasuresEnabled) {
    renderPaperStripMeasurements(measurementLayer, layout, {
      main: mainMeasuresEnabled,
      sub: subMeasuresEnabled
    })
  }

  svg.appendChild(artboardBackground)
  // Construction is behind every step's content, not appended over it.
  contentRoot.prepend(substrateLayer,sealLayer,cutterLayer)
  contentRoot.appendChild(foldLayer)
  contentRoot.appendChild(perfLayer)
  contentRoot.appendChild(clearStripLayer)
  contentRoot.appendChild(eyeMarkLayer)
  contentRoot.appendChild(safeZoneLayer)
  contentRoot.appendChild(noteLayer)
  contentRoot.appendChild(measurementLayer)
  contentRoot.appendChild(annotationLayer)
  svg.appendChild(contentRoot)
  applySubstrateAppearance(svg,spec)
  return svg
}
