import type { RuleRegistryEntry } from "./types"

export const RULE_REGISTRY: readonly RuleRegistryEntry[] = [
  {
    id: "zipper",
    label: "Grip Seal (Zip)",
    category: "feature",
    status: "implemented",
    packIds: ["doy-pouch", "k-seal-pouch"],
    implementedBy: ["renderDoyPouchGuides", "resolveDoyLayout"]
  },
  {
    id: "tear-notch",
    label: "Tear Notch",
    category: "cutting",
    status: "implemented",
    packIds: ["doy-pouch", "k-seal-pouch", "sachet-4-side-seal"],
    implementedBy: ["renderDoyPouchGuides", "resolveSachetLayout"]
  },
  {
    id: "die-cut",
    label: "Die Cut",
    category: "cutting",
    status: "planned",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "2-side-seal-pouch", "3-side-seal-pouch", "plain-web", "plain-film", "paper-strip"],
    notes: "Registry placeholder for sandbox rule selection; no dedicated runtime module yet."
  },
  {
    id: "cut-line",
    label: "Cut Line",
    category: "cutting",
    status: "implemented",
    packIds: ["plain-web"],
    implementedBy: ["resolvePlainWebLayout", "renderResolvedPlainWeb"]
  },
  {
    id: "slit-line",
    label: "Slit Line",
    category: "cutting",
    status: "implemented",
    packIds: ["plain-web"],
    implementedBy: ["resolvePlainWebLayout", "renderResolvedPlainWeb"]
  },
  {
    id: "windows",
    label: "Windows",
    category: "placement",
    status: "implemented",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal"],
    implementedBy: ["renderWindows", "validateFlowwrapSpec"]
  },
  {
    id: "hanger-slot",
    label: "Hanger Slot",
    category: "placement",
    status: "implemented",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "plain-web"],
    implementedBy: ["renderHangerSlots", "renderHangerSlotWarnings"]
  },
  {
    id: "safe-zones",
    label: "Safe Zones",
    category: "print",
    status: "implemented",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "paper-strip", "lidding"],
    implementedBy: ["renderSafeZones", "renderLidding", "validateFlowwrapSpec"]
  },
  {
    id: "attribute-boxes",
    label: "Attribute Boxes",
    category: "placement",
    status: "implemented",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "paper-strip"],
    implementedBy: ["renderAttributeBoxes", "validateFlowwrapSpec"]
  },
  {
    id: "perfs",
    label: "Perforations",
    category: "cutting",
    status: "implemented",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "paper-strip"],
    implementedBy: ["renderPerfs", "validateFlowwrapSpec"]
  },
  {
    id: "eyemarks",
    label: "Eyemarks",
    category: "print",
    status: "implemented",
    packIds: ["flowwrap", "doy-pouch", "pillow-pack", "k-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "paper-strip", "lidding"],
    implementedBy: ["renderEyeMarks", "renderLidding", "validateFlowwrapSpec"]
  },
  {
    id: "fold-lines",
    label: "Fold Lines",
    category: "measurement",
    status: "implemented",
    packIds: ["flowwrap", "pillow-pack", "sachet-3-side-seal", "sachet-4-side-seal"],
    implementedBy: ["buildFoldLines", "renderFoldLines"]
  },
  {
    id: "grip-seal",
    label: "Grip Seal (Default)",
    category: "feature",
    status: "implemented",
    packIds: ["doy-pouch", "k-seal-pouch"],
    implementedBy: ["renderDoyPouchGuides"]
  },
  {
    id: "gusset",
    label: "Gusset",
    category: "feature",
    status: "implemented",
    packIds: ["doy-pouch", "k-seal-pouch"],
    implementedBy: ["resolveDoyLayout", "resolveKSealLayout"]
  }
] as const

export function getRuleRegistryEntry(id: string) {
  return RULE_REGISTRY.find(entry => entry.id === id)
}

export function getRuleRegistryEntriesForPack(packId: string) {
  return RULE_REGISTRY.filter(entry => entry.packIds.includes(packId))
}
