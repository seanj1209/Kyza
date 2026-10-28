import type { PackGenBenchmarkCase } from "../../packages/ai-engine/types"

const SACHETS = ["sachet-3-side-seal", "sachet-4-side-seal"]
const POUCHES = ["doy-pouch", "k-seal-pouch"]

export const PACK_GEN_BENCHMARK_CASES: PackGenBenchmarkCase[] = [
  {
    prompt: "20g Sauce Packet",
    expectedTopPackTypes: SACHETS,
    acceptableFallbackPackTypes: [],
    rejectedTopPackTypes: ["pillow-pack", "doy-pouch", "plain-web"],
    expectedCategory: "sauce / condiment",
    expectedWeightG: 20,
    expectedSizeClass: "small",
    expectedConfidence: "high",
    expectedDimensionsMm: { width: 70, height: 90 },
    shouldBeBuildable: true
  },
  { prompt: "sauce sachet 20g", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedCategory: "sauce / condiment", expectedWeightG: 20, expectedConfidence: "high", shouldBeBuildable: true },
  { prompt: "ketchup sachet 10g", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedCategory: "sauce / condiment", expectedWeightG: 10, expectedSizeClass: "small", shouldBeBuildable: true },
  { prompt: "small ketchup sachet", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedCategory: "sauce / condiment", expectedSizeClass: "small", shouldBeBuildable: true },
  { prompt: "single serve mayo packet", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedCategory: "sauce / condiment", expectedSizeClass: "small", requiresQuestions: true, shouldBeBuildable: true },
  { prompt: "powder sachet 30g", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedCategory: "powder", expectedWeightG: 30, shouldBeBuildable: true },
  { prompt: "sample sachet shampoo 8ml", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedCategory: "personal care sample", expectedSizeClass: "small", shouldBeBuildable: true },
  { prompt: "20g", expectedTopPackTypes: SACHETS, acceptableFallbackPackTypes: [], expectedWeightG: 20, shouldBeBuildable: true },

  { prompt: "bag for nuts", expectedTopPackTypes: ["pillow-pack", ...POUCHES], acceptableFallbackPackTypes: ["plain-web"], expectedCategory: "nuts", expectedConfidence: "low", requiresMultipleOptions: true, requiresQuestions: true, shouldBeBuildable: true },
  { prompt: "XL bag Brazil nuts 1kg", expectedTopPackTypes: ["pillow-pack", ...POUCHES], acceptableFallbackPackTypes: [], expectedCategory: "nuts", expectedWeightG: 1000, expectedSizeClass: "xl", requiresMultipleOptions: true, shouldBeBuildable: true },
  { prompt: "250g salted peanuts", expectedTopPackTypes: ["pillow-pack", ...POUCHES], acceptableFallbackPackTypes: [], expectedCategory: "nuts", expectedWeightG: 250, requiresMultipleOptions: true, shouldBeBuildable: true },
  { prompt: "500g granola pouch", expectedTopPackTypes: POUCHES, acceptableFallbackPackTypes: ["sachet-4-side-seal"], expectedCategory: "granola", expectedWeightG: 500, shouldBeBuildable: true },
  { prompt: "snack bag mixed nuts 100g", expectedTopPackTypes: ["pillow-pack", ...POUCHES], acceptableFallbackPackTypes: [], expectedCategory: "nuts", expectedWeightG: 100, requiresMultipleOptions: true, shouldBeBuildable: true },

  { prompt: "flow wrap protein bar 60g", expectedTopPackTypes: ["flowwrap"], acceptableFallbackPackTypes: ["pillow-pack"], expectedCategory: "protein bar", expectedWeightG: 60, expectedConfidence: "high", shouldBeBuildable: true },
  { prompt: "chocolate bar flowwrap", expectedTopPackTypes: ["flowwrap"], acceptableFallbackPackTypes: ["pillow-pack"], expectedCategory: "bakery", shouldBeBuildable: true },
  { prompt: "bakery cake bar flow wrap", expectedTopPackTypes: ["flowwrap"], acceptableFallbackPackTypes: ["pillow-pack"], expectedCategory: "bakery", shouldBeBuildable: true },
  { prompt: "flow wrap cake bar", expectedTopPackTypes: ["flowwrap"], acceptableFallbackPackTypes: ["pillow-pack"], expectedCategory: "bakery", shouldBeBuildable: true },
  { prompt: "multipack biscuit flow wrap", expectedTopPackTypes: ["flowwrap"], acceptableFallbackPackTypes: ["pillow-pack"], expectedCategory: "bakery", shouldBeBuildable: true },

  { prompt: "pillow pack salad 350 x 220", expectedTopPackTypes: ["pillow-pack"], acceptableFallbackPackTypes: [], expectedCategory: "salad", expectedConfidence: "high", expectedDimensionsMm: { width: 350, height: 220 }, shouldBeBuildable: true },
  { prompt: "500g frozen prawns pillow pack", expectedTopPackTypes: ["pillow-pack"], acceptableFallbackPackTypes: ["flowwrap"], expectedCategory: "fish", expectedWeightG: 500, shouldBeBuildable: true },
  { prompt: "frozen vegetables bag 1kg", expectedTopPackTypes: ["pillow-pack"], acceptableFallbackPackTypes: ["flowwrap"], expectedCategory: "frozen food", expectedWeightG: 1000, requiresMultipleOptions: true, shouldBeBuildable: true },
  { prompt: "pillow bag chicken pieces", expectedTopPackTypes: ["pillow-pack"], acceptableFallbackPackTypes: ["flowwrap"], expectedCategory: "chicken", requiresMultipleOptions: true, shouldBeBuildable: true },

  { prompt: "stand up pouch granola 500g", expectedTopPackTypes: ["doy-pouch"], acceptableFallbackPackTypes: ["k-seal-pouch"], expectedCategory: "granola", expectedWeightG: 500, shouldBeBuildable: true },
  { prompt: "doy pouch pet treats 250g", expectedTopPackTypes: ["doy-pouch"], acceptableFallbackPackTypes: ["k-seal-pouch"], expectedCategory: "pet food", expectedWeightG: 250, shouldBeBuildable: true },
  { prompt: "doy pouch 500g", expectedTopPackTypes: ["doy-pouch"], acceptableFallbackPackTypes: ["k-seal-pouch"], expectedWeightG: 500, shouldBeBuildable: true },
  { prompt: "recyclable pouch for coffee 1kg", expectedTopPackTypes: POUCHES, acceptableFallbackPackTypes: ["sachet-4-side-seal"], expectedCategory: "coffee", expectedWeightG: 1000, shouldBeBuildable: true },
  { prompt: "k-seal pouch protein powder 1kg", expectedTopPackTypes: ["k-seal-pouch"], acceptableFallbackPackTypes: ["doy-pouch"], expectedCategory: "powder", expectedWeightG: 1000, shouldBeBuildable: true },

  { prompt: "lidding film for chicken tray", expectedTopPackTypes: ["lidding-film"], acceptableFallbackPackTypes: ["plain-web"], expectedCategory: "chicken", shouldBeBuildable: "depends-on-pack-support" },
  { prompt: "multivac tray lidding 300 x 220", expectedTopPackTypes: ["lidding-film"], acceptableFallbackPackTypes: ["plain-web"], expectedConfidence: "high", expectedDimensionsMm: { width: 300, height: 220 }, shouldBeBuildable: "depends-on-pack-support" },
  { prompt: "ready meal tray lidding film", expectedTopPackTypes: ["lidding-film"], acceptableFallbackPackTypes: ["plain-web"], shouldBeBuildable: "depends-on-pack-support" },
  { prompt: "lidded film for ready meal tray", expectedTopPackTypes: ["lidding-film"], acceptableFallbackPackTypes: ["plain-web"], shouldBeBuildable: "depends-on-pack-support" },
  { prompt: "sauce pot lidding film", expectedTopPackTypes: ["lidding-film"], acceptableFallbackPackTypes: ["plain-web"], expectedCategory: "sauce / condiment", shouldBeBuildable: "depends-on-pack-support" },

  { prompt: "plain web 420mm wide", expectedTopPackTypes: ["plain-web"], acceptableFallbackPackTypes: [], expectedDimensionsMm: { width: 420 }, shouldBeBuildable: true },
  { prompt: "printed film 520 web width", expectedTopPackTypes: ["plain-web"], acceptableFallbackPackTypes: [], expectedDimensionsMm: { width: 520 }, shouldBeBuildable: true },
  { prompt: "reel fed film 350mm wide", expectedTopPackTypes: ["plain-web"], acceptableFallbackPackTypes: [], expectedDimensionsMm: { width: 350 }, shouldBeBuildable: true },

  { prompt: "bag", expectedTopPackTypes: ["pillow-pack", "doy-pouch"], acceptableFallbackPackTypes: ["plain-web"], expectedConfidence: "low", requiresMultipleOptions: true, requiresQuestions: true, shouldBeBuildable: true },
  { prompt: "food packaging", expectedTopPackTypes: ["pillow-pack", "doy-pouch"], acceptableFallbackPackTypes: ["plain-web"], expectedConfidence: "needs_review", requiresMultipleOptions: true, requiresQuestions: true, shouldBeBuildable: true },
  { prompt: "small snack pack", expectedTopPackTypes: ["pillow-pack", ...POUCHES], acceptableFallbackPackTypes: [], expectedCategory: "snacks", expectedSizeClass: "small", expectedConfidence: "low", requiresMultipleOptions: true, requiresQuestions: true, shouldBeBuildable: true },
  { prompt: "large frozen bag", expectedTopPackTypes: ["pillow-pack"], acceptableFallbackPackTypes: ["flowwrap"], expectedCategory: "frozen food", expectedSizeClass: "large", requiresMultipleOptions: true, requiresQuestions: true, shouldBeBuildable: true }
]
