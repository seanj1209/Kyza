import type {
  PackGenBuildability,
  PackGenRecommendation
} from "../../../../packages/ai-engine/types"

export type PackGenCardDetailSection = {
  id:
    | "why"
    | "alternatives"
    | "assumptions"
    | "missing-information"
    | "questions"
    | "technical"
    | "risks"
  label: string
  items: string[]
  defaultExpanded: false
}

const BUILDABILITY_LABELS: Record<PackGenBuildability, string> = {
  buildable: "Buildable",
  "recommended-not-buildable-yet": "Recommended / Not buildable yet",
  "fallback-buildable": "Fallback buildable",
  unsupported: "Unsupported"
}

const compactTechnicalDetails = (recommendation: PackGenRecommendation) => {
  const signals = recommendation.detectedSignals
  return [
    signals.productCategory ? `Category: ${signals.productCategory}` : "",
    signals.productFormat ? `Product format: ${signals.productFormat}` : "",
    signals.productWeightG !== undefined ? `Weight: ${signals.productWeightG}g` : "",
    signals.productVolumeMl !== undefined ? `Volume: ${signals.productVolumeMl}ml` : "",
    signals.sizeHint ? `Size class: ${signals.sizeHint}` : "",
    `Buildability: ${BUILDABILITY_LABELS[recommendation.buildability]}`,
    recommendation.fallback ? "Fallback status: yes" : "Fallback status: no",
    signals.detectedKeywords.length > 0
      ? `Extracted keywords: ${signals.detectedKeywords.join(", ")}`
      : ""
  ].filter(Boolean)
}

export const createPackGenCardViewModel = (
  recommendation: PackGenRecommendation,
  index: number,
  alternativePackTypes: string[] = []
) => {
  const whyItems = [
    ...recommendation.reasons,
    ...recommendation.penalties.map(item => `Penalty: ${item}`)
  ]
  const allDetailSections: PackGenCardDetailSection[] = [
    { id: "why", label: "Detailed ranking reason", items: whyItems, defaultExpanded: false },
    { id: "alternatives", label: "Alternative pack types", items: alternativePackTypes, defaultExpanded: false },
    { id: "assumptions", label: "Engineering assumptions", items: recommendation.assumptions, defaultExpanded: false },
    {
      id: "missing-information",
      label: "Missing information",
      items: recommendation.detectedSignals.missingCriticalInfo,
      defaultExpanded: false
    },
    { id: "questions", label: "Technical questions", items: recommendation.questions, defaultExpanded: false },
    { id: "technical", label: "Technical details", items: compactTechnicalDetails(recommendation), defaultExpanded: false },
    { id: "risks", label: "Manufacturing risks", items: recommendation.warnings, defaultExpanded: false }
  ]
  const detailSections = allDetailSections.filter(section => section.items.length > 0)
  const canOpenCutter = recommendation.buildability === "buildable"
    || recommendation.buildability === "fallback-buildable"
  const limitation = recommendation.warnings[0]
    ?? recommendation.detectedSignals.missingCriticalInfo[0]
    ?? (canOpenCutter ? undefined : "More specification detail is needed before Cutter creation.")

  return {
    id: recommendation.id,
    optionLabel: `Option ${index + 1}`,
    bestMatch: index === 0,
    confidenceLabel: `${recommendation.confidence === "needs_review"
      ? "Needs Review"
      : `${recommendation.confidence[0].toUpperCase()}${recommendation.confidence.slice(1)}`} Confidence`,
    mainReason: recommendation.reasons[0] ?? "A starting route based on the available prompt signals.",
    buildabilityLabel: BUILDABILITY_LABELS[recommendation.buildability],
    canCreate: true,
    canOpenBuilder: recommendation.available,
    canOpenCutter,
    cutterUnavailableReason: canOpenCutter ? undefined : limitation,
    summaryItems: [
      `${recommendation.widthMm} × ${recommendation.heightMm}mm`,
      `${recommendation.eyemarks.count} eyemark${recommendation.eyemarks.count === 1 ? "" : "s"}`,
    ],
    limitation,
    fallback: recommendation.buildability === "fallback-buildable",
    detailSections
  }
}
