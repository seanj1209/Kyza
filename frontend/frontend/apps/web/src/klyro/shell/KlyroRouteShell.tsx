import { useCallback, useState, type ReactNode } from "react"
import { KlyroHeader } from "./KlyroHeader"
import { KlyroNavigation } from "./KlyroNavigation"

export const DEFAULT_NAVIGATION_EXPANDED = false

type KlyroRouteShellProps = {
  routeLabel: string
  skipLabel: string
  children?: ReactNode
  mainClassName?: string
  onMainReady?: (element: HTMLElement) => void
}

export function KlyroRouteShell({
  routeLabel,
  skipLabel,
  children,
  mainClassName,
  onMainReady,
}: KlyroRouteShellProps) {
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
    <div className="klyro-app">
      <a className="klyro-skip-link" href="#klyro-main">{skipLabel}</a>
      <KlyroHeader
        routeLabel={routeLabel}
        navigationExpanded={navigationExpanded}
        mobileNavigationOpen={mobileNavigationOpen}
        onToggleNavigation={toggleNavigation}
      />
      <div className="klyro-workspace">
        <KlyroNavigation
          expanded={navigationExpanded}
          mobileOpen={mobileNavigationOpen}
          onMobileClose={() => setMobileNavigationOpen(false)}
          onToggleNavigation={toggleNavigation}
        />
        <main className={`klyro-main${mainClassName ? ` ${mainClassName}` : ""}`} id="klyro-main" ref={mainRef}>
          {children}
        </main>
      </div>
    </div>
  )
}
