import { LayerManager } from "../layers/layerManager"
import { createStudioIcon } from "./studioIcons"

const ICON_VISIBLE = "visible"
const ICON_HIDDEN = "hidden"
const ICON_LOCKED = "locked"
const ICON_UNLOCKED = "unlocked"
const ICON_BIN_STATIC = "trash"

type LayersPanelOptions = {
  onSelectLayer?: (layerId: string, multi: boolean) => void
  canDeleteLayer?: (layerId: string) => boolean
  onDeleteLayer?: (layerId: string) => void
  canDeleteSubLayer?: (layerId: string, index: number) => boolean
  onDeleteSubLayer?: (layerId: string, index: number) => void
  onToggleSubLayerVisibility?: (layerId: string, index: number) => void
  onToggleSubLayerLock?: (layerId: string, index: number) => void
  getSubLayerState?: (
    layerId: string,
    index: number
  ) => { visible: boolean; locked: boolean }
}

function createButton(className: string, label: string) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = className
  button.setAttribute("aria-label", label)
  return button
}

function createIcon(src: string) {
  const icon = createStudioIcon(src)!
  icon.classList.add("layer-action-icon")
  return icon
}

function applyBinIconStates(button: HTMLButtonElement, _icon: SVGSVGElement) {
  button.classList.add("is-delete")
}

