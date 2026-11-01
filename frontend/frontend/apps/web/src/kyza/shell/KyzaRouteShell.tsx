import { useCallback, useState, type ReactNode } from "react"
import { KyzaHeader } from "./KyzaHeader"
import { KyzaNavigation } from "./KyzaNavigation"

export const DEFAULT_NAVIGATION_EXPANDED = false

type KyzaRouteShellProps = {
  routeLabel: string
  skipLabel: string
  children?: ReactNode
  mainClassName?: string
  onMainReady?: (element: HTMLElement) => void
}

export function KyzaRouteShell({
  routeLabel,
  skipLabel,
  children,
  mainClassName,
  onMainReady,
}: KyzaRouteShellProps) {
  const [navigationExpanded, setNavigationExpanded] = useState(DEFAULT_NAVIGATION_EXPANDED)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const mainRef = useCallback((element: HTMLElement | null) => {
    if (element) onMainReady?.(element)
  }, [onMainReady])

  const toggleNavigation = () => {
    if (window.matchMedia("(max-width: 800px)").matches) {
      setMobileNavigationOpen((current) => !current)
      return
    }
    setNavigationExpanded((current) => !current)
  }

  return (
    <div className="kyza-app">
      <a className="kyza-skip-link" href="#kyza-main">{skipLabel}</a>
      <KyzaHeader
        routeLabel={routeLabel}
        navigationExpanded={navigationExpanded}
        mobileNavigationOpen={mobileNavigationOpen}
        onToggleNavigation={toggleNavigation}
      />
      <div className="kyza-workspace">
        <KyzaNavigation
          expanded={navigationExpanded}
          mobileOpen={mobileNavigationOpen}
          onMobileClose={() => setMobileNavigationOpen(false)}
          onToggleNavigation={toggleNavigation}
        />
        <main className={`kyza-main${mainClassName ? ` ${mainClassName}` : ""}`} id="kyza-main" ref={mainRef}>
          {children}
        </main>
      </div>
    </div>
  )
}
