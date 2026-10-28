import { safeZoneOutlinePath, constrainPouchSafeZone } from "../../../../packages/cutter-engine/actions/safeZoneContours"
import { clearMeasurementAnnotations, updateMeasurementAnnotations } from "./measurementAnnotations"
import { snapResizeFromOrigin } from "./resizeSnap"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { SafeZoneSpec } from "../types/flowwrap"
import {
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "../renderers/movementHandleImages"

import { proportionalResize } from "../../../../packages/cutter-engine/actions/proportionalResize"
import { snapMovedElement } from "./movementSnap"

type DragState = {
  mode: "move" | "resize" | "rotate"
  zoneId: string
  handle?: "nw" | "ne" | "sw" | "se" | "left" | "right" | "top" | "bottom"
  startX: number
  startY: number
  origin: SafeZoneSpec
  startAngle?: number
  startRotation?: number
}

type ArcMeta = {
  leftX: number
  rightX: number
  depth: number
  originY: number
  height: number
  liveCenterX: number
}

type Point = { x: number; y: number }

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
})

const splitCubic = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
) => {
  const p01 = lerp(p0, p1, t)
  const p12 = lerp(p1, p2, t)
  const p23 = lerp(p2, p3, t)
  const p012 = lerp(p01, p12, t)
  const p123 = lerp(p12, p23, t)
  const p0123 = lerp(p012, p123, t)
  return {
    left: [p0, p01, p012, p0123],
    right: [p0123, p123, p23, p3]
  }
}

const cubicSubsegment = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t0: number,
  t1: number
) => {
  if (t1 <= t0) {
    return null
  }
  const splitAtT1 = splitCubic(p0, p1, p2, p3, t1)
  const left = splitAtT1.left
  if (t0 <= 0) {
    return left
  }
  const relT = t0 / t1
  const splitAtT0 = splitCubic(left[0], left[1], left[2], left[3], relT)
  return splitAtT0.right
}

const getArcMeta = (layer: SVGGElement) => {
  const leftX = Number(layer.getAttribute("data-doy-arc-left-x"))
  const rightX = Number(layer.getAttribute("data-doy-arc-right-x"))
  const depth = Number(layer.getAttribute("data-doy-arc-depth"))
  const originY = Number(layer.getAttribute("data-doy-origin-y"))
  const height = Number(layer.getAttribute("data-doy-height"))
  const liveX = Number(layer.getAttribute("data-live-origin-x") ?? "0")
  const liveWidth = Number(layer.getAttribute("data-live-width") ?? "0")
  if (
    !Number.isFinite(leftX) ||
    !Number.isFinite(rightX) ||
    !Number.isFinite(depth) ||
    !Number.isFinite(originY) ||
    !Number.isFinite(height) ||
    !Number.isFinite(liveWidth)
  ) {
    return null
  }
  const meta: ArcMeta = {
    leftX,
    rightX,
    depth,
    originY,
    height,
    liveCenterX: liveX + liveWidth / 2
  }
  return meta
}

const getArcSide = (
  meta: ArcMeta,
  left: number,
  right: number,
  centerX: number
) => {
  const leftIntersect = meta.leftX >= left && meta.leftX <= right
  const rightIntersect = meta.rightX >= left && meta.rightX <= right
  if (leftIntersect && rightIntersect) {
    return centerX <= meta.liveCenterX ? "left" : "right"
  }
  if (leftIntersect) {
    return "left"
  }
  if (rightIntersect) {
    return "right"
  }
  return null
}

