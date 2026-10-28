import type { PackComposerContext, PackRuleResult } from "../packComposer/types"

export type RuleSetVersion = "v1" | "v1.1"

export type RuleSetContext<TSpec, TGeometry> = PackComposerContext<TSpec, TGeometry>

export type RuleSetResult<TSpec, TGeometry> = PackRuleResult<TSpec, TGeometry>

export type RuleSet<TSpec, TGeometry> = Readonly<{
  id: string
  version: RuleSetVersion
  label: string
  apply: (context: RuleSetContext<TSpec, TGeometry>) => RuleSetResult<TSpec, TGeometry>
}>
