import { updateTextDirectionArt } from "../renderers/textDirectionArt"
import { snapResizeFromOrigin } from "./resizeSnap"
import { snapMovedElement } from "./movementSnap"
import { alignAttributePlacement } from "../../../../packages/cutter-engine/actions/attributeAlignment"
import {
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "../renderers/movementHandleImages"
import {
  clampPaperStripClearStripAttribute,
  getPaperStripLaneIndexAtX,
  isPaperStripClearStripAttribute
} from "../constraints/paperStrip"
import type { AttributeBoxSpec, FlowwrapSpec } from "../types/flowwrap"

import { proportionalResize } from "../../../../packages/cutter-engine/actions/proportionalResize"

type DragState = {
  mode: "move" | "resize" | "rotate"
  boxId: string
  handle?: "nw" | "ne" | "sw" | "se" | "left" | "right" | "top" | "bottom"
  startX: number
  startY: number
  originLaneIndex: number
  origin: AttributeBoxSpec
  startAngle?: number
  startRotation?: number
}

type LayerMeta = {
  packId: string
  liveX: number
  liveY: number
  cutterX: number
  cutterY: number
  cutterHeight: number
  handleRadius: number
  rotateHandleRadius: number
  stepEnabled: boolean
  stepCount: number
  stepSpan: number
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

export function attachAttributeBoxInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  const step = 1
  const snap = (value: number) => Math.round(value / step) * step
  let pendingSpec = spec
  let selectedBoxId =
    pendingSpec.attributeBoxes?.find(box => box.selected)?.id ?? null

  const normalizeRotation = (rotation: number) => {
    const raw = rotation % 360
    return raw < 0 ? raw + 360 : raw
  }

  const getAngleDegrees = (cx: number, cy: number, x: number, y: number) =>
    (Math.atan2(y - cy, x - cx) * 180) / Math.PI

  const applyRotation = (element: SVGElement, rotation: number, cx: number, cy: number) => {
    if (rotation === 0) {
      element.removeAttribute("transform")
      return
    }
    element.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`)
  }

  const rotateDelta = (dx: number, dy: number, angleDegrees: number) => {
    const angle = (angleDegrees * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos
    }
  }

  const getLayerMeta = (): LayerMeta => {
    const layer = svg.querySelector("g#attribute_boxes")
    if (!layer) {
      return {
        packId: "",
        liveX: 0,
        liveY: 0,
        cutterX: 0,
        cutterY: 0,
        cutterHeight: 0,
        handleRadius: 0.5,
        rotateHandleRadius: 1.2,
        stepEnabled: false,
        stepCount: 1,
        stepSpan: 0
      }
    }
    return {
      packId: layer.getAttribute("data-pack-id") ?? "",
      liveX: Number(layer.getAttribute("data-live-origin-x") ?? "0"),
      liveY: Number(layer.getAttribute("data-live-origin-y") ?? "0"),
      cutterX: Number(layer.getAttribute("data-cutter-origin-x") ?? "0"),
      cutterY: Number(layer.getAttribute("data-cutter-origin-y") ?? "0"),
      cutterHeight: Number(layer.getAttribute("data-cutter-height") ?? "0"),
      handleRadius: Number(layer.getAttribute("data-handle-radius") ?? "0.5"),
      rotateHandleRadius: Number(layer.getAttribute("data-rotate-handle-radius") ?? "1.2"),
      stepEnabled: layer.getAttribute("data-sachet-step-enabled") === "true",
      stepCount: Number(layer.getAttribute("data-sachet-step-count") ?? "1"),
      stepSpan: Number(layer.getAttribute("data-sachet-step-span") ?? "0")
    }
  }

  const getLaneSide = (laneIndex: number, stepCount: number) => {
    const midLeft = Math.floor(stepCount / 2) - 1
    return laneIndex <= midLeft ? "A" : "B"
  }

  const getLaneLiveOriginX = (meta: LayerMeta, laneIndex: number) =>
    meta.stepEnabled ? meta.liveX + laneIndex * meta.stepSpan : meta.liveX

  const getLaneCutterOriginX = (meta: LayerMeta, laneIndex: number) =>
    meta.stepEnabled ? meta.cutterX + laneIndex * meta.stepSpan : meta.cutterX

  const isPaperStripClearStripBox = (meta: LayerMeta, box: AttributeBoxSpec) =>
    meta.packId === "paper-strip" && isPaperStripClearStripAttribute(box)

  const getBoxAbsX = (meta: LayerMeta, laneIndex: number, box: AttributeBoxSpec) =>
    (isPaperStripClearStripBox(meta, box)
      ? getLaneCutterOriginX(meta, laneIndex)
      : getLaneLiveOriginX(meta, laneIndex)) + box.x

  const getBoxAbsY = (meta: LayerMeta, box: AttributeBoxSpec) =>
    isPaperStripClearStripBox(meta, box) ? meta.cutterY : meta.liveY + box.y

  const getBoxHeight = (meta: LayerMeta, box: AttributeBoxSpec) =>
    isPaperStripClearStripBox(meta, box) ? meta.cutterHeight : box.height

  const isLaneVisibleForBox = (meta: LayerMeta, laneIndex: number, box: AttributeBoxSpec) => {
    if (isPaperStripClearStripBox(meta, box) && meta.stepEnabled) {
      return (box.laneIndex ?? 0) === laneIndex
    }
    if (!meta.stepEnabled || meta.stepCount < 2 || !box.laneSide || box.kind === "label") {
      return true
    }
    return getLaneSide(laneIndex, meta.stepCount) === box.laneSide
  }

  const resolveNearestLaneIndex = (meta: LayerMeta, absoluteCenterX: number) => {
    if (!meta.stepEnabled || meta.stepCount <= 1 || meta.stepSpan <= 0) {
      return 0
    }
    let nearestLaneIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    for (let laneIndex = 0; laneIndex < meta.stepCount; laneIndex += 1) {
      const laneCenterX = getLaneLiveOriginX(meta, laneIndex)
      const distance = Math.abs(absoluteCenterX - laneCenterX)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestLaneIndex = laneIndex
      }
    }
    return nearestLaneIndex
  }

  const setImageCenter = (image: SVGImageElement, centerX: number, centerY: number) => {
    const width = Number(image.getAttribute("width") ?? "0")
    const height = Number(image.getAttribute("height") ?? "0")
    image.setAttribute("x", (centerX - width / 2).toString())
    image.setAttribute("y", (centerY - height / 2).toString())
  }

  const setElementVisibility = (element: SVGElement, visible: boolean) => {
    element.setAttribute("display", visible ? "inline" : "none")
  }

  const setSelectedBox = (boxId: string | null) => {
    if (!pendingSpec.attributeBoxes) {
      selectedBoxId = null
      return
    }
    selectedBoxId = boxId
    pendingSpec = {
      ...pendingSpec,
      attributeBoxes: pendingSpec.attributeBoxes.map(box => ({
        ...box,
        selected: box.id === boxId
      }))
    }
    onSpecChange(pendingSpec)
  }

  const updateBoxDom = (box: AttributeBoxSpec) => {
    const meta = getLayerMeta()
    const absY = getBoxAbsY(meta, box)
    const boxHeight = getBoxHeight(meta, box)
    const rotation = box.rotation ?? 0
    const centerY = absY + boxHeight / 2

    const rects = svg.querySelectorAll<SVGRectElement>(
      `[data-box-id="${box.id}"][data-role="attribute-box"]`
    )
    rects.forEach(rect => {
      const laneIndex = Number(rect.getAttribute("data-lane-index") ?? "0")
      const absX = getBoxAbsX(meta, laneIndex, box)
      const centerX = absX + box.width / 2
      setElementVisibility(rect, isLaneVisibleForBox(meta, laneIndex, box))
      rect.setAttribute("x", absX.toString())
      rect.setAttribute("y", absY.toString())
      rect.setAttribute("width", box.width.toString())
      rect.setAttribute("height", boxHeight.toString())
      applyRotation(rect, rotation, centerX, centerY)
    })

    const moveHandles = svg.querySelectorAll<SVGImageElement>(
      `[data-box-id="${box.id}"][data-role="attribute-box-move"]`
    )
    moveHandles.forEach(handle => {
      const laneIndex = Number(handle.getAttribute("data-lane-index") ?? "0")
      const absX = getBoxAbsX(meta, laneIndex, box)
      const centerX = absX + box.width / 2
      const moveCenter = getMoveHandleCenter(absX, absY, box.width, boxHeight)
      setElementVisibility(handle, isLaneVisibleForBox(meta, laneIndex, box))
      setImageCenter(handle, moveCenter.x, moveCenter.y)
      applyRotation(handle, rotation, centerX, centerY)
    })

    const resizeHandles = svg.querySelectorAll<SVGElement>(
      `[data-box-id="${box.id}"][data-role="attribute-box-handle"]`
    )
    resizeHandles.forEach(handle => {
      const laneIndex = Number(handle.getAttribute("data-lane-index") ?? "0")
      const absX = getBoxAbsX(meta, laneIndex, box)
      const centerX = absX + box.width / 2
      if (isPaperStripClearStripBox(meta, box)) {
        const handleType = handle.getAttribute("data-handle")
        const handleX = handleType === "left" ? absX : absX + box.width
        const handleY = absY + boxHeight / 2
        setElementVisibility(handle, isLaneVisibleForBox(meta, laneIndex, box))
        handle.setAttribute("cx", handleX.toString())
        handle.setAttribute("cy", handleY.toString())
      } else {
        const corners = getSquareResizeCorners(absX, absY, box.width, boxHeight)
        const corner = corners.find(item => item.key === handle.getAttribute("data-handle"))
        if (!corner) {
          return
        }
        setElementVisibility(handle, isLaneVisibleForBox(meta, laneIndex, box))
        if (handle instanceof SVGImageElement) {
          setImageCenter(handle, corner.x, corner.y)
        }
        applyRotation(handle, rotation, centerX, centerY)
      }
    })

    const rotateHandles = svg.querySelectorAll<SVGImageElement>(
      `[data-box-id="${box.id}"][data-role="attribute-box-rotate"]`
    )
    rotateHandles.forEach(handle => {
      const laneIndex = Number(handle.getAttribute("data-lane-index") ?? "0")
      const absX = getBoxAbsX(meta, laneIndex, box)
      const centerX = absX + box.width / 2
      const rotateCenter = getRotateHandleCenter(absX, absY, box.width)
      setElementVisibility(handle, isLaneVisibleForBox(meta, laneIndex, box))
      setImageCenter(handle, rotateCenter.x, rotateCenter.y)
      applyRotation(handle, rotation, centerX, centerY)
    })

    svg.querySelectorAll<SVGElement>(`[data-box-id="${box.id}"][data-role="text-direction-art"]`).forEach(art=>{
      const laneIndex=Number(art.getAttribute("data-lane-index")??"0")
      updateTextDirectionArt(art,getBoxAbsX(meta,laneIndex,box),absY,box.width,boxHeight,rotation)
      setElementVisibility(art,isLaneVisibleForBox(meta,laneIndex,box))
    })
    const labels = svg.querySelectorAll<SVGTextElement>(
      `[data-box-id="${box.id}"][data-role="attribute-box-label"]`
    )
    labels.forEach(label => {
      const laneIndex = Number(label.getAttribute("data-lane-index") ?? "0")
      const absX = getBoxAbsX(meta, laneIndex, box)
      const centerX = absX + box.width / 2
      setElementVisibility(label, isLaneVisibleForBox(meta, laneIndex, box))
      label.setAttribute("x", centerX.toString())
      label.setAttribute("y", centerY.toString())
      applyRotation(label, rotation, centerX, centerY)
    })

    const rotateLabels = svg.querySelectorAll<SVGTextElement>(
      `[data-box-id="${box.id}"][data-role="attribute-box-rotate-label"]`
    )
    rotateLabels.forEach(label => {
      const laneIndex = Number(label.getAttribute("data-lane-index") ?? "0")
      const absX = getBoxAbsX(meta, laneIndex, box)
      setElementVisibility(label, isLaneVisibleForBox(meta, laneIndex, box))
      label.setAttribute("x", (absX + box.width + 2).toString())
      label.setAttribute("y", (absY - 2).toString())
      label.textContent = `${Math.round(normalizeRotation(rotation))}°`
      label.removeAttribute("transform")
    })
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
    const boxId = target.getAttribute("data-box-id")
    if (!boxId) {
      if (selectedBoxId) {
        setSelectedBox(null)
      }
      return
    }
    if (!pendingSpec.attributeBoxes) {
      return
    }
    const box = pendingSpec.attributeBoxes.find(b => b.id === boxId)
    if (!box) {
      return
    }
    if (box.id !== selectedBoxId) {
      return
    }

    const handle = target.getAttribute("data-handle") as DragState["handle"]
    const originLaneIndex = Number(target.getAttribute("data-lane-index") ?? "0")
    if (
      target.getAttribute("data-role") === "attribute-box" ||
      target.getAttribute("data-role") === "attribute-box-move"
    ) {
      drag = {
        mode: "move",
        boxId,
        startX: event.clientX,
        startY: event.clientY,
        originLaneIndex,
        origin: { ...box }
      }
    } else if (target.getAttribute("data-role") === "attribute-box-handle" && handle) {
      drag = {
        mode: "resize",
        boxId,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        originLaneIndex,
        origin: { ...box }
      }
    } else if (target.getAttribute("data-role") === "attribute-box-rotate") {
      const meta = getLayerMeta()
      const centerX = getBoxAbsX(meta, originLaneIndex, box) + box.width / 2
      const centerY = getBoxAbsY(meta, box) + getBoxHeight(meta, box) / 2
      const startPoint = getSvgPoint(svg, event.clientX, event.clientY)
      drag = {
        mode: "rotate",
        boxId,
        startX: event.clientX,
        startY: event.clientY,
        originLaneIndex,
        origin: { ...box },
        startAngle: getAngleDegrees(centerX, centerY, startPoint.x, startPoint.y),
        startRotation: box.rotation ?? 0
      }
      svg.style.cursor = "grabbing"
    }

    if (drag) {
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.attributeBoxes) {
      return
    }
    const meta = getLayerMeta()
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x
    const rawDy = current.y - start.y
    const dx = snap(rawDx)
    const dy = snap(rawDy)

    const nextBoxes = pendingSpec.attributeBoxes.map(box => {
      if (box.id !== drag!.boxId) {
        return box
      }
      if (drag!.mode === "rotate") {
        const rotationStart = drag!.startRotation ?? 0
        const centerX =
          getBoxAbsX(meta, drag!.originLaneIndex, drag!.origin) +
          drag!.origin.width / 2
        const centerY =
          getBoxAbsY(meta, drag!.origin) +
          getBoxHeight(meta, drag!.origin) / 2
        const angle = getAngleDegrees(centerX, centerY, current.x, current.y)
        const startAngle = drag!.startAngle ?? angle
        const rawRotation = rotationStart + (angle - startAngle)
        const nextRotation = event.shiftKey
          ? Math.round(rawRotation / 15) * 15
          : snap(rawRotation)
        const rotated = { ...box, rotation: nextRotation }
        updateBoxDom(rotated)
        const labels = svg.querySelectorAll<SVGTextElement>(
          `[data-box-id="${box.id}"][data-role="attribute-box-rotate-label"]`
        )
        labels.forEach(label => {
          label.setAttribute("opacity", "1")
          label.setAttribute("x", (current.x + 2).toString())
          label.setAttribute("y", (current.y - 2).toString())
          label.textContent = `${Math.round(normalizeRotation(nextRotation))}°`
        })
        return rotated
      }
      if (drag!.mode === "move") {
        const isClearStrip = isPaperStripClearStripBox(meta, box)
        // AMENDS 6.1: follow the pointer, then snap the resulting position (not the delta).
        const absoluteX = getBoxAbsX(meta, drag!.originLaneIndex, drag!.origin) + rawDx
        const absoluteCenterX = absoluteX + drag!.origin.width / 2
        const nextLaneIndex = isClearStrip
          ? meta.stepEnabled ? getPaperStripLaneIndexAtX(pendingSpec, absoluteCenterX, meta.cutterX) : 0
          : resolveNearestLaneIndex(meta, absoluteCenterX)
        const baseMoved = {
          ...box,
          x: absoluteX -
            (isClearStrip
              ? getLaneCutterOriginX(meta, nextLaneIndex)
              : getLaneLiveOriginX(meta, nextLaneIndex)),
          y: isClearStrip ? 0 : drag!.origin.y + rawDy,
          laneIndex: isClearStrip ? nextLaneIndex : box.laneIndex,
          laneSide:
            meta.stepEnabled && meta.stepCount > 1 && box.kind !== "label" && !isClearStrip
              ? getLaneSide(nextLaneIndex, meta.stepCount)
              : box.laneSide
        }
        const moved =
          isClearStrip && pendingSpec.paperStrip
            ? snapMovedElement(baseMoved, ["x"], next => clampPaperStripClearStripAttribute(pendingSpec, next), drag!.origin)
            : snapMovedElement(
                // Centre/squared guides still attract first; the movement grid has the final say.
                alignAttributePlacement(pendingSpec,baseMoved,
                  document.documentElement.getAttribute("data-centre-guides")!=="false",
                  document.documentElement.getAttribute("data-squared-guides")!=="false",.75),
                ["x", "y"],
                next => next,
                drag!.origin
              )
        updateBoxDom(moved)
        return moved
      }

      const rotation = drag!.origin.rotation ?? 0
      const localDelta = rotateDelta(dx, dy, -rotation)
      const localDx = localDelta.x
      const localDy = localDelta.y

      const minSize = 1
      const isClearStrip = isPaperStripClearStripBox(meta, box)
      let x = drag!.origin.x
      let y = drag!.origin.y
      let width = drag!.origin.width
      let height = drag!.origin.height

      if (isClearStrip && drag!.handle === "right") {
        width = Math.max(minSize, drag!.origin.width + localDx)
      } else if (isClearStrip && drag!.handle === "left") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        x = drag!.origin.x + localDx
      } else if (drag!.handle === "se") {
        width = Math.max(minSize, drag!.origin.width + localDx)
        height = Math.max(minSize, drag!.origin.height + localDy)
      } else if (drag!.handle === "sw") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        height = Math.max(minSize, drag!.origin.height + localDy)
        x = drag!.origin.x + localDx
      } else if (drag!.handle === "ne") {
        width = Math.max(minSize, drag!.origin.width + localDx)
        height = Math.max(minSize, drag!.origin.height - localDy)
        y = drag!.origin.y + localDy
      } else if (drag!.handle === "nw") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        height = Math.max(minSize, drag!.origin.height - localDy)
        x = drag!.origin.x + localDx
        y = drag!.origin.y + localDy
      } else if (drag!.handle === "left") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        x = drag!.origin.x + localDx
      } else if (drag!.handle === "right") {
        width = Math.max(minSize, drag!.origin.width + localDx)
      } else if (drag!.handle === "top") {
        height = Math.max(minSize, drag!.origin.height - localDy)
        y = drag!.origin.y + localDy
      } else if (drag!.handle === "bottom") {
        height = Math.max(minSize, drag!.origin.height + localDy)
      }

      if (event.shiftKey && !event.ctrlKey && !isClearStrip && drag!.origin.height > 0) {
        const ratio = drag!.origin.width / drag!.origin.height
        if (drag!.handle === "left" || drag!.handle === "right") {
          const oldHeight = height
          height = Math.max(minSize, width / ratio)
          y -= (height - oldHeight) / 2
        } else {
          const oldWidth = width
          width = Math.max(minSize, height * ratio)
          x -= (width - oldWidth) / 2
        }
      }

      if(event.ctrlKey && !isClearStrip)({x,y,width,height}=proportionalResize(drag!.origin,{x,y,width,height},drag!.handle,minSize))
      const stepped = box.kind === "barcode" || box.kind === "qr" || box.kind === "bbe"
      if (stepped) {
        width = Math.max(minSize, snapResizeFromOrigin(drag!.origin.width, width))
        height = Math.max(minSize, snapResizeFromOrigin(drag!.origin.height, height))
        if (drag!.handle?.includes("w") || drag!.handle === "left") x = drag!.origin.x + drag!.origin.width - width
        if (drag!.handle?.includes("n") || drag!.handle === "top") y = drag!.origin.y + drag!.origin.height - height
      }
      const resizedBase = {
        ...box,
        x: stepped ? x : snap(x),
        y: isClearStrip ? 0 : stepped ? y : snap(y),
        width: stepped || event.ctrlKey && !isClearStrip ? width : snap(width),
        height: isClearStrip ? getBoxHeight(meta, box) : stepped || event.ctrlKey ? height : snap(height)
      }
      const resized =
        isClearStrip && pendingSpec.paperStrip
          ? clampPaperStripClearStripAttribute(pendingSpec, resizedBase)
          : resizedBase
      updateBoxDom(resized)
      return resized
    })

    pendingSpec = { ...pendingSpec, attributeBoxes: nextBoxes }
  }

  const finishDrag = (event: PointerEvent, releaseCapture: boolean) => {
    if (!drag) {
      return
    }
    const boxId = drag.boxId
    drag = null
    if (releaseCapture && svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
    onSpecChange(pendingSpec)
    const rotateLabels = svg.querySelectorAll<SVGTextElement>(
      `[data-box-id="${boxId}"][data-role="attribute-box-rotate-label"]`
    )
    rotateLabels.forEach(label => {
      label.setAttribute("opacity", "0")
    })
    svg.style.cursor = ""
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", event => finishDrag(event, true))
  svg.addEventListener("pointercancel", event => finishDrag(event, true))
  svg.addEventListener("lostpointercapture", event => finishDrag(event, false))
}
