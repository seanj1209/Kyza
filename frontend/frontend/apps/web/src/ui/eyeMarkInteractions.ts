import { buildEyeMarkRects } from "../geometry/eyeMarks"
import {
  buildKSealEyeMarkRects,
  resolveKSealPouchGeometry
} from "../geometry/kSealPouchGeometry"
import { getKSealDualEyemarkTarget } from "../rules/kSealEyemarkRules"
import { attachLiddingEyemarkInteractions } from "./liddingEyemarkInteractions"
import { attachSidePouchEyemarkInteractions } from "./sidePouchEyemarkInteractions"
import {
  getEyeMarkOffsetsForIndex,
  getEyeMarkSizeForIndex,
  setEyeMarkOffsetsForIndex,
  setEyeMarkSizeForIndex
} from "../geometry/eyeMarkState"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { EyeMarkSpec } from "../types/eyeMarks"
import { updateSachetMeasuresLayer } from "../renderers/sachetSvg"
import { snapMovedElement, snapMoveWithin } from "./movementSnap"

type DragState = {
  mode: "move" | "resize"
  index: number
  handle?: "nw" | "ne" | "sw" | "se"
  startX: number
  startY: number
  origin: EyeMarkSpec
}

type PairMeta = {
  centerX: number
  width: number
  halfHeight: number
  originY: number
  height: number
  minX: number
  maxX: number
  stepSpan: number
  stepCount: number
  trackWidth: number
  margin: number
}

type AnchorX = "left" | "right" | "center" | "free"

const EYE_MARK_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  "dark-blue": "#0b1b4a"
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return { x: clientX, y: clientY }
  }
  const inverse = ctm.inverse()
  const transformed = point.matrixTransform(inverse)
  return { x: transformed.x, y: transformed.y }
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

type SealRect = { x: number; y: number; width: number; height: number }

function buildSealRects(
  originX: number,
  originY: number,
  cutterWidth: number,
  cutterHeight: number,
  seals: { top: number; bottom: number; left: number; right: number }
) {
  const topSeal = {
    x: originX,
    y: originY,
    width: cutterWidth,
    height: seals.top
  }
  const bottomSeal = {
    x: originX,
    y: originY + cutterHeight - seals.bottom,
    width: cutterWidth,
    height: seals.bottom
  }
  const leftSeal = {
    x: originX,
    y: originY,
    width: seals.left,
    height: cutterHeight
  }
  const rightSeal = {
    x: originX + cutterWidth - seals.right,
    y: originY,
    width: seals.right,
    height: cutterHeight
  }
  const topLeftSeal = {
    x: originX,
    y: originY,
    width: seals.left,
    height: seals.top
  }
  const topRightSeal = {
    x: originX + cutterWidth - seals.right,
    y: originY,
    width: seals.right,
    height: seals.top
  }
  const bottomLeftSeal = {
    x: originX,
    y: originY + cutterHeight - seals.bottom,
    width: seals.left,
    height: seals.bottom
  }
  const bottomRightSeal = {
    x: originX + cutterWidth - seals.right,
    y: originY + cutterHeight - seals.bottom,
    width: seals.right,
    height: seals.bottom
  }
  return {
    topSeal,
    bottomSeal,
    leftSeal,
    rightSeal,
    topLeftSeal,
    topRightSeal,
    bottomLeftSeal,
    bottomRightSeal
  }
}

function expectedSealForIndex(
  spec: EyeMarkSpec,
  index: number,
  seals: ReturnType<typeof buildSealRects>
): SealRect | undefined {
  if (spec.count === 1) {
    switch (spec.position) {
      case "top-left":
        return seals.topSeal
      case "top-right":
        return seals.topSeal
      case "bottom-left":
        return seals.bottomSeal
      case "bottom-right":
        return seals.bottomSeal
      case "centre-left":
        return seals.leftSeal
      case "centre-right":
        return seals.rightSeal
      case "centre":
        return seals.topSeal
    }
  }

  if (spec.count === 2) {
    switch (spec.position) {
      case "top":
        return index === 0 ? seals.topLeftSeal : seals.topRightSeal
      case "bottom":
        return index === 0 ? seals.bottomLeftSeal : seals.bottomRightSeal
      case "centre":
        return index === 0 ? seals.leftSeal : seals.rightSeal
    }
  }

  return undefined
}

