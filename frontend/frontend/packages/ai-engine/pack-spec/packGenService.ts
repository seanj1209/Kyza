import { getPackModule } from "../../../apps/web/src/packs"
import type { FlowwrapSpec } from "../../../apps/web/src/types/flowwrap"
import type {
  PackGenConfidence,
  PackGenExtractedSignals,
  PackGenHeuristicProfile,
  PackGenRecommendation,
  PackGenResult,
  PackTypeSuitability
} from "../types"

const MAX_EXPLICIT_DIMENSION_MM = 5000

const PRODUCT_MATCHES: Array<{ category: string; keywords: string[] }> = [
  { category: "protein bar", keywords: ["protein bar"] },
  {
    category: "sauce / condiment",
    keywords: ["liquid seasoning", "condiment", "ketchup", "mayo", "dressing", "sauce", "dip", "paste"]
  },
  { category: "personal care sample", keywords: ["shampoo", "conditioner", "cream", "lotion", "sample"] },
  { category: "nuts", keywords: ["brazil nuts", "nuts", "nut"] },
  { category: "granola", keywords: ["granola"] },
  { category: "coffee", keywords: ["coffee"] },
  { category: "salad", keywords: ["salad"] },
  { category: "chicken", keywords: ["chicken"] },
  { category: "fish", keywords: ["prawns", "prawn", "fish"] },
  { category: "meat", keywords: ["meat"] },
  { category: "bakery", keywords: ["bakery", "biscuit", "chocolate bar", "bread", "cake"] },
  { category: "powder", keywords: ["powder"] },
  { category: "liquids", keywords: ["liquid", "drink", "juice"] },
  { category: "pet food", keywords: ["pet treats", "pet food", "dog food", "cat food"] },
  { category: "snacks", keywords: ["mixed nuts", "peanuts", "snack", "crisps", "chips"] },
  { category: "frozen food", keywords: ["frozen vegetables", "vegetables", "frozen"] }
]

const PACK_TYPE_MATCHES: Array<{ hint: string; patterns: RegExp[] }> = [
  { hint: "flowwrap", patterns: [/\bflow[ -]?wrap\b/, /\bwrapper\b/] },
  { hint: "pillow-pack", patterns: [/\bpillow[ -]?pack\b/] },
  {
    hint: "doy-pouch",
    patterns: [
      /\bdoy\s*pack\b/,
      /\bdoy\b/,
      /\bstand[ -]?up pouch\b/,
      /\bpouch with (?:a )?zip\b/,
      /\bresealable pouch\b/,
      /\bpet food pouch\b/,
      /\brefill(?:able)? pouch\b/
    ]
  },
  { hint: "k-seal-pouch", patterns: [/\bk[ -]?seal\b/] },
  {
    hint: "lidding-film",
    patterns: [
      /\blidd(?:ed|ing)(?: film)?\b/,
      /\btray\s*seal\b/,
      /\bready meal\b/,
      /\bpeel film\b/,
      /\btop film\b/,
      /\btray\b/
    ]
  },
  { hint: "plain-web", patterns: [/\bplain\s*web\b/] },
  {
    hint: "sachet",
    patterns: [
      /\bsachet\b/,
      /\bpacket\b/,
      /\bsingle[ -]?serve\b/,
      /\bsingle[ -]?use\b/,
      /\bportion\b/,
      /\bwipe\b/,
      /\bpowder sample\b/,
      /\bliquid packet\b/,
      /\bportion\s+(?:pack|sachet)\b/,
      /\bsample\s+sachet\b/
    ]
  },
  { hint: "pouch", patterns: [/\bpouch\b/] },
  { hint: "bag", patterns: [/\bbag\b/] }
]

const TECHNICAL_KEYWORDS = [
  "opp",
  "pet",
  "pe",
  "cpp",
  "paper",
  "reverse print",
  "surface print",
  "clear window",
  "metallised",
  "recyclable",
  "frozen",
  "oven",
  "lidding",
  "multivac",
  "md",
  "td",
  "web width",
  "repeat length",
  "eyemark",
  "zip",
  "zipper"
]

const SACHET_PACKET_KEYWORDS = [
  "sachet",
  "packet",
  "sauce packet",
  "condiment packet",
  "single serve",
  "single-use",
  "single use",
  "portion",
  "wipe",
  "powder sample",
  "liquid packet",
  "portion pack",
  "portion sachet",
  "ketchup sachet",
  "mayo sachet",
  "dressing sachet",
  "sample sachet",
  "powder sachet"
]

