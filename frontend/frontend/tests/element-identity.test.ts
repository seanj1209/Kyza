import { createControlSpecSynchroniser } from "../apps/web/src/project/controlSpecSynchronisation"
import { resolveCutterElementSelection } from "../apps/web/src/project/cutterElementSelection"
import {
  migrateSavedProjectRecord,
  synchroniseCutNFlowProject,
  updateCutNFlowProject,
  updateEyemarkById,
  updatePerfLaneById,
  updateTearNotchById
} from "../apps/web/src/project/projectUpdateService"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  duplicateCutNFlowProject,
  getEyemarkElementRefs,
  getPerfLaneElementRefs,
  getTearNotchElementRefs,
  legacySpecFromProject,
  listCutNFlowProjects,
  loadCutNFlowProject,
  parseCutNFlowProject,
  projectFromLegacySpec,
  saveCutNFlowProject,
  type CutNFlowProjectStorage
} from "../packages/cutter-engine/project"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertJsonEqual(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)
}

class MemoryStorage implements CutNFlowProjectStorage {
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

const timestamp = "2026-07-02T14:00:00.000Z"
const oneEyemarkSpec: FlowwrapSpec = {
  width: 440,
  height: 200,
  seal: 10,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 10,
    height: 5,
    offsetX: 2,
    offsetY: 3,
    color: "black"
  }
}
const twoEyemarkSpec: FlowwrapSpec = {
  ...oneEyemarkSpec,
  eyeMarks: {
    ...oneEyemarkSpec.eyeMarks!,
    count: 2,
    position: "top",
    width2: 14,
    height2: 7,
    offsetX2: -4,
    offsetY2: 6,
    manualPositioned2: true
  }
}

const oneProject = projectFromLegacySpec("flowwrap", "One", oneEyemarkSpec, {
  id: "identity-one",
  createdAt: timestamp,
  updatedAt: timestamp
})
const oneRefs = getEyemarkElementRefs(oneProject)
assert(oneRefs.length === 1, "A one-eyemark project must receive one ref.")
assert(oneRefs[0]?.status === "active", "The first eyemark ref must be active.")
assert(
  oneRefs[0]?.coordinateSpace === "anchor-relative-mm",
  "Legacy eyemark offsets must declare anchor-relative mm coordinates."
)
assert(oneRefs[0]?.widthMm === 10 && oneRefs[0]?.heightMm === 5, "Dimensions must be mm.")

const twoProject = projectFromLegacySpec("flowwrap", "Two", twoEyemarkSpec, {
  id: "identity-two",
  createdAt: timestamp,
  updatedAt: timestamp
})
const twoRefs = getEyemarkElementRefs(twoProject)
assert(twoRefs.length === 2, "A two-eyemark project must receive two refs.")
assert(twoRefs.every(ref => ref.status === "active"), "Both two-eyemark refs must be active.")
assert(twoRefs[0]?.id !== twoRefs[1]?.id, "Eyemark IDs must be unique.")
const resolvedSelections = twoRefs.map(ref =>
  resolveCutterElementSelection(twoProject, ref.id)
)
assert(
  resolvedSelections.every(result => result.ok),
  "Every active eyemark CutterElement ID must resolve to a renderer selection.",
)
assertJsonEqual(
  resolvedSelections.map(result => result.ok ? result.rendererSelectionId : null),
  ["eye-mark:0", "eye-mark:1"],
  "Stable domain eyemark IDs must map deterministically to renderer slot IDs.",
)
assert(
  resolvedSelections.every(result => result.ok && result.layerId === "eyemarks"),
  "Canvas and Layers selection must resolve through the same eyemarks layer.",
)
const missingSelection = resolveCutterElementSelection(twoProject, "missing-cutter-element")
assert(
  "reason" in missingSelection && missingSelection.reason === "missing",
  "A missing affected CutterElement ID must fail safely.",
)
const deletedProject = JSON.parse(JSON.stringify(twoProject)) as typeof twoProject
deletedProject.cutter.identityMap.elements = deletedProject.cutter.identityMap.elements.filter(
  element => element.id !== twoRefs[0]!.id,
)
const deletedSelection = resolveCutterElementSelection(deletedProject, twoRefs[0]!.id)
assert(
  "reason" in deletedSelection && deletedSelection.reason === "missing",
  "A deleted affected CutterElement ID must fail safely without selecting another element.",
)
const inactiveProject = JSON.parse(JSON.stringify(twoProject)) as typeof twoProject
inactiveProject.cutter.identityMap.elements.find(element => element.id === twoRefs[0]!.id)!.status = "inactive"
const inactiveSelection = resolveCutterElementSelection(inactiveProject, twoRefs[0]!.id)
assert(
  "reason" in inactiveSelection && inactiveSelection.reason === "inactive",
  "An inactive or superseded affected Cutter element must not select a renderer object.",
)

