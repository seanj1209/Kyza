import {
  composeFlowwrapPack,
  composeKSealPack,
  composePaperStripPack,
  composePlainWebPack,
  composePillowPack,
  composeSachetPack
} from "../core/packComposer"
import { getGeometryRegistryEntry } from "../core/registries"
import { getPackModule } from "../packs"
import type { FlowwrapSpec } from "../types/flowwrap"
import { applyConstraintProfile } from "./constraintProfiles"
import {
  createCustomPackDefinition,
  validateCustomPackDefinition
} from "./customPackDefinition"
import {
  applySandboxFeatures,
  getRequiredRuleIdsForFeatures
} from "./featureRegistry"
import { selectSandboxRules } from "./ruleSelection"
import type {
  CustomPackDefinition,
  DeepPartial,
  SandboxBuildInput,
  SandboxBuildResult
} from "./types"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeDeep<T>(base: T, overrides?: DeepPartial<T>): T {
  if (overrides === undefined) {
    return base
  }
  if (Array.isArray(base) || Array.isArray(overrides)) {
    return (overrides as T) ?? base
  }
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return (overrides as T) ?? base
  }

  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(overrides)) {
    const overrideValue = overrides[key]
    if (overrideValue === undefined) {
      continue
    }
    const baseValue = result[key]
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? mergeDeep(baseValue, overrideValue)
        : Array.isArray(overrideValue)
          ? [...overrideValue]
          : overrideValue
  }
  return result as T
}

function resolveBaseSpec(definition: CustomPackDefinition, explicitBaseSpec?: FlowwrapSpec) {
  if (explicitBaseSpec) {
    return explicitBaseSpec
  }
  const pack = getPackModule(definition.basePackId)
  if (!pack) {
    throw new Error(`Unknown base pack "${definition.basePackId}".`)
  }
  return pack.getDefaults()
}

function applySandboxMode(
  spec: FlowwrapSpec,
  definition: CustomPackDefinition
): FlowwrapSpec {
  if (definition.mode !== "plainFilm") {
    return spec
  }

  return {
    ...spec,
    seal: 0,
    sealClearance: 0,
    seals: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  }
}

function composeByGeometry(geometryId: string, spec: FlowwrapSpec) {
  switch (geometryId) {
    case "flowwrap-layout":
    case "doy-layout":
      return composeFlowwrapPack(spec)
    case "paper-strip-layout":
      return composePaperStripPack(spec)
    case "pillow-layout":
      return composePillowPack(spec)
    case "k-seal-layout":
      return composeKSealPack(spec)
    case "plain-web-layout":
      return composePlainWebPack(spec)
    case "sachet-3-layout":
      return composeSachetPack("sachet-3-side-seal", spec)
    case "sachet-4-layout":
      return composeSachetPack("sachet-4-side-seal", spec)
    default:
      throw new Error(`Unsupported geometry selection "${geometryId}".`)
  }
}

export function buildCustomPack(
  input: SandboxBuildInput
): SandboxBuildResult {
  const definition = createCustomPackDefinition(input.definition)
  const definitionErrors = validateCustomPackDefinition(definition)
  if (definitionErrors.length > 0) {
    throw new Error(definitionErrors.join(" "))
  }

  const geometry = getGeometryRegistryEntry(definition.geometryId)
  if (!geometry) {
    throw new Error(`Unknown geometry selection "${definition.geometryId}".`)
  }

  const baseSpec = resolveBaseSpec(definition, input.baseSpec)
  const withProfile = applyConstraintProfile(
    baseSpec,
    definition.constraintProfileId
  )
  const resolvedSpec = applySandboxMode(
    mergeDeep(withProfile.spec, definition.specOverrides),
    definition
  )
  const featuredSpec = applySandboxFeatures(
    resolvedSpec,
    definition.basePackId,
    definition.enabledFeatures
  )
  const effectiveRuleIds = [
    ...new Set([
      ...definition.enabledRuleIds,
      ...getRequiredRuleIdsForFeatures(
        definition.basePackId,
        definition.enabledFeatures
      )
    ])
  ]
  const ruleSelection = selectSandboxRules(
    definition.basePackId,
    effectiveRuleIds
  )
  const composed = composeByGeometry(definition.geometryId, featuredSpec)

  return {
    definition,
    geometry,
    constraintProfile: withProfile.profile,
    resolvedSpec: featuredSpec,
    ruleSelection,
    composed
  }
}