export const PACK_GEN_HEURISTIC_PROFILES: PackGenHeuristicProfile[] = [
  {
    matchKeywords: ["sauce / condiment"],
    productCategory: "sauce / condiment",
    defaultPackTypes: ["sachet-3-side-seal", "sachet-4-side-seal"],
    sizeBands: [
      { weightMaxG: 15, suggestedWidthMm: 60, suggestedHeightMm: 70, confidence: "high" },
      { weightMinG: 15.01, weightMaxG: 30, suggestedWidthMm: 70, suggestedHeightMm: 90, confidence: "high" },
      { weightMinG: 30.01, weightMaxG: 50, suggestedWidthMm: 80, suggestedHeightMm: 110, confidence: "high" },
      { sizeHint: "small", suggestedWidthMm: 70, suggestedHeightMm: 90, confidence: "medium" },
      { suggestedWidthMm: 76, suggestedHeightMm: 100, confidence: "medium" }
    ],
    defaultSubstrateSuggestion: "Confirm food-contact and liquid/viscous barrier requirements with repro.",
    assumptions: [
      "Fill weight and product viscosity need confirmation.",
      "Machine/tooling constraints need confirmation.",
      "Seal width and tear-notch requirements need confirmation."
    ],
    questions: [
      "Is this a liquid, paste, powder or dry seasoning?",
      "Is it a single-serve sachet?",
      "Is a tear notch required?",
      "Is it 3-side-seal or 4-side-seal?",
      "What is the machine/tooling format?",
      "Is this reel-fed or pre-made?",
      "Does it need an eyemark?",
      "What is the required seal width?"
    ]
  },
  {
    matchKeywords: ["powder", "personal care sample"],
    productCategory: "portion sachet",
    defaultPackTypes: ["sachet-3-side-seal", "sachet-4-side-seal"],
    sizeBands: [
      { weightMaxG: 15, suggestedWidthMm: 60, suggestedHeightMm: 80, confidence: "high" },
      { weightMinG: 15.01, weightMaxG: 30, suggestedWidthMm: 70, suggestedHeightMm: 100, confidence: "high" },
      { weightMinG: 30.01, weightMaxG: 50, suggestedWidthMm: 80, suggestedHeightMm: 110, confidence: "high" },
      { sizeHint: "small", suggestedWidthMm: 60, suggestedHeightMm: 80, confidence: "medium" },
      { suggestedWidthMm: 76, suggestedHeightMm: 100, confidence: "medium" }
    ],
    defaultSubstrateSuggestion: "Confirm product compatibility and barrier requirements with repro.",
    assumptions: ["Product behaviour and machine/tooling constraints need confirmation."],
    questions: ["Is this a liquid, paste, powder or dry product?", "Is a tear notch required?"]
  },
  {
    matchKeywords: ["nuts", "snacks"],
    productCategory: "dry goods",
    defaultPackTypes: ["pillow-pack", "doy-pouch", "k-seal-pouch"],
    sizeBands: [
      { weightMaxG: 250, suggestedWidthMm: 180, suggestedHeightMm: 220, confidence: "medium" },
      { weightMinG: 251, weightMaxG: 750, suggestedWidthMm: 240, suggestedHeightMm: 300, confidence: "medium" },
      { weightMinG: 751, suggestedWidthMm: 320, suggestedHeightMm: 400, confidence: "high" },
      { sizeHint: "small", suggestedWidthMm: 180, suggestedHeightMm: 220, confidence: "low" },
      { sizeHint: "large", suggestedWidthMm: 300, suggestedHeightMm: 380, confidence: "medium" },
      { sizeHint: "xl", suggestedWidthMm: 360, suggestedHeightMm: 460, confidence: "medium" },
      { suggestedWidthMm: 240, suggestedHeightMm: 300, confidence: "low" }
    ],
    defaultSubstrateSuggestion: "Review clear, white, paper or metallised film with repro.",
    assumptions: ["Dimensions are a starting estimate for review, not a guaranteed production size."],
    questions: ["Is a hang hole required?"]
  },
  {
    matchKeywords: ["protein bar", "bakery"],
    productCategory: "bars and bakery",
    defaultPackTypes: ["flowwrap", "pillow-pack"],
    sizeBands: [
      { weightMaxG: 100, suggestedWidthMm: 160, suggestedHeightMm: 70, confidence: "high" },
      { weightMinG: 101, suggestedWidthMm: 220, suggestedHeightMm: 120, confidence: "medium" },
      { suggestedWidthMm: 180, suggestedHeightMm: 90, confidence: "low" }
    ],
    defaultSubstrateSuggestion: "Review a suitable flowwrap laminate with repro.",
    assumptions: ["The recommendation assumes a single product per repeat."],
    questions: []
  },
  {
    matchKeywords: ["granola", "coffee", "pet food"],
    productCategory: "pouched dry goods",
    defaultPackTypes: ["doy-pouch", "k-seal-pouch"],
    sizeBands: [
      { weightMaxG: 250, suggestedWidthMm: 360, suggestedHeightMm: 220, confidence: "medium" },
      { weightMinG: 251, weightMaxG: 750, suggestedWidthMm: 488, suggestedHeightMm: 260, confidence: "high" },
      { weightMinG: 751, suggestedWidthMm: 560, suggestedHeightMm: 340, confidence: "high" },
      { suggestedWidthMm: 488, suggestedHeightMm: 260, confidence: "low" }
    ],
    defaultSubstrateSuggestion: "Review barrier and closure requirements with repro.",
    assumptions: ["Pouch depth and closure requirements still need confirmation."],
    questions: ["Is a zipper or tear notch required?"]
  },
  {
    matchKeywords: ["salad", "fish", "chicken", "meat", "frozen food"],
    productCategory: "fresh or frozen food",
    defaultPackTypes: ["pillow-pack", "flowwrap"],
    sizeBands: [
      { weightMaxG: 500, suggestedWidthMm: 350, suggestedHeightMm: 220, confidence: "medium" },
      { weightMinG: 501, suggestedWidthMm: 440, suggestedHeightMm: 280, confidence: "medium" },
      { suggestedWidthMm: 350, suggestedHeightMm: 220, confidence: "low" }
    ],
    defaultSubstrateSuggestion: "Confirm food-contact, barrier and storage requirements with repro.",
    assumptions: ["Storage and sealing requirements require production confirmation."],
    questions: []
  },
  {
    matchKeywords: ["unknown dry goods"],
    productCategory: "unknown dry goods",
    defaultPackTypes: ["pillow-pack", "doy-pouch", "plain-web"],
    sizeBands: [
      { sizeHint: "small", suggestedWidthMm: 180, suggestedHeightMm: 220, confidence: "low" },
      { sizeHint: "large", suggestedWidthMm: 300, suggestedHeightMm: 380, confidence: "low" },
      { sizeHint: "xl", suggestedWidthMm: 360, suggestedHeightMm: 460, confidence: "medium" },
      { suggestedWidthMm: 240, suggestedHeightMm: 300, confidence: "low" }
    ],
    assumptions: ["Product, fill weight and machine constraints are not yet confirmed."],
    questions: []
  }
]

