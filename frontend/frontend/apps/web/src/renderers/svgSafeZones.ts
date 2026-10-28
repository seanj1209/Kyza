import type { SafeZoneSpec } from "../types/flowwrap"
import { safeZoneOutlinePath } from "../../../../packages/cutter-engine/actions/safeZoneContours"
import {
  createMovementHandleImage,
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "./movementHandleImages"

const SVG_NS = "http://www.w3.org/2000/svg"

const SAFE_ZONE_STYLE = {
  stroke: "#ea0bba",
  strokeWidth: 0.6,
  dash: "3 3",
  opacity: 0.6
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

const getArcMeta = (layer: SVGGElement): ArcMeta | null => {
  if (!layer.hasAttribute("data-doy-arc-left-x") || !layer.hasAttribute("data-doy-arc-right-x")) return null
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
    !Number.isFinite(liveWidth) || height <= 0
  ) {
    return null
  }
  return {
    leftX,
    rightX,
    depth,
    originY,
    height,
    liveCenterX: liveX + liveWidth / 2
  }
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
  side: "left" | "right",
  fitted = false
) => {
  const arcX = fitted ? (side === "left" ? zoneRight : zoneLeft) : side === "left" ? meta.leftX : meta.rightX
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

export function renderSafeZones(
  layer: SVGGElement,
  zones: SafeZoneSpec[],
  liveOriginX: number,
  liveOriginY: number
) {
  layer.setAttribute("data-handle-radius", "2")
  const arcMeta = getArcMeta(layer)
  for (const zone of zones) {
    if (zone.enabled === false) {
      continue
    }
    const isSelected = zone.selected === true
    const absX = liveOriginX + zone.x
    const absY = liveOriginY + zone.y
    const rotation = zone.rotation ?? 0
    const centerX = absX + zone.width / 2
    const centerY = absY + zone.height / 2
    const r = document.createElementNS(SVG_NS, "rect")
    r.setAttribute("x", absX.toString())
    r.setAttribute("y", absY.toString())
    r.setAttribute("width", zone.width.toString())
    r.setAttribute("height", zone.height.toString())
    r.setAttribute("fill", "none")
    r.setAttribute("stroke", SAFE_ZONE_STYLE.stroke)
    r.setAttribute("stroke-width", SAFE_ZONE_STYLE.strokeWidth.toString())
    r.setAttribute("stroke-dasharray", SAFE_ZONE_STYLE.dash)
    r.setAttribute("opacity", SAFE_ZONE_STYLE.opacity.toString())
    r.setAttribute("stroke-dashoffset", "0")
    r.setAttribute("stroke-linecap", "butt")
    r.setAttribute("stroke-linejoin", "miter")
    r.setAttribute("shape-rendering", "crispEdges")
    r.setAttribute("pointer-events", "none")
    r.setAttribute("data-zone-id", zone.id)
    r.setAttribute("data-role", "safe-zone-outline")
    r.setAttribute("data-selected", isSelected ? "true" : "false")
    applyRotation(r, rotation, centerX, centerY)
    layer.appendChild(r)

    const contour = safeZoneOutlinePath(zone, liveOriginX, liveOriginY)
    const hitbox = document.createElementNS(SVG_NS, contour ? "path" : "rect")
    if (contour) hitbox.setAttribute("d", contour)
    hitbox.setAttribute("x", absX.toString())
    hitbox.setAttribute("y", absY.toString())
    hitbox.setAttribute("width", zone.width.toString())
    hitbox.setAttribute("height", zone.height.toString())
    hitbox.setAttribute("fill", "transparent")
    hitbox.setAttribute("pointer-events", "all")
    hitbox.setAttribute("cursor", "move")
    hitbox.setAttribute("data-zone-id", zone.id)
    hitbox.setAttribute("data-role", "safe-zone")
    hitbox.setAttribute("data-selected", isSelected ? "true" : "false")
    applyRotation(hitbox, rotation, centerX, centerY)
    layer.appendChild(hitbox)

    if (contour) {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", contour)
      path.setAttribute("data-fit-outline", "true")
      path.setAttribute("data-role", zone.fitContour?.startsWith("kseal") ? "safe-zone-k-arm" : "safe-zone-arc")
      path.setAttribute("data-zone-id", zone.id)
      path.setAttribute("fill", "none")
      path.setAttribute("stroke", SAFE_ZONE_STYLE.stroke)
      path.setAttribute("stroke-width", String(SAFE_ZONE_STYLE.strokeWidth))
      path.setAttribute("stroke-dasharray", SAFE_ZONE_STYLE.dash)
      path.setAttribute("opacity", String(SAFE_ZONE_STYLE.opacity))
      path.setAttribute("pointer-events", "none")
      applyRotation(path, rotation, centerX, centerY)
      layer.append(path)
      r.setAttribute("stroke", "none")
    }

    if (!contour && zone.fitContour?.startsWith("kseal-")) {
      const side = zone.fitContour === "kseal-left" ? "left" : "right"
      const run = Number(layer.getAttribute(side === "left" ? "data-kseal-left-run" : "data-kseal-right-run"))
      const upper = Number(layer.getAttribute("data-kseal-top-arm-y"))
      const lower = Number(layer.getAttribute("data-kseal-bottom-arm-y"))
      if (Number.isFinite(run) && Number.isFinite(upper) && Number.isFinite(lower)) {
        const edge = side === "left" ? absX + zone.width : absX
        const tip = edge + (side === "left" ? run : -run)
        const top = Math.max(absY, Math.min(absY + zone.height, upper))
        const bottom = Math.max(top, Math.min(absY + zone.height, lower))
        const far = side === "left" ? absX : absX + zone.width
        const path = document.createElementNS(SVG_NS, "path")
        path.setAttribute("d", `M ${far} ${absY} L ${edge} ${absY} L ${tip} ${top} L ${tip} ${bottom} L ${edge} ${absY + zone.height} L ${far} ${absY + zone.height} Z`)
        path.setAttribute("data-role", "safe-zone-k-arm")
        path.setAttribute("data-zone-id", zone.id)
        path.setAttribute("fill", "none")
        path.setAttribute("stroke", SAFE_ZONE_STYLE.stroke)
        path.setAttribute("stroke-width", SAFE_ZONE_STYLE.strokeWidth.toString())
        path.setAttribute("stroke-dasharray", SAFE_ZONE_STYLE.dash)
        path.setAttribute("opacity", SAFE_ZONE_STYLE.opacity.toString())
        path.setAttribute("pointer-events", "none")
        applyRotation(path, rotation, centerX, centerY)
        layer.appendChild(path)
        r.setAttribute("stroke", "none")
      }
    }

    if (!contour && arcMeta) {
      const zoneRight = absX + zone.width
      const zoneBottom = absY + zone.height
      const zoneCenterX = absX + zone.width / 2
      const fitted = zone.fitContour === "doy-left" || zone.fitContour === "doy-right"
      const side = fitted ? (zone.fitContour === "doy-left" ? "left" : "right") : getArcSide(arcMeta, absX, zoneRight, zoneCenterX)
      if (side) {
        const d = buildArcPath(arcMeta, absX, absY, zoneRight, zoneBottom, side, fitted)
        if (d) {
          const path = document.createElementNS(SVG_NS, "path")
          path.setAttribute("d", d)
          path.setAttribute("fill", "none")
          path.setAttribute("stroke", SAFE_ZONE_STYLE.stroke)
          path.setAttribute("stroke-width", SAFE_ZONE_STYLE.strokeWidth.toString())
          path.setAttribute("stroke-dasharray", SAFE_ZONE_STYLE.dash)
          path.setAttribute("opacity", SAFE_ZONE_STYLE.opacity.toString())
          path.setAttribute("data-zone-id", zone.id)
          path.setAttribute("data-role", "safe-zone-arc")
          path.setAttribute("data-arc-side", side)
          applyRotation(path, rotation, centerX, centerY)
          layer.appendChild(path)
          r.setAttribute("stroke", "none")
        }
      }
    }

    if (isSelected) {
      const moveCenter = getMoveHandleCenter(
        liveOriginX + zone.x,
        liveOriginY + zone.y,
        zone.width,
        zone.height
      )
      const moveHandle = createMovementHandleImage("move", moveCenter.x, moveCenter.y)
      moveHandle.setAttribute("pointer-events", "all")
      moveHandle.setAttribute("cursor", "move")
      moveHandle.setAttribute("data-zone-id", zone.id)
      moveHandle.setAttribute("data-role", "safe-zone-move")
      applyRotation(moveHandle, rotation, centerX, centerY)
      layer.appendChild(moveHandle)

      const corners = getSquareResizeCorners(
        liveOriginX + zone.x,
        liveOriginY + zone.y,
        zone.width,
        zone.height
      )

      for (const corner of corners) {
        const handle = createMovementHandleImage("resize", corner.x, corner.y)
        handle.setAttribute("pointer-events", "all")
        handle.setAttribute("cursor", `${corner.key}-resize`)
        handle.setAttribute("data-zone-id", zone.id)
        handle.setAttribute("data-handle", corner.key)
        handle.setAttribute("data-role", "safe-zone-handle")
        applyRotation(handle, rotation, centerX, centerY)
        layer.appendChild(handle)
      }

      const rotateCenter = getRotateHandleCenter(
        liveOriginX + zone.x,
        liveOriginY + zone.y,
        zone.width
      )
      const rotateHandle = createMovementHandleImage("rotate", rotateCenter.x, rotateCenter.y)
      rotateHandle.setAttribute("pointer-events", "all")
      rotateHandle.setAttribute("cursor", "grab")
      rotateHandle.setAttribute("data-zone-id", zone.id)
      rotateHandle.setAttribute("data-handle", "top")
      rotateHandle.setAttribute("data-role", "safe-zone-rotate")
      applyRotation(rotateHandle, rotation, centerX, centerY)
      layer.appendChild(rotateHandle)
    }
  }
}