export function initLayersPanel(
  container: HTMLElement,
  manager: LayerManager,
  options: LayersPanelOptions = {}
) {
  const panel = document.createElement("div")
  panel.className = "layers-panel"

  const groupList = document.createElement("div")
  groupList.className = "layers-group-list"
  panel.appendChild(groupList)

  container.innerHTML = ""
  container.appendChild(panel)
  const layerExpanded = new Map<string, boolean>()

  const render = () => {
    groupList.innerHTML = ""
    const groups = manager.getGroups()
    const active = manager.getActiveLayerId()
    const selected = manager.getSelectedLayerIds()

    groups.forEach(group => {
      const groupLayers = manager
        .getLayersByGroup(group.id)
        .filter(layer => manager.isLayerAvailable(layer.id))
      if (groupLayers.length === 0) {
        return
      }

      const groupCard = document.createElement("div")
      groupCard.className = "layers-group"

      const groupHeader = document.createElement("div")
      groupHeader.className = "layers-group-header"

      const headMain = createButton("layers-group-main", `Toggle ${group.name}`)
      const chevron = document.createElement("span")
      chevron.className = "layers-group-chevron"
      chevron.textContent = "▼"
      chevron.classList.toggle("is-collapsed", !group.expanded)
      headMain.appendChild(chevron)
      const groupTitle = document.createElement("span")
      groupTitle.className = "layers-group-title"
      groupTitle.textContent = group.name
      headMain.appendChild(groupTitle)
      headMain.addEventListener("click", () => {
        manager.setGroupExpanded(group.id, !group.expanded)
      })
      groupHeader.appendChild(headMain)

      const actions = document.createElement("div")
      actions.className = "layers-group-actions"

      const groupLocked = groupLayers.every(layer => layer.locked)
      const groupLock = createButton("layer-action is-round", "Toggle group lock")
      groupLock.appendChild(createIcon(groupLocked ? ICON_LOCKED : ICON_UNLOCKED))
      groupLock.addEventListener("click", event => {
        event.stopPropagation()
        manager.setGroupLock(group.id, !groupLocked)
      })
      actions.appendChild(groupLock)

      const groupVisible = groupLayers.every(layer => layer.visible)
      const groupEye = createButton("layer-action is-round", "Toggle group visibility")
      groupEye.appendChild(createIcon(groupVisible ? ICON_VISIBLE : ICON_HIDDEN))
      groupEye.addEventListener("click", event => {
        event.stopPropagation()
        manager.setGroupVisibility(group.id, !groupVisible)
      })
      actions.appendChild(groupEye)

      groupHeader.appendChild(actions)
      groupCard.appendChild(groupHeader)

      if (group.expanded) {
        const layerList = document.createElement("div")
        layerList.className = "layers-layer-list"

        groupLayers.forEach(layer => {
          const row = document.createElement("div")
          row.className = "layer-row"
          row.dataset.layerId = layer.id
          if (active === layer.id) {
            row.classList.add("is-active")
          }
          if (selected.has(layer.id)) {
            row.classList.add("is-selected")
          }

          const rowMain = document.createElement("div")
          rowMain.className = "layer-row-main"
          const childItems = manager.getLayerChildren(layer.id)
          const hasChildren = childItems.length > 1
          if (hasChildren) {
            const rowToggle = createButton("layer-row-toggle", `Toggle ${layer.name} instances`)
            rowToggle.textContent = "\u25BC"
            const isExpanded = layerExpanded.get(layer.id) ?? false
            rowToggle.classList.toggle("is-collapsed", !isExpanded)
            rowToggle.addEventListener("click", event => {
              event.stopPropagation()
              layerExpanded.set(layer.id, !isExpanded)
              render()
            })
            rowMain.appendChild(rowToggle)
          } else {
            const spacer = document.createElement("span")
            spacer.className = "layer-row-toggle-spacer"
            spacer.setAttribute("aria-hidden", "true")
            rowMain.appendChild(spacer)
          }

          const nameBtn = createButton("layer-row-name", `Select ${layer.name}`)
          nameBtn.textContent = layer.name
          nameBtn.addEventListener("click", event => {
            const mouse = event as MouseEvent
            const multi = mouse.shiftKey || mouse.ctrlKey || mouse.metaKey
            if (options.onSelectLayer) {
              options.onSelectLayer(layer.id, multi)
              return
            }
            manager.setActiveLayer(layer.id, multi)
          })
          rowMain.appendChild(nameBtn)
          row.appendChild(rowMain)

          const rowActions = document.createElement("div")
          rowActions.className = "layer-row-actions"

          const canDelete = options.canDeleteLayer ? options.canDeleteLayer(layer.id) : false
          const bin = createButton("layer-action", "Delete layer")
          const binIcon = createIcon(ICON_BIN_STATIC)
          applyBinIconStates(bin, binIcon)
          bin.appendChild(binIcon)
          if (!canDelete || !options.onDeleteLayer) {
            bin.disabled = true
            bin.classList.add("is-disabled")
          } else {
            bin.addEventListener("click", event => {
              event.stopPropagation()
              options.onDeleteLayer?.(layer.id)
            })
          }
          rowActions.appendChild(bin)

          const lock = createButton("layer-action", "Toggle lock")
          lock.appendChild(createIcon(layer.locked ? ICON_LOCKED : ICON_UNLOCKED))
          lock.addEventListener("click", event => {
            event.stopPropagation()
            manager.toggleLayerLock(layer.id)
          })
          rowActions.appendChild(lock)

          const eye = createButton("layer-action", "Toggle visibility")
          eye.appendChild(createIcon(layer.visible ? ICON_VISIBLE : ICON_HIDDEN))
          eye.addEventListener("click", event => {
            event.stopPropagation()
            manager.toggleLayerVisibility(layer.id)
          })
          rowActions.appendChild(eye)

          row.appendChild(rowActions)
          layerList.appendChild(row)

          const isExpanded = layerExpanded.get(layer.id) ?? false
          if (hasChildren && isExpanded) {
            const childList = document.createElement("div")
            childList.className = "layer-child-list"
            childItems.forEach((label, index) => {
              const childRow = document.createElement("div")
              childRow.className = "layer-child-row"
              const childLabel = document.createElement("span")
              childLabel.className = "layer-child-label"
              childLabel.textContent = label
              childRow.appendChild(childLabel)
              const childActions = document.createElement("div")
              childActions.className = "layer-row-actions"

              const childCanDelete = options.canDeleteSubLayer
                ? options.canDeleteSubLayer(layer.id, index)
                : false
              const childBin = createButton("layer-action is-sub", "Delete sub-layer")
              const childBinIcon = createIcon(ICON_BIN_STATIC)
              applyBinIconStates(childBin, childBinIcon)
              childBin.appendChild(childBinIcon)
              if (!childCanDelete || !options.onDeleteSubLayer) {
                childBin.disabled = true
                childBin.classList.add("is-disabled")
              } else {
                childBin.addEventListener("click", event => {
                  event.stopPropagation()
                  options.onDeleteSubLayer?.(layer.id, index)
                })
              }
              childActions.appendChild(childBin)

              const state = options.getSubLayerState
                ? options.getSubLayerState(layer.id, index)
                : { visible: layer.visible, locked: layer.locked }
              const childLock = createButton("layer-action is-sub", "Toggle sub-layer lock")
              childLock.appendChild(createIcon(state.locked ? ICON_LOCKED : ICON_UNLOCKED))
              childLock.addEventListener("click", event => {
                event.stopPropagation()
                options.onToggleSubLayerLock?.(layer.id, index)
              })
              childActions.appendChild(childLock)

              const childEye = createButton(
                "layer-action is-sub",
                "Toggle sub-layer visibility"
              )
              childEye.appendChild(createIcon(state.visible ? ICON_VISIBLE : ICON_HIDDEN))
              childEye.addEventListener("click", event => {
                event.stopPropagation()
                options.onToggleSubLayerVisibility?.(layer.id, index)
              })
              childActions.appendChild(childEye)

              childRow.appendChild(childActions)
              childList.appendChild(childRow)
            })
            layerList.appendChild(childList)
          }
        })

        groupCard.appendChild(layerList)
      }

      groupList.appendChild(groupCard)
    })
  }

  render()
  manager.subscribe(render)

  const onKeyDown = (event: KeyboardEvent) => {
    const activeLayerId = manager.getActiveLayerId()
    if (!activeLayerId) {
      return
    }
    const isMod = event.ctrlKey || event.metaKey
    if (!isMod) {
      return
    }
    if (event.key.toLowerCase() === "l") {
      event.preventDefault()
      manager.toggleLayerLock(activeLayerId)
    }
    if (event.key === ";") {
      event.preventDefault()
      manager.toggleLayerVisibility(activeLayerId)
    }
  }

  window.addEventListener("keydown", onKeyDown)

  return {
    destroy() {
      window.removeEventListener("keydown", onKeyDown)
    }
  }
}
