import {
  PARAMETER_DEFAULTS,
  PARAMETER_ENUMS
} from "../model/parameterSchema"
import type { ConstraintProfileEntry } from "./types"

const BASE_PROFILE_DEFAULTS = {
  base: {
    bleed: PARAMETER_DEFAULTS.base.bleed,
    sealClearance: PARAMETER_DEFAULTS.base.sealClearance
  },
  sachet: {
    safeZoneBuffer: PARAMETER_DEFAULTS.sachet.safeZoneBuffer
  }
} as const

export const CONSTRAINT_PROFILE_REGISTRY: readonly ConstraintProfileEntry[] = [
  {
    id: "default-clear",
    label: "Default Clear Film",
    machine: "default",
    substrate: "clear",
    defaults: {
      substrate: "clear",
      ...BASE_PROFILE_DEFAULTS
    },
    notes: `Uses current schema defaults with substrate preset ${PARAMETER_ENUMS.substrate.default}.`
  },
  {
    id: "default-white",
    label: "Default White Film",
    machine: "default",
    substrate: "white",
    defaults: {
      substrate: "white",
      ...BASE_PROFILE_DEFAULTS
    }
  },
  {
    id: "default-paper",
    label: "Default Paper",
    machine: "default",
    substrate: "paper",
    defaults: {
      substrate: "paper",
      ...BASE_PROFILE_DEFAULTS
    }
  }
] as const

export function getConstraintProfile(id: string) {
  return CONSTRAINT_PROFILE_REGISTRY.find(entry => entry.id === id)
}
