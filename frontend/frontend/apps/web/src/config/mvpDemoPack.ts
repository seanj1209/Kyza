import type { CutNFlowProjectDraftV1 } from "../../../../packages/cutter-engine/project"

export const MVP_DEMO_PACK = {
  prompt: "400g frozen mixed fruit",
  productName: "Frozen Mixed Fruit",
  displayName: "400g Frozen Mixed Fruit",
  packType: "pillow-pack",
  packLabel: "Pillow Pack",
  width: 440,
  height: 200,
  mode: "flat"
} as const

export const CURRENT_PROJECT_SCHEMA_VERSION = "mvp-demo-001" as const

export const CURRENT_PROJECT_STORAGE_KEY = "cutnflow.currentProject"

export type CurrentProject = {
  projectId?: string
  projectDraft?: CutNFlowProjectDraftV1
  productName: string
  displayName: string
  prompt: string
  packType: string
  packLabel: string
  width: number
  height: number
  mode: string
  source: string
  stage: string
  schemaVersion?: typeof CURRENT_PROJECT_SCHEMA_VERSION
}

const normalizeText = (value: string | undefined) =>
  (value ?? "").trim().toLowerCase()

const toPositiveNumber = (value: unknown, fallback: number) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? next : fallback
}

const isCurrentMvpProject = (project: Partial<CurrentProject>) =>
  project.schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION &&
  normalizeText(project.packType).length > 0 &&
  normalizeText(project.displayName).length > 0 &&
  toPositiveNumber(project.width, 0) > 0 &&
  toPositiveNumber(project.height, 0) > 0

export const createCurrentProject = (
  overrides: Partial<CurrentProject> = {}
): CurrentProject => ({
  ...(overrides.projectId ? { projectId: overrides.projectId } : {}),
  ...(overrides.projectDraft ? { projectDraft: overrides.projectDraft } : {}),
  productName: overrides.productName ?? MVP_DEMO_PACK.productName,
  displayName: overrides.displayName ?? MVP_DEMO_PACK.displayName,
  prompt: overrides.prompt ?? MVP_DEMO_PACK.prompt,
  packType: overrides.packType ?? MVP_DEMO_PACK.packType,
  packLabel: overrides.packLabel ?? MVP_DEMO_PACK.packLabel,
  width: toPositiveNumber(overrides.width, MVP_DEMO_PACK.width),
  height: toPositiveNumber(overrides.height, MVP_DEMO_PACK.height),
  mode: overrides.mode ?? MVP_DEMO_PACK.mode,
  source: overrides.source ?? "ai-studio",
  stage: overrides.stage ?? "cutter",
  schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION
})

export const saveCurrentProject = (project: CurrentProject) => {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(
    CURRENT_PROJECT_STORAGE_KEY,
    JSON.stringify(project)
  )
}

export const loadCurrentProject = (): CurrentProject | null => {
  if (typeof window === "undefined") {
    return null
  }
  const raw = window.localStorage.getItem(CURRENT_PROJECT_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CurrentProject>
    if (!isCurrentMvpProject(parsed)) {
      return null
    }
    return createCurrentProject(parsed)
  } catch {
    return null
  }
}

export const projectFromSearchParams = (search: string): Partial<CurrentProject> => {
  const params = new URLSearchParams(search)
  return {
    productName: params.get("productName") ?? undefined,
    displayName: params.get("displayName") ?? undefined,
    prompt: params.get("prompt") ?? undefined,
    packType: params.get("type") ?? params.get("packType") ?? undefined,
    packLabel: params.get("packLabel") ?? undefined,
    width: params.get("width") ? Number(params.get("width")) : undefined,
    height: params.get("height")
      ? Number(params.get("height"))
      : params.get("length")
        ? Number(params.get("length"))
        : undefined,
    mode: params.get("mode") ?? undefined,
    source: params.get("source") ?? undefined,
    stage: params.get("stage") ?? undefined
  }
}

export const resolveCurrentProject = (
  search: string,
  overrides: Partial<CurrentProject> = {}
) => {
  const stored = loadCurrentProject() ?? undefined
  const fromParams = projectFromSearchParams(search)
  const project = createCurrentProject({
    ...stored,
    ...fromParams,
    ...overrides
  })
  return project
}

export const projectToSearchParams = (project: CurrentProject) =>
  new URLSearchParams({
    productName: project.productName,
    displayName: project.displayName,
    prompt: project.prompt,
    type: project.packType,
    packType: project.packType,
    packLabel: project.packLabel,
    width: String(project.width),
    height: String(project.height),
    length: String(project.height),
    mode: project.mode,
    source: project.source,
    stage: project.stage
  })

export const cutterRouteParams = (project: CurrentProject) =>
  new URLSearchParams({
    width: String(project.width),
    length: String(project.height),
    type: project.packType,
    prompt: project.prompt
  })
