import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react"
import { KlyroRouteShell } from "../shell/KlyroRouteShell"
import { KlyroThemeProvider } from "../shell/KlyroThemeProvider"
import { loadValidationProjectSummaries, type ValidationProjectSummary } from "./validationAdapter"
import "../styles/klyro.css"
import "./validation.css"

const statusCopy: Record<ValidationProjectSummary["status"], { label: string; guidance: string }> = {
  not_run: { label: "Not Run", guidance: "Open the Project in Cutter Studio and run validation." },
  running: { label: "Running", guidance: "Validation is still running. Do not treat this Project as export-ready." },
  passed: { label: "Passed", guidance: "Current-revision validation has no blocking Critical issues." },
  failed: { label: "Failed", guidance: "Resolve the blocking Critical issues in Cutter Studio, then re-run validation." },
  stale: { label: "Stale", guidance: "The Project changed after validation. Re-run validation before export." },
  error: { label: "Error", guidance: "Validation did not complete safely. Open the Project and retry." },
}

function StatusIcon({ status }: { status: ValidationProjectSummary["status"] }) {
  if (status === "passed") return <CheckCircle2 aria-hidden="true" size={22} />
  if (status === "not_run" || status === "running") return <CircleDashed aria-hidden="true" size={22} />
  return <ShieldAlert aria-hidden="true" size={22} />
}

function ValidationCentrePage() {
  const [collection] = useState(loadValidationProjectSummaries)

  return (
    <div className="klyro-dashboard validation-centre">
      <section className="klyro-hero" aria-labelledby="validation-centre-title">
        <div className="klyro-eyebrow">Quality control</div>
        <h1 id="validation-centre-title">Validation Centre</h1>
        <p>Review deterministic Cutter validation for stored Projects. Only a Passed result for the current Project revision is export-ready.</p>
      </section>

      <section className="klyro-section" aria-labelledby="validation-projects-title">
        <div className="klyro-section-heading is-compact">
          <div>
            <div className="klyro-eyebrow">Project evidence</div>
            <h2 id="validation-projects-title">Stored Project validation</h2>
          </div>
          <span className="klyro-project-count">{collection.projects.length} {collection.projects.length === 1 ? "Project" : "Projects"}</span>
        </div>

        {collection.status === "error" ? (
          <div className="klyro-empty-state is-error" role="alert">
            <span className="klyro-empty-icon"><AlertTriangle aria-hidden="true" size={24} /></span>
            <div><h3>Validation evidence could not be read safely</h3><p>{collection.message} No stored Project data was changed.</p></div>
          </div>
        ) : collection.projects.length === 0 ? (
          <div className="klyro-empty-state">
            <span className="klyro-empty-icon"><CircleDashed aria-hidden="true" size={24} /></span>
            <div><h3>No stored Cutter Projects</h3><p>Create a cutter from a saved specification or open a Cutter Project before running validation. Specification drafts remain in Dashboard.</p></div>
            <a className="klyro-secondary-action" href="/">Return to Dashboard</a>
          </div>
        ) : (
          <div className="validation-project-list">
            {collection.projects.map((project) => {
              const copy = statusCopy[project.status]
              return (
                <article className={`validation-project is-${project.status}`} key={project.id}>
                  <header>
                    <span className="validation-status-icon"><StatusIcon status={project.status} /></span>
                    <div><h3>{project.name}</h3><p>{project.packType} · Revision {project.revision}</p></div>
                    <strong className="validation-status">{copy.label}</strong>
                  </header>
                  <p className="validation-guidance">{copy.guidance}</p>
                  {project.latestBetaReview && <aside className="validation-beta-review" aria-label="Beta review decision">
                    <strong>Unapproved beta review · Revision {project.latestBetaReview.revision}</strong>
                    <p>Reviewer (self-declared): {project.latestBetaReview.reviewer}</p>
                    <p>{project.latestBetaReview.reason}</p>
                    <small>{new Date(project.latestBetaReview.recordedAt).toLocaleString()} · This decision does not change validation or approve production.</small>
                  </aside>}
                  <dl className="validation-counts">
                    <div><dt>Critical</dt><dd>{project.criticalCount}</dd></div>
                    <div><dt>Warnings</dt><dd>{project.warningCount}</dd></div>
                    <div><dt>Advisories</dt><dd>{project.advisoryCount}</dd></div>
                    <div><dt>Export</dt><dd>{project.blocksExport ? "Blocked" : "Ready"}</dd></div>
                  </dl>
                  {project.issues.length > 0 && (
                    <details className="validation-issues">
                      <summary>Review {project.issues.length} validation {project.issues.length === 1 ? "issue" : "issues"}</summary>
                      <ul>{project.issues.map((issue) => <li key={issue.id}><strong>{issue.title}</strong><span>{issue.message}</span>{issue.affectedElementId && <small>Affected element: {issue.affectedElementId}</small>}{issue.suggestedAction && <small>Next step: {issue.suggestedAction}</small>}</li>)}</ul>
                    </details>
                  )}
                  <a className="klyro-project-open" href={project.cutterUrl}>{project.status === "passed" ? "Open in Cutter Studio" : "Review and re-run in Cutter Studio"}</a>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

const rootElement = document.getElementById("app")
if (!rootElement) throw new Error("Klyro Validation Centre root element was not found")

createRoot(rootElement).render(
  <StrictMode><KlyroThemeProvider><KlyroRouteShell routeLabel="Validation Centre" skipLabel="Skip to validation results"><ValidationCentrePage /></KlyroRouteShell></KlyroThemeProvider></StrictMode>,
)
