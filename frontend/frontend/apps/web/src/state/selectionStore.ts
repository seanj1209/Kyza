export type CutterElementType =
  | "cutterLine"
  | "seal"
  | "eyeMark"
  | "substrate"
  | "tearNotch"
  | "barcodeBox"
  | "perforation"
  | "safeZone"
  | "window"
  | "foldLine"
  | "hangerSlot"
  | "halfMoon"

export type CutterElementBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type CutterElementConstraints = {
  minWidth?: number
  minHeight?: number
  preserveAspectRatio?: boolean
  orientation?: "horizontal" | "vertical"
}

export type CutterElement = {
  id: string
  type: CutterElementType
  packType?: string
  layer: string
  bounds?: CutterElementBounds
  rotation?: number
  selectable: boolean
  movable: boolean
  resizable: boolean
  rotatable: boolean
  removable: boolean
  locked?: boolean
  constraints?: CutterElementConstraints
  metadata?: Record<string, string | number | boolean>
}

type SelectionState = {
  selectionMode: boolean
  selectedElementIds: string[]
}

type Listener = (state: SelectionState) => void

const initialState: SelectionState = {
  selectionMode: false,
  selectedElementIds: []
}

export class SelectionStore {
  private state: SelectionState = { ...initialState }
  private listeners = new Set<Listener>()
  private elements = new Map<string, CutterElement>()

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState() {
    return {
      selectionMode: this.state.selectionMode,
      selectedElementIds: [...this.state.selectedElementIds]
    }
  }

  setSelectionMode(enabled: boolean) {
    if (this.state.selectionMode === enabled) {
      return
    }
    this.state = {
      ...this.state,
      selectionMode: enabled
    }
    if (!enabled) {
      this.clearSelection()
      return
    }
    this.emit()
  }

  setSelectedElementIds(ids: string[]) {
    const unique = Array.from(new Set(ids))
    if (
      unique.length === this.state.selectedElementIds.length &&
      unique.every((id, index) => id === this.state.selectedElementIds[index])
    ) {
      return
    }
    this.state = {
      ...this.state,
      selectedElementIds: unique
    }
    this.emit()
  }

  registerElements(elements: CutterElement[]) {
    this.elements = new Map(elements.map(element => [element.id, element]))
    const filtered = this.state.selectedElementIds.filter(id => {
      const element = this.elements.get(id)
      return Boolean(element?.selectable) && !element?.locked
    })
    if (filtered.length !== this.state.selectedElementIds.length) {
      this.state = {
        ...this.state,
        selectedElementIds: filtered
      }
      this.emit()
    }
  }

  selectElement(id: string, multi = false) {
    const element = this.elements.get(id)
    if (!element || !element.selectable || element.locked) {
      return
    }
    if (!multi) {
      this.setSelectedElementIds([id])
      return
    }
    if (this.state.selectedElementIds.includes(id)) {
      return
    }
    this.setSelectedElementIds([...this.state.selectedElementIds, id])
  }

  deselectElement(id: string) {
    this.setSelectedElementIds(this.state.selectedElementIds.filter(item => item !== id))
  }

  toggleSelection(id: string, multi = false) {
    if (!multi) {
      this.selectElement(id, false)
      return
    }
    if (this.state.selectedElementIds.includes(id)) {
      this.deselectElement(id)
      return
    }
    this.selectElement(id, true)
  }

  clearSelection() {
    if (this.state.selectedElementIds.length === 0) {
      if (!this.state.selectionMode) {
        this.emit()
      }
      return
    }
    this.state = {
      ...this.state,
      selectedElementIds: []
    }
    this.emit()
  }

  getSelectedElements() {
    return this.state.selectedElementIds
      .map(id => this.elements.get(id))
      .filter((element): element is CutterElement => Boolean(element))
  }

  getElement(id: string) {
    return this.elements.get(id)
  }

  canSelect(id: string) {
    const element = this.elements.get(id)
    return Boolean(element?.selectable) && !element?.locked
  }

  private emit() {
    const snapshot = this.getState()
    this.listeners.forEach(listener => listener(snapshot))
  }
}

export const selectionStore = new SelectionStore()

export const getSelectedElements = () => selectionStore.getSelectedElements()
