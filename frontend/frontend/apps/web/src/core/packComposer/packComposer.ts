import type {
  PackComposerContext,
  PackComposerInput,
  PackCompositionResult,
  PackRuleEngine,
  PackRuleResult
} from "./types"
import {
  DEFAULT_RULE_SET_VERSION,
  getRuleSet
} from "../rulesets"

export function applyIdentityRules<TSpec, TGeometry>(
  context: PackComposerContext<TSpec, TGeometry>
): PackRuleResult<TSpec, TGeometry> {
  return {
    spec: context.normalizedSpec,
    geometry: context.geometry,
    warnings: []
  }
}

export function composePack<TSpec, TGeometry, TLayout, TValidation>(
  input: PackComposerInput<TSpec, TGeometry, TLayout, TValidation>
): PackCompositionResult<TSpec, TGeometry, TLayout, TValidation> {
  const normalizedSpec = input.normalize(input.spec)
  const geometry = input.resolveGeometry(normalizedSpec)
  const ruleSetVersion = input.ruleSetVersion ?? DEFAULT_RULE_SET_VERSION
  const context = {
    packId: input.packId,
    spec: input.spec,
    normalizedSpec,
    geometry
  }
  const ruleSet = getRuleSet<TSpec, TGeometry>(ruleSetVersion)
  const ruleSetResult = ruleSet.apply(context)
  const customRuleResult = input.applyRules({
    ...context,
    normalizedSpec: ruleSetResult.spec,
    geometry: ruleSetResult.geometry
  })
  const ruled = {
    spec: customRuleResult.spec,
    geometry: customRuleResult.geometry,
    warnings: [
      ...(ruleSetResult.warnings ?? []),
      ...(customRuleResult.warnings ?? [])
    ]
  }
  const validation = input.validate(ruled.spec)
  const layout = input.resolveLayout(ruled.spec, ruled.geometry)
  const validationWarnings = input.getWarnings(validation)
  const ruleWarnings = ruled.warnings

  return {
    packId: input.packId,
    ruleSetVersion,
    spec: input.spec,
    normalizedSpec: ruled.spec,
    geometry: ruled.geometry,
    layout,
    validation,
    warnings: [...ruleWarnings, ...validationWarnings],
    errors: input.getErrors(validation)
  }
}

export type { PackRuleEngine }
