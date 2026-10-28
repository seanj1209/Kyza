export const INTERNAL_BLEED_MM = 3

export function resolveBleedInset() {
  return INTERNAL_BLEED_MM
}

export function validateBleedInset(liveWidth: number, liveHeight: number) {
  const errors: string[] = []
  if (INTERNAL_BLEED_MM * 2 >= liveWidth || INTERNAL_BLEED_MM * 2 >= liveHeight) {
    errors.push("Internal bleed buffer is too large for the live area.")
  }
  return errors
}
