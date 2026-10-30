import type { FlowwrapSpec } from "../types/flowwrap"
import { availableAppearanceTargets, resolveAppearance, type Appearance, type AppearanceTarget } from "../renderers/elementAppearance"
import { createStudioIcon } from "./studioIcons"
import "./customiseConcept.css"

const RECENT_KEY = "kyza.customise.recentColours"
const DEFAULT_COLOURS = ["#000000", "#1d1d1d", "#9e1316", "#dbc8b6", "#ffffff", "#2eb774"]
const validHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)
export function readRecentColours(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")
    return Array.isArray(value) ? [...new Set(value.filter(validHex).map(v => v.toLowerCase()))].slice(0, 8) : []
  } catch { return [] }
}
export function rememberColour(colour: string) {
  if (!validHex(colour)) return
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([colour.toLowerCase(), ...readRecentColours().filter(c => c !== colour.toLowerCase())].slice(0, 8))) } catch { /* Storage is optional. */ }
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") {
  const el = document.createElement(tag); el.className = className; el.textContent = text; return el
}
export function colourPalette(host: HTMLElement, getColour: () => string, setColour: (hex: string) => void) {
  const root = element("div", "customise-palettes")
  host.appendChild(root)
  const groups = ["Default", "Recently used"].map(title => {
    const group = element("div", "customise-swatch-group"), row = element("div", "customise-swatches")
    row.setAttribute("role", "group"); row.setAttribute("aria-label", `${title} colours`)
    group.append(element("span", "customise-swatch-label", title), row); root.appendChild(group)
    return row
  })
  const refresh = () => {
    ;[DEFAULT_COLOURS, readRecentColours()].forEach((colours, index) => {
      const row = groups[index]
      row.querySelector(".customisation-category-note")?.remove()
      ;[...row.querySelectorAll<HTMLButtonElement>("button")].forEach(b => { if (!colours.includes(b.dataset.colour!)) b.remove() })
      colours.forEach((hex, position) => {
        let b = [...row.querySelectorAll<HTMLButtonElement>("button")].find(button => button.dataset.colour === hex)
        if (!b) {
          b = element("button", "customise-swatch"); b.type = "button"; b.style.background = hex; b.dataset.colour = hex
          b.setAttribute("aria-label", `Colour ${hex}`)
          b.addEventListener("click", () => { rememberColour(hex); setColour(hex); refresh() })
        }
        b.setAttribute("aria-pressed", String(getColour().toLowerCase() === hex))
        if (row.children[position] !== b) row.insertBefore(b, row.children[position] ?? null)
      })
      if (!colours.length) row.appendChild(element("span", "customisation-category-note", "Colours you use will appear here"))
    })
  }
  refresh(); return refresh
}
function preview(name: string, icon: string) {
  const card = element("div", "customise-summary")
  const thumb = element("div", "customise-thumb"); const svg = createStudioIcon(icon)
  if (svg) thumb.appendChild(svg)
  const copy = element("div"); copy.append(element("strong", "", name), element("span", "customise-editable", "Appearance"))
  card.append(thumb, copy); return { card, thumb }
}
/** Rehouse existing controls without replacing their handlers or engineering fields. */
export function decorateCustomiseTarget(section: HTMLElement, icon: string) {
  const title = section.querySelector("h3")?.textContent ?? ""
  const summary = preview(title, icon)
  const rows = [...section.querySelectorAll<HTMLElement>(":scope > .customisation-row")]
  section.querySelector("h3")?.remove(); section.prepend(summary.card)
  const groups = new Map<string, HTMLElement>()
  rows.forEach(row => {
    const label = row.firstElementChild?.textContent ?? ""
    const name = label === "Colour" ? "Colour" : label === "Opacity" ? "Opacity" : "Line & stroke"
    let card = groups.get(name)
    if (!card) { card = element("div", "customise-card"); card.appendChild(element("h3", "", name)); groups.set(name, card); section.appendChild(card) }
    card.appendChild(row)
    row.querySelectorAll("input,select").forEach(field => field.setAttribute("aria-label", `${title} ${label}${field.getAttribute("type") === "range" ? " slider" : field.getAttribute("type") === "color" ? " picker" : ""}`))
    if (label === "Thickness") row.appendChild(element("span", "customise-unit", "mm"))
  })
  ;["Colour", "Line & stroke", "Opacity"].forEach(name => { const card = groups.get(name); if (card) section.appendChild(card) })
  const sync = () => {
    const hex = section.querySelector<HTMLInputElement>(".customisation-color-text")?.value
    if (validHex(hex)) summary.thumb.style.color = hex
    const range = section.querySelector<HTMLInputElement>(".customisation-opacity-range")
    if (range) range.style.setProperty("--fill", `${range.value}%`)
    section.querySelectorAll<HTMLElement>(".customise-swatch").forEach(b => b.setAttribute("aria-pressed", String(b.getAttribute("aria-label") === `Colour ${hex?.toLowerCase()}`)))
  }
  section.addEventListener("input", sync); section.addEventListener("change", sync)
  return sync
}