const increased = updateCutNFlowProject({
  project: oneProject,
  reason: "engine-action",
  update: { type: "replace-legacy-spec", spec: twoEyemarkSpec }
})
assert(increased.ok && Boolean(increased.project), "One-to-two update must succeed.")
const increasedRefs = getEyemarkElementRefs(increased.project!)
assert(increasedRefs.length === 2, "One-to-two must create a second ref.")
assert(increasedRefs[0]?.id === oneRefs[0]?.id, "One-to-two must preserve the first ID.")
assert(increasedRefs[1]?.id !== oneRefs[0]?.id, "One-to-two must create a distinct second ID.")

const reducedSpec: FlowwrapSpec = {
  ...twoEyemarkSpec,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 11,
    height: 5.5,
    offsetX: 1,
    offsetY: 2,
    color: "black"
  }
}
const reduced = updateCutNFlowProject({
  project: increased.project!,
  reason: "controls-edit",
  update: { type: "replace-legacy-spec", spec: reducedSpec }
})
assert(reduced.ok && Boolean(reduced.project), "Two-to-one update must succeed.")
const reducedRefs = getEyemarkElementRefs(reduced.project!)
assert(reducedRefs.length === 2, "Two-to-one must retain the secondary ref.")
assert(reducedRefs[0]?.id === increasedRefs[0]?.id, "Primary ID must survive two-to-one.")
assert(reducedRefs[1]?.id === increasedRefs[1]?.id, "Secondary ID must survive two-to-one.")
assert(reducedRefs[1]?.status === "inactive", "The retained secondary ref must become inactive.")
assert(
  reduced.legacySpec?.eyeMarks?.width2 === 14 &&
    reduced.legacySpec.eyeMarks.height2 === 7 &&
    reduced.legacySpec.eyeMarks.offsetX2 === -4 &&
    reduced.legacySpec.eyeMarks.offsetY2 === 6,
  "Two-to-one must preserve secondary dimensions and offsets in legacySpec."
)

const unrelated = updateCutNFlowProject({
  project: reduced.project!,
  reason: "controls-edit",
  update: { type: "patch-legacy-spec", patch: { width: 460 } }
})
assert(unrelated.ok && Boolean(unrelated.project), "Unrelated dimension update must succeed.")
assertJsonEqual(
  getEyemarkElementRefs(unrelated.project!).map(ref => ref.id),
  reducedRefs.map(ref => ref.id),
  "Unrelated edits must not regenerate eyemark IDs."
)

const restored = updateCutNFlowProject({
  project: unrelated.project!,
  reason: "engine-action",
  update: {
    type: "patch-legacy-spec",
    patch: { eyeMarks: { count: 2, position: "top" } }
  }
})
assert(restored.ok && Boolean(restored.project), "Restoring two eyemarks must succeed.")
const restoredRefs = getEyemarkElementRefs(restored.project!)
assert(restoredRefs[1]?.id === reducedRefs[1]?.id, "Restoring must reactivate the same second ID.")
assert(restoredRefs[1]?.status === "active", "Restored secondary ref must be active.")
assert(restored.legacySpec?.eyeMarks?.width2 === 14, "Restoring must retain secondary width.")

const primaryId = restoredRefs[0]!.id
const movedById = updateEyemarkById(
  restored.project!,
  primaryId,
  ref => ({ ...ref, widthMm: 12, offsetXMm: 8 }),
  "canvas-interaction"
)
assert(movedById.ok && Boolean(movedById.project), "Eyemark-by-ID update must succeed.")
assert(movedById.revision === restored.project!.revision + 1, "ID update must increment revision.")
assert(movedById.legacySpec?.eyeMarks?.width === 12, "ID update must sync width to legacySpec.")
assert(movedById.legacySpec?.eyeMarks?.offsetX === 8, "ID update must sync offset to legacySpec.")
assert(
  getEyemarkElementRefs(movedById.project!)[0]?.id === primaryId,
  "Canvas-style ID updates must preserve identity."
)

