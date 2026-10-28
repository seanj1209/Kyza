import {
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createEmptyAttributeBoxPreset
} from "../apps/web/src/defaults"
import {
  createBaseSpecDefaults,
  createDoyPouchDefaults,
  createEyeMarkDefaults,
  createKSealDefaults
} from "../apps/web/src/core/model/parameterSchema"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function cloneSpec<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createBaseKSealFixture(): FlowwrapSpec {
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

export const VALID_KSEAL_FIXTURES: ReadonlyArray<{
  name: string
  spec: FlowwrapSpec
}> = [
  {
    name: "base-default",
    spec: createBaseKSealFixture()
  },
  {
    name: "offset-center-variant",
    spec: {
      ...createBaseKSealFixture(),
      kSealPouch: createKSealDefaults({
        centerOffsetX: 8,
        midSectionWidthRatio: 0.2,
        shoulderHeightRatio: 0.18,
        sideGuideOffset: 12
      })
    }
  },
  {
    name: "custom-apex-span",
    spec: {
      ...createBaseKSealFixture(),
      kSealPouch: createKSealDefaults({
        topApexY: 20,
        bottomApexY: 170,
        midSectionWidthRatio: 0.18
      })
    }
  }
]

export const INVALID_KSEAL_FIXTURES: ReadonlyArray<{
  name: string
  spec: FlowwrapSpec
  expectedError: string
}> = [
  {
    name: "negative-seal-width",
    spec: {
      ...createBaseKSealFixture(),
      kSealPouch: createKSealDefaults({
        sealWidth: -1
      })
    },
    expectedError: "K-seal seal width must be 0mm or greater."
  },
  {
    name: "mid-section-ratio-out-of-range",
    spec: {
      ...createBaseKSealFixture(),
      kSealPouch: createKSealDefaults({
        midSectionWidthRatio: 1.2
      })
    },
    expectedError: "K-seal mid section width ratio must be between 0 and 1."
  },
  {
    name: "apex-span-too-small",
    spec: {
      ...createBaseKSealFixture(),
      kSealPouch: createKSealDefaults({
        sealWidth: 12,
        topApexY: 40,
        bottomApexY: 55
      })
    },
    expectedError: "K-seal apex span must be at least"
  }
]

export function cloneValidKSealFixture(name: string) {
  const fixture = VALID_KSEAL_FIXTURES.find(candidate => candidate.name === name)
  if (!fixture) {
    throw new Error(`Unknown valid K-seal fixture: ${name}`)
  }
  return cloneSpec(fixture.spec)
}

export function cloneInvalidKSealFixture(name: string) {
  const fixture = INVALID_KSEAL_FIXTURES.find(candidate => candidate.name === name)
  if (!fixture) {
    throw new Error(`Unknown invalid K-seal fixture: ${name}`)
  }
  return cloneSpec(fixture.spec)
}
