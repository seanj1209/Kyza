import { KLYRO_MARK_SVG } from "./klyroMark"

export function KlyroMark({ className = "" }: { className?: string }) {
  return <span className={`klyro-brand-mark ${className}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: KLYRO_MARK_SVG }} />
}

export function KlyroLogo() {
  return (
    <a className="klyro-brand" href="/" aria-label="Klyro dashboard">
      <KlyroMark />
      <span className="klyro-brand-copy">
        <span className="klyro-brand-name">Klyro<span aria-hidden="true">.</span></span>
        <span className="klyro-brand-product">Workflows built on Intelligence</span>
      </span>
    </a>
  )
}
