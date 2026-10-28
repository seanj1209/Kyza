import { loadValidationProjectSummaries } from "../apps/web/src/klyro/validation/validationAdapter"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  CUTNFLOW_PROJECT_STORAGE_KEY,
  createCutNFlowProjectV1,
  projectFromLegacySpec,
  type CutNFlowProjectStorage,
} from "../packages/cutter-engine/project"
import {
  filterProjectSummaries,
  loadDashboardProjectSummaries,
} from "../apps/web/src/klyro/dashboard/projectAdapter"
import {
  deleteDashboardProject,
  renameDashboardProject,
} from "../apps/web/src/klyro/dashboard/projectActions"
import {
  createEmptyPackGenDraft,
  setPackGenField,
} from "../apps/web/src/packGen/packGenProjectService"

function assert(condition: boolean, message = "Assertion failed") {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message = "Values differ") {
  assert(actual === expected, `${message}: ${String(actual)} !== ${String(expected)}`)
}

function assertJsonEqual(actual: unknown, expected: unknown, message = "Values differ") {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)
}

class MemoryStorage implements CutNFlowProjectStorage {
  readonly values = new Map<string, string>()
  writeCount = 0

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.writeCount += 1
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.writeCount += 1
    this.values.delete(key)
  }
}

const spec: FlowwrapSpec = {
  width: 420,
  height: 180,
  seal: 10,
  bleed: 3,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 10,
    height: 5,
    color: "black",
    offsetX: 2,
    offsetY: 1,
  },
}

const emptyStorage = new MemoryStorage()
assertJsonEqual(loadDashboardProjectSummaries(emptyStorage), { status: "ready", projects: [] })
assertEqual(emptyStorage.writeCount, 0)

const validStorage = new MemoryStorage()
const olderProject = projectFromLegacySpec("pillow-pack", "Retail Wrap", spec, {
  id: "project-retail-101",
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-02T09:00:00.000Z",
})
const newerProject = projectFromLegacySpec("flow-wrap", "Bakery Launch", spec, {
  id: "project-bakery-202",
  createdAt: "2026-07-03T09:00:00.000Z",
  updatedAt: "2026-07-04T09:00:00.000Z",
})
validStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, JSON.stringify([olderProject, newerProject]))

const validResult = loadDashboardProjectSummaries(validStorage)
assertEqual(validResult.status, "ready")
if (validResult.status !== "ready") throw new Error("Expected valid Projects to load.")
assertJsonEqual(validResult.projects.map((project) => project.id), ["project-bakery-202", "project-retail-101"])
assertJsonEqual(validResult.projects[0], {
  id: "project-bakery-202",
  name: "Bakery Launch",
  packType: "flow-wrap",
  updatedAt: "2026-07-04T09:00:00.000Z",
  revision: 1,
  cutterSpec: spec,
  stageLabel: "Cutter Project",
  destinationUrl: "/cutter?projectId=project-bakery-202",
})
assertEqual(validStorage.writeCount, 0)

const renamed = renameDashboardProject("project-bakery-202", "Bakery Launch V2", validStorage)
assertEqual(renamed.ok, true)
const afterRename = loadDashboardProjectSummaries(validStorage)
assertEqual(afterRename.status, "ready")
if (afterRename.status !== "ready") throw new Error("Expected renamed Projects to load.")
assertEqual(afterRename.projects[0].name, "Bakery Launch V2")
assertEqual(afterRename.projects[0].revision, 2)

const duplicateRename = renameDashboardProject("project-retail-101", "Bakery Launch V2", validStorage)
assertEqual(duplicateRename.ok, false)

const deleted = deleteDashboardProject("project-bakery-202", validStorage)
assertEqual(deleted.ok, true)
const afterDelete = loadDashboardProjectSummaries(validStorage)
assertEqual(afterDelete.status, "ready")
if (afterDelete.status !== "ready") throw new Error("Expected Projects to load after deletion.")
assertJsonEqual(afterDelete.projects.map((project) => project.id), ["project-retail-101"])

