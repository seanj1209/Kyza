import { generatePackGenRecommendations } from "../packages/ai-engine"
import {
  KYZA_PROJECT_STORAGE_KEY,
  createKyzaProjectV1,
  FLOW_WRAP_PACK_TYPE_IDS,
  getEyemarkElementRefs,
  listKyzaProjects,
  loadKyzaProject,
  projectFromLegacySpec,
  saveKyzaProject,
  toEnginePackTypeId,
  toPackSpecificationPackTypeId,
  type KyzaProjectStorage,
} from "../packages/cutter-engine/project"
import { validateProjectCutter } from "../packages/cutter-engine/validation"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { packModules } from "../apps/web/src/packs"
import { flowwrapPack } from "../apps/web/src/packs/flowwrapPack"
import { MIN_SEAL_CLEARANCE_MM } from "../apps/web/src/constraints/flowwrap"
import { resolveFlowwrapGeometry } from "../apps/web/src/geometry/flowwrapGeometry"
import { doyFinishedWidth } from "../apps/web/src/core/geometry/resolvers/doyBounds"
import {
  resolveKSealPouchGeometry,
  toKSealComposerDimensions,
} from "../apps/web/src/geometry/kSealPouchGeometry"
import { getPackGenFieldPolicy } from "../apps/web/src/packGen/packGenFieldPolicy"
import { getPackGenActionState } from "../apps/web/src/packGen/packGenActionState"
import {
  createCutterSpecFromConfirmedPackValues,
  normalizePackGenEyeMarks,
} from "../apps/web/src/packGen/packGenHandoff"
import {
  createPackGenSuggestionPreviewModel,
  getPackGenSubstratePresentation,
} from "../apps/web/src/packGen/packGenSuggestionPreview"
import {
  PACK_SPEC_BUILDER_TABS,
  getPackSpecBuilderFields,
} from "../apps/web/src/packGen/packSpecBuilderModel"
import {
  acceptProposedPackGenValues,
  applyRecommendationToPackGenDraft,
  connectStandalonePackGenToProject,
  createOrUpdateCutterFromPackGen,
  getPackGenCutterReadiness,
  loadPackGenProject,
  savePackGenDraft,
  setPackGenField,
  setPackGenReviewState,
} from "../apps/web/src/packGen/packGenProjectService"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertJsonEqual(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message)
}

class MemoryStorage implements KyzaProjectStorage {
  readonly values = new Map<string, string>()
  writeCount = 0
  failWrites = false

  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("write blocked")
    this.writeCount += 1
    this.values.set(key, value)
  }
  removeItem(key: string) { this.values.delete(key) }
}

const timestamp = "2026-07-19T10:00:00.000Z"
const nextTimestamp = "2026-07-19T11:00:00.000Z"
const storage = new MemoryStorage()
const project = createKyzaProjectV1({
  id: "pack-gen-project-101",
  name: "Retail Snack Launch",
  createdAt: timestamp,
  updatedAt: timestamp,
  metadata: {
    customerOrBrand: "Northstar Foods",
    productName: "Protein Bar",
    jobReference: "NS-4402",
  },
  artwork: { assetIds: ["artwork-1"] },
  exportSettings: { format: "svg", preserveVector: true, includeLayers: true },
})
assert(saveKyzaProject(project, storage).ok, "Fixture Project must save.")

const validLoad = loadPackGenProject("?projectId=pack-gen-project-101", storage)
assert(validLoad.ok && validLoad.mode === "project", "A valid projectId must load in Project-connected mode.")
assert(validLoad.project.id === project.id, "Pack Gen must not substitute a different Project.")
assert(validLoad.draft.workspace?.completion.status === "Empty", "A Project without Pack Gen state must open an empty controlled draft.")
const writesBeforeStandalone = storage.writeCount
const standalone = loadPackGenProject("", storage)
assert(standalone.ok && standalone.mode === "standalone", "Missing projectId must open standalone Pack Gen mode.")
assert(standalone.draft.workspace?.completion.status === "Empty", "Standalone mode must begin with an in-memory empty draft.")
assert(storage.writeCount === writesBeforeStandalone, "Opening standalone mode must not create or persist a canonical Project.")
const standaloneDraftBeforeProjectDetails = JSON.stringify(standalone.draft)
const standaloneEmptyAction = getPackGenActionState({
  specificationReady: false,
  hasProject: false,
  hasCutter: false,
  incompleteBadgeLabel: "Empty",
})
assert(standaloneEmptyAction.primaryAction === "open-project-details", "Standalone primary action must target Project Details.")
assert(standaloneEmptyAction.saveAction === "open-project-details", "Standalone Save Draft must target Project Details.")
assert(JSON.stringify(standalone.draft) === standaloneDraftBeforeProjectDetails, "Opening or cancelling Project Details must not mutate Pack Gen values.")
assert(storage.writeCount === writesBeforeStandalone, "Cancelling Project Details must create no Project.")
assert(!loadPackGenProject("?projectId=bad%00id", storage).ok, "Invalid projectId must produce controlled recovery.")
assert(!loadPackGenProject("?projectId=missing-project", storage).ok, "Unknown projectId must produce controlled recovery.")

const corruptStorage = new MemoryStorage()
corruptStorage.values.set(KYZA_PROJECT_STORAGE_KEY, "not-json")
const corruptLoad = loadPackGenProject("?projectId=pack-gen-project-101", corruptStorage)
assert(corruptLoad.ok === false, "Corrupt canonical storage must produce controlled recovery.")
assert(corruptLoad.reason === "corrupt", "Corrupt canonical storage must be identified honestly.")

const policies = packModules.map((packModule) => getPackGenFieldPolicy(packModule.id))
assert(policies.every((policy) => policy.available), "Every registered beta pack type must have an available field policy.")
policies.forEach((policy) => {
  assertJsonEqual(
    policy.minimumCutterFields,
    ["packType", "finishedWidthMm", "finishedHeightMm"],
    `${policy.packType} must use buildability, not full specification completeness, as its Cutter minimum.`,
  )
  const expectedSubstrate = policy.packType === "paper-strip" ? "paper" : "clear"
  assert(
    policy.deterministicDefaults.materialNotes === expectedSubstrate,
    `${policy.packType} must use its controlled substrate default.`,
  )
  assert(typeof policy.deterministicDefaults.bleedMm === "number", `${policy.packType} must provide deterministic bleed.`)
  assert(typeof policy.deterministicDefaults.minimumSafeZoneMm === "number", `${policy.packType} must provide a deterministic safe zone.`)
  const expectedMinimumClearance = policy.packType === "sachet-3-side-seal" || policy.packType === "sachet-4-side-seal"
    ? 1
    : policy.packType === "pillow-pack" ? 3
    : policy.packType === "doy-pouch" || policy.packType === "k-seal-pouch" ? 3 : MIN_SEAL_CLEARANCE_MM
  assert(
    Number(policy.deterministicDefaults.minimumSafeZoneMm) >= expectedMinimumClearance,
    `${policy.packType} must not propose a safe-zone value below its pack-specific seal-clearance minimum.`,
  )
  if (policy.packType === "pillow-pack") {
    assert(policy.deterministicDefaults.minimumSafeZoneMm === 3, "Pillow Pack should propose its approved 3 mm safe zone.")
  }
  const expectedEyemarkCount = policy.packType === "2-side-seal-pouch" || policy.packType === "3-side-seal-pouch" ? 2
    : policy.packType === "plain-film" ? 0
    : policy.eyemarkBehaviour === "supported" ? 1 : 0
  assert(
    policy.deterministicDefaults.eyemarkCount === expectedEyemarkCount,
    `${policy.packType} must use the controlled eyemark default for its supported behaviour.`,
  )
  const defaultedDraft = setPackGenField(standalone.draft, "packType", policy.packType)
  const defaultedReadiness = getPackGenCutterReadiness(defaultedDraft)
  assert(defaultedReadiness.ready, `${policy.packType} registered defaults must produce a buildable starting specification.`)
  const connectionStorage = new MemoryStorage()
  const connectedDefault = connectStandalonePackGenToProject(defaultedDraft, {
    projectId: `policy-${policy.packType}`,
    projectName: `${policy.packLabel ?? policy.packType} policy check`,
    createCutter: true,
  }, { storage: connectionStorage, now: () => "2026-07-21T10:00:00.000Z" })
  assert(connectedDefault.ok, `${policy.packType} registered defaults must pass the deterministic Cutter handoff.`)
  const standaloneReadyAction = getPackGenActionState({
    specificationReady: defaultedReadiness.ready,
    hasProject: false,
    hasCutter: false,
    incompleteBadgeLabel: defaultedDraft.workspace?.completion.status ?? "Draft",
  })
  assert(standaloneReadyAction.badgeLabel === "Starting Specification Ready", "Ready standalone specifications must use readiness copy without claiming validation.")
  assert(standaloneReadyAction.primaryLabel === "Continue to Project Details", "Ready standalone specifications must offer Project Details.")
  assert(!standaloneReadyAction.primaryDisabled, "Ready standalone specifications must not leave the primary CTA disabled.")
  assert(
    defaultedDraft.workspace?.fields.materialNotes.value === expectedSubstrate,
    `${policy.packType} must apply its controlled substrate default to the workspace.`,
  )
  assert(
    defaultedDraft.workspace?.fields.eyemarkCount.value === policy.deterministicDefaults.eyemarkCount,
    `${policy.packType} must apply its controlled eyemark default to the workspace.`,
  )
})

