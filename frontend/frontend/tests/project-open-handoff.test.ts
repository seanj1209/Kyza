import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  chooseCutterStartupSource,
  createCutterProjectUrl,
  parseRequestedProjectId,
} from "../apps/web/src/project/projectNavigation"
import {
  loadRequestedProject,
  prepareProjectPresentationCard,
  type CutterProjectPresentationCard,
} from "../apps/web/src/project/projectOpenService"
import { updateCutNFlowProject } from "../apps/web/src/project/projectUpdateService"
import {
  CUTNFLOW_PROJECT_STORAGE_KEY,
  loadCutNFlowProject,
  projectFromLegacySpec,
  saveCutNFlowProject,
  type CutNFlowProjectStorage,
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

const timestamp = "2026-07-19T10:00:00.000Z"
const spec: FlowwrapSpec = {
  width: 440,
  height: 200,
  seal: 10,
  seals: { top: 10, bottom: 11, left: 12, right: 13 },
  bleed: 3,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 10,
    height: 5,
    color: "black",
    offsetX: 2,
    offsetY: 3,
  },
  safeZones: [{ id: "safe-1", label: "Safe", x: 5, y: 6, width: 50, height: 40 }],
}

const project = projectFromLegacySpec("pillow-pack", "Rich Project", spec, {
  id: "project / rich?1",
  revision: 7,
  createdAt: timestamp,
  updatedAt: timestamp,
  projectDraft: {
    id: "project / rich?1",
    name: "Rich Project",
    status: "draft",
    source: "pack_generator",
    createdAt: timestamp,
    updatedAt: timestamp,
    productPrompt: "wrapped bakery bar",
    packSpecification: {
      packTypeId: "pillow_pack",
      displayName: "Pillow Pack",
      enginePackTypeId: "pillow-pack",
      source: "pack_generator",
      confidence: "medium",
      assumptions: ["Dimensions require confirmation."],
      starterDefaults: {
        widthMm: 440,
        heightMm: 200,
        sealsMm: { top: 10, bottom: 11, left: 12, right: 13 },
        bleedMm: 3,
        minimumSafeZoneMm: 5,
        eyemarkCount: 1,
        substrate: "film",
        dimensionsRequireConfirmation: true,
      },
    },
    history: [{
      id: "project / rich?1:accepted",
      action: "pack_recommendation_accepted",
      createdAt: timestamp,
    }],
  },
  artwork: { assetIds: ["asset-1"], placement: { x: 12, y: 18 } },
  exportSettings: { format: "svg", preserveVector: true, includeLayers: true },
})

const projectUrl = createCutterProjectUrl(project.id)
assertEqual(projectUrl, "/cutter?projectId=project+%2F+rich%3F1")
assertJsonEqual(parseRequestedProjectId(projectUrl.split("?")[1]), {
  status: "valid",
  projectId: project.id,
})
assertJsonEqual(parseRequestedProjectId(""), { status: "absent" })
assertEqual(parseRequestedProjectId("?projectId=").status, "invalid")
assertEqual(parseRequestedProjectId("?projectId=a&projectId=b").status, "invalid")
assertEqual(parseRequestedProjectId("?projectId=%E0%A4%A").status, "invalid")
assertEqual(parseRequestedProjectId(`?projectId=${"a".repeat(257)}`).status, "invalid")

const explicitRequest = parseRequestedProjectId(`?projectId=${encodeURIComponent(project.id)}`)
assertEqual(chooseCutterStartupSource(explicitRequest, true), "requested-project")
assertEqual(
  chooseCutterStartupSource({ status: "invalid", message: "bad" }, true),
  "requested-project",
  "Malformed explicit requests must not fall through to a handoff.",
)
assertEqual(chooseCutterStartupSource({ status: "absent" }, true), "existing-handoff")
assertEqual(chooseCutterStartupSource({ status: "absent" }, false), "default")

const storage = new MemoryStorage()
storage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, JSON.stringify([project]))
const storedBeforeOpen = storage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY)
const opened = loadRequestedProject(project.id, storage)
assert(opened.ok, "The exact canonical Project must load.")
if (opened.ok === false) throw new Error(opened.errors.join(" "))
assertJsonEqual(opened.value.project, project, "Every populated Project field must survive opening.")
assertJsonEqual(opened.value.spec, project.cutter.legacySpec, "Cutter spec must come from the Project.")
assertEqual(storage.writeCount, 0, "Opening a Project must not write storage.")
assertEqual(storage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY), storedBeforeOpen)

const missing = loadRequestedProject("missing-project", storage)
assert(
  missing.ok === false && missing.errors.some((error) => error.includes("was not found")),
)
assertEqual(storage.writeCount, 0)

const corruptStorage = new MemoryStorage()
corruptStorage.values.set(CUTNFLOW_PROJECT_STORAGE_KEY, "not-json")
const corruptBefore = corruptStorage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY)
const corrupt = loadRequestedProject(project.id, corruptStorage)
assert(!corrupt.ok, "Corrupt storage must return a controlled failure.")
assertEqual(corruptStorage.writeCount, 0)
assertEqual(corruptStorage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY), corruptBefore)

const existingCard: CutterProjectPresentationCard = {
  id: "legacy-presentation-card",
  name: "Old label",
  packId: project.cutter.packType,
  spec,
  project,
  updatedAt: timestamp,
}
const associated = prepareProjectPresentationCard([existingCard], project, opened.value.spec)
assertEqual(associated.cardId, existingCard.id)
assertEqual(associated.created, false)
assertEqual(associated.cards.length, 1, "Opening must not duplicate an existing presentation card.")

const created = prepareProjectPresentationCard([], project, opened.value.spec)
assertEqual(created.created, true)
assertEqual(created.cards.length, 1)
const reopened = prepareProjectPresentationCard(created.cards, project, opened.value.spec)
assertEqual(reopened.created, false)
assertEqual(reopened.cardId, created.cardId)
assertEqual(reopened.cards.length, 1, "Repeated opening must not duplicate an in-memory card.")

const edited = updateCutNFlowProject({
  project: opened.value.project,
  reason: "test-fixture",
  expectedRevision: opened.value.project.revision,
  update: { type: "patch-legacy-spec", patch: { width: 460 } },
})
assert(edited.ok && Boolean(edited.project), "An opened Project must remain editable.")
if (!edited.project) throw new Error(edited.errors.join(" "))
const saved = saveCutNFlowProject(edited.project, storage)
assert(saved.ok, "The edited Project must save through the canonical service.")
const reloaded = loadCutNFlowProject(project.id, storage)
assert(reloaded.ok, "The saved Project must retain its canonical ID.")
if (reloaded.ok === false) throw new Error(reloaded.errors.join(" "))
assertEqual(reloaded.value.id, project.id)
assertEqual(reloaded.value.revision, project.revision + 1)
assertEqual(reloaded.value.cutter.legacySpec.width, 460)
assertJsonEqual(reloaded.value.projectDraft, project.projectDraft)
assertJsonEqual(reloaded.value.artwork, project.artwork)
assertJsonEqual(reloaded.value.exportSettings, project.exportSettings)
const canonicalCollection = JSON.parse(storage.getItem(CUTNFLOW_PROJECT_STORAGE_KEY) ?? "[]")
assertEqual(canonicalCollection.filter((item: { id?: string }) => item.id === project.id).length, 1)

console.log("Dashboard-to-Cutter Project open handoff verified")
