import type { RuleSet, RuleSetVersion } from "./types"
import type { PackComposerContext, PackRuleResult } from "../packComposer/types"

function applyPassThroughRuleSet<TSpec, TGeometry>(
  context: PackComposerContext<TSpec, TGeometry>
): PackRuleResult<TSpec, TGeometry> {
  return {
    spec: context.normalizedSpec,
    geometry: context.geometry,
    warnings: []
  }
}

export const DEFAULT_RULE_SET_VERSION: RuleSetVersion = "v1"

export const RULE_SETS: readonly RuleSet<unknown, unknown>[] = [
  {
    id: "default-v1",
    version: "v1",
    label: "Default Rule Set v1",
    apply: applyPassThroughRuleSet
  },
  {
    id: "default-v1-1",
    version: "v1.1",
    label: "Default Rule Set v1.1",
    apply: applyPassThroughRuleSet
  }
] as const

export function getRuleSet<TSpec, TGeometry>(
  version: RuleSetVersion = DEFAULT_RULE_SET_VERSION
): RuleSet<TSpec, TGeometry> {
  const matched = RULE_SETS.find(ruleSet => ruleSet.version === version)
  if (!matched) {
    throw new Error(`Unknown rule set version "${version}".`)
  }
  return matched as RuleSet<TSpec, TGeometry>
}

export function getDefaultRuleSet<TSpec, TGeometry>() {
  return getRuleSet<TSpec, TGeometry>(DEFAULT_RULE_SET_VERSION)
}
