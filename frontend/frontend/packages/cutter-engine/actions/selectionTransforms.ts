import type { FlowwrapSpec } from "../types"

export type SelectionTransformCommand =
  | { kind: "rotate"; selectedIds: readonly string[]; degrees: number }
  | {
      kind: "nudge"
      selectedIds: readonly string[]
      deltaX: number
      deltaY: number
    }
  | {
      kind: "resize"
      selectedIds: readonly string[]
      deltaWidth: number
      deltaHeight: number
    }

export type SelectionTransformResult = {
  spec: FlowwrapSpec
  changed: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const getEditableBounds = (spec: FlowwrapSpec) => {
  const left = spec.seals?.left ?? spec.seal
  const right = spec.seals?.right ?? spec.seal
  const top = spec.seals?.top ?? spec.seal
  const bottom = spec.seals?.bottom ?? spec.seal
  const liveWidth = Math.max(0, spec.width - left - right)
  const liveHeight = Math.max(0, spec.height - top - bottom)
  return {
    minX: -left,
    minY: -top,
    maxX: liveWidth + right,
    maxY: liveHeight + bottom,
    liveWidth,
    liveHeight
  }
}

const hasSelection = (
  selectedIds: ReadonlySet<string>,
  itemId: string,
  layerId: string
) => selectedIds.has(itemId) || selectedIds.has(`layer:${layerId}`)

const clampRectToCutterArea = <T extends { x: number; y: number; width: number; height: number }>(
  item: T,
  bounds: ReturnType<typeof getEditableBounds>
): T => ({
  ...item,
  x: clamp(item.x, bounds.minX, Math.max(bounds.minX, bounds.maxX - item.width)),
  y: clamp(item.y, bounds.minY, Math.max(bounds.minY, bounds.maxY - item.height))
})

export function transformSelectedElements(
  source: FlowwrapSpec,
  command: SelectionTransformCommand
): SelectionTransformResult {
  const selectedIds = new Set(command.selectedIds)
  if (selectedIds.size === 0) {
    return { spec: source, changed: false }
  }

  const editableBounds = getEditableBounds(source)
  let changed = false
  let spec = source

  if (command.kind === "nudge") {
    const { deltaX, deltaY } = command

    if (source.safeZones?.length) {
      const safeZones = source.safeZones.map(zone => {
        if (!hasSelection(selectedIds, `safe-zone:${zone.id}`, "safe-zones")) return zone
        changed = true
        return clampRectToCutterArea(
          { ...zone, x: zone.x + deltaX, y: zone.y + deltaY },
          editableBounds
        )
      })
      spec = { ...spec, safeZones }
    }

    if (source.windows?.length) {
      const windows = source.windows.map(item => {
        if (!hasSelection(selectedIds, `window:${item.id}`, "windows")) return item
        changed = true
        return clampRectToCutterArea(
          { ...item, x: item.x + deltaX, y: item.y + deltaY },
          editableBounds
        )
      })
      spec = { ...spec, windows }
    }

    if (source.attributeBoxes?.length) {
      const attributeBoxes = source.attributeBoxes.map(item => {
        if (!hasSelection(selectedIds, `attribute-box:${item.id}`, "notes")) return item
        changed = true
        if (item.kind === "clear-strip" && source.paperStrip) {
          return {
            ...item,
            x: clamp(item.x + deltaX, 0, Math.max(0, source.width - item.width)),
            y: 0,
            height: source.height
          }
        }
        return clampRectToCutterArea(
          { ...item, x: item.x + deltaX, y: item.y + deltaY },
          editableBounds
        )
      })
      spec = { ...spec, attributeBoxes }
    }

    if (source.eyeMarks) {
      const eyeMarks = { ...source.eyeMarks }
      let eyeMarksChanged = false
      ;[0, 1].forEach(index => {
        if (
          index >= eyeMarks.count ||
          !hasSelection(selectedIds, `eye-mark:${index}`, "eyemarks")
        ) return
        changed = true
        eyeMarksChanged = true
        if (index === 0) {
          eyeMarks.offsetX = (eyeMarks.offsetX ?? 0) + deltaX
          eyeMarks.offsetY = (eyeMarks.offsetY ?? 0) + deltaY
          eyeMarks.manualPositioned = true
        } else {
          eyeMarks.offsetX2 = (eyeMarks.offsetX2 ?? 0) + deltaX
          eyeMarks.offsetY2 = (eyeMarks.offsetY2 ?? 0) + deltaY
          eyeMarks.manualPositioned2 = true
        }
      })
      if (eyeMarksChanged) spec = { ...spec, eyeMarks }
    }

    if (source.hangerSlots?.length) {
      const hangerSlots = source.hangerSlots.map(item => {
        if (!hasSelection(selectedIds, `hanger-slot:${item.id}`, "hanger-slots")) return item
        changed = true
        return {
          ...item,
          centerX: clamp(item.centerX + deltaX, 0, editableBounds.liveWidth),
          centerY: clamp(item.centerY + deltaY, 0, editableBounds.liveHeight)
        }
      })
      spec = { ...spec, hangerSlots }
    }

    if (source.halfMoonCutouts?.length) {
      const halfMoonCutouts = source.halfMoonCutouts.map(item => {
        if (!hasSelection(selectedIds, `half-moon:${item.id}`, "tear-notches")) return item
        changed = true
        return {
          ...item,
          centerX: clamp(item.centerX + deltaX, 0, editableBounds.liveWidth)
        }
      })
      spec = { ...spec, halfMoonCutouts }
    }

    if (source.foldLines?.length) {
      const foldLines = source.foldLines.map(item => {
        if (!hasSelection(selectedIds, `fold-line:${item.id}`, "fold-lines")) return item
        const delta = item.orientation === "vertical" ? deltaX : deltaY
        if (delta === 0) return item
        changed = true
        return { ...item, offset: Math.max(0, item.offset + delta) }
      })
      spec = { ...spec, foldLines }
    }

    if (source.perfs) {
      let perfsChanged = false
      const baseLanes = source.perfs.lanes?.length
        ? source.perfs.lanes
        : [{ originX: source.perfs.originX, originY: source.perfs.originY }]
      const lanes = baseLanes.map((lane, index) => {
        if (!hasSelection(selectedIds, `perf-lane:${index}`, "perf-lines")) return lane
        changed = true
        perfsChanged = true
        return {
          ...lane,
          originX: Math.max(0, lane.originX + deltaX),
          ...(source.perfs?.mode === "regulated"
            ? { originY: Math.max(0, (lane.originY ?? 0) + deltaY) }
            : {})
        }
      })
      if (perfsChanged) {
        spec = {
          ...spec,
          perfs: {
            ...source.perfs,
            originX: lanes[0]?.originX ?? source.perfs.originX,
            originY: lanes[0]?.originY ?? source.perfs.originY,
            lanes
          }
        }
      }
    }
  } else if (command.kind === "rotate") {
    if (!Number.isFinite(command.degrees)) return {spec:source,changed:false}
    const rotate = <T extends {id:string; rotation?:number}>(item:T, prefix:string, layer:string):T => {
      if (!hasSelection(selectedIds,prefix+item.id,layer)) return item
      changed = true
      return {...item,rotation:(((item.rotation ?? 0)+command.degrees)%360+360)%360}
    }
    if (source.safeZones) spec = {...spec,safeZones:source.safeZones.map(item=>rotate(item,"safe-zone:","safe-zones"))}
    if (source.windows) spec = {...spec,windows:source.windows.map(item=>rotate(item,"window:","windows"))}
    if (source.attributeBoxes) spec = {...spec,attributeBoxes:source.attributeBoxes.map(item=>rotate(item,"attribute-box:","notes"))}
  } else {
    const resizeRect = <T extends { x: number; y: number; width: number; height: number }>(
      item: T
    ) => {
      const width = Math.max(1, item.width + command.deltaWidth)
      const height = Math.max(1, item.height + command.deltaHeight)
      return clampRectToCutterArea(
        {
          ...item,
          x: item.x - (width - item.width) / 2,
          y: item.y - (height - item.height) / 2,
          width,
          height
        },
        editableBounds
      )
    }

    if (source.safeZones?.length) {
      const safeZones = source.safeZones.map(item => {
        if (!hasSelection(selectedIds, `safe-zone:${item.id}`, "safe-zones")) return item
        changed = true
        return resizeRect(item)
      })
      spec = { ...spec, safeZones }
    }
    if (source.windows?.length) {
      const windows = source.windows.map(item => {
        if (!hasSelection(selectedIds, `window:${item.id}`, "windows")) return item
        changed = true
        return resizeRect(item)
      })
      spec = { ...spec, windows }
    }
    if (source.attributeBoxes?.length) {
      const attributeBoxes = source.attributeBoxes.map(item => {
        if (!hasSelection(selectedIds, `attribute-box:${item.id}`, "notes")) return item
        changed = true
        if (item.kind === "clear-strip" && source.paperStrip) {
          const width = Math.max(1, item.width + command.deltaWidth)
          return {
            ...item,
            x: clamp(
              item.x - (width - item.width) / 2,
              0,
              Math.max(0, source.width - width)
            ),
            y: 0,
            width,
            height: source.height
          }
        }
        return resizeRect(item)
      })
      spec = { ...spec, attributeBoxes }
    }
  }

  return { spec: changed ? spec : source, changed }
}