const includesPhrase = (value: string, phrase: string) =>
  phrase.length <= 3
    ? new RegExp(`\\b${phrase}\\b`, "i").test(value)
    : value.includes(phrase)

const EYEMARK_COUNT_WORDS: Readonly<Record<string, 0 | 1 | 2>> = {
  no: 0,
  none: 0,
  zero: 0,
  one: 1,
  single: 1,
  two: 2,
  double: 2,
  dual: 2,
  "0": 0,
  "1": 1,
  "2": 2,
}

export const extractPackGenEyemarkCount = (normalizedPrompt: string): 0 | 1 | 2 | undefined => {
  if (/\bwithout\s+(?:an?\s+)?eye[ -]?marks?\b/i.test(normalizedPrompt)) return 0
  const countMatch = normalizedPrompt.match(
    /\b(?:eye[ -]?mark\s+count\s*(?:of|is|=|:)?\s*)?(no|none|zero|one|single|two|double|dual|[012])\s*eye[ -]?marks?\b/i,
  ) ?? normalizedPrompt.match(
    /\beye[ -]?mark\s+count\s*(?:of|is|=|:)?\s*(no|none|zero|one|single|two|double|dual|[012])\b/i,
  )
  return countMatch ? EYEMARK_COUNT_WORDS[countMatch[1].toLowerCase()] : undefined
}

const parseDimensions = (normalized: string) => {
  const explicitWidth = normalized.match(
    /\b(?:finished\s+)?width\s*(?:(?:of|is)\s*|[=:]\s*)?(-?\d+(?:\.\d+)?)\s*(?:mm)?\b/i,
  )
  const explicitHeight = normalized.match(
    /\b(?:finished\s+)?height\s*(?:(?:of|is)\s*|[=:]\s*)?(-?\d+(?:\.\d+)?)\s*(?:mm)?\b/i,
  )
  const pair = normalized.match(/\b(?:w(?:idth)?\s*)?(-?\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:wide\s*)?(?:x|×|by|,|and)\s*(?:h(?:eight)?\s*)?(-?\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:high|tall)?\b/i)
  const labelled = normalized.match(/\bw\s*(-?\d+(?:\.\d+)?)\s*(?:mm)?\s+h\s*(-?\d+(?:\.\d+)?)\s*(?:mm)?\b/i)
  const widthOnly = normalized.match(/\b(-?\d+(?:\.\d+)?)\s*mm\s+wide\b/i)
  const webWidth = normalized.match(/\b(-?\d+(?:\.\d+)?)\s*(?:mm\s*)?web\s+width\b/i)
    ?? normalized.match(/\bweb\s+width\s*(-?\d+(?:\.\d+)?)\s*(?:mm)?\b/i)
  const depth = normalized.match(/\b(?:d|depth)\s*(-?\d+(?:\.\d+)?)\s*(?:mm)?\b/i)
  const dimensions = explicitWidth || explicitHeight ? labelled : pair ?? labelled
  return {
    width: explicitWidth
      ? Number(explicitWidth[1])
      : dimensions
        ? Number(dimensions[1])
        : widthOnly
          ? Number(widthOnly[1])
          : webWidth
            ? Number(webWidth[1])
            : undefined,
    height: explicitHeight
      ? Number(explicitHeight[1])
      : dimensions
        ? Number(dimensions[2])
        : undefined,
    depth: depth ? Number(depth[1]) : undefined
  }
}

