import {
  hasCutterDocument,
  listKyzaProjects,
  type KyzaProjectStorage,
  type KyzaProjectV1,
} from "../../../../../packages/cutter-engine/project"
import { createCutterProjectUrl, createPackGenProjectUrl } from "../../project/projectNavigation"
import type { FlowwrapSpec } from "../../types/flowwrap"

export interface ProjectSummary {
  readonly id: string
  readonly name: string
  readonly packType: string
  readonly updatedAt: string
  readonly revision: number
  readonly cutterSpec?: FlowwrapSpec
  readonly stageLabel:
    | "Cutter Project"
    | "Pack Setup"
    | "Pack Specification: Draft"
    | "Needs Information"
    | "Ready for Cutter Review"
  readonly destinationUrl: string
}

export type DashboardProjectCollection =
  | { readonly status: "ready"; readonly projects: readonly ProjectSummary[] }
  | { readonly status: "error"; readonly projects: readonly []; readonly message: string }

const mapProjectSummary = (project: KyzaProjectV1): ProjectSummary => {
  const hasCutter = hasCutterDocument(project)
  const packStatus = project.projectDraft?.workspace?.completion.status
  return {
    id: project.id,
    name: project.name,
    packType: hasCutter
      ? project.cutter.packType
      : project.metadata?.requestedPackType ?? "Pack type pending",
    updatedAt: project.updatedAt,
    revision: project.revision,
    ...(hasCutter ? { cutterSpec: project.cutter.legacySpec } : {}),
    stageLabel: hasCutter
      ? "Cutter Project"
      : packStatus === "Ready for Cutter Review"
        ? "Ready for Cutter Review"
        : packStatus === "Needs Information"
          ? "Needs Information"
          : packStatus === "Draft"
            ? "Pack Specification: Draft"
            : "Pack Setup",
    destinationUrl: hasCutter
      ? createCutterProjectUrl(project.id)
      : createPackGenProjectUrl(project.id),
  }
}

const makeReadOnlyStorage = (storage: KyzaProjectStorage): KyzaProjectStorage => ({
  getItem: (key) => storage.getItem(key),
  setItem: () => {
    throw new Error("The Dashboard Project adapter is read-only.")
  },
  removeItem: () => {
    throw new Error("The Dashboard Project adapter is read-only.")
  },
})

const resolveBrowserStorage = (): KyzaProjectStorage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadDashboardProjectSummaries(
  storage: KyzaProjectStorage | null = resolveBrowserStorage(),
): DashboardProjectCollection {
  if (!storage) {
    return {
      status: "error",
      projects: [],
      message: "Project storage is unavailable in this browser session.",
    }
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
    projects: result.value
      .map(mapProjectSummary)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
  }
}

export function filterProjectSummaries(
  projects: readonly ProjectSummary[],
  searchTerm: string,
): readonly ProjectSummary[] {
  const term = searchTerm.trim().toLocaleLowerCase()
  if (!term) return projects.slice(0, 24)

  return projects.filter((project) => [
    project.name,
    project.packType,
    project.id,
  ].some((value) => value.toLocaleLowerCase().includes(term)))
}
