import {
  clampPaperStripPositionX,
  clampPaperStripStripWidth,
  getResolvedPaperStripLanes,
  PAPER_STRIP_CONSTRAINTS
} from "../constraints/paperStrip"
import type { FlowwrapSpec } from "../types/flowwrap"
import { snapMovedElement } from "./movementSnap"

type DragState = {
  mode: "move" | "resize-left" | "resize-right"
  laneIndex: number
  startX: number
  originPositionX: number
  originStripWidth: number
}

const HANDLE_WIDTH = 3

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return { x: clientX, y: clientY }
  }
  return point.matrixTransform(ctm.inverse())
}

function getLaneFromSpec(spec: FlowwrapSpec, laneIndex: number) {
  return getResolvedPaperStripLanes(spec).find(lane => lane.laneIndex === laneIndex)
}

function buildNextPaperStripSpec(
  spec: FlowwrapSpec,
  laneIndex: number,
  updates: Partial<{
    positionX: number
    stripWidth: number
    selectedLaneIndex: number | undefined
  }>
) {
  const currentClearStripWindow = spec.paperStrip?.clearStripWindow
  const lanes = getResolvedPaperStripLanes(spec).map(lane =>
    lane.laneIndex === laneIndex ? { ...lane, ...updates } : { ...lane }
  )
  const firstLane = lanes[0]
  const selectedLaneIndex =
    "selectedLaneIndex" in updates
      ? updates.selectedLaneIndex
      : laneIndex
  return {
    ...spec,
    paperStrip: {
      ...spec.paperStrip,
      clearStripWindow: {
        ...currentClearStripWindow,
        stripCount: lanes.length,
        positionX:
          firstLane?.positionX ??
          currentClearStripWindow?.positionX ??
          0,
        stripWidth:
          firstLane?.stripWidth ??
          currentClearStripWindow?.stripWidth ??
          0,
        selectedLaneIndex,
        lanes
      }
    }
  }
}

function selectLane(spec: FlowwrapSpec, laneIndex: number) {
  const currentClearStripWindow = spec.paperStrip?.clearStripWindow
  return {
    ...spec,
    paperStrip: {
      ...spec.paperStrip,
      clearStripWindow: {
        ...currentClearStripWindow,
        selectedLaneIndex: laneIndex,
        lanes: getResolvedPaperStripLanes(spec).map(lane => ({ ...lane }))
      }
    }
  }
}

function clearSelectedLane(spec: FlowwrapSpec) {
  const currentClearStripWindow = spec.paperStrip?.clearStripWindow
  if (!currentClearStripWindow) {
    return spec
  }
  return {
    ...spec,
    paperStrip: {
      ...spec.paperStrip,
      clearStripWindow: {
        ...currentClearStripWindow,
        selectedLaneIndex: undefined,
        lanes: getResolvedPaperStripLanes(spec).map(lane => ({ ...lane }))
      }
    }
  }
}

function updateLaneDom(
  svg: SVGSVGElement,
  laneIndex: number,
  positionX: number,
  stripWidth: number,
  selected: boolean
) {
  svg
    .querySelectorAll<SVGElement>(`[data-lane-index="${laneIndex}"]`)
    .forEach(node => {
      const role = node.getAttribute("data-role") ?? ""
      const originX = Number(node.getAttribute("data-cutter-origin-x") ?? "0")
      const absX = originX + positionX
      node.setAttribute("data-position-x", positionX.toString())
      node.setAttribute("data-strip-width", stripWidth.toString())

      if (
        role === "clear-strip-window" ||
        role === "clear-strip-window-hit"
      ) {
        node.setAttribute("x", absX.toString())
        node.setAttribute("width", stripWidth.toString())
        if (role === "clear-strip-window") {
          node.setAttribute("stroke", selected ? "#0f172a" : "#2563eb")
          node.setAttribute("stroke-width", selected ? "0.8" : "0.4")
        }
        if (role === "clear-strip-window-hit") {
          node.setAttribute("cursor", selected ? "grab" : "pointer")
        }
      }

      if (role === "clear-strip-resize-left") {
        node.setAttribute("x", (absX - HANDLE_WIDTH / 2).toString())
      }
      if (role === "clear-strip-resize-right") {
        node.setAttribute(
          "x",
          (absX + stripWidth - HANDLE_WIDTH / 2).toString()
        )
      }
      if (role === "clear-strip-resize-left-hit") {
        node.setAttribute(
          "x",
          (absX - HANDLE_WIDTH - HANDLE_WIDTH / 2).toString()
        )
      }
      if (role === "clear-strip-resize-right-hit") {
        node.setAttribute(
          "x",
          (absX + stripWidth - HANDLE_WIDTH - HANDLE_WIDTH / 2).toString()
        )
      }
    })
}

