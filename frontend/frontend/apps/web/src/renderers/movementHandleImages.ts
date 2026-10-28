const SVG_NS = "http://www.w3.org/2000/svg"
const XLINK_NS = "http://www.w3.org/1999/xlink"

const ICON_PATHS = {
  move: "/Icons/UI%20Movement%20Icons/Move_ICON.png",
  resize: "/Icons/UI%20Movement%20Icons/Resize_ICON.png",
  rotate: "/Icons/UI%20Movement%20Icons/Rotate_ICON.png"
} as const

const HANDLE_SIZES_MM = {
  move: 4,
  resize: 3,
  rotate: 4
} as const

export const MOVE_ICON_OFFSET_MM = 3.2
export const ROTATE_ICON_OFFSET_MM = 3.2
export const RESIZE_CORNER_OFFSET_MM = 1.6
export const RESIZE_VERTICAL_OFFSET_MM = ROTATE_ICON_OFFSET_MM

export function getSquareResizeCorners(
  x: number,
  y: number,
  width: number,
  height: number
) {
  return [
    { key: "nw", x: x - RESIZE_CORNER_OFFSET_MM, y: y - RESIZE_VERTICAL_OFFSET_MM },
    { key: "ne", x: x + width + RESIZE_CORNER_OFFSET_MM, y: y - RESIZE_VERTICAL_OFFSET_MM },
    { key: "sw", x: x - RESIZE_CORNER_OFFSET_MM, y: y + height + RESIZE_VERTICAL_OFFSET_MM },
    { key: "se", x: x + width + RESIZE_CORNER_OFFSET_MM, y: y + height + RESIZE_VERTICAL_OFFSET_MM }
  ] as const
}

export function getMoveHandleCenter(
  x: number,
  y: number,
  width: number,
  height: number
) {
  return {
    x: x + width / 2,
    y: y + height + MOVE_ICON_OFFSET_MM
  }
}

export function getRotateHandleCenter(
  x: number,
  y: number,
  width: number
) {
  return {
    x: x + width / 2,
    y: y - ROTATE_ICON_OFFSET_MM
  }
}

export function createMovementHandleImage(
  kind: keyof typeof ICON_PATHS,
  centerX: number,
  centerY: number,
  sizeMm = HANDLE_SIZES_MM[kind]
) {
  const image = document.createElementNS(SVG_NS, "image")
  image.setAttribute("x", (centerX - sizeMm / 2).toString())
  image.setAttribute("y", (centerY - sizeMm / 2).toString())
  image.setAttribute("width", sizeMm.toString())
  image.setAttribute("height", sizeMm.toString())
  image.setAttribute("preserveAspectRatio", "xMidYMid meet")
  image.setAttribute("href", ICON_PATHS[kind])
  image.setAttributeNS(XLINK_NS, "xlink:href", ICON_PATHS[kind])
  return image
}