export const extractPackGenSignals = (rawPrompt: string): PackGenExtractedSignals => {
  const normalized = rawPrompt.trim().toLowerCase().replace(/\s+/g, " ")
  const productMatch = PRODUCT_MATCHES.find(item =>
    item.keywords.some(keyword => normalized.includes(keyword))
  )
  const matchedProductName = productMatch?.keywords.find(keyword => normalized.includes(keyword))
  const packTypeMatch = PACK_TYPE_MATCHES.find(item =>
    item.patterns.some(pattern => pattern.test(normalized))
  )
  const weightMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(kg|g)\b/i)
  const volumeMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*ml\b/i)
  const productWeightG = weightMatch
    ? Number(weightMatch[1]) * (weightMatch[2].toLowerCase() === "kg" ? 1000 : 1)
    : undefined
  const productVolumeMl = volumeMatch ? Number(volumeMatch[1]) : undefined
  const dimensions = parseDimensions(normalized)
  const zipRequested = /\b(?:(?:reclosable|resealable)\s+)?(?:zip|zipper)\b/i.test(normalized)
  const eyemarkCount = extractPackGenEyemarkCount(normalized)
  const eyemarkSide = /(?:eye[ -]?marks?|registration marks?).{0,30}\b(left|right)\b|\b(left|right)\s+(?:side|edge).{0,30}(?:eye[ -]?marks?|registration marks?)/i.exec(normalized)?.[1]
    ?? /\b(left|right)\s+(?:side|edge)\b/i.exec(normalized)?.[1]
  const eyemarkVertical = /\b(top|bottom|middle|mid|centre|center)\b.{0,30}(?:eye[ -]?marks?|registration marks?)/i.exec(normalized)?.[1]
  const eyemarkPosition = eyemarkSide
    ? `${eyemarkVertical === "bottom" ? "bottom" : eyemarkVertical === "middle" || eyemarkVertical === "mid" || eyemarkVertical === "centre" || eyemarkVertical === "center" ? "centre" : "top"}-${eyemarkSide.toLowerCase()}` as PackGenExtractedSignals["eyemarkPosition"]
    : undefined
  const technical = TECHNICAL_KEYWORDS.filter(keyword => includesPhrase(normalized, keyword))
  const sachetKeywords = SACHET_PACKET_KEYWORDS.filter(keyword => normalized.includes(keyword))
  const inferredSmallPortion =
    packTypeMatch?.hint === "sachet" &&
    ((productWeightG !== undefined && productWeightG <= 50) ||
      (productVolumeMl !== undefined && productVolumeMl <= 50) ||
      /\b(?:single[ -]?serve|portion|sample)\b/.test(normalized))
  const sizeHint = /\b(?:xl|extra large)\b/.test(normalized)
    ? "xl"
    : /\b(?:large|big)\b/.test(normalized)
      ? "large"
      : /\bmedium\b/.test(normalized)
        ? "medium"
        : /\b(?:small|mini)\b/.test(normalized) || inferredSmallPortion
          ? "small"
          : undefined
  const productFormat =
    productMatch?.category === "sauce / condiment"
      ? "liquid or viscous food product"
      : productMatch?.category === "personal care sample"
        ? "liquid or viscous product"
        : productMatch?.category === "powder"
          ? "powder or dry product"
          : normalized.includes("frozen")
            ? "frozen product"
            : productMatch?.category === "protein bar" || productMatch?.category === "nuts"
              ? "solid or dry product"
              : undefined
  const substrateParts = ["opp", "pet", "pe", "cpp", "paper", "metallised", "recyclable"]
    .filter(keyword => includesPhrase(normalized, keyword))
    .map(keyword => keyword.toUpperCase())
  const printHint = normalized.includes("reverse print")
    ? "reverse print"
    : normalized.includes("surface print")
      ? "surface print"
      : normalized.includes("clear window")
        ? "clear window"
        : undefined
  const missingCriticalInfo: string[] = []
  if (!productMatch) missingCriticalInfo.push("product category")
  if (!weightMatch && !volumeMatch) missingCriticalInfo.push("fill weight or volume")
  if (!packTypeMatch || packTypeMatch.hint === "bag" || packTypeMatch.hint === "pouch") {
    missingCriticalInfo.push("exact pack type")
  }
  if (dimensions.width === undefined || dimensions.height === undefined) {
    missingCriticalInfo.push("finished or flat dimensions")
  }

  return {
    ...(productMatch ? { productCategory: productMatch.category, productName: matchedProductName } : {}),
    ...(productWeightG !== undefined ? { productWeightG } : {}),
    ...(productVolumeMl !== undefined ? { productVolumeMl } : {}),
    ...(productFormat ? { productFormat } : {}),
    ...(packTypeMatch ? { packTypeHint: packTypeMatch.hint } : {}),
    ...(sizeHint ? { sizeHint } : {}),
    ...(dimensions.width !== undefined ? { requestedWidthMm: dimensions.width } : {}),
    ...(dimensions.height !== undefined ? { requestedHeightMm: dimensions.height } : {}),
    ...(dimensions.depth !== undefined ? { requestedDepthMm: dimensions.depth } : {}),
    ...(substrateParts.length > 0 ? { substrateHint: substrateParts.join("/") } : {}),
    ...(normalized.includes("multivac") ? { machineHint: "Multivac" } : {}),
    ...(printHint ? { printHint } : {}),
    ...(normalized.includes("frozen") ? { storageHint: "frozen" } : normalized.includes("oven") ? { storageHint: "oven" } : {}),
    ...(zipRequested ? { zipRequested: true } : {}),
    ...(eyemarkCount === undefined ? {} : { eyemarkCount }),
    ...(eyemarkPosition ? { eyemarkPosition } : {}),
    detectedKeywords: [...new Set([
      ...(productMatch?.keywords.filter(keyword => normalized.includes(keyword)) ?? []),
      ...(packTypeMatch ? [packTypeMatch.hint] : []),
      ...sachetKeywords,
      ...technical,
      ...(sizeHint ? [sizeHint] : [])
    ])],
    missingCriticalInfo
  }
}

