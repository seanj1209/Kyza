import { migrateBrandStorage, normaliseLegacyAuditRecords, normaliseLegacyProjectBrand, readBrandStorage } from "../packages/cutter-engine/project/brandCompatibility"
import { createKyzaProjectV1, loadKyzaProject } from "../packages/cutter-engine/project"

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

class MemoryStorage {
  readonly values = new Map<string, string>()
  get length() { return this.values.size }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const storage = new MemoryStorage()
const original = createKyzaProjectV1({
  id: "cutnflow-project-original",
  name: "Customer's Klyro reference — keep verbatim",
  revision: 3,
})
const payload = JSON.stringify([original])
storage.setItem("cutnflow.projects.v1", payload)
storage.setItem("klyro.theme", "light")
storage.setItem("cutnflow.activeCutterState", '{"projectId":"cutnflow-project-original"}')
storage.setItem("unrelated.app", "keep")

// A read-only adapter must recover historical Projects without writing/deleting.
const readOnly = { getItem: storage.getItem.bind(storage), setItem: () => { throw new Error("read-only") }, removeItem: () => { throw new Error("read-only") } }
const loaded = loadKyzaProject(original.id, readOnly)
assert(loaded.ok, "Existing projects must remain readable before migration")
assert(loaded.value.id === original.id && loaded.value.revision === 3, "Project identity and revision must survive the rebrand")
assert(loaded.value.name === original.name, "Customer-authored text must not be renamed")
assert(storage.getItem("kyza.projects.v1") === null, "A read-only load must not write a new collection")

assert(migrateBrandStorage(storage) === 3, "Projects, preferences and session drafts must copy to Kyza keys")
assert(storage.getItem("kyza.projects.v1") === payload, "Project payloads must be copied byte-for-byte")
assert(storage.getItem("cutnflow.projects.v1") === payload, "Historical records remain recoverable")
assert(storage.getItem("kyza.theme") === "light", "Theme preference must survive")
assert(storage.getItem("unrelated.app") === "keep", "Unrelated application data must not change")
storage.setItem("kyza.theme", "dark")
assert(migrateBrandStorage(storage) === 0, "Migration must be idempotent")
assert(readBrandStorage(storage, "kyza.theme") === "dark", "Current Kyza choices must win over historical values")

const blocked = Object.create(storage) as MemoryStorage
blocked.setItem = () => { throw new Error("quota exceeded") }
blocked.values.delete("kyza.projects.v1")
assert(migrateBrandStorage(blocked) === 0, "A write failure must not break startup")
assert(readBrandStorage(blocked, "kyza.projects.v1") === payload, "Historical data must remain readable when copying is blocked")

const oldAudit = {
  id: original.id, revision: original.revision, name: original.name,
  exportAuditRecords: [{ recordVersion: "cutnflow-export-record-1", filename: "customer-original.svg", projectRevision: 3 }],
}
const upgraded = normaliseLegacyAuditRecords(oldAudit)
assert(upgraded.exportAuditRecords[0].recordVersion === "kyza-export-record-1", "Historical audit versions must be recognised")
assert(oldAudit.exportAuditRecords[0].recordVersion === "cutnflow-export-record-1", "Audit migration must not mutate the source")
assert(upgraded.id === oldAudit.id && upgraded.name === oldAudit.name && upgraded.revision === oldAudit.revision, "Audit upgrades must preserve user identity and content")
assert(upgraded.exportAuditRecords[0].filename === "customer-original.svg", "Historical export evidence must be preserved")
const unknown = { exportAuditRecords: [{ recordVersion: "future-record-99" }] }
assert(normaliseLegacyAuditRecords(unknown) === unknown, "Unknown versions must not be silently upgraded")
const provenance = { projectDraft: { workspace: { fields: { trimMm: { value: 15, source: "cnf-tech", state: "confirmed" } } } } }
const normalised = normaliseLegacyProjectBrand(provenance)
assert(normalised.projectDraft.workspace.fields.trimMm.source === "kyza-tech", "Historical engine provenance must remain recognised")
assert(normalised.projectDraft.workspace.fields.trimMm.value === 15, "Rebranding provenance must not change engineering values")
assert(provenance.projectDraft.workspace.fields.trimMm.source === "cnf-tech", "Source provenance must remain unmodified")
console.log("Kyza brand migration: historical projects, preferences, drafts, audit versions, read-only recovery and current-value precedence verified")
