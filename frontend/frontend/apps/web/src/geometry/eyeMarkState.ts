import type { EyeMarkSpec } from "../types/eyeMarks"

export const getEyeMarkSizeForIndex = (spec: EyeMarkSpec, index: number) =>
  index === 1
    ? {
        width: spec.width2 ?? spec.width,
        height: spec.height2 ?? spec.height
      }
    : {
        width: spec.width,
        height: spec.height
      }

export const getEyeMarkOffsetsForIndex = (spec: EyeMarkSpec, index: number) =>
  index === 1
    ? {
        offsetX: spec.offsetX2 ?? 0,
        offsetY: spec.offsetY2 ?? 0
      }
    : {
        offsetX: spec.offsetX ?? 0,
        offsetY: spec.offsetY ?? 0
      }

export const setEyeMarkOffsetsForIndex = (
  spec: EyeMarkSpec,
  index: number,
  offsetX: number,
  offsetY: number
): EyeMarkSpec =>
  index === 1
    ? {
        ...spec,
        offsetX2: offsetX,
        offsetY2: offsetY,
        manualPositioned2: true
      }
    : {
        ...spec,
        offsetX,
        offsetY,
        manualPositioned: true
      }

export const setEyeMarkSizeForIndex = (
  spec: EyeMarkSpec,
  index: number,
  width: number,
  height: number
): EyeMarkSpec =>
  index === 1
    ? {
        ...spec,
        width2: width,
        height2: height
      }
    : {
        ...spec,
        width,
        height
      }

export const clearEyeMarkOffsetsForIndex = (spec: EyeMarkSpec, index: number): EyeMarkSpec =>
  index === 1
    ? {
        ...spec,
        offsetX2: undefined,
        offsetY2: undefined,
        manualPositioned2: false
      }
    : {
        ...spec,
        offsetX: undefined,
        offsetY: undefined,
        manualPositioned: false
      }
