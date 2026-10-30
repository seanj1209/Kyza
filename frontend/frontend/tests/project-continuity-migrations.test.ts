import { createOrUpdateCutterFromPackGen, createEmptyPackGenDraft, setPackGenField } from "../apps/web/src/packGen/packGenProjectService"
import { getPackModule } from "../apps/web/src/packs"
import { loadRequestedProject } from "../apps/web/src/project/projectOpenService"
import { updateKyzaProject } from "../apps/web/src/project/projectUpdateService"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  KYZA_PROJECT_MIGRATION_ORDER,
  KYZA_PROJECT_STORAGE_KEY,
  KYZA_PROJECT_UNKNOWN_FIELD_POLICY,
  createKyzaProjectV1,
  duplicateKyzaProject,
  getEyemarkElementRefs,
  listKyzaProjects,
  listKyzaProjectsStrict,
  loadKyzaProject,
  parseKyzaProject,
  readKyzaProjectCollection,
  saveKyzaProject,
  type KyzaProjectStorage,
  type KyzaProjectV1,
} from "../packages/cutter-engine/project"
import {
  getEffectiveValidationStatus,
  validateAndPersistProjectCutter,
  type CutterExportAuditRecord,
  type ValidationAcknowledgement,
} from "../packages/cutter-engine/validation"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertJsonEqual(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)
}

class MemoryStorage implements KyzaProjectStorage {
  readonly values = new Map<string, string>()
  writes = 0
  failWrites = false

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("write failed")
    this.writes += 1
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  seed(key: string, value: string) {
    this.values.set(key, value)
  }
}

const timestamp = "2026-07-26T12:00:00.000Z"
const laterTimestamp = "2026-07-26T12:05:00.000Z"
const kSealModule = getPackModule("k-seal-pouch")
assert(kSealModule, "K-Seal module is required for continuity coverage.")
const defaults = kSealModule.getDefaults()
assert(defaults.eyeMarks, "K-Seal defaults must include an eyemark definition.")

const futureEngineering = {
  retainedToleranceMm: 0.35,
  machineProfile: "future-kseal-profile",
}
type ExtendedFlowwrapSpec = FlowwrapSpec & {
  futureEngineering: typeof futureEngineering
}
const extendedSpec: ExtendedFlowwrapSpec = {
  ...defaults,
  eyeMarks: {
    ...defaults.eyeMarks,
    count: 2,
    width2: defaults.eyeMarks.width,
    height2: defaults.eyeMarks.height,
  },
  futureEngineering,
}

const shell = createKyzaProjectV1({
  id: "continuity-kseal-project",
  name: "Continuity K-Seal",
  packType: "k-seal-pouch",
  legacySpec: extendedSpec,
  createdAt: timestamp,
  updatedAt: timestamp,
})
let draft = createEmptyPackGenDraft(shell, timestamp)
for (const [field, value] of [
  ["packType", "k-seal-pouch"],
  ["finishedWidthMm", 300],
  ["finishedHeightMm", 190],
  ["gussetMm", 40],
  ["trimMm", 10],
  ["fillWeightG", 0],
  ["eyemarkCount", 2],
  ["zipEnabled", true],
  ["minimumSafeZoneMm", 5],
  ["bleedMm", 3],
] as const) {
  draft = setPackGenField(draft, field, value)
}

const project = createKyzaProjectV1({
  id: shell.id,
  revision: shell.revision,
  name: shell.name,
  packType: shell.cutter?.packType,
  legacySpec: shell.cutter?.legacySpec,
  identityMap: shell.cutter?.identityMap,
  projectDraft: draft,
  createdAt: timestamp,
  updatedAt: timestamp,
})
assert(project.cutter, "Continuity fixture must contain a Cutter Specification.")