const getProfile = (signals: PackGenExtractedSignals) => {
  if (
    !signals.productCategory &&
    [10, 20, 30].includes(signals.productWeightG ?? -1)
  ) {
    return PACK_GEN_HEURISTIC_PROFILES.find(profile => profile.productCategory === "portion sachet")
      ?? PACK_GEN_HEURISTIC_PROFILES[PACK_GEN_HEURISTIC_PROFILES.length - 1]
  }
  const category = signals.productCategory ?? "unknown dry goods"
  return PACK_GEN_HEURISTIC_PROFILES.find(profile =>
    profile.matchKeywords.includes(category)
  ) ?? PACK_GEN_HEURISTIC_PROFILES[PACK_GEN_HEURISTIC_PROFILES.length - 1]
}

const getSizeBand = (profile: PackGenHeuristicProfile, signals: PackGenExtractedSignals) => {
  const portionAmount = signals.productWeightG ?? signals.productVolumeMl
  return profile.sizeBands.find(band =>
    portionAmount !== undefined &&
    (band.weightMinG === undefined || portionAmount >= band.weightMinG) &&
    (band.weightMaxG === undefined || portionAmount <= band.weightMaxG)
  ) ?? profile.sizeBands.find(band => band.sizeHint === signals.sizeHint) ?? profile.sizeBands[profile.sizeBands.length - 1]
}

const PACK_TYPE_CANDIDATES = [
  "sachet-3-side-seal",
  "sachet-4-side-seal",
  "flowwrap",
  "pillow-pack",
  "doy-pouch",
  "k-seal-pouch",
  "plain-web",
  "lidding-film"
] as const

