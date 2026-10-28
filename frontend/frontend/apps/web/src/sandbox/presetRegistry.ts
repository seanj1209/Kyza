import type {
  CustomPackDefinition,
  SandboxPackId
} from "./types"

export type SandboxPresetEntry = Readonly<{
  id: string
  label: string
  packId: SandboxPackId
  definition: Omit<CustomPackDefinition, "id" | "label" | "basePackId">
}>

export const SANDBOX_PRESET_REGISTRY: readonly SandboxPresetEntry[] = [
  {
    id: "flowwrap-sealed-basic",
    label: "Flowwrap Sealed",
    packId: "flowwrap",
    definition: {
      geometryId: "flowwrap-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: [],
      enabledFeatures: []
    }
  },
  {
    id: "flowwrap-plain-film",
    label: "Flowwrap Plain Film",
    packId: "flowwrap",
    definition: {
      geometryId: "flowwrap-layout",
      mode: "plainFilm",
      constraintProfileId: "default",
      enabledRuleIds: [],
      enabledFeatures: []
    }
  },
  {
    id: "paper-strip-sealed-basic",
    label: "Paper Strip Sealed",
    packId: "paper-strip",
    definition: {
      geometryId: "paper-strip-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: [],
      enabledFeatures: []
    }
  },
  {
    id: "doy-zipper",
    label: "DOY Grip Seal (Zip)",
    packId: "doy-pouch",
    definition: {
      geometryId: "doy-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: ["zipper"],
      enabledFeatures: ["zipper"]
    }
  },
  {
    id: "doy-tear-notch",
    label: "DOY Tear Notch",
    packId: "doy-pouch",
    definition: {
      geometryId: "doy-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: ["tear-notch"],
      enabledFeatures: ["tearNotch"]
    }
  },
  {
    id: "kseal-zipper-tear",
    label: "K-Seal Grip Seal (Zip) + Tear",
    packId: "k-seal-pouch",
    definition: {
      geometryId: "k-seal-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: ["zipper", "tear-notch"],
      enabledFeatures: ["zipper", "tearNotch"]
    }
  },
  {
    id: "pillow-hanger",
    label: "Pillow Hanger Slot",
    packId: "pillow-pack",
    definition: {
      geometryId: "pillow-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: ["hanger-slot"],
      enabledFeatures: ["hangerSlot"]
    }
  },
  {
    id: "plain-web-basic",
    label: "Plain Web Basic",
    packId: "plain-web",
    definition: {
      geometryId: "plain-web-layout",
      mode: "plainFilm",
      constraintProfileId: "default-clear",
      enabledRuleIds: [],
      enabledFeatures: []
    }
  },
  {
    id: "plain-web-slit-pair",
    label: "Plain Web Slit Pair",
    packId: "plain-web",
    definition: {
      geometryId: "plain-web-layout",
      mode: "plainFilm",
      constraintProfileId: "default-clear",
      enabledRuleIds: ["slit-line"],
      enabledFeatures: [],
      specOverrides: {
        plainWeb: {
          guideLines: [
            {
              id: "preset-slit-left",
              kind: "slit",
              orientation: "vertical",
              offset: 110
            },
            {
              id: "preset-slit-right",
              kind: "slit",
              orientation: "vertical",
              offset: 350
            }
          ]
        }
      }
    }
  },
  {
    id: "sachet4-tear",
    label: "4SS Tear Notch",
    packId: "sachet-4-side-seal",
    definition: {
      geometryId: "sachet-4-layout",
      mode: "sealed",
      constraintProfileId: "default",
      enabledRuleIds: ["tear-notch"],
      enabledFeatures: ["tearNotch"]
    }
  }
] as const

export function getSandboxPresets() {
  return SANDBOX_PRESET_REGISTRY
}

export function getSandboxPreset(id: string) {
  return SANDBOX_PRESET_REGISTRY.find(preset => preset.id === id)
}
