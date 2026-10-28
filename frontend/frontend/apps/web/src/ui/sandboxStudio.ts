/**
 * Sandbox Studio — UI module
 *
 * Implements the Sandbox-specific entry screen, right-hand toolbar,
 * Set-Up panel, Specs panel (with Substrate tabs) and placeholder
 * panels for Layout, Applications, Process Flow and Layers & QC.
 *
 * All DOM is scoped to Sandbox mode. Nothing here modifies
 * conventional pack-type behaviour.
 */
import "./sandboxStudio.css"

// ── Types ──────────────────────────────────────────────────
export type SandboxSubstrate = {
  blend: string
  substrateWidth: string
  gauge: string
  gaugeUnit: "µm" | "gsm"
  filmColour: string
}

export type SandboxSetupState = {
  width: string
  height: string
  process: string
  machineConfig: string
  unit: "mm" | "in"
}

export type SandboxStudioApi = {
  /** The root element containing the entry screen, toolbar, and panel. */
  element: HTMLDivElement
  /** Open the entry screen. */
  showEntry: () => void
  /** Hide the entry screen (e.g. after choosing "Set Up"). */
  hideEntry: () => void
  /** Destroy and clean up. */
  destroy: () => void
  /** Get the current setup state. */
  getSetupState: () => SandboxSetupState
  /** Get all substrate data. */
  getSubstrates: () => SandboxSubstrate[]
}

export type SandboxStudioOptions = {
  /** The container to mount the sandbox studio into (the preview area). */
  host: HTMLElement
  initialSetup?: { width: number; height: number; filmColour: string }
  /** Called when the user clicks "Set Up" on the entry screen. */
  onSetUp?: () => void
  /** Called when a dimension is changed in the Set-Up panel. */
  onDimensionChange?: (width: number, height: number, unit: "mm" | "in") => void
  /** Called when the first substrate's Film Colour changes in Specs (drives the canvas substrate). */
  onSubstrateChange?: (filmColour: string) => void
}

/** AMENDS 6.2: Set Up starts a 540 W × 250 H cutter on a clear substrate. */
export const SANDBOX_DEFAULT_WIDTH_MM = 540
export const SANDBOX_DEFAULT_HEIGHT_MM = 250
export const SANDBOX_DEFAULT_FILM_COLOUR = "Clear"

// ── Helpers ────────────────────────────────────────────────
const svgIcon = (paths: string, size = 20) => {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", String(size))
  svg.setAttribute("height", String(size))
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "1.8")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.setAttribute("aria-hidden", "true")
  svg.innerHTML = paths
  return svg
}

// Icons (Lucide-style)
const ICONS = {
  setup: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  specs: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
  applications: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
  processFlow: '<path d="M17 3v4"/><path d="M17 11v2"/><path d="M17 19v2"/><path d="M7 3v4"/><rect x="4" y="7" width="6" height="6" rx="1"/><rect x="14" y="13" width="6" height="6" rx="1"/><path d="M7 13v4h4"/><path d="M17 7v2h-4"/>',
  layersQc: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z"/><path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L21 12"/><path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L21 17"/>',
  // Specs sub-tabs
  substrate: '<path d="M4 20h16V4H4z"/><path d="M4 12h16"/>',
  inkSystem: '<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M7 13a5 5 0 0 0 10 0"/><path d="M12 18v4"/>',
  lacquer: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1 1 0 0 1 .6-1.6h2a4 4 0 0 0 4-4 9 9 0 0 0-9-9Z"/><circle cx="7.5" cy="10" r=".6"/><circle cx="10" cy="6.5" r=".6"/><circle cx="15" cy="7" r=".6"/><circle cx="17" cy="11" r=".6"/>',
  adhesives: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>',
  processSpec: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  // Entry screen icons
  import: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',
  mapProcess: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/>',
}

