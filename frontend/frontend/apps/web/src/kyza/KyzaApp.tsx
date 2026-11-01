import { useState } from "react"
import { DashboardPage } from "./dashboard/DashboardPage"
import { loadDashboardProjectSummaries } from "./dashboard/projectAdapter"
import { KyzaRouteShell, DEFAULT_NAVIGATION_EXPANDED } from "./shell/KyzaRouteShell"
import { KyzaThemeProvider } from "./shell/KyzaThemeProvider"

export { DEFAULT_NAVIGATION_EXPANDED }

export function KyzaApp() {
  const [projectCollection] = useState(loadDashboardProjectSummaries)

  return (
    <KyzaThemeProvider>
      <KyzaRouteShell routeLabel="Dashboard" skipLabel="Skip to dashboard">
        <DashboardPage projectCollection={projectCollection} />
      </KyzaRouteShell>
    </KyzaThemeProvider>
  )
}
