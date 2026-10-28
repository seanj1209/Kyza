export type EyeMarkColor = "black" | "white" | "dark-blue"

export type EyeMarkPositionOne =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "centre"
  | "centre-left"
  | "centre-right"

export type EyeMarkPositionTwo = "top" | "bottom" | "centre"

export interface EyeMarkSpec {
  count: number
  position: EyeMarkPositionOne | EyeMarkPositionTwo
  width: number
  height: number
  width2?: number
  height2?: number
  color: EyeMarkColor
  offsetX?: number
  offsetY?: number
  offsetX2?: number
  offsetY2?: number
  manualPositioned?: boolean
  manualPositioned2?: boolean
  selectedIndex?: number
}
