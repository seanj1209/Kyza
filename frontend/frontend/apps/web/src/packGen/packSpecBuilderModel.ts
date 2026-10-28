import type { PackGenFieldPolicy, PackGenWorkspaceField } from "./packGenFieldPolicy"

export const PACK_SPEC_BUILDER_TABS = [
  { id: "details", label: "Details" },
  { id: "size", label: "Size" },
  { id: "pack-setup", label: "Pack Setup" },
  { id: "product", label: "Product" },
  { id: "review", label: "Review" },
] as const

export type PackSpecBuilderTabId = typeof PACK_SPEC_BUILDER_TABS[number]["id"]

export type PackSpecBuilderFieldDefinition = {
  field: PackGenWorkspaceField
  label: string
  tab: Exclude<PackSpecBuilderTabId, "review">
  advanced: boolean
  control?: "text" | "number" | "select" | "segments" | "boolean-segments"
  step?: string
}

export const PACK_SPEC_BUILDER_FIELDS: readonly PackSpecBuilderFieldDefinition[] = [
  { field: "packType", label: "Pack type", tab: "details", advanced: false, control: "select" },
  { field: "orientation", label: "Orientation", tab: "details", advanced: true },
  { field: "finishedWidthMm", label: "Finished width (mm)", tab: "size", advanced: false, control: "number", step: "0.1" },
  { field: "finishedHeightMm", label: "Finished height (mm)", tab: "size", advanced: false, control: "number", step: "0.1" },
  { field: "gussetMm", label: "Gusset (mm)", tab: "size", advanced: false, control: "number", step: "0.1" },
  { field: "materialNotes", label: "Substrate", tab: "pack-setup", advanced: false, control: "select" },
  { field: "eyemarkCount", label: "How many eyemarks?", tab: "pack-setup", advanced: false, control: "segments" },
  { field: "zipEnabled", label: "Reclosable zip", tab: "pack-setup", advanced: false, control: "boolean-segments" },
  { field: "trimMm", label: "Trim (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "sealTopMm", label: "Top seal (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "sealBottomMm", label: "Bottom seal (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "sealLeftMm", label: "Left seal (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "sealRightMm", label: "Right seal (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "minimumSafeZoneMm", label: "Minimum safe zone (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "bleedMm", label: "Bleed (mm)", tab: "pack-setup", advanced: true, control: "number", step: "0.1" },
  { field: "machineConstraints", label: "Machine / packing constraints", tab: "pack-setup", advanced: true },
  { field: "productDescription", label: "Product / fill description", tab: "product", advanced: false },
  { field: "fillWeightG", label: "Fill weight (g)", tab: "product", advanced: false, control: "number", step: "0.1" },
  { field: "fillVolumeMl", label: "Fill volume (ml)", tab: "product", advanced: false, control: "number", step: "0.1" },
] as const

export function getPackSpecBuilderFields(
  policy: PackGenFieldPolicy,
  tab: PackSpecBuilderTabId,
  advancedSettings: boolean,
) {
  if (tab === "review") return []
  return PACK_SPEC_BUILDER_FIELDS
    .filter((definition) => (
      definition.tab === tab
      && policy.visibleFields.includes(definition.field)
      && (advancedSettings || !definition.advanced)
    ))
    .map((definition) => {
      if (policy.packType !== "k-seal-pouch") return definition
      if (definition.field === "finishedWidthMm") return { ...definition, label: "Pouch Width (mm)" }
      if (definition.field === "finishedHeightMm") return { ...definition, label: "Pouch Height (mm)" }
      return definition
    })
}

