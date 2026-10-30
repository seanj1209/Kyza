import { createControlSpecSynchroniser } from "../apps/web/src/project/controlSpecSynchronisation"
import { setOpeningStyle, normaliseOpeningStyle } from "../packages/cutter-engine/actions/openingStyle"
import { createDoyPouchDefaults } from "../apps/web/src/core/model/parameterSchema"
import {
  migrateSavedProjectRecord,
  synchroniseKyzaProject,
  updateKyzaProject
} from "../apps/web/src/project/projectUpdateService"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  duplicateKyzaProject,
  legacySpecFromProject,
  loadKyzaProject,
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

function withoutPerfLaneIds(perfs: FlowwrapSpec["perfs"]) {
  return perfs
    ? {
        ...perfs,
        lanes: perfs.lanes?.map(({ id: _id, ...lane }) => lane)
      }
    : perfs
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

const timestamp = "2026-07-02T12:00:00.000Z"
const twoEyemarkSpec: FlowwrapSpec = {
  width: 440,
  height: 200,
  seal: 10,
  seals: { top: 10, bottom: 11, left: 12, right: 13 },
  bleed: 3,
  eyeMarks: {
    count: 2,
    position: "top",
    width: 10,
    height: 5,
    width2: 14,
    height2: 7,
    offsetX: 2,
    offsetY: 3,
    offsetX2: -4,
    offsetY2: 6,
    manualPositioned: true,
    manualPositioned2: true,
    color: "black"
  },
  safeZones: [{ id: "safe-1", label: "Safe", x: 5, y: 6, width: 50, height: 40 }],
  foldLines: [{ id: "fold-1", orientation: "vertical", offset: 100 }],
  perfs: {
    mode: "regulated",
    separation: 10,
    originX: 20,
    originY: 30,
    count: 5,
    diameter: 1.5,
    lanes: [{ originX: 20, originY: 30, diameter: 1.5 }]
  },
  hangerSlots: [{
    id: "hanger-1",
    type: "hanger-slot",
    subtype: "round-hole",
    diameter: 8,
    centerX: 50,
    centerY: 12,
    mirrored: true
  }],
  windows: [{ id: "window-1", shape: "rectangle", x: 20, y: 30, width: 40, height: 50 }],
  attributeBoxes: [{ id: "attr-1", kind: "barcode", x: 70, y: 40, width: 30, height: 20 }],
  doyPouch: {
    panelWidths: { left: 150, center: 100, right: 150 },
    sideBleed: 3,
    gripSeal: 10,
    gussetDepth: 35,
    zipper: { offsetY: 25, height: 5, stopWidth: 8, jawGap: 3 },
    tearNotch: { offsetX: 30, offsetY: 20, width: 6, depth: 3 }
  }
}

const project = projectFromLegacySpec("doy-pouch", "Update Boundary", twoEyemarkSpec, {
  id: "project-update-boundary",
  createdAt: timestamp,
  updatedAt: timestamp
})
const originalSnapshot = JSON.parse(JSON.stringify(project))

const patched = updateKyzaProject({
  project,
  reason: "test-fixture",
  expectedRevision: project.revision,
  update: {
    type: "patch-legacy-spec",
    patch: { width: 460, seals: { top: 15 } }
  }
})
assert(patched.ok && Boolean(patched.project) && Boolean(patched.legacySpec), "Patch must succeed.")
if (patched.project && patched.legacySpec) {
  assert(patched.project !== project, "Update must return a new project object.")
  assert(patched.project.cutter !== project.cutter, "Cutter document must be immutable.")
  assert(
    patched.project.cutter.legacySpec !== project.cutter.legacySpec,
    "Updated legacySpec must not share its root reference."
  )
  assert(patched.project.id === project.id, "Project ID must be preserved.")
  assert(patched.project.cutter.packType === "doy-pouch", "Pack type must be preserved.")
  assert(patched.project.cutter.units === "mm", "Units must be preserved.")
  assert(
    patched.project.cutter.coordinateSpace === "legacy-flowwrap",
    "Coordinate space must be preserved."
  )
  assert(patched.project.revision === project.revision + 1, "Revision must increment once.")
  assert(patched.legacySpec.width === 460, "Patched width must be applied.")
  assert(patched.legacySpec.seals?.top === 15, "Nested patch must be applied.")
  assert(patched.legacySpec.seals?.bottom === 11, "Unpatched nested seal must survive.")
  assertJsonEqual(patched.legacySpec.eyeMarks, twoEyemarkSpec.eyeMarks, "Eyemarks must survive unrelated patches.")
  assertJsonEqual(patched.legacySpec.safeZones, twoEyemarkSpec.safeZones, "Safe zones must survive.")
  assertJsonEqual(patched.legacySpec.foldLines, twoEyemarkSpec.foldLines, "Fold lines must survive.")
  assertJsonEqual(
    withoutPerfLaneIds(patched.legacySpec.perfs),
    withoutPerfLaneIds(twoEyemarkSpec.perfs),
    "Perf geometry must survive while bridge IDs are added."
  )
  assert(
    patched.legacySpec.perfs?.lanes?.every(lane => Boolean(lane.id)),
    "Accepted updates must attach stable IDs to explicit perf lanes."
  )
  assertJsonEqual(patched.legacySpec.hangerSlots, twoEyemarkSpec.hangerSlots, "Hanger slots must survive.")
  assertJsonEqual(patched.legacySpec.windows, twoEyemarkSpec.windows, "Windows must survive.")
  assertJsonEqual(patched.legacySpec.attributeBoxes, twoEyemarkSpec.attributeBoxes, "Attribute boxes must survive.")
  assertJsonEqual(patched.legacySpec.doyPouch, twoEyemarkSpec.doyPouch, "Pack-specific fields must survive.")
}
assertJsonEqual(project, originalSnapshot, "Previous project must not be mutated.")

const oneEyemarkSpec: FlowwrapSpec = {
  ...twoEyemarkSpec,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 9,
    height: 4,
    offsetX: 1,
    offsetY: 2,
    color: "white"
  }
}
const oneEyemarkUpdate = updateKyzaProject({
  project: projectFromLegacySpec("doy-pouch", "One Eyemark", oneEyemarkSpec),
  reason: "controls-edit",
  update: { type: "patch-legacy-spec", patch: { height: 210 } }
})
assert(oneEyemarkUpdate.ok, "One-eyemark update must succeed.")
assertJsonEqual(
  oneEyemarkUpdate.legacySpec?.eyeMarks,
  oneEyemarkSpec.eyeMarks,
  "One-eyemark state must survive an unrelated update."
)

