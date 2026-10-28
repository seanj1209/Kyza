import { runPackGenerateRequest } from "../../../../packages/engine-api/runPackGenerateRequest"
import {
  createCutNFlowProjectId,
  createCutNFlowProjectV1,
  listCutNFlowProjects,
  loadCutNFlowProject,
  saveCutNFlowProject,
  type CutNFlowProjectDraftV1,
  type CutNFlowProjectStorage,
  type CutNFlowProjectV1,
  type ProjectMetadataV1,
} from "../../../../packages/cutter-engine/project"
import type { FlowwrapSpec } from "../types/flowwrap"
import { getPackModule } from "../packs"
import { createCutterProjectUrl, createPackGenProjectUrl } from "./projectNavigation"

export type CreateProjectRequest = {
  projectName: string
  customerOrBrand?: string
  productName?: string
  jobReference?: string
  description?: string
  notes?: string
  startingRoute: "pack-gen" | "cutter-studio"
  packType?: string
  projectId?: string
  projectDraft?: CutNFlowProjectDraftV1
}

export type CreateProjectResult =
  | { ok: true; project: CutNFlowProjectV1; destinationUrl: string }
  | { ok: false; errors: string[] }

export const PROJECT_CREATION_FIELD_LIMITS = {
  projectName: 120,
  customerOrBrand: 120,
  productName: 120,
  jobReference: 80,
  description: 600,
  notes: 1000,
} as const

export const createProjectSubmissionId = () => createCutNFlowProjectId()

type GeneratedPackDefaults = {
  packId: string
  spec: FlowwrapSpec
}

type ProjectCreationDependencies = {
  storage?: CutNFlowProjectStorage
  createProjectId?: () => string
  generatePackDefaults?: (packType: string, projectId: string) =>
    | { ok: true; value: GeneratedPackDefaults }
    | { ok: false; errors: string[] }
}

const normalizeOptional = (value: string | undefined) => value?.trim() || undefined

const validateRequest = (request: CreateProjectRequest) => {
  const errors: string[] = []
  const projectName = request.projectName?.trim()
  if (!projectName) errors.push("Enter a Project Name.")

  Object.entries(PROJECT_CREATION_FIELD_LIMITS).forEach(([field, limit]) => {
    const value = request[field as keyof typeof PROJECT_CREATION_FIELD_LIMITS]
    if (typeof value === "string" && value.length > limit) {
      errors.push(`${field} must use ${limit} characters or fewer.`)
    }
  })
  if (request.startingRoute !== "pack-gen" && request.startingRoute !== "cutter-studio") {
    errors.push("Select a valid starting route.")
  }
  if (request.startingRoute === "cutter-studio" && !normalizeOptional(request.packType)) {
    errors.push("Select a pack type to start directly in Cutter Studio.")
  }
  const packType = normalizeOptional(request.packType)
  if (packType && !getPackModule(packType)) {
    errors.push("Select an available pack type.")
  }
  if (request.projectId !== undefined && !normalizeOptional(request.projectId)) {
    errors.push("The Project submission ID is invalid.")
  }
  if (request.projectDraft && request.startingRoute !== "pack-gen") {
    errors.push("A Pack Specification draft can only be attached through Pack Gen.")
  }
  return errors
}