const previewRecommendationResult = generatePackGenRecommendations("Stand-up pouch for a dry product, approximately 160 × 240mm")
assert(previewRecommendationResult.ok && previewRecommendationResult.recommendations.length > 0, "Preview fixture must produce a supported recommendation.")
const previewRecommendation = previewRecommendationResult.recommendations[0]
const engineDefaultPreview = createPackGenSuggestionPreviewModel(
  standalone.draft,
  previewRecommendation,
  previewRecommendationResult.input.rawPrompt,
)
assert(engineDefaultPreview.available, "A supported recommendation must resolve to the existing cutter renderer.")
assert(engineDefaultPreview.packType === previewRecommendation.packType, "Preview must use the recommendation's registered pack composer.")
assert(engineDefaultPreview.substrate.source === "Engine default", "An inferred controlled substrate default must not be labelled as user-selected or FlowAI-suggested.")

const userSubstrateDraft = setPackGenField(standalone.draft, "materialNotes", "white")
const userSubstratePreview = createPackGenSuggestionPreviewModel(
  userSubstrateDraft,
  previewRecommendation,
  previewRecommendationResult.input.rawPrompt,
)
assert(userSubstratePreview.substrate.value === "White", "Preview substrate must expose the current selected value.")
assert(userSubstratePreview.substrate.source === "User selected", "A confirmed user substrate must retain user provenance.")
assertJsonEqual(
  getPackGenSubstratePresentation({ workspace: undefined }),
  { value: "Not selected", source: "Not selected" },
  "Missing substrate values must remain explicitly unselected.",
)
const flowwrapPolicy = getPackGenFieldPolicy("flowwrap")
const doyPolicy = getPackGenFieldPolicy("doy-pouch")
const kSealPolicy = getPackGenFieldPolicy("k-seal-pouch")
assert(
  FLOW_WRAP_PACK_TYPE_IDS.packSpecification === "flow_wrap"
    && FLOW_WRAP_PACK_TYPE_IDS.engine === "flowwrap",
  "Flow-wrap IDs must distinguish the authoritative Pack Specification value from the composer ID.",
)
assert(
  toPackSpecificationPackTypeId("flowwrap") === "flow_wrap"
    && toEnginePackTypeId("flow_wrap") === "flowwrap",
  "The typed Flow-wrap adapter must map in both directions.",
)
assertJsonEqual(PACK_SPEC_BUILDER_TABS.map(({ label }) => label), ["Details", "Size", "Pack Setup", "Product", "Review"], "The shared Pack Spec Builder must retain its five universal tabs.")
assertJsonEqual(
  getPackSpecBuilderFields(flowwrapPolicy, "size", false).map(({ field }) => field),
  ["finishedWidthMm", "finishedHeightMm"],
  "Basic Flowwrap size must expose only its primary Cutter dimensions.",
)
assert(
  getPackSpecBuilderFields(doyPolicy, "size", false).some(({ field }) => field === "gussetMm"),
  "A pack with registered gusset capability must expose gusset in Basic size settings.",
)
assert(
  getPackSpecBuilderFields(flowwrapPolicy, "pack-setup", true).some(({ field }) => field === "sealTopMm"),
  "Advanced Pack Setup must reveal engine-backed seal controls.",
)
assert(
  getPackSpecBuilderFields(doyPolicy, "pack-setup", false).some(({ field }) => String(field) === "zipEnabled"),
  "Basic DOY Pack Setup must expose the engine-backed reclosable zip setting.",
)
assert(
  getPackSpecBuilderFields(kSealPolicy, "pack-setup", false).some(({ field }) => String(field) === "zipEnabled"),
  "Basic K-Seal Pack Setup must expose the shared engine-backed zip setting.",
)
assert(
  !getPackSpecBuilderFields(flowwrapPolicy, "pack-setup", false).some(({ field }) => String(field) === "zipEnabled"),
  "Flowwrap must not expose a zip setting its composer cannot consume.",
)
const advancedValueDraft = setPackGenField(
  setPackGenField(standalone.draft, "packType", "flowwrap"),
  "minimumSafeZoneMm",
  7.5,
)
assert(
  !getPackSpecBuilderFields(flowwrapPolicy, "pack-setup", false).some(({ field }) => field === "minimumSafeZoneMm"),
  "Turning Advanced Settings off must hide advanced controls.",
)
assert(
  advancedValueDraft.workspace?.fields.minimumSafeZoneMm.value === 7.5,
  "Turning Advanced Settings off must not reset an advanced value in the shared Pack Specification draft.",
)
assert(
  ![...PACK_SPEC_BUILDER_TABS.flatMap(({ id }) => getPackSpecBuilderFields(doyPolicy, id, true))]
    .some(({ field }) => field === "featuresNotes" || field === "openingRequirements"),
  "The builder must omit feature controls that the current Cutter handoff cannot consume.",
)
assert(getPackGenFieldPolicy().deterministicDefaults.materialNotes === "clear", "Pack Gen must use Clear as its generic substrate default.")
assert(kSealPolicy.deterministicDefaults.finishedWidthMm === 190, "K-Seal field policy must expose finished pouch width on the cutter's vertical axis.")
assert(kSealPolicy.deterministicDefaults.finishedHeightMm === 200, "K-Seal field policy must expose finished pouch height on the flat cutter's horizontal axis.")
assert(kSealPolicy.deterministicDefaults.bleedMm === 3, "K-Seal field policy must derive the registered 3mm bleed default.")
assert(!flowwrapPolicy.visibleFields.includes("gussetMm"), "Flowwrap must not expose a gusset field.")
assert(!flowwrapPolicy.visibleFields.includes("openingRequirements"), "Flowwrap must not expose pouch opening requirements.")
assert(!flowwrapPolicy.visibleFields.includes("featuresNotes"), "Flowwrap must not ask for zipper or unrelated feature notes.")
assert(doyPolicy.visibleFields.includes("gussetMm"), "DOY must expose its registered gusset capability.")
assert(kSealPolicy.visibleFields.includes("trimMm"), "K-Seal must expose its supported trim capability.")
assert(kSealPolicy.deterministicDefaults.trimMm === 10, "Pack Gen must apply the approved 10mm K-Seal trim starting value.")
assert(!flowwrapPolicy.visibleFields.includes("trimMm"), "Flowwrap must not expose K-Seal trim.")
assert(
  getPackSpecBuilderFields(kSealPolicy, "pack-setup", true).some(({ field }) => field === "trimMm"),
  "Advanced K-Seal Pack Setup must expose trim.",
)
const kSealSizeFields = getPackSpecBuilderFields(kSealPolicy, "size", false)
assert(
  kSealSizeFields.find(({ field }) => field === "finishedWidthMm")?.label === "Pouch Width (mm)"
    && kSealSizeFields.find(({ field }) => field === "finishedHeightMm")?.label === "Pouch Height (mm)",
  "K-Seal Builder fields must use explicit pouch-axis labels.",
)
const doySizeFields = getPackSpecBuilderFields(doyPolicy, "size", false)
assert(
  doySizeFields.find(({ field }) => field === "finishedWidthMm")?.label === "Finished width (mm)"
    && doySizeFields.find(({ field }) => field === "finishedHeightMm")?.label === "Finished height (mm)",
  "DOY Builder fields must retain the shared direct dimension labels.",
)
const asymmetricKSealComposerDimensions = toKSealComposerDimensions({
  finishedWidthMm: 173.5,
  finishedHeightMm: 205,
})
assert(
  asymmetricKSealComposerDimensions.pouchHeight === 205
    && asymmetricKSealComposerDimensions.pouchWidth === 173.5,
  "The typed K-Seal adapter must cross-map canonical finished width/height into the established legacy pouchHeight/pouchWidth fields.",
)

