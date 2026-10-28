import { useEffect, useState } from "react"
import { LEGEND_ITEM_OPTIONS, addLegendPreset, loadLegendConfig, saveLegendConfig, type LegendConfig, type LegendItemId, type LegendPreset } from "../legendConfig"

export function LegendConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<LegendConfig>(() => loadLegendConfig())
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!open) return
    setConfig(loadLegendConfig()); setSaved(false)
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [open, onClose])
  if (!open) return null
  const preset = config.presets.find(item => item.id === config.activePresetId) ?? config.presets[0]
  if (!preset) return null
  const updatePreset = (changes: Partial<LegendPreset>) => {
    setSaved(false)
    setConfig(current => ({ ...current, presets: current.presets.map(item => item.id === current.activePresetId ? { ...item, ...changes } : item) }))
  }
  const removeItem = (id: LegendItemId) => { if (preset.items.length > 1) updatePreset({ items: preset.items.filter(item => item !== id) }) }
  const addItem = (id: LegendItemId) => updatePreset({ items: [...preset.items, id] })

  return <div className="klyro-legend-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="klyro-legend-modal" role="dialog" aria-modal="true" aria-labelledby="legend-config-title">
      <button className="klyro-legend-close" type="button" onClick={onClose} aria-label="Close legend configuration">×</button>
      <header className="klyro-legend-header"><span className="klyro-eyebrow">CUTTER GUIDE</span><h2 id="legend-config-title">Legend Config</h2><p>Build and save practical legend layouts for your cutter guides.</p></header>
      <div className="klyro-legend-toolbar">
        <label>Preset<span className="klyro-legend-preset-row">
          <select aria-label="Legend preset" value={config.activePresetId} onChange={event => { setSaved(false); setConfig(current => ({ ...current, activePresetId: event.target.value })) }}>{config.presets.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          <button type="button" aria-label="Add legend preset" title="Add preset" onClick={() => { setSaved(false); setConfig(addLegendPreset(config)) }}>+</button>
        </span></label>
        <label>Preset name<input aria-label="Preset name" value={preset.name} onChange={event => updatePreset({ name: event.target.value })} /></label>
        <fieldset className="klyro-legend-orientation"><legend>Layout</legend>{(["portrait", "landscape"] as const).map(orientation => <label key={orientation}><input type="radio" name="legend-orientation" value={orientation} checked={preset.orientation === orientation} onChange={() => updatePreset({ orientation })} /><span>{orientation[0].toUpperCase() + orientation.slice(1)}</span></label>)}</fieldset>
      </div>
      <section className="klyro-legend-sizing" aria-labelledby="legend-size-title">
        <div><h3 id="legend-size-title">Sizing</h3><p>Auto follows the selected layout. Manual unlocks width and height.</p></div>
        <div className="klyro-legend-size-mode" role="group" aria-label="Legend sizing mode">{(["auto", "manual"] as const).map(sizing => <label key={sizing}><input type="radio" name="legend-sizing" value={sizing} checked={preset.sizing === sizing} onChange={() => updatePreset({ sizing })} /><span>{sizing[0].toUpperCase() + sizing.slice(1)}</span></label>)}</div>
        <label>Width (mm)<input type="number" min="1" step="1" aria-label="Legend width" disabled={preset.sizing === "auto"} value={preset.width} onChange={event => updatePreset({ width: Number(event.target.value) })} /></label>
        <label>Height (mm)<input type="number" min="1" step="1" aria-label="Legend height" disabled={preset.sizing === "auto"} value={preset.height} onChange={event => updatePreset({ height: Number(event.target.value) })} /></label>
      </section>
      <div className="klyro-legend-items">
        <section aria-labelledby="active-legend-items"><div className="klyro-legend-list-heading"><h3 id="active-legend-items">Active items</h3><span>{preset.items.length}</span></div><p>Shown in this preset.</p><ul>{preset.items.map(id => { const option = LEGEND_ITEM_OPTIONS.find(item => item.id === id)!; return <li key={id}><span>{option.label}</span><button type="button" aria-label={`Remove ${option.label}`} disabled={preset.items.length <= 1} onClick={() => removeItem(id)}>Remove</button></li> })}</ul></section>
        <section aria-labelledby="available-legend-items"><div className="klyro-legend-list-heading"><h3 id="available-legend-items">Available items</h3><span>{LEGEND_ITEM_OPTIONS.length - preset.items.length}</span></div><p>Add applicable cutter details.</p><ul>{LEGEND_ITEM_OPTIONS.filter(option => !preset.items.includes(option.id)).map(option => <li key={option.id}><span>{option.label}</span><button type="button" aria-label={`Add ${option.label}`} onClick={() => addItem(option.id)}>Add</button></li>)}</ul></section>
      </div>
      <footer className="klyro-legend-footer"><small>Legends start hidden on each cutter. Saved presets stay on this device.</small><span className="klyro-legend-saved" role="status">{saved ? "Preset saved." : ""}</span><button type="button" onClick={() => setSaved(saveLegendConfig(config))}>Save preset</button></footer>
    </section>
  </div>
}
