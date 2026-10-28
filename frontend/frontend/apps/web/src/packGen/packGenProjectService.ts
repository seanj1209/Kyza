import type { PackGenRecommendation } from "../../../../packages/ai-engine"
import {
  createCutNFlowProjectV1,
  loadCutNFlowProject,
  saveCutNFlowProject,
  toEnginePackTypeId,
  toPackSpecificationPackTypeId,
  type CutNFlowProjectDraftV1,
  type CutNFlowProjectStorage,
  type CutNFlowProjectV1,
  type PackSpecificationCompletionV1,
  type PackSpecificationFieldsV1,
  type PackSpecificationValueV1,
} from "../../../../packages/cutter-engine/project"
import { createCanonicalProject, createProjectSubmissionId } from "../project/projectCreationService"
import { createCutterProjectUrl, parseRequestedProjectId } from "../project/projectNavigation"
import {
  createCutterSpecFromConfirmedPackValues,
  getCnFTechPackSpecificationDefaults,
  type PackGenCutterSpecificationInputs,
} from "./packGenHandoff"
import {
  getPackGenFieldPolicy,
  normalizePackGenSubstrate,
  type PackGenWorkspaceField,
} from "./packGenFieldPolicy"

export type { PackGenWorkspaceField } from "./packGenFieldPolicy"

const FIELD_LABELS: Record<PackGenWorkspaceField, string> = {
  packType: "Pack type",
  finishedWidthMm: "Finished width",
  finishedHeightMm: "Finished height",
  gussetMm: "Gusset",
  trimMm: "Trim",
  productDescription: "Product or fill description",
  fillWeightG: "Fill weight",
  fillVolumeMl: "Fill volume",
  orientation: "Orientation",
  materialNotes: "Substrate",
  machineConstraints: "Machine or packing constraints",
  openingRequirements: "Opening or reclosing requirements",
  sealTopMm: "Top seal",
  sealBottomMm: "Bottom seal",
  sealLeftMm: "Left seal",
  sealRightMm: "Right seal",
  eyemarkCount: "Eyemark count",
  eyemarkPosition: "Eyemark position",
  zipEnabled: "Reclosable zip",
  minimumSafeZoneMm: "Minimum safe zone",
  bleedMm: "Bleed",
  foldsOrGussetNotes: "Fold or gusset notes",
  featuresNotes: "Pack feature notes",
}

const missingValue = <T>(): PackSpecificationValueV1<T> => ({
  state: "missing",
  source: "preset",
})

export const createEmptyPackSpecificationFields = (): PackSpecificationFieldsV1 => ({
  packType: missingValue<string>(),
  finishedWidthMm: missingValue<number>(),
  finishedHeightMm: missingValue<number>(),
  gussetMm: missingValue<number>(),
  trimMm: missingValue<number>(),
  productDescription: missingValue<string>(),
  fillWeightG: missingValue<number>(),
  fillVolumeMl: missingValue<number>(),
  orientation: missingValue<string>(),
  materialNotes: missingValue<string>(),
  machineConstraints: missingValue<string>(),
  openingRequirements: missingValue<string>(),
  sealTopMm: missingValue<number>(),
  sealBottomMm: missingValue<number>(),
  sealLeftMm: missingValue<number>(),
  sealRightMm: missingValue<number>(),
  eyemarkCount: missingValue<0 | 1 | 2>(),
    eyemarkPosition: missingValue<string>(),
  zipEnabled: missingValue<boolean>(),
  minimumSafeZoneMm: missingValue<number>(),
  bleedMm: missingValue<number>(),
  foldsOrGussetNotes: missingValue<string>(),
  featuresNotes: missingValue<string>(),
})

const hasValue = (entry: PackSpecificationValueV1<unknown>) => (
  entry.value !== undefined && entry.value !== ""
)

const packTypeValue = (fields: PackSpecificationFieldsV1) => (
  typeof fields.packType.value === "string" ? fields.packType.value : undefined
)