const heightHandoffCases: Array<[string, number, number]> = [
  ["K Seal pouch, 190 mm wide × 300 mm high", 190, 300],
  ["K Seal pouch, 190 mm wide × 400 mm high", 190, 400],
  ["K Seal pouch, 250 mm wide × 350 mm high", 250, 350],
  ["DOY pouch, 175 mm wide × 260 mm high", 175, 260],
  ["Three-side seal sachet, 70 mm wide × 100 mm high", 70, 100],
  ["510 mm wide × 280 mm high flowwrap pack", 510, 280],
  ["510 mm wide × 350 mm high flowwrap pack", 510, 350],
  ["400 mm wide × 220 mm high flowwrap pack", 400, 220],
  ["510 mm wide × 310 mm high pillow-pack", 510, 310],
  ["420 mm wide × 250 mm high pillow-pack", 420, 250],
]
heightHandoffCases.forEach(([prompt, width, height], index) => {
  const recommendation = generatePackGenRecommendations(prompt).recommendations[0]
  const heightDraft = applyRecommendationToPackGenDraft(standalone.draft, recommendation, prompt)
  assert(heightDraft.workspace?.fields.finishedWidthMm.value === width, `${prompt} must reach the canonical Builder width field.`)
  assert(heightDraft.workspace?.fields.finishedHeightMm.value === height, `${prompt} must reach the Builder height field.`)
  const readiness = getPackGenCutterReadiness(heightDraft)
  assert(readiness.ready, `${prompt} must produce deterministic Cutter inputs.`)
  const generated = createCutterSpecFromConfirmedPackValues(readiness.values, `height-handoff-${index}`)
  assert(generated.ok, `${prompt} must generate a valid Cutter: ${JSON.stringify(generated)}`)
  if (generated.packType === "k-seal-pouch") {
    assert(generated.spec.kSealPouch?.pouchHeight === height, "K-Seal finished height must map to kSealPouch.pouchHeight.")
    assert(generated.spec.kSealPouch?.pouchWidth === width, "K-Seal finished width must map to kSealPouch.pouchWidth.")
    assert(resolveKSealPouchGeometry(generated.spec).height === width, "K-Seal rendered cutter height must use the prompted finished width.")
  } else if (generated.packType === "doy-pouch") {
    assert(doyFinishedWidth(generated.spec) === height && generated.spec.height === width, "DOY Builder finished height must map to the flat cutter and width to cutter height.")
    assert(resolveFlowwrapGeometry(generated.spec).cutterRect.height === width, "DOY rendered cutter height must use finished width.")
  } else {
    assert(generated.spec.width === width && generated.spec.height === height, `${generated.packType} must use top-level width and height.`)
    assert(resolveFlowwrapGeometry(generated.spec).cutterRect.height === height, `${generated.packType} rendered measurement must retain explicit height.`)
  }
})

const kSealTwoEyemarkDraft = setPackGenField(
  setPackGenField(
    setPackGenField(standalone.draft, "packType", "k-seal-pouch"),
    "eyemarkCount",
    2,
  ),
  "finishedHeightMm",
  300,
)
const kSealTwoEyemarkReadiness = getPackGenCutterReadiness(kSealTwoEyemarkDraft)
assert(kSealTwoEyemarkReadiness.ready, "Two-eyemark K-Seal must remain ready after Builder selection.")
const kSealTwoEyemarkSpec = createCutterSpecFromConfirmedPackValues(kSealTwoEyemarkReadiness.values, "kseal-two-eyemark")
assert(kSealTwoEyemarkSpec.ok, `Two-eyemark K-Seal must generate: ${JSON.stringify(kSealTwoEyemarkSpec)}`)
assert(
  kSealTwoEyemarkSpec.spec.eyeMarks?.count === 2
    && kSealTwoEyemarkSpec.spec.eyeMarks.width === 7
    && kSealTwoEyemarkSpec.spec.eyeMarks.height === 5
    && kSealTwoEyemarkSpec.spec.eyeMarks.width2 === 7
    && kSealTwoEyemarkSpec.spec.eyeMarks.height2 === 5,
  "K-Seal dual eyemarks must use trim-aware widths and independent 5 mm heights.",
)
;[0, 1, 2].forEach((eyemarkCount) => {
  const countDraft = setPackGenField(
    setPackGenField(standalone.draft, "packType", "k-seal-pouch"),
    "eyemarkCount",
    eyemarkCount,
  )
  const countReadiness = getPackGenCutterReadiness(countDraft)
  assert(countReadiness.ready, `K-Seal with ${eyemarkCount} eyemark(s) must remain buildable.`)
  const countSpec = createCutterSpecFromConfirmedPackValues(countReadiness.values, `kseal-eyemark-${eyemarkCount}`)
  assert(countSpec.ok, `K-Seal with ${eyemarkCount} eyemark(s) must generate.`)
  assert(countSpec.spec.eyeMarks?.count === eyemarkCount, `K-Seal must retain eyemark count ${eyemarkCount}.`)
})
policies
  .filter((policy) => policy.eyemarkBehaviour === "supported" && !policy.packType?.startsWith("sachet-"))
  .forEach((policy) => {
    ;[0, 1, 2].forEach((eyemarkCount) => {
      const countDraft = setPackGenField(
        setPackGenField(standalone.draft, "packType", policy.packType),
        "eyemarkCount",
        eyemarkCount,
      )
      const countReadiness = getPackGenCutterReadiness(countDraft)
      assert(countReadiness.ready, `${policy.packType} with ${eyemarkCount} eyemark(s) must remain buildable.`)
      const countSpec = createCutterSpecFromConfirmedPackValues(
        countReadiness.values,
        `${policy.packType}-eyemark-${eyemarkCount}`,
      )
      assert(countSpec.ok, `${policy.packType} with ${eyemarkCount} eyemark(s) must generate.`)
      assert(countSpec.spec.eyeMarks?.count === eyemarkCount, `${policy.packType} must retain eyemark count ${eyemarkCount}.`)
      if (policy.packType === "2-side-seal-pouch" || policy.packType === "3-side-seal-pouch") {
        assert(countSpec.spec.sideSealPouch?.trimEnabled === (eyemarkCount > 0), "Pouch trim should follow the chosen eyemark count.")
        assert(countSpec.spec.sideSealPouch?.trimWidth === 15, "Pouch trims should be 15 mm when enabled.")
      }
    })
  })