const conflict = updateKyzaProject({
  project,
  reason: "engine-action",
  expectedRevision: project.revision + 10,
  update: { type: "patch-legacy-spec", patch: { width: 500 } }
})
assert(!conflict.ok && conflict.errors.length > 0, "Revision conflict must be rejected.")

const malformedSpec = { ...twoEyemarkSpec, width: Number.NaN }
const malformed = updateKyzaProject({
  project,
  reason: "test-fixture",
  update: { type: "replace-legacy-spec", spec: malformedSpec }
})
assert(!malformed.ok, "Malformed project update must return an error result.")

const synced = synchroniseKyzaProject(project, "artboard-switch")
assert(synced.ok, "Artboard switch synchronisation must parse successfully.")
assert(synced.revision === project.revision, "Artboard sync must not increment revision.")
assert(synced.project?.updatedAt === project.updatedAt, "Artboard sync must not touch updatedAt.")
assertJsonEqual(project, originalSnapshot, "Artboard sync must not mutate the project.")

let controlsChangeCount = 0
const controlsSync = createControlSpecSynchroniser<FlowwrapSpec, "controls-edit">(() => {
  controlsChangeCount += 1
})
const controlsSnapshot = controlsSync.syncFromProject(twoEyemarkSpec)
assert(controlsChangeCount === 0, "Controls sync must not emit a model update.")
assert(controlsSnapshot !== twoEyemarkSpec, "Controls sync must isolate nested model state.")
controlsSync.emitUserChange(controlsSnapshot, "controls-edit")
assert(controlsChangeCount === 1, "A user edit must emit exactly one model update.")

