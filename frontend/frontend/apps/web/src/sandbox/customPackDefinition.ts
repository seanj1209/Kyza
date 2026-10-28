import {
  getGeometryRegistryEntry
} from "../core/registries"
import { getSandboxConstraintProfile } from "./constraintProfileRegistry"
import { getFeatureRegistryEntry } from "./featureRegistry"
import type {
  CustomPackDefinition,
  SandboxFeatureId,
  SandboxProjectMode
} from "./types"

const SUPPORTED_PROJECT_MODES: readonly SandboxProjectMode[] = [
  "sealed",
  "plainFilm"
]

function supportsPlainFilmMode(definition: CustomPackDefinition) {
  return (
    definition.basePackId === "flowwrap" ||
    definition.basePackId === "doy-pouch" ||
    definition.basePackId === "pillow-pack" ||
    definition.basePackId === "plain-web"
  )
}

export function createCustomPackDefinition(
  definition: CustomPackDefinition
): CustomPackDefinition {
  const enabledFeatures = Array.from(
    new Set(definition.enabledFeatures ?? [])
  ) as SandboxFeatureId[]
  return {
    ...definition,
    mode:
      definition.mode && SUPPORTED_PROJECT_MODES.includes(definition.mode)
        ? definition.mode
        : "sealed",
    enabledRuleIds: [...definition.enabledRuleIds],
    enabledFeatures
  }
}

export function validateCustomPackDefinition(
  definition: CustomPackDefinition
) {
  const errors: string[] = []
  const geometry = getGeometryRegistryEntry(definition.geometryId)
  if (!geometry) {
    errors.push(`Unknown geometry selection "${definition.geometryId}".`)
  } else if (!geometry.packIds.includes(definition.basePackId)) {
    errors.push(
      `Geometry "${definition.geometryId}" is not compatible with base pack "${definition.basePackId}".`
    )
  }

  if (!getSandboxConstraintProfile(definition.constraintProfileId)) {
    errors.push(
      `Unknown constraint profile "${definition.constraintProfileId}".`
    )
  }

  if (!definition.id.trim()) {
    errors.push("Custom pack definition id is required.")
  }
  if (!definition.label.trim()) {
    errors.push("Custom pack definition label is required.")
  }

  definition.enabledFeatures.forEach(featureId => {
    const feature = getFeatureRegistryEntry(featureId)
    if (!feature) {
      errors.push(`Unknown custom feature "${featureId}".`)
      return
    }
    if (!feature.packIds.includes(definition.basePackId)) {
      errors.push(
        `Feature "${feature.label}" is not supported for base pack "${definition.basePackId}".`
      )
    }
  })

  if (!SUPPORTED_PROJECT_MODES.includes(definition.mode)) {
    errors.push(`Unknown custom project mode "${definition.mode}".`)
  } else if (
    definition.mode === "plainFilm" &&
    !supportsPlainFilmMode(definition)
  ) {
    errors.push(
      `Plain film mode is only supported for flowwrap, doy pouch, and pillow pack custom projects.`
    )
  }

  return errors
}
