import { packModules } from "../apps/web/src/packs"
import { plainWebPack } from "../apps/web/src/packs/plainWebPack"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  KYZA_PROJECT_COORDINATE_SPACE,
  KYZA_PROJECT_STORAGE_KEY,
  KYZA_PROJECT_UNITS,
  createKyzaProjectV1,
  duplicateKyzaProject,
  exportKyzaProjectJson,
  importKyzaProjectJson,
  legacySpecFromProject,
  listKyzaProjects,
  loadKyzaProject,
  parseKyzaProject,
  projectFromLegacySpec,
  saveKyzaProject,
  type KyzaProjectStorage
} from "../packages/cutter-engine/project"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertJsonEqual(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)
}

class MemoryStorage implements KyzaProjectStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

const timestamp = "2026-07-02T10:00:00.000Z"
const oneEyemarkSpec: FlowwrapSpec = {
  width: 440,
  height: 200,
  seal: 10,
  bleed: 3,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 10,
    height: 5,
    color: "black",
    offsetX: 2,
    offsetY: 1
  }
}
const twoEyemarkSpec: FlowwrapSpec = {
  ...oneEyemarkSpec,
  eyeMarks: {
    count: 2,
    position: "top",
    width: 10,
    height: 5,
    width2: 12,
    height2: 6,
    color: "dark-blue",
    offsetX: 2,
    offsetY: 1,
    offsetX2: -3,
    offsetY2: 4,
    manualPositioned: true,
    manualPositioned2: true
  }
}

const project = projectFromLegacySpec("pillow-pack", "Contract Test", oneEyemarkSpec, {
  id: "project-contract-test",
  createdAt: timestamp,
  updatedAt: timestamp,
  exportSettings: {
    format: "svg",
    preserveVector: true,
    includeLayers: true
  }
})

assert(project.schemaVersion === 1, "Project schema version must be 1.")
assert(project.revision === 1, "New project revision must start at 1.")
assert(project.cutter.units === KYZA_PROJECT_UNITS, "Project units must be mm.")
assert(
  project.cutter.coordinateSpace === KYZA_PROJECT_COORDINATE_SPACE,
  "Project coordinate space must remain legacy-flowwrap."
)

const projectWithDraft = projectFromLegacySpec(
  "pillow-pack",
  "Pack Generator Draft",
  oneEyemarkSpec,
  {
    id: "project-with-draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    projectDraft: {
      id: "project-with-draft",
      name: "Pack Generator Draft",
      status: "draft",
      source: "pack_generator",
      createdAt: timestamp,
      updatedAt: timestamp,
      productPrompt: "flow wrap cake bar",
      packSpecification: {
        packTypeId: "pillow_pack",
        displayName: "Pillow Pack",
        enginePackTypeId: "pillow-pack",
        source: "pack_generator",
        confidence: "medium",
        assumptions: ["Exact dimensions require confirmation."],
        starterDefaults: {
          widthMm: 440,
          heightMm: 200,
          sealsMm: { top: 10, bottom: 10, left: 10, right: 10 },
          bleedMm: 3,
          minimumSafeZoneMm: 5,
          eyemarkCount: 1,
          dimensionsRequireConfirmation: true
        }
      },
      history: [{
        id: "project-with-draft:pack-recommendation-accepted",
        action: "pack_recommendation_accepted",
        createdAt: timestamp
      }]
    }
  }
)
const parsedProjectWithDraft = parseKyzaProject(projectWithDraft)
assert(parsedProjectWithDraft.ok, "Project contract must accept Pack Generator draft metadata.")
if (parsedProjectWithDraft.ok) {
  assert(
    parsedProjectWithDraft.value.projectDraft?.packSpecification?.enginePackTypeId === "pillow-pack",
    "Project contract must preserve the mapped engine pack type ID."
  )
}

const validResult = parseKyzaProject(project)
assert(validResult.ok, "A valid Kyza project must parse.")
if (validResult.ok) {
  assert(validResult.value.metadata === undefined, "Older Cutter Projects without metadata must remain unchanged.")
}