export const scorePackTypeSuitability = (
  signals: PackGenExtractedSignals,
  rawPrompt: string
): PackTypeSuitability[] => {
  const scores = new Map<string, PackTypeSuitability>(
    PACK_TYPE_CANDIDATES.map(packType => [packType, { packType, score: 0, reasons: [], penalties: [] }])
  )
  const add = (packTypes: readonly string[], score: number, reason: string) => {
    packTypes.forEach(packType => {
      const item = scores.get(packType)
      if (!item) return
      item.score += score
      item.reasons.push(reason)
    })
  }
  const penalize = (packTypes: readonly string[], score: number, reason: string) => {
    packTypes.forEach(packType => {
      const item = scores.get(packType)
      if (!item) return
      item.score -= score
      item.penalties.push(reason)
    })
  }
  const sachets = ["sachet-3-side-seal", "sachet-4-side-seal"] as const
  const normalized = rawPrompt.toLowerCase()

  switch (signals.packTypeHint) {
    case "sachet":
      add(sachets, 85, "Explicit sachet, packet or portion-pack wording.")
      add(["sachet-3-side-seal"], 5, "Packet wording is a strong 3-side-seal starting route.")
      break
    case "flowwrap":
      add(["flowwrap"], 90, "Explicit flowwrap wording.")
      break
    case "pillow-pack":
      add(["pillow-pack"], 90, "Explicit pillow-pack wording.")
      break
    case "doy-pouch":
      add(["doy-pouch"], 90, "Explicit DOY or stand-up pouch wording.")
      break
    case "k-seal-pouch":
      add(["k-seal-pouch"], 90, "Explicit K-seal wording.")
      break
    case "plain-web":
      add(["plain-web"], 90, "Explicit plain-web wording.")
      break
    case "lidding-film":
      add(["lidding-film"], 95, "Explicit lidding-film or tray-seal wording.")
      add(["plain-web"], 25, "Plain Web is the nearest current non-tooling fallback.")
      break
    case "pouch":
      add(["doy-pouch", "k-seal-pouch"], 35, "Generic pouch wording.")
      add(["sachet-4-side-seal"], 15, "A small sealed pouch may use a sachet construction.")
      break
    case "bag":
      add(["pillow-pack"], 35, "Generic bag wording.")
      add(["doy-pouch", "k-seal-pouch"], 25, "A pouch-style bag remains plausible.")
      break
  }

  if (signals.productCategory === "sauce / condiment") {
    add(sachets, 55, "Sauce and condiment portions strongly suit sachet constructions.")
    penalize(["pillow-pack"], 25, "Pillow Pack is not a strong match for a small sauce portion.")
    penalize(["doy-pouch", "k-seal-pouch"], 20, "Large pouch formats are weak matches for a small sauce portion.")
  }
  if (signals.productCategory === "powder" || signals.productCategory === "personal care sample") {
    add(sachets, 45, "Small powder and sample portions commonly suit sachet constructions.")
  }
  if (signals.productCategory === "protein bar" || signals.productCategory === "bakery") {
    add(["flowwrap"], 50, "Bars and bakery products strongly suit flowwrap.")
    add(["pillow-pack"], 20, "Pillow Pack remains a possible wrapped-product route.")
  }
  if (signals.productCategory === "nuts" || signals.productCategory === "granola" || signals.productCategory === "snacks") {
    add(["pillow-pack", "doy-pouch", "k-seal-pouch"], 20, "Dry snack products support bag or pouch alternatives.")
  }
  if (signals.productCategory === "coffee" || signals.productCategory === "pet food") {
    add(["doy-pouch", "k-seal-pouch"], 45, "Coffee and pet-treat products strongly support pouch formats.")
  }
  if (["salad", "fish", "chicken", "meat", "frozen food"].includes(signals.productCategory ?? "")) {
    add(["pillow-pack", "flowwrap"], 30, "Fresh or frozen food may suit pillow or flowwrap formats.")
  }

  if (signals.productWeightG !== undefined && signals.productWeightG <= 50) {
    add(sachets, 30, "A fill weight of 50g or less strongly supports a portion sachet.")
    penalize(["doy-pouch", "k-seal-pouch"], 20, "The fill weight is unusually small for a large pouch route.")
    penalize(["pillow-pack"], 10, "The fill weight weakens the pillow-pack route.")
  }
  if ([10, 20, 30].includes(signals.productWeightG ?? -1)) {
    add(sachets, 15, "A 10g, 20g or 30g portion is a strong sachet-size signal.")
  }
  if (signals.sizeHint === "small") {
    add(sachets, 15, "Small or portion size intent supports sachet formats.")
  }
  if (signals.productFormat?.includes("liquid or viscous")) {
    add(sachets, 20, "Liquid or viscous portion products support sealed sachets.")
    penalize(["flowwrap"], 20, "Flowwrap is a weak fit for an uncontained liquid or paste.")
  }
  if (signals.productFormat?.includes("powder")) {
    add(sachets, 20, "Powder portions support sachet formats.")
  }

  const hasLiddingContainer = /\b(?:pot|cup|tray|container)\b/.test(normalized)
  if (hasLiddingContainer) {
    add(["lidding-film"], 30, "A pot, cup, tray or container supports a lidding-film route.")
  } else if (signals.packTypeHint !== "lidding-film") {
    penalize(["lidding-film"], 20, "No pot, cup, tray or container was detected.")
  }
  if (/\b(?:web|film|reel|tooling|repeat length|web width)\b/.test(normalized)) {
    add(["plain-web"], 35, "Web, film, reel or tooling wording supports Plain Web.")
  } else if (signals.packTypeHint !== "plain-web") {
    penalize(["plain-web"], 15, "No web, reel or tooling intent was detected.")
  }

  scores.forEach(item => {
    if (getPackModule(item.packType)) {
      item.score += 5
      item.reasons.push("Pack type is registered and buildable in Cutter Studio.")
    } else {
      item.score -= 5
      item.penalties.push("Pack type is not currently buildable in Cutter Studio.")
    }
  })

  return [...scores.values()].sort((left, right) => right.score - left.score)
}

const selectSuitabilities = (
  ranked: PackTypeSuitability[],
  signals: PackGenExtractedSignals,
  profile: PackGenHeuristicProfile
) => {
  if (signals.packTypeHint === "sachet") {
    const sachets = ranked.filter(item => item.packType.startsWith("sachet-")).slice(0, 2)
    if (sachets.some(item => Boolean(getPackModule(item.packType)))) {
      return sachets
    }
    const nearestBuildable = ranked.find(
      item => !item.packType.startsWith("sachet-") && Boolean(getPackModule(item.packType))
    )
    return nearestBuildable ? [...sachets, nearestBuildable] : sachets
  }
  if (signals.packTypeHint === "lidding-film") {
    return [
      ranked.find(item => item.packType === "lidding-film"),
      ranked.find(item => item.packType === "plain-web")
    ].filter((item): item is PackTypeSuitability => Boolean(item))
  }
  if (["flowwrap", "pillow-pack", "doy-pouch", "k-seal-pouch", "plain-web"].includes(signals.packTypeHint ?? "")) {
    return ranked.filter(item => item.packType === signals.packTypeHint).slice(0, 1)
  }
  if (signals.packTypeHint === "bag" || signals.packTypeHint === "pouch") {
    const preferred = new Set(
      signals.packTypeHint === "pouch"
        ? ["doy-pouch", "k-seal-pouch", "sachet-4-side-seal"]
        : profile.defaultPackTypes
    )
    return ranked.filter(item => preferred.has(item.packType)).slice(0, 3)
  }
  if ((ranked[0]?.score ?? 0) >= 40) {
    return ranked.slice(0, 2)
  }
  const preferred = new Set(profile.defaultPackTypes)
  return ranked.filter(item => preferred.has(item.packType)).slice(0, 3)
}

