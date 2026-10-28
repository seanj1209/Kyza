import type {
  ConstraintProfileEntry,
  GeometryRegistryEntry,
  RuleRegistryEntry
} from "../core/registries"
import type { FlowwrapSpec } from "../types/flowwrap"

export type SandboxPackId =
  | "flowwrap"
  | "paper-strip"
  | "doy-pouch"
  | "pillow-pack"
  | "k-seal-pouch"
  | "plain-web"
  | "sachet-3-side-seal"
  | "sachet-4-side-seal"

export type SandboxGeometryId =
  | "flowwrap-layout"
  | "paper-strip-layout"
  | "doy-layout"
  | "pillow-layout"
  | "k-seal-layout"
  | "plain-web-layout"
  | "sachet-3-layout"
  | "sachet-4-layout"

export type SandboxProjectMode = "sealed" | "plainFilm"

export type SandboxFeatureId = "zipper" | "tearNotch" | "hangerSlot"

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T[K] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K]
}

export type CustomPackDefinition = Readonly<{
  id: string
  label: string
  basePackId: SandboxPackId
  geometryId: SandboxGeometryId
  mode: SandboxProjectMode
  constraintProfileId: string
  enabledRuleIds: readonly string[]
  enabledFeatures: readonly SandboxFeatureId[]
  specOverrides?: DeepPartial<FlowwrapSpec>
}>

export type SelectedSandboxRule = Readonly<{
  id: string
  requested: boolean
  supported: boolean
  rule: RuleRegistryEntry
}>

export type SandboxRuleSelection = Readonly<{
  availableRules: readonly RuleRegistryEntry[]
  selectedRules: readonly SelectedSandboxRule[]
  unsupportedRuleIds: readonly string[]
}>

export type SandboxBuildInput = Readonly<{
  definition: CustomPackDefinition
  baseSpec?: FlowwrapSpec
}>

export type SandboxComposedResult =
  | ReturnType<typeof import("../core/packComposer").composeFlowwrapPack>
  | ReturnType<typeof import("../core/packComposer").composePaperStripPack>
  | ReturnType<typeof import("../core/packComposer").composePillowPack>
  | ReturnType<typeof import("../core/packComposer").composeKSealPack>
  | ReturnType<typeof import("../core/packComposer").composePlainWebPack>
  | ReturnType<typeof import("../core/packComposer").composeSachetPack>

export type SandboxBuildResult = Readonly<{
  definition: CustomPackDefinition
  geometry: GeometryRegistryEntry
  constraintProfile: ConstraintProfileEntry
  resolvedSpec: FlowwrapSpec
  ruleSelection: SandboxRuleSelection
  composed: SandboxComposedResult
}>
