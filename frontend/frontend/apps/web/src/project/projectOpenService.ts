import {
  legacySpecFromProject,
  loadKyzaProject,
  hasCutterDocument,
  type KyzaProjectStorage,
  type KyzaCutterProjectV1,
} from "../../../../packages/cutter-engine/project"
import type { FlowwrapSpec } from "../types/flowwrap"

export type LoadedCutterProject = {
  project: KyzaCutterProjectV1
  spec: FlowwrapSpec
}

export type CutterProjectPresentationCard = {
  id: string
  name: string
  packId: string
  spec: FlowwrapSpec
  project: KyzaCutterProjectV1
  updatedAt: string
}

type ProjectOpenResult =
  | { ok: true; value: LoadedCutterProject }
  | { ok: false; errors: string[] }

const resolveStorage = (storage?: KyzaProjectStorage): KyzaProjectStorage | null => {
  if (storage) return storage
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadRequestedProject(
  projectId: string,
  storage?: KyzaProjectStorage,
): ProjectOpenResult {
  const source = resolveStorage(storage)
  if (!source) return { ok: false, errors: ["Project storage is unavailable."] }

  const loaded = loadKyzaProject(projectId, source)
  if (loaded.ok === false) return { ok: false, errors: loaded.errors }
  if (!hasCutterDocument(loaded.value)) {
    return {
      ok: false,
      errors: ["This Project does not contain a Cutter Specification yet. Open it in Pack Gen to continue setup."],
    }
  }

  return {
    ok: true,
    value: {
      project: loaded.value,
      spec: legacySpecFromProject(loaded.value),
    },
  }
}

const nextPresentationCardId = (
  projectId: string,
  cards: readonly CutterProjectPresentationCard[],
) => {
  const base = `project-card:${encodeURIComponent(projectId)}`
  let candidate = base
  let suffix = 2
  while (cards.some((card) => card.id === candidate && card.project.id !== projectId)) {
    candidate = `${base}:${suffix}`
    suffix += 1
  }
  return candidate
}

export function prepareProjectPresentationCard(
  cards: readonly CutterProjectPresentationCard[],
  project: KyzaCutterProjectV1,
  spec: FlowwrapSpec,
) {
  const existingIndex = cards.findIndex((card) => card.project.id === project.id)
  const card: CutterProjectPresentationCard = {
    id: existingIndex >= 0
      ? cards[existingIndex].id
      : nextPresentationCardId(project.id, cards),
    name: project.name,
    packId: project.cutter.packType,
    spec,
    project,
    updatedAt: project.updatedAt,
  }

  return {
    cardId: card.id,
    created: existingIndex < 0,
    cards: existingIndex < 0
      ? [card, ...cards]
      : cards.map((existing, index) => index === existingIndex ? card : existing),
  }
}
