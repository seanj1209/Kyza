import {
  FolderPlus,
  Library,
  ListChecks,
  SlidersHorizontal,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { LegendConfigModal } from "./LegendConfigModal"
import "./legendConfig.css"

const quickLinks: ReadonlyArray<{ label: string; icon: LucideIcon }> = [
  { label: "Template Library", icon: Library },
  { label: "Legend Config", icon: ListChecks },
  { label: "New Project", icon: FolderPlus },
  { label: "Cutter Preferences", icon: SlidersHorizontal },
  { label: "Upload Assets", icon: Upload },
]

interface QuickLinksProps {
  onNewProject: () => void
}

export function QuickLinks({ onNewProject }: QuickLinksProps) {
  const [legendOpen, setLegendOpen] = useState(false)
  return (
    <section className="klyro-section klyro-section-focus-target" id="quick-links" tabIndex={-1} aria-labelledby="quick-links-title">
      <div className="klyro-section-heading is-compact">
        <div>
          <h2 id="quick-links-title">Quick Links</h2>
        </div>
      </div>

      <div className="klyro-quick-grid">
        {quickLinks.map(({ label, icon: Icon }) => {
          const isNewProject = label === "New Project"
          const isLegend = label === "Legend Config"
          const isCutterPreferences = label === "Cutter Preferences"
          const accessibleLabel = isNewProject || isLegend || isCutterPreferences ? label : `${label} — Coming Soon`

          return (
            <button
              className="klyro-quick-link"
              type="button"
              aria-label={accessibleLabel}
              title={accessibleLabel}
              onClick={isNewProject ? onNewProject : isLegend ? () => setLegendOpen(true) : isCutterPreferences ? () => { window.location.href = "/account#cutter" } : undefined}
              key={label}
            >
              <span className="klyro-roundel"><Icon aria-hidden="true" size={23} /></span>
              <strong>{label}</strong>
              <span className="klyro-quick-status">{isNewProject ? "Open Pack Spec Builder" : isLegend || isCutterPreferences ? "Open" : "Coming Soon"}</span>
            </button>
          )
        })}
      </div>
      <LegendConfigModal open={legendOpen} onClose={() => setLegendOpen(false)} />
    </section>
  )
}
