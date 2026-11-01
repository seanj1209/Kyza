import type { FlowwrapSpec } from "../types"
import {
  parseKyzaProject,
  projectFromLegacySpec
} from "./projectContract"
import {
  KYZA_PROJECT_SCHEMA_VERSION,
  type KyzaProjectV1,
  type ParseResult
} from "./projectTypes"

export const KYZA_PROJECT_MIGRATION_ORDER = [
  "identify-record-shape",
  "apply-v1-envelope-defaults",
  "apply-v1-workspace-defaults",
  "normalise-current-contract"
] as const

// V1 rejects unknown Project-envelope and Cutter-document fields before
// normalisation so engineering data is never silently discarded.
export const KYZA_PROJECT_UNKNOWN_FIELD_POLICY = "reject" as const

export type StoredProjectMigrationSource =
  | "current-v1"
  | "legacy-saved-card"

export type StoredProjectMigration = {
  project: KyzaProjectV1
  source: StoredProjectMigrationSource
  migrated: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const cloneJson = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T

const deterministicHash = (value: unknown) => {
  const source = JSON.stringify(value)
  let hash = 0x811c9dc5
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

const deterministicProjectId = (value: Record<string, unknown>) => {
  const draft = isRecord(value.projectDraft) ? value.projectDraft : undefined
  return isNonEmptyString(draft?.id)
    ? draft.id.trim()
    : `kyza-project-migrated-${deterministicHash(value)}`
}

const retainUnprovenValidationAsHistory = (value: Record<string, unknown>) => {
  if (value.revision !== undefined || !isRecord(value.latestValidationRun)) {
    return false
  }
  const history = Array.isArray(value.validationRuns)
    ? cloneJson(value.validationRuns)
    : []
  const latest = cloneJson(value.latestValidationRun)
  if (!history.some(run => isRecord(run) && run.id === latest.id)) {
    history.push(latest)
  }
  value.validationRuns = history
  delete value.latestValidationRun
  return true
}

const migrateCurrentV1 = (
  value: Record<string, unknown>
): ParseResult<StoredProjectMigration> => {
  const candidate = cloneJson(value)
  let migrated = false

  if (!isNonEmptyString(candidate.id)) {
    candidate.id = deterministicProjectId(candidate)
    migrated = true
  }
  if (!(Number.isInteger(candidate.revision) && (candidate.revision as number) > 0)) {
    migrated = retainUnprovenValidationAsHistory(candidate) || migrated
    candidate.revision = 1
    migrated = true
  }

  const projectDraft = isRecord(candidate.projectDraft)
    ? candidate.projectDraft
    : undefined
  if (projectDraft && !isNonEmptyString(projectDraft.id)) {
    projectDraft.id = candidate.id
    migrated = true
  }
  const workspace = projectDraft && isRecord(projectDraft.workspace)
    ? projectDraft.workspace
    : undefined
  const fields = workspace && isRecord(workspace.fields)
    ? workspace.fields
    : undefined
  if (fields && fields.trimMm === undefined) {
    fields.trimMm = { state: "missing", source: "preset" }
    migrated = true
  }

  const parsed = parseKyzaProject(candidate)
  if (parsed.ok === false) return parsed
  return {
    ok: true,
    value: {
      project: parsed.value,
      source: "current-v1",
      migrated: migrated || (parsed.warnings?.length ?? 0) > 0
    },
    ...(parsed.warnings ? { warnings: parsed.warnings } : {})
  }
}

const isLegacySavedCard = (value: Record<string, unknown>) =>
  value.schemaVersion === undefined &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.packId) &&
  isRecord(value.spec)

const migrateLegacySavedCard = (
  value: Record<string, unknown>
): ParseResult<StoredProjectMigration> => {
  if (!isNonEmptyString(value.updatedAt) || !Number.isFinite(Date.parse(value.updatedAt))) {
    return {
      ok: false,
      errors: ["Legacy saved project requires a valid updatedAt timestamp."]
    }
  }
  const name = isNonEmptyString(value.name) ? value.name.trim() : "Untitled"
  try {
    const project = projectFromLegacySpec(
      value.packId as string,
      name,
      cloneJson(value.spec) as unknown as FlowwrapSpec,
      {
        id: (value.id as string).trim(),
        createdAt: value.updatedAt,
        updatedAt: value.updatedAt
      }
    )
    const parsed = parseKyzaProject(project)
    return parsed.ok === false
      ? parsed
      : {
          ok: true,
          value: {
            project: parsed.value,
            source: "legacy-saved-card",
            migrated: true
          },
          ...(parsed.warnings ? { warnings: parsed.warnings } : {})
        }
  } catch {
    return {
      ok: false,
      errors: ["Legacy saved project could not be represented as a canonical Project."]
    }
  }
}

export const migrateStoredProjectRecord = (
  value: unknown
): ParseResult<StoredProjectMigration> => {
  if (!isRecord(value)) {
    return { ok: false, errors: ["Project record must be an object."] }
  }
  if (value.schemaVersion === KYZA_PROJECT_SCHEMA_VERSION) {
    return migrateCurrentV1(value)
  }
  if (isLegacySavedCard(value)) {
    return migrateLegacySavedCard(value)
  }
  return {
    ok: false,
    errors: [
      value.schemaVersion === undefined
        ? "Project is missing schemaVersion and does not match the known legacy saved-card shape."
        : `Unsupported project schemaVersion: ${String(value.schemaVersion)}.`
    ]
  }
}
