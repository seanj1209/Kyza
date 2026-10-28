import type {
  AllowedDesignZone,
  ApplyPipeline,
  ApplyPipelineInput,
  ApplyPipelineResult,
  BlockedDesignZone,
  DesignLayerSpec,
  DesignRect
} from "./types"

function intersects(a: DesignRect, b: DesignRect) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

function contains(outer: DesignRect, inner: DesignRect) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

function getSafeZoneBounds(zone: ApplyPipelineInput["layout"]["safeZones"][number]) {
  const rotation = ((zone.rotation ?? 0) * Math.PI) / 180
  const cx = zone.x + zone.width / 2
  const cy = zone.y + zone.height / 2
  const corners = [
    { x: zone.x, y: zone.y },
    { x: zone.x + zone.width, y: zone.y },
    { x: zone.x, y: zone.y + zone.height },
    { x: zone.x + zone.width, y: zone.y + zone.height }
  ].map(point => {
    if (rotation === 0) {
      return point
    }
    const dx = point.x - cx
    const dy = point.y - cy
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    }
  })

  const xs = corners.map(point => point.x)
  const ys = corners.map(point => point.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  }
}

function subtractRect(base: DesignRect, cut: DesignRect): DesignRect[] {
  if (!intersects(base, cut)) {
    return [base]
  }

  const overlapLeft = Math.max(base.x, cut.x)
  const overlapTop = Math.max(base.y, cut.y)
  const overlapRight = Math.min(base.x + base.width, cut.x + cut.width)
  const overlapBottom = Math.min(base.y + base.height, cut.y + cut.height)

  if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
    return [base]
  }

  const pieces: DesignRect[] = []

  if (overlapTop > base.y) {
    pieces.push({
      x: base.x,
      y: base.y,
      width: base.width,
      height: overlapTop - base.y
    })
  }
  if (overlapBottom < base.y + base.height) {
    pieces.push({
      x: base.x,
      y: overlapBottom,
      width: base.width,
      height: base.y + base.height - overlapBottom
    })
  }
  if (overlapLeft > base.x) {
    pieces.push({
      x: base.x,
      y: overlapTop,
      width: overlapLeft - base.x,
      height: overlapBottom - overlapTop
    })
  }
  if (overlapRight < base.x + base.width) {
    pieces.push({
      x: overlapRight,
      y: overlapTop,
      width: base.x + base.width - overlapRight,
      height: overlapBottom - overlapTop
    })
  }

  return pieces.filter(piece => piece.width > 0 && piece.height > 0)
}

export function deriveBlockedDesignZones(
  input: ApplyPipelineInput
): BlockedDesignZone[] {
  return input.layout.safeZones
    .filter(zone => zone.enabled !== false)
    .map(zone => {
      const bounds = getSafeZoneBounds(zone)
      return {
        id: zone.id,
        label: zone.label || zone.id,
        source: "safe-zone" as const,
        bounds: {
          x: input.layout.liveOriginX + bounds.x,
          y: input.layout.liveOriginY + bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      }
    })
}

export function deriveAllowedDesignZones(
  input: ApplyPipelineInput
): AllowedDesignZone[] {
  const liveRect: DesignRect = {
    x: input.layout.liveOriginX,
    y: input.layout.liveOriginY,
    width: input.layout.liveWidth,
    height: input.layout.liveHeight
  }
  const blocked = deriveBlockedDesignZones(input)
  const fragments = blocked.reduce<DesignRect[]>(
    (zones, blockedZone) =>
      zones.flatMap(zone => subtractRect(zone, blockedZone.bounds)),
    [liveRect]
  )

  return fragments.map((bounds, index) => ({
    id: `allowed-zone-${index + 1}`,
    label: `Allowed Zone ${index + 1}`,
    bounds,
    source:
      blocked.length > 0 ? "live-area-minus-safe-zones" : "live-area"
  }))
}

export function canApplyLayerToAllowedZones(
  layer: DesignLayerSpec,
  allowedZones: readonly AllowedDesignZone[]
) {
  return allowedZones.some(zone => contains(zone.bounds, layer.bounds))
}

export const applyDesignPipeline: ApplyPipeline = (
  input: ApplyPipelineInput
): ApplyPipelineResult => {
  const blockedZones = deriveBlockedDesignZones(input)
  const allowedZones = deriveAllowedDesignZones(input)
  const proposedLayers = input.proposedLayers ?? []
  const appliedLayers: DesignLayerSpec[] = []
  const rejectedLayers: ApplyPipelineResult["rejectedLayers"][number][] = []
  const warnings: string[] = []

  proposedLayers.forEach(layer => {
    if (canApplyLayerToAllowedZones(layer, allowedZones)) {
      appliedLayers.push(layer)
      return
    }
    rejectedLayers.push({
      layer,
      reason: "Layer bounds exceed the allowed design zones."
    })
  })

  if (blockedZones.length === 0) {
    warnings.push("No safe zones were supplied; design application uses the full live area.")
  }

  return {
    allowedZones,
    blockedZones,
    appliedLayers,
    rejectedLayers,
    warnings
  }
}
