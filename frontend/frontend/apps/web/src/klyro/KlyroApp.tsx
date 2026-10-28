import { useState } from "react"
import { DashboardPage } from "./dashboard/DashboardPage"
import { loadDashboardProjectSummaries } from "./dashboard/projectAdapter"
import { KlyroRouteShell, DEFAULT_NAVIGATION_EXPANDED } from "./shell/KlyroRouteShell"
import { KlyroThemeProvider } from "./shell/KlyroThemeProvider"

export { DEFAULT_NAVIGATION_EXPANDED }

export function KlyroApp() {
  const [projectCollection] = useState(loadDashboardProjectSummaries)

  return (
    <KlyroThemeProvider>
      <KlyroRouteShell routeLabel="Dashboard" skipLabel="Skip to dashboard">
        <DashboardPage projectCollection={projectCollection} />
      </KlyroRouteShell>
    </KlyroThemeProvider>
  )
}