const zipRecommendation = generatePackGenRecommendations("Stand-up pouch with a reclosable zip").recommendations[0]
const zipDraft = applyRecommendationToPackGenDraft(
  standalone.draft,
  zipRecommendation,
  "Stand-up pouch with a reclosable zip",
)
assert(zipDraft.workspace?.fields.zipEnabled.value === true, "A supported zip prompt must pre-populate the Builder setting.")
assert(zipDraft.workspace?.fields.zipEnabled.source === "flowai", "An explicitly requested zip must retain FlowAI provenance.")
assert(
  kSealTwoEyemarkDraft.workspace?.fields.zipEnabled.value === false
    && kSealTwoEyemarkDraft.workspace.fields.zipEnabled.source === "kyza-tech",
  "An unrequested supported zip default must retain deterministic engine provenance.",
)
const zipReadiness = getPackGenCutterReadiness(zipDraft)
assert(zipReadiness.ready && zipReadiness.values.zipEnabled, "The zip setting must reach deterministic Cutter inputs.")
const zipSpec = createCutterSpecFromConfirmedPackValues(zipReadiness.values, "doy-zip-handoff")
assert(zipSpec.ok && zipSpec.spec.doyPouch?.showZipper === true, "DOY zip-on must map to the existing showZipper engine property.")
assert(zipSpec.ok && zipSpec.spec.doyPouch?.trimEnabled === false && zipSpec.spec.doyPouch.trim === 15, "DOY handoff must retain the stored trim width without enabling the optional trim by default.")
const zipOffSpec = createCutterSpecFromConfirmedPackValues(
  { ...zipReadiness.values, zipEnabled: false },
  "doy-no-zip-handoff",
)
assert(zipOffSpec.ok && zipOffSpec.spec.doyPouch?.showZipper === false, "DOY zip-off must remove the zipper from composer input.")
const kSealZipSpec = createCutterSpecFromConfirmedPackValues(
  { ...kSealTwoEyemarkReadiness.values, zipEnabled: true },
  "kseal-zip-handoff",
)
assert(kSealZipSpec.ok && kSealZipSpec.spec.doyPouch?.showZipper === true, "K-Seal must map the shared zip setting to its existing composer input.")

const confirmedKSealDraft = setPackGenField(
  setPackGenField(
    setPackGenField({ ...standalone.draft, id: "existing-kseal-project" }, "packType", "k-seal-pouch"),
    "finishedHeightMm",
    325,
  ),
  "bleedMm",
  0,
)
const confirmedKSealRecommendation = generatePackGenRecommendations("K Seal pouch, 190 mm wide × 300 mm high").recommendations[0]
const reappliedKSealDraft = applyRecommendationToPackGenDraft(
  confirmedKSealDraft,
  confirmedKSealRecommendation,
  "K Seal pouch, 190 mm wide × 300 mm high",
)
assert(reappliedKSealDraft.workspace?.fields.finishedHeightMm.value === 325, "A later suggestion must not overwrite user-confirmed height.")
assert(reappliedKSealDraft.workspace?.fields.bleedMm.value === 0, "An intentional confirmed 0mm bleed must be preserved for existing Projects.")
const staleStandaloneKSealDraft = setPackGenField(
  setPackGenField(
    setPackGenField(standalone.draft, "packType", "k-seal-pouch"),
    "finishedWidthMm",
    190,
  ),
  "finishedHeightMm",
  10,
)
const refreshedStandaloneKSealDraft = applyRecommendationToPackGenDraft(
  staleStandaloneKSealDraft,
  confirmedKSealRecommendation,
  "K Seal pouch, 190 mm wide × 300 mm high, two eyemarks",
)
assert(
  refreshedStandaloneKSealDraft.workspace?.fields.finishedWidthMm.value === 190
    && refreshedStandaloneKSealDraft.workspace.fields.finishedHeightMm.value === 300,
  "Selecting a standalone recommendation must refresh stale confirmed dimensions without crossing their axes.",
)
assert(
  refreshedStandaloneKSealDraft.workspace.fields.trimMm.value === 10
    && refreshedStandaloneKSealDraft.workspace.fields.gussetMm.value === 40,
  "Standalone recommendation dimensions must remain separate from deterministic trim and gusset values.",
)
const refreshedStandaloneKSealReadiness = getPackGenCutterReadiness(refreshedStandaloneKSealDraft)
assert(
  refreshedStandaloneKSealReadiness.ready
    && refreshedStandaloneKSealReadiness.values.finishedWidthMm === 190
    && refreshedStandaloneKSealReadiness.values.finishedHeightMm === 300
    && refreshedStandaloneKSealReadiness.values.trimMm === 10
    && refreshedStandaloneKSealReadiness.values.gussetMm === 40,
  "The refreshed 300 × 190mm specification and 10mm trim must reach Cutter readiness as separate values.",
)
const refreshedStandaloneKSealSpec = createCutterSpecFromConfirmedPackValues(
  refreshedStandaloneKSealReadiness.values,
  "kseal-refreshed-standalone-handoff",
)
assert(
  refreshedStandaloneKSealSpec.ok
    && refreshedStandaloneKSealSpec.spec.kSealPouch?.pouchHeight === 300
    && refreshedStandaloneKSealSpec.spec.kSealPouch?.pouchWidth === 190
    && refreshedStandaloneKSealSpec.spec.kSealPouch?.trim === 10
    && refreshedStandaloneKSealSpec.spec.kSealPouch?.gussetSize === 40
    && refreshedStandaloneKSealSpec.spec.width === 700
    && refreshedStandaloneKSealSpec.spec.height === 190,
  "The standalone Builder contract must hand off 300 × 190mm finished dimensions and resolve a 700 × 190mm flat Cutter.",
)
assertJsonEqual(flowwrapPolicy.notApplicableFields.includes("gussetMm"), true, "Flowwrap must identify gusset as not applicable.")
assert(
  JSON.stringify(flowwrapPolicy.visibleFields) !== JSON.stringify(doyPolicy.visibleFields),
  "Pack-specific field policies must differ.",
)
const flowwrapEyeMarkDefaults = packModules.find((packModule) => packModule.id === "flowwrap")
  ?.getDefaults().eyeMarks
const doyEyeMarkDefaults = packModules.find((packModule) => packModule.id === "doy-pouch")
  ?.getDefaults().eyeMarks
assert(flowwrapEyeMarkDefaults && doyEyeMarkDefaults, "Eyemark normalization fixtures require registered module defaults.")
const normalizedFlowwrapSingle = normalizePackGenEyeMarks(flowwrapEyeMarkDefaults, 1)
assert(normalizedFlowwrapSingle.position === "top-left", "A single Flowwrap eyemark must resolve from the module's top default to its valid single-mark side.")
assert(normalizedFlowwrapSingle.width2 === undefined && normalizedFlowwrapSingle.height2 === undefined, "Changing two eyemarks to one must clear second-mark sizes.")
assert(normalizedFlowwrapSingle.offsetX2 === undefined && normalizedFlowwrapSingle.offsetY2 === undefined, "Changing two eyemarks to one must clear second-mark offsets.")
const normalizedFlowwrapNone = normalizePackGenEyeMarks(normalizedFlowwrapSingle, 0)
assert(normalizedFlowwrapNone.count === 0, "Changing one eyemark to zero must disable eyemark output.")
assert(normalizedFlowwrapNone.offsetX === undefined && normalizedFlowwrapNone.offsetY === undefined, "Changing one eyemark to zero must clear placement data.")
const normalizedFlowwrapDouble = normalizePackGenEyeMarks(normalizedFlowwrapSingle, 2)
assert(normalizedFlowwrapDouble.position === "top", "Changing one eyemark to two must restore a valid dual-mark position.")
assert(normalizedFlowwrapDouble.width2 === normalizedFlowwrapDouble.width, "A second eyemark must receive a complete module-compatible size.")
const normalizedDoySingle = normalizePackGenEyeMarks(doyEyeMarkDefaults, 1)
assert(normalizedDoySingle.position === "centre", "Switching pack type must use the new module's eyemark position instead of stale Flowwrap state.")
const deliberatelyInvalidEyeMarkSpec = flowwrapPack.getDefaults()
deliberatelyInvalidEyeMarkSpec.eyeMarks = {
  ...deliberatelyInvalidEyeMarkSpec.eyeMarks!,
  count: 1,
  position: "top",
}
assert(
  flowwrapPack.validate(deliberatelyInvalidEyeMarkSpec).errors.includes("Eyemark position is invalid for a single mark."),
  "Legitimate deterministic validation must continue to reject a genuinely inconsistent eyemark structure.",
)
const zeroAssumptionDraft = setPackGenField(standalone.draft, "packType", "flowwrap")
assert(zeroAssumptionDraft.workspace?.assumptions.length === 0, "The zero-assumption fixture must contain no assumptions.")
assert(zeroAssumptionDraft.workspace?.completion.assumptionsAwaitingReview === 0, "Zero assumptions must be automatically clear without checking review.")
assert(getPackGenCutterReadiness(zeroAssumptionDraft).ready, "Zero assumptions must not block initial Cutter readiness.")
const connectedProjectAction = getPackGenActionState({
  specificationReady: true,
  hasProject: true,
  hasCutter: false,
  incompleteBadgeLabel: "Draft",
})
assert(connectedProjectAction.primaryAction === "create-cutter", "Project-connected mode must never reopen Project Details.")
assert(connectedProjectAction.primaryLabel === "Create in Cutter Studio", "Project-connected mode must use the Cutter Studio action copy.")

