declare const require: (id: string) => any
declare const process: {
  cwd(): string
}

const { mkdirSync, readFileSync, writeFileSync } = require("fs")
const { dirname, resolve } = require("path")
import { validateFlowwrapSpec } from "../../apps/web/src/constraints/flowwrap"
import {
  resolveFlowwrapLayout
} from "../../apps/web/src/core/geometry/resolvers/resolveFlowwrapLayout"
import {
  resolveKSealLayout
} from "../../apps/web/src/core/geometry/resolvers/resolveKSealLayout"
import {
  resolvePillowLayout
} from "../../apps/web/src/core/geometry/resolvers/resolvePillowLayout"
import {
  resolveSachetLayout
} from "../../apps/web/src/core/geometry/resolvers/resolveSachetLayout"
import { normalizeSpec } from "../../apps/web/src/core/model/normalization"
import { composeFlowwrapPack } from "../../apps/web/src/core/packComposer/composeFlowwrapPack"
import { composePaperStripPack } from "../../apps/web/src/core/packComposer/composePaperStripPack"
import { composePillowPack } from "../../apps/web/src/core/packComposer/composePillowPack"
import { composePlainWebPack } from "../../apps/web/src/core/packComposer/composePlainWebPack"
import { resolveFlowwrapGeometry } from "../../apps/web/src/geometry/flowwrapGeometry"
import { resolveKSealPouchGeometry } from "../../apps/web/src/geometry/kSealPouchGeometry"
import { resolveLiddingLayout, validateLiddingSpec } from "../../apps/web/src/constraints/lidding"
import type { FlowwrapSpec } from "../../apps/web/src/types/flowwrap"
import { stableStringify } from "./stableJson"

export type LayoutSnapshotModel = {
  packId: string
  normalizedSpec: FlowwrapSpec
  geometry: unknown
  layout: unknown
  validation: {
    errors: string[]
    warnings: string[]
  }
  warnings: string[]
  errors: string[]
}

function composeFlowwrapFamilyModel(
  packId: string,
  spec: FlowwrapSpec
): LayoutSnapshotModel {
  const normalizedSpec = normalizeSpec(spec)
  const geometry = resolveFlowwrapGeometry(normalizedSpec)
  const layout = resolveFlowwrapLayout(normalizedSpec)
  const validation = validateFlowwrapSpec(normalizedSpec)
  return {
    packId,
    normalizedSpec,
    geometry,
    layout,
    validation: {
      errors: validation.errors,
      warnings: validation.warnings ?? []
    },
    warnings: validation.warnings ?? [],
    errors: validation.errors
  }
}

function composeSachetModel(
  packId: string,
  spec: FlowwrapSpec
): LayoutSnapshotModel {
  const normalizedSpec = normalizeSpec(spec)
  const geometry = resolveFlowwrapGeometry(normalizedSpec)
  const layout = resolveSachetLayout(normalizedSpec)
  const validation = validateFlowwrapSpec(normalizedSpec)
  return {
    packId,
    normalizedSpec,
    geometry,
    layout,
    validation: {
      errors: validation.errors,
      warnings: validation.warnings ?? []
    },
    warnings: validation.warnings ?? [],
    errors: validation.errors
  }
}

function composeKSealModel(spec: FlowwrapSpec): LayoutSnapshotModel {
  const normalizedSpec = normalizeSpec(spec)
  const geometry = resolveKSealPouchGeometry(normalizedSpec)
  const layout = resolveKSealLayout(normalizedSpec)
  return {
    packId: "k-seal-pouch",
    normalizedSpec,
    geometry,
    layout,
    validation: {
      errors: [],
      warnings: []
    },
    warnings: layout.softWarnings,
    errors: []
  }
}

export function buildLayoutSnapshotModel(
  packId: string,
  spec: FlowwrapSpec
): LayoutSnapshotModel {
  switch (packId) {
    case "lidding": {
      const layout = resolveLiddingLayout(spec)
      const validation = validateLiddingSpec(spec)
      return {
        packId, normalizedSpec: spec, geometry: layout.cutter, layout,
        validation, warnings: validation.warnings, errors: validation.errors,
      }
    }
    case "flowwrap": {
      const composed = composeFlowwrapPack(spec)
      return {
        packId,
        normalizedSpec: composed.normalizedSpec,
        geometry: composed.geometry,
        layout: composed.layout,
        validation: {
          errors: composed.validation.errors,
          warnings: composed.validation.warnings ?? []
        },
        warnings: composed.warnings,
        errors: composed.errors
      }
    }
    case "doy-pouch":
      return composeFlowwrapFamilyModel(packId, spec)
    case "paper-strip": {
      const composed = composePaperStripPack(spec)
      return {
        packId,
        normalizedSpec: composed.normalizedSpec,
        geometry: composed.geometry,
        layout: composed.layout,
        validation: {
          errors: composed.validation.errors,
          warnings: composed.validation.warnings ?? []
        },
        warnings: composed.warnings,
        errors: composed.errors
      }
    }
    case "pillow-pack": {
      const composed = composePillowPack(spec)
      return {
        packId,
        normalizedSpec: composed.normalizedSpec,
        geometry: composed.geometry,
        layout: composed.layout,
        validation: {
          errors: composed.validation.errors,
          warnings: composed.validation.warnings ?? []
        },
        warnings: composed.warnings,
        errors: composed.errors
      }
    }
    case "k-seal-pouch":
      return composeKSealModel(spec)
    case "plain-web": {
      const composed = composePlainWebPack(spec)
      return {
        packId,
        normalizedSpec: composed.normalizedSpec,
        geometry: composed.geometry,
        layout: composed.layout,
        validation: {
          errors: composed.validation.errors,
          warnings: composed.validation.warnings ?? []
        },
        warnings: composed.warnings,
        errors: composed.errors
      }
    }
    case "sachet-3-side-seal":
    case "sachet-4-side-seal":
      return composeSachetModel(packId, spec)
    default:
      throw new Error(`Unsupported pack fixture type: ${packId}`)
  }
}

export function readFixtureSnapshot(pathFromTestsRoot: string) {
  const fixturePath = resolve(process.cwd(), "tests", pathFromTestsRoot)
  return readFileSync(fixturePath, "utf8").replace(/\r\n/g, "\n")
}

export function writeFixtureSnapshot(pathFromTestsRoot: string, model: LayoutSnapshotModel) {
  const fixturePath = resolve(process.cwd(), "tests", pathFromTestsRoot)
  mkdirSync(dirname(fixturePath), { recursive: true })
  writeFileSync(fixturePath, stableStringify(model))
}
