import {
  createBarcodeAttributeBoxPreset,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createEmptyAttributeBoxPreset,
  createSachetBackAttributeBoxPreset,
  createStandardPouchAttributeBoxPreset
} from "../apps/web/src/defaults"
import {
  createBaseSpecDefaults,
  createDoyPouchDefaults,
  createEyeMarkDefaults,
  createKSealDefaults,
  createSachetDefaults,
  PARAMETER_DEFAULTS,
  PARAMETER_ENUMS
} from "../apps/web/src/core/model/parameterSchema"
import { buildSachetConstruction } from "../apps/web/src/geometry/sachetConstruction"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { liddingPack } from "../apps/web/src/packs/liddingPack"
import { updateLiddingSpec } from "../apps/web/src/constraints/lidding"

function cloneSpec<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export type LayoutFixtureDefinition = {
  packId: string
  name: string
  fixturePath: string
  spec: FlowwrapSpec
}

function createFlowwrapDefaults(): FlowwrapSpec {
  return {
    ...createBaseSpecDefaults({ sealClearance: 5 }),
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createStandardPouchAttributeBoxPreset(),
    eyeMarks: createEyeMarkDefaults({
      count: 2,
      position: PARAMETER_ENUMS.eyeMarkPositionDouble.default,
      width: 15,
      height: 5,
      width2: 15,
      height2: 5,
      offsetY: 7.5
    }),
    hangerSlots: createDefaultHangerSlots()
  }
}

function createDoyDefaults(): FlowwrapSpec {
  return {
    ...createBaseSpecDefaults({ width: 488, height: 135, seal: 10 }),
    seals: {
      left: 0,
      right: 0
    },
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createStandardPouchAttributeBoxPreset(),
    eyeMarks: createEyeMarkDefaults({ position: "centre" }),
    hangerSlots: createDefaultHangerSlots(),
    doyPouch: createDoyPouchDefaults({
      panelWidths: {
        left: 199,
        center: 70,
        right: 199
      },
      ovalWidth: PARAMETER_DEFAULTS.doy.ovalWidth,
      ovalOffsetX: PARAMETER_DEFAULTS.doy.ovalOffsetX,
      centerOffsetX: PARAMETER_DEFAULTS.doy.centerOffsetX
    })
  }
}

function createPaperStripDefaults(): FlowwrapSpec {
  const baseSpec: FlowwrapSpec = {
    ...createBaseSpecDefaults({
      width: 310,
      height: 260,
      seal: 10,
      bleed: 3,
      sealClearance: 5
    }),
    substrate: "paper",
    seals: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    },
    safeZones: [],
    attributeBoxes: createStandardPouchAttributeBoxPreset(),
    paperStrip: {
      paperColor: "#8B5A2B",
      stepping: {
        stepCount: 1,
        gap: 0
      }
    }
  }
  return baseSpec
}

function createPillowDefaults(): FlowwrapSpec {
  return {
    ...createBaseSpecDefaults({ width: 510, height: 235, seal: 10, sealClearance: 3 }),
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createStandardPouchAttributeBoxPreset(),
    eyeMarks: createEyeMarkDefaults(),
    hangerSlots: createDefaultHangerSlots(),
    foldLines: [
      { id: "pillow-fold-left", orientation: "vertical", offset: 490 / 4 },
      { id: "pillow-fold-right", orientation: "vertical", offset: (490 * 3) / 4 }
    ]
  }
}

function createKSealDefaultsSpec(): FlowwrapSpec {
  return {
    ...createBaseSpecDefaults(
      { width: 510, height: 190, seal: 7.5 },
      { includeBleed: false, includeSealClearance: false }
    ),
    seals: {
      top: 7.5,
      bottom: 7.5,
      left: 15,
      right: 15
    },
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createEmptyAttributeBoxPreset(),
    hangerSlots: createDefaultHangerSlots(),
    eyeMarks: createEyeMarkDefaults({ position: "centre", width: 15, height: 5 }),
    kSealPouch: createKSealDefaults({
      midSectionWidthRatio: 83 / 480,
      shoulderHeightRatio: 23 / 205
    }),
    doyPouch: createDoyPouchDefaults({
      panelWidths: {
        left: 160,
        center: 100,
        right: 160
      },
      gussetDepth: 35,
      showGusset: false,
      showCenterBox: false,
      showOval: false
    })
  }
}

