import type { FlowwrapSpec, SafeZoneSpec } from "../types/flowwrap"

export type DesignRect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type BackgroundStyle =
  | "solid"
  | "gradient"
  | "texture"
  | "pattern"
  | "photo"

export type MotifStyle =
  | "geometric"
  | "organic"
  | "botanical"
  | "technical"
  | "minimal"
  | "abstract"

export type BrandTone =
  | "clean"
  | "premium"
  | "playful"
  | "bold"
  | "clinical"
  | "natural"

export type DesignPalette = Readonly<{
  primary: string
  secondary: string
  accent: string
  neutral: string
}>

export type DesignIntent = Readonly<{
  backgroundStyle: BackgroundStyle
  motif: MotifStyle
  palette: DesignPalette
  brandTone: BrandTone
  compositionHints?: readonly string[]
  textPolicy?: "brand-only" | "minimal" | "none"
}>

export type DesignLayerKind =
  | "background"
  | "motif"
  | "texture"
  | "badge"
  | "overlay"

export type DesignLayerSpec = Readonly<{
  id: string
  kind: DesignLayerKind
  bounds: DesignRect
  opacity: number
  zIndex: number
  label?: string
  metadata?: Readonly<Record<string, string | number | boolean>>
}>

export type AllowedDesignZone = Readonly<{
  id: string
  label: string
  bounds: DesignRect
  source: "live-area" | "live-area-minus-safe-zones"
}>

export type BlockedDesignZone = Readonly<{
  id: string
  label: string
  bounds: DesignRect
  source: "safe-zone"
}>

export type LayoutSafetySnapshot = Readonly<{
  liveOriginX: number
  liveOriginY: number
  liveWidth: number
  liveHeight: number
  safeZones: readonly SafeZoneSpec[]
}>

export type ApplyPipelineInput = Readonly<{
  spec: FlowwrapSpec
  layout: LayoutSafetySnapshot
  intent: DesignIntent
  proposedLayers?: readonly DesignLayerSpec[]
}>

export type RejectedDesignLayer = Readonly<{
  layer: DesignLayerSpec
  reason: string
}>

export type ApplyPipelineResult = Readonly<{
  allowedZones: readonly AllowedDesignZone[]
  blockedZones: readonly BlockedDesignZone[]
  appliedLayers: readonly DesignLayerSpec[]
  rejectedLayers: readonly RejectedDesignLayer[]
  warnings: readonly string[]
}>

export type ApplyPipeline = (input: ApplyPipelineInput) => ApplyPipelineResult