export function createAppearanceEditor(host: HTMLElement, group: "elements" | "measures", getSpec: () => FlowwrapSpec | null, onChange: (spec: FlowwrapSpec) => void) {
  const chips = element("div", "customise-targets"); chips.setAttribute("role", "radiogroup"); chips.setAttribute("aria-label", `Choose ${group} appearance`)
  const content = element("div", "customise-target-content")
  host.append(chips, content)
  // A chip is either a single target ("windows") or a feature grouping several
  // targets ("feature:gusset" → K Seal Gusset Fill + Outline). Each part keeps
  // its own stored appearance key, so styling ownership never overlaps.
  let selected = "", signature = "", controls: (() => void)[] = []
  const featureParts = new Map<string, "Fill" | "Outline">()
  const PART_ORDER = ["Fill", "Outline"]
  const chipKey = (t: AppearanceTarget) => t.feature ? `feature:${t.feature.id}` : t.id
  const featureTargets = (featureId: string) => {
    const spec = getSpec()
    return (spec ? availableAppearanceTargets(spec) : [])
      .filter(t => t.feature?.id === featureId)
      .sort((a, b) => PART_ORDER.indexOf(a.feature!.part) - PART_ORDER.indexOf(b.feature!.part))
  }
  const currentTarget = (): AppearanceTarget | undefined => {
    const spec = getSpec(); if (!spec) return undefined
    if (!selected.startsWith("feature:")) return availableAppearanceTargets(spec).find(t => t.id === selected)
    const featureId = selected.slice(8)
    const parts = featureTargets(featureId)
    return parts.find(t => t.feature!.part === featureParts.get(featureId)) ?? parts[0]
  }
  const value = () => { const t = currentTarget()!; return resolveAppearance(t, getSpec()?.elementAppearance?.[t.id]) }
  const commit = (patch: Appearance | null) => {
    const spec = getSpec(); const t = currentTarget(); if (!spec || !t) return
    const appearance = { ...spec.elementAppearance }
    if (patch === null) delete appearance[t.id]
    else appearance[t.id] = { ...appearance[t.id], ...patch }
    onChange({ ...spec, elementAppearance: appearance }); controls.forEach(f => f())
  }
  const card = (name: string) => { const c = element("section", "customise-card"); c.appendChild(element("h3", "", name)); content.appendChild(c); return c }
  const row = (host: HTMLElement, name: string) => { const r = element("div", "customisation-row"); r.appendChild(element("span", "", name)); host.appendChild(r); return r }
  const draw = () => {
    const t = currentTarget(); content.replaceChildren(); controls = []
    chips.querySelectorAll<HTMLElement>("[role=radio]").forEach(b => { const on = b.dataset.target === selected; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1 })
    if (!t) { content.appendChild(element("p", "customisation-category-note", "Add elements in the Elements menu to customise their appearance.")); return }
    if (t.feature) {
      const feature = t.feature
      const parts = featureTargets(feature.id)
      const switcher = element("div", "customise-segment customise-feature-parts")
      switcher.setAttribute("role", "radiogroup"); switcher.setAttribute("aria-label", `${feature.name} appearance`)
      parts.forEach(part => {
        const b = element("button", "", part.feature!.part); b.type = "button"; b.setAttribute("role", "radio")
        const on = part.feature!.part === feature.part
        b.setAttribute("aria-checked", String(on)); b.setAttribute("aria-pressed", String(on)); b.tabIndex = on ? 0 : -1
        b.dataset.part = part.feature!.part.toLowerCase()
        b.addEventListener("click", () => { featureParts.set(feature.id, part.feature!.part); draw() })
        switcher.appendChild(b)
      })
      content.appendChild(switcher)
    }
    const summary = preview(t.name, t.icon); content.appendChild(summary.card)
    controls.push(() => { const s = value(); summary.thumb.style.color = s.color; summary.thumb.style.opacity = String(s.opacity) })
    if (t.caps.includes("color")) {
      const c = card("Colour"), r = row(c, "Colour"), wrap = element("div", "customisation-color-wrap")
      const hex = element("input", "customisation-color-text"); hex.type = "text"; hex.maxLength = 7; hex.setAttribute("aria-label", `${t.name} hex colour`)
      const picker = element("input", "customise-colour-picker"); picker.type = "color"; picker.setAttribute("aria-label", `${t.name} colour picker`)
      wrap.append(hex, picker); r.appendChild(wrap)
      const palette = colourPalette(c, () => value().color, color => commit({ color }))
      const update = (color: string) => { if (validHex(color)) { rememberColour(color); commit({ color: color.toLowerCase() }); palette() } else hex.value = value().color }
      hex.addEventListener("change", () => update(hex.value.trim())); picker.addEventListener("input", () => commit({ color: picker.value })); picker.addEventListener("change", () => update(picker.value))
      controls.push(() => { hex.value = value().color; picker.value = value().color; palette() })
    }
    const numbers = (c: HTMLElement, key: "thickness" | "fontSize" | "opacity", name: string, min: number, max: number, step: number, unit: string, slider = false) => {
      const r = row(c, name), wrap = element("div", "customisation-opacity-wrap")
      const n = element("input", "customisation-number"); n.type = "number"; n.min = String(min); n.max = String(max); n.step = String(step); n.setAttribute("aria-label", `${t.name} ${name.toLowerCase()}`)
      let range: HTMLInputElement | null = null
      if (slider) { range = element("input", "customisation-opacity-range"); range.type = "range"; range.min = String(min); range.max = String(max); range.step = String(step); range.setAttribute("aria-label", `${t.name} ${name.toLowerCase()} slider`); wrap.appendChild(range) }
      wrap.append(n, element("span", "customise-unit", unit)); r.appendChild(wrap)
      const update = (input: HTMLInputElement) => {
        const num = Number(input.value)
        if (input.value.trim() && Number.isFinite(num)) {
          const next = Math.max(min, Math.min(max, num)) / (key === "opacity" ? 100 : 1)
          if (next !== value()[key]) commit({ [key]: next })
          else controls.forEach(f => f())
        } else controls.forEach(f => f())
      }
      n.addEventListener("change", () => update(n)); n.addEventListener("blur", () => update(n))
      n.addEventListener("keydown", e => { if (e.key === "Enter") n.blur() })
      range?.addEventListener("input", () => update(range!))
      controls.push(() => { const v = value()[key] * (key === "opacity" ? 100 : 1); n.value = String(v); if (range) { range.value = String(v); range.style.setProperty("--fill", `${(v - min) / (max - min) * 100}%`) } })
    }
    if (t.caps.includes("thickness") || t.caps.includes("lineStyle")) {
      const c = card("Line & stroke")
      if (t.caps.includes("thickness")) numbers(c, "thickness", "Thickness", .1, 10, .05, "mm")
      if (t.caps.includes("lineStyle")) {
        const r = row(c, "Line"), seg = element("div", "customise-segment"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", `${t.name} line style`)
        ;["solid", "dashed", "dotted"].forEach(v => { const b = element("button", "", v[0].toUpperCase() + v.slice(1)); b.type = "button"; b.addEventListener("click", () => commit({ lineStyle: v as Appearance["lineStyle"] })); controls.push(() => b.setAttribute("aria-pressed", String(value().lineStyle === v))); seg.appendChild(b) }); r.appendChild(seg)
      }
    }
    if (t.caps.includes("fill")) {
      const c = card("Fill"), seg = element("div", "customise-segment"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", `${t.name} fill`)
      ;["none", "solid", "tint", "hatch"].forEach(v => { const b = element("button", "", v[0].toUpperCase() + v.slice(1)); b.type = "button"; b.addEventListener("click", () => commit({ fill: v as Appearance["fill"] })); controls.push(() => b.setAttribute("aria-pressed", String(value().fill === v))); seg.appendChild(b) }); c.appendChild(seg)
    }
    if (t.caps.includes("fontSize")) numbers(card("Text"), "fontSize", "Size", 2, 12, .25, "mm", true)
    if (t.caps.includes("opacity")) numbers(card("Opacity"), "opacity", "Opacity", 0, 100, 1, "%", true)
    const reset = element("button", "customise-reset", t.feature ? `Reset ${t.feature.part.toLowerCase()}` : "Reset appearance"); reset.type = "button"; reset.addEventListener("click", () => commit(null)); content.appendChild(reset)
    controls.forEach(f => f())
  }
  const refresh = () => {
    const spec = getSpec(); const targets = spec ? availableAppearanceTargets(spec).filter(t => t.group === group) : []
    const chipsFor = targets.filter((t, index) => targets.findIndex(other => chipKey(other) === chipKey(t)) === index)
    const next = chipsFor.map(chipKey).join(",")
    if (next !== signature || !content.childElementCount) {
      signature = next; if (!chipsFor.some(t => chipKey(t) === selected)) selected = chipsFor[0] ? chipKey(chipsFor[0]) : ""
      chips.replaceChildren()
      chipsFor.forEach(t => {
        const key = chipKey(t)
        const b = element("button", "customise-target", t.feature?.name ?? t.name); b.type = "button"; b.dataset.target = key; b.setAttribute("role", "radio")
        b.addEventListener("click", () => { selected = key; draw() }); chips.appendChild(b)
      }); draw()
    } else controls.forEach(f => f())
  }
  chips.addEventListener("keydown", e => {
    const buttons = [...chips.querySelectorAll<HTMLButtonElement>("button")], index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? (index + 1) % buttons.length : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length : -1
    if (next >= 0) { e.preventDefault(); buttons[next].click(); buttons[next].focus() }
  })
  return { refresh }
}
