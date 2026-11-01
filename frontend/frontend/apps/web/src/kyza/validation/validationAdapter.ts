import {
  listKyzaProjects,
  hasCutterDocument,
  type KyzaProjectStorage,
} from "../../../../../packages/cutter-engine/project"
import {
  getEffectiveValidationStatus,
  type ValidationStatus,
} from "../../../../../packages/cutter-engine/validation"
import { createCutterProjectUrl } from "../../project/projectNavigation"

export type ValidationProjectSummary = {
  id: string
  name: string
  packType: string
  revision: number
  updatedAt: string
  status: ValidationStatus
  criticalCount: number
  warningCount: number
  advisoryCount: number
  blocksExport: boolean
  issues: ReadonlyArray<{
    id: string
    severity: "critical" | "warning" | "advisory"
    title: string
    message: string
    affectedElementId?: string
    suggestedAction?: string
  }>
  cutterUrl: string
  latestBetaReview?: { reviewer: string; reason: string; revision: string | number; recordedAt: string }
}

export type ValidationProjectCollection =
  | { status: "ready"; projects: readonly ValidationProjectSummary[] }
  | { status: "error"; projects: readonly []; message: string }

const makeReadOnlyStorage = (storage: KyzaProjectStorage): KyzaProjectStorage => ({
  getItem: (key) => storage.getItem(key),
  setItem: () => { throw new Error("The Validation Centre Project adapter is read-only.") },
  removeItem: () => { throw new Error("The Validation Centre Project adapter is read-only.") },
})

const resolveBrowserStorage = (): KyzaProjectStorage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadValidationProjectSummaries(
  storage: KyzaProjectStorage | null = resolveBrowserStorage(),
): ValidationProjectCollection {
  if (!storage) {
    return { status: "error", projects: [], message: "Project storage is unavailable in this browser session." }
  }

  const result = listKyzaProjects(makeReadOnlyStorage(storage))
  if (result.ok === false) {
    return {
      status: "error",
      projects: [],
      message: result.errors.join(" ") || "Stored Projects could not be read safely.",
    }
  }

  return {
    status: "ready",
    // Specification-only drafts have no cutter to validate; retain them in Dashboard.
    projects: result.value.filter(hasCutterDocument).map((project) => {
      const reviewRecord = [...(project.exportAuditRecords ?? [])].reverse().find(record => record.betaReview?.purpose === "unapproved-beta-review")
      const run = project.latestValidationRun
      const status = getEffectiveValidationStatus(run, project.revision)
      return {
        id: project.id,
        name: project.name,
        packType: project.cutter.packType,
        revision: project.revision,
        updatedAt: project.updatedAt,
        status,
        criticalCount: run?.summary.criticalCount ?? 0,
        warningCount: run?.summary.warningCount ?? 0,
        advisoryCount: run?.summary.advisoryCount ?? 0,
        blocksExport: status !== "passed" || Boolean(run?.summary.blocksExport),
        issues: run?.issues ?? [],
        cutterUrl: createCutterProjectUrl(project.id),
        ...(reviewRecord?.betaReview ? { latestBetaReview: { reviewer: reviewRecord.betaReview.reviewer, reason: reviewRecord.betaReview.reason, revision: reviewRecord.projectRevision, recordedAt: reviewRecord.exportedAt } } : {}),
      }
    }).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
  }
}
