import { getRuleRegistryEntriesForPack } from "../core/registries"
import type { SandboxPackId, SandboxRuleSelection, SelectedSandboxRule } from "./types"

export function selectSandboxRules(
  packId: SandboxPackId,
  enabledRuleIds: readonly string[]
): SandboxRuleSelection {
  const availableRules = getRuleRegistryEntriesForPack(packId)
  const availableRuleIds = new Set(availableRules.map(rule => rule.id))
  const selectedRules: SelectedSandboxRule[] = availableRules.map(rule => ({
    id: rule.id,
    requested: enabledRuleIds.includes(rule.id),
    supported: true,
    rule
  }))
  const unsupportedRuleIds = enabledRuleIds.filter(
    ruleId => !availableRuleIds.has(ruleId)
  )

  return {
    availableRules,
    selectedRules,
    unsupportedRuleIds
  }
}