const malformedResult = parseKyzaProject({
  ...project,
  cutter: { ...project.cutter, units: "in" }
})
assert(!malformedResult.ok, "A project with non-mm units must be rejected.")

const missingIdResult = parseKyzaProject({ ...project, id: undefined })
assert(missingIdResult.ok, "A missing project-level ID may be generated safely.")
if (missingIdResult.ok) {
  assert(missingIdResult.value.id.length > 0, "Generated project ID must not be empty.")
}
const missingRevisionResult = parseKyzaProject({ ...project, revision: undefined })
assert(missingRevisionResult.ok, "A Phase 1 project without revision must migrate to revision 1.")
if (missingRevisionResult.ok) {
  assert(missingRevisionResult.value.revision === 1, "Missing revision must normalise to 1.")
}
assert(
  !parseKyzaProject({ ...project, id: 42 }).ok,
  "An invalid project ID type must be rejected rather than replaced."
)

assertJsonEqual(
  legacySpecFromProject(project),
  oneEyemarkSpec,
  "Legacy spec adapter must preserve one-eyemark geometry without value loss."
)

const twoEyemarkProject = projectFromLegacySpec(
  "flowwrap",
  "Two Eyemarks",
  twoEyemarkSpec,
  {
    id: "project-two-eyemarks",
    createdAt: timestamp,
    updatedAt: timestamp
  }
)
const twoEyemarkParsed = parseKyzaProject(
  JSON.parse(JSON.stringify(twoEyemarkProject))
)
assert(twoEyemarkParsed.ok, "Two-eyemark project must survive JSON parsing.")
if (twoEyemarkParsed.ok) {
  assertJsonEqual(
    legacySpecFromProject(twoEyemarkParsed.value),
    twoEyemarkSpec,
    "Two-eyemark primary and secondary state must survive round-trip."
  )
}

const legacyWorkspaceWithoutTrim = createKyzaProjectV1({
  ...project,
  projectDraft: {
    id: project.id,
    name: project.name,
    status: "draft",
    source: "pack_generator",
    createdAt: timestamp,
    updatedAt: timestamp,
    productPrompt: "Legacy Pack Gen draft",
    workspace: {
      schemaVersion: 1,
      fields: Object.fromEntries([
        ...["packType", "productDescription", "orientation", "materialNotes", "machineConstraints", "openingRequirements", "foldsOrGussetNotes", "featuresNotes"]
          .map((field) => [field, { state: "missing", source: "preset" }]),
        ...["finishedWidthMm", "finishedHeightMm", "gussetMm", "fillWeightG", "fillVolumeMl", "sealTopMm", "sealBottomMm", "sealLeftMm", "sealRightMm", "eyemarkCount", "minimumSafeZoneMm", "bleedMm"]
          .map((field) => [field, { state: "missing", source: "preset" }]),
        ["zipEnabled", { state: "missing", source: "preset" }],
      ]) as never,
      assumptions: [],
      assumptionsReviewed: false,
      unresolvedQuestions: [],
      completion: {
        status: "Empty",
        requiredCompleted: [],
        requiredMissing: [],
        proposedAwaitingConfirmation: [],
        assumptionsAwaitingReview: 0,
      },
    },
    history: [],
  },
})
const legacyWorkspaceWithoutTrimParsed = parseKyzaProject(JSON.parse(JSON.stringify(legacyWorkspaceWithoutTrim)))
assert(legacyWorkspaceWithoutTrimParsed.ok, "Stored Pack Gen workspaces created before trimMm must remain readable.")

const registeredPackModules = [...packModules, plainWebPack]
registeredPackModules.forEach(packModule => {
  const spec = packModule.getDefaults()
  const wrapped = projectFromLegacySpec(packModule.id, packModule.name, spec, {
    id: `registered-${packModule.id}`,
    createdAt: timestamp,
    updatedAt: timestamp
  })
  const parsed = parseKyzaProject(JSON.parse(JSON.stringify(wrapped)))
  assert(parsed.ok, `Registered pack ${packModule.id} must round-trip.`)
  if (parsed.ok) {
    assert(parsed.value.cutter.packType === packModule.id, "Pack type must be preserved.")
    assert(parsed.value.cutter.units === "mm", "Registered pack units must be mm.")
    assert(
      parsed.value.cutter.coordinateSpace === "legacy-flowwrap",
      "Registered pack coordinate space must be legacy-flowwrap."
    )
    assertJsonEqual(
      legacySpecFromProject(parsed.value),
      spec,
      `Registered pack ${packModule.id} spec must not lose values.`
    )
  }
})

