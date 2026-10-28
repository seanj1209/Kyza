import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react"
import { KlyroLogo } from "./KlyroLogo"
import { useKlyroTheme } from "./KlyroThemeProvider"

interface KlyroHeaderProps {
  routeLabel: string
  navigationExpanded: boolean
  mobileNavigationOpen: boolean
  onToggleNavigation: () => void
}

export function KlyroHeader({
  routeLabel,
  navigationExpanded,
  mobileNavigationOpen,
  onToggleNavigation,
}: KlyroHeaderProps) {
  const { theme, toggleTheme } = useKlyroTheme()
  const navigationOpen = navigationExpanded || mobileNavigationOpen
  const NavigationIcon = navigationOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header className="klyro-header">
      <div className="klyro-header-leading">
        <button
          className="klyro-icon-button klyro-navigation-toggle klyro-mobile-navigation-toggle"
          type="button"
          onClick={onToggleNavigation}
          aria-label={navigationOpen ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={navigationOpen}
          aria-controls="klyro-navigation"
        >
          <NavigationIcon className="klyro-desktop-toggle-icon" aria-hidden="true" size={19} />
          <Menu className="klyro-mobile-toggle-icon" aria-hidden="true" size={20} />
        </button>
        <KlyroLogo />
      </div>

      <div className="klyro-route-pill" aria-label="Current page">{routeLabel}</div>

      <div className="klyro-header-actions">
        <button
          className="klyro-icon-button"
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
        </button>
      </div>
    </header>
  )
}