const projectMetadataFromRequest = (request: CreateProjectRequest): ProjectMetadataV1 | undefined => {
  const metadata: ProjectMetadataV1 = {
    ...(normalizeOptional(request.customerOrBrand)
      ? { customerOrBrand: normalizeOptional(request.customerOrBrand) }
      : {}),
    ...(normalizeOptional(request.productName) ? { productName: normalizeOptional(request.productName) } : {}),
    ...(normalizeOptional(request.jobReference) ? { jobReference: normalizeOptional(request.jobReference) } : {}),
    ...(normalizeOptional(request.description) ? { description: normalizeOptional(request.description) } : {}),
    ...(normalizeOptional(request.notes) ? { notes: normalizeOptional(request.notes) } : {}),
    ...(request.startingRoute === "pack-gen" && normalizeOptional(request.packType)
      ? { requestedPackType: normalizeOptional(request.packType) }
      : {}),
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const generatePackDefaults = (packType: string, projectId: string) => {
  const response = runPackGenerateRequest({
    requestId: `project-create-${projectId}`,
    projectId,
    engine: "pack-generator",
    action: "generatePack",
    payload: { packId: packType },
    meta: { source: "klyro-project-creation" },
  })
  const state = response.updatedState as GeneratedPackDefaults | undefined
  if (!response.success || response.errors.length > 0 || !state?.spec || !state.packId) {
    return {
      ok: false as const,
      errors: response.errors.map((error) => error.message).concat(
        response.errors.length === 0 ? ["The selected pack defaults could not be created safely."] : [],
      ),
    }
  }
  return { ok: true as const, value: state }
}

const destinationFor = (request: CreateProjectRequest, projectId: string) => (
  request.startingRoute === "cutter-studio"
    ? createCutterProjectUrl(projectId)
    : createPackGenProjectUrl(projectId)
)

const matchesSubmission = (
  project: CutNFlowProjectV1,
  request: CreateProjectRequest,
  metadata: ProjectMetadataV1 | undefined,
) => (
  project.name === request.projectName.trim()
  && JSON.stringify(project.metadata ?? {}) === JSON.stringify(metadata ?? {})
  && (request.startingRoute === "cutter-studio"
    ? project.cutter?.packType === normalizeOptional(request.packType)
    : project.cutter === undefined
      && JSON.stringify(project.projectDraft) === JSON.stringify(request.projectDraft))
)

export function createCanonicalProject(
  request: CreateProjectRequest,
  dependencies: ProjectCreationDependencies = {},
): CreateProjectResult {
  const requestErrors = validateRequest(request)
  if (requestErrors.length > 0) return { ok: false, errors: requestErrors }

  const projectId = normalizeOptional(request.projectId)
    ?? (dependencies.createProjectId ?? createCutNFlowProjectId)()
  const metadata = projectMetadataFromRequest(request)
  if (request.projectDraft && (
    request.projectDraft.id !== projectId
    || request.projectDraft.name !== request.projectName.trim()
  )) {
    return { ok: false, errors: ["The Pack Specification draft must match its canonical Project identity."] }
  }
  let destinationUrl: string
  try {
    destinationUrl = destinationFor(request, projectId)
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "The Project route could not be created safely."],
    }
  }
  const listed = listCutNFlowProjects(dependencies.storage)
  if (listed.ok === false) return { ok: false, errors: listed.errors }

  const existing = listed.value.find((project) => project.id === projectId)
  if (existing) {
    return matchesSubmission(existing, request, metadata)
      ? { ok: true, project: existing, destinationUrl }
      : { ok: false, errors: ["This Project submission ID is already in use."] }
  }

  try {
    let project: CutNFlowProjectV1
    if (request.startingRoute === "cutter-studio") {
      const generated = (dependencies.generatePackDefaults ?? generatePackDefaults)(
        normalizeOptional(request.packType)!,
        projectId,
      )
      if (generated.ok === false) return { ok: false, errors: generated.errors }
      project = createCutNFlowProjectV1({
        id: projectId,
        name: request.projectName,
        metadata,
        packType: generated.value.packId,
        legacySpec: generated.value.spec,
      })
    } else {
      project = createCutNFlowProjectV1({
        id: projectId,
        name: request.projectName,
        metadata,
        projectDraft: request.projectDraft,
      })
    }

    const saved = saveCutNFlowProject(project, dependencies.storage)
    if (saved.ok === false) return { ok: false, errors: saved.errors }
    const verified = loadCutNFlowProject(project.id, dependencies.storage)
    if (verified.ok === false) {
      return { ok: false, errors: ["The Project was not confirmed after saving.", ...verified.errors] }
    }
    if (JSON.stringify(verified.value) !== JSON.stringify(saved.value)) {
      return { ok: false, errors: ["The saved Project did not pass verification."] }
    }
    return {
      ok: true,
      project: verified.value,
      destinationUrl,
    }
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "The Project could not be created safely."],
    }
  }
}