function clampOffsets(
  spec: EyeMarkSpec,
  rects: { x: number; y: number; width: number; height: number }[],
  seals: ReturnType<typeof buildSealRects>,
  offsetX: number,
  offsetY: number
) {
  let minX = -Infinity
  let maxX = Infinity
  let minY = -Infinity
  let maxY = Infinity
  rects.forEach((rect, index) => {
    const expectedSeal = expectedSealForIndex(spec, index, seals)
    if (!expectedSeal) {
      return
    }
    minX = Math.max(minX, expectedSeal.x - rect.x)
    maxX = Math.min(maxX, expectedSeal.x + expectedSeal.width - rect.x - rect.width)
    minY = Math.max(minY, expectedSeal.y - rect.y)
    maxY = Math.min(maxY, expectedSeal.y + expectedSeal.height - rect.y - rect.height)
  })

  const clampedX = Math.min(maxX, Math.max(minX, offsetX))
  const clampedY = Math.min(maxY, Math.max(minY, offsetY))
  return { offsetX: clampedX, offsetY: clampedY }
}

function clampOffsetsToCutter(
  rects: { x: number; y: number; width: number; height: number }[],
  cutter: { x: number; y: number; width: number; height: number },
  offsetX: number,
  offsetY: number
) {
  let minX = -Infinity
  let maxX = Infinity
  let minY = -Infinity
  let maxY = Infinity
  rects.forEach(rect => {
    minX = Math.max(minX, cutter.x - rect.x)
    maxX = Math.min(maxX, cutter.x + cutter.width - rect.x - rect.width)
    minY = Math.max(minY, cutter.y - rect.y)
    maxY = Math.min(maxY, cutter.y + cutter.height - rect.y - rect.height)
  })
  const clampedX = Math.min(maxX, Math.max(minX, offsetX))
  const clampedY = Math.min(maxY, Math.max(minY, offsetY))
  return { offsetX: clampedX, offsetY: clampedY }
}

function clampRectToCutter(
  rect: { x: number; y: number; width: number; height: number },
  cutter: { x: number; y: number; width: number; height: number }
) {
  return {
    x: Math.min(cutter.x + cutter.width - rect.width, Math.max(cutter.x, rect.x)),
    y: Math.min(cutter.y + cutter.height - rect.height, Math.max(cutter.y, rect.y))
  }
}

function resolveAnchorX(spec: EyeMarkSpec, index: number): AnchorX {
  if (spec.count === 1) {
    if (spec.position.endsWith("left")) {
      return "left"
    }
    if (spec.position.endsWith("right")) {
      return "right"
    }
    if (spec.position === "centre") {
      return "center"
    }
    return "free"
  }
  if (spec.count === 2) {
    if (spec.position === "top" || spec.position === "bottom" || spec.position === "centre") {
      return index === 0 ? "left" : "right"
    }
  }
  return "free"
}

