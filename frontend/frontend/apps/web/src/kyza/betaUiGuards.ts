import { BETA_FEATURES, BETA_RESTRICTION_MESSAGE, betaProjectRestriction, betaSpecRestriction, isBetaPackEnabled } from "../../../../packages/shared/releaseScope"
import type { KyzaProjectStorage } from "../../../../packages/cutter-engine/project"

export function cutterUiRestriction(packId: unknown, spec: unknown, project?: unknown): string | null {
  return !isBetaPackEnabled(packId) ? BETA_RESTRICTION_MESSAGE
    : betaProjectRestriction(project) ?? betaSpecRestriction(spec)
}

export function cutterUrlRestriction(params: URLSearchParams): string | null {
  if (!BETA_FEATURES.sandbox && params.getAll("studio").includes("sandbox")) return BETA_RESTRICTION_MESSAGE
  for (const key of ["pack", "packId", "packType", "type"]) {
    if (params.getAll(key).some(value => !isBetaPackEnabled(value))) return BETA_RESTRICTION_MESSAGE
  }
  return null
}

/** Let legacy readers migrate an in-memory view without writing to saved work. */
export function createPresentationStorage(storage: KyzaProjectStorage): KyzaProjectStorage {
  const view = new Map<string, string | null>()
  return {
    getItem: key => view.has(key) ? view.get(key)! : storage.getItem(key),
    setItem: (key, value) => { view.set(key, value) },
    removeItem: key => { view.set(key, null) },
  }
}

export type UnavailableProjectPresentation = { id: string; name: string; message: string }
export function unavailableProjectPresentation(value: unknown, fallbackId: string): UnavailableProjectPresentation {
  const raw = typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
  const project = typeof raw.project === "object" && raw.project !== null ? raw.project as Record<string, unknown> : raw
  return {
    id: typeof project.id === "string" ? project.id : fallbackId,
    name: typeof project.name === "string" ? project.name : typeof raw.name === "string" ? raw.name : "Saved Project",
    message: betaProjectRestriction(project) ?? betaProjectRestriction(raw) ?? "This saved Project could not be opened safely. Your saved work has not been changed.",
  }
}
