import { KYZA_MARK_SVG, KYZA_WORDMARK_SVG } from "./kyzaMark"

export function KyzaMark({ className = "" }: { className?: string }) {
  return <span className={`kyza-brand-mark ${className}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: KYZA_MARK_SVG }} />
}

export function KyzaLogo() {
  return (
    <a className="kyza-brand" href="/" aria-label="Kyza dashboard">
      <span className="kyza-brand-copy">
        <span className="kyza-brand-name" dangerouslySetInnerHTML={{ __html: KYZA_WORDMARK_SVG }} />
        <span className="kyza-brand-product">Workflows built on Intelligence</span>
      </span>
    </a>
  )
}
