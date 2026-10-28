const DEFAULT_METRIC_DECIMALS = 2

export function formatMetricValue(
  value: number,
  maximumFractionDigits = DEFAULT_METRIC_DECIMALS
) {
  if (!Number.isFinite(value)) {
    return "0"
  }
  const precision = Math.max(0, Math.min(6, Math.round(maximumFractionDigits)))
  const normalized = Number(value.toFixed(precision))
  return Object.is(normalized, -0) ? "0" : normalized.toString()
}

export function formatMetricMeasurement(value: number, spaced = false) {
  return `${formatMetricValue(value)}${spaced ? " " : ""}mm`
}

export function parseMetricDraft(
  raw: string,
  bounds: { min?: number; max?: number } = {}
) {
  const value = raw.trim()
  if (!value) {
    return null
  }
  const parsed = Number(value)
  if (
    !Number.isFinite(parsed) ||
    (bounds.min !== undefined && parsed < bounds.min) ||
    (bounds.max !== undefined && parsed > bounds.max)
  ) {
    return null
  }
  return parsed
}
