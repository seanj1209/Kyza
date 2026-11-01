import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react"
import { KyzaLogo } from "./KyzaLogo"
import { useKyzaTheme } from "./KyzaThemeProvider"

interface KyzaHeaderProps {
  routeLabel: string
  navigationExpanded: boolean
  mobileNavigationOpen: boolean
  onToggleNavigation: () => void
}

export function KyzaHeader({
  routeLabel,
  navigationExpanded,
  mobileNavigationOpen,
  onToggleNavigation,
}: KyzaHeaderProps) {
  const { theme, toggleTheme } = useKyzaTheme()
  const navigationOpen = navigationExpanded || mobileNavigationOpen
  const NavigationIcon = navigationOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header className="kyza-header">
      <div className="kyza-header-leading">
        <button
          className="kyza-icon-button kyza-navigation-toggle kyza-mobile-navigation-toggle"
          type="button"
          onClick={onToggleNavigation}
          aria-label={navigationOpen ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={navigationOpen}
          aria-controls="kyza-navigation"
        >
          <NavigationIcon className="kyza-desktop-toggle-icon" aria-hidden="true" size={19} />
          <Menu className="kyza-mobile-toggle-icon" aria-hidden="true" size={20} />
        </button>
        <KyzaLogo />
      </div>

      <div className="kyza-route-pill" aria-label="Current page">{routeLabel}</div>

      <div className="kyza-header-actions">
        <button
          className="kyza-icon-button"
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