function createSachet3Defaults(): FlowwrapSpec {
  const { width, height, seals, foldLines } = buildSachetConstruction({
    width: 76,
    height: 100,
    foldLinePrefix: "sachet-fold"
  })
  return {
    ...createBaseSpecDefaults({
      width,
      height,
      seal: 3,
      sealClearance: 2
    }),
    seals,
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createBarcodeAttributeBoxPreset(),
    eyeMarks: createEyeMarkDefaults({
      position: "top-left",
      width: 5,
      height: 5
    }),
    hangerSlots: createDefaultHangerSlots(),
    foldLines,
    sachet: createSachetDefaults()
  }
}

function createSachet4Defaults(): FlowwrapSpec {
  const { width, height, seals, foldLines } = buildSachetConstruction({
    width: 50,
    height: 100
  })
  return {
    ...createBaseSpecDefaults({
      width,
      height,
      seal: 3,
      sealClearance: 2
    }),
    seals,
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createSachetBackAttributeBoxPreset(),
    eyeMarks: createEyeMarkDefaults({
      position: "top-left",
      width: 5,
      height: 5
    }),
    hangerSlots: createDefaultHangerSlots(),
    foldLines,
    sachet: createSachetDefaults({
      trackWidth: 0,
      stepEnabled: true,
      stepCount: 2,
      stepPair: true,
      showOverallMeasure: true,
      showTrackMeasure: false,
      showLaneLabels: true,
      tearNotch: {
        enabled: false,
        style: "triangle",
        offsetX: 6,
        width: 6,
        depth: 3
      }
    })
  }
}

function createPlainWebDefaults(): FlowwrapSpec {
  return {
    ...createBaseSpecDefaults({ width: 460, height: 160, seal: 0, sealClearance: 0 }),
    seals: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    },
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: [],
    attributeBoxes: createEmptyAttributeBoxPreset(),
    hangerSlots: createDefaultHangerSlots(),
    plainWeb: {
      guideLines: []
    }
  }
}

const flowwrapBase = cloneSpec(createFlowwrapDefaults())
const flowwrapPerf = cloneSpec(createFlowwrapDefaults())
flowwrapPerf.perfs = {
  mode: "regulated",
  originX: 30,
  originY: 24,
  separation: 22,
  count: 4,
  diameter: 1.5,
  lanes: [
    { originX: 30, originY: 24, style: "circles" },
    { originX: 180, originY: 28, style: "scope", diameter: 2 }
  ]
}
const flowwrapFeatureRich = cloneSpec(createFlowwrapDefaults())
flowwrapFeatureRich.safeZones = [
  {
    id: "flow-safe-1",
    label: "Primary",
    x: 18,
    y: 15,
    width: 80,
    height: 30
  }
]
flowwrapFeatureRich.windows = [
  {
    id: "flow-window-1",
    shape: "rectangle",
    x: 120,
    y: 40,
    width: 60,
    height: 35
  }
]

const doyBase = cloneSpec(createDoyDefaults())
const doyZipperTear = cloneSpec(createDoyDefaults())
if (doyZipperTear.doyPouch) {
  doyZipperTear.doyPouch.showZipper = true
  doyZipperTear.doyPouch.showTearNotch = true
  doyZipperTear.doyPouch.zipper.offsetX = 16
  doyZipperTear.doyPouch.tearNotch.offsetX = 12
  doyZipperTear.doyPouch.tearNotch.offsetY = 8
}
const doyOffsetOval = cloneSpec(createDoyDefaults())
if (doyOffsetOval.doyPouch) {
  doyOffsetOval.doyPouch.showOval = true
  doyOffsetOval.doyPouch.ovalOffsetX = 10
  doyOffsetOval.doyPouch.centerOffsetX = -6
  doyOffsetOval.doyPouch.arcOffsetX = 4
}

