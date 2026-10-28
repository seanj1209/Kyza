import type { FlowwrapSpec } from "../../types/flowwrap"

export type GeometryResolverKind = "layout-resolver" | "geometry-resolver" | "composer"

export type GeometryRegistryEntry = Readonly<{
  id: string
  label: string
  packIds: readonly string[]
  resolverKind: GeometryResolverKind
  moduleId: string
  notes?: string
}>

export type RuleRegistryStatus =
  | "implemented"
  | "partial"
  | "metadata-only"
  | "planned"

export type RuleRegistryCategory =
  | "placement"
  | "feature"
  | "cutting"
  | "print"
  | "measurement"

export type RuleRegistryEntry = Readonly<{
  id: string
  label: string
  category: RuleRegistryCategory
  status: RuleRegistryStatus
  packIds: readonly string[]
  implementedBy?: readonly string[]
  notes?: string
}>

export type ConstraintProfileDefaults = Readonly<{
  substrate: NonNullable<FlowwrapSpec["substrate"]>
  base: Readonly<{
    bleed: number
    sealClearance: number
  }>
  sachet: Readonly<{
    safeZoneBuffer: number
  }>
}>

export type ConstraintProfileEntry = Readonly<{
  id: string
  label: string
  machine: string
  substrate: NonNullable<FlowwrapSpec["substrate"]>
  defaults: ConstraintProfileDefaults
  notes?: string
}>