const confidenceFromSignals = (signals: PackGenExtractedSignals): PackGenConfidence => {
  if (
    !signals.productCategory &&
    !signals.packTypeHint &&
    signals.productWeightG === undefined &&
    signals.productVolumeMl === undefined &&
    signals.requestedWidthMm === undefined
  ) {
    return "needs_review"
  }
  let score = 0
  if (signals.productCategory) score += 1
  if (signals.productWeightG || signals.productVolumeMl) score += 2
  if (signals.packTypeHint && !["bag", "pouch"].includes(signals.packTypeHint)) score += 2
  if (signals.requestedWidthMm !== undefined && signals.requestedHeightMm !== undefined) score += 3
  if (signals.substrateHint || signals.printHint || signals.machineHint) score += 1
  return score >= 5 ? "high" : score >= 3 ? "medium" : "low"
}

const confidenceForSuitability = (
  signals: PackGenExtractedSignals,
  suitability: PackTypeSuitability,
  fallback: boolean
): PackGenConfidence => {
  if (fallback) return "low"
  const signalConfidence = confidenceFromSignals(signals)
  if (signalConfidence === "needs_review") return "needs_review"
  if (signalConfidence === "low") {
    const hasPrecisePackIntent = Boolean(
      signals.packTypeHint && !["bag", "pouch"].includes(signals.packTypeHint)
    )
    return hasPrecisePackIntent && suitability.score >= 60 ? "medium" : "low"
  }
  if (signalConfidence === "high" && suitability.score >= 60) return "high"
  if (suitability.score >= 40) return "high"
  if (suitability.score >= 60 || signalConfidence === "medium") return "medium"
  return "low"
}

const resolveConstruction = (packType: string) => {
  const defaults = getPackModule(packType)?.getDefaults() as FlowwrapSpec | undefined
  const seal = defaults?.seal ?? 0
  const eyeMarks = defaults?.eyeMarks
  const count = Math.max(0, Math.min(2, eyeMarks?.count ?? 0)) as 0 | 1 | 2
  return {
    sealsMm: {
      top: defaults?.seals?.top ?? seal,
      bottom: defaults?.seals?.bottom ?? seal,
      left: defaults?.seals?.left ?? seal,
      right: defaults?.seals?.right ?? seal
    },
    bleedMm: defaults?.bleed ?? 0,
    eyemarks: {
      count,
      widthMm: eyeMarks?.width ?? 0,
      heightMm: eyeMarks?.height ?? 0,
      ...(eyeMarks?.position ? { suggestedSide: eyeMarks.position } : {})
    }
  }
}

const packLabel = (packType: string) =>
  getPackModule(packType)?.name ??
  ({ "lidding-film": "Lidding Film" }[packType] ?? packType)

const normalizeRecommendationDimensions = (
  packType: string,
  signals: Pick<PackGenExtractedSignals, "requestedWidthMm" | "requestedHeightMm">,
  fallback: { suggestedWidthMm: number; suggestedHeightMm: number },
) => {
  const enteredPouchWidthMm = signals.requestedWidthMm
  const enteredPouchHeightMm = signals.requestedHeightMm
  return {
    widthMm: enteredPouchWidthMm ?? fallback.suggestedWidthMm,
    heightMm: enteredPouchHeightMm ?? fallback.suggestedHeightMm,
    widthWasEntered: enteredPouchWidthMm !== undefined,
    heightWasEntered: enteredPouchHeightMm !== undefined,
  }
}

