import {
  formatMetricMeasurement,
  formatMetricValue,
  parseMetricDraft
} from "../apps/web/src/core/formatMetric"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(formatMetricValue(10) === "10", "Whole metric values must not show trailing zeroes.")
assert(formatMetricValue(7.5) === "7.5", "Half-millimetre values must remain visible.")
assert(formatMetricValue(7.25) === "7.25", "Quarter-millimetre values must remain visible.")
assert(formatMetricValue(7.75) === "7.75", "Three-quarter values must remain visible.")
assert(formatMetricMeasurement(7.5) === "7.5mm", "Measurement labels must include mm.")
assert(formatMetricMeasurement(7.25, true) === "7.25 mm", "Tool readouts may retain a spaced unit.")
assert(parseMetricDraft("") === null, "A blank draft must remain uncommitted.")
assert(parseMetricDraft("7.") === 7, "A trailing decimal must parse on commit.")
assert(parseMetricDraft(".5") === 0.5, "A leading-dot decimal must parse on commit.")
assert(parseMetricDraft("0.") === 0, "A zero decimal draft must parse on commit.")
assert(parseMetricDraft("invalid") === null, "Non-numeric drafts must be rejected on commit.")
assert(parseMetricDraft("4", { min: 5 }) === null, "Committed bounds must preserve the last valid value.")

console.log("Metric formatting tests passed.")
