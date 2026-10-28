import {
  createCutNFlowProjectId,
  createCutNFlowProjectV1,
  parseCutNFlowProject
} from "./projectContract"
import {
  createIndependentCutterIdentityMap,
  syncLegacySpecFromElementRefs
} from "./elementIdentity"
import { migrateStoredProjectRecord } from "./projectMigrations"
import type { CutNFlowProjectV1, ParseResult } from "./projectTypes"

export const CUTNFLOW_PROJECT_STORAGE_KEY = "cutnflow.projects.v1"

export type CutNFlowProjectStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>

export type SaveCutNFlowProjectOptions = {
  expectedRevision?: number
}

export type RejectedProjectRecordReason =
  | "invalid_project"
  | "unsupported_schema"

export type RejectedProjectRecord = {
  index: number
  projectId?: string
  reason: RejectedProjectRecordReason
  errors: string[]
  rawRecord: unknown
}

export type CutNFlowProjectCollectionRead = {
  projects: CutNFlowProjectV1[]
  rejectedRecords: RejectedProjectRecord[]
}

type AcceptedProjectRecord = {
  index: number
  project: CutNFlowProjectV1
}

type InternalProjectCollectionRead = CutNFlowProjectCollectionRead & {
  acceptedRecords: AcceptedProjectRecord[]
  sourceRecords: unknown[]
}

const continuityBasis = (project: CutNFlowProjectV1) => {
  const {
    latestValidationRun: _latestValidationRun,
    validationRuns: _validationRuns,
    validationAcknowledgements: _validationAcknowledgements,
    exportAuditRecords: _exportAuditRecords,
    ...basis
  } = project
  return JSON.stringify(basis)
}

const resolveStorage = (
  storage?: CutNFlowProjectStorage
): ParseResult<CutNFlowProjectStorage> => {
  if (storage) {
    return { ok: true, value: storage }
  }
  try {
    if (typeof globalThis.localStorage === "undefined") {
      return { ok: false, errors: ["Project storage is not available."] }
    }
    return { ok: true, value: globalThis.localStorage }
  } catch {
    return { ok: false, errors: ["Project storage cannot be accessed."] }
  }
}

const readProjectCollection = (
  storage: CutNFlowProjectStorage
): ParseResult<InternalProjectCollectionRead> => {
  let raw: string | null
  try {
    raw = storage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY)
  } catch {
    return { ok: false, errors: ["Unable to read CutNFlow project storage."] }
  }
  if (!raw) {
    return {
      ok: true,
      value: {
        projects: [],
        rejectedRecords: [],
        acceptedRecords: [],
        sourceRecords: []
      }
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, errors: ["Stored CutNFlow projects are not valid JSON."] }
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, errors: ["Stored CutNFlow projects must be an array."] }
  }

  const acceptedRecords: AcceptedProjectRecord[] = []
  const rejectedRecords: RejectedProjectRecord[] = []
  let migratedProject = false
  parsed.forEach((item, index) => {
    const result = migrateStoredProjectRecord(item)
    if (result.ok === true) {
      migratedProject = migratedProject || result.value.migrated
      acceptedRecords.push({ index, project: result.value.project })
      return
    }
    const candidate = typeof item === "object" && item !== null
      ? item as Record<string, unknown>
      : undefined
    rejectedRecords.push({
      index,
      ...(typeof candidate?.id === "string" && candidate.id.trim()
        ? { projectId: candidate.id.trim() }
        : {}),
      reason: result.errors.some(error => error.includes("Unsupported project schemaVersion"))
        ? "unsupported_schema"
        : "invalid_project",
      errors: result.errors,
      rawRecord: item
    })
  })
  const projects = acceptedRecords.map(({ project }) => project)
  let sourceRecords = [...parsed]
  if (migratedProject && rejectedRecords.length === 0) {
    try {
      storage.setItem(CUTNFLOW_PROJECT_STORAGE_KEY, JSON.stringify(projects))
      sourceRecords = [...projects]
    } catch {
      return {
        ok: false,
        errors: ["Unable to persist the migrated CutNFlow project collection."]
      }
    }
  }
  return {
    ok: true,
    value: {
      projects,
      rejectedRecords,
      acceptedRecords,
      sourceRecords
    }
  }
}