assertJsonEqual(filterProjectSummaries(validResult.projects, "bakery").map((project) => project.id), ["project-bakery-202"])
assertJsonEqual(filterProjectSummaries(validResult.projects, "PILLOW").map((project) => project.id), ["project-retail-101"])
assertJsonEqual(filterProjectSummaries(validResult.projects, "retail-101").map((project) => project.id), ["project-retail-101"])

const draftStorage = new MemoryStorage()
const draftProject = createCutNFlowProjectV1({
  id: "draft-project-303",
  name: "Early Pack Setup",
  metadata: { requestedPackType: "pillow-pack" },
  createdAt: "2026-07-05T09:00:00.000Z",
  updatedAt: "2026-07-05T09:00:00.000Z",
})
draftStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, JSON.stringify([draftProject]))
const draftResult = loadDashboardProjectSummaries(draftStorage)
assertEqual(draftResult.status, "ready")
if (draftResult.status !== "ready") throw new Error("Expected draft Project to load.")
assertJsonEqual(draftResult.projects[0], {
  id: "draft-project-303",
  name: "Early Pack Setup",
  packType: "pillow-pack",
  updatedAt: "2026-07-05T09:00:00.000Z",
  revision: 1,
  stageLabel: "Pack Setup",
  destinationUrl: "/ai-studio?projectId=draft-project-303",
})
assertEqual(draftStorage.writeCount, 0)

const packDraftStorage = new MemoryStorage()
let packDraft = createEmptyPackGenDraft(draftProject)
packDraft = setPackGenField(packDraft, "packType", "pillow-pack")
const projectWithPackDraft = createCutNFlowProjectV1({
  id: draftProject.id,
  name: draftProject.name,
  metadata: draftProject.metadata,
  createdAt: draftProject.createdAt,
  updatedAt: draftProject.updatedAt,
  projectDraft: packDraft,
})
packDraftStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, JSON.stringify([projectWithPackDraft]))
const packDraftResult = loadDashboardProjectSummaries(packDraftStorage)
assertEqual(packDraftResult.status, "ready")
if (packDraftResult.status !== "ready") throw new Error("Expected Pack Specification draft to load.")
assertEqual(packDraftResult.projects[0].stageLabel, "Pack Specification: Draft")
assertEqual(packDraftResult.projects[0].destinationUrl, "/ai-studio?projectId=draft-project-303")
assertEqual(packDraftStorage.writeCount, 0)

const invalidStorage = new MemoryStorage()
invalidStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, "not-json")
const invalidResult = loadDashboardProjectSummaries(invalidStorage)
assertEqual(invalidResult.status, "error")
assertEqual(invalidStorage.writeCount, 0)
assertEqual(invalidStorage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY), "not-json")

const legacyStorage = new MemoryStorage()
const legacyWithoutId = { ...olderProject, id: undefined }
const legacyRaw = JSON.stringify([legacyWithoutId])
legacyStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, legacyRaw)
const legacyResult = loadDashboardProjectSummaries(legacyStorage)
assertEqual(legacyResult.status, "error", "A migration that requires persistence must fail read-only.")
assertEqual(legacyStorage.writeCount, 0)
assertEqual(legacyStorage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY), legacyRaw)

console.log("Klyro read-only Project adapter and search verified")


// A saved specification is a valid Project without a CutterDocument.
assertJsonEqual(loadValidationProjectSummaries(packDraftStorage), { status: "ready", projects: [] }, "Draft-only storage must not crash Validation Centre")
assertEqual(packDraftStorage.writeCount, 0, "Validation Centre must leave saved drafts unchanged")
const mixedValidationStorage = new MemoryStorage()
const mixedRaw = JSON.stringify([projectWithPackDraft, olderProject])
mixedValidationStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, mixedRaw)
const mixedValidation = loadValidationProjectSummaries(mixedValidationStorage)
assertEqual(mixedValidation.status, "ready")
assertEqual(mixedValidation.projects.length, 1, "Only Projects with cutters should be offered for Cutter validation")
assertEqual(mixedValidation.projects[0].id, olderProject.id)
assertEqual(mixedValidation.projects[0].status, "not_run")
assertEqual(mixedValidationStorage.writeCount, 0)
assertEqual(mixedValidationStorage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY), mixedRaw)
console.log("Validation Centre handles draft-only and mixed Project storage without mutation")
