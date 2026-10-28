import type { FoldLineSpec } from "./foldLines"

type SachetConstructionOptions = {
  width: number
  height: number
  foldLinePrefix?: string
}

type SachetConstruction = {
  width: number
  height: number
  seals: {
    top: number
    bottom: number
    left: number
    right: number
  }
  foldLines: FoldLineSpec[]
}

export function buildSachetConstruction(
  options: SachetConstructionOptions
): SachetConstruction {
  const { width, height, foldLinePrefix } = options
  const seals = {
    top: 5,
    bottom: 5,
    left: 3,
    right: 3
  }
  const liveWidth = Math.max(0, width - seals.left - seals.right)
  const quarter = liveWidth / 4
  const foldLines = foldLinePrefix
    ? [
        {
          id: `${foldLinePrefix}-left`,
          orientation: "vertical" as const,
          offset: quarter
        },
        {
          id: `${foldLinePrefix}-right`,
          orientation: "vertical" as const,
          offset: quarter * 3
        }
      ]
    : []

  return {
    width,
    height,
    seals,
    foldLines
  }
}