const legacyRecord = {
  id: "legacy-saved-card",
  name: "Legacy Saved Card",
  packId: "doy-pouch",
  spec: twoEyemarkSpec,
  updatedAt: timestamp
}
const migratedLegacy = migrateSavedProjectRecord(legacyRecord)
assert(migratedLegacy.ok, "Old saved project record must migrate.")
if (migratedLegacy.ok) {
  assert(migratedLegacy.value.project.id === legacyRecord.id, "Legacy card ID must become project ID.")
  assertJsonEqual(
    legacySpecFromProject(migratedLegacy.value.project),
    twoEyemarkSpec,
    "Legacy saved geometry must survive migration."
  )
}

const storage = new MemoryStorage()
const projectToSave = patched.project ?? project
assert(saveKyzaProject(projectToSave, storage).ok, "Updated project must save.")
const loaded = loadKyzaProject(projectToSave.id, storage)
assert(loaded.ok, "Updated project must load.")
if (loaded.ok) {
  assertJsonEqual(
    legacySpecFromProject(loaded.value),
    projectToSave.cutter.legacySpec,
    "Save/load must preserve updated cutter geometry."
  )
}
const duplicate = duplicateKyzaProject(projectToSave.id, storage)
assert(duplicate.ok, "Updated project must duplicate.")
if (duplicate.ok) {
  assert(duplicate.value.id !== projectToSave.id, "Duplicate must receive a new project ID.")
  assert(duplicate.value.revision === 1, "Duplicate starts a new revision history.")
  assertJsonEqual(
    {
      ...legacySpecFromProject(duplicate.value),
      perfs: withoutPerfLaneIds(legacySpecFromProject(duplicate.value).perfs)
    },
    {
      ...projectToSave.cutter.legacySpec,
      perfs: withoutPerfLaneIds(projectToSave.cutter.legacySpec.perfs)
    },
    "Duplicate must preserve cutter geometry."
  )
}

console.log("Kyza project update boundary tests passed.")

const openingSpec: FlowwrapSpec = { ...twoEyemarkSpec, doyPouch: createDoyPouchDefaults({ showGripSeal: true, showZipper: false, sideBleed: 27, gripSeal: 8 }) }
const zipStyle = setOpeningStyle(openingSpec, "zip")
assert(zipStyle.doyPouch!.showZipper === true && zipStyle.doyPouch!.showGripSeal === false, "Zip replaces grip seal.")
assert(zipStyle.doyPouch!.zipper.offsetX === 27 && zipStyle.doyPouch!.zipper.width === 8, "Zip inherits the opening position and width on both faces.")
const movedZip = { ...zipStyle, doyPouch: { ...zipStyle.doyPouch!, zipper: { ...zipStyle.doyPouch!.zipper, offsetX: 43 } } }
const gripStyle = setOpeningStyle(movedZip, "grip")
assert(gripStyle.doyPouch!.sideBleed === 43 && gripStyle.doyPouch!.gripSeal === 8 && gripStyle.doyPouch!.showZipper === false, "Grip inherits a moved zip position.")
assert(setOpeningStyle(gripStyle, "grip", false).doyPouch!.showGripSeal === false, "Removing the active opening does not enable another.")
const duplicateOpening = { ...movedZip, doyPouch: { ...movedZip.doyPouch!, showGripSeal: true } }
const oldOpeningProject = projectFromLegacySpec("flowwrap", "Old duplicate opening", duplicateOpening)
const restoredOpening = synchroniseKyzaProject(oldOpeningProject, "save-load")
assert(restoredOpening.ok && restoredOpening.legacySpec!.doyPouch!.showGripSeal === false && restoredOpening.legacySpec!.doyPouch!.zipper.offsetX === 43, "Loading old duplicates retains the zip and its saved position.")
assert(synchroniseKyzaProject(restoredOpening.project!, "save-load").revision === restoredOpening.revision, "Opening migration is idempotent.")
assert(normaliseOpeningStyle(gripStyle) === gripStyle, "Single openings remain unchanged.")
console.log("Single opening, style switching, moved position and legacy duplicate migration checks passed.")
