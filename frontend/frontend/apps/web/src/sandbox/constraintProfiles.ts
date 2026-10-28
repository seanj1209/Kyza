import type { FlowwrapSpec } from "../types/flowwrap"
import type { ConstraintProfileEntry, ConstraintProfileDefaults } from "../core/registries"
import { getSandboxConstraintProfile } from "./constraintProfileRegistry"

function cloneSpec<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function applyProfileDefaults(
  spec: FlowwrapSpec,
  defaults: ConstraintProfileDefaults
): FlowwrapSpec {
  const next = cloneSpec(spec)
  next.substrate = defaults.substrate
  next.bleed = defaults.base.bleed
  next.sealClearance = defaults.base.sealClearance
  next.sachet = {
    ...(next.sachet ?? {}),
    safeZoneBuffer: defaults.sachet.safeZoneBuffer
  }
  return next
}

export function resolveConstraintProfile(profileId: string): ConstraintProfileEntry {
  const profile = getSandboxConstraintProfile(profileId)
  if (!profile) {
    throw new Error(`Unknown constraint profile "${profileId}".`)
  }
  return profile
}

export function applyConstraintProfile(
  spec: FlowwrapSpec,
  profileId: string
): { profile: ConstraintProfileEntry; spec: FlowwrapSpec } {
  const profile = resolveConstraintProfile(profileId)
  return {
    profile,
    spec: applyProfileDefaults(spec, profile.defaults)
  }
}
