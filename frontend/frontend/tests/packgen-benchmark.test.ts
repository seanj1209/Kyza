import { createPackGenCardViewModel } from "../apps/web/src/packGen/packGenCardModel"
import { generatePackGenRecommendations } from "../packages/ai-engine"
import type { PackGenBenchmarkCase } from "../packages/ai-engine/types"
import { PACK_GEN_BENCHMARK_CASES } from "./fixtures/packgen-benchmark-fixtures"

declare const process: { exitCode?: number }

const fail = (benchmark: PackGenBenchmarkCase, message: string): never => {
  throw new Error(`Prompt '${benchmark.prompt}' ${message}`)
}

const checkBenchmark = (benchmark: PackGenBenchmarkCase) => {
  const result = generatePackGenRecommendations(benchmark.prompt)
  if (!result.ok || result.recommendations.length === 0) {
    fail(benchmark, `expected recommendations, but failed: ${result.errors.join(" ")}`)
  }
  const top = result.recommendations[0]
  if (!benchmark.expectedTopPackTypes.includes(top.packType)) {
    fail(
      benchmark,
      `expected one of [${benchmark.expectedTopPackTypes.join(", ")}] first, but got '${top.packType}'.`
    )
  }
  if (benchmark.rejectedTopPackTypes?.includes(top.packType)) {
    fail(benchmark, `incorrectly ranked rejected pack '${top.packType}' first.`)
  }
  if (
    benchmark.expectedCategory !== undefined &&
    result.extractedSignals.productCategory !== benchmark.expectedCategory
  ) {
    fail(
      benchmark,
      `expected category '${benchmark.expectedCategory}', but detected '${result.extractedSignals.productCategory ?? "none"}'.`
    )
  }
  if (
    benchmark.expectedWeightG !== undefined &&
    result.extractedSignals.productWeightG !== benchmark.expectedWeightG
  ) {
    fail(
      benchmark,
      `expected ${benchmark.expectedWeightG}g, but detected ${result.extractedSignals.productWeightG ?? "no weight"}.`
    )
  }
  if (
    benchmark.expectedSizeClass !== undefined &&
    result.extractedSignals.sizeHint !== benchmark.expectedSizeClass
  ) {
    fail(
      benchmark,
      `expected size class '${benchmark.expectedSizeClass}', but detected '${result.extractedSignals.sizeHint ?? "none"}'.`
    )
  }
  if (
    benchmark.expectedConfidence !== undefined &&
    top.confidence !== benchmark.expectedConfidence
  ) {
    fail(
      benchmark,
      `expected ${benchmark.expectedConfidence} confidence, but got ${top.confidence}.`
    )
  }
  if (benchmark.expectedDimensionsMm) {
    if (top.widthMm !== benchmark.expectedDimensionsMm.width) {
      fail(
        benchmark,
        `expected width ${benchmark.expectedDimensionsMm.width}mm, but got ${top.widthMm}mm.`
      )
    }
    if (
      benchmark.expectedDimensionsMm.height !== undefined &&
      top.heightMm !== benchmark.expectedDimensionsMm.height
    ) {
      fail(
        benchmark,
        `expected height ${benchmark.expectedDimensionsMm.height}mm, but got ${top.heightMm}mm.`
      )
    }
  }
  if (benchmark.requiresMultipleOptions && result.recommendations.length < 2) {
    fail(benchmark, "expected multiple recommendation options, but got only one.")
  }
  if (benchmark.requiresQuestions && !result.recommendations.some(item => item.questions.length > 0)) {
    fail(benchmark, "expected questions for missing information, but none were returned.")
  }

  result.recommendations.slice(1).forEach(recommendation => {
    const accepted =
      benchmark.expectedTopPackTypes.includes(recommendation.packType) ||
      benchmark.acceptableFallbackPackTypes.includes(recommendation.packType)
    if (!accepted && recommendation.score >= top.score) {
      fail(
        benchmark,
        `ranked unexpected option '${recommendation.packType}' equal to or above the expected primary.`
      )
    }
  })

  if (benchmark.shouldBeBuildable === true) {
    if (top.buildability !== "buildable") {
      fail(benchmark, `expected a buildable primary, but state was '${top.buildability}'.`)
    }
    if (!top.available) fail(benchmark, "expected the recommendation to resolve to a registered deterministic builder.")
  }
  if (benchmark.shouldBeBuildable === "depends-on-pack-support" && !top.available) {
    if (top.buildability !== "recommended-not-buildable-yet") {
      fail(benchmark, `expected an honest not-buildable state, but got '${top.buildability}'.`)
    }
    if (!top.title.includes("Coming Soon")) {
      fail(benchmark, "expected unavailable recommendation wording to include 'Coming Soon'.")
    }
    const buildableFallback = result.recommendations.find(item => item.buildability === "fallback-buildable")
    if (buildableFallback && buildableFallback.confidence !== "low") {
      fail(benchmark, "expected a buildable fallback to use low confidence.")
    }
  }
}

