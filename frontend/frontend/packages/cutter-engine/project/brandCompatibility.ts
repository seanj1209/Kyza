/** Historical identifiers are accepted only here; new data uses Kyza names. */
const LEGACY_STORAGE_PREFIXES = ["cutnflow", "klyro"] as const
const LEGACY_EXPORT_RECORD_VERSION = "cutnflow-export-record-1"
const LEGACY_TECH_SOURCE = "cnf-tech"

type ReadableStorage = Pick<Storage, "getItem">
type MigratableStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem">

export function readBrandStorage(storage: ReadableStorage, key: string): string | null {
  const current = storage.getItem(key)
  if (current !== null) return current
  if (!key.startsWith("kyza")) return null
  for (const prefix of LEGACY_STORAGE_PREFIXES) {
    const legacy = storage.getItem(prefix + key.slice(4))
    if (legacy !== null) return legacy
  }
  return null
}

/** Copy, never remove: current Kyza values and all source records remain intact. */
export function migrateBrandStorage(storage: MigratableStorage): number {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
  let copied = 0
  for (const key of keys) {
    if (!key) continue
    const prefix = LEGACY_STORAGE_PREFIXES.find(value => key.startsWith(value + ".") || key.startsWith(value + "-") || key.startsWith(value + "_"))
    if (!prefix) continue
    const target = "kyza" + key.slice(prefix.length)
    try {
      if (storage.getItem(target) !== null) continue
      const value = storage.getItem(key)
      if (value === null) continue
      storage.setItem(target, value)
      copied++
    } catch {
      // Quota/private-mode failures must not prevent the application starting.
    }
  }
  return copied
}

/** Convert only the audit format identifier, not names, geometry, IDs or revisions. */
export function normaliseLegacyAuditRecords<T extends Record<string, unknown>>(value: T): T {
  if (!Array.isArray(value.exportAuditRecords)) return value
  let changed = false
  const records = value.exportAuditRecords.map((record: unknown) => {
    if (typeof record !== "object" || record === null || Array.isArray(record)) return record
    if ((record as Record<string, unknown>).recordVersion !== LEGACY_EXPORT_RECORD_VERSION) return record
    changed = true
    return { ...record, recordVersion: "kyza-export-record-1" }
  })
  return changed ? { ...value, exportAuditRecords: records } : value
}

/** Only normalise the known engine provenance field, never customer-authored text. */
export function normaliseLegacyProjectBrand<T extends Record<string, unknown>>(value: T): T {
  const result = normaliseLegacyAuditRecords(value)
  const draft = result.projectDraft
  if (typeof draft !== "object" || draft === null || Array.isArray(draft)) return result
  const workspace = (draft as Record<string, unknown>).workspace
  if (typeof workspace !== "object" || workspace === null || Array.isArray(workspace)) return result
  const fields = (workspace as Record<string, unknown>).fields
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return result
  let changed = false
  const entries = Object.entries(fields).map(([key, field]) => {
    if (typeof field !== "object" || field === null || Array.isArray(field) || (field as Record<string, unknown>).source !== LEGACY_TECH_SOURCE) return [key, field]
    changed = true
    return [key, { ...field, source: "kyza-tech" }]
  })
  return changed ? {
    ...result,
    projectDraft: { ...draft, workspace: { ...workspace, fields: Object.fromEntries(entries) } },
  } : result
}