const paperStripBase = cloneSpec(createPaperStripDefaults())

const pillowBase = cloneSpec(createPillowDefaults())
const pillowFeature = cloneSpec(createPillowDefaults())
pillowFeature.hangerSlots = [
  {
    id: "pillow-slot-1",
    type: "hanger-slot",
    subtype: "round-hole",
    diameter: 8,
    centerX: 255,
    centerY: 20,
    mirrored: true
  }
]
pillowFeature.safeZones = [
  {
    id: "pillow-safe-1",
    label: "Print",
    x: 24,
    y: 24,
    width: 120,
    height: 50
  }
]

const kSealBase = cloneSpec(createKSealDefaultsSpec())
const kSealGripTear = cloneSpec(createKSealDefaultsSpec())
if (kSealGripTear.doyPouch) {
  kSealGripTear.doyPouch.showGripSeal = true
  kSealGripTear.doyPouch.showTearNotch = true
  kSealGripTear.doyPouch.showZipper = false
  kSealGripTear.doyPouch.tearNotch.offsetX = 14
}
const kSealZipGrip = cloneSpec(createKSealDefaultsSpec())
if (kSealZipGrip.doyPouch) {
  kSealZipGrip.doyPouch.showGripSeal = true
  kSealZipGrip.doyPouch.showZipper = true
  kSealZipGrip.doyPouch.zipper.offsetX = 18
}

const sachet3Base = cloneSpec(createSachet3Defaults())
const sachet3Features = cloneSpec(createSachet3Defaults())
sachet3Features.halfMoonCutouts = [
  {
    id: "halfmoon-top",
    radius: 6,
    centerX: sachet3Features.width / 2,
    centerY: 0,
    alignedCutterEdgeId: "top"
  }
]
sachet3Features.safeZones = [
  {
    id: "sachet-safe-1",
    label: "Front",
    x: 8,
    y: 8,
    width: 32,
    height: 30
  }
]
const sachet3Window = cloneSpec(createSachet3Defaults())
sachet3Window.windows = [
  {
    id: "sachet-window-1",
    shape: "oval",
    x: 18,
    y: 22,
    width: 24,
    height: 16
  }
]

const sachet4Base = cloneSpec(createSachet4Defaults())
const sachet4Stepped = cloneSpec(createSachet4Defaults())
if (sachet4Stepped.sachet) {
  sachet4Stepped.sachet.stepCount = 4
  sachet4Stepped.sachet.stepPair = true
  sachet4Stepped.sachet.showTrackMeasure = true
}
const sachet4BackBoxes = cloneSpec(createSachet4Defaults())
sachet4BackBoxes.attributeBoxes?.forEach(box => {
  if (box.kind === "barcode" || box.kind === "qr" || box.kind === "bbe") {
    box.enabled = true
    box.laneSide = "B"
  }
})

const plainWebBase = cloneSpec(createPlainWebDefaults())
const plainWebSlitPair = cloneSpec(createPlainWebDefaults())
plainWebSlitPair.plainWeb = {
  guideLines: [
    {
      id: "slit-left",
      kind: "slit",
      orientation: "vertical",
      offset: 110
    },
    {
      id: "slit-right",
      kind: "slit",
      orientation: "vertical",
      offset: 350
    }
  ]
}