const buildArcPath = (
  meta: ArcMeta,
  zoneLeft: number,
  zoneTop: number,
  zoneRight: number,
  zoneBottom: number,
  side: "left" | "right"
) => {
  const arcX = side === "left" ? meta.leftX : meta.rightX
  const controlX = arcX + meta.depth * (side === "left" ? 1 : -1)
  const topY = meta.originY
  const bottomY = meta.originY + meta.height
  const t0 = clamp01((zoneTop - topY) / meta.height)
  const t1 = clamp01((zoneBottom - topY) / meta.height)
  const p0 = { x: arcX, y: topY }
  const p1 = { x: controlX, y: topY + meta.height * 0.25 }
  const p2 = { x: controlX, y: topY + meta.height * 0.75 }
  const p3 = { x: arcX, y: bottomY }
  const segment = cubicSubsegment(p0, p1, p2, p3, t0, t1)
  if (!segment) {
    return null
  }
  const [s0, s1, s2, s3] = segment
  if (side === "right") {
    return [
      `M ${zoneLeft} ${s0.y}`,
      `L ${s0.x} ${s0.y}`,
      `C ${s1.x} ${s1.y} ${s2.x} ${s2.y} ${s3.x} ${s3.y}`,
      `L ${zoneLeft} ${s3.y}`,
      "Z"
    ].join(" ")
  }
  return [
    `M ${s0.x} ${s0.y}`,
    `L ${zoneRight} ${s0.y}`,
    `L ${zoneRight} ${s3.y}`,
    `L ${s3.x} ${s3.y}`,
    `C ${s2.x} ${s2.y} ${s1.x} ${s1.y} ${s0.x} ${s0.y}`,
    "Z"
  ].join(" ")
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

function applyRotation(
  element: SVGElement,
  rotation: number,
  cx: number,
  cy: number
) {
  if (rotation === 0) {
    element.removeAttribute("transform")
    return
  }
  element.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`)
}

function normalizeRotation(rotation: number) {
  const raw = rotation % 360
  return raw < 0 ? raw + 360 : raw
}

function getAngleDegrees(cx: number, cy: number, x: number, y: number) {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI
}

export function attachSafeZoneInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void,
  onMeasurementActive?: (active: boolean) => void
) {
  let drag: DragState | null = null
  const step = 1
  const snap = (value: number) => Math.round(value / step) * step
  let pendingSpec = spec
  let selectedZoneId =
    pendingSpec.safeZones?.find(zone => zone.selected)?.id ?? null

  const setSelectedZone = (zoneId: string | null) => {
    if (!pendingSpec.safeZones) {
      selectedZoneId = null
      return
    }
    selectedZoneId = zoneId
    pendingSpec = {
      ...pendingSpec,
      safeZones: pendingSpec.safeZones.map(zone => ({
        ...zone,
        selected: zone.id === zoneId
      }))
    }
    onSpecChange(pendingSpec)
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
    const zoneId = target.getAttribute("data-zone-id")
    if (!zoneId) {
      if (selectedZoneId) {
        setSelectedZone(null)
      }
      return
    }
    if (!zoneId || !pendingSpec.safeZones) {
      return
    }
    const zone = pendingSpec.safeZones.find(z => z.id === zoneId)
    if (!zone) {
      return
    }
    if (zone.id !== selectedZoneId) {
      return
    }

    const handle = target.getAttribute("data-handle") as DragState["handle"]
    if (
      target.getAttribute("data-role") === "safe-zone" ||
      target.getAttribute("data-role") === "safe-zone-move"
    ) {
      drag = {
        mode: "move",
        zoneId,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...zone }
      }
    } else if (target.getAttribute("data-role") === "safe-zone-handle" && handle) {
      drag = {
        mode: "resize",
        zoneId,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...zone }
      }
    } else if (target.getAttribute("data-role") === "safe-zone-rotate") {
      const { liveX, liveY } = getLayerMeta()
      const centerX = liveX + zone.x + zone.width / 2
      const centerY = liveY + zone.y + zone.height / 2
      const startPoint = getSvgPoint(svg, event.clientX, event.clientY)
      drag = {
        mode: "rotate",
        zoneId,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...zone },
        startAngle: getAngleDegrees(centerX, centerY, startPoint.x, startPoint.y),
        startRotation: zone.rotation ?? 0
      }
    }

    if (drag) {
      svg.setAttribute("data-dragging", "true")
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
  }

  const getLayerMeta = () => {
    const layer = svg.querySelector("g#safe_zones")
    const sealLayer = svg.querySelector("g#seal_areas")
    if (!layer) {
      return {
        liveX: 0,
        liveY: 0,
        liveWidth: 0,
        liveHeight: 0,
        cutterMinX: 0,
        cutterMinY: 0,
        cutterWidth: 0,
        cutterHeight: 0,
        handleRadius: 0.5
      }
    }
    const liveX = Number(layer.getAttribute("data-live-origin-x") ?? "0")
    const liveY = Number(layer.getAttribute("data-live-origin-y") ?? "0")
    const liveWidth = Number(
      layer.getAttribute("data-live-width") ??
        sealLayer?.getAttribute("data-live-width") ??
        "0"
    )
    const liveHeight = Number(
      layer.getAttribute("data-live-height") ??
        sealLayer?.getAttribute("data-live-height") ??
        "0"
    )
    const handleRadius = Number(layer.getAttribute("data-handle-radius") ?? "0.5")
    const cutterOriginX = Number(sealLayer?.getAttribute("data-origin-x") ?? liveX)
    const cutterOriginY = Number(sealLayer?.getAttribute("data-origin-y") ?? liveY)
    const cutterWidth = Number(
      sealLayer?.getAttribute("data-cutter-width") ?? liveWidth
    )
    const cutterHeight = Number(
      sealLayer?.getAttribute("data-cutter-height") ?? liveHeight
    )
    return {
      liveX,
      liveY,
      liveWidth,
      liveHeight,
      cutterMinX: cutterOriginX - liveX,
      cutterMinY: cutterOriginY - liveY,
      cutterWidth,
      cutterHeight,
      handleRadius
    }
  }

  const updateZoneDom = (zone: SafeZoneSpec) => {
    const { liveX, liveY, handleRadius } = getLayerMeta()
    const absX = liveX + zone.x
    const absY = liveY + zone.y
    const rotation = zone.rotation ?? 0
    const centerX = absX + zone.width / 2
    const centerY = absY + zone.height / 2

    const outlines = svg.querySelectorAll<SVGRectElement>(
      `[data-zone-id="${zone.id}"][data-role="safe-zone-outline"]`
    )
    outlines.forEach(rect => {
      rect.setAttribute("x", absX.toString())
      rect.setAttribute("y", absY.toString())
      rect.setAttribute("width", zone.width.toString())
      rect.setAttribute("height", zone.height.toString())
      applyRotation(rect, rotation, centerX, centerY)
    })

    const hitboxes = svg.querySelectorAll<SVGRectElement>(
      `[data-zone-id="${zone.id}"][data-role="safe-zone"]`
    )
    hitboxes.forEach(rect => {
      rect.setAttribute("x", absX.toString())
      rect.setAttribute("y", absY.toString())
      rect.setAttribute("width", zone.width.toString())
      rect.setAttribute("height", zone.height.toString())
      applyRotation(rect, rotation, centerX, centerY)
    })

    const moveHandle = svg.querySelector<SVGImageElement>(
      `[data-zone-id="${zone.id}"][data-role="safe-zone-move"]`
    )
    if (moveHandle) {
      const moveCenter = getMoveHandleCenter(absX, absY, zone.width, zone.height)
      moveHandle.setAttribute("x", (moveCenter.x - 2).toString())
      moveHandle.setAttribute("y", (moveCenter.y - 2).toString())
      applyRotation(moveHandle, rotation, centerX, centerY)
    }

    const handles = svg.querySelectorAll<SVGImageElement>(
      `[data-zone-id="${zone.id}"][data-role="safe-zone-handle"]`
    )
    const cornerMap = new Map(
      getSquareResizeCorners(absX, absY, zone.width, zone.height).map(corner => [corner.key, corner])
    )
    handles.forEach(handle => {
      const key = (handle.getAttribute("data-handle") ?? "nw") as "nw" | "ne" | "sw" | "se"
      const corner = cornerMap.get(key)
      if (!corner) {
        return
      }
      handle.setAttribute("x", (corner.x - 1.5).toString())
      handle.setAttribute("y", (corner.y - 1.5).toString())
      applyRotation(handle, rotation, centerX, centerY)
    })

    const rotateHandle = svg.querySelector<SVGImageElement>(
      `[data-zone-id="${zone.id}"][data-role="safe-zone-rotate"]`
    )
    if (rotateHandle) {
      const rotateCenter = getRotateHandleCenter(absX, absY, zone.width)
      rotateHandle.setAttribute("x", (rotateCenter.x - 2).toString())
      rotateHandle.setAttribute("y", (rotateCenter.y - 2).toString())
      applyRotation(rotateHandle, rotation, centerX, centerY)
    }

    const contour = safeZoneOutlinePath(zone, liveX, liveY)
    if (contour) {
      svg.querySelectorAll<SVGElement>(`path[data-zone-id="${zone.id}"]`).forEach(path => {
        path.setAttribute("d", contour)
        applyRotation(path, rotation, centerX, centerY)
      })
      return
    }
    const layer = svg.querySelector<SVGGElement>("g#safe_zones")
    if (layer) {
      const meta = getArcMeta(layer)
      const arcPath = layer.querySelector<SVGPathElement>(
        `[data-zone-id="${zone.id}"][data-role="safe-zone-arc"]`
      )
      if (meta) {
        const zoneLeft = absX
        const zoneRight = absX + zone.width
        const zoneTop = absY
        const zoneBottom = absY + zone.height
        const zoneCenterX = absX + zone.width / 2
        const side = getArcSide(meta, zoneLeft, zoneRight, zoneCenterX)
        if (side) {
          const d = buildArcPath(meta, zoneLeft, zoneTop, zoneRight, zoneBottom, side)
            if (d) {
              if (arcPath) {
                arcPath.setAttribute("d", d)
                arcPath.setAttribute("data-arc-side", side)
                applyRotation(arcPath, rotation, centerX, centerY)
              } else {
                const created = document.createElementNS(
                  svg.namespaceURI,
                  "path"
                ) as SVGPathElement
                created.setAttribute("d", d)
                created.setAttribute("fill", "none")
                created.setAttribute("stroke", "#fca1f4")
              created.setAttribute("stroke-width", "0.6")
              created.setAttribute("stroke-dasharray", "3 3")
              created.setAttribute("opacity", "0.45")
              created.setAttribute("data-zone-id", zone.id)
              created.setAttribute("data-role", "safe-zone-arc")
              created.setAttribute("data-arc-side", side)
              applyRotation(created, rotation, centerX, centerY)
              layer.appendChild(created)
            }
            outlines.forEach(rect => rect.setAttribute("stroke", "none"))
            return
          }
        }
      }
      if (arcPath) {
        arcPath.remove()
      }
      outlines.forEach(rect => {
        rect.setAttribute("stroke", "#fca1f4")
        rect.setAttribute("stroke-width", "0.6")
        rect.setAttribute("stroke-dasharray", "3 3")
      })
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.safeZones) {
      return
    }

    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x
    const rawDy = current.y - start.y
    const dx = snap(rawDx)
    const dy = snap(rawDy)

    const nextZones = pendingSpec.safeZones.map(zone => {
      if (zone.id !== drag!.zoneId) {
        return zone
      }
      if (drag!.mode === "move") {
        const { cutterMinX, cutterMinY, cutterWidth, cutterHeight } = getLayerMeta()
        const withinCutter = (next: typeof zone) => ({
          ...next,
          x: Math.max(cutterMinX, Math.min(Math.max(cutterMinX, cutterMinX + cutterWidth - zone.width), next.x)),
          y: Math.max(cutterMinY, Math.min(Math.max(cutterMinY, cutterMinY + cutterHeight - zone.height), next.y))
        })
        // AMENDS 6.1: snap the resulting position to the mouse movement grid,
        // keeping the cutter bounds and pouch seal-clearance constraint.
        const constrained = snapMovedElement(
          { ...zone, x: drag!.origin.x + rawDx, y: drag!.origin.y + rawDy },
          ["x", "y"],
          next => constrainPouchSafeZone(pendingSpec, zone, withinCutter(next)),
          zone
        )
        updateZoneDom(constrained)
        return constrained
      }

      if (drag!.mode === "rotate") {
        const { liveX, liveY } = getLayerMeta()
        const centerX = liveX + drag!.origin.x + drag!.origin.width / 2
        const centerY = liveY + drag!.origin.y + drag!.origin.height / 2
        const pointer = getSvgPoint(svg, event.clientX, event.clientY)
        const currentAngle = getAngleDegrees(centerX, centerY, pointer.x, pointer.y)
        const rawRotation = normalizeRotation(
          (drag!.startRotation ?? 0) + currentAngle - (drag!.startAngle ?? 0)
        )
        const nextRotation = event.shiftKey
          ? Math.round(rawRotation / 15) * 15
          : rawRotation
        const rotated = {
          ...zone,
          rotation: nextRotation
        }
        const constrained = constrainPouchSafeZone(pendingSpec, zone, rotated)
        updateZoneDom(constrained)
        return constrained
      }

      const minSize = 1
      let x = drag!.origin.x
      let y = drag!.origin.y
      let width = drag!.origin.width
      let height = drag!.origin.height

      if (drag!.handle === "se") {
        width = Math.max(minSize, drag!.origin.width + dx)
        height = Math.max(minSize, drag!.origin.height + dy)
      } else if (drag!.handle === "sw") {
        width = Math.max(minSize, drag!.origin.width - dx)
        height = Math.max(minSize, drag!.origin.height + dy)
        x = drag!.origin.x + dx
      } else if (drag!.handle === "ne") {
        width = Math.max(minSize, drag!.origin.width + dx)
        height = Math.max(minSize, drag!.origin.height - dy)
        y = drag!.origin.y + dy
      } else if (drag!.handle === "nw") {
        width = Math.max(minSize, drag!.origin.width - dx)
        height = Math.max(minSize, drag!.origin.height - dy)
        x = drag!.origin.x + dx
        y = drag!.origin.y + dy
      } else if (drag!.handle === "left") {
        width = Math.max(minSize, drag!.origin.width - dx)
        x = drag!.origin.x + dx
      } else if (drag!.handle === "right") {
        width = Math.max(minSize, drag!.origin.width + dx)
      } else if (drag!.handle === "top") {
        height = Math.max(minSize, drag!.origin.height - dy)
        y = drag!.origin.y + dy
      } else if (drag!.handle === "bottom") {
        height = Math.max(minSize, drag!.origin.height + dy)
      }

      if (event.shiftKey && !event.ctrlKey && drag!.origin.height > 0) {
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

      const { cutterMinX, cutterMinY, cutterWidth, cutterHeight } = getLayerMeta()
      if(event.ctrlKey)({x,y,width,height}=proportionalResize(drag!.origin,{x,y,width,height},drag!.handle,minSize,cutterWidth,cutterHeight))
      width = Math.max(minSize, snapResizeFromOrigin(drag!.origin.width, width))
      height = Math.max(minSize, snapResizeFromOrigin(drag!.origin.height, height))
      if (drag!.handle?.includes("w") || drag!.handle === "left") x = drag!.origin.x + drag!.origin.width - width
      if (drag!.handle?.includes("n") || drag!.handle === "top") y = drag!.origin.y + drag!.origin.height - height
      width = Math.min(width, Math.max(minSize, cutterWidth))
      height = Math.min(height, Math.max(minSize, cutterHeight))
      x = Math.max(
        cutterMinX,
        Math.min(Math.max(cutterMinX, cutterMinX + cutterWidth - width), x)
      )
      y = Math.max(
        cutterMinY,
        Math.min(Math.max(cutterMinY, cutterMinY + cutterHeight - height), y)
      )
      const resized = {
        ...zone,
        x,
        y,
        width,
        height
      }
      const constrained = constrainPouchSafeZone(pendingSpec, zone, resized)
      updateZoneDom(constrained)
      return constrained
    })

    pendingSpec = { ...pendingSpec, safeZones: nextZones }

    const activeDrag = drag
    if (activeDrag.mode === "move") {
      const updated = nextZones.find(zone => zone.id === activeDrag.zoneId)
      if (updated) {
        const { liveX, liveY } = getLayerMeta()
        const active = updateMeasurementAnnotations({
          svg,
          spec: pendingSpec,
          objectRect: {
            x: liveX + updated.x,
            y: liveY + updated.y,
            width: updated.width,
            height: updated.height
          },
          deltaX: dx,
          deltaY: dy,
          allowHorizontal: true,
          allowVertical: true
        })
        if (onMeasurementActive) {
          onMeasurementActive(active)
        }
      }
    } else {
      clearMeasurementAnnotations(svg)
      if (onMeasurementActive) {
        onMeasurementActive(false)
      }
    }
  }

  const finishDrag = (event: PointerEvent, releaseCapture: boolean) => {
    if (!drag) {
      return
    }
    drag = null
    svg.setAttribute("data-dragging", "false")
    if (releaseCapture && svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
    onSpecChange(pendingSpec)
    clearMeasurementAnnotations(svg)
    if (onMeasurementActive) {
      onMeasurementActive(false)
    }
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", event => finishDrag(event, true))
  svg.addEventListener("pointercancel", event => finishDrag(event, true))
  svg.addEventListener("lostpointercapture", event => finishDrag(event, false))
}
