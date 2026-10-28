/** Pointer sizing changes in whole millimetres while preserving a typed decimal start. */
export function snapResizeFromOrigin(origin: number, candidate: number, step = 1): number {
  return origin + Math.round((candidate - origin) / step) * step
}