const switched = synchroniseCutNFlowProject(movedById.project!, "artboard-switch")
assert(switched.ok && Boolean(switched.project), "Artboard synchronisation must succeed.")
assert(switched.revision === movedById.revision, "Artboard sync must not increment revision.")
assertJsonEqual(
  getEyemarkElementRefs(switched.project!).map(ref => ref.id),
  getEyemarkElementRefs(movedById.project!).map(ref => ref.id),
  "Artboard switching must preserve eyemark IDs."
)
assert(switched.legacySpec?.eyeMarks?.width2 === 14, "Artboard switching must retain secondary values.")

let controlsWrites = 0
const controls = createControlSpecSynchroniser<FlowwrapSpec, "controls-edit">(() => {
  controlsWrites += 1
})
controls.syncFromProject(switched.legacySpec!)
assert(controlsWrites === 0, "Controls sync must remain side-effect free.")
assertJsonEqual(
  getEyemarkElementRefs(switched.project!).map(ref => ref.id),
  getEyemarkElementRefs(movedById.project!).map(ref => ref.id),
  "Controls sync must not regenerate IDs."
)

const storage = new MemoryStorage()
assert(saveCutNFlowProject(switched.project!, storage).ok, "Identity project must save.")
const loaded = loadCutNFlowProject(switched.project!.id, storage)
assert(loaded.ok, "Identity project must load.")
if (loaded.ok) {
  assertJsonEqual(
    getEyemarkElementRefs(loaded.value).map(ref => ref.id),
    getEyemarkElementRefs(switched.project!).map(ref => ref.id),
    "Save/load must preserve eyemark IDs."
  )
}
const duplicated = duplicateCutNFlowProject(switched.project!.id, storage)
assert(duplicated.ok, "Identity project must duplicate.")
if (duplicated.ok) {
  assert(duplicated.value.id !== switched.project!.id, "Duplicate needs a new project ID.")
  const sourceIds = getEyemarkElementRefs(switched.project!).map(ref => ref.id)
  const duplicatedIds = getEyemarkElementRefs(duplicated.value).map(ref => ref.id)
  assert(
    duplicatedIds.every(id => !sourceIds.includes(id)),
    "Independent duplicate must not reuse source Project element IDs."
  )
  assertJsonEqual(
    getEyemarkElementRefs(switched.project!).map(ref => ref.id),
    sourceIds,
    "Duplicate identity remapping must not mutate the source Project."
  )
}

const malformed = JSON.parse(JSON.stringify(twoProject))
malformed.cutter.identityMap.elements[1].id = malformed.cutter.identityMap.elements[0].id
const repaired = parseCutNFlowProject(malformed)
assert(repaired.ok, "Duplicate eyemark IDs must be repaired safely.")
if (repaired.ok) {
  const repairedIds = getEyemarkElementRefs(repaired.value).map(ref => ref.id)
  assert(new Set(repairedIds).size === 2, "Repaired eyemark IDs must be unique.")
  assert((repaired.warnings?.length ?? 0) > 0, "Identity repair must report a warning.")
}

const mismatchedCount = JSON.parse(JSON.stringify(reduced.project))
mismatchedCount.cutter.identityMap.elements.find(
  (element: { type: string; index?: number }) =>
    element.type === "eyemark" && element.index === 1
).status = "active"
const repairedCount = parseCutNFlowProject(mismatchedCount)
assert(repairedCount.ok, "Active-ref/count mismatches must be repairable.")
if (repairedCount.ok) {
  assert(
    getEyemarkElementRefs(repairedCount.value)[1]?.status === "inactive",
    "A secondary ref must be inactive when legacy count is one."
  )
  assert((repairedCount.warnings?.length ?? 0) > 0, "Count repair must report a warning.")
}

const legacyWithoutRefs = JSON.parse(JSON.stringify(twoProject))
delete legacyWithoutRefs.cutter.identityMap
const migrated = parseCutNFlowProject(legacyWithoutRefs)
assert(migrated.ok, "A legacy project without refs must migrate safely.")
if (migrated.ok) {
  assert(getEyemarkElementRefs(migrated.value).length === 2, "Migration must generate both refs.")
  assert((migrated.warnings?.length ?? 0) > 0, "Missing refs migration must report a warning.")
}

