import {
  getEyemarkElementRefs,
  getPerfLaneElementRefs,
  getTearNotchElementRefs,
  migrateStoredProjectRecord,
  parseCutNFlowProject,
  resolveEyemarkById,
  resolvePerfLaneById,
  resolveTearNotchById,
  syncElementRefsFromLegacySpec,
  syncLegacySpecFromElementRefs,
  syncLegacySpecFromEyemarkRefs,
  syncLegacySpecFromPerfLaneRefs,
  syncLegacySpecFromTearNotchRefs,
  type CutNFlowProjectV1,
  type EyemarkElementRef,
  type PerfLaneElementRef,
  type TearNotchElementRef,
  type ParseResult
} from "../../../../packages/cutter-engine/project"
import type { FlowwrapSpec } from "../types/flowwrap"
import { restoreLegacyHangerSlotPlacement } from "../../../../packages/cutter-engine/actions/hangerSlotPlacement"
import { normaliseOpeningStyle } from "../../../../packages/cutter-engine/actions/openingStyle"
import { syncLiddingCutterSize } from "../constraints/lidding"

export type ProjectUpdateReason =
  | "pack-created"
  | "controls-edit"
  | "canvas-interaction"
  | "customisation-edit"
  | "undo"
  | "redo"
  | "save-load"
  | "artboard-switch"
  | "engine-action"
  | "test-fixture"

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T[K] extends (infer U)[]
      ? DeepPartial<U>[]
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K]
}

export type ProjectUpdate =
  | { type: "replace-legacy-spec"; spec: FlowwrapSpec }
  | { type: "patch-legacy-spec"; patch: DeepPartial<FlowwrapSpec> }
  | { type: "replace-project"; project: CutNFlowProjectV1 }

export type ProjectUpdateInput = {
  project: CutNFlowProjectV1
  reason: ProjectUpdateReason
  update: ProjectUpdate
  expectedRevision?: number
}

export type ProjectValidationHookResult = {
  errors?: string[]
  warnings?: string[]
}

export type ProjectUpdateHooks = {
  validate?: (project: CutNFlowProjectV1) => ProjectValidationHookResult
  onUpdated?: (result: ProjectUpdateResult) => void
}

export type ProjectUpdateResult = {
  ok: boolean
  reason: ProjectUpdateReason
  project?: CutNFlowProjectV1
  legacySpec?: FlowwrapSpec
  errors: string[]
  warnings: string[]
  previousRevision?: number
  revision?: number
}

export type MigratedSavedProjectRecord = {
  cardId: string
  project: CutNFlowProjectV1
}

export type EyemarkElementUpdater = (
  element: EyemarkElementRef
) => EyemarkElementRef

export type PerfLaneElementUpdater = (
  element: PerfLaneElementRef
) => PerfLaneElementRef

export type TearNotchElementUpdater = (
  element: TearNotchElementRef
) => TearNotchElementRef

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const cloneJson = <T>(value: T): T => {
  if (value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value)) as T
}

export const migrateSavedProjectRecord = (
  value: unknown
): ParseResult<MigratedSavedProjectRecord> => {
  if (!isRecord(value)) {
    return { ok: false, errors: ["Saved project record must be an object."] }
  }
  const cardId = typeof value.id === "string" ? value.id.trim() : ""
  if (!cardId) {
    return { ok: false, errors: ["Saved project record is missing an ID."] }
  }

  const migrated = migrateStoredProjectRecord(value.project ?? value)
  if (migrated.ok === false) {
    return { ok: false, errors: migrated.errors }
  }
  return { ok: true, value: { cardId, project: migrated.value.project } }
}

const mergeJson = <T>(base: T, patch: DeepPartial<T>): T => {
  if (!isRecord(base) || !isRecord(patch)) {
    return cloneJson(patch) as T
  }
  const merged: Record<string, unknown> = cloneJson(base) as Record<string, unknown>
  Object.entries(patch).forEach(([key, patchValue]) => {
    const baseValue = merged[key]
    merged[key] =
      isRecord(baseValue) && isRecord(patchValue)
        ? mergeJson(baseValue, patchValue)
        : cloneJson(patchValue)
  })
  return merged as T
}