const storage = new MemoryStorage()
const initialSave = saveKyzaProject(project, storage)
assert(initialSave.ok, "Current-schema K-Seal Project must save.")
const reopened = loadKyzaProject(project.id, storage)
assert(reopened.ok, "Current-schema K-Seal Project must reopen.")
assert(reopened.value !== project, "Reopen assertions must use the deserialised Project rather than the in-memory source.")
assert(reopened.value.cutter, "Reopened Project must retain its Cutter Specification.")
assert(reopened.value.cutter.packType === "k-seal-pouch", "Pack type must survive reopen.")
assert(reopened.value.projectDraft?.workspace?.fields.finishedWidthMm.value === 300, "Finished width must survive reopen.")
assert(reopened.value.projectDraft?.workspace?.fields.finishedHeightMm.value === 190, "Finished height must survive reopen.")
assert(reopened.value.projectDraft?.workspace?.fields.fillWeightG.value === 0, "An explicit zero must survive reopen.")
assert(reopened.value.projectDraft?.workspace?.fields.zipEnabled.value === true, "Zip state must survive reopen.")
assert(reopened.value.projectDraft?.workspace?.assumptionsReviewed === false, "An explicit false must survive reopen.")
assert(reopened.value.cutter.legacySpec.eyeMarks?.count === 2, "Both eyemarks must survive reopen.")
assertJsonEqual(
  (reopened.value.cutter.legacySpec as ExtendedFlowwrapSpec).futureEngineering,
  futureEngineering,
  "Unknown engineering fields must survive the canonical parse/save boundary.",
)
const writesAfterInitialSave = storage.writes
const currentNoOp = listKyzaProjects(storage)
assert(currentNoOp.ok, "A current-schema Project must pass the migration dispatcher.")
assert(storage.writes === writesAfterInitialSave, "Current-schema migration must be a no-op without a storage rewrite.")
assertJsonEqual(
  KYZA_PROJECT_MIGRATION_ORDER,
  [
    "identify-record-shape",
    "apply-v1-envelope-defaults",
    "apply-v1-workspace-defaults",
    "normalise-current-contract",
  ],
  "Project migrations must execute in the documented order.",
)
assert(KYZA_PROJECT_UNKNOWN_FIELD_POLICY === "reject", "Unknown Project data must use the documented reject policy.")
const stableEyemarkIds = getEyemarkElementRefs(reopened.value).map(({ id }) => id)
assert(stableEyemarkIds.length === 2, "Both K-Seal eyemarks must have stable element IDs.")

const validation = validateAndPersistProjectCutter(reopened.value, {
  storage,
  now: () => laterTimestamp,
})
assert(validation.ok, "ValidationRun must persist through the canonical Project repository.")
const validationRun = validation.run
assert(validation.project.latestValidationRun?.id === validationRun.id, "Latest ValidationRun must be attached to the Project.")
assert(validation.project.validationRuns?.some(({ id }) => id === validationRun.id), "Validation history must retain the run.")
assert(validationRun.rulesetVersion.length > 0, "ValidationRun must retain its ruleset version.")
assert(
  validationRun.issues.every((issue) => !issue.affectedElementId || stableEyemarkIds.includes(issue.affectedElementId)),
  "Validation issues must retain valid affectedElementId references.",
)

const acknowledgement: ValidationAcknowledgement = {
  id: "continuity-warning-ack",
  projectId: validation.project.id,
  projectRevision: validation.project.revision,
  validationRunId: validationRun.id,
  rulesetVersion: validationRun.rulesetVersion,
  acknowledgedIssueIds: validationRun.issues
    .filter(({ severity }) => severity === "warning")
    .map(({ id }) => id),
  acknowledgedAt: laterTimestamp,
  acknowledgedBy: "continuity-test-user",
}
const exportAudit: CutterExportAuditRecord = {
  id: "continuity-export-audit",
  projectId: validation.project.id,
  projectRevision: validation.project.revision,
  validationRunId: validationRun.id,
  rulesetVersion: validationRun.rulesetVersion,
  validationStatus: validationRun.status,
  criticalCount: validationRun.summary.criticalCount,
  warningCount: validationRun.summary.warningCount,
  advisoryCount: validationRun.summary.advisoryCount,
  criticalIssueIds: validationRun.issues.filter(({ severity }) => severity === "critical").map(({ id }) => id),
  warningIssueIds: validationRun.issues.filter(({ severity }) => severity === "warning").map(({ id }) => id),
  advisoryIssueIds: validationRun.issues.filter(({ severity }) => severity === "advisory").map(({ id }) => id),
  acknowledgedWarningIssueIds: acknowledgement.acknowledgedIssueIds,
  acknowledgementId: acknowledgement.id,
  exportedAt: laterTimestamp,
  exportFormat: "svg",
}
const withEvidence: KyzaProjectV1 = {
  ...validation.project,
  validationAcknowledgements: [acknowledgement],
  exportAuditRecords: [exportAudit],
}
const evidenceSave = saveKyzaProject(withEvidence, storage, {
  expectedRevision: validation.project.revision,
})
assert(evidenceSave.ok, "Warning acknowledgement and export evidence must persist.")