const legacyStorage = new MemoryStorage()
legacyStorage.setItem("cutnflow.projects.v1", JSON.stringify([legacyWithoutRefs]))
const firstList = listCutNFlowProjects(legacyStorage)
const secondList = listCutNFlowProjects(legacyStorage)
assert(firstList.ok && secondList.ok, "Legacy identity storage must load repeatedly.")
if (firstList.ok && secondList.ok) {
  assertJsonEqual(
    getEyemarkElementRefs(firstList.value[0]!).map(ref => ref.id),
    getEyemarkElementRefs(secondList.value[0]!).map(ref => ref.id),
    "Generated legacy IDs must be persisted after first load."
  )
}

const legacyCard = {
  id: "legacy-card-identity",
  name: "Legacy Card",
  packId: "flowwrap",
  spec: twoEyemarkSpec,
  updatedAt: timestamp
}
const firstCardMigration = migrateSavedProjectRecord(legacyCard)
const secondCardMigration = migrateSavedProjectRecord(legacyCard)
assert(
  firstCardMigration.ok && secondCardMigration.ok,
  "Legacy saved cards must receive identity metadata."
)
if (firstCardMigration.ok && secondCardMigration.ok) {
  assertJsonEqual(
    getEyemarkElementRefs(firstCardMigration.value.project).map(ref => ref.id),
    getEyemarkElementRefs(secondCardMigration.value.project).map(ref => ref.id),
    "Legacy saved-card IDs must remain stable before the card is resaved."
  )
}

assertJsonEqual(
  legacySpecFromProject(oneProject),
  oneEyemarkSpec,
  "Adding identity metadata must not change initial renderer input."
)

const perfAndNotchSpec: FlowwrapSpec = {
  ...twoEyemarkSpec,
  perfs: {
    mode: "regulated",
    separation: 10,
    originX: 20,
    originY: 30,
    count: 6,
    diameter: 1.5,
    lanes: [
      { originX: 20, originY: 30, diameter: 1.5 },
      { originX: 45, originY: 32, diameter: 2 }
    ]
  },
  doyPouch: {
    panelWidths: { left: 150, center: 100, right: 150 },
    sideBleed: 3,
    gripSeal: 10,
    gussetDepth: 35,
    zipper: { offsetY: 25, height: 5, stopWidth: 8, jawGap: 3 },
    tearNotch: { offsetX: 30, offsetY: 20, width: 6, depth: 3 },
    showTearNotch: true
  },
  sachet: {
    tearNotch: {
      enabled: true,
      style: "triangle",
      offsetX: 7,
      width: 5,
      depth: 2.5
    }
  }
}
const featureProject = projectFromLegacySpec(
  "doy-pouch",
  "Perf and notch identity",
  perfAndNotchSpec,
  { id: "identity-perf-notch", createdAt: timestamp, updatedAt: timestamp }
)
const initialPerfRefs = getPerfLaneElementRefs(featureProject)
const initialNotchRefs = getTearNotchElementRefs(featureProject)
assert(initialPerfRefs.length === 2, "Two legacy perf lanes must receive two refs.")
assert(initialPerfRefs.every(ref => ref.status === "active"), "Perf refs must start active.")
assert(
  initialPerfRefs.every(ref => ref.coordinateSpace === "live-area-mm"),
  "Perf origins must declare live-area millimetres."
)
assert(initialNotchRefs.length === 2, "DOY and sachet notches must receive separate refs.")
assert(initialNotchRefs.every(ref => ref.status === "active"), "Enabled notch refs must be active.")
assert(
  initialNotchRefs.every(ref => ref.coordinateSpace === "legacy-flowwrap"),
  "Notch offsets must remain explicitly legacy until pack conversions exist."
)

const featureSynced = updateCutNFlowProject({
  project: featureProject,
  reason: "controls-edit",
  update: { type: "patch-legacy-spec", patch: { height: 205 } }
})
assert(featureSynced.ok && Boolean(featureSynced.project), "Feature sync update must succeed.")
assertJsonEqual(
  getPerfLaneElementRefs(featureSynced.project!).map(ref => ref.id),
  initialPerfRefs.map(ref => ref.id),
  "Unrelated edits must preserve perf-lane IDs."
)
assertJsonEqual(
  getTearNotchElementRefs(featureSynced.project!).map(ref => ref.id),
  initialNotchRefs.map(ref => ref.id),
  "Unrelated edits must preserve tear-notch IDs."
)

