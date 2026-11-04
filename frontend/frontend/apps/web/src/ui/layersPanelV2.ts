import { LayerManager, type Layer } from "../layers/layerManager"
import { createStudioIcon } from "./studioIcons"

type Category = "base" | "gusset" | "elements" | "perforations" | "measures" | "legend"
const categories: { id: Category; label: string }[] = [
  { id: "base", label: "Base" }, { id: "gusset", label: "Gusset" },
  { id: "elements", label: "Elements" }, { id: "perforations", label: "Perforations" },
  { id: "measures", label: "Measures" }, { id: "legend", label: "Legend" }
]
const baseIds = new Set(["cutter-outline", "seal-areas", "substrate", "eyemarks"])
const measureIds = new Set(["measurement-guides", "measures", "sub-measures", "perf-measures", "custom-measures"])
const categoryFor = (layer: Layer): Category => baseIds.has(layer.id) ? "base"
  : layer.groupId === "gusset" ? "gusset"
  : layer.id === "perf-lines" ? "perforations"
  : measureIds.has(layer.id) ? "measures"
  : layer.id === "cutter-legend" ? "legend" : "elements"

type Options = {
  onSelectLayer?: (layerId: string, multi: boolean) => void
  onSelectSubLayer?: (layerId: string, index: number) => void
  canDeleteLayer?: (layerId: string) => boolean
  onDeleteLayer?: (layerId: string) => void
  canDeleteSubLayer?: (layerId: string, index: number) => boolean
  onDeleteSubLayer?: (layerId: string, index: number) => void
  onToggleSubLayerVisibility?: (layerId: string, index: number) => void
  onToggleSubLayerLock?: (layerId: string, index: number) => void
  getSubLayerState?: (layerId: string, index: number) => { visible: boolean; locked: boolean }
}

function button(label: string, className: string, icon?: string) {
  const node = document.createElement("button")
  node.type = "button"
  node.className = className
  node.setAttribute("aria-label", label)
  if (icon) node.append(createStudioIcon(icon)!)
  return node
}

export function initLayersPanelV2(container: HTMLElement, manager: LayerManager, options: Options = {}) {
  const panel = document.createElement("div")
  panel.className = "layers-panel-v2"
  const tabs = document.createElement("div")
  tabs.className = "layers-category-tabs"
  tabs.setAttribute("role", "tablist")
  tabs.setAttribute("aria-label", "Layer categories")
  const content = document.createElement("div")
  content.className = "layers-category-content"
  panel.append(tabs, content)
  container.replaceChildren(panel)
  let active: Category = "base"
  const expanded = new Set<string>()

  const action = (label: string, icon: string, onClick: () => void, disabled = false) => {
    const node = button(label, "layer-action is-sub", icon)
    node.disabled = disabled
    node.addEventListener("click", event => { event.stopPropagation(); onClick() })
    return node
  }

  const render = () => {
    const all = manager.getGroups().flatMap(group => manager.getLayersByGroup(group.id))
      .filter(layer => manager.isLayerAvailable(layer.id))
    const visibleCategories = categories.filter(category => category.id !== "gusset" || all.some(layer => categoryFor(layer) === "gusset"))
    if (!visibleCategories.some(category => category.id === active)) active = visibleCategories[0]?.id ?? "base"
    tabs.replaceChildren()
    for (const category of visibleCategories) {
      const tab = button(category.label, "layers-category-tab")
      tab.textContent = category.label
      tab.setAttribute("role", "tab")
      tab.setAttribute("aria-selected", String(active === category.id))
      tab.tabIndex = active === category.id ? 0 : -1
      tab.addEventListener("click", () => { active = category.id; render() })
      tabs.append(tab)
    }
    content.replaceChildren()
    for (const layer of all.filter(layer => categoryFor(layer) === active)) {
      const row = document.createElement("section")
      row.className = "layer-row"
      row.dataset.layerId = layer.id
      row.classList.toggle("is-active", manager.getActiveLayerId() === layer.id)
      const heading = document.createElement("div")
      heading.className = "layer-row-main"
      const children = manager.getLayerChildren(layer.id)
      if (children.length) {
        const toggle = button(`Toggle ${layer.name} items`, "layer-row-toggle")
        toggle.textContent = "▾"
        toggle.classList.toggle("is-collapsed", !expanded.has(layer.id))
        toggle.setAttribute("aria-expanded", String(expanded.has(layer.id)))
        toggle.addEventListener("click", () => { expanded.has(layer.id) ? expanded.delete(layer.id) : expanded.add(layer.id); render() })
        heading.append(toggle)
      }
      const title = button(`Select ${layer.name}`, "layer-row-name")
      title.textContent = layer.name
      title.addEventListener("click", event => options.onSelectLayer?.(layer.id, event.shiftKey || event.ctrlKey || event.metaKey))
      heading.append(title)
      const actions = document.createElement("div")
      actions.className = "layer-row-actions"
      actions.append(
        action(`Delete ${layer.name}`, "trash", () => options.onDeleteLayer?.(layer.id), !options.canDeleteLayer?.(layer.id)),
        action(`Toggle ${layer.name} lock`, layer.locked ? "locked" : "unlocked", () => manager.toggleLayerLock(layer.id)),
        action(`Toggle ${layer.name} visibility`, layer.visible ? "visible" : "hidden", () => manager.toggleLayerVisibility(layer.id))
      )
      row.append(heading, actions)
      if (children.length && expanded.has(layer.id)) {
        const list = document.createElement("div")
        list.className = "layer-child-list"
        children.forEach((label, index) => {
          const child = document.createElement("div")
          child.className = "layer-child-row"
          const name = button(`Select ${label}`, "layer-child-name")
          name.textContent = label
          name.addEventListener("click", () => options.onSelectSubLayer?.(layer.id, index))
          const state = options.getSubLayerState?.(layer.id, index) ?? { visible: true, locked: false }
          const childActions = document.createElement("div")
          childActions.className = "layer-row-actions"
          childActions.append(
            action(`Delete ${label}`, "trash", () => options.onDeleteSubLayer?.(layer.id, index), !options.canDeleteSubLayer?.(layer.id, index)),
            action(`Toggle ${label} lock`, state.locked ? "locked" : "unlocked", () => options.onToggleSubLayerLock?.(layer.id, index)),
            action(`Toggle ${label} visibility`, state.visible ? "visible" : "hidden", () => options.onToggleSubLayerVisibility?.(layer.id, index))
          )
          child.append(name, childActions)
          list.append(child)
        })
        row.append(list)
      }
      content.append(row)
    }
    if (!content.childElementCount) {
      const empty = document.createElement("p")
      empty.className = "customisation-category-note"
      empty.textContent = "No layers in this section yet."
      content.append(empty)
    }
  }
  const unsubscribe = manager.subscribe(render)
  render()
  return { destroy: unsubscribe }
}
