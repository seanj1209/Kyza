export const BETA_PROMPTS = {
  kSeal: {
    prompt: "K Seal pouch, 190 mm wide × 300 mm high, clear substrate, two eyemarks and a reclosable zip",
    packLabel: "K Seal Pouch",
    packType: "k-seal-pouch",
    widthMm: 190,
    heightMm: 300,
    substrate: "clear",
    eyemarkCount: 2,
    zipEnabled: true,
  },
  sachet: {
    prompt: "Three-side seal sachet, 70 mm wide × 100 mm high, 5 mm seals and one eyemark",
    packLabel: "3-Side Seal Sachet",
    packType: "sachet-3-side-seal",
    widthMm: 70,
    heightMm: 100,
    sealMm: 5,
    eyemarkCount: 1,
  },
  flowwrap: {
    prompt: "Flow-wrap pack, 510 mm wide × 280 mm high",
    packLabel: "Flowwrap",
    packType: "flowwrap",
    widthMm: 510,
    heightMm: 280,
  },
  multipleSuggestions: {
    prompt: "I need packaging for a snack product",
    minimumCount: 2,
  },
} as const

export const uniqueProjectName = (label: string, workerIndex = 0) =>
  `E2E ${label} ${workerIndex}-${Date.now()}`
