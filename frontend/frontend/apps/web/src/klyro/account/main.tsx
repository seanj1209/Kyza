import { StrictMode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { Check, HardDrive, Moon, Palette, SlidersHorizontal, Sun, UserRound } from "lucide-react"
import { KlyroRouteShell } from "../shell/KlyroRouteShell"
import { KlyroThemeProvider, useKlyroTheme, type KlyroTheme } from "../shell/KlyroThemeProvider"
import { FIELD_LIMIT, loadPreferences, savePreferences, type Preferences } from "./preferenceService"
import { getStudioDestination, setStudioDestination, type StudioDestination } from "./studioNavigation"
import "../styles/klyro.css"
import "./account.css"

const storage = () => {
  try { return localStorage } catch { return null }
}

const profileFields = [
  { key: "name", label: "Name", required: true, type: "text", autoComplete: "name" },
  { key: "company", label: "Company", type: "text", autoComplete: "organization" },
  { key: "email", label: "Email", required: true, type: "email", autoComplete: "email" },
  { key: "phone", label: "Phone number", type: "tel", autoComplete: "tel" },
  { key: "accountName", label: "Account name", type: "text", autoComplete: "off" },
] as const

const themes: { value: KlyroTheme; title: string; description: string }[] = [
  { value: "light", title: "Light", description: "Warm paper. Room to create." },
  { value: "dark", title: "Dark", description: "Soft charcoal. Clear focus." },
]

function Page() {
  const [initial] = useState(() => loadPreferences(storage()))
  const [preferences, setPreferences] = useState(initial.value)
  const [message, setMessage] = useState(initial.ok ? "" : initial.message)
  const [saveState, setSaveState] = useState<"idle" | "success" | "error">(initial.ok ? "idle" : "error")
  const { theme, setTheme } = useKlyroTheme()
  const [studioDestination,changeStudioDestination]=useState(getStudioDestination)
  const [section, setSection] = useState(() => window.location.hash.slice(1) || "account")
  const lastSaved = useRef(JSON.stringify(initial.value))

  useEffect(() => {
    const draft = JSON.stringify(preferences)
    if (draft === lastSaved.current) return
    const result = savePreferences(preferences, storage())
    if (result.ok) lastSaved.current = draft
    setMessage(result.ok ? "Saved on this device." : result.message)
    setSaveState(result.ok ? "success" : "error")
  }, [preferences])

  const field = (key: keyof Preferences, value: string) => {
    setPreferences(current => ({ ...current, [key]: value }))
  }
  const selectSection = (next: string) => { setSection(next); window.history.replaceState(null, "", `#${next}`) }

  return (
    <div className="klyro-dashboard account-specs">
      <section className="klyro-hero account-hero" aria-labelledby="account-title">
        <div>
          <span className="klyro-eyebrow">MAKE IT YOURS</span>
          <h1 id="account-title">Accounts &amp; Preferences<span>.</span></h1>
          <p>Account details and workspace preferences, all in one place.</p>
        </div>
        <span className="account-local-label"><HardDrive size={13} aria-hidden="true" /> Changes save automatically on this device</span>
      </section>

      <div className="account-grid">
        <div className="account-content" aria-label="Account preferences">
        {section === "account" && <section className="account-panel account-profile" aria-labelledby="account-details-title">
          <div className="account-panel-heading">
            <span className="account-panel-icon"><UserRound size={19} aria-hidden="true" /></span>
            <div><h2 id="account-details-title">Your details</h2><p>The people behind the packaging.</p></div>
          </div>
          <div className="account-fields">
            {profileFields.map(config => (
              <label key={config.key} className={config.key === "accountName" ? "account-field-wide" : undefined}>
                <span>{config.label}</span>
                <input
                  name={config.key}
                  value={preferences[config.key]}
                  maxLength={FIELD_LIMIT}
                  autoComplete={config.autoComplete}
                  onChange={event => field(config.key, event.target.value)}
                  type={config.type}
                />
              </label>
            ))}
          </div>
          <div className="account-local-note">
            <HardDrive size={17} aria-hidden="true" />
            <div><strong>A local workspace, for now</strong><p>Your details stay in this browser. Sign-in and password settings will be available when online accounts arrive.</p></div>
          </div>
        </section>}

        {section === "ui" && <div className="account-preferences-stack">
          <section className="account-panel account-appearance" aria-labelledby="account-appearance-title">
            <div className="account-panel-heading">
              <span className="account-panel-icon"><Palette size={19} aria-hidden="true" /></span>
              <div><h2 id="account-appearance-title">Your Klyro, your feel</h2><p>Two expressions. One familiar workspace.</p></div>
            </div>
            <fieldset className="account-theme-options">
              <legend>Theme</legend>
              {themes.map(option => (
                <label className="account-theme-option" key={option.value}>
                  <input type="radio" name="theme" value={option.value} checked={theme === option.value} onChange={() => setTheme(option.value)} aria-label={option.title} />
                  <span className="account-theme-card">
                    <span className={`account-theme-preview is-${option.value}`} aria-hidden="true">
                      <span className="account-preview-header"><i /><b>Klyro.</b><i /></span>
                      <span className="account-preview-layout"><span className="account-preview-rail"><i /><i /><i /></span><span className="account-preview-canvas"><i /><i /><span className="account-preview-sheet" /><span className="account-preview-dock"><i /><i /><i /></span></span></span>
                    </span>
                    <span className="account-theme-caption">
                      {option.value === "light" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                      <strong>{option.title}</strong>
                      <span className="account-theme-check" aria-hidden="true">{theme === option.value && <Check size={13} />}</span>
                    </span>
                    <span className="account-theme-description">{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label>Studio icon links to
              <select value={studioDestination} onChange={event=>{const value=event.target.value as StudioDestination;if(setStudioDestination(value))changeStudioDestination(value);else {setMessage("Studio navigation preference could not be saved.");setSaveState("error")}}}>
                <option value="studio">Cutter Studio</option><option value="app">Cutter App</option>
              </select>
            </label>
            <small>Cutter Studio opens the start page with Resume Work. Cutter App resumes your current work when available.</small>
            <small>Applies immediately and follows you across Klyro on this browser.</small>
          </section>

        </div>}
        {section === "cutter" && <section className="account-panel" aria-labelledby="account-cutter-title">
          <div className="account-panel-heading"><span className="account-panel-icon"><SlidersHorizontal size={19} aria-hidden="true" /></span><div><h2 id="account-cutter-title">Cutter preferences</h2><p>Defaults for precision editing.</p></div></div>
          <label>Units of measure
            <select value={preferences.units} onChange={event => field("units", event.target.value)} aria-describedby="account-units-note">
              <option value="mm">Metric (mm)</option><option value="in">Imperial (inches)</option>
            </select>
          </label>
          <small id="account-units-note">Display preference only. Cutter dimensions currently remain in millimetres.</small>
          <label>Nudge increment
            <select value={preferences.nudgeIncrementMm} onChange={event => setPreferences(current => ({ ...current, nudgeIncrementMm: Number(event.target.value) as Preferences["nudgeIncrementMm"] }))} aria-describedby="account-nudge-note">
              <option value="0.25">0.25mm</option><option value="0.5">0.5mm</option><option value="1">1mm</option>
            </select>
          </label>
          <small id="account-nudge-note">Arrow-key movement in Cutter Studio uses this increment. Default: 0.5mm.</small>
          <label>Mouse movement step
            <select value={preferences.moveIncrementMm} onChange={event => setPreferences(current => ({ ...current, moveIncrementMm: Number(event.target.value) as Preferences["moveIncrementMm"] }))} aria-describedby="account-move-note">
              <option value="0.25">0.25mm</option><option value="0.5">0.5mm</option><option value="1">1mm</option>
            </select>
          </label>
          <small id="account-move-note">Objects and elements dragged with the mouse land on this grid, so positions read 9.25, 9.5, 9.75 rather than 9.4 or 9.65. Default: 0.25mm.</small>
          <label>Zoom button step
            <select value={preferences.zoomStepPercent} onChange={event => setPreferences(current => ({ ...current, zoomStepPercent: Number(event.target.value) as Preferences["zoomStepPercent"] }))} aria-describedby="account-zoom-note">
              <option value="10">10%</option><option value="25">25%</option><option value="50">50%</option><option value="100">100%</option>
            </select>
          </label>
          <small id="account-zoom-note">The floating dock + and − buttons change canvas zoom by this amount. Default: 50%.</small>
          <div className="account-pack-preferences">
            <h3>Pack types</h3>
            <h4>Lidding</h4>
            <label>Scaling behavior
              <select value={preferences.liddingGrowthBehavior} onChange={event => setPreferences(current => ({ ...current, liddingGrowthBehavior: event.target.value as Preferences["liddingGrowthBehavior"] }))}>
                <option value="ask">Ask each time</option><option value="keep">Keep config</option><option value="scale">Scale config</option>
              </select>
            </label>
            <small>Used when an overall lidding cutter dimension increases. Reductions always scale the lid.</small>
          </div>
          <small>Default cutter style settings will appear here when a shared style preset is available.</small>
        </section>}
        {["artwork", "notifications", "security"].includes(section) && <section className="account-panel"><h2>{section === "artwork" ? "Artwork preferences" : section === "notifications" ? "Notifications" : "Security"}</h2><p>Settings for this area are planned. Nothing changes until controls are available.</p></section>}
        <p className={`account-feedback is-${saveState}`} role="status" aria-live="polite">{message}</p>
        </div>
        <nav className="account-section-nav" aria-label="Settings sections">
          <h2>Settings</h2>
          {[["account", "Account"], ["ui", "User Preferences"], ["cutter", "Cutter preferences"], ["artwork", "Artwork preferences"], ["notifications", "Notifications"], ["security", "Security"]].map(([key, label]) => (
            <button key={key} type="button" className={section === key ? "is-active" : ""} aria-current={section === key ? "page" : undefined} onClick={() => selectSection(key)}>{label}{["artwork", "notifications", "security"].includes(key) && <small>Planned</small>}</button>
          ))}
        </nav>
      </div>
    </div>
  )
}

const root = document.getElementById("app")
if (!root) throw Error("Account root not found")
createRoot(root).render(
  <StrictMode><KlyroThemeProvider><KlyroRouteShell routeLabel="Accounts & Preferences" skipLabel="Skip to account settings"><Page /></KlyroRouteShell></KlyroThemeProvider></StrictMode>
)