export function attachEyeMarkInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  // Lidding eyemarks have their own clearance band (edge → mark → lid).
  if (spec.lidding) return attachLiddingEyemarkInteractions(svg, spec, onSpecChange)
  if (spec.sideSealPouch) return attachSidePouchEyemarkInteractions(svg, spec, onSpecChange)
  let drag: DragState | null = null
  let pendingSpec = spec

  const setSelectedIndex = (index: number | undefined, emit = true) => {
    if (!pendingSpec.eyeMarks) {
      return
    }
    pendingSpec = {
      ...pendingSpec,
      eyeMarks: { ...pendingSpec.eyeMarks, selectedIndex: index }
    }
    if (emit) {
      onSpecChange(pendingSpec)
    }
  }

  const getLayerMeta = () => {
    const layer = svg.querySelector("g#eyemark_track")
    if (!layer) {
      return {
        cutterX: 0,
        cutterY: 0,
        cutterWidth: 0,
        cutterHeight: 0,
        seals: { top: 0, bottom: 0, left: 0, right: 0 },
        packId: "",
        trimWidth: 0
      }
    }
    return {
      cutterX: Number(layer.getAttribute("data-cutter-origin-x") ?? "0"),
      cutterY: Number(layer.getAttribute("data-cutter-origin-y") ?? "0"),
      cutterWidth: Number(layer.getAttribute("data-cutter-width") ?? "0"),
      cutterHeight: Number(layer.getAttribute("data-cutter-height") ?? "0"),
      packId: layer.getAttribute("data-pack-id") ?? "",
      trimWidth: Number(layer.getAttribute("data-kseal-trim-width") ?? "0"),
      seals: {
        top: Number(layer.getAttribute("data-seal-top") ?? "0"),
        bottom: Number(layer.getAttribute("data-seal-bottom") ?? "0"),
        left: Number(layer.getAttribute("data-seal-left") ?? "0"),
        right: Number(layer.getAttribute("data-seal-right") ?? "0")
      }
    }
  }

  const getPairMeta = (): PairMeta | null => {
    const layer = svg.querySelector("g#eyemark_track")
    if (!layer || layer.getAttribute("data-eyemark-pair") !== "true") {
      return null
    }
    const centerX = Number(layer.getAttribute("data-eyemark-center-x"))
    const width = Number(layer.getAttribute("data-eyemark-width"))
    const halfHeight = Number(layer.getAttribute("data-eyemark-half-height"))
    const originY = Number(layer.getAttribute("data-eyemark-origin-y"))
    const height = Number(layer.getAttribute("data-eyemark-height"))
    const minX = Number(layer.getAttribute("data-eyemark-min-x"))
    const maxX = Number(layer.getAttribute("data-eyemark-max-x"))
    const stepSpan = Number(layer.getAttribute("data-eyemark-step-span"))
    const stepCount = Number(layer.getAttribute("data-eyemark-step-count"))
    const trackWidth = Number(layer.getAttribute("data-eyemark-track-width"))
    const margin = Number(layer.getAttribute("data-eyemark-margin"))
    if (
      !Number.isFinite(centerX) ||
      !Number.isFinite(width) ||
      !Number.isFinite(halfHeight) ||
      !Number.isFinite(originY) ||
      !Number.isFinite(height) ||
      !Number.isFinite(minX) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(stepSpan) ||
      !Number.isFinite(stepCount) ||
      !Number.isFinite(trackWidth) ||
      !Number.isFinite(margin)
    ) {
      return null
    }
    return {
      centerX,
      width,
      halfHeight,
      originY,
      height,
      minX,
      maxX,
      stepSpan,
      stepCount,
      trackWidth,
      margin
    }
  }

  const getBaseRects = (eyeMarks: EyeMarkSpec) => {
    const { cutterX, cutterY, cutterWidth, cutterHeight, seals } = getLayerMeta()
    const baseSpec: EyeMarkSpec = {
      ...eyeMarks,
      offsetX: 0,
      offsetY: 0,
      offsetX2: 0,
      offsetY2: 0
    }
    return pendingSpec.kSealPouch
      ? buildKSealEyeMarkRects(
          { ...pendingSpec, eyeMarks: baseSpec },
          resolveKSealPouchGeometry(pendingSpec),
          cutterX,
          cutterY
        )
      : buildEyeMarkRects(baseSpec, cutterX, cutterY, cutterWidth, cutterHeight, {
          seals
        })
  }

  const updateEyeMarkDom = (eyeMarks: EyeMarkSpec) => {
    const pairMeta = getPairMeta()
    if (pairMeta) {
      const offsetX = eyeMarks.offsetX ?? 0
      const baseX = pairMeta.centerX - pairMeta.width / 2
      const x = Math.max(
        pairMeta.minX,
        Math.min(pairMeta.maxX, baseX + offsetX)
      )
      const topY = pairMeta.originY
      const bottomY = pairMeta.originY + pairMeta.height - pairMeta.halfHeight
      const boundaries = Array.from(
        { length: Math.max(0, pairMeta.stepCount - 1) },
        (_, idx) =>
          pairMeta.margin +
          pairMeta.trackWidth +
          (idx + 1) * pairMeta.stepSpan
      )
      const desiredCenterX = x + pairMeta.width / 2
      const isAligned = boundaries.some(
        boundary => Math.abs(boundary - desiredCenterX) <= 0.5
      )
      const baseColor =
        EYE_MARK_COLORS[eyeMarks.color] ?? EYE_MARK_COLORS.black
      const fill = isAligned ? baseColor : "#d7261d"
      const stroke = isAligned ? baseColor : "#000000"
      const rects = svg.querySelectorAll<SVGRectElement>(
        `[data-role="eye-mark"][data-eye-index]`
      )
      rects.forEach(rect => {
        const index = Number(rect.getAttribute("data-eye-index") ?? "0")
        rect.setAttribute("x", x.toString())
        rect.setAttribute("y", (index === 0 ? topY : bottomY).toString())
        rect.setAttribute("width", pairMeta.width.toString())
        rect.setAttribute("height", pairMeta.halfHeight.toString())
        rect.setAttribute("fill", fill)
        rect.setAttribute("stroke", stroke)
        rect.setAttribute("stroke-width", isAligned ? "0.3" : "1")
      })
      const hits = svg.querySelectorAll<SVGRectElement>(
        `[data-role="eye-mark-hit"][data-eye-index]`
      )
      hits.forEach(hit => {
        const index = Number(hit.getAttribute("data-eye-index") ?? "0")
        hit.setAttribute("x", x.toString())
        hit.setAttribute("y", (index === 0 ? topY : bottomY).toString())
        hit.setAttribute("width", pairMeta.width.toString())
        hit.setAttribute("height", pairMeta.halfHeight.toString())
      })
      return
    }
    const meta = getLayerMeta()
    const rects = pendingSpec.kSealPouch
      ? buildKSealEyeMarkRects(
          { ...pendingSpec, eyeMarks },
          resolveKSealPouchGeometry(pendingSpec),
          meta.cutterX,
          meta.cutterY
        )
      : buildEyeMarkRects(
          eyeMarks,
          meta.cutterX,
          meta.cutterY,
          meta.cutterWidth,
          meta.cutterHeight,
          { seals: meta.seals }
        )
    rects.forEach((rect, index) => {
      const rectEl = svg.querySelector<SVGRectElement>(
        `[data-eye-index="${index}"][data-role="eye-mark"]`
      )
      if (rectEl) {
        rectEl.setAttribute("x", rect.x.toString())
        rectEl.setAttribute("y", rect.y.toString())
        rectEl.setAttribute("width", rect.width.toString())
        rectEl.setAttribute("height", rect.height.toString())
      }
      const hitbox = svg.querySelector<SVGRectElement>(
        `[data-eye-index="${index}"][data-role="eye-mark-hit"]`
      )
      if (hitbox) {
        hitbox.setAttribute("x", rect.x.toString())
        hitbox.setAttribute("y", rect.y.toString())
        hitbox.setAttribute("width", rect.width.toString())
        hitbox.setAttribute("height", rect.height.toString())
      }
      const moveHandle = svg.querySelector<SVGCircleElement>(
        `[data-eye-index="${index}"][data-role="eye-mark-move"]`
      )
      if (moveHandle) {
        moveHandle.setAttribute("cx", (rect.x + rect.width / 2).toString())
        moveHandle.setAttribute("cy", (rect.y + rect.height / 2).toString())
      }
      const handles = svg.querySelectorAll<SVGCircleElement>(
        `[data-eye-index="${index}"][data-role="eye-mark-handle"]`
      )
      handles.forEach(handle => {
        const key = handle.getAttribute("data-handle")
        let hx = rect.x
        let hy = rect.y
        if (key === "ne") {
          hx = rect.x + rect.width
          hy = rect.y
        } else if (key === "sw") {
          hx = rect.x
          hy = rect.y + rect.height
        } else if (key === "se") {
          hx = rect.x + rect.width
          hy = rect.y + rect.height
        }
        handle.setAttribute("cx", hx.toString())
        handle.setAttribute("cy", hy.toString())
      })
    })

    const layer = svg.querySelector("g#eyemark_track")
    const trackLine = svg.querySelector<SVGLineElement>(
      '[data-role="eyemark-track-edge"]'
    )
    if (layer && trackLine) {
      const trackSide = layer.getAttribute("data-track-side") ?? "left"
      const bodyWidth = Number(layer.getAttribute("data-track-body-width") ?? "0")
      const cutterX = meta.cutterX
      let nextX = cutterX
      if (trackSide === "left") {
        nextX = cutterX + eyeMarks.width
      } else if (Number.isFinite(bodyWidth) && bodyWidth > 0) {
        nextX = cutterX + bodyWidth
      }
      trackLine.setAttribute("x1", nextX.toString())
      trackLine.setAttribute("x2", nextX.toString())
    }

    if (svg.getAttribute("data-sachet-measures") === "true") {
      svg.setAttribute("data-sachet-track-width", eyeMarks.width.toString())
      updateSachetMeasuresLayer(svg, pendingSpec)
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (svg.getAttribute("data-select-enabled") !== "true") {
      return
    }
    if (svg.getAttribute("data-pan-enabled") === "true") {
      return
    }
    if (svg.getAttribute("data-measure-enabled") === "true") {
      return
    }
    const target = event.target as HTMLElement
    const indexValue = target.getAttribute("data-eye-index")
    if (!indexValue) {
      if (pendingSpec.eyeMarks?.selectedIndex !== undefined) {
        setSelectedIndex(undefined)
      }
      return
    }
    if (!pendingSpec.eyeMarks) {
      return
    }
    const index = Number(indexValue)
    if (pendingSpec.eyeMarks.selectedIndex !== index) {
      setSelectedIndex(index, false)
    }

    const handle = target.getAttribute("data-handle") as DragState["handle"]
    if (
      target.getAttribute("data-role") === "eye-mark" ||
      target.getAttribute("data-role") === "eye-mark-hit" ||
      target.getAttribute("data-role") === "eye-mark-move"
    ) {
      drag = {
        mode: "move",
        index,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...pendingSpec.eyeMarks }
      }
    } else if (target.getAttribute("data-role") === "eye-mark-handle" && handle) {
      drag = {
        mode: "resize",
        index,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...pendingSpec.eyeMarks }
      }
    }

    if (drag) {
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.eyeMarks) {
      return
    }
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const dx = snap(current.x - start.x, 1)
    const dy = snap(current.y - start.y, 1)

    const pairMeta = getPairMeta()
    if (pairMeta) {
      if (drag.mode !== "move") {
        return
      }
      const originOffsetX = drag.origin.offsetX ?? 0
      const baseX = pairMeta.centerX - pairMeta.width / 2
      // AMENDS 6.1: the stored offset lands on the mouse movement grid.
      const nextOffsetX = snapMoveWithin(
        originOffsetX + (current.x - start.x),
        pairMeta.minX - baseX,
        pairMeta.maxX - baseX,
        pendingSpec.eyeMarks.offsetX ?? originOffsetX
      )
      pendingSpec = {
        ...pendingSpec,
        eyeMarks: {
          ...pendingSpec.eyeMarks,
          offsetX: nextOffsetX,
          offsetY: 0
        }
      }
      updateEyeMarkDom(pendingSpec.eyeMarks)
      return
    }

    const meta = getLayerMeta()
    if (meta.cutterWidth === 0 || meta.cutterHeight === 0) {
      return
    }
    const cutterRect = {
      x: meta.cutterX,
      y: meta.cutterY,
      width: meta.cutterWidth,
      height: meta.cutterHeight
    }
    const movementRect =
      meta.packId === "k-seal-pouch" && drag.origin.count === 2
        ? {
            x: drag.index === 0
              ? meta.cutterX
              : meta.cutterX + meta.cutterWidth - meta.trimWidth,
            y: meta.cutterY,
            width: meta.trimWidth,
            height: meta.cutterHeight
          }
        : cutterRect

    const baseRects = getBaseRects(drag.origin)
    const originOffsets = getEyeMarkOffsetsForIndex(drag.origin, drag.index)
    const originRect = baseRects[drag.index]
    if (!originRect) {
      return
    }

    if (drag.mode === "move") {
      const axisLocked = drag.origin.count === 1 && (pendingSpec.kSealPouch || pendingSpec.doyPouch)
      // AMENDS 6.1: snap the stored offsets (the saved position) to the mouse movement grid.
      const toOffsets = (rect: { x: number; y: number }) => ({ offsetX: rect.x - originRect.x, offsetY: rect.y - originRect.y })
      const nextOffsets = snapMovedElement(
        {
          offsetX: originOffsets.offsetX + (axisLocked ? 0 : current.x - start.x),
          offsetY: originOffsets.offsetY + (current.y - start.y)
        },
        axisLocked ? ["offsetY"] as const : ["offsetX", "offsetY"] as const,
        next => toOffsets(clampRectToCutter(
          {
            x: originRect.x + next.offsetX,
            y: originRect.y + next.offsetY,
            width: originRect.width,
            height: originRect.height
          },
          movementRect
        )),
        originOffsets
      )
      pendingSpec = {
        ...pendingSpec,
        eyeMarks: setEyeMarkOffsetsForIndex(
          pendingSpec.eyeMarks,
          drag.index,
          nextOffsets.offsetX,
          nextOffsets.offsetY
        )
      }
      // TODO: Freeform eyemark dragging stays direct for now because this path
      // is high-frequency interactive geometry. Bridge migration should happen
      // later with preview-safe batching instead of per-pointer-step requests.
      updateEyeMarkDom(pendingSpec.eyeMarks)
      return
    }

    const isKSealDual = meta.packId === "k-seal-pouch" && drag.origin.count === 2
    const minSize = 0.1
    const originSize = getEyeMarkSizeForIndex(drag.origin, drag.index)
    let width = originSize.width
    let height = originSize.height
    let desiredX = originRect.x + originOffsets.offsetX
    let desiredY = originRect.y + originOffsets.offsetY

    if (drag.handle === "se") {
      width = Math.max(minSize, originSize.width + dx)
      height = Math.max(minSize, originSize.height + dy)
    } else if (drag.handle === "sw") {
      width = Math.max(minSize, originSize.width - dx)
      height = Math.max(minSize, originSize.height + dy)
      desiredX = originRect.x + originOffsets.offsetX + dx
    } else if (drag.handle === "ne") {
      width = Math.max(minSize, originSize.width + dx)
      height = Math.max(minSize, originSize.height - dy)
      desiredY = originRect.y + originOffsets.offsetY + dy
    } else if (drag.handle === "nw") {
      width = Math.max(minSize, originSize.width - dx)
      height = Math.max(minSize, originSize.height - dy)
      desiredX = originRect.x + originOffsets.offsetX + dx
      desiredY = originRect.y + originOffsets.offsetY + dy
    }
    if(event.ctrlKey){
      const scale=Math.max(minSize/originSize.width,minSize/originSize.height,
        Math.abs(width/originSize.width-1)>=Math.abs(height/originSize.height-1)?width/originSize.width:height/originSize.height)
      const limited=Math.min(scale,(isKSealDual?getKSealDualEyemarkTarget(meta.trimWidth):meta.cutterWidth)/originSize.width,meta.cutterHeight/originSize.height)
      width=originSize.width*limited;height=originSize.height*limited
    }
    if (isKSealDual) {
      width = Math.min(getKSealDualEyemarkTarget(meta.trimWidth), width)
      height = Math.min(meta.cutterHeight, height)
    }

    const anchorX = resolveAnchorX(drag.origin, drag.index)
    if (anchorX === "left") {
      desiredX = originRect.x + originOffsets.offsetX
    } else if (anchorX === "right") {
      const currentX = originRect.x + originOffsets.offsetX
      const currentRight = currentX + originSize.width
      desiredX = currentRight - width
    }

    const nextSpec: EyeMarkSpec = setEyeMarkSizeForIndex(pendingSpec.eyeMarks, drag.index, width, height)
    const nextBaseRects = getBaseRects(nextSpec)
    const nextRect = nextBaseRects[drag.index]
    if (!nextRect) {
      return
    }
    const clamped = clampRectToCutter(
      {
        x: desiredX,
        y: desiredY,
        width: nextRect.width,
        height: nextRect.height
      },
      movementRect
    )
    pendingSpec = {
      ...pendingSpec,
      eyeMarks: setEyeMarkOffsetsForIndex(
        nextSpec,
        drag.index,
        clamped.x - nextRect.x,
        clamped.y - nextRect.y
      )
    }
    updateEyeMarkDom(pendingSpec.eyeMarks)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
    onSpecChange(pendingSpec)
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointercancel", onPointerUp)
  svg.addEventListener("lostpointercapture", onPointerUp)
}