const writeProjectCollection = (
  storage: CutNFlowProjectStorage,
  projects: readonly unknown[]
): ParseResult<unknown[]> => {
  try {
    storage.setItem(CUTNFLOW_PROJECT_STORAGE_KEY, JSON.stringify(projects))
    return { ok: true, value: [...projects] }
  } catch {
    return { ok: false, errors: ["Unable to write CutNFlow project storage."] }
  }
}

export const listCutNFlowProjects = (
  storage?: CutNFlowProjectStorage
): ParseResult<CutNFlowProjectV1[]> => {
  const read = readCutNFlowProjectCollection(storage)
  if (read.ok === false) return { ok: false, errors: read.errors }
  return { ok: true, value: read.value.projects }
}

export const readCutNFlowProjectCollection = (
  storage?: CutNFlowProjectStorage
): ParseResult<CutNFlowProjectCollectionRead> => {
  const resolved = resolveStorage(storage)
  if (resolved.ok === false) {
    return { ok: false, errors: resolved.errors }
  }
  const read = readProjectCollection(resolved.value)
  return read.ok
    ? {
        ok: true,
        value: {
          projects: read.value.projects,
          rejectedRecords: read.value.rejectedRecords
        }
      }
    : read
}

export const listCutNFlowProjectsStrict = (
  storage?: CutNFlowProjectStorage
): ParseResult<CutNFlowProjectV1[]> => {
  const read = readCutNFlowProjectCollection(storage)
  if (read.ok === false) return read
  if (read.value.rejectedRecords.length > 0) {
    return {
      ok: false,
      errors: read.value.rejectedRecords.flatMap(record =>
        record.errors.map(error => `Project ${record.index + 1}: ${error}`)
      )
    }
  }
  return { ok: true, value: read.value.projects }
}

export const loadCutNFlowProject = (
  id: string,
  storage?: CutNFlowProjectStorage
): ParseResult<CutNFlowProjectV1> => {
  const read = readCutNFlowProjectCollection(storage)
  if (read.ok === false) {
    return { ok: false, errors: read.errors }
  }
  const project = read.value.projects.find(item => item.id === id)
  if (project) return { ok: true, value: project }
  const rejected = read.value.rejectedRecords.find(item => item.projectId === id)
  return rejected
    ? {
        ok: false,
        errors: rejected.errors.map(error => `CutNFlow project "${id}" is invalid: ${error}`)
      }
    : { ok: false, errors: [`CutNFlow project "${id}" was not found.`] }
}

