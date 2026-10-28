import {
  CONSTRAINT_PROFILE_REGISTRY as CORE_CONSTRAINT_PROFILE_REGISTRY,
  getConstraintProfile as getCoreConstraintProfile
} from "../core/registries"

export const SANDBOX_CONSTRAINT_PROFILE_REGISTRY =
  CORE_CONSTRAINT_PROFILE_REGISTRY

export const DEFAULT_SANDBOX_CONSTRAINT_PROFILE_ID =
  SANDBOX_CONSTRAINT_PROFILE_REGISTRY[0]?.id ?? "default-clear"

export function getSandboxConstraintProfile(id: string) {
  return getCoreConstraintProfile(id)
}

export function normalizeSandboxConstraintProfileId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_SANDBOX_CONSTRAINT_PROFILE_ID
  }

  const directMatch = getSandboxConstraintProfile(value)
  if (directMatch) {
    return directMatch.id
  }

  switch (value) {
    case "default":
    case "clear":
      return "default-clear"
    case "white":
      return "default-white"
    case "paper":
      return "default-paper"
    default:
      return DEFAULT_SANDBOX_CONSTRAINT_PROFILE_ID
  }
}