const withPolicyDefaults = (
  fields: PackSpecificationFieldsV1,
  packType: string,
  replaceUnconfirmed = false,
): PackSpecificationFieldsV1 => {
  const policy = getPackGenFieldPolicy(packType)
  if (!policy.available) return fields
  const next = { ...fields }
  const mutable = next as unknown as Record<
    PackGenWorkspaceField,
    PackSpecificationValueV1<string | number | boolean>
  >
  Object.entries(policy.deterministicDefaults).forEach(([field, value]) => {
    const key = field as PackGenWorkspaceField
    if (key === "packType" || value === undefined) return
    const current = mutable[key] ?? missingValue()
    if (current.state !== "missing" && (!replaceUnconfirmed || current.state === "confirmed")) return
    mutable[key] = {
      value,
      state: "proposed",
      source: "cnf-tech",
      confidence: "high",
      note: "Deterministic default from the registered pack module.",
    }
  })
  return next
}

export function calculatePackSpecificationCompletion(
  draft: Pick<CutNFlowProjectDraftV1, "productPrompt" | "workspace">,
): PackSpecificationCompletionV1 {
  const workspace = draft.workspace
  if (!workspace) {
    const minimumFields = getPackGenFieldPolicy().minimumCutterFields
    return {
      status: draft.productPrompt.trim() ? "Needs Information" : "Empty",
      requiredCompleted: [],
      requiredMissing: minimumFields.map((field) => FIELD_LABELS[field]),
      proposedAwaitingConfirmation: [],
      assumptionsAwaitingReview: 0,
    }
  }
  const policy = getPackGenFieldPolicy(packTypeValue(workspace.fields))
  const requiredFields = policy.minimumCutterFields
  const requiredCompleted = requiredFields
    .filter((field) => hasValue(workspace.fields[field]))
    .map((field) => FIELD_LABELS[field])
  const requiredMissing = requiredFields
    .filter((field) => !hasValue(workspace.fields[field]))
    .map((field) => FIELD_LABELS[field])
  const proposedAwaitingConfirmation = policy.visibleFields
    .filter((field) => workspace.fields[field].state === "proposed")
    .map((field) => FIELD_LABELS[field])
  const assumptionsAwaitingReview = workspace.assumptionsReviewed
    ? 0
    : workspace.assumptions.length
  const hasAnyContent = Boolean(
    draft.productPrompt.trim()
    || workspace.assumptions.length
    || workspace.unresolvedQuestions.length
    || Object.values(workspace.fields).some(hasValue),
  )
  const status = !hasAnyContent
    ? "Empty"
    : requiredMissing.length > 0 || workspace.unresolvedQuestions.length > 0
      ? "Needs Information"
      : proposedAwaitingConfirmation.length > 0 || assumptionsAwaitingReview > 0
        ? "Draft"
        : "Ready for Cutter Review"
  return {
    status,
    requiredCompleted,
    requiredMissing,
    proposedAwaitingConfirmation,
    assumptionsAwaitingReview,
  }
}

const withCalculatedCompletion = (draft: CutNFlowProjectDraftV1): CutNFlowProjectDraftV1 => {
  if (!draft.workspace) return draft
  const next = {
    ...draft,
    workspace: {
      ...draft.workspace,
      completion: draft.workspace.completion,
    },
  }
  next.workspace.completion = calculatePackSpecificationCompletion(next)
  return next
}