const modeChanged = updateCutNFlowProject({
  project: featureSynced.project!,
  reason: "controls-edit",
  update: { type: "patch-legacy-spec", patch: { perfs: { mode: "continuous" } } }
})
assert(modeChanged.ok && Boolean(modeChanged.project), "Perf mode change must succeed.")
assertJsonEqual(
  getPerfLaneElementRefs(modeChanged.project!).map(ref => ref.id),
  initialPerfRefs.map(ref => ref.id),
  "Regulated-to-continuous mode changes must preserve lane IDs."
)

const syncedLanes = modeChanged.legacySpec!.perfs!.lanes!
assert(
  syncedLanes.every(lane => typeof lane.id === "string" && lane.id.length > 0),
  "Accepted updates must bridge stable IDs into explicit legacy lanes."
)
const removedLaneId = syncedLanes[0]!.id!
const survivingLaneId = syncedLanes[1]!.id!
const laneRemoved = updateCutNFlowProject({
  project: modeChanged.project!,
  reason: "controls-edit",
  update: {
    type: "patch-legacy-spec",
    patch: { perfs: { lanes: [syncedLanes[1]!] } }
  }
})
assert(laneRemoved.ok && Boolean(laneRemoved.project), "Perf-lane deletion must succeed.")
const removedRefs = getPerfLaneElementRefs(laneRemoved.project!)
assert(
  removedRefs.find(ref => ref.id === removedLaneId)?.status === "inactive",
  "Deleted perf lane must retain an inactive ref."
)
assert(
  removedRefs.find(ref => ref.id === survivingLaneId)?.status === "active",
  "Surviving perf lane must keep its ID."
)

const survivingLane = laneRemoved.legacySpec!.perfs!.lanes![0]!
const laneAdded = updateCutNFlowProject({
  project: laneRemoved.project!,
  reason: "customisation-edit",
  update: {
    type: "patch-legacy-spec",
    patch: {
      perfs: {
        lanes: [survivingLane, { ...survivingLane, originX: survivingLane.originX + 10 }]
      }
    }
  }
})
assert(laneAdded.ok && Boolean(laneAdded.project), "Perf-lane addition must succeed.")
const activeAddedRefs = getPerfLaneElementRefs(laneAdded.project!).filter(
  ref => ref.status === "active"
)
assert(activeAddedRefs.length === 2, "Added lane must receive an active ref.")
assert(
  activeAddedRefs.some(ref => ref.id === survivingLaneId),
  "Adding a lane must preserve the existing lane ID."
)
assert(new Set(activeAddedRefs.map(ref => ref.id)).size === 2, "Added lane ID must be unique.")

const perfTarget = activeAddedRefs.find(ref => ref.id === survivingLaneId)!
const perfMoved = updatePerfLaneById(
  laneAdded.project!,
  perfTarget.id,
  ref => ({ ...ref, originXMm: 52 }),
  "canvas-interaction"
)
assert(perfMoved.ok && Boolean(perfMoved.project), "Perf lane must update by stable ID.")
assert(perfMoved.revision === laneAdded.project!.revision + 1, "Perf ID update increments revision.")
assert(
  perfMoved.legacySpec?.perfs?.lanes?.find(lane => lane.id === perfTarget.id)?.originX === 52,
  "Perf ID update must synchronise the targeted legacy lane."
)

const doyNotch = initialNotchRefs.find(ref => ref.construction === "doy")!
const notchMoved = updateTearNotchById(
  perfMoved.project!,
  doyNotch.id,
  ref => ({ ...ref, offsetXMm: 34, widthMm: 7 }),
  "canvas-interaction"
)
assert(notchMoved.ok && Boolean(notchMoved.project), "DOY notch must update by stable ID.")
assert(
  notchMoved.legacySpec?.doyPouch?.tearNotch.offsetX === 34 &&
    notchMoved.legacySpec.doyPouch.tearNotch.width === 7,
  "DOY notch ID update must synchronise legacy values."
)