const reject = (
  reason: ProjectUpdateReason,
  errors: string[],
  previousRevision?: number
): ProjectUpdateResult => ({
  ok: false,
  reason,
  errors,
  warnings: [],
  previousRevision,
  revision: previousRevision
})

export const synchroniseCutNFlowProject = (
  project: CutNFlowProjectV1,
  reason: ProjectUpdateReason
): ProjectUpdateResult => {
  const parsed = parseCutNFlowProject(project)
  if (parsed.ok === false) {
    return reject(reason, parsed.errors)
  }
  const value = parsed.value
  if (reason === "save-load" || reason === "artboard-switch") {
    // Lidding: re-derive the slit/cutter size from the lid and eyemark clearances
    // (projects saved before the lidding update used a narrower edge rule).
    const restored = syncLiddingCutterSize(normaliseOpeningStyle(restoreLegacyHangerSlotPlacement(value.cutter.legacySpec)))
    if (restored !== value.cutter.legacySpec) {
      return updateCutNFlowProject({ project: value, reason, update: { type: "replace-legacy-spec", spec: restored } })
    }
  }
  return {
    ok: true,
    reason,
    project: value,
    legacySpec: cloneJson(value.cutter.legacySpec),
    errors: [],
    warnings: parsed.warnings ?? [],
    previousRevision: value.revision,
    revision: value.revision
  }
}

export const updateCutNFlowProject = (
  input: ProjectUpdateInput,
  hooks: ProjectUpdateHooks = {}
): ProjectUpdateResult => {
  const currentResult = parseCutNFlowProject(input.project)
  if (currentResult.ok === false) {
    return reject(input.reason, currentResult.errors)
  }
  const current = currentResult.value
  if (
    input.expectedRevision !== undefined &&
    input.expectedRevision !== current.revision
  ) {
    return reject(
      input.reason,
      [
        `Project revision conflict: expected ${input.expectedRevision}, current revision is ${current.revision}.`
      ],
      current.revision
    )
  }

  let candidate: CutNFlowProjectV1
  if (input.update.type === "replace-project") {
    const replacement = parseCutNFlowProject(input.update.project)
    if (replacement.ok === false) {
      return reject(input.reason, replacement.errors, current.revision)
    }
    candidate = replacement.value
  } else {
    const legacySpec =
      input.update.type === "replace-legacy-spec"
        ? cloneJson(input.update.spec)
        : mergeJson(current.cutter.legacySpec, input.update.patch)
    candidate = {
      ...current,
      cutter: {
        ...current.cutter,
        legacySpec
      }
    }
  }

  candidate = { ...candidate, cutter: { ...candidate.cutter, legacySpec: normaliseOpeningStyle(candidate.cutter.legacySpec) } }
  candidate = syncLegacySpecFromElementRefs(
    syncElementRefsFromLegacySpec(candidate)
  )

  const nextRevision = Math.max(current.revision, candidate.revision) + 1
  const nextCandidate: CutNFlowProjectV1 = {
    ...candidate,
    revision: nextRevision,
    updatedAt: new Date().toISOString()
  }
  const parsedNext = parseCutNFlowProject(nextCandidate)
  if (parsedNext.ok === false) {
    return reject(input.reason, parsedNext.errors, current.revision)
  }

  // Phase 4 UI/export consumers use the shared structured validation service.
  // This hook remains available for future command-scoped pre/post validation.
  const validation = hooks.validate?.(parsedNext.value) ?? {}
  const validationErrors = validation.errors ?? []
  const warnings = [
    ...(currentResult.warnings ?? []),
    ...(parsedNext.warnings ?? []),
    ...(validation.warnings ?? [])
  ]
  if (validationErrors.length > 0) {
    return {
      ...reject(input.reason, validationErrors, current.revision),
      warnings
    }
  }

  const result: ProjectUpdateResult = {
    ok: true,
    reason: input.reason,
    project: parsedNext.value,
    legacySpec: cloneJson(parsedNext.value.cutter.legacySpec),
    errors: [],
    warnings,
    previousRevision: current.revision,
    revision: parsedNext.value.revision
  }
  hooks.onUpdated?.(result)
  return result
}