export function createEmptyPackGenDraft(
  project: CutNFlowProjectV1,
  createdAt = project.updatedAt,
): CutNFlowProjectDraftV1 {
  let fields = createEmptyPackSpecificationFields()
  if (project.metadata?.requestedPackType) {
    const packType = toPackSpecificationPackTypeId(project.metadata.requestedPackType)
    fields.packType = {
      value: packType,
      state: "confirmed",
      source: "user",
      note: "Selected when the Project was created.",
    }
    fields = withPolicyDefaults(fields, packType)
  }
  return withCalculatedCompletion({
    id: project.id,
    name: project.name,
    status: "draft",
    source: "pack_generator",
    createdAt,
    updatedAt: createdAt,
    productPrompt: "",
    workspace: {
      schemaVersion: 1,
      fields,
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
  })
}

export function createStandalonePackGenDraft(
  createdAt = new Date().toISOString(),
): CutNFlowProjectDraftV1 {
  return withCalculatedCompletion({
    id: "standalone-pack-gen",
    name: "Standalone Pack Gen",
    status: "draft",
    source: "pack_generator",
    createdAt,
    updatedAt: createdAt,
    productPrompt: "",
    workspace: {
      schemaVersion: 1,
      fields: createEmptyPackSpecificationFields(),
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
  })
}

const legacyWorkspace = (
  project: CutNFlowProjectV1,
  draft: CutNFlowProjectDraftV1,
): CutNFlowProjectDraftV1 => {
  if (draft.workspace) {
    const fields = {
      ...createEmptyPackSpecificationFields(),
      ...draft.workspace.fields,
    }
    if (typeof fields.packType.value === "string") {
      fields.packType = {
        ...fields.packType,
        value: toPackSpecificationPackTypeId(fields.packType.value),
      }
    }
    return withCalculatedCompletion({
      ...draft,
      workspace: {
        ...draft.workspace,
        fields,
      },
    })
  }
  const fields = createEmptyPackSpecificationFields()
  const spec = draft.packSpecification
  if (spec) {
    const proposed = <T>(value: T): PackSpecificationValueV1<T> => ({
      value,
      state: "proposed",
      source: "flowai",
      confidence: spec.confidence === "needs_review" ? "low" : spec.confidence,
    })
    fields.packType = proposed(
      spec.packTypeId
        ? toPackSpecificationPackTypeId(spec.packTypeId)
        : toPackSpecificationPackTypeId(spec.enginePackTypeId!),
    )
    if (spec.starterDefaults.widthMm !== undefined) fields.finishedWidthMm = proposed(spec.starterDefaults.widthMm)
    if (spec.starterDefaults.heightMm !== undefined) fields.finishedHeightMm = proposed(spec.starterDefaults.heightMm)
    fields.sealTopMm = proposed(spec.starterDefaults.sealsMm.top)
    fields.sealBottomMm = proposed(spec.starterDefaults.sealsMm.bottom)
    fields.sealLeftMm = proposed(spec.starterDefaults.sealsMm.left)
    fields.sealRightMm = proposed(spec.starterDefaults.sealsMm.right)
    fields.bleedMm = proposed(spec.starterDefaults.bleedMm)
    fields.minimumSafeZoneMm = proposed(spec.starterDefaults.minimumSafeZoneMm)
    fields.eyemarkCount = proposed(spec.starterDefaults.eyemarkCount)
    if (spec.starterDefaults.substrate) fields.materialNotes = proposed(spec.starterDefaults.substrate)
  }
  return withCalculatedCompletion({
    ...draft,
    id: project.id,
    workspace: {
      schemaVersion: 1,
      fields,
      assumptions: spec?.assumptions ?? [],
      assumptionsReviewed: false,
      unresolvedQuestions: [],
      completion: {
        status: "Draft",
        requiredCompleted: [],
        requiredMissing: [],
        proposedAwaitingConfirmation: [],
        assumptionsAwaitingReview: 0,
      },
      lastSavedAt: draft.updatedAt,
    },
  })
}

export type PackGenProjectLoadResult =
  | { ok: true; mode: "standalone"; draft: CutNFlowProjectDraftV1 }
  | { ok: true; mode: "project"; project: CutNFlowProjectV1; draft: CutNFlowProjectDraftV1 }
  | { ok: false; reason: "invalid-id" | "not-found" | "corrupt"; message: string }

export function loadPackGenProject(
  searchParams: URLSearchParams | string,
  storage?: CutNFlowProjectStorage,
): PackGenProjectLoadResult {
  const requested = parseRequestedProjectId(searchParams)
  if (requested.status === "absent") {
    return { ok: true, mode: "standalone", draft: createStandalonePackGenDraft() }
  }
  if (requested.status === "invalid") {
    return { ok: false, reason: "invalid-id", message: requested.message }
  }
  const loaded = loadCutNFlowProject(requested.projectId, storage)
  if (loaded.ok === false) {
    const notFound = loaded.errors.some((error) => error.includes("was not found"))
    return {
      ok: false,
      reason: notFound ? "not-found" : "corrupt",
      message: notFound
        ? "The requested Project could not be found."
        : "Stored Project data could not be read safely.",
    }
  }
  return {
    ok: true,
    mode: "project",
    project: loaded.value,
    draft: loaded.value.projectDraft
      ? legacyWorkspace(loaded.value, loaded.value.projectDraft)
      : createEmptyPackGenDraft(loaded.value),
  }
}

const proposedValue = <T>(value: T | undefined, recommendation: PackGenRecommendation) => (
  value === undefined
    ? missingValue<T>()
    : {
        value,
        state: "proposed" as const,
        source: "flowai" as const,
        confidence: recommendation.confidence === "needs_review" ? "low" as const : recommendation.confidence,
      }
)

export function applyRecommendationToPackGenDraft(
  draft: CutNFlowProjectDraftV1,
  recommendation: PackGenRecommendation,
  prompt: string,
): CutNFlowProjectDraftV1 {
  const workspace = draft.workspace ?? createEmptyPackGenDraft({
    schemaVersion: 1,
    id: draft.id,
    revision: 1,
    name: draft.name,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  }).workspace!
  const setUnlessConfirmed = <K extends PackGenWorkspaceField>(
    field: K,
    value: PackSpecificationFieldsV1[K],
  ) => workspace.fields[field]?.state === "confirmed" ? workspace.fields[field] : value
  const signals = recommendation.extractedSignals
  const suggestedSubstrate = recommendation.substrateSuggestion ?? signals.substrateHint
  const cnfTechDefaults = getCnFTechPackSpecificationDefaults(recommendation.packType, draft.id)
  const policyFields = withPolicyDefaults(workspace.fields, recommendation.packType, true)
  const refreshStandaloneFinishedDimensions = draft.id === "standalone-pack-gen"
  const fields: PackSpecificationFieldsV1 = {
    ...policyFields,
    packType: setUnlessConfirmed(
      "packType",
      proposedValue(toPackSpecificationPackTypeId(recommendation.packType), recommendation),
    ),
    finishedWidthMm: refreshStandaloneFinishedDimensions
      ? proposedValue(recommendation.widthMm, recommendation)
      : setUnlessConfirmed("finishedWidthMm", proposedValue(recommendation.widthMm, recommendation)),
    finishedHeightMm: refreshStandaloneFinishedDimensions
      ? proposedValue(recommendation.heightMm, recommendation)
      : setUnlessConfirmed("finishedHeightMm", proposedValue(recommendation.heightMm, recommendation)),
    productDescription: setUnlessConfirmed("productDescription", proposedValue(signals.productName ?? signals.productCategory, recommendation)),
    fillWeightG: setUnlessConfirmed("fillWeightG", proposedValue(signals.productWeightG, recommendation)),
    fillVolumeMl: setUnlessConfirmed("fillVolumeMl", proposedValue(signals.productVolumeMl, recommendation)),
    materialNotes: setUnlessConfirmed(
      "materialNotes",
      suggestedSubstrate
        ? proposedValue(normalizePackGenSubstrate(suggestedSubstrate), recommendation)
        : policyFields.materialNotes,
    ),
    machineConstraints: setUnlessConfirmed("machineConstraints", proposedValue(signals.machineHint, recommendation)),
    sealTopMm: setUnlessConfirmed("sealTopMm", proposedValue(recommendation.sealsMm.top, recommendation)),
    sealBottomMm: setUnlessConfirmed("sealBottomMm", proposedValue(recommendation.sealsMm.bottom, recommendation)),
    sealLeftMm: setUnlessConfirmed("sealLeftMm", proposedValue(recommendation.sealsMm.left, recommendation)),
    sealRightMm: setUnlessConfirmed("sealRightMm", proposedValue(recommendation.sealsMm.right, recommendation)),
    eyemarkCount: setUnlessConfirmed("eyemarkCount", proposedValue(recommendation.eyemarks.count, recommendation)),
    eyemarkPosition: setUnlessConfirmed("eyemarkPosition", recommendation.eyemarks.suggestedSide
      ? proposedValue(recommendation.eyemarks.suggestedSide, recommendation)
      : missingValue<string>()),
    trimMm: setUnlessConfirmed("trimMm", policyFields.trimMm),
    zipEnabled: setUnlessConfirmed(
      "zipEnabled",
      recommendation.zipEnabled === undefined
        ? policyFields.zipEnabled
        : proposedValue(recommendation.zipEnabled, recommendation),
    ),
    minimumSafeZoneMm: setUnlessConfirmed(
      "minimumSafeZoneMm",
      cnfTechDefaults?.minimumSafeZoneMm === undefined
        ? missingValue<number>()
        : {
            value: cnfTechDefaults.minimumSafeZoneMm,
            state: "proposed",
            source: "cnf-tech",
            confidence: "high",
            note: "Deterministic pack-service default.",
          },
    ),
    bleedMm: setUnlessConfirmed("bleedMm", proposedValue(recommendation.bleedMm, recommendation)),
  }
  return withCalculatedCompletion({
    ...draft,
    productPrompt: prompt,
    workspace: {
      ...workspace,
      fields,
      assumptions: [...new Set(recommendation.assumptions)],
      assumptionsReviewed: false,
      unresolvedQuestions: [...new Set(recommendation.questions)],
      selectedRecommendationId: recommendation.id,
    },
  })
}

export function setPackGenField(
  draft: CutNFlowProjectDraftV1,
  field: PackGenWorkspaceField,
  value: string | number | boolean | undefined,
): CutNFlowProjectDraftV1 {
  if (!draft.workspace) return draft
  const normalizedValue = typeof value === "string" ? value.trim() || undefined : value
  const normalized = field === "packType" && typeof normalizedValue === "string"
    ? toPackSpecificationPackTypeId(normalizedValue)
    : normalizedValue
  let fields = {
    ...draft.workspace.fields,
    [field]: normalized === undefined
      ? missingValue()
      : { value: normalized, state: "confirmed", source: "user" },
  } as PackSpecificationFieldsV1
  if (field === "packType" && typeof normalized === "string") {
    fields = withPolicyDefaults(fields, normalized, true)
  }
  return withCalculatedCompletion({
    ...draft,
    workspace: { ...draft.workspace, fields },
  })
}

export function acceptProposedPackGenValues(draft: CutNFlowProjectDraftV1): CutNFlowProjectDraftV1 {
  if (!draft.workspace) return draft
  const fields = Object.fromEntries(Object.entries(draft.workspace.fields).map(([field, entry]) => [
    field,
    entry.state === "proposed" ? { ...entry, state: "confirmed" } : entry,
  ])) as PackSpecificationFieldsV1
  return withCalculatedCompletion({
    ...draft,
    workspace: { ...draft.workspace, fields },
  })
}

export function setPackGenReviewState(
  draft: CutNFlowProjectDraftV1,
  input: { assumptionsReviewed?: boolean; unresolvedQuestions?: string[]; prompt?: string },
): CutNFlowProjectDraftV1 {
  if (!draft.workspace) return draft
  return withCalculatedCompletion({
    ...draft,
    ...(input.prompt !== undefined ? { productPrompt: input.prompt } : {}),
    workspace: {
      ...draft.workspace,
      ...(input.assumptionsReviewed !== undefined
        ? { assumptionsReviewed: input.assumptionsReviewed }
        : {}),
      ...(input.unresolvedQuestions !== undefined
        ? { unresolvedQuestions: input.unresolvedQuestions.map((item) => item.trim()).filter(Boolean) }
        : {}),
    },
  })
}

type PackGenPersistenceDependencies = {
  storage?: CutNFlowProjectStorage
  now?: () => string
  createProjectId?: () => string
}

export type PackGenSaveResult =
  | { ok: true; project: CutNFlowProjectV1; draft: CutNFlowProjectDraftV1 }
  | { ok: false; reason: "not-found" | "stale" | "save-failed"; errors: string[] }

const saveAndVerify = (
  project: CutNFlowProjectV1,
  storage?: CutNFlowProjectStorage,
  expectedRevision?: number,
): { ok: true; project: CutNFlowProjectV1 } | { ok: false; errors: string[] } => {
  const saved = saveCutNFlowProject(
    project,
    storage,
    expectedRevision === undefined ? {} : { expectedRevision },
  )
  if (saved.ok === false) return saved
  const verified = loadCutNFlowProject(project.id, storage)
  if (verified.ok === false) return { ok: false, errors: ["The Project was not confirmed after saving.", ...verified.errors] }
  if (JSON.stringify(verified.value) !== JSON.stringify(saved.value)) {
    return { ok: false, errors: ["The saved Project did not pass verification."] }
  }
  return { ok: true, project: verified.value }
}

const savedDraft = (
  project: CutNFlowProjectV1,
  draft: CutNFlowProjectDraftV1,
  timestamp: string,
  action: "pack_draft_saved" | "cutter_created" | "cutter_updated",
): CutNFlowProjectDraftV1 => withCalculatedCompletion({
  ...draft,
  id: project.id,
  name: project.name,
  updatedAt: timestamp,
  workspace: draft.workspace
    ? { ...draft.workspace, lastSavedAt: timestamp }
    : draft.workspace,
  history: [
    ...draft.history,
    { id: `${project.id}:${action}:${project.revision + 1}`, action, createdAt: timestamp },
  ],
})

export function savePackGenDraft(
  projectId: string,
  draft: CutNFlowProjectDraftV1,
  expectedRevision: number,
  dependencies: PackGenPersistenceDependencies = {},
): PackGenSaveResult {
  const loaded = loadCutNFlowProject(projectId, dependencies.storage)
  if (loaded.ok === false) return { ok: false, reason: "not-found", errors: loaded.errors }
  if (loaded.value.revision !== expectedRevision) {
    return { ok: false, reason: "stale", errors: ["This Project changed in another view. Reopen it before saving."] }
  }
  const timestamp = (dependencies.now ?? (() => new Date().toISOString()))()
  const nextDraft = savedDraft(loaded.value, draft, timestamp, "pack_draft_saved")
  const nextProject: CutNFlowProjectV1 = {
    ...loaded.value,
    revision: loaded.value.revision + 1,
    updatedAt: timestamp,
    projectDraft: nextDraft,
  }
  const result = saveAndVerify(nextProject, dependencies.storage, loaded.value.revision)
  if (result.ok === false) {
    return { ok: false, reason: "save-failed", errors: result.errors }
  }
  return { ok: true, project: result.project, draft: result.project.projectDraft! }
}

export type ConnectStandalonePackGenInput = {
  projectName: string
  brand?: string
  jobReference?: string
  createCutter?: boolean
  projectId?: string
}

export type ConnectStandalonePackGenResult =
  | { ok: true; project: CutNFlowProjectV1; draft: CutNFlowProjectDraftV1; destinationUrl: string }
  | { ok: false; errors: string[] }

export function connectStandalonePackGenToProject(
  draft: CutNFlowProjectDraftV1,
  input: ConnectStandalonePackGenInput,
  dependencies: PackGenPersistenceDependencies = {},
): ConnectStandalonePackGenResult {
  const projectName = input.projectName.trim()
  const brand = input.brand?.trim()
  const jobReference = input.jobReference?.trim()
  if (!projectName) return { ok: false, errors: ["Enter a Project Name."] }
  const projectId = input.projectId?.trim()
    || (dependencies.createProjectId ?? createProjectSubmissionId)()

  if (input.createCutter) {
    const readiness = getPackGenCutterReadiness(draft)
    if (readiness.ready === false) return { ok: false, errors: readiness.errors }
    const generated = createCutterSpecFromConfirmedPackValues(readiness.values, projectId)
    if (generated.ok === false) return { ok: false, errors: generated.errors }
  }

  const timestamp = (dependencies.now ?? (() => new Date().toISOString()))()
  const requestedPackType = draft.workspace ? packTypeValue(draft.workspace.fields) : undefined
  const connectedDraft = withCalculatedCompletion({
    ...draft,
    id: projectId,
    name: projectName,
    updatedAt: timestamp,
    workspace: draft.workspace
      ? { ...draft.workspace, lastSavedAt: timestamp }
      : draft.workspace,
  })
  const created = createCanonicalProject({
    projectId,
    projectName,
    ...(brand ? { customerOrBrand: brand } : {}),
    ...(jobReference ? { jobReference } : {}),
    startingRoute: "pack-gen",
    packType: requestedPackType ? toEnginePackTypeId(requestedPackType) : undefined,
    projectDraft: connectedDraft,
  }, {
    storage: dependencies.storage,
  })
  if (created.ok === false) return { ok: false, errors: created.errors }
  return {
    ok: true,
    project: created.project,
    draft: created.project.projectDraft!,
    destinationUrl: created.destinationUrl,
  }
}

export type PackGenCutterResult =
  | { ok: true; project: CutNFlowProjectV1; draft: CutNFlowProjectDraftV1; destinationUrl: string; unsupportedMappings: string[] }
  | { ok: false; reason: "not-ready" | "not-found" | "stale" | "generation-failed" | "save-failed"; errors: string[] }

export type PackGenCutterReadiness =
  | { ready: true; values: PackGenCutterSpecificationInputs }
  | { ready: false; errors: string[] }

const fieldNumber = (fields: PackSpecificationFieldsV1, field: PackGenWorkspaceField) => {
  const entry = fields[field]
  return typeof entry.value === "number" && Number.isFinite(entry.value) ? entry.value : undefined
}

const fieldBoolean = (fields: PackSpecificationFieldsV1, field: PackGenWorkspaceField) => {
  const entry = fields[field]
  return typeof entry.value === "boolean" ? entry.value : undefined
}

export function getPackGenCutterReadiness(
  draft: Pick<CutNFlowProjectDraftV1, "workspace">,
): PackGenCutterReadiness {
  if (!draft.workspace) return { ready: false, errors: ["Choose a supported pack type and starting dimensions."] }
  const fields = draft.workspace.fields
  const packType = packTypeValue(fields)
  const policy = getPackGenFieldPolicy(packType)
  if (!packType || !policy.available) {
    return { ready: false, errors: ["Choose a supported pack type."] }
  }
  const defaults = policy.deterministicDefaults
  const suppliedOrDefault = (field: PackGenWorkspaceField) => (
    fieldNumber(fields, field)
    ?? (typeof defaults[field] === "number" ? defaults[field] as number : undefined)
  )
  const width = fieldNumber(fields, "finishedWidthMm")
  const height = fieldNumber(fields, "finishedHeightMm")
  const errors: string[] = []
  if (width === undefined || width <= 0) errors.push("Enter a valid finished width greater than 0mm.")
  if (height === undefined || height <= 0) errors.push("Enter a valid finished height greater than 0mm.")

  const top = suppliedOrDefault("sealTopMm")
  const bottom = suppliedOrDefault("sealBottomMm")
  const left = suppliedOrDefault("sealLeftMm")
  const right = suppliedOrDefault("sealRightMm")
  const bleed = suppliedOrDefault("bleedMm")
  const safeZone = suppliedOrDefault("minimumSafeZoneMm")
  const eyemarks = suppliedOrDefault("eyemarkCount")
  const eyemarkPosition = typeof fields.eyemarkPosition?.value === "string" ? fields.eyemarkPosition.value : undefined
  const zipEnabled = policy.visibleFields.includes("zipEnabled")
    ? fieldBoolean(fields, "zipEnabled")
      ?? (typeof defaults.zipEnabled === "boolean" ? defaults.zipEnabled : false)
    : false
  const numericDefaults = [top, bottom, left, right, bleed, safeZone]
  if (numericDefaults.some((value) => value === undefined || value < 0)) {
    errors.push("The registered pack module could not supply valid seal, bleed or safe-zone defaults.")
  }
  if (eyemarks === undefined || !Number.isInteger(eyemarks) || ![0, 1, 2].includes(eyemarks)) {
    errors.push("Eyemark count must be 0, 1 or 2.")
  }
  const gusset = policy.visibleFields.includes("gussetMm") ? suppliedOrDefault("gussetMm") : undefined
  if (gusset !== undefined && gusset < 0) errors.push("Gusset must be 0mm or greater.")
  const trim = policy.visibleFields.includes("trimMm") ? suppliedOrDefault("trimMm") : undefined
  if (trim !== undefined && trim < 0) errors.push("Trim must be 0mm or greater.")
  if (errors.length > 0) return { ready: false, errors }

  return {
    ready: true,
    values: {
      packType: toEnginePackTypeId(packType),
      finishedWidthMm: width!,
      finishedHeightMm: height!,
      sealTopMm: top!,
      sealBottomMm: bottom!,
      sealLeftMm: left!,
      sealRightMm: right!,
      bleedMm: bleed!,
      minimumSafeZoneMm: safeZone!,
      eyemarkCount: eyemarks as 0 | 1 | 2,
      ...(eyemarkPosition ? { eyemarkPosition } : {}),
      zipEnabled,
      substrate: normalizePackGenSubstrate(fields.materialNotes.value),
      ...(gusset === undefined ? {} : { gussetMm: gusset }),
      ...(trim === undefined ? {} : { trimMm: trim }),
    },
  }
}

export function createOrUpdateCutterFromPackGen(
  projectId: string,
  draft: CutNFlowProjectDraftV1,
  expectedRevision: number,
  dependencies: PackGenPersistenceDependencies = {},
): PackGenCutterResult {
  const readiness = getPackGenCutterReadiness(draft)
  if (readiness.ready === false) {
    return {
      ok: false,
      reason: "not-ready",
      errors: readiness.errors,
    }
  }

  const loaded = loadCutNFlowProject(projectId, dependencies.storage)
  if (loaded.ok === false) return { ok: false, reason: "not-found", errors: loaded.errors }
  if (loaded.value.revision !== expectedRevision) {
    return { ok: false, reason: "stale", errors: ["This Project changed in another view. Reopen it before updating the Cutter."] }
  }
  const generated = createCutterSpecFromConfirmedPackValues(readiness.values, projectId)
  if (generated.ok === false) return { ok: false, reason: "generation-failed", errors: generated.errors }

  const timestamp = (dependencies.now ?? (() => new Date().toISOString()))()
  const action = loaded.value.cutter ? "cutter_updated" : "cutter_created"
  const nextDraft = savedDraft(loaded.value, draft, timestamp, action)
  const nextProject = createCutNFlowProjectV1({
    id: loaded.value.id,
    revision: loaded.value.revision + 1,
    name: loaded.value.name,
    createdAt: loaded.value.createdAt,
    updatedAt: timestamp,
    metadata: loaded.value.metadata,
    packType: generated.packType,
    legacySpec: generated.spec,
    ...(loaded.value.cutter?.packType === generated.packType
      ? { identityMap: loaded.value.cutter.identityMap }
      : {}),
    projectDraft: nextDraft,
    artwork: loaded.value.artwork,
    exportSettings: loaded.value.exportSettings,
    latestValidationRun: loaded.value.latestValidationRun,
    validationRuns: loaded.value.validationRuns,
    validationAcknowledgements: loaded.value.validationAcknowledgements,
    exportAuditRecords: loaded.value.exportAuditRecords,
  })
  const result = saveAndVerify(nextProject, dependencies.storage, loaded.value.revision)
  if (result.ok === false) return { ok: false, reason: "save-failed", errors: result.errors }
  return {
    ok: true,
    project: result.project,
    draft: result.project.projectDraft!,
    destinationUrl: createCutterProjectUrl(projectId),
    unsupportedMappings: generated.unsupportedMappings,
  }
}