const regenerated = createOrUpdateCutterFromPackGen(
  withEvidence.id,
  withEvidence.projectDraft!,
  withEvidence.revision,
  { storage, now: () => "2026-07-26T12:10:00.000Z" },
)
assert(regenerated.ok, "A reopened K-Seal Project must remain editable and regenerate its Cutter.")
assert(regenerated.project.revision === withEvidence.revision + 1, "Engineering edit must increment Project revision once.")
assert(regenerated.project.latestValidationRun?.id === validationRun.id, "Cutter regeneration must preserve the prior ValidationRun.")
assert(regenerated.project.validationAcknowledgements?.[0]?.id === acknowledgement.id, "Cutter regeneration must preserve warning acknowledgement history.")
assert(regenerated.project.exportAuditRecords?.[0]?.id === exportAudit.id, "Cutter regeneration must preserve export evidence history.")
assert(
  getEffectiveValidationStatus(regenerated.project.latestValidationRun, regenerated.project.revision) === "stale",
  "A reopened engineering edit must make the earlier ValidationRun stale.",
)
assert(regenerated.project.projectDraft?.workspace?.fields.finishedWidthMm.value === 300, "K-Seal finished width must survive regeneration.")
assert(regenerated.project.projectDraft?.workspace?.fields.finishedHeightMm.value === 190, "K-Seal finished height must survive regeneration.")
assert(regenerated.project.projectDraft?.workspace?.fields.eyemarkCount.value === 2, "Two-eyemark state must survive regeneration.")
assert(regenerated.project.projectDraft?.workspace?.fields.zipEnabled.value === true, "Zip state must survive regeneration.")
assertJsonEqual(
  getEyemarkElementRefs(regenerated.project).map(({ id }) => id),
  stableEyemarkIds,
  "Cutter element IDs must remain stable after reopen and regeneration.",
)

const revalidated = validateAndPersistProjectCutter(regenerated.project, {
  storage,
  now: () => "2026-07-26T12:15:00.000Z",
})
assert(revalidated.ok, "Edited Project must revalidate and persist.")
assert(
  getEffectiveValidationStatus(revalidated.run, revalidated.project.revision) === revalidated.run.status,
  "Revalidation must match the current Project revision.",
)

const conflictBase = loadKyzaProject(project.id, storage)
assert(conflictBase.ok && conflictBase.value.cutter, "Conflict fixture must reopen from persisted state.")
const firstEditor = updateKyzaProject({
  project: conflictBase.value,
  reason: "controls-edit",
  expectedRevision: conflictBase.value.revision,
  update: {
    type: "patch-legacy-spec",
    patch: { width: conflictBase.value.cutter.legacySpec.width + 10 },
  },
})
const staleEditor = updateKyzaProject({
  project: conflictBase.value,
  reason: "controls-edit",
  expectedRevision: conflictBase.value.revision,
  update: {
    type: "patch-legacy-spec",
    patch: { width: conflictBase.value.cutter.legacySpec.width + 20 },
  },
})
assert(firstEditor.ok && firstEditor.project, "First concurrent editor must create a valid candidate.")
assert(staleEditor.ok && staleEditor.project, "Second concurrent editor must create a valid local candidate.")
const firstPersist = saveKyzaProject(firstEditor.project, storage, {
  expectedRevision: conflictBase.value.revision,
})
assert(firstPersist.ok, "First editor must persist against the expected revision.")
const stalePersist = saveKyzaProject(staleEditor.project, storage, {
  expectedRevision: conflictBase.value.revision,
})
assert(stalePersist.ok === false, "A stale editor must not overwrite the newer persisted revision.")
assert(stalePersist.errors.some((error) => error.includes("PROJECT_REVISION_CONFLICT")), "Conflict must use the standard Project revision code.")
const conflictReload = loadKyzaProject(project.id, storage)
assert(conflictReload.ok && conflictReload.value.cutter, "Project must remain readable after conflict rejection.")
assert(
  conflictReload.value.cutter.legacySpec.width === firstEditor.project.cutter!.legacySpec.width,
  "Conflict rejection must preserve the first persisted edit.",
)

