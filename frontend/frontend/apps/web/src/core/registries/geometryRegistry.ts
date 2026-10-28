import type { GeometryRegistryEntry } from "./types"

export const GEOMETRY_REGISTRY: readonly GeometryRegistryEntry[] = [
  {
    id: "flowwrap-layout",
    label: "Flowwrap Layout",
    packIds: ["flowwrap"],
    resolverKind: "composer",
    moduleId: "composeFlowwrapPack",
    notes: "Flowwrap pack composition pipeline with resolved layout output."
  },
  {
    id: "doy-layout",
    label: "DOY Layout",
    packIds: ["doy-pouch"],
    resolverKind: "composer",
    moduleId: "composeFlowwrapPack",
    notes: "DOY uses the Flowwrap family composer with DOY-specific layout branches."
  },
  {
    id: "pillow-layout",
    label: "Pillow Layout",
    packIds: ["pillow-pack"],
    resolverKind: "composer",
    moduleId: "composePillowPack"
  },
  {
    id: "sachet-3-layout",
    label: "3-Side Sachet Layout",
    packIds: ["sachet-3-side-seal", "2-side-seal-pouch", "3-side-seal-pouch"],
    resolverKind: "composer",
    moduleId: "composeSachetPack"
  },
  {
    id: "sachet-4-layout",
    label: "4-Side Sachet Layout",
    packIds: ["sachet-4-side-seal"],
    resolverKind: "composer",
    moduleId: "composeSachetPack"
  },
  {
    id: "k-seal-layout",
    label: "K-Seal Layout",
    packIds: ["k-seal-pouch"],
    resolverKind: "composer",
    moduleId: "composeKSealPack"
  },
  {
    id: "plain-web-layout",
    label: "Plain Web Layout",
    packIds: ["plain-web", "plain-film"],
    resolverKind: "composer",
    moduleId: "composePlainWebPack",
    notes: "Rectangular plain-film / paper-web layout with optional cut and slit guide lines."
  },
  {
    id: "paper-strip-layout",
    label: "Paper Strip Layout",
    packIds: ["paper-strip"],
    resolverKind: "composer",
    moduleId: "composePaperStripPack",
    notes: "Lane laminate paper strip layout with clear strip overlays and stepped lanes."
  },
  {
    id: "lidding-layout",
    label: "Lidding Layout",
    packIds: ["lidding"],
    resolverKind: "composer",
    moduleId: "resolveLiddingLayout",
    notes: "Plain, square and round lid cells with synchronized cut, bleed, seal and safe-area geometry."
  }
] as const

export function getGeometryRegistryEntry(id: string) {
  return GEOMETRY_REGISTRY.find(entry => entry.id === id)
}

export function getGeometryRegistryEntriesForPack(packId: string) {
  return GEOMETRY_REGISTRY.filter(entry => entry.packIds.includes(packId))
}