const run = () => {
  PACK_GEN_BENCHMARK_CASES.forEach(checkBenchmark)

  const sauce = generatePackGenRecommendations("20g Sauce Packet")
  const buildableCard = createPackGenCardViewModel(
    sauce.recommendations[0],
    0,
    sauce.recommendations.slice(1).map(item => item.title)
  )
  if (!buildableCard.bestMatch || !buildableCard.canCreate) {
    throw new Error("Buildable top recommendation must be marked Best match and enable creation.")
  }
  if (!buildableCard.canOpenBuilder || !buildableCard.canOpenCutter) {
    throw new Error("A supported buildable suggestion must offer both Pack Spec Builder and direct Cutter routes.")
  }
  if (buildableCard.summaryItems.length !== 2) {
    throw new Error("Suggestion cards must keep their initial construction summary to dimensions and eyemarks.")
  }
  if (buildableCard.detailSections.some(section => section.defaultExpanded)) {
    throw new Error("Recommendation reasoning, questions and assumptions must be collapsed by default.")
  }
  if (!buildableCard.mainReason) {
    throw new Error("Condensed recommendation card must show a main reason by default.")
  }
  if (JSON.stringify(buildableCard).includes("Pack type score") || "scoreLabel" in buildableCard) {
    throw new Error("Flow Score details must not expose the existing ranking value as a future numeric Flow Score.")
  }
  for (const requiredSection of [
    "why",
    "alternatives",
    "assumptions",
    "missing-information",
    "questions",
    "technical",
    "risks"
  ]) {
    if (!buildableCard.detailSections.some(section => section.id === requiredSection)) {
      throw new Error(`Condensed recommendation card is missing '${requiredSection}' details.`)
    }
  }

  const emptyDetailsCard = createPackGenCardViewModel({
    ...sauce.recommendations[0],
    reasons: [],
    penalties: [],
    assumptions: [],
    warnings: [],
    questions: [],
    detectedSignals: {
      ...sauce.recommendations[0].detectedSignals,
      missingCriticalInfo: [],
    },
  }, 0)
  for (const emptySection of ["why", "alternatives", "assumptions", "missing-information", "questions", "risks"]) {
    if (emptyDetailsCard.detailSections.some(section => section.id === emptySection)) {
      throw new Error(`Flow Score must hide the empty '${emptySection}' section.`)
    }
  }

  const ambiguous = generatePackGenRecommendations("food packaging")
  const ambiguousCard = createPackGenCardViewModel(ambiguous.recommendations[0], 0)
  if (ambiguousCard.confidenceLabel !== "Needs Review Confidence") {
    throw new Error("Ambiguous recommendations must expose the Needs Review confidence label.")
  }

  const lidding = generatePackGenRecommendations("lidding film for sauce pot")
  const unsupportedCard = createPackGenCardViewModel(lidding.recommendations[0], 0)
  if (!unsupportedCard.canCreate || unsupportedCard.canOpenBuilder || unsupportedCard.canOpenCutter || !unsupportedCard.buildabilityLabel.includes("Not buildable")) {
    throw new Error("Unsupported primary must allow draft creation without claiming builder availability.")
  }
  const fallbackCard = createPackGenCardViewModel(lidding.recommendations[1], 1)
  if (!fallbackCard.canCreate || !fallbackCard.canOpenBuilder || !fallbackCard.canOpenCutter || !fallbackCard.fallback || fallbackCard.buildabilityLabel !== "Fallback buildable") {
    throw new Error("Buildable fallback must be selectable, creatable and clearly labelled as fallback.")
  }

  console.log(`Pack Gen benchmark passed ${PACK_GEN_BENCHMARK_CASES.length} prompt cases.`)
}

try {
  run()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