const missingOptional = JSON.parse(JSON.stringify(project)) as Record<string, unknown>
const optionalDraft = missingOptional.projectDraft as { workspace?: { fields?: Record<string, unknown> } }
delete optionalDraft.workspace?.fields?.trimMm
delete optionalDraft.workspace?.fields?.zipEnabled
assert(parseKyzaProject(missingOptional).ok, "Missing optional Pack fields must remain compatible.")

const migrationSource = JSON.parse(JSON.stringify(project)) as Record<string, unknown>
delete migrationSource.revision
const migrationStorage = new MemoryStorage()
migrationStorage.seed(KYZA_PROJECT_STORAGE_KEY, JSON.stringify([migrationSource]))
const migrated = listKyzaProjects(migrationStorage)
assert(migrated.ok && migrated.value[0]?.revision === 1, "A legacy Project without revision must migrate to revision 1.")
assert(migrationStorage.writes === 1, "A successful revision migration must be persisted exactly once.")
const migratedAgain = listKyzaProjects(migrationStorage)
assert(migratedAgain.ok && migrationStorage.writes === 1, "A persisted migration must not repeat on every reopen.")

const futureStorage = new MemoryStorage()
const futureProject = { ...project, schemaVersion: 999 }
const futureRaw = JSON.stringify([futureProject])
futureStorage.seed(KYZA_PROJECT_STORAGE_KEY, futureRaw)
const futureLoad = listKyzaProjects(futureStorage)
assert(futureLoad.ok && futureLoad.value.length === 0, "Tolerant listing must isolate an unsupported future schema.")
const futureStrictLoad = listKyzaProjectsStrict(futureStorage)
assert(futureStrictLoad.ok === false, "Strict listing must fail safely for an unsupported future schema.")
assert(futureStrictLoad.errors.some((error) => error.includes("Unsupported project schemaVersion: 999")), "Future schema failure must be explicit.")
assert(futureStorage.getItem(KYZA_PROJECT_STORAGE_KEY) === futureRaw, "Future-version data must not be rewritten.")
assert(futureStorage.writes === 0, "Future-version failure must remain read-only.")

const corruptStorage = new MemoryStorage()
const corruptRaw = "{partially-written"
corruptStorage.seed(KYZA_PROJECT_STORAGE_KEY, corruptRaw)
const corruptLoad = listKyzaProjects(corruptStorage)
assert(corruptLoad.ok === false, "Partially written JSON must return a controlled failure.")
assert(corruptStorage.getItem(KYZA_PROJECT_STORAGE_KEY) === corruptRaw, "Corrupt data must remain available for recovery.")
assert(corruptStorage.writes === 0, "Corrupt data must never be rewritten during load.")

const atomicStorage = new MemoryStorage()
const atomicRaw = JSON.stringify([migrationSource, futureProject])
atomicStorage.seed(KYZA_PROJECT_STORAGE_KEY, atomicRaw)
const atomicFailure = listKyzaProjects(atomicStorage)
assert(atomicFailure.ok && atomicFailure.value.length === 1, "A collection containing a failed migration must expose its valid Project.")
assert(atomicStorage.getItem(KYZA_PROJECT_STORAGE_KEY) === atomicRaw, "Failed collection migration must preserve the original payload.")
assert(atomicStorage.writes === 0, "Failed collection migration must not partially persist earlier items.")

const writeFailureStorage = new MemoryStorage()
const writeFailureRaw = JSON.stringify([migrationSource])
writeFailureStorage.seed(KYZA_PROJECT_STORAGE_KEY, writeFailureRaw)
writeFailureStorage.failWrites = true
const writeFailure = listKyzaProjects(writeFailureStorage)
assert(writeFailure.ok === false, "Migration write failure must be controlled.")
assert(writeFailureStorage.getItem(KYZA_PROJECT_STORAGE_KEY) === writeFailureRaw, "Migration write failure must leave the original payload intact.")