export const generatePackGenRecommendations = (rawPrompt: string): PackGenResult => {
  const input = { rawPrompt }
  const extractedSignals = extractPackGenSignals(rawPrompt)
  if (!rawPrompt.trim()) {
    return { ok: false, input, extractedSignals, recommendations: [], errors: ["Enter a product or pack description."] }
  }
  const explicitDimensions = [
    extractedSignals.requestedWidthMm,
    extractedSignals.requestedHeightMm,
    extractedSignals.requestedDepthMm
  ].filter((value): value is number => value !== undefined)
  if (explicitDimensions.some(value => !Number.isFinite(value) || value <= 0 || value > MAX_EXPLICIT_DIMENSION_MM)) {
    return {
      ok: false,
      input,
      extractedSignals,
      recommendations: [],
      errors: [`Explicit dimensions must be greater than 0mm and no more than ${MAX_EXPLICIT_DIMENSION_MM}mm.`]
    }
  }

  const profile = getProfile(extractedSignals)
  const band = getSizeBand(profile, extractedSignals)
  const rankedSuitabilities = scorePackTypeSuitability(extractedSignals, rawPrompt)
  const selectedSuitabilities = selectSuitabilities(rankedSuitabilities, extractedSignals, profile)
  const questions = [
    ...(!extractedSignals.productWeightG && !extractedSignals.productVolumeMl ? ["What is the target fill weight or volume?"] : []),
    ...(!extractedSignals.packTypeHint || ["bag", "pouch"].includes(extractedSignals.packTypeHint)
      ? ["Should this be a shelf-ready pouch or a flowwrap-style bag?"]
      : []),
    ...(extractedSignals.requestedWidthMm === undefined || extractedSignals.requestedHeightMm === undefined
      ? ["What finished or flat dimensions are available?"]
      : []),
    ...(!extractedSignals.substrateHint
      ? ["Is the film clear, white, paper or metallised?"]
      : []),
    ...profile.questions
  ]

  const recommendations: PackGenRecommendation[] = selectedSuitabilities.map((suitability, index) => {
    const packType = suitability.packType
    const available = Boolean(getPackModule(packType))
    const strongestScore = rankedSuitabilities[0]?.score ?? suitability.score
    const fallback =
      (extractedSignals.packTypeHint === "lidding-film" && packType === "plain-web") ||
      suitability.score < strongestScore - 40
    const buildability = available
      ? fallback
        ? "fallback-buildable" as const
        : "buildable" as const
      : fallback
        ? "unsupported" as const
        : "recommended-not-buildable-yet" as const
    const confidence = confidenceForSuitability(extractedSignals, suitability, fallback)
    const {
      widthMm,
      heightMm,
      widthWasEntered,
      heightWasEntered,
    } = normalizeRecommendationDimensions(packType, extractedSignals, band)
    const construction = resolveConstruction(packType)
    const eyemarks = {
      ...construction.eyemarks,
      count: extractedSignals.eyemarkCount ?? construction.eyemarks.count,
      ...(extractedSignals.eyemarkPosition ? { suggestedSide: extractedSignals.eyemarkPosition } : {})
    }
    const moduleDefaults = getPackModule(packType)?.getDefaults() as FlowwrapSpec | undefined
    const zipSupported = Boolean(moduleDefaults?.doyPouch)
    const zipEnabled = zipSupported && extractedSignals.zipRequested ? true : undefined
    const constructionAssumptions = available
      ? [
          `Assumed pack defaults for seals: top ${construction.sealsMm.top}mm, bottom ${construction.sealsMm.bottom}mm, left ${construction.sealsMm.left}mm and right ${construction.sealsMm.right}mm.`,
          `Assumed ${construction.bleedMm}mm bleed from the registered pack defaults.`,
          ...(extractedSignals.eyemarkCount === undefined
            ? [`Assumed ${eyemarks.count} eyemark${eyemarks.count === 1 ? "" : "s"} from the registered pack defaults.`]
            : []),
          ...(extractedSignals.eyemarkPosition ? [`Prompt requested eyemark placement: ${extractedSignals.eyemarkPosition}; deterministic pack rules still gate unsafe placements.`] : []),
        ]
      : ["Tray aperture, seal flange and peel-tab requirements need confirmation before production setup."]
    const assumptions = [
      ...profile.assumptions,
      ...constructionAssumptions,
      ...(!extractedSignals.substrateHint ? ["Assumed flexible film until a substrate is provided."] : []),
      ...(!widthWasEntered ? [`Width is estimated at ${widthMm}mm.`] : []),
      ...(!heightWasEntered ? [`Height/repeat is estimated at ${heightMm}mm.`] : []),
      ...(extractedSignals.packTypeHint === "lidding-film" && packType === "plain-web"
        ? ["Plain Web is used only as a starting cutter model; lidding tooling setup is planned for v2."]
        : []),
      ...(!available ? [`${packLabel(packType)} is not yet buildable in Cutter Studio.`] : [])
    ]
    const productLabel = extractedSignals.productCategory ?? "this prompt"
    const title = !available
      ? `${packLabel(packType)} - Coming Soon`
      : fallback
        ? `${packLabel(packType)} fallback - not ideal for ${productLabel}`
        : packType.startsWith("sachet-") && extractedSignals.productCategory === "sauce / condiment"
          ? `${packLabel(packType)} / Sauce Packet starting spec`
          : `${packLabel(packType)} starting spec`
    return {
      id: `${packType}-${index + 1}`,
      title,
      packType,
      widthMm,
      heightMm,
      ...construction,
      eyemarks,
      ...(zipEnabled === undefined ? {} : { zipEnabled }),
      substrateSuggestion: extractedSignals.substrateHint
        ? `Prompt supplied: ${extractedSignals.substrateHint}`
        : profile.defaultSubstrateSuggestion,
      exportTierSuggestion: confidence === "low" || confidence === "needs_review"
        ? "pdf-proof"
        : "illustrator-ready",
      suitability,
      score: suitability.score,
      reasons: [...suitability.reasons],
      penalties: [...suitability.penalties],
      buildability,
      available,
      fallback,
      confidence,
      assumptions,
      warnings: [
        "Starting estimate only - validate against product, film, machine and tooling requirements.",
        ...(/micro.?perf|laser.*perf/i.test(input.rawPrompt) ? ["For laser perforation, please confirm lane spacing with your converter. Closely spaced lanes may need an additional pass; this depends on their equipment."] : []),
        ...(extractedSignals.packTypeHint === "lidding-film"
          ? ["GMG, Multivac and lidding tooling interpretation are not implemented in v1."]
          : []),
        ...(extractedSignals.zipRequested && !zipSupported
          ? [`${packLabel(packType)} does not support reclosable zip geometry in the current Cutter composer.`]
          : []),
        ...(!available ? ["This recommendation cannot be created in Cutter Studio yet."] : [])
      ],
      questions: [...new Set(questions)],
      extractedSignals,
      detectedSignals: extractedSignals
    }
  })

  return { ok: true, input, extractedSignals, recommendations, errors: [] }
}