const recommendation = generatePackGenRecommendations("pillow pack protein bar 350 x 220").recommendations[0]
const standaloneProjectStorage = new MemoryStorage()
const standaloneRecommendationDraft = applyRecommendationToPackGenDraft(
  standalone.draft,
  recommendation,
  "pillow pack protein bar 350 x 220",
)
const whitespaceProjectStorage = new MemoryStorage()
const whitespaceProject = connectStandalonePackGenToProject(
  standaloneRecommendationDraft,
  { projectName: "   ", brand: "", jobReference: "" },
  { storage: whitespaceProjectStorage, now: () => timestamp },
)
assert(whitespaceProject.ok === false, "A whitespace-only Project Name must fail controlled validation.")
assert(!whitespaceProjectStorage.values.has(KYZA_PROJECT_STORAGE_KEY), "An invalid Project Name must not persist a partial Project.")
const failedStandaloneStorage = new MemoryStorage()
failedStandaloneStorage.failWrites = true
const standaloneDraftBeforeFailure = JSON.stringify(standaloneRecommendationDraft)
const failedStandaloneConnect = connectStandalonePackGenToProject(
  standaloneRecommendationDraft,
  {
    projectName: "Standalone Protein Bar",
    projectId: "standalone-failed-201",
    brand: "Northstar Foods",
    jobReference: "NS-FAILED-201",
  },
  { storage: failedStandaloneStorage, now: () => timestamp },
)
assert(failedStandaloneConnect.ok === false, "A standalone Project save failure must be reported without navigating.")
assert(JSON.stringify(standaloneRecommendationDraft) === standaloneDraftBeforeFailure, "A standalone save failure must preserve all in-memory Pack Gen values.")
assert(!failedStandaloneStorage.values.has(KYZA_PROJECT_STORAGE_KEY), "A failed standalone save must not create another storage record.")
const connectedStandalone = connectStandalonePackGenToProject(
  standaloneRecommendationDraft,
  {
    projectName: "Standalone Protein Bar",
    projectId: "standalone-project-202",
    brand: "   ",
    jobReference: "",
    createCutter: true,
  },
  { storage: standaloneProjectStorage, now: () => timestamp },
)
assert(connectedStandalone.ok, "An explicit Project Details action must be able to connect the in-memory draft.")
assert(connectedStandalone.project.id === "standalone-project-202", "Standalone connection must establish one canonical Project ID.")
assert(connectedStandalone.draft.id === connectedStandalone.project.id, "Connected Pack Gen state must adopt the canonical Project ID.")
assert(connectedStandalone.draft.productPrompt === "pillow pack protein bar 350 x 220", "Standalone prompt state must transfer into the Project.")
assert(connectedStandalone.project.metadata?.customerOrBrand === undefined, "Blank optional Brand metadata must be omitted.")
assert(connectedStandalone.project.metadata?.jobReference === undefined, "Blank optional Job Reference metadata must be omitted.")
assertJsonEqual(
  [...standaloneProjectStorage.values.keys()],
  [KYZA_PROJECT_STORAGE_KEY],
  "Connecting standalone Pack Gen must use only canonical Project storage.",
)
const standaloneCutter = createOrUpdateCutterFromPackGen(
  connectedStandalone.project.id,
  connectedStandalone.draft,
  connectedStandalone.project.revision,
  { storage: standaloneProjectStorage, now: () => nextTimestamp },
)
assert(standaloneCutter.ok, "Confirmed standalone Project Details must create the deterministic Cutter.")
assert(standaloneCutter.project.id === connectedStandalone.project.id, "Standalone Cutter must use the same new canonical Project ID.")
const standaloneProjects = listKyzaProjects(standaloneProjectStorage)
assert(standaloneProjects.ok && standaloneProjects.value.length === 1, "Standalone continuation must create exactly one canonical Project.")
assert(standaloneProjects.value[0].cutter?.packType === recommendation.packType, "The one standalone Project must contain the generated Cutter.")

const legacyZipStorage = new MemoryStorage()
const legacyZipProjects = JSON.parse(standaloneProjectStorage.values.get(KYZA_PROJECT_STORAGE_KEY)!) as Array<{
  projectDraft?: { workspace?: { fields?: Record<string, unknown> } }
}>
delete legacyZipProjects[0].projectDraft?.workspace?.fields?.zipEnabled
legacyZipStorage.values.set(KYZA_PROJECT_STORAGE_KEY, JSON.stringify(legacyZipProjects))
const legacyZipWritesBeforeLoad = legacyZipStorage.writeCount
const legacyZipLoad = loadPackGenProject("?projectId=standalone-project-202", legacyZipStorage)
assert(legacyZipLoad.ok, "A Project saved before zipEnabled existed must remain readable.")
assert(legacyZipLoad.draft.workspace?.fields.zipEnabled.state === "missing", "Legacy Project load must add an in-memory missing zip field without inventing a value.")
assert(legacyZipStorage.writeCount === legacyZipWritesBeforeLoad, "Legacy Project load must not silently migrate or rewrite canonical storage.")
const invalidZipStorage = new MemoryStorage()
const invalidZipProjects = JSON.parse(standaloneProjectStorage.values.get(KYZA_PROJECT_STORAGE_KEY)!) as Array<{
  projectDraft?: { workspace?: { fields?: Record<string, unknown> } }
}>
invalidZipProjects[0].projectDraft!.workspace!.fields!.zipEnabled = {
  value: "on",
  state: "confirmed",
  source: "user",
}
invalidZipStorage.values.set(KYZA_PROJECT_STORAGE_KEY, JSON.stringify(invalidZipProjects))
const invalidZipLoad = loadPackGenProject("?projectId=standalone-project-202", invalidZipStorage)
assert(invalidZipLoad.ok === false && invalidZipLoad.reason === "corrupt", "A non-boolean persisted zip value must fail the canonical Project contract.")