export const LAYOUT_FIXTURES: LayoutFixtureDefinition[] = [
  {
    packId: "lidding", name: "square-default",
    fixturePath: "layout-fixtures/lidding/square-default.json",
    spec: liddingPack.getDefaults(),
  },
  {
    packId: "lidding", name: "round-stepped",
    fixturePath: "layout-fixtures/lidding/round-stepped.json",
    spec: updateLiddingSpec(liddingPack.getDefaults(), { style: "round", outerCutWidth: 395, across: 2, around: 2 }),
  },
  {
    packId: "lidding", name: "plain",
    fixturePath: "layout-fixtures/lidding/plain.json",
    spec: updateLiddingSpec(liddingPack.getDefaults(), { style: "plain", pullTab: false }),
  },
  {
    packId: "flowwrap",
    name: "base-default",
    fixturePath: "layout-fixtures/flowwrap/base-default.json",
    spec: flowwrapBase
  },
  {
    packId: "flowwrap",
    name: "regulated-perfs",
    fixturePath: "layout-fixtures/flowwrap/regulated-perfs.json",
    spec: flowwrapPerf
  },
  {
    packId: "flowwrap",
    name: "feature-rich",
    fixturePath: "layout-fixtures/flowwrap/feature-rich.json",
    spec: flowwrapFeatureRich
  },
  {
    packId: "doy-pouch",
    name: "base-default",
    fixturePath: "layout-fixtures/doy/base-default.json",
    spec: doyBase
  },
  {
    packId: "doy-pouch",
    name: "zipper-tear",
    fixturePath: "layout-fixtures/doy/zipper-tear.json",
    spec: doyZipperTear
  },
  {
    packId: "doy-pouch",
    name: "offset-oval",
    fixturePath: "layout-fixtures/doy/offset-oval.json",
    spec: doyOffsetOval
  },
  {
    packId: "paper-strip",
    name: "base-default",
    fixturePath: "layout-fixtures/paper-strip/base-default.json",
    spec: paperStripBase
  },
  {
    packId: "pillow-pack",
    name: "base-default",
    fixturePath: "layout-fixtures/pillow/base-default.json",
    spec: pillowBase
  },
  {
    packId: "pillow-pack",
    name: "feature-layout",
    fixturePath: "layout-fixtures/pillow/feature-layout.json",
    spec: pillowFeature
  },
  {
    packId: "k-seal-pouch",
    name: "base-default",
    fixturePath: "layout-fixtures/k-seal/base-default.json",
    spec: kSealBase
  },
  {
    packId: "k-seal-pouch",
    name: "grip-tear",
    fixturePath: "layout-fixtures/k-seal/grip-tear.json",
    spec: kSealGripTear
  },
  {
    packId: "k-seal-pouch",
    name: "zipper-grip-warning",
    fixturePath: "layout-fixtures/k-seal/zipper-grip-warning.json",
    spec: kSealZipGrip
  },
  {
    packId: "plain-web",
    name: "base-default",
    fixturePath: "layout-fixtures/plain-web/base-default.json",
    spec: plainWebBase
  },
  {
    packId: "plain-web",
    name: "slit-pair",
    fixturePath: "layout-fixtures/plain-web/slit-pair.json",
    spec: plainWebSlitPair
  },
  {
    packId: "sachet-3-side-seal",
    name: "base-default",
    fixturePath: "layout-fixtures/sachet3ss/base-default.json",
    spec: sachet3Base
  },
  {
    packId: "sachet-3-side-seal",
    name: "halfmoon-safezone",
    fixturePath: "layout-fixtures/sachet3ss/halfmoon-safezone.json",
    spec: sachet3Features
  },
  {
    packId: "sachet-3-side-seal",
    name: "window-layout",
    fixturePath: "layout-fixtures/sachet3ss/window-layout.json",
    spec: sachet3Window
  },
  {
    packId: "sachet-4-side-seal",
    name: "base-default",
    fixturePath: "layout-fixtures/sachet4ss/base-default.json",
    spec: sachet4Base
  },
  {
    packId: "sachet-4-side-seal",
    name: "stepped-paired",
    fixturePath: "layout-fixtures/sachet4ss/stepped-paired.json",
    spec: sachet4Stepped
  },
  {
    packId: "sachet-4-side-seal",
    name: "back-boxes-b-side",
    fixturePath: "layout-fixtures/sachet4ss/back-boxes-b-side.json",
    spec: sachet4BackBoxes
  }
]