const mixedCorruptStorage = new MemoryStorage()
const corruptRecord = { schemaVersion: 1, id: "corrupt-record", revision: 1 }
mixedCorruptStorage.seed(KYZA_PROJECT_STORAGE_KEY, JSON.stringify([project, corruptRecord]))
const mixedCorrupt = readKyzaProjectCollection(mixedCorruptStorage)
assert(mixedCorrupt.ok, "A mixed collection must return a recovery result.")
assert(mixedCorrupt.value.projects.some(({ id }) => id === project.id), "A valid Project must remain available beside a corrupt record.")
assert(mixedCorrupt.value.rejectedRecords.length === 1, "A corrupt record must be reported exactly once.")
assert(mixedCorrupt.value.rejectedRecords[0]?.index === 1, "Recovery diagnostics must identify the corrupt record index.")
assertJsonEqual(mixedCorrupt.value.rejectedRecords[0]?.rawRecord, corruptRecord, "Recovery diagnostics must retain the raw corrupt record.")
const mixedCorruptList = listKyzaProjects(mixedCorruptStorage)
assert(mixedCorruptList.ok && mixedCorruptList.value.length === 1, "The normal Project list must tolerate isolated corrupt records.")
assert(listKyzaProjectsStrict(mixedCorruptStorage).ok === false, "Strict callers must be able to reject a mixed corrupt collection.")
const mixedValid = mixedCorruptList.value[0]
assert(mixedValid, "Mixed collection update requires its valid Project.")
const mixedUpdated = {
  ...mixedValid,
  revision: mixedValid.revision + 1,
  updatedAt: laterTimestamp,
}
assert(
  saveKyzaProject(mixedUpdated, mixedCorruptStorage, { expectedRevision: mixedValid.revision }).ok,
  "A valid Project in a mixed collection must remain editable.",
)
const mixedAfterSave = JSON.parse(mixedCorruptStorage.getItem(KYZA_PROJECT_STORAGE_KEY)!) as unknown[]
assertJsonEqual(mixedAfterSave[0], corruptRecord, "Saving a valid Project must preserve an isolated rejected record unchanged.")

const mixedFutureStorage = new MemoryStorage()
const futureMixedRecord = { ...project, id: "future-project", schemaVersion: 2 }
const mixedFutureRaw = JSON.stringify([project, futureMixedRecord])
mixedFutureStorage.seed(KYZA_PROJECT_STORAGE_KEY, mixedFutureRaw)
const mixedFuture = readKyzaProjectCollection(mixedFutureStorage)
assert(mixedFuture.ok, "A future-version record must produce a recovery result.")
assert(mixedFuture.value.projects.length === 1, "A current V1 Project must remain available beside a future record.")
assert(mixedFuture.value.rejectedRecords[0]?.reason === "unsupported_schema", "Future schema diagnostics must be typed.")
assert(mixedFutureStorage.getItem(KYZA_PROJECT_STORAGE_KEY) === mixedFutureRaw, "A future-version record must remain stored unchanged.")
assert(mixedFutureStorage.writes === 0, "Reading a future-version record must not rewrite the collection.")

const normalisingOpenStorage = new MemoryStorage()
const missingIdentity = JSON.parse(JSON.stringify(project)) as Record<string, unknown>
delete (missingIdentity.cutter as Record<string, unknown>).identityMap
normalisingOpenStorage.seed(KYZA_PROJECT_STORAGE_KEY, JSON.stringify([missingIdentity]))
const normalisingOpen = loadRequestedProject(project.id, normalisingOpenStorage)
assert(normalisingOpen.ok, "Project Open must allow the canonical repository to persist safe identity normalisation.")
assert(normalisingOpenStorage.writes === 1, "Project Open must persist the normalised identity map once.")
const normalisingOpenAgain = loadRequestedProject(project.id, normalisingOpenStorage)
assert(normalisingOpenAgain.ok && normalisingOpenStorage.writes === 1, "Repeated Project Open must be migration-idempotent.")

const deterministicMissingId = JSON.parse(JSON.stringify(project)) as Record<string, unknown>
delete deterministicMissingId.id
delete deterministicMissingId.projectDraft
const deterministicStorageA = new MemoryStorage()
const deterministicStorageB = new MemoryStorage()
const deterministicRaw = JSON.stringify([deterministicMissingId])
deterministicStorageA.seed(KYZA_PROJECT_STORAGE_KEY, deterministicRaw)
deterministicStorageB.seed(KYZA_PROJECT_STORAGE_KEY, deterministicRaw)
const deterministicA = listKyzaProjects(deterministicStorageA)
const deterministicB = listKyzaProjects(deterministicStorageB)
assert(deterministicA.ok && deterministicB.ok, "A V1 Project without an ID must migrate in both repositories.")
assert(
  deterministicA.value[0]?.id === deterministicB.value[0]?.id,
  "The same evidence-backed missing-ID record must receive the same deterministic Project ID.",
)
assertJsonEqual(deterministicA.value, deterministicB.value, "Repeated migration must be deterministic.")