const zipProjectStorage = new MemoryStorage()
const connectedZipProject = connectStandalonePackGenToProject(
  zipDraft,
  {
    projectName: "Stand-up Pouch Zip",
    projectId: "stand-up-pouch-zip-206",
    createCutter: true,
  },
  { storage: zipProjectStorage, now: () => timestamp },
)
assert(connectedZipProject.ok, "A prompt-requested zip must survive direct standalone Cutter creation.")
const createdZipProject = createOrUpdateCutterFromPackGen(
  connectedZipProject.project.id,
  connectedZipProject.draft,
  connectedZipProject.project.revision,
  { storage: zipProjectStorage, now: () => nextTimestamp },
)
assert(createdZipProject.ok, "The prompt-requested zip must create a deterministic Cutter.")
assert(createdZipProject.project.cutter?.legacySpec.doyPouch?.showZipper === true, "The saved Cutter must retain zip-on.")
const reopenedZipProject = loadPackGenProject("?projectId=stand-up-pouch-zip-206", zipProjectStorage)
assert(reopenedZipProject.ok && reopenedZipProject.mode === "project", "The saved zip Project must reopen in Project-connected mode.")
assert(reopenedZipProject.draft.workspace?.fields.zipEnabled.value === true, "Save/reopen must restore the zip setting.")
const zipRemovedDraft = setPackGenField(reopenedZipProject.draft, "zipEnabled", false)
const zipRemovedProject = createOrUpdateCutterFromPackGen(
  reopenedZipProject.project.id,
  zipRemovedDraft,
  reopenedZipProject.project.revision,
  { storage: zipProjectStorage, now: () => nextTimestamp },
)
assert(zipRemovedProject.ok, "Removing zip must update the connected specification and Cutter.")
assert(zipRemovedProject.project.cutter?.legacySpec.doyPouch?.showZipper === false, "The updated Cutter must retain zip-off.")
const reopenedZipRemovedProject = loadPackGenProject("?projectId=stand-up-pouch-zip-206", zipProjectStorage)
assert(reopenedZipRemovedProject.ok && reopenedZipRemovedProject.draft.workspace?.fields.zipEnabled.value === false, "Save/reopen must retain zip removal.")

const kSealAcceptanceStorage = new MemoryStorage()
const exactKSealRecommendation = generatePackGenRecommendations(
  "K Seal pouch, 190 mm wide × 300 mm high, clear substrate, two eyemarks and a reclosable zip",
).recommendations[0]
const exactKSealDraft = applyRecommendationToPackGenDraft(
  standalone.draft,
  exactKSealRecommendation,
  "K Seal pouch, 190 mm wide × 300 mm high, clear substrate, two eyemarks and a reclosable zip",
)
assert(exactKSealDraft.workspace?.fields.packType.value === "k-seal-pouch", "The active suggestion must initialize the Builder pack type.")
assert(
  exactKSealDraft.workspace?.fields.finishedWidthMm.value === 190
    && exactKSealDraft.workspace.fields.finishedHeightMm.value === 300,
  "The exact beta prompt must initialize canonical 300 × 190mm finished dimensions.",
)
assert(exactKSealDraft.workspace?.fields.eyemarkCount.value === 2, "The active suggestion must initialize two eyemarks.")
assert(exactKSealDraft.workspace?.fields.trimMm.value === 10, "The Pack Service policy must initialize K-Seal trim.")
assert(exactKSealDraft.workspace?.fields.trimMm.source === "kyza-tech", "Trim must retain deterministic Pack Service provenance.")
const connectedKSealAcceptance = connectStandalonePackGenToProject(
  exactKSealDraft,
  {
    projectName: "K-Seal QA Acceptance",
    projectId: "kseal-qa-207",
    createCutter: true,
  },
  { storage: kSealAcceptanceStorage, now: () => timestamp },
)
assert(connectedKSealAcceptance.ok, "A new K-Seal with two eyemarks and the registered bleed default must generate.")
const createdKSealAcceptance = createOrUpdateCutterFromPackGen(
  connectedKSealAcceptance.project.id,
  connectedKSealAcceptance.draft,
  connectedKSealAcceptance.project.revision,
  { storage: kSealAcceptanceStorage, now: () => nextTimestamp },
)
assert(createdKSealAcceptance.ok, "The new K-Seal acceptance Project must create a deterministic Cutter.")
assert(
  createdKSealAcceptance.project.cutter?.legacySpec.width === 700
    && createdKSealAcceptance.project.cutter.legacySpec.height === 190,
  "The generated K-Seal must persist 700 × 190mm flat Cutter dimensions with bottom seals inside the gusset.",
)
assert(createdKSealAcceptance.project.cutter?.legacySpec.bleed === 3, "The generated K-Seal must use the registered 3mm bleed default.")
assert(createdKSealAcceptance.project.cutter?.legacySpec.eyeMarks?.count === 2, "The generated K-Seal must persist both eyemarks.")
assert(createdKSealAcceptance.project.cutter?.legacySpec.kSealPouch?.trim === 10, "The Cutter handoff must use accepted Pack Specification trim.")
const createdKSealEyemarkRefs = getEyemarkElementRefs(createdKSealAcceptance.project)
  .filter(({ status }) => status === "active")
assert(createdKSealEyemarkRefs.length === 2, "The exact two-eyemark prompt must create two active Cutter elements.")
assert(createdKSealEyemarkRefs[0]?.id !== createdKSealEyemarkRefs[1]?.id, "The exact prompt must create distinct CutterElement IDs.")
const reopenedKSealAcceptance = loadPackGenProject("?projectId=kseal-qa-207", kSealAcceptanceStorage)
assert(reopenedKSealAcceptance.ok && reopenedKSealAcceptance.mode === "project", "The K-Seal acceptance Project must reopen.")
assert(
  reopenedKSealAcceptance.draft.workspace?.fields.finishedWidthMm.value === 190
    && reopenedKSealAcceptance.draft.workspace.fields.finishedHeightMm.value === 300,
  "Reopen must retain canonical 300 × 190mm finished dimensions.",
)
assert(reopenedKSealAcceptance.draft.workspace?.fields.bleedMm.value === 3, "Reopen must retain the authoritative K-Seal bleed default.")
assert(reopenedKSealAcceptance.draft.workspace?.fields.eyemarkCount.value === 2, "Reopen must retain two eyemarks.")
assert(reopenedKSealAcceptance.draft.workspace?.fields.trimMm.value === 10, "Reopen must retain accepted trim and provenance state.")
assert(reopenedKSealAcceptance.draft.workspace?.selectedRecommendationId === exactKSealRecommendation.id, "Reopen must retain active recommendation provenance.")
const reopenedKSealEyemarkRefs = getEyemarkElementRefs(reopenedKSealAcceptance.project)
  .filter(({ status }) => status === "active")
assert(
  JSON.stringify(reopenedKSealEyemarkRefs.map(({ id }) => id))
    === JSON.stringify(createdKSealEyemarkRefs.map(({ id }) => id)),
  "Save/reopen must retain both stable CutterElement IDs.",
)
const validationIdentityFixture = JSON.parse(
  JSON.stringify(reopenedKSealAcceptance.project),
) as typeof reopenedKSealAcceptance.project
validationIdentityFixture.cutter!.legacySpec.eyeMarks!.width = 4
validationIdentityFixture.cutter!.legacySpec.eyeMarks!.width2 = 4
const validationIdentityRun = validateProjectCutter(validationIdentityFixture, {
  trigger: "manual",
  now: () => nextTimestamp,
})
const validationEyemarkIds = new Set(
  validationIdentityRun.issues.map(({ affectedElementId }) => affectedElementId),
)
assert(
  reopenedKSealEyemarkRefs.every(({ id }) => validationEyemarkIds.has(id)),
  "Validation must reference both stable eyemark CutterElement IDs.",
)
const preTrimWorkspaceStorage = new MemoryStorage()
const preTrimWorkspaceProjects = JSON.parse(kSealAcceptanceStorage.values.get(KYZA_PROJECT_STORAGE_KEY)!) as Array<{
  projectDraft?: { workspace?: { fields?: Record<string, unknown> } }
}>
delete preTrimWorkspaceProjects[0]?.projectDraft?.workspace?.fields?.trimMm
preTrimWorkspaceStorage.values.set(KYZA_PROJECT_STORAGE_KEY, JSON.stringify(preTrimWorkspaceProjects))
const migratedPreTrimWorkspace = loadPackGenProject("?projectId=kseal-qa-207", preTrimWorkspaceStorage)
assert(migratedPreTrimWorkspace.ok, "A saved workspace from before trimMm was added must reopen.")
assert(migratedPreTrimWorkspace.draft.workspace?.fields.trimMm.state === "missing", "Compatibility hydration must add missing trim provenance without changing saved values.")
const migratedPreTrimReadiness = getPackGenCutterReadiness(migratedPreTrimWorkspace.draft)
assert(migratedPreTrimReadiness.ready && migratedPreTrimReadiness.values.trimMm === 10, "A pre-trim workspace must use the current deterministic K-Seal default at handoff.")
const editedKSealAcceptance = setPackGenField(reopenedKSealAcceptance.draft, "finishedWidthMm", 205)
const updatedKSealAcceptance = createOrUpdateCutterFromPackGen(
  reopenedKSealAcceptance.project.id,
  editedKSealAcceptance,
  reopenedKSealAcceptance.project.revision,
  { storage: kSealAcceptanceStorage, now: () => nextTimestamp },
)
assert(updatedKSealAcceptance.ok, "Editing another K-Seal field must regenerate successfully.")
assert(updatedKSealAcceptance.project.cutter?.legacySpec.eyeMarks?.count === 2, "Unrelated regeneration must preserve both eyemarks.")

