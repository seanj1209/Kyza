import { useMemo, useState } from "react"
import { ProjectSearch } from "./ProjectSearch"
import { QuickLinks } from "./QuickLinks"
import { RecentProjects } from "./RecentProjects"
import { filterProjectSummaries, loadDashboardProjectSummaries, type DashboardProjectCollection } from "./projectAdapter"
import { deleteDashboardProject, renameDashboardProject } from "./projectActions"
import { QuickProjectModal } from "./QuickProjectModal"
import { FeatureShowcase } from "./FeatureShowcase"

interface DashboardPageProps {
  projectCollection: DashboardProjectCollection
}

export function DashboardPage({ projectCollection }: DashboardPageProps) {
  const [currentProjects, setCurrentProjects] = useState(projectCollection)
  const [searchTerm, setSearchTerm] = useState("")
  const [builderOpen, setBuilderOpen] = useState(false)

  const openNewProjectBuilder = () => {
    setBuilderOpen(true)
  }

  const focusDashboardSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (!section) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    section.focus({ preventScroll: true })
    section.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }

  const visibleProjects = useMemo(
    () => filterProjectSummaries(currentProjects.projects, searchTerm),
    [currentProjects.projects, searchTerm],
  )

  const refreshProjects = () => setCurrentProjects(loadDashboardProjectSummaries())
  const renameProject = (projectId: string, name: string) => {
    const result = renameDashboardProject(projectId, name)
    if (result.ok) refreshProjects()
    return result
  }
  const deleteProject = (projectId: string) => {
    const result = deleteDashboardProject(projectId)
    if (result.ok) refreshProjects()
    return result
  }

  return (
    <div className="klyro-dashboard">
      <section className="klyro-hero" aria-labelledby="dashboard-title">
        <div className="klyro-hero-copy">
          <div className="klyro-eyebrow">Your space to shape what’s next</div>
          <h1 id="dashboard-title">Packaging workflows,<br /><span>made clearer.</span></h1>
          <p>
            From the first idea to the final cutter. Bring your specification,
            explore the possibilities, and move forward with clarity.
          </p>
          <div className="klyro-hero-actions">
            <button
              className="klyro-primary-action"
              type="button"
              onClick={() => focusDashboardSection("quick-links")}
            >
              Start Here
            </button>
            <a className="klyro-hero-link" href="/cutter?choose=1&studio=start">Help Me Choose <span aria-hidden="true">↗</span></a>
          </div>
          <div className="klyro-journey" aria-label="Klyro packaging workflow">
            <span>Define</span><span>Engineer</span><span>Validate</span><span>Release</span>
          </div>
        </div>
        <FeatureShowcase />
      </section>

      <QuickLinks
        onNewProject={openNewProjectBuilder}
      />
      <ProjectSearch value={searchTerm} onChange={setSearchTerm} />
      <RecentProjects
        projects={visibleProjects}
        hasSearchTerm={Boolean(searchTerm.trim())}
        errorMessage={currentProjects.status === "error" ? currentProjects.message : undefined}
        onNewProject={() => focusDashboardSection("quick-links")}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
      />
      <QuickProjectModal open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  )
}
