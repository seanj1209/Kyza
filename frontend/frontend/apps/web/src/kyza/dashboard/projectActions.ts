import {
  deleteKyzaProject,
  listKyzaProjects,
  loadKyzaProject,
  saveKyzaProject,
  type KyzaProjectStorage,
} from "../../../../../packages/cutter-engine/project"

export type ProjectActionResult = { readonly ok: true } | { readonly ok: false; readonly message: string }

export function renameDashboardProject(
  projectId: string,
  rawName: string,
  storage?: KyzaProjectStorage,
): ProjectActionResult {
  const name = rawName.trim()
  if (!name) return { ok: false, message: "Enter a project name." }

  const projects = listKyzaProjects(storage)
  if (projects.ok === false) return { ok: false, message: projects.errors.join(" ") }
  if (projects.value.some((project) => project.id !== projectId && project.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    return { ok: false, message: "A project with this name already exists." }
  }

  const loaded = loadKyzaProject(projectId, storage)
  if (loaded.ok === false) return { ok: false, message: loaded.errors.join(" ") }
  const saved = saveKyzaProject({
    ...loaded.value,
    name,
    revision: loaded.value.revision + 1,
    updatedAt: new Date().toISOString(),
  }, storage, { expectedRevision: loaded.value.revision })
  return saved.ok === true ? { ok: true } : { ok: false, message: saved.errors.join(" ") }
}

export function deleteDashboardProject(
  projectId: string,
  storage?: KyzaProjectStorage,
): ProjectActionResult {
  const deleted = deleteKyzaProject(projectId, storage)
  if (deleted.ok === false) return { ok: false, message: deleted.errors.join(" ") }
  return deleted.value
    ? { ok: true }
    : { ok: false, message: "The project was not found and was not deleted." }
}