const trimmedMetadataStorage = new MemoryStorage()
const trimmedMetadataProject = connectStandalonePackGenToProject(
  standaloneRecommendationDraft,
  {
    projectName: "Trimmed Metadata",
    projectId: "trimmed-metadata-205",
    brand: "  Northstar Foods  ",
    jobReference: "  NS-205  ",
  },
  { storage: trimmedMetadataStorage, now: () => timestamp },
)
assert(trimmedMetadataProject.ok, "Optional Project metadata must remain accepted when supplied.")
assert(trimmedMetadataProject.project.metadata?.customerOrBrand === "Northstar Foods", "Brand metadata must be trimmed before persistence.")
assert(trimmedMetadataProject.project.metadata?.jobReference === "NS-205", "Job Reference metadata must be trimmed before persistence.")

const flowwrapSingleStorage = new MemoryStorage()
const flowwrapSingleDraft = setPackGenField(
  setPackGenField(standalone.draft, "packType", "flowwrap"),
  "eyemarkCount",
  1,
)
const flowwrapSingleProject = connectStandalonePackGenToProject(
  flowwrapSingleDraft,
  {
    projectName: "Single Eyemark Flowwrap",
    projectId: "flowwrap-single-eyemark-203",
    createCutter: true,
  },
  { storage: flowwrapSingleStorage, now: () => timestamp },
)
assert(flowwrapSingleProject.ok, `A one-eyemark Flowwrap must pass deterministic preflight: ${JSON.stringify(flowwrapSingleProject)}`)
assert(
  flowwrapSingleProject.project.projectDraft?.workspace?.fields.packType.value === "flow_wrap",
  "The saved Flow-wrap Pack Specification must use the authoritative flow_wrap ID.",
)
const legacyFlowwrapWorkspaceStorage = new MemoryStorage()
const legacyFlowwrapProjects = JSON.parse(
  flowwrapSingleStorage.values.get(KYZA_PROJECT_STORAGE_KEY)!,
) as Array<{ projectDraft?: { workspace?: { fields?: { packType?: { value?: string } } } } }>
legacyFlowwrapProjects[0]!.projectDraft!.workspace!.fields!.packType!.value = "flowwrap"
legacyFlowwrapWorkspaceStorage.values.set(
  KYZA_PROJECT_STORAGE_KEY,
  JSON.stringify(legacyFlowwrapProjects),
)
const migratedFlowwrapWorkspace = loadPackGenProject(
  "?projectId=flowwrap-single-eyemark-203",
  legacyFlowwrapWorkspaceStorage,
)
assert(
  migratedFlowwrapWorkspace.ok
    && migratedFlowwrapWorkspace.draft.workspace?.fields.packType.value === "flow_wrap",
  "Existing Pack Gen workspaces must normalize the composer ID to authoritative flow_wrap on load.",
)
const flowwrapSingleCutter = createOrUpdateCutterFromPackGen(
  flowwrapSingleProject.project.id,
  flowwrapSingleProject.draft,
  flowwrapSingleProject.project.revision,
  { storage: flowwrapSingleStorage, now: () => nextTimestamp },
)
assert(flowwrapSingleCutter.ok, `A one-eyemark Flowwrap must create a deterministic Cutter: ${JSON.stringify(flowwrapSingleCutter)}`)
assert(
  flowwrapSingleCutter.project.cutter?.packType === "flowwrap",
  "The generated Cutter must use the internal flowwrap composer ID.",
)
assert(flowwrapSingleCutter.project.cutter?.legacySpec.eyeMarks?.count === 1, "The generated Flowwrap Cutter must retain one eyemark.")
assert(flowwrapSingleCutter.project.cutter?.legacySpec.eyeMarks?.position === "top-left", "The generated single eyemark must use the module-derived valid position.")
assert(flowwrapSingleCutter.project.cutter?.legacySpec.eyeMarks?.width2 === undefined, "The generated single eyemark must not retain second-mark data.")

const invalidGenerationStorage = new MemoryStorage()
const invalidGenerationDraft = setPackGenField(flowwrapSingleDraft, "minimumSafeZoneMm", 0)
const invalidGeneration = connectStandalonePackGenToProject(
  invalidGenerationDraft,
  {
    projectName: "Invalid Engineering Draft",
    projectId: "invalid-engineering-204",
    createCutter: true,
  },
  { storage: invalidGenerationStorage, now: () => timestamp },
)
assert(invalidGeneration.ok === false, "A genuine deterministic validation error must remain a controlled failure.")
assert(!invalidGenerationStorage.values.has(KYZA_PROJECT_STORAGE_KEY), "Failed Cutter preflight must not leave a partial Project.")
let draft = applyRecommendationToPackGenDraft(
  validLoad.draft,
  recommendation,
  "pillow pack protein bar 350 x 220",
)
assert(draft.workspace?.fields.finishedWidthMm.state === "proposed", "FlowAI values must begin proposed.")
assert(draft.workspace?.fields.finishedWidthMm.source === "flowai", "FlowAI provenance must be retained.")
assert(draft.workspace?.fields.minimumSafeZoneMm.source === "kyza-tech", "Deterministic derived defaults must be identified separately from FlowAI.")
assert(draft.workspace?.assumptions.length, "Recommendation assumptions must enter the shared draft.")
assert(Array.isArray(draft.workspace?.unresolvedQuestions), "Recommendation questions must enter the shared draft.")
assert(project.revision === 1, "Local prompt work must not mutate the Project revision.")

draft = setPackGenField(draft, "finishedWidthMm", 360)
draft = setPackGenField(draft, "minimumSafeZoneMm", 5)
draft = setPackGenField(draft, "materialNotes", "12 micron PET / PE; confirm supplier grade")
assert(draft.workspace?.fields.finishedWidthMm.state === "confirmed", "Manual values must be confirmed.")
assert(draft.workspace?.fields.finishedWidthMm.source === "user", "Manual values must retain user provenance.")
assert(draft.workspace?.fields.finishedHeightMm.state === "proposed", "Manual and prompt paths must share one draft without silently confirming other values.")

draft = acceptProposedPackGenValues(draft)
assert(draft.workspace?.fields.finishedHeightMm.state === "confirmed", "Explicit acceptance must confirm proposed values.")
assert(draft.workspace?.fields.finishedHeightMm.source === "flowai", "Acceptance must preserve the value origin.")
draft = setPackGenReviewState(draft, { assumptionsReviewed: true, unresolvedQuestions: [] })
assert(draft.workspace?.completion.status === "Ready for Cutter Review", "Complete confirmed inputs must be ready for Cutter review.")
assert(!JSON.stringify(draft.workspace?.completion).toLowerCase().includes("validated"), "Completeness must not claim validation approval.")

