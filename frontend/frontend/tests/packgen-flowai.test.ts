import {
  extractPackGenEyemarkCount,
  extractPackGenSignals,
  generatePackGenRecommendations,
  interpretPackPrompt
} from "../packages/ai-engine"
import { getArtworkStudioAvailability } from "../apps/web/src/artwork/artworkHandoff"

declare const process: { exitCode?: number }

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const run = async () => {

const nuts = extractPackGenSignals("bag for nuts")
assert(nuts.productCategory === "nuts", "Nuts category should be detected.")
assert(nuts.packTypeHint === "bag", "Generic bag hint should be preserved.")

const saucePacket = extractPackGenSignals("20g Sauce Packet")
assert(saucePacket.productCategory === "sauce / condiment", "Sauce packet should map to sauce / condiment.")
assert(saucePacket.productFormat === "liquid or viscous food product", "Sauce should carry a liquid/viscous format signal.")
assert(saucePacket.productWeightG === 20, "Sauce packet weight should be detected.")
assert(saucePacket.packTypeHint === "sachet", "Packet should strongly indicate sachet intent.")
assert(saucePacket.sizeHint === "small", "A 20g packet should infer a small portion.")

const sauceSachet = extractPackGenSignals("sauce sachet 20g")
assert(sauceSachet.packTypeHint === "sachet", "Explicit sauce sachet should detect sachet intent.")

const ketchupSachet = extractPackGenSignals("ketchup sachet 10g")
assert(ketchupSachet.productCategory === "sauce / condiment", "Ketchup should map to sauce / condiment.")
assert(ketchupSachet.productWeightG === 10, "Ketchup sachet weight should be detected.")

const mayoPacket = extractPackGenSignals("single serve mayo packet")
assert(mayoPacket.packTypeHint === "sachet", "Single-serve mayo packet should detect sachet intent.")
assert(mayoPacket.sizeHint === "small", "Single-serve wording should infer a small portion.")

const powderSachet = extractPackGenSignals("powder sachet 30g")
assert(powderSachet.productCategory === "powder", "Powder category should be detected.")
assert(powderSachet.productFormat === "powder or dry product", "Powder format should be detected.")

const sampleSachet = extractPackGenSignals("sample sachet shampoo 8ml")
assert(sampleSachet.packTypeHint === "sachet", "Sample sachet should detect sachet intent.")
assert(sampleSachet.productVolumeMl === 8, "Sample volume should be captured without treating it as grams.")
assert(sampleSachet.productFormat === "liquid or viscous product", "Shampoo sample format should be detected.")

const brazilNuts = extractPackGenSignals("XL bag Brazil nuts 1kg")
assert(brazilNuts.productCategory === "nuts", "Brazil nuts should map to nuts.")
assert(brazilNuts.productWeightG === 1000, "1kg should normalize to 1000g.")
assert(brazilNuts.sizeHint === "xl", "XL size hint should be detected.")

const proteinBar = extractPackGenSignals("flow wrap protein bar 60g")
assert(proteinBar.packTypeHint === "flowwrap", "Flow wrap should map to flowwrap.")
assert(proteinBar.productCategory === "protein bar", "Protein bar category should be detected.")
assert(proteinBar.productWeightG === 60, "60g should be detected.")

const eyemarkCountCases: Array<[string, 0 | 1 | 2]> = [
  ["K Seal pouch with no eyemarks", 0],
  ["K Seal pouch without an eyemark", 0],
  ["K Seal pouch with one eyemark", 1],
  ["K Seal pouch with 1 eye-mark", 1],
  ["K Seal pouch with two eyemarks", 2],
  ["K Seal pouch with dual eye marks", 2],
  ["K Seal pouch, eyemark count: 2", 2],
]
eyemarkCountCases.forEach(([prompt, expected]) => {
  assert(extractPackGenEyemarkCount(prompt) === expected, `${prompt} must normalize to eyemark count ${expected}.`)
  assert(extractPackGenSignals(prompt).eyemarkCount === expected, `${prompt} must retain canonical count ${expected}.`)
})

const leftEyemarkIntent = extractPackGenSignals("flowwrap protein bar 60g, one eyemark on the left edge")
assert(leftEyemarkIntent.eyemarkPosition === "top-left", "Explicit left-edge eyemark intent should be extracted as top-left.")
const leftEyemarkRecommendation = generatePackGenRecommendations("flowwrap protein bar 60g, one eyemark on the left edge")
assert(leftEyemarkRecommendation.recommendations[0]?.eyemarks.suggestedSide === "top-left", "FlowAI recommendation should carry explicit left-side eyemark intent.")

const granola = extractPackGenSignals("doy pouch granola 500g")
assert(granola.packTypeHint === "doy-pouch", "DOY should map to the current DOY pack ID.")
assert(granola.productWeightG === 500, "Granola weight should be detected.")

const lidding = extractPackGenSignals("lidding film chicken tray")
assert(lidding.packTypeHint === "lidding-film", "Lidding hint should be detected without pretending tooling support exists.")
assert(lidding.productCategory === "chicken", "Chicken category should be detected.")

const saucePotLidding = extractPackGenSignals("lidding film for sauce pot")
assert(saucePotLidding.packTypeHint === "lidding-film", "Sauce-pot lidding should retain explicit lidding intent.")

const salad = extractPackGenSignals("pillow pack salad 350 x 220")
assert(salad.packTypeHint === "pillow-pack", "Pillow pack should be detected.")
assert(salad.requestedWidthMm === 350 && salad.requestedHeightMm === 220, "Dimension pairs should be parsed as mm.")

const labelledDimensionCases: Array<[string, string, number, number, number, number]> = [
  ["Create a K-Seal pouch with a finished width of 190 mm, finished height of 300 mm, 10 mm trim, 40 mm gusset and two eyemarks.", "k-seal-pouch", 190, 300, 190, 300],
  ["K Seal pouch, 190 mm wide × 300 mm high", "k-seal-pouch", 190, 300, 190, 300],
  ["K Seal pouch, 190 mm wide x 400 mm high", "k-seal-pouch", 190, 400, 190, 400],
  ["K Seal pouch, 250 mm wide by 350 mm high", "k-seal-pouch", 250, 350, 250, 350],
  ["510 mm wide × 280 mm high flowwrap pack", "flowwrap", 510, 280, 510, 280],
  ["510 mm wide x 350 mm high flowwrap pack", "flowwrap", 510, 350, 510, 350],
  ["400 mm wide by 220 mm high flowwrap pack", "flowwrap", 400, 220, 400, 220],
  ["510 mm wide × 310 mm high pillow-pack", "pillow-pack", 510, 310, 510, 310],
  ["420 mm wide x 250 mm high pillow pack", "pillow-pack", 420, 250, 420, 250],
]
labelledDimensionCases.forEach(([prompt, packType, enteredWidth, enteredHeight, pouchWidth, pouchHeight]) => {
  const signals = extractPackGenSignals(prompt)
  assert(signals.packTypeHint === packType, `${prompt} must resolve the intended pack type alias.`)
  assert(
    signals.requestedWidthMm === enteredWidth && signals.requestedHeightMm === enteredHeight,
    `${prompt} must preserve both labelled dimensions.`,
  )
  const recommendation = generatePackGenRecommendations(prompt).recommendations[0]
  assert(
    recommendation.widthMm === pouchWidth && recommendation.heightMm === pouchHeight,
    `${prompt} must apply only its pack-specific dimension semantics ahead of heuristic defaults.`,
  )
})

const requestedZip = extractPackGenSignals("Stand-up pouch with a reclosable zip")
assert(
  (requestedZip as typeof requestedZip & { zipRequested?: boolean }).zipRequested === true,
  "A reclosable zip request must be captured as a structured signal.",
)
const zipRecommendation = generatePackGenRecommendations("Stand-up pouch with a reclosable zip").recommendations[0]
assert(
  (zipRecommendation as typeof zipRecommendation & { zipEnabled?: boolean }).zipEnabled === true,
  "A zip-capable DOY recommendation must retain the requested zip state.",
)
const unsupportedZip = generatePackGenRecommendations("flowwrap pack with a reclosable zip").recommendations[0]
assert(
  unsupportedZip.warnings.some((warning) => /zip/i.test(warning)),
  "A zip request for an unsupported pack type must produce a grounded limitation.",
)

const plainWeb = extractPackGenSignals("plain web 420mm wide")
assert(plainWeb.packTypeHint === "plain-web", "Plain Web should be detected.")
assert(plainWeb.requestedWidthMm === 420, "Single explicit web width should be detected.")

const prawns = extractPackGenSignals("500g frozen prawns reverse print OPP/PE")
assert(prawns.productCategory === "fish", "Prawns should map to fish.")
assert(prawns.storageHint === "frozen", "Frozen storage hint should be detected.")
assert(prawns.printHint === "reverse print", "Reverse print should be detected.")
assert(prawns.substrateHint === "OPP/PE", "OPP/PE should be preserved as a substrate hint.")

const vague = generatePackGenRecommendations("bag for nuts")
assert(vague.ok, "A vague but usable prompt must not fail.")
assert(vague.recommendations.length >= 2, "Vague prompts should return alternatives.")
assert(vague.recommendations.every(item => item.confidence === "low"), "Vague recommendations should be low confidence.")
assert(vague.recommendations.some(item => item.questions.length > 0), "Missing details should produce questions.")

const rankedSaucePacket = generatePackGenRecommendations("20g Sauce Packet")
assert(rankedSaucePacket.ok, "A sauce packet prompt should succeed.")
assert(
  rankedSaucePacket.recommendations[0].packType === "sachet-3-side-seal",
  "A 20g sauce packet should rank the registered 3SS sachet first."
)
assert(
  rankedSaucePacket.recommendations.every(item => item.packType.startsWith("sachet-")),
  "Pillow, DOY and Plain Web must not be equal default recommendations for a sauce packet."
)
assert(
  rankedSaucePacket.recommendations[0].confidence === "high",
  "Combined packet, category and weight signals should produce high confidence."
)
assert(
  rankedSaucePacket.recommendations[0].widthMm === 70 &&
    rankedSaucePacket.recommendations[0].heightMm === 90,
  "A 20g sauce packet should use the cautious small-portion band, not 180 x 220mm."
)
assert(
  rankedSaucePacket.recommendations[0].suitability.score >
    rankedSaucePacket.recommendations[1].suitability.score,
  "Suitability ranking should provide a deterministic primary sachet."
)

const explicitSachet = generatePackGenRecommendations("sauce sachet 20g")
assert(explicitSachet.recommendations[0].packType.startsWith("sachet-"), "Explicit sachet should rank sachet first.")

const weightOnlyPortion = generatePackGenRecommendations("20g")
assert(
  weightOnlyPortion.recommendations[0].packType.startsWith("sachet-"),
  "A 10g, 20g or 30g weight signal should retain a sachet recommendation."
)

const acceptancePrompts: Array<[string, string]> = [
  ["small ketchup sachet", "sachet-"],
  ["flow wrap cake bar", "flowwrap"],
  ["doy pouch 500g", "doy-pouch"],
  ["lidded film for ready meal tray", "lidding-film"]
]
acceptancePrompts.forEach(([prompt, expectedPackType]) => {
  const recommendation = generatePackGenRecommendations(prompt).recommendations[0]
  assert(
    expectedPackType.endsWith("-")
      ? recommendation.packType.startsWith(expectedPackType)
      : recommendation.packType === expectedPackType,
    `'${prompt}' should rank ${expectedPackType} first.`
  )
})

const explicitPackAliasCases: Array<[string, "flowwrap" | "pillow-pack"]> = [
  ["Flow wrap cake bar", "flowwrap"],
  ["Flow-wrap cake bar", "flowwrap"],
  ["Flowwrap cake bar", "flowwrap"],
  ["Pillow pack cake bar", "pillow-pack"],
  ["Pillow-pack cake bar", "pillow-pack"],
]
explicitPackAliasCases.forEach(([prompt, expected]) => {
  const result = generatePackGenRecommendations(prompt)
  assert(result.extractedSignals.packTypeHint === expected, `${prompt} must canonicalize to ${expected}.`)
  assert(result.recommendations[0]?.packType === expected, `${prompt} must keep explicit pack intent ahead of generic ranking.`)
})

const exactKSealRequest = generatePackGenRecommendations(
  "K Seal pouch, 190 mm wide × 300 mm high, clear substrate, two eyemarks and a reclosable zip",
)
assert(exactKSealRequest.recommendations[0]?.eyemarks.count === 2, "The exact beta prompt must keep two eyemarks in the structured suggestion.")
assert(
  exactKSealRequest.extractedSignals.requestedWidthMm === 190
    && exactKSealRequest.extractedSignals.requestedHeightMm === 300,
  "K-Seal prompt extraction must retain the entered width and height tokens without consuming trim.",
)
assert(
  exactKSealRequest.recommendations[0]?.widthMm === 190
    && exactKSealRequest.recommendations[0]?.heightMm === 300,
  "K-Seal recommendation must retain entered 190 × 300mm finished pouch dimensions.",
)

const needsReview = generatePackGenRecommendations("food packaging")
assert(
  needsReview.recommendations[0].confidence === "needs_review",
  "An ambiguous prompt with no useful production signals should be marked Needs Review."
)

const powderRecommendation = generatePackGenRecommendations("powder sachet 30g")
assert(
  powderRecommendation.recommendations[0].widthMm === 70 &&
    powderRecommendation.recommendations[0].heightMm === 100,
  "Powder sachets should use their cautious portion band."
)

const liddingRecommendation = generatePackGenRecommendations("lidding film for sauce pot")
assert(liddingRecommendation.recommendations[0].packType === "lidding-film", "Explicit lidding should rank lidding first.")
assert(!liddingRecommendation.recommendations[0].available, "Unregistered lidding output must be clearly unavailable.")
assert(liddingRecommendation.recommendations[0].title.includes("Coming Soon"), "Unavailable output needs honest card wording.")
assert(liddingRecommendation.recommendations[1].fallback, "Plain Web should be marked as a fallback, not an equal option.")
assert(liddingRecommendation.recommendations[1].confidence === "low", "Fallback confidence must be low.")

const detailed = generatePackGenRecommendations("XL bag Brazil nuts 1kg")
assert(detailed.ok, "A detailed prompt should succeed.")
assert(detailed.recommendations[0].confidence !== "low", "Detailed prompts should produce higher confidence.")
assert(
  detailed.recommendations[0].widthMm > vague.recommendations[0].widthMm,
  "Weight and XL size should select a larger size band."
)

const flowwrap = generatePackGenRecommendations("flow wrap protein bar 60g")
assert(flowwrap.ok && flowwrap.recommendations.length === 1, "A precise pack hint should produce a focused recommendation.")
assert(flowwrap.recommendations[0].packType === "flowwrap", "Pack type hint should control the recommended pack type.")

const exact = generatePackGenRecommendations("pillow pack salad 350 x 220")
assert(exact.ok, "Explicit pillow prompt should succeed.")
assert(
  exact.recommendations[0].widthMm === 350 && exact.recommendations[0].heightMm === 220,
  "Explicit dimensions must override heuristic sizing."
)
assert(exact.recommendations[0].confidence === "high", "Exact dimensions and pack type should be high confidence.")

const noPackType = generatePackGenRecommendations("500g frozen prawns reverse print OPP/PE")
assert(noPackType.ok && noPackType.recommendations.length >= 2, "Missing pack type should return alternatives.")
assert(noPackType.recommendations[0].questions.some(question => question.includes("pouch")), "Missing pack type should produce a pack question.")
assert(noPackType.recommendations[0].assumptions.some(item => item.includes("estimated")), "Missing size should produce size assumptions.")

const impossible = generatePackGenRecommendations("pillow pack 0 x 220")
assert(!impossible.ok, "Impossible explicit dimensions must be rejected.")

const explicitSachetSize = generatePackGenRecommendations("20g sauce packet 65 x 85")
assert(
  explicitSachetSize.recommendations[0].widthMm === 65 && explicitSachetSize.recommendations[0].heightMm === 85,
  "Explicit sachet dimensions must override the portion-size heuristic."
)

assert(
  rankedSaucePacket.recommendations.every(item => item.available),
  "Both registered sachet recommendations should be buildable."
)
const missingCutterAvailability = getArtworkStudioAvailability({
  studioMode: true,
  hasCutterSpec: false,
  artboardStarted: true,
  packTypeSelected: true,
  packBuilderAvailable: true,
  routeAvailable: true
})
assert(
  !missingCutterAvailability.enabled && missingCutterAvailability.message.length > 0,
  "A disabled Artwork Studio CTA must explain its missing cutter context."
)

const adapter = await interpretPackPrompt({
  requestId: "packgen-vague-adapter",
  userPrompt: "bag"
})
assert(adapter.success, "The existing deterministic provider adapter must no longer reject vague prompts.")
assert((adapter.packGenResult?.recommendations.length ?? 0) >= 2, "Provider adapter should expose multiple recommendations.")

console.log("FlowAI Pack Gen free-text tests passed.")
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
