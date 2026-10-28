import type { RuleSetVersion } from "../rulesets"

export type PackRuleResult<TSpec, TGeometry> = {
  spec: TSpec
  geometry: TGeometry
  warnings?: string[]
}

export type PackComposerContext<TSpec, TGeometry> = {
  packId: string
  spec: TSpec
  normalizedSpec: TSpec
  geometry: TGeometry
}

export type PackRuleEngine<TSpec, TGeometry> = (
  context: PackComposerContext<TSpec, TGeometry>
) => PackRuleResult<TSpec, TGeometry>

export type PackValidationEngine<TSpec, TValidation> = (spec: TSpec) => TValidation

export type PackCompositionResult<TSpec, TGeometry, TLayout, TValidation> = {
  packId: string
  ruleSetVersion: RuleSetVersion
  spec: TSpec
  normalizedSpec: TSpec
  geometry: TGeometry
  layout: TLayout
  validation: TValidation
  warnings: string[]
  errors: string[]
}

export type PackComposerInput<TSpec, TGeometry, TLayout, TValidation> = {
  packId: string
  spec: TSpec
  ruleSetVersion?: RuleSetVersion
  normalize: (spec: TSpec) => TSpec
  resolveGeometry: (spec: TSpec) => TGeometry
  applyRules: PackRuleEngine<TSpec, TGeometry>
  validate: PackValidationEngine<TSpec, TValidation>
  getErrors: (validation: TValidation) => string[]
  getWarnings: (validation: TValidation) => string[]
  resolveLayout: (spec: TSpec, geometry: TGeometry) => TLayout
}