const legacyCardStorage = new MemoryStorage()
const legacyCard = {
  id: "legacy-saved-card-continuity",
  name: "Legacy saved card continuity",
  packId: "k-seal-pouch",
  spec: extendedSpec,
  updatedAt: timestamp,
}
legacyCardStorage.seed(KYZA_PROJECT_STORAGE_KEY, JSON.stringify([legacyCard]))
const openedLegacyCard = loadRequestedProject(legacyCard.id, legacyCardStorage)
assert(openedLegacyCard.ok, "The known old saved-card shape must migrate through the real Project Open route.")
assert(openedLegacyCard.value.project.schemaVersion === 1, "The old saved card must become a canonical V1 Project.")
assert(openedLegacyCard.value.project.cutter.packType === "k-seal-pouch", "Legacy migration must retain pack type.")
assertJsonEqual(openedLegacyCard.value.spec, extendedSpec, "Legacy migration must not regenerate Cutter geometry.")
const legacyCardWrites = legacyCardStorage.writes
assert(loadRequestedProject(legacyCard.id, legacyCardStorage).ok, "The migrated old saved card must reopen.")
assert(legacyCardStorage.writes === legacyCardWrites, "Legacy saved-card migration must be idempotent.")

const duplicateStorage = new MemoryStorage()
assert(saveKyzaProject(project, duplicateStorage).ok, "Duplicate identity fixture must save.")
const duplicated = duplicateKyzaProject(project.id, duplicateStorage, "Independent duplicate")
assert(duplicated.ok && duplicated.value.cutter, "A Cutter Project must duplicate.")
const sourceElementIds = new Set(project.cutter.identityMap.elements.map(({ id }) => id))
const duplicateElementIds = duplicated.value.cutter.identityMap.elements.map(({ id }) => id)
assert(
  duplicateElementIds.every((id) => !sourceElementIds.has(id)),
  "A duplicated Project must receive independent Cutter element IDs.",
)
assertJsonEqual(duplicated.value.cutter.legacySpec, project.cutter.legacySpec, "Duplicate identity remapping must not change geometry.")
assert(project.cutter.identityMap.elements.every(({ id }) => sourceElementIds.has(id)), "Duplication must not mutate the source Project.")
assert(duplicated.value.validationRuns === undefined, "A duplicate must not inherit Validation Run history.")
assert(duplicated.value.validationAcknowledgements === undefined, "A duplicate must not inherit acknowledgement history.")
assert(duplicated.value.exportAuditRecords === undefined, "A duplicate must not inherit export history.")

const unknownTopLevel = {
  ...project,
  futureProjectEngineering: { toleranceMm: 0.2 },
}
const unknownTopLevelResult = parseKyzaProject(unknownTopLevel)
assert(unknownTopLevelResult.ok === false, "Unknown top-level Project data must be rejected instead of silently removed.")
assert(
  unknownTopLevelResult.errors.some((error) => error.includes("futureProjectEngineering")),
  "Unknown top-level diagnostics must identify the unsupported field.",
)
const unknownCutter = {
  ...project,
  cutter: {
    ...project.cutter,
    futureCutterEngineering: { pressureBar: 2.5 },
  },
}
const unknownCutterResult = parseKyzaProject(unknownCutter)
assert(unknownCutterResult.ok === false, "Unknown Cutter-document data must be rejected instead of silently removed.")
assert(
  unknownCutterResult.errors.some((error) => error.includes("futureCutterEngineering")),
  "Unknown Cutter diagnostics must identify the unsupported field.",
)

