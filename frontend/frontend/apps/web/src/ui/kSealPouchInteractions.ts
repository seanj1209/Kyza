import { resolveKSealPouchGeometry } from "../geometry/kSealPouchGeometry"
import type { FlowwrapSpec } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"
import { centreKSealTacHoles } from "../rules/kSealTacHoleRules"

type DragState = {
  mode: "corner" | "side" | "guide"
  startPoint?: {x:number;y:number}
  anchor?: {x:number;y:number}
  handle:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "left"
    | "right"
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

export function attachKSealPouchInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec
  let rafId: number | null = null
  let selectionMode: "corner" | "side" | null = null
  let activeGuideSide: "left" | "right" | null = null
  let lastPoint: { x: number; y: number } | null = null

  const isLayerLocked = (layerId: string) =>
    Boolean(
      svg.querySelector<SVGGElement>(
        `[data-layer-id="${layerId}"][data-layer-locked="true"]`
      )
    )

  const isRoleLocked = (role: string | null) => {
    if (!role) {
      return false
    }
    if (role === "kseal-side-guide" || role === "kseal-side-guide-hit") {
      return isLayerLocked("kseal-arms")
    }
    if (role === "kseal-center-line" || role === "kseal-side-handle" || role === "kseal-side-hit") {
      return isLayerLocked("gusset-fold-line")
    }
    if (role === "kseal-arm-move" || role === "kseal-inner-path" || role === "kseal-corner-handle" || role === "kseal-corner-hit") {
      return isLayerLocked("kseal-arms")
    }
    return false
  }

  const getLayerMeta = () => {
    const layer =
      svg.querySelector<SVGGElement>("g#gusset_fold_line") ??
      svg.querySelector<SVGGElement>("g#fold_lines")
    if (!layer) {
      return { originX: 0, originY: 0, height: 0, width: 0, sealWidth: 0 }
    }
    return {
      originX: Number(layer.getAttribute("data-origin-x") ?? "0"),
      originY: Number(layer.getAttribute("data-origin-y") ?? "0"),
      height: Number(layer.getAttribute("data-height") ?? "0"),
      width: Number(layer.getAttribute("data-width") ?? "0"),
      sealWidth: Number(layer.getAttribute("data-seal-width") ?? "0")
    }
  }

  const updateKSealDom = (
    next: FlowwrapSpec,
    guideSide?: "left" | "right" | null,
    cursor?: { x: number; y: number } | null
  ) => {
    const layer =
      svg.querySelector<SVGGElement>("g#gusset_fold_line") ??
      svg.querySelector<SVGGElement>("g#fold_lines")
    if (!layer) {
      return
    }
    const originX = Number(layer.getAttribute("data-origin-x") ?? "0")
    const originY = Number(layer.getAttribute("data-origin-y") ?? "0")
    const geometry = resolveKSealPouchGeometry(next)
    const centerX = originX + geometry.centerX
    const topApexY = originY + geometry.topApexY
    const bottomApexY = originY + geometry.bottomApexY
    const topSideSealGuideY = originY + geometry.sideSeal
    const bottomSideSealGuideY = originY + geometry.height - geometry.sideSeal
    const topShoulderY = originY + geometry.topShoulderY
    const bottomShoulderY = originY + geometry.bottomShoulderY
    const leftFoldX = originX + geometry.leftFoldX
    const rightFoldX = originX + geometry.rightFoldX

    const centerLine = svg.querySelector<SVGLineElement>(
      "[data-role=\"kseal-center-line\"]"
    )
    if (centerLine) {
      centerLine.setAttribute("x1", centerX.toString())
      centerLine.setAttribute("x2", centerX.toString())
      centerLine.setAttribute("y1", topSideSealGuideY.toString())
      centerLine.setAttribute("y2", bottomSideSealGuideY.toString())
    }

    const innerPath = svg.querySelector<SVGPathElement>(
      "[data-role=\"kseal-inner-path\"]"
    )
    if (innerPath) {
      const d = [
        `M ${centerX} ${topApexY}`,
        `L ${rightFoldX} ${topShoulderY}`,
        `L ${rightFoldX} ${bottomShoulderY}`,
        `L ${centerX} ${bottomApexY}`,
        `L ${leftFoldX} ${bottomShoulderY}`,
        `L ${leftFoldX} ${topShoulderY}`,
        "Z"
      ].join(" ")
      innerPath.setAttribute("d", d)
    }

    const guides = [
      { x: originX + geometry.leftGuideX, side: "left" },
      { x: originX + geometry.rightGuideX, side: "right" }
    ]
    guides.forEach(guide => {
      const lines = svg.querySelectorAll<SVGLineElement>(
        `[data-role=\"kseal-side-guide\"][data-side=\"${guide.side}\"]`
      )
      lines.forEach(line => {
        line.setAttribute("x1", guide.x.toString())
        line.setAttribute("x2", guide.x.toString())
        line.setAttribute("y1", originY.toString())
        line.setAttribute("y2", (originY + geometry.height).toString())
      })
      const hits = svg.querySelectorAll<SVGLineElement>(
        `[data-role=\"kseal-side-guide-hit\"][data-side=\"${guide.side}\"]`
      )
      hits.forEach(line => {
        line.setAttribute("x1", guide.x.toString())
        line.setAttribute("x2", guide.x.toString())
        line.setAttribute("y1", originY.toString())
        line.setAttribute("y2", (originY + geometry.height).toString())
      })
    })

    const guideMeasureLine =
      svg.querySelector<SVGLineElement>(
        "[data-role=\"kseal-guide-measure-line\"]"
      ) ??
      (() => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("data-role", "kseal-guide-measure-line")
        line.setAttribute("stroke", "#f59f3b")
        line.setAttribute("stroke-width", "0.3")
        line.setAttribute("opacity", "0")
        layer.appendChild(line)
        return line
      })()
    const guideMeasureText =
      svg.querySelector<SVGTextElement>(
        "[data-role=\"kseal-guide-measure-text\"]"
      ) ??
      (() => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
        text.setAttribute("data-role", "kseal-guide-measure-text")
        text.setAttribute("fill", "#f59f3b")
        text.setAttribute("font-size", "3")
        text.setAttribute("dominant-baseline", "middle")
        text.setAttribute("text-anchor", "middle")
        text.setAttribute("opacity", "0")
        layer.appendChild(text)
        return text
      })()

    const edgeMeasureLine =
      svg.querySelector<SVGLineElement>(
        "[data-role=\"kseal-edge-measure-line\"]"
      ) ??
      (() => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("data-role", "kseal-edge-measure-line")
        line.setAttribute("stroke", "#f59f3b")
        line.setAttribute("stroke-width", "0.3")
        line.setAttribute("opacity", "0")
        layer.appendChild(line)
        return line
      })()
    const edgeMeasureText =
      svg.querySelector<SVGTextElement>(
        "[data-role=\"kseal-edge-measure-text\"]"
      ) ??
      (() => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
        text.setAttribute("data-role", "kseal-edge-measure-text")
        text.setAttribute("fill", "#f59f3b")
        text.setAttribute("font-size", "3")
        text.setAttribute("dominant-baseline", "middle")
        text.setAttribute("text-anchor", "middle")
        text.setAttribute("opacity", "0")
        layer.appendChild(text)
        return text
      })()
    const angleText =
      svg.querySelector<SVGTextElement>(
        "[data-role=\"kseal-angle-text\"]"
      ) ??
      (() => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
        text.setAttribute("data-role", "kseal-angle-text")
        text.setAttribute("fill", "#f59f3b")
        text.setAttribute("font-size", "3")
        text.setAttribute("dominant-baseline", "middle")
        text.setAttribute("text-anchor", "middle")
        text.setAttribute("opacity", "0")
        layer.appendChild(text)
        return text
      })()

    const active = guideSide ?? null
    const shouldShow = Boolean(cursor)
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value))
    const measureY = cursor
      ? clamp(cursor.y, topShoulderY, bottomShoulderY)
      : (topShoulderY + bottomShoulderY) / 2
    if (!shouldShow) {
      guideMeasureLine.setAttribute("opacity", "0")
      guideMeasureText.setAttribute("opacity", "0")
      edgeMeasureLine.setAttribute("opacity", "0")
      edgeMeasureText.setAttribute("opacity", "0")
      angleText.setAttribute("opacity", "0")
      return
    }

    if (active) {
      guideMeasureLine.setAttribute("opacity", "0")
      guideMeasureText.setAttribute("opacity", "0")
    } else {
      guideMeasureLine.setAttribute("opacity", "0")
      guideMeasureText.setAttribute("opacity", "0")
    }

    if (active) {
      const cursorX = cursor?.x ?? centerX
      const edgeSide = cursorX >= centerX ? "right" : "left"
      const edgeX = edgeSide === "right" ? rightFoldX : leftFoldX
      const guideX =
        active === "left"
          ? guides[0].x
          : guides[1].x
      edgeMeasureLine.setAttribute("x1", guideX.toString())
      edgeMeasureLine.setAttribute("y1", measureY.toString())
      edgeMeasureLine.setAttribute("x2", edgeX.toString())
      edgeMeasureLine.setAttribute("y2", measureY.toString())
      edgeMeasureLine.setAttribute("opacity", "1")
      const edgeDistance = Math.abs(edgeX - guideX)
      edgeMeasureText.setAttribute(
        "x",
        ((guideX + edgeX) / 2).toString()
      )
      edgeMeasureText.setAttribute("y", (measureY - 6).toString())
      edgeMeasureText.textContent = formatMetricMeasurement(edgeDistance)
      edgeMeasureText.setAttribute("opacity", "1")
    } else {
      const midY = (topShoulderY + bottomShoulderY) / 2
      edgeMeasureLine.setAttribute("x1", leftFoldX.toString())
      edgeMeasureLine.setAttribute("y1", midY.toString())
      edgeMeasureLine.setAttribute("x2", rightFoldX.toString())
      edgeMeasureLine.setAttribute("y2", midY.toString())
      edgeMeasureLine.setAttribute("opacity", "1")
      const edgeDistance = Math.abs(rightFoldX - leftFoldX)
      edgeMeasureText.setAttribute(
        "x",
        ((leftFoldX + rightFoldX) / 2).toString()
      )
      edgeMeasureText.setAttribute("y", (midY - 6).toString())
      edgeMeasureText.textContent = formatMetricMeasurement(edgeDistance)
      edgeMeasureText.setAttribute("opacity", "1")
    }

    if (active) {
      angleText.setAttribute("opacity", "0")
      return
    }

    const corners = [
      {
        x: leftFoldX,
        y: topShoulderY,
        apexX: centerX,
        apexY: topApexY,
        otherX: leftFoldX,
        otherY: bottomShoulderY
      },
      {
        x: rightFoldX,
        y: topShoulderY,
        apexX: centerX,
        apexY: topApexY,
        otherX: rightFoldX,
        otherY: bottomShoulderY
      },
      {
        x: leftFoldX,
        y: bottomShoulderY,
        apexX: centerX,
        apexY: bottomApexY,
        otherX: leftFoldX,
        otherY: topShoulderY
      },
      {
        x: rightFoldX,
        y: bottomShoulderY,
        apexX: centerX,
        apexY: bottomApexY,
        otherX: rightFoldX,
        otherY: topShoulderY
      }
    ]
    const nearest = corners.reduce(
      (best, current) => {
        const dx = (cursor?.x ?? 0) - current.x
        const dy = (cursor?.y ?? 0) - current.y
        const dist = dx * dx + dy * dy
        return dist < best.dist ? { corner: current, dist } : best
      },
      { corner: corners[0], dist: Number.POSITIVE_INFINITY }
    ).corner
    const v1x = nearest.apexX - nearest.x
    const v1y = nearest.apexY - nearest.y
    const v2x = nearest.otherX - nearest.x
    const v2y = nearest.otherY - nearest.y
    const len1 = Math.max(0.001, Math.hypot(v1x, v1y))
    const len2 = Math.max(0.001, Math.hypot(v2x, v2y))
    const dot = v1x * v2x + v1y * v2y
    const angle = Math.acos(Math.min(1, Math.max(-1, dot / (len1 * len2))))
    const angleDeg = Math.round((angle * 180) / Math.PI)
    const angleX = nearest.x + (centerX - nearest.x) * 0.25
    const angleY = nearest.y + (measureY - nearest.y) * 0.25
    angleText.setAttribute("x", angleX.toString())
    angleText.setAttribute("y", angleY.toString())
    angleText.textContent = `${angleDeg}°`
    angleText.setAttribute("opacity", "1")
    const cornerPoints = [
      { x: leftFoldX, y: topShoulderY, corner: "top-left" },
      { x: rightFoldX, y: topShoulderY, corner: "top-right" },
      { x: leftFoldX, y: bottomShoulderY, corner: "bottom-left" },
      { x: rightFoldX, y: bottomShoulderY, corner: "bottom-right" }
    ]
    cornerPoints.forEach(point => {
      const handles = svg.querySelectorAll<SVGCircleElement>(
        `[data-corner=\"${point.corner}\"]`
      )
      handles.forEach(handle => {
        handle.setAttribute("cx", point.x.toString())
        handle.setAttribute("cy", point.y.toString())
      })
    })

    const sidePoints = [
      { x: leftFoldX, y: originY + geometry.midY, side: "left" },
      { x: rightFoldX, y: originY + geometry.midY, side: "right" }
    ]
    sidePoints.forEach(point => {
      const handles = svg.querySelectorAll<SVGCircleElement>(
        `[data-side=\"${point.side}\"]`
      )
      handles.forEach(handle => {
        handle.setAttribute("cx", point.x.toString())
        handle.setAttribute("cy", point.y.toString())
      })
    })

    const measureLayer = svg.querySelector<SVGGElement>("g#measurement_guides")
    const subLines = measureLayer?.querySelectorAll<SVGLineElement>(
      "[data-role=\"kseal-submeasure-line\"][data-row=\"top\"]"
    )
    if (subLines && subLines.length > 0) {
      const subY = originY - 3
      const segments = [
        { x1: originX + geometry.leftGuideX, x2: leftFoldX },
        { x1: leftFoldX, x2: centerX },
        { x1: centerX, x2: rightFoldX },
        { x1: rightFoldX, x2: originX + geometry.rightGuideX }
      ]
      subLines.forEach(lineEl => {
        const idx = Number(lineEl.getAttribute("data-seg") ?? "0")
        const seg = segments[idx]
        if (!seg) {
          return
        }
        const label = formatMetricMeasurement(Math.abs(seg.x2 - seg.x1))
        const textWidth = label.length * 4 * 0.6
        const gap = 2
        const midX = (seg.x1 + seg.x2) / 2
        const leftEnd = midX - textWidth / 2 - gap
        const rightStart = midX + textWidth / 2 + gap
        const part = lineEl.getAttribute("data-part")
        if (part === "left") {
          lineEl.setAttribute("x1", seg.x1.toString())
          lineEl.setAttribute("x2", leftEnd.toString())
        } else if (part === "right") {
          lineEl.setAttribute("x1", rightStart.toString())
          lineEl.setAttribute("x2", seg.x2.toString())
        } else {
          lineEl.setAttribute("x1", seg.x1.toString())
          lineEl.setAttribute("x2", seg.x2.toString())
        }
        lineEl.setAttribute("y1", subY.toString())
        lineEl.setAttribute("y2", subY.toString())
      })
      const caps = measureLayer?.querySelectorAll<SVGLineElement>(
        "[data-role=\"kseal-submeasure-cap\"][data-row=\"top\"]"
      )
      caps?.forEach(cap => {
        const idx = Number(cap.getAttribute("data-seg") ?? "0")
        const seg = segments[idx]
        if (!seg) {
          return
        }
        const end = cap.getAttribute("data-cap-end")
        const x = end === "end" ? seg.x2 : seg.x1
        cap.setAttribute("x1", x.toString())
        cap.setAttribute("x2", x.toString())
        cap.setAttribute("y1", (subY - 2).toString())
        cap.setAttribute("y2", (subY + 2).toString())
      })
      const texts = measureLayer?.querySelectorAll<SVGTextElement>(
        "[data-role=\"kseal-submeasure-text\"][data-row=\"top\"]"
      )
      texts?.forEach(text => {
        const idx = Number(text.getAttribute("data-seg") ?? "0")
        const seg = segments[idx]
        if (!seg) {
          return
        }
        const label = formatMetricMeasurement(Math.abs(seg.x2 - seg.x1))
        text.setAttribute("x", ((seg.x1 + seg.x2) / 2).toString())
        text.setAttribute("y", (subY - 4).toString())
        text.textContent = label
      })
    }
  }

  const setHandleVisibility = (mode: "corner" | "side" | null) => {
    selectionMode = mode
    const handles = svg.querySelectorAll<SVGElement>("[data-handle-type]")
    handles.forEach(handle => {
      const type = handle.getAttribute("data-handle-type")
      const role = handle.getAttribute("data-role")
      const show = mode !== null && type === mode && !isRoleLocked(role)
      handle.setAttribute("opacity", show ? "1" : "0")
      handle.setAttribute("pointer-events", show ? "all" : "none")
    })
  }

  const onPointerDown = (event: PointerEvent) => {
    if (svg.getAttribute("data-select-enabled") !== "true") {
      return
    }
    if(svg.getAttribute("data-pan-enabled")==="true" || svg.getAttribute("data-measure-enabled")==="true")return
    if (event.button !== 0) {
      return
    }
    const target = (event.target as Element).closest("[data-role]") as HTMLElement
    if(!target)return
    const role = target.getAttribute("data-role")
    if (!pendingSpec.kSealPouch) {
      return
    }
    if (isRoleLocked(role)) {
      return
    }
    if(role==="kseal-arm-move"){
      const handle=target.getAttribute("data-corner") as DragState["handle"]
      if(!["top-left","top-right","bottom-left","bottom-right"].includes(handle))return
      const g=resolveKSealPouchGeometry(pendingSpec),meta=getLayerMeta(),left=handle.endsWith("left"),top=handle.startsWith("top")
      drag={mode:"corner",handle,startPoint:getSvgPoint(svg,event.clientX,event.clientY),anchor:{x:meta.originX+g.centerX+(left?-1:1)*g.gussetDepth,y:meta.originY+(top?g.topShoulderY:g.bottomShoulderY)}}
    } else if (role === "kseal-corner-handle" || role === "kseal-corner-hit") {
      const handle = target.getAttribute("data-corner")
      if (
        handle !== "top-left" &&
        handle !== "top-right" &&
        handle !== "bottom-left" &&
        handle !== "bottom-right"
      ) {
        return
      }
      drag = {
        mode: "corner",
        handle
      }
    } else if (role === "kseal-side-handle" || role === "kseal-side-hit") {
      const handle = target.getAttribute("data-side")
      if (handle !== "left" && handle !== "right") {
        return
      }
      drag = {
        mode: "side",
        handle
      }
    } else if (role === "kseal-side-guide" || role === "kseal-side-guide-hit") {
      const handle = target.getAttribute("data-side")
      if (handle !== "left" && handle !== "right") {
        return
      }
      drag = {
        mode: "guide",
        handle
      }
      activeGuideSide = handle
    } else {
      setHandleVisibility(null)
      return
    }
    event.stopPropagation()
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.kSealPouch) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const meta = getLayerMeta()
    const geometry = resolveKSealPouchGeometry(pendingSpec)
    let point = getSvgPoint(svg, event.clientX, event.clientY)
    if(drag.startPoint && drag.anchor)point={x:drag.anchor.x+point.x-drag.startPoint.x,y:drag.anchor.y+point.y-drag.startPoint.y}
    lastPoint = point
    const localX = point.x - meta.originX
    const localY = point.y - meta.originY

    if (drag.mode === "side") {
      const halfWidth = Math.abs(localX - geometry.centerX)
      const nextMidWidth = Math.max(0, halfWidth * 2)
      const nextDepth = nextMidWidth / 2
      const currentSpan = geometry.bottomApexY - geometry.topApexY
      const currentHalfSpan = currentSpan / 2
      const nextRatio =
        currentHalfSpan > 0 ? nextDepth / currentHalfSpan : geometry.gussetDepthRatio
      pendingSpec = {
        ...pendingSpec,
        kSealPouch: {
          ...pendingSpec.kSealPouch,
          gussetSize: nextDepth,
          gussetDepth: nextDepth,
          gussetDepthRatio: nextRatio,
          midSectionWidthRatio: nextMidWidth / meta.width
        }
      }
      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          rafId = null
          updateKSealDom(pendingSpec, activeGuideSide, lastPoint)
        })
      }
      return
    }
    if (drag.mode === "guide") {
      const distance = Math.abs(localX - geometry.centerX)
      const nextOffset = Math.max(0, distance - geometry.midSectionWidth / 2)
      pendingSpec = {
        ...pendingSpec,
        kSealPouch: {
          ...pendingSpec.kSealPouch,
          sideGuideOffset: nextOffset
        }
      }
      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          rafId = null
          updateKSealDom(pendingSpec, activeGuideSide, lastPoint)
        })
      }
      return
    }

    const halfWidth = Math.abs(localX - geometry.centerX)
    const nextMidWidth = Math.max(0, halfWidth * 2)
    const nextDepth = nextMidWidth / 2
    const span = geometry.bottomApexY - geometry.topApexY
    const halfSpan = span / 2
    const nextRatio =
      halfSpan > 0 ? nextDepth / halfSpan : geometry.gussetDepthRatio
    let nextShoulder = geometry.shoulderHeight
    if (drag.handle === "top-left" || drag.handle === "top-right") {
      nextShoulder = localY - geometry.topApexY
    } else {
      nextShoulder = geometry.bottomApexY - localY
    }
    const nextShoulderRatio =
      meta.height > 0 ? nextShoulder / meta.height : geometry.shoulderHeightRatio
    const nextArmDegree = Math.min(
      60,
      Math.max(
        30,
        (Math.atan2(Math.max(0, nextShoulder), Math.max(0.001, nextDepth)) *
          180) /
          Math.PI
      )
    )
    pendingSpec = {
      ...pendingSpec,
      kSealPouch: {
        ...pendingSpec.kSealPouch,
        gussetSize: nextDepth,
        gussetDepth: nextDepth,
        gussetDepthRatio: nextRatio,
        midSectionWidthRatio: nextMidWidth / meta.width,
        shoulderHeightRatio: nextShoulderRatio,
        customArmDegreeEnabled: true,
        armDegree: nextArmDegree
      }
    }
    if (rafId === null) {
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        updateKSealDom(pendingSpec, activeGuideSide, lastPoint)
      })
    }
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
    activeGuideSide = null
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    pendingSpec = centreKSealTacHoles(pendingSpec)
    updateKSealDom(pendingSpec, null, null)
    onSpecChange(pendingSpec)
  }

  const onDoubleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }
    if (target.getAttribute("data-role") === "kseal-inner-path") {
      if (isRoleLocked("kseal-inner-path")) {
        return
      }
      setHandleVisibility("corner")
    }
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }
    if (target.getAttribute("data-role") === "kseal-center-line") {
      if (isRoleLocked("kseal-center-line")) {
        return
      }
      setHandleVisibility("side")
    }
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointercancel", onPointerUp)
  svg.addEventListener("lostpointercapture", onPointerUp)
  svg.addEventListener("dblclick", onDoubleClick)
  svg.addEventListener("click", onClick)
}
