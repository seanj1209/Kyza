export type PerfMode = "continuous" | "regulated"
export type PerfSealEdge = "top" | "bottom"
export type PerfStyle = "circles" | "x-markers" | "scope" | "crosshair"

export interface PerfLane {
  id?: string
  originX: number
  originY?: number
  style?: PerfStyle
  diameter?: number
  color?: string
  fillColor?: string
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
}

export interface PerfSpec {
  mode: PerfMode
  separation: number
  originX: number
  originY?: number
  lanes?: PerfLane[]
  count?: number
  sealEdge?: PerfSealEdge
  diameter: number
  style?: PerfStyle
  color?: string
  fillColor?: string
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
}