export const saveCutNFlowProject = (
  project: CutNFlowProjectV1,
  storage?: CutNFlowProjectStorage,
  options: SaveCutNFlowProjectOptions = {}
): ParseResult<CutNFlowProjectV1> => {
  const parsed = parseCutNFlowProject(project)
  if (parsed.ok === false) {
    return parsed
  }
  const resolved = resolveStorage(storage)
  if (resolved.ok === false) {
    return { ok: false, errors: resolved.errors }
  }
  const existing = readProjectCollection(resolved.value)
  if (existing.ok === false) {
    return { ok: false, errors: existing.errors }
  }
  const current = existing.value.projects.find(item => item.id === parsed.value.id)
  if (options.expectedRevision !== undefined) {
    if (
      (current && current.revision !== options.expectedRevision) ||
      (!current && parsed.value.revision !== options.expectedRevision) ||
      (current && ![
        options.expectedRevision,
        options.expectedRevision + 1
      ].includes(parsed.value.revision))
    ) {
      return {
        ok: false,
        errors: [
          `PROJECT_REVISION_CONFLICT: expected ${options.expectedRevision}, current revision is ${current?.revision ?? "missing"}.`
        ]
      }
    }
  } else if (current && current.revision > parsed.value.revision) {
    return {
      ok: false,
      errors: [
        `PROJECT_REVISION_CONFLICT: refusing to overwrite revision ${current.revision} with stale revision ${parsed.value.revision}.`
      ]
    }
  } else if (current && current.revision === parsed.value.revision) {
    if (JSON.stringify(current) === JSON.stringify(parsed.value)) {
      return { ok: true, value: current }
    }
    if (continuityBasis(current) !== continuityBasis(parsed.value)) {
      return {
        ok: false,
        errors: [
          `PROJECT_REVISION_CONFLICT: refusing to overwrite revision ${current.revision} with changed Project content without its expected base revision.`
        ]
      }
    }
  }

  const replacedIndexes = new Set(
    existing.value.acceptedRecords
      .filter(({ project: item }) => item.id === parsed.value.id)
      .map(({ index }) => index)
  )
  const records = existing.value.sourceRecords.filter((_, index) => !replacedIndexes.has(index))
  records.push(parsed.value)
  const written = writeProjectCollection(resolved.value, records)
  return written.ok === true
    ? { ok: true, value: parsed.value }
    : { ok: false, errors: written.errors }
}

export const deleteCutNFlowProject = (
  id: string,
  storage?: CutNFlowProjectStorage
): ParseResult<boolean> => {
  const resolved = resolveStorage(storage)
  if (resolved.ok === false) {
    return { ok: false, errors: resolved.errors }
  }
  const existing = readProjectCollection(resolved.value)
  if (existing.ok === false) {
    return { ok: false, errors: existing.errors }
  }
  const deletedIndexes = new Set(
    existing.value.acceptedRecords
      .filter(({ project }) => project.id === id)
      .map(({ index }) => index)
  )
  const records = existing.value.sourceRecords.filter((_, index) => !deletedIndexes.has(index))
  const deleted = deletedIndexes.size > 0
  const written = writeProjectCollection(resolved.value, records)
  return written.ok === true
    ? { ok: true, value: deleted }
    : { ok: false, errors: written.errors }
}

export const duplicateCutNFlowProject = (
  id: string,
  storage?: CutNFlowProjectStorage,
  duplicateName?: string
): ParseResult<CutNFlowProjectV1> => {
  const loaded = loadCutNFlowProject(id, storage)
  if (loaded.ok === false) {
    return loaded
  }
  const source = loaded.value
  const duplicateId = createCutNFlowProjectId()
  const duplicate = createCutNFlowProjectV1({
    id: duplicateId,
    name: duplicateName?.trim() || `${source.name} Copy`,
    metadata: source.metadata,
    ...(source.cutter
      ? {
          packType: source.cutter.packType,
          legacySpec: source.cutter.legacySpec,
          identityMap: createIndependentCutterIdentityMap(
            source.cutter.identityMap,
            duplicateId
          )
        }
      : {}),
    artwork: source.artwork,
    exportSettings: source.exportSettings
  })
  return saveCutNFlowProject(
    duplicate.cutter ? syncLegacySpecFromElementRefs(duplicate) : duplicate,
    storage
  )
}

export const exportCutNFlowProjectJson = (
  project: CutNFlowProjectV1
): ParseResult<string> => {
  const parsed = parseCutNFlowProject(project)
  if (parsed.ok === false) {
    return parsed
  }
  try {
    return { ok: true, value: JSON.stringify(parsed.value, null, 2) }
  } catch {
    return { ok: false, errors: ["Unable to serialise the CutNFlow project."] }
  }
}

export const importCutNFlowProjectJson = (
  json: string,
  storage?: CutNFlowProjectStorage
): ParseResult<CutNFlowProjectV1> => {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return { ok: false, errors: ["Imported CutNFlow project is not valid JSON."] }
  }
  const parsed = parseCutNFlowProject(value)
  return parsed.ok === true
    ? saveCutNFlowProject(parsed.value, storage)
    : parsed
}
