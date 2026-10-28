export type LayerGroup = {
  id: string
  name: string
  expanded: boolean
  order: number
}

export type LayerExportRole = "cut" | "annotation" | "guide"

export type Layer = {
  id: string
  name: string
  groupId: string
  visible: boolean
  locked: boolean
  order: number
  exportRole: LayerExportRole
}

export type RenderableObject = {
  id: string
  type: string
  geometry: unknown
  layerId: string
}

type Listener = () => void

export class LayerManager {
  private groups: LayerGroup[]
  private layers: Layer[]
  private activeLayerId: string | null = null
  private selectedLayerIds = new Set<string>()
  private listeners = new Set<Listener>()
  private availableLayerIds: Set<string> | null = null
  private layerChildren = new Map<string, string[]>()

  constructor(groups: LayerGroup[], layers: Layer[]) {
    this.groups = [...groups]
    this.layers = [...layers]
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    this.listeners.forEach(listener => listener())
  }

  getGroups() {
    return [...this.groups].sort((a, b) => a.order - b.order)
  }

  getLayersByGroup(groupId: string) {
    return this.layers
      .filter(layer => layer.groupId === groupId)
      .sort((a, b) => a.order - b.order)
  }

  getLayerById(layerId: string) {
    return this.layers.find(layer => layer.id === layerId) ?? null
  }

  isLayerAvailable(layerId: string) {
    return !this.availableLayerIds || this.availableLayerIds.has(layerId)
  }

  setAvailableLayerIds(layerIds: string[]) {
    this.availableLayerIds = new Set(layerIds)
    this.emit()
  }

  getLayerChildren(layerId: string) {
    return this.layerChildren.get(layerId) ?? []
  }

  setLayerChildrenMap(next: Record<string, string[]>) {
    this.layerChildren = new Map(Object.entries(next))
    this.emit()
  }

  getActiveLayerId() {
    return this.activeLayerId
  }

  getSelectedLayerIds() {
    return new Set(this.selectedLayerIds)
  }

  clearSelection() {
    this.selectedLayerIds.clear()
    this.activeLayerId = null
    this.emit()
  }

  setSelectedLayerIds(layerIds: string[]) {
    const next = new Set(layerIds)
    let changed = false
    if (next.size !== this.selectedLayerIds.size) {
      changed = true
    } else {
      for (const id of next) {
        if (!this.selectedLayerIds.has(id)) {
          changed = true
          break
        }
      }
    }
    if (!changed) {
      return
    }
    this.selectedLayerIds = next
    this.activeLayerId = layerIds[0] ?? null
    this.emit()
  }

  setActiveLayer(layerId: string, multi: boolean) {
    if (!multi) {
      this.selectedLayerIds.clear()
    }
    if (this.selectedLayerIds.has(layerId) && multi) {
      this.selectedLayerIds.delete(layerId)
      this.activeLayerId = this.selectedLayerIds.values().next().value ?? null
      this.emit()
      return
    }
    this.selectedLayerIds.add(layerId)
    this.activeLayerId = layerId
    this.emit()
  }

  renameLayer(layerId: string, name: string) {
    this.layers = this.layers.map(layer =>
      layer.id === layerId ? { ...layer, name } : layer
    )
    this.emit()
  }

  toggleLayerVisibility(layerId: string) {
    this.layers = this.layers.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    )
    this.emit()
  }

  toggleLayerLock(layerId: string) {
    this.layers = this.layers.map(layer =>
      layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
    )
    this.emit()
  }

  setGroupExpanded(groupId: string, expanded: boolean) {
    this.groups = this.groups.map(group => {
      if (group.id === groupId) {
        return { ...group, expanded }
      }
      return expanded ? { ...group, expanded: false } : group
    })
    this.emit()
  }

  setGroupVisibility(groupId: string, visible: boolean) {
    this.layers = this.layers.map(layer =>
      layer.groupId === groupId ? { ...layer, visible } : layer
    )
    this.emit()
  }

  setGroupLock(groupId: string, locked: boolean) {
    this.layers = this.layers.map(layer =>
      layer.groupId === groupId ? { ...layer, locked } : layer
    )
    this.emit()
  }

  reorderLayer(groupId: string, layerId: string, targetIndex: number) {
    const groupLayers = this.getLayersByGroup(groupId)
    const currentIndex = groupLayers.findIndex(layer => layer.id === layerId)
    if (currentIndex === -1 || currentIndex === targetIndex) {
      return
    }
    const reordered = [...groupLayers]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const updated = new Map(reordered.map((layer, index) => [layer.id, index]))
    this.layers = this.layers.map(layer =>
      layer.groupId === groupId && updated.has(layer.id)
        ? { ...layer, order: updated.get(layer.id) ?? layer.order }
        : layer
    )
    this.emit()
  }
}

