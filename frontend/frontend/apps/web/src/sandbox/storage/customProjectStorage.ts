import type { FlowwrapSpec } from "../../types/flowwrap"
import type { CustomPackDefinition } from "../types"
import { normalizeSandboxConstraintProfileId } from "../constraintProfileRegistry"

const STORAGE_KEY = "cutnflow.customProjects.v1"
export const CURRENT_CUSTOM_PROJECT_SCHEMA_VERSION = 1

export type SavedCustomProjectRecord = Readonly<{
  schemaVersion: 1
  id: string
  name: string
  updatedAt: string
  definition: CustomPackDefinition
  baseSpec: FlowwrapSpec
  coreParameters: Readonly<{
    width: number
    height: number
    seal: number
    bleed?: number
    sealClearance?: number
    seals?: FlowwrapSpec["seals"]
  }>
}>

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function toSchemaVersion(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

function isSavedCustomProjectShape(
  value: unknown
): value is Omit<SavedCustomProjectRecord, "schemaVersion"> & {
  schemaVersion: unknown
} {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SavedCustomProjectRecord).id === "string" &&
    typeof (value as SavedCustomProjectRecord).name === "string" &&
    typeof (value as SavedCustomProjectRecord).updatedAt === "string" &&
    typeof (value as SavedCustomProjectRecord).definition === "object" &&
    (value as SavedCustomProjectRecord).definition !== null &&
    typeof (value as SavedCustomProjectRecord).baseSpec === "object" &&
    (value as SavedCustomProjectRecord).baseSpec !== null
  )
}

function migrateCustomProjectRecord(
  record: Omit<SavedCustomProjectRecord, "schemaVersion"> & {
    schemaVersion: unknown
  }
): SavedCustomProjectRecord {
  const schemaVersion = toSchemaVersion(record.schemaVersion)
  if (schemaVersion === null) {
    throw new Error("Saved custom project is missing a valid schema version.")
  }

  if (schemaVersion > CURRENT_CUSTOM_PROJECT_SCHEMA_VERSION) {
    throw new Error(
      "This custom project was saved with a newer schema version and cannot be loaded in this build."
    )
  }

  if (schemaVersion < CURRENT_CUSTOM_PROJECT_SCHEMA_VERSION) {
    // v1 migration hook; no field changes are required yet.
    return {
      ...cloneJson(record),
      definition: {
        ...cloneJson(record.definition),
        constraintProfileId: normalizeSandboxConstraintProfileId(
          record.definition.constraintProfileId
        )
      },
      schemaVersion: CURRENT_CUSTOM_PROJECT_SCHEMA_VERSION
    } as SavedCustomProjectRecord
  }

  return {
    ...cloneJson(record),
    definition: {
      ...cloneJson(record.definition),
      constraintProfileId: normalizeSandboxConstraintProfileId(
        record.definition.constraintProfileId
      )
    },
    schemaVersion: CURRENT_CUSTOM_PROJECT_SCHEMA_VERSION
  } as SavedCustomProjectRecord
}

function parseSavedCustomProjectRecord(value: unknown) {
  if (!isSavedCustomProjectShape(value)) {
    return null
  }
  return migrateCustomProjectRecord(value)
}

function readStorage(): SavedCustomProjectRecord[] {
  if (typeof localStorage === "undefined") {
    return []
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) {
    return []
  }

  const records: SavedCustomProjectRecord[] = []
  parsed.forEach(item => {
    try {
      const record = parseSavedCustomProjectRecord(item)
      if (record) {
        records.push(record)
      }
    } catch {
      // Invalid or future-version records are hidden from list views.
    }
  })
  return records
}

function writeStorage(records: readonly SavedCustomProjectRecord[]) {
  if (typeof localStorage === "undefined") {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function sortByUpdatedAt(records: readonly SavedCustomProjectRecord[]) {
  return [...records].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  )
}

export function listSavedCustomProjects() {
  return sortByUpdatedAt(readStorage())
}

export function loadSavedCustomProject(id: string) {
  if (typeof localStorage === "undefined") {
    return null
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!Array.isArray(parsed)) {
    return null
  }

  const record = parsed.find(
    item =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      (item as SavedCustomProjectRecord).id === id
  )
  if (!record) {
    return null
  }

  return parseSavedCustomProjectRecord(record)
}

export function exportSavedCustomProject(id: string) {
  const record = loadSavedCustomProject(id)
  if (!record) {
    throw new Error("Unable to find the saved custom project for export.")
  }
  return JSON.stringify(record, null, 2)
}

export function importCustomProjectRecord(jsonText: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error("Imported custom project file is not valid JSON.")
  }

  const record = parseSavedCustomProjectRecord(parsed)
  if (!record) {
    throw new Error("Imported custom project file is not a valid custom project payload.")
  }

  return saveCustomProject({
    id: record.id,
    name: record.name,
    definition: record.definition,
    baseSpec: record.baseSpec
  })
}

export function saveCustomProject(input: {
  id?: string
  name: string
  definition: CustomPackDefinition
  baseSpec: FlowwrapSpec
}) {
  const records = readStorage()
  const record: SavedCustomProjectRecord = {
    schemaVersion: CURRENT_CUSTOM_PROJECT_SCHEMA_VERSION,
    id: input.id ?? input.definition.id,
    name: input.name,
    updatedAt: new Date().toISOString(),
    definition: cloneJson(input.definition),
    baseSpec: cloneJson(input.baseSpec),
    coreParameters: {
      width: input.baseSpec.width,
      height: input.baseSpec.height,
      seal: input.baseSpec.seal,
      ...(input.baseSpec.bleed !== undefined
        ? { bleed: input.baseSpec.bleed }
        : {}),
      ...(input.baseSpec.sealClearance !== undefined
        ? { sealClearance: input.baseSpec.sealClearance }
        : {}),
      ...(input.baseSpec.seals ? { seals: cloneJson(input.baseSpec.seals) } : {})
    }
  }

  const nextRecords = records.filter(item => item.id !== record.id)
  nextRecords.push(record)
  writeStorage(sortByUpdatedAt(nextRecords))
  return cloneJson(record)
}

export function deleteSavedCustomProject(id: string) {
  const nextRecords = readStorage().filter(item => item.id !== id)
  writeStorage(nextRecords)
}
