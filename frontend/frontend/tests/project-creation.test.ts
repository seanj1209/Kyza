import { packModules } from "../apps/web/src/packs"
import {
  createCanonicalProject,
  type CreateProjectRequest,
} from "../apps/web/src/project/projectCreationService"
import { createEmptyPackGenDraft } from "../apps/web/src/packGen/packGenProjectService"
import { loadRequestedProject } from "../apps/web/src/project/projectOpenService"
import {
  KYZA_PROJECT_STORAGE_KEY,
  listKyzaProjects,
  parseKyzaProject,
  type KyzaProjectStorage,
} from "../packages/cutter-engine/project"

function assert(condition: boolean, message = "Assertion failed") {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message = "Values differ") {
  assert(actual === expected, `${message}: ${String(actual)} !== ${String(expected)}`)
}

function assertJsonEqual(actual: unknown, expected: unknown, message = "Values differ") {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)
}

class MemoryStorage implements KyzaProjectStorage {
  readonly values = new Map<string, string>()
  writes = 0
  reads = 0
  failWrites = false
  failReadAt?: number

  getItem(key: string) {
    this.reads += 1
    if (this.reads === this.failReadAt) throw new Error("read failed")
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("quota exceeded")
    this.writes += 1
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

const packGenRequest: CreateProjectRequest = {
  projectId: "project / pack-gen?1",
  projectName: "Pack Gen Parent",
  customerOrBrand: "Kyza Foods",
  productName: "Bakery Bar",
  jobReference: "JOB-603",
  description: "Single serve wrapped product",
  notes: "Confirm dimensions in Pack Gen",
  startingRoute: "pack-gen",
}

const packGenStorage = new MemoryStorage()
const packGenCreated = createCanonicalProject(packGenRequest, { storage: packGenStorage })
assert(packGenCreated.ok, "Pack Gen parent Project must be created.")
if (packGenCreated.ok === false) throw new Error(packGenCreated.errors.join(" "))
assertEqual(packGenCreated.project.id, packGenRequest.projectId)
assertEqual(packGenCreated.project.revision, 1)
assertEqual(packGenCreated.project.cutter, undefined, "Pack Gen creation must not invent Cutter geometry.")
assertJsonEqual(packGenCreated.project.metadata, {
  customerOrBrand: "Kyza Foods",
  productName: "Bakery Bar",
  jobReference: "JOB-603",
  description: "Single serve wrapped product",
  notes: "Confirm dimensions in Pack Gen",
})
assertEqual(packGenCreated.destinationUrl, "/ai-studio?projectId=project+%2F+pack-gen%3F1")
assertEqual(packGenStorage.writes, 1)
const draftCutterOpen = loadRequestedProject(packGenCreated.project.id, packGenStorage)
assert(
  draftCutterOpen.ok === false
    && draftCutterOpen.errors.some((error) => error.includes("does not contain a Cutter Specification")),
  "A pre-Cutter Project must fail honestly if sent to Cutter Studio.",
)

const attachedDraftStorage = new MemoryStorage()
const attachedDraft = {
  ...createEmptyPackGenDraft(packGenCreated.project),
  id: "project-with-attached-draft",
  name: "Attached Pack Specification",
  productPrompt: "flowwrap protein bar 350 x 220",
}
const attachedDraftProject = createCanonicalProject({
  projectId: attachedDraft.id,
  projectName: attachedDraft.name,
  customerOrBrand: "Kyza Foods",
  jobReference: "ATTACHED-101",
  startingRoute: "pack-gen",
  packType: "flowwrap",
  projectDraft: attachedDraft,
}, { storage: attachedDraftStorage })
assert(attachedDraftProject.ok, "Canonical Project creation must accept an identity-matched Pack Gen draft.")
if (attachedDraftProject.ok === false) throw new Error(attachedDraftProject.errors.join(" "))
assertJsonEqual(attachedDraftProject.project.projectDraft, attachedDraft, "Project creation must attach the current Pack Gen draft in its first canonical write.")
assertEqual(attachedDraftStorage.writes, 1, "Attaching a Pack Gen draft must create one canonical Project write.")
const repeatedAttachedDraft = createCanonicalProject({
  projectId: attachedDraft.id,
  projectName: attachedDraft.name,
  customerOrBrand: "Kyza Foods",
  jobReference: "ATTACHED-101",
  startingRoute: "pack-gen",
  packType: "flowwrap",
  projectDraft: attachedDraft,
}, { storage: attachedDraftStorage })
assert(repeatedAttachedDraft.ok, "Retrying the same attached draft submission must recover its canonical Project.")
assertEqual(attachedDraftStorage.writes, 1, "Retrying attached draft creation must not write a duplicate Project.")

const repeated = createCanonicalProject(packGenRequest, { storage: packGenStorage })
assert(repeated.ok, "A repeated confirmed submission must resolve to its existing Project.")
assertEqual(packGenStorage.writes, 1, "Idempotent retry must not write a second Project.")
const onePackGenProject = listKyzaProjects(packGenStorage)
assert(onePackGenProject.ok && onePackGenProject.value.length === 1)

const omittedMetadataStorage = new MemoryStorage()
const omittedMetadata = createCanonicalProject({
  projectId: "metadata-omitted",
  projectName: "No Metadata",
  startingRoute: "pack-gen",
}, { storage: omittedMetadataStorage })
assert(omittedMetadata.ok && omittedMetadata.project.metadata === undefined)

const oldProject = {
  schemaVersion: 1,
  id: "old-parent-project",
  revision: 1,
  name: "Old Parent",
  createdAt: "2026-07-19T10:00:00.000Z",
  updatedAt: "2026-07-19T10:00:00.000Z",
}
const parsedOldProject = parseKyzaProject(oldProject)
assert(parsedOldProject.ok, "Older Projects without metadata must remain valid.")

const cutterStorage = new MemoryStorage()
const selectedPack = packModules[0]
assert(Boolean(selectedPack), "A supported production pack is required for this test.")
const cutterCreated = createCanonicalProject({
  projectId: "project / cutter?1",
  projectName: "Direct Cutter",
  customerOrBrand: "Same Brand",
  startingRoute: "cutter-studio",
  packType: selectedPack.id,
}, { storage: cutterStorage })
assert(cutterCreated.ok, "Cutter Project must be created from deterministic pack defaults.")
if (cutterCreated.ok === false) throw new Error(cutterCreated.errors.join(" "))
assertEqual(cutterCreated.project.cutter?.packType, selectedPack.id)
assertJsonEqual(cutterCreated.project.cutter?.legacySpec, selectedPack.getDefaults())
assertEqual(cutterCreated.project.revision, 1)
assertEqual(cutterCreated.destinationUrl, "/cutter?projectId=project+%2F+cutter%3F1")
const opened = loadRequestedProject(cutterCreated.project.id, cutterStorage)
assert(opened.ok, "A newly created Cutter Project must open through the existing handoff.")
if (opened.ok) assertJsonEqual(opened.value.project, cutterCreated.project)

const sameNameStorage = new MemoryStorage()
const sameNameA = createCanonicalProject({
  projectId: "same-name-a",
  projectName: "Repeated Name",
  startingRoute: "pack-gen",
}, { storage: sameNameStorage })
const sameNameB = createCanonicalProject({
  projectId: "same-name-b",
  projectName: "Repeated Name",
  startingRoute: "pack-gen",
}, { storage: sameNameStorage })
assert(sameNameA.ok && sameNameB.ok)
const sameNames = listKyzaProjects(sameNameStorage)
assert(sameNames.ok && sameNames.value.length === 2, "Project name must not be used as identity.")

const noStorage = createCanonicalProject({
  projectName: "No Storage",
  startingRoute: "pack-gen",
})
assert(noStorage.ok === false, "Unavailable storage must return a controlled failure.")

const writeFailureStorage = new MemoryStorage()
writeFailureStorage.failWrites = true
const writeFailure = createCanonicalProject({
  projectId: "write-failure",
  projectName: "Write Failure",
  startingRoute: "pack-gen",
}, { storage: writeFailureStorage })
assert(writeFailure.ok === false)
assertEqual(writeFailureStorage.values.has(KYZA_PROJECT_STORAGE_KEY), false)

const unsupported = createCanonicalProject({
  projectId: "unsupported-pack",
  projectName: "Unsupported",
  startingRoute: "cutter-studio",
  packType: "not-a-pack",
}, { storage: new MemoryStorage() })
assert(unsupported.ok === false)

const invalidProject = createCanonicalProject({
  projectId: "invalid-project",
  projectName: "Invalid Project",
  startingRoute: "cutter-studio",
  packType: selectedPack.id,
}, {
  storage: new MemoryStorage(),
  generatePackDefaults: () => ({
    ok: true,
    value: { packId: selectedPack.id, spec: { ...selectedPack.getDefaults(), width: Number.NaN } },
  }),
})
assert(invalidProject.ok === false, "Invalid canonical Cutter data must not be saved.")

type CyclicSpec = ReturnType<typeof selectedPack.getDefaults> & { cycle?: unknown }
const specWithCycle = { ...selectedPack.getDefaults() } as CyclicSpec
specWithCycle.cycle = specWithCycle
const serializerFailureStorage = new MemoryStorage()
const serializerFailure = createCanonicalProject({
  projectId: "serializer-failure",
  projectName: "Serializer Failure",
  startingRoute: "cutter-studio",
  packType: selectedPack.id,
}, {
  storage: serializerFailureStorage,
  generatePackDefaults: () => ({
    ok: true,
    value: { packId: selectedPack.id, spec: specWithCycle },
  }),
})
assert(serializerFailure.ok === false, "Serializer failure must be controlled.")
assertEqual(serializerFailureStorage.writes, 0)

const defaultsFailure = createCanonicalProject({
  projectId: "defaults-failure",
  projectName: "Defaults Failure",
  startingRoute: "cutter-studio",
  packType: selectedPack.id,
}, {
  storage: new MemoryStorage(),
  generatePackDefaults: () => ({ ok: false, errors: ["Defaults unavailable."] }),
})
assert(defaultsFailure.ok === false)

const verificationStorage = new MemoryStorage()
verificationStorage.failReadAt = 3
const verificationFailure = createCanonicalProject({
  projectId: "verification-failure",
  projectName: "Verification Failure",
  startingRoute: "pack-gen",
}, { storage: verificationStorage })
assert(verificationFailure.ok === false, "Post-save verification failure must not report success.")
const verificationRetry = createCanonicalProject({
  projectId: "verification-failure",
  projectName: "Verification Failure",
  startingRoute: "pack-gen",
}, { storage: verificationStorage })
assert(
  verificationRetry.ok,
  `Retry after an uncertain write must recover the same saved Project: ${verificationRetry.ok === false ? verificationRetry.errors.join(" ") : ""}`,
)
assertEqual(verificationStorage.writes, 1, "Uncertain retry must not create or rewrite a duplicate.")

console.log("Canonical Project creation, persistence, routing, and failure handling verified")