export function createDefaultLayerManager() {
  const groups: LayerGroup[] = [
    { id: "pack-base", name: "Base", expanded: true, order: 0 },
    { id: "fold-lines", name: "Fold Lines", expanded: false, order: 1 },
    { id: "microperfs", name: "Microperfs", expanded: false, order: 2 },
    { id: "safe-zones", name: "Safe Zones", expanded: false, order: 3 },
    { id: "gusset", name: "Gusset", expanded: false, order: 4 },
    { id: "die-cut-outs", name: "Die-Cut Outs", expanded: false, order: 5 },
    { id: "openings", name: "Openings", expanded: false, order: 6 },
    { id: "windows", name: "Windows", expanded: false, order: 7 },
    { id: "barcodes-bbes", name: "Barcodes / BBEs", expanded: false, order: 8 }
  ]
  const layers: Layer[] = [
    { id: "cutter-outline", name: "Cutter", groupId: "pack-base", visible: true, locked: false, order: 0, exportRole: "cut" },
    { id: "eyemarks", name: "Eyemark", groupId: "pack-base", visible: true, locked: false, order: 1, exportRole: "guide" },
    { id: "seal-areas", name: "Seals", groupId: "pack-base", visible: true, locked: false, order: 2, exportRole: "guide" },
    { id: "substrate", name: "Substrate", groupId: "pack-base", visible: true, locked: false, order: 3, exportRole: "guide" },
    { id: "fold-lines", name: "Fold Lines", groupId: "fold-lines", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "perf-lines", name: "Microperfs", groupId: "microperfs", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "safe-zones", name: "Safe Zones", groupId: "safe-zones", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "gusset-fold-line", name: "Centre Fold", groupId: "gusset", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "kseal-bottom-seals", name: "Bottom Seals", groupId: "gusset", visible: true, locked: false, order: 1, exportRole: "guide" },
    { id: "kseal-arms", name: "K Arms", groupId: "gusset", visible: true, locked: false, order: 2, exportRole: "guide" },
    { id: "gusset-side", name: "Side/Fin Seal", groupId: "gusset", visible: true, locked: false, order: 3, exportRole: "annotation" },
    { id: "gusset-bottom", name: "Gusset Shoulder", groupId: "gusset", visible: true, locked: false, order: 4, exportRole: "annotation" },
    { id: "hanger-slots", name: "Hanger Slots", groupId: "die-cut-outs", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "tear-notches", name: "Tear Notch", groupId: "die-cut-outs", visible: true, locked: false, order: 1, exportRole: "annotation" },
    { id: "zips", name: "Grip Seal (Zip)", groupId: "openings", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "grip-seals", name: "Grip Seal (Default)", groupId: "openings", visible: true, locked: false, order: 1, exportRole: "annotation" },
    { id: "windows", name: "Windows", groupId: "windows", visible: true, locked: false, order: 0, exportRole: "annotation" },
    { id: "clear-strip-window", name: "Clear Strip / Window", groupId: "windows", visible: true, locked: false, order: 1, exportRole: "guide" },
    { id: "notes", name: "Barcodes / BBEs", groupId: "barcodes-bbes", visible: true, locked: false, order: 0, exportRole: "annotation" }
  ]
  return new LayerManager(groups, layers)
}
