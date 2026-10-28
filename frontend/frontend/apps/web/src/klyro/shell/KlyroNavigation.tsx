import { useEffect, type ComponentType } from "react"
import {
  Palette,
  UserRoundCog,
  FileCheck2,
  Gauge,
  PackageCheck,
  Scissors,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideProps,
} from "lucide-react"
import { studioNavigationHref } from "../account/studioNavigation"
import { getExportCapability } from "../../../../../packages/cutter-engine/export/exportTiers"

interface NavigationItem {
  label: string
  icon: ComponentType<LucideProps>
  href?: string
  badge?: string
  disabled?: boolean
}

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: Gauge, href: "/" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Cutter Studio", icon: Scissors, href: "/cutter" },
      { label: "Artwork Studio", icon: Palette, href: "/artwork" },
    ],
  },
  {
    label: "QC & Export",
    items: [
      { label: "Validation Centre", icon: FileCheck2, href: "/validation" },
      {
        label: "Export Release",
        icon: PackageCheck,
        href: "/cutter#save-export",
        disabled: !getExportCapability("ai-compatible-svg")?.available,
        badge: "In Cutter Studio"
      },
    ],
  },
  {
    label: "User",
    items: [
      { label: "Accounts & Preferences", icon: UserRoundCog, href: "/account" },
    ],
  },
]

interface KlyroNavigationProps {
  expanded: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  onToggleNavigation: () => void
}

export function KlyroNavigation({ expanded, mobileOpen, onMobileClose, onToggleNavigation }: KlyroNavigationProps) {
  const routePath = window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/"
  const currentPath = routePath === "/index" ? "/" : routePath
  useEffect(() => {
    if (!mobileOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose()
    }

    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [mobileOpen, onMobileClose])

  return (
    <>
      {mobileOpen && (
        <button
          className="klyro-navigation-scrim"
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`klyro-navigation${expanded ? " is-expanded" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
        id="klyro-navigation"
        data-navigation-default="collapsed"
      >
        <nav aria-label="Primary navigation">
          {navigationGroups.map((group) => (
            <section className="klyro-navigation-group" key={group.label} aria-label={group.label}>
              <div className="klyro-navigation-group-label">{group.label}</div>
              <div className="klyro-navigation-items">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.href === currentPath
                  const accessibleLabel = item.disabled
                    ? `${item.label} — ${item.badge ?? "Unavailable"}`
                    : item.label
                  const content = (
                    <>
                      <Icon aria-hidden="true" className="klyro-navigation-icon" size={22} />
                      <span className="klyro-navigation-label">{item.label}</span>
                      {item.badge && <span className="klyro-navigation-badge">{item.badge}</span>}
                    </>
                  )

                  if (item.disabled) {
                    return (
                      <button
                        className="klyro-navigation-item"
                        type="button"
                        aria-disabled="true"
                        aria-label={accessibleLabel}
                        title={accessibleLabel}
                        key={item.label}
                        onClick={(event) => event.preventDefault()}
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <a
                      className={`klyro-navigation-item${isActive ? " is-active" : ""}`}
                      href={item.label==="Cutter Studio"?studioNavigationHref():item.href}
                      aria-label={accessibleLabel}
                      title={accessibleLabel}
                      aria-current={isActive ? "page" : undefined}
                      key={item.label}
                      onClick={event=>{if(item.label==="Cutter Studio")event.currentTarget.href=studioNavigationHref();onMobileClose()}}
                    >
                      {content}
                    </a>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>
        <button
          className="klyro-icon-button klyro-rail-toggle"
          type="button"
          onClick={onToggleNavigation}
          aria-label={expanded || mobileOpen ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={expanded || mobileOpen}
          aria-controls="klyro-navigation"
        >
          {expanded || mobileOpen ? <PanelLeftClose size={15} aria-hidden="true" /> : <PanelLeftOpen size={15} aria-hidden="true" />}
        </button>
      </aside>
    </>
  )
}