// ── Background illustrations (SVG) ────────────────────────
// Faint cutter construction, ink, film and measurement references.
// Decorative only: aria-hidden, pointer-events disabled by the host layer.
// Palette (dark workspace): neutral grey construction lines, cyan accents,
// muted-red/brand highlights. A radial mask keeps the centre faint so the
// welcome buttons stay prominent; per-element opacity builds depth.
function createEntryBackground(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 1440 820")
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  svg.setAttribute("fill", "none")
  svg.setAttribute("aria-hidden", "true")

  const GREY = "#9198a3"
  const GREY_DIM = "#6b7079"
  const CYAN = "#49c6dc"
  const RED = "#c7474d"
  const TXT = "#aab0ba"

  // Faint engineering grid (every 60u), drawn once as a tiled pattern.
  const gridLines = (() => {
    let out = ""
    for (let x = 0; x <= 1440; x += 60) out += `<line x1="${x}" y1="0" x2="${x}" y2="820"/>`
    for (let y = 0; y <= 820; y += 60) out += `<line x1="0" y1="${y}" x2="1440" y2="${y}"/>`
    return out
  })()

  const rulerTicks = Array.from({ length: 21 }, (_, i) =>
    `<line x1="${120 + i * 14}" y1="300" x2="${120 + i * 14}" y2="${i % 5 === 0 ? 316 : 308}"/>`
  ).join("")

  // Step-and-repeat composite web (4×2 array of mini stand-up pouches).
  const stepRepeat = (() => {
    let cells = ""
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * 74
        const y = r * 96
        cells += `<g transform="translate(${x},${y})">
          <rect x="6" y="4" width="56" height="78" rx="6"/>
          <path d="M14 78 q20 14 40 0" />
          <line x1="34" y1="10" x2="34" y2="76" stroke-dasharray="3 4" opacity="0.5"/>
        </g>`
      }
    }
    return cells
  })()

  svg.innerHTML = `
    <defs>
      <radialGradient id="sbxFade" cx="50%" cy="47%" r="60%">
        <stop offset="0%" stop-color="#000"/>
        <stop offset="34%" stop-color="#0d0d0d"/>
        <stop offset="64%" stop-color="#8a8a8a"/>
        <stop offset="100%" stop-color="#fff"/>
      </radialGradient>
      <mask id="sbxMask"><rect width="1440" height="820" fill="url(#sbxFade)"/></mask>
      <filter id="sbxGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <marker id="sbxArr" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
        <path d="M1 1 L7 4.5 L1 8" fill="none" stroke="${TXT}" stroke-width="1"/>
      </marker>
    </defs>

    <g mask="url(#sbxMask)" font-family="'SFMono-Regular',ui-monospace,monospace">
      <!-- Engineering grid -->
      <g stroke="${GREY_DIM}" stroke-width="0.6" opacity="0.14">${gridLines}</g>

      <!-- Long construction guides -->
      <g stroke="${CYAN}" stroke-width="0.7" opacity="0.1">
        <line x1="0" y1="150" x2="1440" y2="470"/>
        <line x1="1440" y1="60" x2="120" y2="760"/>
      </g>

      <!-- ░░ TOP-LEFT: DOY silhouette based on the Studio pack carousel ░░ -->
      <g class="sbx-pack" stroke="${GREY}" stroke-width="1.4" opacity="0.57">
        <path d="M124 120 H276 Q281 120 282 127 L291 249 Q292 265 278 267 H122 Q108 265 109 249 L118 127 Q119 120 124 120 Z" fill="${GREY_DIM}" fill-opacity=".13"/>
        <path d="M119 137 H281" stroke-width="2"/>
        <path d="M110 249 Q200 302 290 249 L286 271 Q200 316 114 271 Z" fill="${GREY_DIM}" fill-opacity=".18"/>
        <path d="M116 265 Q200 310 284 265" stroke-width="1"/>
        <text x="200" y="205" text-anchor="middle" font-size="25" font-weight="700" fill="${TXT}" stroke="none" opacity=".7">DOY</text>
        <line x1="150" y1="225" x2="250" y2="225" stroke="${RED}" stroke-width="3" opacity=".6"/>
      </g>
      <g stroke="${GREY}" stroke-width="0.9" opacity="0.4">
        <line x1="126" y1="128" x2="126" y2="250"/><line x1="276" y1="128" x2="276" y2="250"/>
      </g>
      <g stroke="${TXT}" stroke-width="0.9" opacity="0.55" marker-start="url(#sbxArr)" marker-end="url(#sbxArr)">
        <line x1="120" y1="96" x2="282" y2="96"/>
        <line x1="92" y1="120" x2="92" y2="285"/>
      </g>
      <g stroke="${GREY_DIM}" stroke-width="0.7" opacity="0.4">
        <line x1="120" y1="90" x2="120" y2="102"/><line x1="282" y1="90" x2="282" y2="102"/>
        <line x1="86" y1="120" x2="98" y2="120"/><line x1="86" y1="285" x2="98" y2="285"/>
      </g>
      <text x="201" y="88" text-anchor="middle" font-size="13" fill="${TXT}" opacity="0.75">210 mm</text>
      <text x="78" y="205" text-anchor="middle" font-size="13" fill="${TXT}" opacity="0.75" transform="rotate(-90 78 205)">300 mm</text>
      <text x="300" y="150" font-size="11" fill="${RED}" opacity="0.6">DOY · 210×300</text>

      <!-- Ruler strip -->
      <g stroke="${GREY}" stroke-width="0.8" opacity="0.4">
        <line x1="120" y1="300" x2="400" y2="300"/>${rulerTicks}
      </g>

      <!-- ░░ TOP-RIGHT: measured cutter mat and graph board ░░ -->
      <g class="sbx-mat" transform="translate(1040,72)" stroke="${GREY}" fill="none" opacity=".48">
        <rect x="0" y="0" width="300" height="160" rx="5" stroke-width="1.4"/>
        <g stroke-width=".55" opacity=".46">
          ${Array.from({ length: 14 }, (_, i) => `<line x1="${20 + i * 20}" y1="12" x2="${20 + i * 20}" y2="148"/>`).join("")}
          ${Array.from({ length: 7 }, (_, i) => `<line x1="12" y1="${20 + i * 20}" x2="288" y2="${20 + i * 20}"/>`).join("")}
        </g>
        <path d="M65 42 H235 V125 H65 Z" stroke="${CYAN}" stroke-width="1.2" stroke-dasharray="4 3"/>
        <line x1="65" y1="35" x2="235" y2="35" marker-start="url(#sbxArr)" marker-end="url(#sbxArr)"/>
        <text x="150" y="29" text-anchor="middle" font-size="11" fill="${TXT}" stroke="none">CUTTER MAT · mm</text>
      </g>

      <!-- substrate layer stack w/ brace + labels -->
      <g transform="translate(1180,250)">
        <g stroke-width="7" opacity="0.5" fill="none">
          <line x1="0" y1="0" x2="150" y2="0" stroke="${CYAN}"/>
          <line x1="0" y1="14" x2="150" y2="14" stroke="${GREY}"/>
          <line x1="0" y1="28" x2="150" y2="28" stroke="${RED}"/>
        </g>
        <g stroke="${TXT}" stroke-width="0.8" opacity="0.5">
          <path d="M160 -4 q8 0 8 8 v8 q0 8 8 8 q-8 0 -8 8 v8 q0 8 -8 8" fill="none"/>
        </g>
        <text x="184" y="18" font-size="11" fill="${TXT}" opacity="0.65">3-ply</text>
        <text x="-70" y="4" font-size="10" fill="${TXT}" opacity="0.6">OPP</text>
        <text x="-70" y="18" font-size="10" fill="${TXT}" opacity="0.6">ADH</text>
        <text x="-70" y="32" font-size="10" fill="${TXT}" opacity="0.6">PE</text>
      </g>

      <!-- ░░ RIGHT-MID: compact cutter legend proof ░░ -->
      <g class="sbx-legend" transform="translate(1120,378)" opacity=".5" font-size="11" fill="${TXT}">
        <rect x="0" y="0" width="244" height="182" rx="5" stroke="${GREY}" stroke-width="1.4" fill="${GREY_DIM}" fill-opacity=".08"/>
        <text x="15" y="22" font-size="14" font-weight="700">CUTTER LEGEND</text>
        <line x1="15" y1="31" x2="229" y2="31" stroke="${GREY}"/>
        <text x="15" y="52">W 450 × H 230 mm</text>
        <text x="15" y="75">SUBSTRATE  OPP</text>
        <text x="15" y="98">FILM  BLUE TINT</text>
        <text x="15" y="121">COATING  DATE-CODE LACQ</text>
        <text x="15" y="144">FEATURE  MICROPERF</text>
        <line x1="15" y1="160" x2="72" y2="160" stroke="${CYAN}" stroke-width="2"/>
        <line x1="85" y1="160" x2="142" y2="160" stroke="${RED}" stroke-width="2"/>
      </g>
      <g transform="translate(1368,150)" filter="url(#sbxGlow)" class="sbx-pulse">
        <g stroke="${CYAN}" stroke-width="1.3" opacity="0.75" fill="none">
          <circle cx="0" cy="0" r="28"/><circle cx="0" cy="0" r="16"/>
          <line x1="-40" y1="0" x2="40" y2="0"/><line x1="0" y1="-40" x2="0" y2="40"/>
        </g>
        <circle cx="0" cy="0" r="3.5" fill="${CYAN}" opacity="0.9"/>
      </g>
      <text x="1368" y="208" text-anchor="middle" font-size="10" fill="${TXT}" opacity="0.6">REG ⌖</text>

      <!-- ░░ BOTTOM-LEFT: CMYK ink droplets above a proof strip ░░ -->
      <g transform="translate(120,570)">
        <g stroke="${GREY}" stroke-width="1.25" fill="none" opacity="0.52">
          <path d="M46 8 C35 28 18 44 18 65 a28 28 0 0 0 56 0 C74 44 57 28 46 8Z"/>
          <path d="M130 36 C121 52 107 67 107 84 a23 23 0 0 0 46 0 C153 67 139 52 130 36Z"/>
          <path d="M208 15 C198 34 181 51 181 70 a27 27 0 0 0 54 0 C235 51 218 34 208 15Z"/>
          <path d="M280 35 C272 50 258 66 258 83 a23 23 0 0 0 46 0 C304 66 289 50 280 35Z"/>
          <line x1="0" y1="176" x2="320" y2="176"/>
          <rect x="10" y="188" width="310" height="22" rx="2"/>
        </g>
        <g class="sbx-ink" stroke="none" opacity=".43">
          <circle cx="46" cy="69" r="13" fill="#00a8d4"/><rect x="18" y="190" width="64" height="18" fill="#00a8d4"/>
          <circle cx="130" cy="87" r="10" fill="#d640a0"/><rect x="95" y="190" width="64" height="18" fill="#d640a0"/>
          <circle cx="208" cy="74" r="12" fill="#e7c72e"/><rect x="172" y="190" width="64" height="18" fill="#e7c72e"/>
          <circle cx="280" cy="86" r="10" fill="#1b1b1b"/><rect x="249" y="190" width="64" height="18" fill="#4c515a"/>
        </g>
        <g class="sbx-ink-labels" fill="${TXT}" font-size="11" text-anchor="middle" opacity=".7">
          <text x="50" y="230">C</text><text x="127" y="230">M</text><text x="204" y="230">Y</text><text x="281" y="230">K</text>
        </g>
      </g>

      <!-- ░░ BOTTOM-CENTRE: step-and-repeat composite web ░░ -->
      <g transform="translate(540,600)" stroke="${GREY}" stroke-width="1" opacity="0.4">
        <rect x="-10" y="-14" width="316" height="226" opacity="0.5"/>
        ${stepRepeat}
        <!-- eyemark strip -->
        <g fill="${RED}" stroke="none" opacity="0.5">
          ${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 50 + 8}" y="196" width="16" height="10"/>`).join("")}
        </g>
      </g>
      <text x="548" y="586" font-size="11" fill="${TXT}" opacity="0.55">STEP &amp; REPEAT · 4-up</text>

      <!-- ░░ BOTTOM-RIGHT: cutter measure and layer registration ░░ -->
      <g transform="translate(980,560)">
        <g stroke="${GREY}" stroke-width="1" opacity="0.5">
          <rect x="10" y="25" width="260" height="140" rx="3"/>
          <line x1="25" y1="48" x2="255" y2="48"/>
          <line x1="25" y1="145" x2="255" y2="145"/>
          <line x1="140" y1="48" x2="140" y2="145" stroke-dasharray="5 5"/>
          <line x1="25" y1="12" x2="255" y2="12" marker-start="url(#sbxArr)" marker-end="url(#sbxArr)"/>
        </g>
        <g stroke="${CYAN}" stroke-width="1" opacity="0.48">
          <line x1="48" y1="48" x2="48" y2="145"/>
          <line x1="232" y1="48" x2="232" y2="145"/>
        </g>
        <g fill="${TXT}" stroke="none" font-size="11" opacity="0.6">
          <text x="140" y="4" text-anchor="middle">WIDTH · mm</text>
          <text x="28" y="185">CUT</text><text x="115" y="185">FOLD</text><text x="215" y="185">SEAL</text>
        </g>
        <text x="0" y="212" font-size="11" fill="${TXT}" opacity="0.55">CUTTER MEASURES</text>
      </g>

      <!-- ░░ SCATTERED construction symbols ░░ -->
      <g transform="translate(470,150)" stroke="${GREY}" stroke-width="0.9" opacity="0.3" fill="none">
        <circle cx="0" cy="0" r="34"/><circle cx="0" cy="0" r="20"/>
        <line x1="-46" y1="0" x2="46" y2="0"/><line x1="0" y1="-46" x2="0" y2="46"/>
      </g>
      <!-- offset substrate edges -->
      <g transform="translate(360,400)" stroke="${GREY}" stroke-width="1" opacity="0.26" fill="none">
        <path d="M0 0 h86 v30 h-86 z M7 7 h86 v30 h-86 z M14 14 h86 v30 h-86 z"/>
        <line x1="14" y1="52" x2="100" y2="52"/>
      </g>
      <!-- callout bubbles -->
      <g stroke="${TXT}" stroke-width="0.8" opacity="0.4" fill="none">
        <circle cx="690" cy="470" r="11"/><line x1="701" y1="470" x2="740" y2="452"/>
        <circle cx="940" cy="330" r="11"/><line x1="929" y1="330" x2="892" y2="314"/>
      </g>
      <text x="686" y="474" font-size="11" fill="${TXT}" opacity="0.6" stroke="none">1</text>
      <text x="936" y="334" font-size="11" fill="${TXT}" opacity="0.6" stroke="none">2</text>

      <!-- slow scan line (animated; paused under reduced-motion) -->
      <line class="sbx-scan" x1="0" y1="0" x2="1440" y2="0" stroke="${CYAN}" stroke-width="1" opacity="0.14"/>
    </g>
  `
  return svg
}

// ── Film Colour options ────────────────────────────────────
const FILM_COLOURS = [
  "White",
  "Clear",
  "Matt",
  "White Paper",
  "Brown Paper",
  "Black Paper",
]

const PROCESS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "slit-only", label: "Slit Only" },
  { value: "print-only", label: "Print Only" },
  { value: "print-lam-slit", label: "Print – Lam – Slit" },
  { value: "lam-slit", label: "Lam – Slit" },
  { value: "lam-only", label: "Lam Only" },
]

// ── Main export ────────────────────────────────────────────
export function initSandboxStudio(options: SandboxStudioOptions): SandboxStudioApi {
  const root = document.createElement("div")
  root.className = "sandbox-studio-root"
  root.style.cssText = "position:absolute;inset:0;pointer-events:none;"

  // State
  const setupState: SandboxSetupState = {
    width: String(options.initialSetup?.width ?? SANDBOX_DEFAULT_WIDTH_MM),
    height: String(options.initialSetup?.height ?? SANDBOX_DEFAULT_HEIGHT_MM),
    process: "none",
    machineConfig: "",
    unit: "mm",
  }

  const createDefaultSubstrate = (): SandboxSubstrate => ({
    blend: "",
    substrateWidth: "",
    gauge: "",
    gaugeUnit: "µm",
    filmColour: options.initialSetup?.filmColour ?? SANDBOX_DEFAULT_FILM_COLOUR,
  })

  let substrates: SandboxSubstrate[] = [createDefaultSubstrate()]
  let substrateCount = 1
  let activeSubstrateIndex = 0
  let activeToolbarPanel: string | null = null

  // ╔══════════════════════════════════════════════╗
  // ║  1. ENTRY SCREEN                            ║
  // ╚══════════════════════════════════════════════╝
  const entry = document.createElement("div")
  entry.className = "sandbox-entry"
  entry.style.pointerEvents = "auto"

  const entryBg = document.createElement("div")
  entryBg.className = "sandbox-entry-bg"
  entryBg.appendChild(createEntryBackground())

  const entryText = document.createElement("p")
  entryText.className = "sandbox-entry-text"
  entryText.textContent =
    "Import a project, set up a cutter manually, or map your process first."

  const entryButtons = document.createElement("div")
  entryButtons.className = "sandbox-entry-buttons"

  const makeEntryBtn = (label: string, iconPath: string, primary = false) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `sandbox-entry-btn${primary ? " is-primary" : ""}`
    btn.appendChild(svgIcon(iconPath, 16))
    const span = document.createElement("span")
    span.textContent = label
    btn.appendChild(span)
    return btn
  }

  const btnSetUp = makeEntryBtn("Set Up", ICONS.setup, true)
  const btnImport = makeEntryBtn("Import Project", ICONS.import)
  const btnMapProcess = makeEntryBtn("Map Process", ICONS.mapProcess)

  entryButtons.append(btnImport, btnSetUp, btnMapProcess)
  entry.append(entryBg, entryText, entryButtons)

  // Entry button behaviour
  btnSetUp.addEventListener("click", () => {
    hideEntry()
    openPanel("setup")
    options.onSetUp?.()
  })
  btnImport.addEventListener("click", () => {
    // Placeholder — no functional import yet
    window.alert("Import Project is not yet implemented.")
  })
  btnMapProcess.addEventListener("click", () => {
    // Placeholder — no functional map process
    window.alert("Map Process is not yet implemented.")
  })

  // ╔══════════════════════════════════════════════╗
  // ║  2. RIGHT-HAND TOOLBAR                      ║
  // ╚══════════════════════════════════════════════╝
  const toolbar = document.createElement("div")
  toolbar.className = "sandbox-toolbar"
  toolbar.style.pointerEvents = "auto"

  const TOOLBAR_ITEMS = [
    { id: "setup", label: "Set-Up", icon: ICONS.setup },
    { id: "specs", label: "Specs", icon: ICONS.specs },
    { id: "layout", label: "Layout", icon: ICONS.layout },
    { id: "applications", label: "Applications", icon: ICONS.applications },
    { id: "processFlow", label: "Process Flow", icon: ICONS.processFlow },
    { id: "layersQc", label: "Layers & QC", icon: ICONS.layersQc },
  ]

  const toolbarButtons = new Map<string, HTMLButtonElement>()
  TOOLBAR_ITEMS.forEach((item) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "sandbox-toolbar-btn"
    btn.setAttribute("aria-label", item.label)
    btn.setAttribute("title", item.label)
    btn.appendChild(svgIcon(item.icon))
    btn.addEventListener("click", () => togglePanel(item.id))
    toolbar.appendChild(btn)
    toolbarButtons.set(item.id, btn)
  })

  // ╔══════════════════════════════════════════════╗
  // ║  3. SIDE PANEL CONTAINER                    ║
  // ╚══════════════════════════════════════════════╝
  const panel = document.createElement("div")
  panel.className = "sandbox-panel"
  panel.hidden = true
  panel.style.pointerEvents = "auto"

  const panelHeader = document.createElement("div")
  panelHeader.className = "sandbox-panel-header"
  const panelTitle = document.createElement("h3")
  panelTitle.className = "sandbox-panel-title"
  panelTitle.textContent = "Set-Up"
  const panelClose = document.createElement("button")
  panelClose.type = "button"
  panelClose.className = "sandbox-panel-close"
  panelClose.textContent = "×"
  panelClose.setAttribute("aria-label", "Close panel")
  panelClose.addEventListener("click", () => closePanel())
  panelHeader.append(panelTitle, panelClose)

  const panelBody = document.createElement("div")
  panelBody.className = "sandbox-panel-body"

  panel.append(panelHeader, panelBody)

  // ╔══════════════════════════════════════════════╗
  // ║  4. SET-UP PANEL CONTENT                    ║
  // ╚══════════════════════════════════════════════╝
  function buildSetupPanel(): HTMLElement {
    const frag = document.createElement("div")
    frag.style.cssText = "display:flex;flex-direction:column;gap:16px;"

    // Width input
    const widthField = document.createElement("div")
    widthField.className = "sandbox-field"
    const widthLabel = document.createElement("span")
    widthLabel.className = "sandbox-field-label"
    widthLabel.textContent = "Width"
    const widthRow = document.createElement("div")
    widthRow.className = "sandbox-field-row"
    const widthInput = document.createElement("input")
    widthInput.type = "number"
    widthInput.className = "sandbox-input"
    widthInput.value = setupState.width
    widthInput.placeholder = "Width"
    widthInput.min = "1"
    widthInput.step = "0.5"
    const widthUnit = document.createElement("span")
    widthUnit.className = "sandbox-field-unit"
    widthUnit.textContent = setupState.unit
    widthRow.append(widthInput, widthUnit)
    widthField.append(widthLabel, widthRow)

    // Height input
    const heightField = document.createElement("div")
    heightField.className = "sandbox-field"
    const heightLabel = document.createElement("span")
    heightLabel.className = "sandbox-field-label"
    heightLabel.textContent = "Height"
    const heightRow = document.createElement("div")
    heightRow.className = "sandbox-field-row"
    const heightInput = document.createElement("input")
    heightInput.type = "number"
    heightInput.className = "sandbox-input"
    heightInput.value = setupState.height
    heightInput.placeholder = "Height"
    heightInput.min = "1"
    heightInput.step = "0.5"
    const heightUnit = document.createElement("span")
    heightUnit.className = "sandbox-field-unit"
    heightUnit.textContent = setupState.unit
    heightRow.append(heightInput, heightUnit)
    heightField.append(heightLabel, heightRow)

    // Dimension change handlers
    const emitDimensionChange = () => {
      const w = parseFloat(widthInput.value)
      const h = parseFloat(heightInput.value)
      if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
        setupState.width = widthInput.value
        setupState.height = heightInput.value
        options.onDimensionChange?.(w, h, setupState.unit)
      }
    }
    widthInput.addEventListener("change", emitDimensionChange)
    heightInput.addEventListener("change", emitDimensionChange)

    // Separator
    const sep1 = document.createElement("div")
    sep1.className = "sandbox-field-separator"

    // Process dropdown
    const processField = document.createElement("div")
    processField.className = "sandbox-field"
    const processLabel = document.createElement("span")
    processLabel.className = "sandbox-field-label"
    processLabel.textContent = "Process"
    const processSelect = document.createElement("select")
    processSelect.className = "sandbox-input"
    PROCESS_OPTIONS.forEach((opt) => {
      const o = document.createElement("option")
      o.value = opt.value
      o.textContent = opt.label
      processSelect.appendChild(o)
    })
    processSelect.value = setupState.process
    processSelect.addEventListener("change", () => {
      setupState.process = processSelect.value
    })
    processField.append(processLabel, processSelect)

    // Machine Config (placeholder)
    const machineField = document.createElement("div")
    machineField.className = "sandbox-field"
    const machineLabel = document.createElement("span")
    machineLabel.className = "sandbox-field-label"
    machineLabel.textContent = "Machine Config"
    const machineInput = document.createElement("input")
    machineInput.type = "text"
    machineInput.className = "sandbox-input"
    machineInput.placeholder = "Not configured"
    machineInput.disabled = true
    machineInput.value = setupState.machineConfig
    machineField.append(machineLabel, machineInput)

    // Separator
    const sep2 = document.createElement("div")
    sep2.className = "sandbox-field-separator"

    // Measures toggle
    const measuresField = document.createElement("div")
    measuresField.className = "sandbox-field"
    const measuresLabel = document.createElement("span")
    measuresLabel.className = "sandbox-field-label"
    measuresLabel.textContent = "Measures"
    const measuresToggle = document.createElement("div")
    measuresToggle.className = "sandbox-measures-toggle"
    const mmBtn = document.createElement("button")
    mmBtn.type = "button"
    mmBtn.className = "sandbox-measures-btn is-active"
    mmBtn.textContent = "MM"
    const inBtn = document.createElement("button")
    inBtn.type = "button"
    inBtn.className = "sandbox-measures-btn"
    inBtn.textContent = "Inches"

    const updateUnitDisplay = () => {
      mmBtn.classList.toggle("is-active", setupState.unit === "mm")
      inBtn.classList.toggle("is-active", setupState.unit === "in")
      widthUnit.textContent = setupState.unit
      heightUnit.textContent = setupState.unit

      // Convert values when switching units
      const w = parseFloat(widthInput.value)
      const h = parseFloat(heightInput.value)
      if (setupState.unit === "in") {
        if (Number.isFinite(w)) widthInput.value = String(Math.round(w / 25.4 * 1000) / 1000)
        if (Number.isFinite(h)) heightInput.value = String(Math.round(h / 25.4 * 1000) / 1000)
      } else {
        if (Number.isFinite(w)) widthInput.value = String(Math.round(w * 25.4 * 10) / 10)
        if (Number.isFinite(h)) heightInput.value = String(Math.round(h * 25.4 * 10) / 10)
      }
      setupState.width = widthInput.value
      setupState.height = heightInput.value
    }

    mmBtn.addEventListener("click", () => {
      if (setupState.unit === "mm") return
      setupState.unit = "mm"
      updateUnitDisplay()
    })
    inBtn.addEventListener("click", () => {
      if (setupState.unit === "in") return
      setupState.unit = "in"
      updateUnitDisplay()
    })

    measuresToggle.append(mmBtn, inBtn)
    measuresField.append(measuresLabel, measuresToggle)

    frag.append(widthField, heightField, sep1, processField, machineField, sep2, measuresField)
    return frag
  }

  // ╔══════════════════════════════════════════════╗
  // ║  5. SPECS PANEL CONTENT                     ║
  // ╚══════════════════════════════════════════════╝
  function buildSpecsPanel(): HTMLElement {
    const container = document.createElement("div")
    container.className = "sandbox-specs-layout"
    container.style.cssText = "flex:1 1 0;min-height:0;"

    // Left vertical tab selector
    const tabBar = document.createElement("div")
    tabBar.className = "sandbox-specs-tabs"

    const SPECS_TABS = [
      { id: "substrate", label: "Substrate(s)", icon: ICONS.substrate },
      { id: "inkSystem", label: "Ink System", icon: ICONS.inkSystem },
      { id: "lacquer", label: "Lacquer & Coatings", icon: ICONS.lacquer },
      { id: "adhesives", label: "Adhesives & Lamination", icon: ICONS.adhesives },
      { id: "processSpec", label: "Process Spec", icon: ICONS.processSpec },
    ]

    let activeSpecTab = "substrate"
    const specTabButtons = new Map<string, HTMLButtonElement>()

    // Content area
    const contentArea = document.createElement("div")
    contentArea.className = "sandbox-specs-content"

    // Build substrate fields for a given index
    function buildSubstrateFields(index: number): HTMLElement {
      const sub = substrates[index] || createDefaultSubstrate()
      const frag = document.createElement("div")
      frag.style.cssText = "display:flex;flex-direction:column;gap:14px;"

      // Substrate count selector
      const countRow = document.createElement("div")
      countRow.className = "sandbox-substrate-count"
      const countLabel = document.createElement("span")
      countLabel.className = "sandbox-substrate-count-label"
      countLabel.textContent = "Substrate Count"
      const countSelect = document.createElement("select")
      countSelect.className = "sandbox-input"
      ;[1, 2, 3].forEach((n) => {
        const o = document.createElement("option")
        o.value = String(n)
        o.textContent = String(n)
        countSelect.appendChild(o)
      })
      countSelect.value = String(substrateCount)
      countSelect.addEventListener("change", () => {
        const next = parseInt(countSelect.value, 10)
        if (next === substrateCount) return
        // Save current substrate data
        saveCurrentSubstrateData(frag)
        // Adjust substrate array
        while (substrates.length < next) substrates.push(createDefaultSubstrate())
        substrateCount = next
        if (activeSubstrateIndex >= next) activeSubstrateIndex = next - 1
        // Re-render
        renderSubstrateContent()
      })
      countRow.append(countLabel, countSelect)
      frag.appendChild(countRow)

      // Numbered circular tabs (only if count > 1)
      if (substrateCount > 1) {
        const tabs = document.createElement("div")
        tabs.className = "sandbox-substrate-tabs"
        for (let i = 0; i < substrateCount; i++) {
          const tab = document.createElement("button")
          tab.type = "button"
          tab.className = `sandbox-substrate-tab${i === activeSubstrateIndex ? " is-active" : ""}`
          tab.textContent = String(i + 1)
          tab.setAttribute("aria-label", `Substrate ${i + 1}`)
          tab.addEventListener("click", () => {
            if (i === activeSubstrateIndex) return
            // Save current substrate data before switching
            saveCurrentSubstrateData(frag)
            activeSubstrateIndex = i
            renderSubstrateContent()
          })
          tabs.appendChild(tab)
        }
        frag.appendChild(tabs)
      }

      const sep = document.createElement("div")
      sep.className = "sandbox-field-separator"
      frag.appendChild(sep)

      // Blend
      const blendField = document.createElement("div")
      blendField.className = "sandbox-field"
      const blendLabel = document.createElement("span")
      blendLabel.className = "sandbox-field-label"
      blendLabel.textContent = "Blend"
      const blendInput = document.createElement("input")
      blendInput.type = "text"
      blendInput.className = "sandbox-input"
      blendInput.placeholder = "e.g. OPP or CLEAR-WHITE-LDPE"
      blendInput.value = sub.blend
      blendInput.dataset.subField = "blend"
      blendField.append(blendLabel, blendInput)
      frag.appendChild(blendField)

      // Substrate Width
      const swField = document.createElement("div")
      swField.className = "sandbox-field"
      const swLabel = document.createElement("span")
      swLabel.className = "sandbox-field-label"
      swLabel.textContent = "Substrate Width"
      const swRow = document.createElement("div")
      swRow.className = "sandbox-field-row"
      const swInput = document.createElement("input")
      swInput.type = "number"
      swInput.className = "sandbox-input"
      swInput.placeholder = "mm"
      swInput.min = "0"
      swInput.step = "0.5"
      swInput.value = sub.substrateWidth
      swInput.dataset.subField = "substrateWidth"
      const swUnit = document.createElement("span")
      swUnit.className = "sandbox-field-unit"
      swUnit.textContent = "mm"
      swRow.append(swInput, swUnit)
      swField.append(swLabel, swRow)
      frag.appendChild(swField)

      // Gauge
      const gaugeField = document.createElement("div")
      gaugeField.className = "sandbox-field"
      const gaugeLabel = document.createElement("span")
      gaugeLabel.className = "sandbox-field-label"
      gaugeLabel.textContent = "Gauge"
      const gaugeRow = document.createElement("div")
      gaugeRow.className = "sandbox-field-row"
      const gaugeInput = document.createElement("input")
      gaugeInput.type = "number"
      gaugeInput.className = "sandbox-input"
      gaugeInput.placeholder = "Gauge"
      gaugeInput.min = "0"
      gaugeInput.step = "1"
      gaugeInput.value = sub.gauge
      gaugeInput.dataset.subField = "gauge"
      const gaugeUnitSelect = document.createElement("select")
      gaugeUnitSelect.className = "sandbox-input"
      gaugeUnitSelect.style.width = "70px"
      gaugeUnitSelect.style.flex = "0 0 70px"
      ;(["µm", "gsm"] as const).forEach((u) => {
        const o = document.createElement("option")
        o.value = u
        o.textContent = u
        gaugeUnitSelect.appendChild(o)
      })
      gaugeUnitSelect.value = sub.gaugeUnit
      gaugeUnitSelect.dataset.subField = "gaugeUnit"
      gaugeRow.append(gaugeInput, gaugeUnitSelect)
      gaugeField.append(gaugeLabel, gaugeRow)
      frag.appendChild(gaugeField)

      // Film Colour
      const colourField = document.createElement("div")
      colourField.className = "sandbox-field"
      const colourLabel = document.createElement("span")
      colourLabel.className = "sandbox-field-label"
      colourLabel.textContent = "Film Colour"
      const colourSelect = document.createElement("select")
      colourSelect.className = "sandbox-input"
      FILM_COLOURS.forEach((c) => {
        const o = document.createElement("option")
        o.value = c
        o.textContent = c
        colourSelect.appendChild(o)
      })
      colourSelect.value = sub.filmColour
      colourSelect.dataset.subField = "filmColour"
      colourSelect.addEventListener("change", () => {
        sub.filmColour = colourSelect.value
        if (index === 0) options.onSubstrateChange?.(colourSelect.value)
      })
      colourField.append(colourLabel, colourSelect)
      frag.appendChild(colourField)

      return frag
    }

    function saveCurrentSubstrateData(container: HTMLElement) {
      const sub = substrates[activeSubstrateIndex]
      if (!sub) return
      const inputs = container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-sub-field]")
      inputs.forEach((el) => {
        const field = el.dataset.subField as keyof SandboxSubstrate
        if (field && field in sub) {
          ;(sub as Record<string, string>)[field] = el.value
        }
      })
    }

    function renderSubstrateContent() {
      contentArea.innerHTML = ""
      contentArea.appendChild(buildSubstrateFields(activeSubstrateIndex))
    }

    function renderPlaceholderContent(label: string) {
      contentArea.innerHTML = ""
      const placeholder = document.createElement("div")
      placeholder.className = "sandbox-specs-placeholder"
      placeholder.textContent = `${label} — Coming Soon`
      contentArea.appendChild(placeholder)
    }

    function setSpecTab(tabId: string) {
      if (activeSpecTab === "substrate") {
        // Save substrate data before switching away
        saveCurrentSubstrateData(contentArea)
      }
      activeSpecTab = tabId
      specTabButtons.forEach((btn, id) => {
        btn.classList.toggle("is-active", id === tabId)
        btn.setAttribute("aria-selected", String(id === tabId))
      })

      if (tabId === "substrate") {
        renderSubstrateContent()
      } else {
        const tabConfig = SPECS_TABS.find((t) => t.id === tabId)
        renderPlaceholderContent(tabConfig?.label ?? tabId)
      }
    }

    SPECS_TABS.forEach((tab) => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className = `sandbox-specs-tab${tab.id === "substrate" ? " is-active" : ""}`
      btn.setAttribute("aria-label", tab.label)
      btn.setAttribute("aria-selected", String(tab.id === "substrate"))
      btn.appendChild(svgIcon(tab.icon, 16))
      btn.addEventListener("click", () => setSpecTab(tab.id))
      tabBar.appendChild(btn)
      specTabButtons.set(tab.id, btn)
    })

    // Initial render
    renderSubstrateContent()

    container.append(tabBar, contentArea)
    return container
  }

  // ╔══════════════════════════════════════════════╗
  // ║  6. PLACEHOLDER PANELS                      ║
  // ╚══════════════════════════════════════════════╝
  function buildPlaceholderPanel(label: string): HTMLElement {
    const placeholder = document.createElement("div")
    placeholder.className = "sandbox-placeholder"
    placeholder.textContent = `${label} — Coming Soon`
    return placeholder
  }

  // ╔══════════════════════════════════════════════╗
  // ║  7. PANEL MANAGEMENT                        ║
  // ╚══════════════════════════════════════════════╝
  const PANEL_TITLES: Record<string, string> = {
    setup: "Set-Up",
    specs: "Specs",
    layout: "Layout",
    applications: "Applications",
    processFlow: "Process Flow",
    layersQc: "Layers & QC",
  }

  function openPanel(panelId: string) {
    activeToolbarPanel = panelId
    panel.hidden = false
    panelTitle.textContent = PANEL_TITLES[panelId] || panelId

    // Update toolbar button states
    toolbarButtons.forEach((btn, id) => {
      btn.classList.toggle("is-active", id === panelId)
      btn.setAttribute("aria-pressed", String(id === panelId))
    })

    // Render panel content
    panelBody.innerHTML = ""

    if (panelId === "setup") {
      // For the specs panel, replace entire panel body with the layout
      panelBody.appendChild(buildSetupPanel())
    } else if (panelId === "specs") {
      // Specs has a special layout with left tabs
      // We need to hide the header for Specs because the tabs are inside
      panel.hidden = true
      panelBody.innerHTML = ""

      // Create a special panel for Specs
      const specsPanel = document.createElement("div")
      specsPanel.className = "sandbox-panel"
      specsPanel.style.pointerEvents = "auto"
      specsPanel.hidden = false

      const specsHeader = document.createElement("div")
      specsHeader.className = "sandbox-panel-header"
      const specsTitle = document.createElement("h3")
      specsTitle.className = "sandbox-panel-title"
      specsTitle.textContent = "Specs"
      const specsClose = document.createElement("button")
      specsClose.type = "button"
      specsClose.className = "sandbox-panel-close"
      specsClose.textContent = "×"
      specsClose.setAttribute("aria-label", "Close panel")
      specsClose.addEventListener("click", () => closePanel())
      specsHeader.append(specsTitle, specsClose)

      specsPanel.append(specsHeader, buildSpecsPanel())

      // Replace panel
      panel.hidden = true
      if (root.querySelector(".sandbox-panel-specs")) {
        root.querySelector(".sandbox-panel-specs")!.remove()
      }
      specsPanel.classList.add("sandbox-panel-specs")
      root.appendChild(specsPanel)
    } else {
      panelBody.appendChild(buildPlaceholderPanel(PANEL_TITLES[panelId] || panelId))
    }
  }

  function closePanel() {
    activeToolbarPanel = null
    panel.hidden = true

    // Remove specs panel if it exists
    const specsPanel = root.querySelector(".sandbox-panel-specs")
    if (specsPanel) specsPanel.remove()

    toolbarButtons.forEach((btn) => {
      btn.classList.remove("is-active")
      btn.setAttribute("aria-pressed", "false")
    })
  }

  function togglePanel(panelId: string) {
    if (activeToolbarPanel === panelId) {
      closePanel()
    } else {
      // Close any existing specs panel
      const specsPanel = root.querySelector(".sandbox-panel-specs")
      if (specsPanel) specsPanel.remove()
      panel.hidden = true

      openPanel(panelId)
    }
  }

  // ╔══════════════════════════════════════════════╗
  // ║  8. ASSEMBLY                                ║
  // ╚══════════════════════════════════════════════╝
  root.append(entry, toolbar, panel)
  options.host.appendChild(root)

  // ── Public API ──
  let entryFadeTimer: number | null = null

  function showEntry() {
    if (entryFadeTimer !== null) {
      clearTimeout(entryFadeTimer)
      entryFadeTimer = null
    }
    entry.hidden = false
    entry.style.display = ""
    // Remove the leaving state on the next frame so the welcome screen
    // (and its background graphics) fades back in cleanly.
    requestAnimationFrame(() => entry.classList.remove("is-leaving"))
    closePanel()
  }

  function hideEntry() {
    // Fade the welcome screen — including the decorative background graphics —
    // then remove it from flow so the illustrations never overlap the working
    // canvas / geometry once Set-Up begins.
    entry.classList.add("is-leaving")
    if (entryFadeTimer !== null) clearTimeout(entryFadeTimer)
    entryFadeTimer = window.setTimeout(() => {
      entry.hidden = true
      entry.style.display = "none"
      entryFadeTimer = null
    }, 260)
  }

  function destroy() {
    root.remove()
  }

  return {
    element: root,
    showEntry,
    hideEntry,
    destroy,
    getSetupState: () => ({ ...setupState }),
    getSubstrates: () => substrates.map((s) => ({ ...s })),
  }
}
