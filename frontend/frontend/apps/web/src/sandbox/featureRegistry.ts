import { setOpeningStyle } from "../../../../packages/cutter-engine/actions/openingStyle"
import { createDoyPouchDefaults, createSachetDefaults } from "../core/model/parameterSchema"
import { clampHangerSlotDiameter } from "../constraints/hangerSlots"
import type { FlowwrapSpec, HangerSlotSpec } from "../types/flowwrap"
import type { SandboxFeatureId, SandboxPackId } from "./types"

export type SandboxFeatureRegistryEntry = Readonly<{
  id: SandboxFeatureId
  label: string
  ruleIds: readonly string[]
  packIds: readonly SandboxPackId[]
  apply: (spec: FlowwrapSpec, packId: SandboxPackId) => FlowwrapSpec
}>

function withDoyFeature(
  spec: FlowwrapSpec,
  overrides: Partial<NonNullable<FlowwrapSpec["doyPouch"]>>
): FlowwrapSpec {
  return {
    ...spec,
    doyPouch: createDoyPouchDefaults({
      ...spec.doyPouch,
      ...overrides
    })
  }
}

function withSachetTearNotch(spec: FlowwrapSpec): FlowwrapSpec {
  return {
    ...spec,
    sachet: createSachetDefaults({
      ...spec.sachet,
      tearNotch: {
        ...spec.sachet?.tearNotch,
        enabled: true
      }
    })
  }
}

function createDefaultHangerSlot(spec: FlowwrapSpec): HangerSlotSpec {
  const leftSeal = spec.seals?.left ?? spec.seal
  const rightSeal = spec.seals?.right ?? spec.seal
  const topSeal = spec.seals?.top ?? spec.seal
  const bottomSeal = spec.seals?.bottom ?? spec.seal
  const liveWidth = Math.max(1, spec.width - leftSeal - rightSeal)
  const liveHeight = Math.max(1, spec.height - topSeal - bottomSeal)
  const diameter = clampHangerSlotDiameter(8, liveWidth)
  const minCenterY = diameter / 2 + 2
  const maxCenterY = Math.max(minCenterY, liveHeight - diameter / 2 - 2)

  return {
    id: "custom-hanger-slot",
    type: "hanger-slot",
    subtype: "round-hole",
    diameter,
    centerX: liveWidth / 2,
    centerY: Math.max(minCenterY, Math.min(12, maxCenterY)),
    mirrored: true
  }
}

function withHangerSlot(spec: FlowwrapSpec): FlowwrapSpec {
  if ((spec.hangerSlots?.length ?? 0) > 0) {
    return spec
  }
  return {
    ...spec,
    hangerSlots: [createDefaultHangerSlot(spec)]
  }
}

export const SANDBOX_FEATURE_REGISTRY: readonly SandboxFeatureRegistryEntry[] = [
  {
    id: "zipper",
    label: "Grip Seal (Zip)",
    ruleIds: ["zipper"],
    packIds: ["doy-pouch", "k-seal-pouch"],
    apply: spec => setOpeningStyle(withDoyFeature(spec, {}), "zip")
  },
  {
    id: "tearNotch",
    label: "Tear Notch",
    ruleIds: ["tear-notch"],
    packIds: ["doy-pouch", "k-seal-pouch", "sachet-4-side-seal"],
    apply: (spec, packId) =>
      packId === "sachet-4-side-seal"
        ? withSachetTearNotch(spec)
        : withDoyFeature(spec, { showTearNotch: true })
  },
  {
    id: "hangerSlot",
    label: "Hanger Slot",
    ruleIds: ["hanger-slot"],
    packIds: [
      "flowwrap",
      "doy-pouch",
      "pillow-pack",
      "k-seal-pouch",
      "plain-web",
      "sachet-3-side-seal",
      "sachet-4-side-seal"
    ],
    apply: spec => withHangerSlot(spec)
  }
] as const

export function getFeatureRegistryEntry(id: string) {
  return SANDBOX_FEATURE_REGISTRY.find(entry => entry.id === id)
}

export function getFeatureRegistryEntriesForPack(packId: SandboxPackId) {
  return SANDBOX_FEATURE_REGISTRY.filter(entry => entry.packIds.includes(packId))
}

export function applySandboxFeatures(
  spec: FlowwrapSpec,
  packId: SandboxPackId,
  enabledFeatures: readonly string[]
) {
  return enabledFeatures.reduce((nextSpec, featureId) => {
    const entry = getFeatureRegistryEntry(featureId)
    if (!entry || !entry.packIds.includes(packId)) {
      return nextSpec
    }
    return entry.apply(nextSpec, packId)
  }, spec)
}

export function getRequiredRuleIdsForFeatures(
  packId: SandboxPackId,
  enabledFeatures: readonly string[]
) {
  const ruleIds = new Set<string>()
  enabledFeatures.forEach(featureId => {
    const entry = getFeatureRegistryEntry(featureId)
    if (!entry || !entry.packIds.includes(packId)) {
      return
    }
    entry.ruleIds.forEach(ruleId => {
      ruleIds.add(ruleId)
    })
  })
  return [...ruleIds]
}