const notchDisabled = updateCutNFlowProject({
  project: notchMoved.project!,
  reason: "controls-edit",
  update: {
    type: "patch-legacy-spec",
    patch: { sachet: { tearNotch: { enabled: false } } }
  }
})
assert(notchDisabled.ok && Boolean(notchDisabled.project), "Notch disable must succeed.")
const disabledSachet = getTearNotchElementRefs(notchDisabled.project!).find(
  ref => ref.construction === "sachet"
)
assert(disabledSachet?.status === "inactive", "Disabled sachet notch ref must remain inactive.")
assert(
  disabledSachet?.id === initialNotchRefs.find(ref => ref.construction === "sachet")?.id,
  "Disabling a sachet notch must preserve its ID."
)

const featureStorage = new MemoryStorage()
assert(saveCutNFlowProject(notchDisabled.project!, featureStorage).ok, "Feature project must save.")
const loadedFeatures = loadCutNFlowProject(notchDisabled.project!.id, featureStorage)
assert(loadedFeatures.ok, "Feature project must load.")
if (loadedFeatures.ok) {
  assertJsonEqual(
    getPerfLaneElementRefs(loadedFeatures.value).map(ref => ref.id),
    getPerfLaneElementRefs(notchDisabled.project!).map(ref => ref.id),
    "Save/load must preserve active and inactive perf-lane IDs."
  )
  assertJsonEqual(
    getTearNotchElementRefs(loadedFeatures.value).map(ref => ref.id),
    getTearNotchElementRefs(notchDisabled.project!).map(ref => ref.id),
    "Save/load must preserve tear-notch IDs."
  )
}

const featureDuplicate = duplicateCutNFlowProject(
  notchDisabled.project!.id,
  featureStorage
)
assert(featureDuplicate.ok, "Feature project must duplicate.")
if (featureDuplicate.ok) {
  const sourcePerfIds = getPerfLaneElementRefs(notchDisabled.project!).map(ref => ref.id)
  const duplicatePerfIds = getPerfLaneElementRefs(featureDuplicate.value).map(ref => ref.id)
  assert(
    duplicatePerfIds.length === sourcePerfIds.length
      && duplicatePerfIds.every(id => !sourcePerfIds.includes(id)),
    "Duplicate must preserve perf-lane roles with independent IDs."
  )
  const sourceNotchIds = getTearNotchElementRefs(notchDisabled.project!).map(ref => ref.id)
  const duplicateNotchIds = getTearNotchElementRefs(featureDuplicate.value).map(ref => ref.id)
  assert(
    duplicateNotchIds.length === sourceNotchIds.length
      && duplicateNotchIds.every(id => !sourceNotchIds.includes(id)),
    "Duplicate must preserve tear-notch roles with independent IDs."
  )
}

const malformedFeatures = JSON.parse(JSON.stringify(featureProject))
const malformedPerfRefs = malformedFeatures.cutter.identityMap.elements.filter(
  (element: { type: string }) => element.type === "perf-lane"
)
malformedPerfRefs[1].id = malformedPerfRefs[0].id
const malformedNotchRefs = malformedFeatures.cutter.identityMap.elements.filter(
  (element: { type: string }) => element.type === "tear-notch"
)
malformedNotchRefs[1].id = malformedNotchRefs[0].id
const repairedFeatures = parseCutNFlowProject(malformedFeatures)
assert(repairedFeatures.ok, "Duplicate perf/notch IDs must be repaired safely.")
if (repairedFeatures.ok) {
  const repairedPerfIds = getPerfLaneElementRefs(repairedFeatures.value).map(ref => ref.id)
  const repairedNotchIds = getTearNotchElementRefs(repairedFeatures.value).map(ref => ref.id)
  assert(new Set(repairedPerfIds).size === repairedPerfIds.length, "Perf IDs must repair uniquely.")
  assert(new Set(repairedNotchIds).size === repairedNotchIds.length, "Notch IDs must repair uniquely.")
  assert((repairedFeatures.warnings?.length ?? 0) > 0, "Feature ID repairs must warn.")
}

const legacyFeatures = JSON.parse(JSON.stringify(featureProject))
delete legacyFeatures.cutter.identityMap
const migratedFeatures = parseCutNFlowProject(legacyFeatures)
assert(migratedFeatures.ok, "Legacy perf/notch projects must generate refs.")
if (migratedFeatures.ok) {
  assert(getPerfLaneElementRefs(migratedFeatures.value).length === 2, "Both lanes migrate.")
  assert(getTearNotchElementRefs(migratedFeatures.value).length === 2, "Both notches migrate.")
}

console.log("CutNFlow element identity tests passed.")