const storage = new MemoryStorage()
const saved = saveKyzaProject(project, storage)
assert(saved.ok, "Project must save through the versioned storage boundary.")
assert(storage.getItem(KYZA_PROJECT_STORAGE_KEY) !== null, "Versioned key must be used.")

const loaded = loadKyzaProject(project.id, storage)
assert(loaded.ok, "Saved project must load.")
if (loaded.ok) {
  assert(loaded.value.cutter.packType === "pillow-pack", "Loaded pack type must persist.")
  assertJsonEqual(
    legacySpecFromProject(loaded.value),
    oneEyemarkSpec,
    "Save/load must preserve legacySpec."
  )
}

const duplicate = duplicateKyzaProject(project.id, storage)
assert(duplicate.ok, "Saved project must duplicate.")
if (duplicate.ok) {
  assert(duplicate.value.id !== project.id, "Duplicate must receive a new project ID.")
  assertJsonEqual(
    legacySpecFromProject(duplicate.value),
    oneEyemarkSpec,
    "Duplicate must preserve cutter geometry."
  )
}

const listed = listKyzaProjects(storage)
assert(listed.ok && listed.value.length === 2, "Storage must contain source and duplicate.")

const migrationStorage = new MemoryStorage()
const projectWithoutId = { ...project } as Record<string, unknown>
delete projectWithoutId.id
migrationStorage.setItem(
  KYZA_PROJECT_STORAGE_KEY,
  JSON.stringify([projectWithoutId])
)
const migratedList = listKyzaProjects(migrationStorage)
assert(migratedList.ok, "Storage may safely migrate a missing project-level ID.")
if (migratedList.ok) {
  const generatedId = migratedList.value[0]?.id
  const reloadedList = listKyzaProjects(migrationStorage)
  assert(
    reloadedList.ok && reloadedList.value[0]?.id === generatedId,
    "A generated storage ID must be persisted and remain stable."
  )
}

const exported = exportKyzaProjectJson(twoEyemarkProject)
assert(exported.ok, "Valid project must export as JSON.")
if (exported.ok) {
  const importStorage = new MemoryStorage()
  const imported = importKyzaProjectJson(exported.value, importStorage)
  assert(imported.ok, "Exported project JSON must import through validation.")
  if (imported.ok) {
    assertJsonEqual(
      legacySpecFromProject(imported.value),
      twoEyemarkSpec,
      "JSON export/import must preserve the two-eyemark spec."
    )
  }
}

assert(
  !importKyzaProjectJson("{bad json", new MemoryStorage()).ok,
  "Malformed JSON import must return an error result."
)

const appearanceSpec: FlowwrapSpec = {
  ...twoEyemarkSpec,
  elementAppearance: { bbe: { color: "#9e1316", thickness: .5, lineStyle: "dashed", opacity: .8 }, windows: { fill: "hatch" }, main: { fontSize: 6 } }
}
const appearanceProject = projectFromLegacySpec("flowwrap", "Appearance round-trip", appearanceSpec)
const appearanceExport = exportKyzaProjectJson(appearanceProject)
assert(appearanceExport.ok, "Appearance project must export.")
if (appearanceExport.ok) {
  const appearanceImport = importKyzaProjectJson(appearanceExport.value, new MemoryStorage())
  assert(appearanceImport.ok, "Appearance JSON must import through the existing contract.")
  if (appearanceImport.ok) assertJsonEqual(legacySpecFromProject(appearanceImport.value), appearanceSpec, "Appearance and geometry must survive save/export/import.")
}
console.log("Kyza project contract tests passed.")
