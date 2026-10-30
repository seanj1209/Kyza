export const LEGEND_CONFIG_KEY = "kyza.cutter.legend.config.v1"

export type LegendItemId =
  | "title" | "customer" | "date" | "createdBy" | "version"
  | "packType" | "sizing" | "eyemarks" | "substrate" | "key" | "notes"

export type LegendPreset = {
  id: string
  name: string
  orientation: "portrait" | "landscape"
  sizing: "auto" | "manual"
  width: number
  height: number
  items: LegendItemId[]
}

export type LegendConfig = { activePresetId: string; presets: LegendPreset[] }

export const LEGEND_ITEM_OPTIONS: ReadonlyArray<{ id: LegendItemId; label: string }> = [
  { id: "title", label: "Title" }, { id: "customer", label: "Customer" },
  { id: "date", label: "Date" }, { id: "createdBy", label: "Created by" },
  { id: "version", label: "Version" }, { id: "packType", label: "Pack type" },
  { id: "sizing", label: "Size (W × H)" }, { id: "eyemarks", label: "Eyemarks (count and size)" },
  { id: "substrate", label: "Substrate" }, { id: "key", label: "Element key" },
  { id: "notes", label: "Technical notes" },
]

const DEFAULT_ITEMS: LegendItemId[] = ["packType", "sizing", "eyemarks", "substrate", "key"]
const DEFAULT_PRESET: LegendPreset = {
  id: "kyza-standard", name: "Kyza Standard", orientation: "portrait", sizing: "auto",
  width: 116, height: 154, items: DEFAULT_ITEMS,
}

export const LEGEND_ITEMS = LEGEND_ITEM_OPTIONS.filter(option => DEFAULT_ITEMS.includes(option.id)).map(option => option.label)
export const defaultLegendConfig = (): LegendConfig => ({
  activePresetId: DEFAULT_PRESET.id,
  presets: [{ ...DEFAULT_PRESET, items: [...DEFAULT_PRESET.items] }],
})

const finiteSize = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback

function normalisePreset(value: Partial<LegendPreset>, index: number): LegendPreset {
  const known = new Set(LEGEND_ITEM_OPTIONS.map(option => option.id))
  const items = Array.isArray(value.items)
    ? value.items.filter((item): item is LegendItemId => known.has(item as LegendItemId))
    : DEFAULT_ITEMS
  return {
    id: typeof value.id === "string" && value.id ? value.id : `legend-preset-${index + 1}`,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Preset ${index + 1}`,
    orientation: value.orientation === "landscape" ? "landscape" : "portrait",
    sizing: value.sizing === "manual" ? "manual" : "auto",
    width: finiteSize(value.width, DEFAULT_PRESET.width), height: finiteSize(value.height, DEFAULT_PRESET.height),
    items: items.length ? [...new Set(items)] : [...DEFAULT_ITEMS],
  }
}

export function loadLegendConfig(storage: Pick<Storage, "getItem"> | null = typeof localStorage === "undefined" ? null : localStorage): LegendConfig {
  if (!storage) return defaultLegendConfig()
  try {
    const parsed = JSON.parse(storage.getItem(LEGEND_CONFIG_KEY) ?? "null") as Partial<LegendConfig> | null
    if (!parsed || !Array.isArray(parsed.presets) || parsed.presets.length === 0) return defaultLegendConfig()
    const presets = parsed.presets.map(normalisePreset)
    const activePresetId = presets.some(preset => preset.id === parsed.activePresetId) ? parsed.activePresetId! : presets[0].id
    return { activePresetId, presets }
  } catch { return defaultLegendConfig() }
}

export function saveLegendConfig(config: LegendConfig, storage: Pick<Storage, "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage) {
  if (!storage) return false
  try { storage.setItem(LEGEND_CONFIG_KEY, JSON.stringify(config)); return true } catch { return false }
}

export function addLegendPreset(config: LegendConfig): LegendConfig {
  const number = config.presets.length + 1
  const source = config.presets.find(preset => preset.id === config.activePresetId) ?? config.presets[0] ?? DEFAULT_PRESET
  const preset: LegendPreset = { ...source, id: `legend-preset-${Date.now()}-${number}`, name: `New preset ${number}`, items: [...source.items] }
  return { activePresetId: preset.id, presets: [...config.presets, preset] }
}