export function attachPaperStripInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  if (!svg.querySelector('[data-role="clear-strip-window-hit"]')) {
    return
  }
  if (!spec.paperStrip?.clearStripWindow) {
    return
  }

  let drag: DragState | null = null
  let pendingSpec = spec
  const snap = (value: number) => Math.round(value)

  const emitClearedSelection = () => {
    const selectedLaneIndex =
      pendingSpec.paperStrip?.clearStripWindow?.selectedLaneIndex
    if (selectedLaneIndex === undefined) {
      return
    }
    pendingSpec = clearSelectedLane(pendingSpec)
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
    const laneIndexAttr = target.getAttribute("data-lane-index")
    if (!laneIndexAttr) {
      emitClearedSelection()
      return
    }
    const laneIndex = Number(laneIndexAttr)
    const role = target.getAttribute("data-role") ?? ""
    const selectedLaneIndex =
      pendingSpec.paperStrip?.clearStripWindow?.selectedLaneIndex
    if (selectedLaneIndex !== laneIndex) {
      pendingSpec = selectLane(pendingSpec, laneIndex)
      onSpecChange(pendingSpec)
      event.preventDefault()
      return
    }

    const lane = getLaneFromSpec(pendingSpec, laneIndex)
    if (!lane) {
      return
    }

    if (
      role !== "clear-strip-window" &&
      role !== "clear-strip-window-hit" &&
      role !== "clear-strip-resize-left" &&
      role !== "clear-strip-resize-right" &&
      role !== "clear-strip-resize-left-hit" &&
      role !== "clear-strip-resize-right-hit"
    ) {
      return
    }

    drag = {
      mode:
        role === "clear-strip-resize-left" ||
        role === "clear-strip-resize-left-hit"
          ? "resize-left"
          : role === "clear-strip-resize-right" ||
              role === "clear-strip-resize-right-hit"
            ? "resize-right"
            : "move",
      laneIndex,
      startX: event.clientX,
      originPositionX: lane.positionX,
      originStripWidth: lane.stripWidth
    }
    svg.setAttribute("data-dragging", "true")
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    const start = getSvgPoint(svg, drag.startX, event.clientY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const dx = snap(current.x - start.x)
    let nextPositionX = drag.originPositionX
    let nextStripWidth = drag.originStripWidth

    if (drag.mode === "move") {
      // AMENDS 6.1: the clear strip window position lands on the mouse movement grid.
      const originStripWidth = drag.originStripWidth
      nextPositionX = snapMovedElement(
        { positionX: drag.originPositionX + (current.x - start.x) },
        ["positionX"],
        next => ({ positionX: clampPaperStripPositionX(pendingSpec, next.positionX, originStripWidth) }),
        { positionX: drag.originPositionX }
      ).positionX
    } else if (drag.mode === "resize-left") {
      const rightEdge = drag.originPositionX + drag.originStripWidth
      const rawLeft = drag.originPositionX + dx
      const nextLeft = Math.max(
        0,
        Math.min(
          rightEdge - PAPER_STRIP_CONSTRAINTS.stripWidth.min,
          rawLeft
        )
      )
      nextStripWidth = clampPaperStripStripWidth(
        pendingSpec,
        nextLeft,
        rightEdge - nextLeft
      )
      nextPositionX = clampPaperStripPositionX(
        pendingSpec,
        rightEdge - nextStripWidth,
        nextStripWidth
      )
      nextStripWidth = clampPaperStripStripWidth(
        pendingSpec,
        nextPositionX,
        nextStripWidth
      )
    } else {
      nextStripWidth = clampPaperStripStripWidth(
        pendingSpec,
        drag.originPositionX,
        drag.originStripWidth + dx
      )
    }

    pendingSpec = buildNextPaperStripSpec(pendingSpec, drag.laneIndex, {
      positionX: nextPositionX,
      stripWidth: nextStripWidth,
      selectedLaneIndex: drag.laneIndex
    })
    updateLaneDom(svg, drag.laneIndex, nextPositionX, nextStripWidth, true)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    svg.setAttribute("data-dragging", "false")
    svg.releasePointerCapture(event.pointerId)
    onSpecChange(pendingSpec)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") {
      return
    }
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable)
    ) {
      return
    }
    emitClearedSelection()
  }

  const modeObserver = new MutationObserver(() => {
    if (
      svg.getAttribute("data-pan-enabled") === "true" ||
      svg.getAttribute("data-measure-enabled") === "true" ||
      svg.getAttribute("data-select-enabled") === "false"
    ) {
      emitClearedSelection()
    }
  })

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointerleave", onPointerUp)
  window.addEventListener("keydown", onKeyDown)
  modeObserver.observe(svg, {
    attributes: true,
    attributeFilter: ["data-pan-enabled", "data-measure-enabled", "data-select-enabled"]
  })

  return {
    destroy() {
      drag = null
      svg.setAttribute("data-dragging", "false")
      svg.removeEventListener("pointerdown", onPointerDown)
      svg.removeEventListener("pointermove", onPointerMove)
      svg.removeEventListener("pointerup", onPointerUp)
      svg.removeEventListener("pointerleave", onPointerUp)
      window.removeEventListener("keydown", onKeyDown)
      modeObserver.disconnect()
    }
  }
}
