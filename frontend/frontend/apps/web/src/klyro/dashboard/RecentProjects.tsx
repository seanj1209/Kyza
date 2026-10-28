import { useEffect, useRef, useState } from "react"
import { AlertTriangle, EllipsisVertical, FolderOpen } from "lucide-react"
import { getPackModule } from "../../packs"
import type { ProjectSummary } from "./projectAdapter"
import type { ProjectActionResult } from "./projectActions"

interface RecentProjectsProps {
  projects: readonly ProjectSummary[]
  hasSearchTerm: boolean
  errorMessage?: string
  onNewProject: () => void
  onRenameProject: (projectId: string, name: string) => ProjectActionResult
  onDeleteProject: (projectId: string) => ProjectActionResult
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function ProjectCutterPreview({ project }: { project: ProjectSummary }) {
  const previewRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) return
    preview.replaceChildren()

    const packModule = project.cutterSpec ? getPackModule(project.packType) : undefined
    if (!packModule || !project.cutterSpec) return

    try {
      const svg = packModule.render(project.cutterSpec as never, { renderMode: "artwork" })
      svg.removeAttribute("width")
      svg.removeAttribute("height")
      svg.setAttribute("aria-hidden", "true")
      svg.setAttribute("focusable", "false")
      preview.appendChild(svg)
    } catch {
      // Keep the neutral preview surface if stored cutter geometry cannot be rendered safely.
    }

    return () => preview.replaceChildren()
  }, [project.cutterSpec, project.packType])

  return (
    <span className="klyro-project-preview" ref={previewRef}>
      {!project.cutterSpec && <FolderOpen aria-hidden="true" size={22} />}
    </span>
  )
}

export function RecentProjects({ projects, hasSearchTerm, errorMessage, onNewProject, onRenameProject, onDeleteProject }: RecentProjectsProps) {
  const [openMenuId, setOpenMenuId] = useState<string>()
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary>()

  useEffect(() => {
    if (!openMenuId) return
    const closeOutside = (event: MouseEvent) => {
      if (event.target instanceof Element && !event.target.closest(".klyro-project-menu, .klyro-project-menu-button")) setOpenMenuId(undefined)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      document.querySelector<HTMLButtonElement>('.klyro-project-menu-button[aria-expanded="true"]')?.focus()
      setOpenMenuId(undefined)
    }
    document.addEventListener("click", closeOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("click", closeOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [openMenuId])

  const renameProject = (project: ProjectSummary) => {
    setOpenMenuId(undefined)
    const entered = window.prompt("Rename project", project.name)
    if (entered === null || entered.trim() === project.name) return
    const result = onRenameProject(project.id, entered)
    if (result.ok === false) window.alert(result.message)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const result = onDeleteProject(deleteTarget.id)
    if (result.ok === false) {
      window.alert(result.message)
      return
    }
    setDeleteTarget(undefined)
  }

  return (
    <section
      className="klyro-section klyro-section-focus-target"
      id="recent-projects"
      tabIndex={-1}
      aria-labelledby="recent-projects-title"
    >
      <div className="klyro-section-heading is-compact">
        <div>
          <div className="klyro-eyebrow">Continue your work</div>
          <h2 id="recent-projects-title">Recent Projects</h2>
        </div>
        <span className="klyro-project-count">{projects.length} {projects.length === 1 ? "Project" : "Projects"}</span>
      </div>

      {errorMessage ? (
        <div className="klyro-empty-state is-error" role="alert">
          <span className="klyro-empty-icon"><AlertTriangle aria-hidden="true" size={24} /></span>
          <div>
            <h3>Projects could not be read safely</h3>
            <p>{errorMessage} No stored Project data was changed.</p>
          </div>
        </div>
      ) : projects.length > 0 ? (
        <div className="klyro-project-grid">
          {projects.map((project) => (
            <article className={`klyro-project-card${openMenuId === project.id ? " is-menu-open" : ""}`} key={project.id}>
              <a className="klyro-project-card-link" href={project.destinationUrl} aria-label={`Open ${project.name}`} title={`Open ${project.name}`}>
                <span className="klyro-project-card-content">
                <strong>{project.name}</strong>
                <ProjectCutterPreview project={project} />
                <time dateTime={project.updatedAt}>{dateFormatter.format(new Date(project.updatedAt))}</time>
                <span>Version V{project.revision}</span>
                </span>
                <span className="klyro-project-open" aria-hidden="true">Open</span>
              </a>
              <button className="klyro-project-menu-button" type="button" aria-label={`Project actions for ${project.name}`} aria-expanded={openMenuId === project.id} onClick={() => setOpenMenuId(current => current === project.id ? undefined : project.id)}><EllipsisVertical aria-hidden="true" size={18} /></button>
              {openMenuId === project.id && <div className="klyro-project-menu" role="menu">
                <button type="button" role="menuitem" disabled title="Available with post-Beta folders">Move to</button>
                <button type="button" role="menuitem" disabled title="Available in the post-Beta Quick Export release">Quick Export</button>
                <button type="button" role="menuitem" onClick={() => renameProject(project)}>Rename</button>
                <button className="is-danger" type="button" role="menuitem" onClick={() => { setOpenMenuId(undefined); setDeleteTarget(project) }}>Delete</button>
              </div>}
            </article>
          ))}
        </div>
      ) : (
        <div className="klyro-empty-state">
          <span className="klyro-empty-icon"><FolderOpen aria-hidden="true" size={25} /></span>
          <div>
            <h3>{hasSearchTerm ? "No matching Projects" : "No Projects yet"}</h3>
            <p>
              {hasSearchTerm
                ? "No Projects match that name, pack type or ID. Clear or change the search to try again."
                : "Stored Cutter Projects will appear here when they are available."}
            </p>
          </div>
          {!hasSearchTerm && (
            <div className="klyro-empty-actions">
              <button className="klyro-primary-action" type="button" onClick={onNewProject}>New Project</button>
              <a className="klyro-secondary-action" href="/cutter">Cutter Studio</a>
            </div>
          )}
        </div>
      )}
      {deleteTarget && <div className="klyro-project-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDeleteTarget(undefined) }}><div className="klyro-project-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" aria-describedby="delete-project-description"><h3 id="delete-project-title">Delete project?</h3><p id="delete-project-description">“{deleteTarget.name}” will be permanently removed from this browser. This cannot be undone.</p><div><button className="klyro-secondary-action" type="button" onClick={() => setDeleteTarget(undefined)}>Cancel</button><button className="klyro-primary-action is-danger" type="button" onClick={confirmDelete}>Delete project</button></div></div></div>}
    </section>
  )
}