export const updateEyemarkById = (
  project: CutNFlowProjectV1,
  elementId: string,
  updater: EyemarkElementUpdater,
  reason: ProjectUpdateReason = "engine-action"
): ProjectUpdateResult => {
  const current = resolveEyemarkById(project, elementId)
  if (!current) {
    return reject(reason, [`Eyemark element "${elementId}" was not found.`], project.revision)
  }
  const updated = updater(cloneJson(current))
  if (
    updated.id !== current.id ||
    updated.type !== "eyemark" ||
    updated.index !== current.index
  ) {
    return reject(
      reason,
      ["Eyemark updates cannot change element ID, type, or legacy slot."],
      project.revision
    )
  }
  const refs = getEyemarkElementRefs(project).map(ref =>
    ref.id === elementId ? cloneJson(updated) : ref
  )
  const candidate = syncLegacySpecFromEyemarkRefs({
    ...project,
    cutter: {
      ...project.cutter,
      identityMap: {
        elements: [
          ...project.cutter.identityMap.elements.filter(
            element => element.type !== "eyemark"
          ),
          ...refs
        ]
      }
    }
  })
  return updateCutNFlowProject({
    project,
    reason,
    expectedRevision: project.revision,
    update: { type: "replace-project", project: candidate }
  })
}

export const updatePerfLaneById = (
  project: CutNFlowProjectV1,
  elementId: string,
  updater: PerfLaneElementUpdater,
  reason: ProjectUpdateReason = "engine-action"
): ProjectUpdateResult => {
  const current = resolvePerfLaneById(project, elementId)
  if (!current || current.status !== "active") {
    return reject(reason, [`Active perf-lane element "${elementId}" was not found.`], project.revision)
  }
  const updated = updater(cloneJson(current))
  if (
    updated.id !== current.id ||
    updated.type !== "perf-lane" ||
    updated.index !== current.index
  ) {
    return reject(
      reason,
      ["Perf-lane updates cannot change element ID, type, or legacy slot."],
      project.revision
    )
  }
  const refs = getPerfLaneElementRefs(project).map(ref =>
    ref.id === elementId ? cloneJson(updated) : ref
  )
  const candidate = syncLegacySpecFromPerfLaneRefs({
    ...project,
    cutter: {
      ...project.cutter,
      identityMap: {
        elements: [
          ...project.cutter.identityMap.elements.filter(
            element => element.type !== "perf-lane"
          ),
          ...refs
        ]
      }
    }
  })
  return updateCutNFlowProject({
    project,
    reason,
    expectedRevision: project.revision,
    update: { type: "replace-project", project: candidate }
  })
}

export const updateTearNotchById = (
  project: CutNFlowProjectV1,
  elementId: string,
  updater: TearNotchElementUpdater,
  reason: ProjectUpdateReason = "engine-action"
): ProjectUpdateResult => {
  const current = resolveTearNotchById(project, elementId)
  if (!current) {
    return reject(reason, [`Tear-notch element "${elementId}" was not found.`], project.revision)
  }
  const updated = updater(cloneJson(current))
  if (
    updated.id !== current.id ||
    updated.type !== "tear-notch" ||
    updated.construction !== current.construction
  ) {
    return reject(
      reason,
      ["Tear-notch updates cannot change element ID, type, or construction."],
      project.revision
    )
  }
  const refs = getTearNotchElementRefs(project).map(ref =>
    ref.id === elementId ? cloneJson(updated) : ref
  )
  const candidate = syncLegacySpecFromTearNotchRefs({
    ...project,
    cutter: {
      ...project.cutter,
      identityMap: {
        elements: [
          ...project.cutter.identityMap.elements.filter(
            element => element.type !== "tear-notch"
          ),
          ...refs
        ]
      }
    }
  })
  return updateCutNFlowProject({
    project,
    reason,
    expectedRevision: project.revision,
    update: { type: "replace-project", project: candidate }
  })
}
