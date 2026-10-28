import type { ArtworkBounds } from "./artworkTypes"

export type ArtworkCategory = "Critical" | "Background"

export type ArtworkCutterOrientation = "landscape" | "portrait"
export type ArtworkPrintDirectionMode = "maintain-md-td" | "display-orientation"

export type ArtworkMdEdgeSide = "start" | "end"
export type ArtworkTdEdgeSide = "left" | "right"

export type ArtworkSlitAllowanceMm = 0 | 1.5 | 2
export type ArtworkSlitAllowanceReason = "full-width-flood" | "eyemark-track-risk" | "manual"

export type ArtworkRuleAxis = "MD" | "TD" | "Safe" | "Seal" | "Eyemark"
export type ArtworkPreflightSeverity = "info" | "warning" | "critical"

export type ArtworkEdgeBounds = {
  start: ArtworkBounds
  end: ArtworkBounds
}

export type ArtworkTdEdgeBounds = {
  left: ArtworkBounds
  right: ArtworkBounds
}

export type ArtworkMdTdEdges = {
  cutterOrientation: ArtworkCutterOrientation
  printDirectionMode: ArtworkPrintDirectionMode
  mdEdges: ArtworkEdgeBounds
  tdEdges: ArtworkTdEdgeBounds
}

export type ArtworkZoneKind =
  | "safe-zone"
  | "seal-zone"
  | "eyemark-track"
  | "slit-allowance"
  | "md-edge"
  | "td-edge"
  | "problem"

export type ArtworkZoneOverlay = {
  id: string
  kind: ArtworkZoneKind
  label: string
  note: string
  bounds: ArtworkBounds
  severity?: ArtworkPreflightSeverity
  axis?: ArtworkRuleAxis
  targetId?: string
}

export type ArtworkAffectedEyemark = {
  eyemarkId: string
  eyemarkIndex: number
  affectedSide: ArtworkTdEdgeSide
  currentTdClearanceMm: number
  requiredTdClearanceMm: number
}

export type ArtworkPreflightWarning = {
  id: string
  itemId: string | null
  itemLabel: string
  title: string
  message: string
  severity: ArtworkPreflightSeverity
  axis: ArtworkRuleAxis
  zone: string
  bounds: ArtworkBounds[]
  canIgnore: boolean
  ignored: boolean
  isPrompt?: boolean
  affectedEyemarkId?: string
  affectedEyemarkIndex?: number
  affectedSide?: ArtworkTdEdgeSide
  currentTdClearanceMm?: number
  requiredTdClearanceMm?: number
  affectedEyemarks?: ArtworkAffectedEyemark[]
  isGrouped?: boolean
  eyemarkCount?: number
  recommendedWidthIncreaseMm?: number
}