const writesBeforeSave = storage.writeCount
assert(loadKyzaProject(project.id, storage).ok, "Local edits must leave the stored Project readable.")
assert(storage.writeCount === writesBeforeSave, "Editing values must not persist per keystroke.")
const saved = savePackGenDraft(project.id, draft, 1, { storage, now: () => nextTimestamp })
assert(saved.ok, "Save Draft must persist after read-back verification.")
assert(saved.project.id === project.id, "Save Draft must retain the canonical Project ID.")
assert(saved.project.revision === 2, "One explicit draft save must increment the revision once.")
assertJsonEqual(saved.project.metadata, project.metadata, "Save Draft must preserve Project metadata.")
assertJsonEqual(saved.project.artwork, project.artwork, "Save Draft must preserve artwork state.")
assertJsonEqual(saved.project.exportSettings, project.exportSettings, "Save Draft must preserve export settings.")
assert(saved.draft.productPrompt === "pillow pack protein bar 350 x 220", "Prompt text must persist.")
assert(saved.draft.workspace?.fields.finishedWidthMm.value === 360, "Manual values must persist.")
assert(saved.draft.workspace?.lastSavedAt === nextTimestamp, "Last saved time must persist.")

const restored = loadPackGenProject("?projectId=pack-gen-project-101", storage)
assert(restored.ok, "Saved Pack Gen Project must reopen.")
assert(restored.draft.productPrompt === saved.draft.productPrompt, "Reopen must restore the prompt.")
assertJsonEqual(restored.draft.workspace, saved.draft.workspace, "Reopen must restore fields, provenance, assumptions, questions, completion, and save time.")

const staleSave = savePackGenDraft(project.id, restored.draft, 1, { storage })
assert(staleSave.ok === false, "A stale revision must not overwrite a newer Project.")
assert(staleSave.reason === "stale", "A stale save must be identified honestly.")
const failingStorage = new MemoryStorage()
failingStorage.values.set(KYZA_PROJECT_STORAGE_KEY, storage.values.get(KYZA_PROJECT_STORAGE_KEY)!)
failingStorage.failWrites = true
const failedSave = savePackGenDraft(project.id, restored.draft, 2, { storage: failingStorage })
assert(failedSave.ok === false, "A storage failure must not report save success.")
assert(failedSave.reason === "save-failed", "A write failure must be identified honestly.")
assert(restored.draft.workspace?.fields.finishedWidthMm.value === 360, "Save failure must retain the caller's unsaved values.")

const cutterResult = createOrUpdateCutterFromPackGen(project.id, restored.draft, 2, {
  storage,
  now: () => "2026-07-19T12:00:00.000Z",
})
assert(cutterResult.ok, "Confirmed supported values must create a deterministic Cutter.")
assert(cutterResult.project.id === project.id, "Cutter creation must retain the canonical Project ID.")
assert(cutterResult.destinationUrl === "/cutter?projectId=pack-gen-project-101", "Cutter creation must route using the canonical Project ID.")
assert(cutterResult.project.cutter?.legacySpec.width === 360, "Kyza Tech output must receive the confirmed width.")
assert(cutterResult.project.cutter?.legacySpec.height === 220, "Kyza Tech output must receive the confirmed height.")
assert(cutterResult.project.cutter?.legacySpec.bleed === recommendation.bleedMm, "Kyza Tech output must receive confirmed bleed.")
assert(cutterResult.project.cutter?.legacySpec.substrate === "clear", "Unsupported free-form material notes must resolve to the controlled Clear substrate default.")
assertJsonEqual(cutterResult.project.metadata, project.metadata, "Cutter creation must preserve metadata.")
assertJsonEqual(cutterResult.project.artwork, project.artwork, "Cutter creation must preserve artwork.")
assertJsonEqual(cutterResult.project.exportSettings, project.exportSettings, "Cutter creation must preserve export settings.")
const generatedReopen = loadKyzaProject(project.id, storage)
assert(generatedReopen.ok && generatedReopen.value.cutter?.legacySpec.width === 360, "Reopen must restore the generated Cutter.")

const cutterBeforeDraftEdit = JSON.stringify(cutterResult.project.cutter)
let laterDraft = setPackGenField(cutterResult.draft, "finishedWidthMm", 370)
const draftOnlySave = savePackGenDraft(project.id, laterDraft, cutterResult.project.revision, {
  storage,
  now: () => "2026-07-19T13:00:00.000Z",
})
assert(draftOnlySave.ok, "A draft edit on a Cutter Project must save.")
assert(JSON.stringify(draftOnlySave.project.cutter) === cutterBeforeDraftEdit, "Saving a Pack Gen draft must not silently update or replace the Cutter.")

const identityBefore = draftOnlySave.project.cutter?.identityMap
laterDraft = setPackGenReviewState(draftOnlySave.draft, { assumptionsReviewed: true, unresolvedQuestions: [] })
const updatedCutter = createOrUpdateCutterFromPackGen(project.id, laterDraft, draftOnlySave.project.revision, {
  storage,
  now: () => "2026-07-19T14:00:00.000Z",
})
assert(updatedCutter.ok, "Explicit Update Cutter must apply a confirmed specification change.")
assert(updatedCutter.project.cutter?.legacySpec.width === 370, "Explicit Cutter update must apply the confirmed width.")
assertJsonEqual(updatedCutter.project.cutter?.identityMap, identityBefore, "Same-pack Cutter update must preserve the identity map.")

const proposedOnly = applyRecommendationToPackGenDraft(validLoad.draft, recommendation, "pillow pack protein bar")
assert(
  proposedOnly.workspace?.assumptionsReviewed === false && (proposedOnly.workspace?.unresolvedQuestions.length ?? 0) > 0,
  "The advisory-review fixture must retain assumptions and unresolved questions.",
)
assert(
  proposedOnly.workspace?.fields.fillWeightG.state === "missing",
  "Optional Product fields must be allowed to remain incomplete.",
)
const proposedReadiness = getPackGenCutterReadiness(proposedOnly)
assert(proposedReadiness.ready, "A supported recommendation with valid dimensions and defaults must be Cutter-buildable.")
const proposedCutter = createOrUpdateCutterFromPackGen(
  project.id,
  proposedOnly,
  updatedCutter.project.revision,
  { storage, now: () => "2026-07-19T15:00:00.000Z" },
)
assert(proposedCutter.ok, `Selecting a recommendation must count as acceptance for Cutter creation: ${JSON.stringify(proposedCutter)}`)
assert(
  proposedCutter.draft.workspace?.assumptionsReviewed === false
    && (proposedCutter.draft.workspace?.unresolvedQuestions.length ?? 0) > 0,
  "Advisory assumptions and unresolved questions must remain visible without blocking Cutter creation.",
)
const impossibleDraft = setPackGenField(proposedCutter.draft, "finishedWidthMm", 0)
const impossibleCutter = createOrUpdateCutterFromPackGen(
  project.id,
  impossibleDraft,
  proposedCutter.project.revision,
  { storage },
)
assert(impossibleCutter.ok === false, "Impossible numeric geometry must still fail safely.")
assert(impossibleCutter.reason === "not-ready", "Invalid core dimensions must return a controlled readiness error.")

const legacySpec: FlowwrapSpec = { width: 400, height: 180, seal: 10, bleed: 3 }
const legacyProject = projectFromLegacySpec("flowwrap", "Existing Cutter", legacySpec, {
  id: "existing-cutter-no-draft",
  createdAt: timestamp,
  updatedAt: timestamp,
})
assert(saveKyzaProject(legacyProject, storage).ok, "Existing Cutter fixture must save.")
const legacyLoad = loadPackGenProject("?projectId=existing-cutter-no-draft", storage)
assert(legacyLoad.ok && legacyLoad.mode === "project" && legacyLoad.draft.workspace?.completion.status === "Empty", "Existing Cutter Projects without Pack Gen data must remain valid and open with an empty draft.")
assert(legacyLoad.project.cutter?.legacySpec.width === 400, "Opening Pack Gen must preserve an existing Cutter.")

assertJsonEqual([...storage.values.keys()], [KYZA_PROJECT_STORAGE_KEY], "Pack Gen must introduce no second permanent storage key.")

console.log("Canonical Pack Gen Project integration verified")
