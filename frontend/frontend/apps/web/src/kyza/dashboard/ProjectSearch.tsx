import { Search, X } from "lucide-react"

interface ProjectSearchProps {
  value: string
  onChange: (value: string) => void
}

export function ProjectSearch({ value, onChange }: ProjectSearchProps) {
  return (
    <section
      className="kyza-section kyza-search-section kyza-section-focus-target"
      id="project-search"
      tabIndex={-1}
      aria-labelledby="project-search-title"
    >
      <div className="kyza-section-heading is-compact">
        <div>
          <div className="kyza-eyebrow">Find existing work</div>
          <h2 id="project-search-title">Project Search</h2>
        </div>
      </div>
      <div className="kyza-search-field">
        <Search aria-hidden="true" size={19} />
        <label className="kyza-visually-hidden" htmlFor="kyza-project-search">Search projects</label>
        <input
          id="kyza-project-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Search by project name, pack type or ID…"
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear project search">
            <X aria-hidden="true" size={17} />
          </button>
        )}
      </div>
    </section>
  )
}