const retryBase = loadKyzaProject(project.id, storage)
assert(retryBase.ok && retryBase.value.cutter, "Conflict retry must reload the current Project.")
const retryCandidate = updateKyzaProject({
  project: retryBase.value,
  reason: "controls-edit",
  expectedRevision: retryBase.value.revision,
  update: {
    type: "patch-legacy-spec",
    patch: { width: retryBase.value.cutter.legacySpec.width + 5 },
  },
})
assert(retryCandidate.ok && retryCandidate.project, "Reloaded conflict retry must produce a valid candidate.")
assert(
  saveKyzaProject(retryCandidate.project, storage, { expectedRevision: retryBase.value.revision }).ok,
  "Reloading after conflict must allow a successful retry.",
)

const implicitConflictStorage = new MemoryStorage()
assert(saveKyzaProject(project, implicitConflictStorage).ok, "Implicit conflict fixture must save.")
const implicitBase = loadKyzaProject(project.id, implicitConflictStorage)
assert(implicitBase.ok && implicitBase.value.cutter, "Implicit conflict fixture must reopen.")
const implicitFirst = updateKyzaProject({
  project: implicitBase.value,
  reason: "controls-edit",
  update: {
    type: "patch-legacy-spec",
    patch: { width: implicitBase.value.cutter.legacySpec.width + 1 },
  },
})
const implicitSecond = updateKyzaProject({
  project: implicitBase.value,
  reason: "controls-edit",
  update: {
    type: "patch-legacy-spec",
    patch: { width: implicitBase.value.cutter.legacySpec.width + 2 },
  },
})
assert(implicitFirst.ok && implicitFirst.project && implicitSecond.ok && implicitSecond.project, "Concurrent implicit candidates must be valid.")
assert(saveKyzaProject(implicitFirst.project, implicitConflictStorage).ok, "First implicit editor must save.")
const implicitStale = saveKyzaProject(implicitSecond.project, implicitConflictStorage)
assert(implicitStale.ok === false, "Repository protection must reject a same-revision overwrite even when a caller omits expectedRevision.")

const falseValueStorage = new MemoryStorage()
const falseDraft = setPackGenField(draft, "zipEnabled", false)
const falseValueProject = createKyzaProjectV1({
  id: "continuity-explicit-false",
  name: "Explicit false continuity",
  projectDraft: {
    ...falseDraft,
    id: "continuity-explicit-false",
    name: "Explicit false continuity",
  },
  createdAt: timestamp,
  updatedAt: timestamp,
})
assert(saveKyzaProject(falseValueProject, falseValueStorage).ok, "Explicit false fixture must save.")
const falseValueReopened = loadKyzaProject(falseValueProject.id, falseValueStorage)
assert(falseValueReopened.ok, "Explicit false fixture must reopen.")
assert(falseValueReopened.value.projectDraft?.workspace?.fields.zipEnabled.value === false, "Explicit false Pack values must survive reopen.")

const unprovenValidationStorage = new MemoryStorage()
const unprovenValidation = JSON.parse(JSON.stringify(withEvidence)) as Record<string, unknown>
delete unprovenValidation.revision
unprovenValidationStorage.seed(KYZA_PROJECT_STORAGE_KEY, JSON.stringify([unprovenValidation]))
const unprovenValidationLoad = listKyzaProjects(unprovenValidationStorage)
assert(unprovenValidationLoad.ok, "A V1 Project with an unproven legacy revision must migrate.")
assert(unprovenValidationLoad.value[0]?.latestValidationRun === undefined, "Unproven validation must not remain current after revision migration.")
assert(
  unprovenValidationLoad.value[0]?.validationRuns?.some(({ id }) => id === validationRun.id),
  "Unproven validation must remain available as historical evidence.",
)

for (const packType of [
  "flowwrap",
  "pillow-pack",
  "sachet-3-side-seal",
  "sachet-4-side-seal",
  "doy-pouch",
]) {
  const packModule = getPackModule(packType)
  assert(packModule, `${packType} must remain registered.`)
  const isolated = createKyzaProjectV1({
    id: `continuity-${packType}`,
    name: `Continuity ${packType}`,
    packType,
    legacySpec: packModule.getDefaults(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  const isolatedStorage = new MemoryStorage()
  assert(saveKyzaProject(isolated, isolatedStorage).ok, `${packType} must save.`)
  const isolatedReopened = loadKyzaProject(isolated.id, isolatedStorage)
  assert(isolatedReopened.ok && isolatedReopened.value.cutter?.packType === packType, `${packType} must reopen without cross-mapping.`)
}

console.log("Beta Project continuity, migration, evidence, and conflict coverage passed.")
