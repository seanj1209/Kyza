import { normaliseOpeningStyle } from "../../../../../packages/cutter-engine/actions/openingStyle"
import type { FlowwrapSpec } from "../../types/flowwrap"

export type ClampConstraint = Readonly<{
  min: number
  max: number
}>

export function clampNumber(value: number, constraint: ClampConstraint) {
  return Math.max(constraint.min, Math.min(constraint.max, value))
}

export function ensureFinite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function normalizeSpec(spec: FlowwrapSpec): FlowwrapSpec {
  spec = normaliseOpeningStyle(spec)
  return {
    ...spec,
    width: ensureFinite(spec.width, spec.width),
    height: ensureFinite(spec.height, spec.height),
    seal: ensureFinite(spec.seal, spec.seal)
  }
}
