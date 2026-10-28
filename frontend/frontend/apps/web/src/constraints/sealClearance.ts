export function getSealClearanceBounds(
  liveWidth: number,
  liveHeight: number,
  sealClearance: number,
  zoneWidth: number,
  zoneHeight: number
) {
  const minX = sealClearance
  const minY = sealClearance
  const maxX = liveWidth - sealClearance - zoneWidth
  const maxY = liveHeight - sealClearance - zoneHeight

  return { minX, minY, maxX, maxY }
}
