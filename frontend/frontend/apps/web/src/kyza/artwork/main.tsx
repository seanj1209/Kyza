import "../../brandBootstrap"
import { StrictMode, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import {
  FolderOpen, Layers3, ScanLine, Palette, ArrowRight, Sliders,
  BookOpen, Boxes, CheckCircle2, AlertTriangle, FileOutput,
  GripVertical, Search, X, ChevronRight, Eye
} from "lucide-react"
import { KyzaRouteShell } from "../shell/KyzaRouteShell"
import { KyzaThemeProvider } from "../shell/KyzaThemeProvider"
import "../styles/kyza.css"
import "./artworkPreview.css"

/* ------------------------------------------------------------------ */
/*  Scroll-reveal hook                                                */
/* ------------------------------------------------------------------ */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) { setVisible(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

function RevealSection({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal()
  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`aw-reveal ${visible ? "is-visible" : ""} ${className}`}
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero: animated cutter-to-artwork sequence                         */
/* ------------------------------------------------------------------ */
function HeroSection() {
  const [phase, setPhase] = useState(0)
  const phaseLabels = ["Cutter guide", "Artwork zones", "Brand assets", "Colour applied", "Finished layout"]

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) { setPhase(4); return }
    const timer = setInterval(() => setPhase(p => (p + 1) % 5), 2800)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="aw-hero" aria-labelledby="aw-hero-title">
      <div className="aw-hero-copy">
        <span className="aw-badge">Coming Soon</span>
        <div className="kyza-eyebrow">The next layer of Kyza</div>
        <h1 id="aw-hero-title">From cutter guide<br />to <span>brand expression.</span></h1>
        <p>One connected space for your artwork, packaging and production context. Artwork Studio is taking shape — here is a look at what is being built.</p>
        <a className="kyza-secondary-action" href="/cutter">Continue in Cutter Studio <ArrowRight size={16} aria-hidden="true" /></a>
      </div>

      <div className="aw-hero-visual" role="img" aria-label="Animated concept: cutter guide transforms into finished packaging artwork">
        {/* Phase indicator dots */}
        <div className="aw-phase-dots">
          {phaseLabels.map((label, i) => (
            <button
              key={label}
              className={`aw-phase-dot ${phase === i ? "is-active" : ""}`}
              onClick={() => setPhase(i)}
              aria-label={label}
              title={label}
              type="button"
            />
          ))}
        </div>
        <div className="aw-phase-label">{phaseLabels[phase]}</div>

        {/* Layered SVG animation */}
        <svg className="aw-hero-svg" viewBox="0 0 320 400" aria-hidden="true">
          {/* Grid background */}
          <defs>
            <pattern id="aw-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="320" height="400" fill="url(#aw-grid)" rx="16" />

          {/* Phase 0: Cutter guide outline */}
          <g className={`aw-layer ${phase >= 0 ? "is-on" : ""}`}>
            <rect x="40" y="30" width="240" height="340" rx="16" fill="none" stroke="var(--kyza-accent-text)" strokeWidth="2" strokeDasharray={phase === 0 ? "6 4" : "0"} />
            <line x1="40" y1="70" x2="280" y2="70" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
            <line x1="40" y1="330" x2="280" y2="330" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
            <line x1="65" y1="30" x2="65" y2="370" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <line x1="255" y1="30" x2="255" y2="370" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
          </g>

          {/* Phase 1: Artwork zones */}
          <g className={`aw-layer aw-zones ${phase >= 1 ? "is-on" : ""}`}>
            <rect x="75" y="82" width="170" height="66" rx="8" fill="var(--kyza-accent-text)" fillOpacity="0.08" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="3 2" />
            <text x="160" y="120" textAnchor="middle" fill="var(--kyza-accent-text)" fontSize="9" fontWeight="600">BRAND ZONE</text>
            <rect x="75" y="160" width="170" height="90" rx="8" fill="var(--kyza-cream)" fillOpacity="0.06" stroke="var(--kyza-cream)" strokeWidth="1" strokeDasharray="3 2" />
            <text x="160" y="210" textAnchor="middle" fill="var(--kyza-text-muted)" fontSize="9" fontWeight="600">PRODUCT IMAGERY</text>
            <rect x="75" y="262" width="170" height="56" rx="8" fill="var(--kyza-accent-text)" fillOpacity="0.05" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="3 2" />
            <text x="160" y="294" textAnchor="middle" fill="var(--kyza-accent-text)" fontSize="9" fontWeight="600">INFORMATION PANEL</text>
          </g>

          {/* Phase 2: Brand assets placed */}
          <g className={`aw-layer aw-brand ${phase >= 2 ? "is-on" : ""}`}>
            <rect x="95" y="90" width="48" height="48" rx="10" fill="var(--kyza-panel-raised)" stroke="var(--kyza-border-strong)" strokeWidth="1" />
            <text x="119" y="119" textAnchor="middle" fill="var(--kyza-accent-text)" fontSize="20" fontWeight="800">k.</text>
            <rect x="155" y="94" width="80" height="14" rx="3" fill="var(--kyza-text)" fillOpacity="0.7" />
            <rect x="155" y="114" width="55" height="10" rx="3" fill="var(--kyza-text-muted)" fillOpacity="0.4" />
            <circle cx="120" cy="205" r="30" fill="var(--kyza-panel-raised)" stroke="var(--kyza-border-strong)" strokeWidth="1" />
            <circle cx="120" cy="205" r="18" fill="none" stroke="var(--kyza-cream)" strokeWidth="8" opacity="0.6" />
          </g>

          {/* Phase 3: Colour applied */}
          <g className={`aw-layer aw-colour ${phase >= 3 ? "is-on" : ""}`}>
            <rect x="183" y="170" width="52" height="75" rx="8" fill="#a92930" opacity="0.85" />
            <rect x="183" y="170" width="52" height="75" rx="8" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
            <text x="209" y="215" textAnchor="middle" fill="#f5e8d5" fontSize="8" fontWeight="600">FIELD</text>

            {/* Colour swatches */}
            <rect x="78" y="270" width="22" height="18" rx="4" fill="#9e1316" />
            <rect x="104" y="270" width="22" height="18" rx="4" fill="#f3c98f" />
            <rect x="130" y="270" width="22" height="18" rx="4" fill="#eee0cd" />
            <rect x="156" y="270" width="22" height="18" rx="4" fill="#36332e" />
            <rect x="182" y="270" width="22" height="18" rx="4" fill="#dbc8b6" />
          </g>

          {/* Phase 4: Finished */}
          <g className={`aw-layer aw-finish ${phase >= 4 ? "is-on" : ""}`}>
            <rect x="78" y="296" width="164" height="24" rx="5" fill="var(--kyza-panel-raised)" stroke="var(--kyza-border)" strokeWidth="1" />
            <text x="160" y="312" textAnchor="middle" fill="var(--kyza-text-muted)" fontSize="8" fontWeight="600" letterSpacing="0.06em">ARTWORK READY FOR REVIEW</text>
            <circle cx="252" y="308" r="9" fill="var(--kyza-success)" fillOpacity="0.2" stroke="var(--kyza-success)" strokeWidth="1" />
            <path d="M248 308l3 3 5-5" fill="none" stroke="var(--kyza-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>

        <div className="aw-hero-caption"><Layers3 size={14} aria-hidden="true" /> Artwork + cutter + production context</div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature A: Brand Asset Library                                    */
/* ------------------------------------------------------------------ */
function AssetLibraryDemo() {
  const [placed, setPlaced] = useState<number[]>([])
  const assets = [
    { id: 0, label: "k.", type: "Logo" },
    { id: 1, label: "✳", type: "Graphic" },
    { id: 2, label: "Aa", type: "Type" },
    { id: 3, label: "FIELD", type: "Product" },
  ]

  return (
    <div className="aw-demo aw-asset-demo">
      <div className="aw-demo-sidebar">
        <div className="aw-demo-sidebar-title"><FolderOpen size={14} /> Asset Library</div>
        {assets.map(a => (
          <button
            key={a.id}
            className={`aw-asset-item ${placed.includes(a.id) ? "is-placed" : ""}`}
            onClick={() => setPlaced(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
            type="button"
          >
            <span className="aw-asset-thumb">{a.label}</span>
            <span className="aw-asset-meta">
              <strong>{a.type}</strong>
              <small>{placed.includes(a.id) ? "Placed" : "Click to place"}</small>
            </span>
            <GripVertical size={14} className="aw-grip" />
          </button>
        ))}
      </div>
      <div className="aw-demo-canvas">
        <div className="aw-canvas-label">Packaging layout</div>
        <svg viewBox="0 0 200 260" className="aw-canvas-guide" aria-hidden="true">
          <rect x="10" y="10" width="180" height="240" rx="12" fill="none" stroke="var(--kyza-border-strong)" strokeWidth="1" strokeDasharray="4 3" />
          <line x1="10" y1="45" x2="190" y2="45" stroke="var(--kyza-border)" strokeWidth="1" strokeDasharray="3 2" />
          <line x1="10" y1="220" x2="190" y2="220" stroke="var(--kyza-border)" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
        {placed.includes(0) && <div className="aw-placed-asset" style={{ top: "16%", left: "12%" }}><span>k.</span></div>}
        {placed.includes(1) && <div className="aw-placed-asset" style={{ top: "38%", left: "55%" }}><span>✳</span></div>}
        {placed.includes(2) && <div className="aw-placed-asset aw-placed-type" style={{ top: "58%", left: "15%" }}><span>Brand Name</span></div>}
        {placed.includes(3) && <div className="aw-placed-asset aw-placed-product" style={{ top: "25%", left: "30%" }}><span>FIELD / 01</span></div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature B: Cutter Integration                                     */
/* ------------------------------------------------------------------ */
function CutterIntegrationDemo() {
  const [showOverlay, setShowOverlay] = useState(true)
  return (
    <div className="aw-demo aw-cutter-demo">
      <div className="aw-demo-toolbar">
        <button
          className={`aw-toggle-btn ${showOverlay ? "is-active" : ""}`}
          onClick={() => setShowOverlay(!showOverlay)}
          type="button"
        >
          <Eye size={14} /> {showOverlay ? "Hide" : "Show"} guides
        </button>
      </div>
      <div className="aw-cutter-canvas">
        <svg viewBox="0 0 300 380" aria-hidden="true">
          {/* Packaging shape */}
          <rect x="30" y="20" width="240" height="340" rx="14" fill="var(--kyza-panel-raised)" stroke="var(--kyza-border-strong)" strokeWidth="1.5" />
          {/* Artwork fill */}
          <rect x="44" y="60" width="212" height="240" rx="6" fill="#a92930" fillOpacity="0.12" />
          <text x="150" y="185" textAnchor="middle" fill="var(--kyza-text-muted)" fontSize="11" fontWeight="600">Artwork area</text>

          {/* Guide overlays */}
          {showOverlay && <g className="aw-guides-overlay">
            {/* Seal areas */}
            <rect x="30" y="20" width="240" height="38" rx="14" fill="var(--kyza-warning)" fillOpacity="0.12" stroke="var(--kyza-warning)" strokeWidth="1" strokeDasharray="4 2" />
            <text x="150" y="44" textAnchor="middle" fill="var(--kyza-warning)" fontSize="8" fontWeight="700">SEAL AREA</text>
            <rect x="30" y="322" width="240" height="38" rx="14" fill="var(--kyza-warning)" fillOpacity="0.12" stroke="var(--kyza-warning)" strokeWidth="1" strokeDasharray="4 2" />
            <text x="150" y="346" textAnchor="middle" fill="var(--kyza-warning)" fontSize="8" fontWeight="700">SEAL AREA</text>

            {/* Safe zone */}
            <rect x="52" y="66" width="196" height="228" rx="6" fill="none" stroke="var(--kyza-success)" strokeWidth="1" strokeDasharray="5 3" />
            <text x="150" y="80" textAnchor="middle" fill="var(--kyza-success)" fontSize="7" fontWeight="600" letterSpacing="0.05em">SAFE ZONE</text>

            {/* Fold line */}
            <line x1="150" y1="20" x2="150" y2="360" stroke="var(--kyza-accent-text)" strokeWidth="1" strokeDasharray="8 4" opacity="0.6" />
            <text x="154" y="355" fill="var(--kyza-accent-text)" fontSize="7" fontWeight="600">FOLD</text>

            {/* Bleed */}
            <rect x="24" y="14" width="252" height="352" rx="17" fill="none" stroke="var(--kyza-danger)" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.5" />
          </g>}
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature C: Design Weighting Sliders                               */
/* ------------------------------------------------------------------ */
function DesignWeightingDemo() {
  const [weights, setWeights] = useState({
    brand: 70,
    creative: 40,
    precision: 85,
    imagery: 55,
    typography: 60,
  })
  const updateWeight = (key: keyof typeof weights, value: number) => {
    setWeights(w => ({ ...w, [key]: value }))
  }

  const avgCreative = (weights.creative + (100 - weights.precision)) / 2
  const brandWeight = weights.brand / 100
  const imgWeight = weights.imagery / 100

  return (
    <div className="aw-demo aw-weight-demo">
      <div className="aw-weight-controls">
        <div className="aw-demo-sidebar-title"><Sliders size={14} /> Design weighting</div>
        {(Object.entries(weights) as [keyof typeof weights, number][]).map(([key, val]) => (
          <label className="aw-weight-slider" key={key}>
            <span className="aw-weight-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={val}
              onChange={e => updateWeight(key, Number(e.target.value))}
            />
            <span className="aw-weight-value">{val}%</span>
          </label>
        ))}
        <p className="aw-weight-note">Concept only — controls do not generate artwork</p>
      </div>
      <div className="aw-weight-preview">
        <div className="aw-weight-card">
          <div className="aw-wcard-brand" style={{ opacity: 0.4 + brandWeight * 0.6 }}>
            <span className="aw-wcard-logo">k.</span>
            <span style={{ fontSize: `${10 + weights.typography * 0.08}px`, fontWeight: 600 }}>Brand Name</span>
          </div>
          <div className="aw-wcard-imagery" style={{ height: `${40 + imgWeight * 60}px`, opacity: 0.3 + imgWeight * 0.7 }}>
            <div className="aw-wcard-circle" />
            <span>Product imagery</span>
          </div>
          <div className="aw-wcard-creative" style={{ opacity: 0.3 + avgCreative / 100 * 0.7 }}>
            <div className="aw-wcard-stripe" style={{ width: `${30 + avgCreative * 0.7}%` }} />
            <div className="aw-wcard-stripe" style={{ width: `${50 + avgCreative * 0.5}%` }} />
          </div>
          <div className="aw-wcard-precision">
            <div className="aw-wcard-grid" style={{ opacity: weights.precision / 100 * 0.6 }}>
              {Array.from({ length: 6 }).map((_, i) => <i key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature D: Colour Palette & CMYK                                  */
/* ------------------------------------------------------------------ */
function ColourPaletteDemo() {
  const palettes = [
    { name: "Spartan Red", hex: "#9E1316", c: 16, m: 100, y: 95, k: 8 },
    { name: "Dusky Cream", hex: "#DBC8B6", c: 10, m: 16, y: 24, k: 0 },
    { name: "Dark Charcoal", hex: "#1D1D1D", c: 72, m: 66, y: 63, k: 76 },
    { name: "Warm Gold", hex: "#F3C98F", c: 3, m: 20, y: 44, k: 0 },
    { name: "Soft Blush", hex: "#EEE0CD", c: 5, m: 10, y: 18, k: 0 },
  ]
  const [selected, setSelected] = useState(0)
  const sel = palettes[selected]

  return (
    <div className="aw-demo aw-colour-demo">
      <div className="aw-colour-swatches">
        <div className="aw-demo-sidebar-title"><Palette size={14} /> Brand colours</div>
        {palettes.map((p, i) => (
          <button
            key={p.name}
            className={`aw-swatch-btn ${selected === i ? "is-active" : ""}`}
            onClick={() => setSelected(i)}
            type="button"
          >
            <span className="aw-swatch" style={{ background: p.hex }} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="aw-colour-detail">
        <div className="aw-colour-preview" style={{ background: sel.hex }} />
        <div className="aw-colour-info">
          <strong>{sel.name}</strong>
          <span className="aw-colour-hex">{sel.hex}</span>
          <div className="aw-cmyk-grid">
            <div className="aw-cmyk-channel"><span>C</span><div className="aw-cmyk-bar"><div style={{ width: `${sel.c}%`, background: "#00aeef" }} /></div><span>{sel.c}</span></div>
            <div className="aw-cmyk-channel"><span>M</span><div className="aw-cmyk-bar"><div style={{ width: `${sel.m}%`, background: "#ec008c" }} /></div><span>{sel.m}</span></div>
            <div className="aw-cmyk-channel"><span>Y</span><div className="aw-cmyk-bar"><div style={{ width: `${sel.y}%`, background: "#fff200" }} /></div><span>{sel.y}</span></div>
            <div className="aw-cmyk-channel"><span>K</span><div className="aw-cmyk-bar"><div style={{ width: `${sel.k}%`, background: "#231f20" }} /></div><span>{sel.k}</span></div>
          </div>
          <small className="aw-colour-note">CMYK values are illustrative representations</small>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature E: Pantone Reference Library                              */
/* ------------------------------------------------------------------ */
function PantoneLibraryDemo() {
  const references = [
    { ref: "187 C", hex: "#A6192E", name: "Illustrative Red" },
    { ref: "7527 C", hex: "#D6C6AA", name: "Illustrative Cream" },
    { ref: "Black 7 C", hex: "#3D3935", name: "Illustrative Charcoal" },
    { ref: "7407 C", hex: "#CBA052", name: "Illustrative Gold" },
    { ref: "2905 C", hex: "#8DC8E8", name: "Illustrative Sky" },
    { ref: "7489 C", hex: "#6BAB62", name: "Illustrative Green" },
    { ref: "2587 C", hex: "#8246AF", name: "Illustrative Violet" },
    { ref: "151 C", hex: "#FF8200", name: "Illustrative Orange" },
  ]
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<number | null>(null)
  const filtered = references.filter(r =>
    r.ref.toLowerCase().includes(query.toLowerCase()) ||
    r.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="aw-demo aw-pantone-demo">
      <div className="aw-pantone-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search illustrative references..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && <button type="button" onClick={() => setQuery("")} className="aw-clear-btn"><X size={12} /></button>}
      </div>
      <div className="aw-pantone-grid">
        {filtered.map((r, i) => (
          <button
            key={r.ref}
            className={`aw-pantone-chip ${selected === i ? "is-active" : ""}`}
            onClick={() => setSelected(selected === i ? null : i)}
            type="button"
          >
            <span className="aw-pantone-swatch" style={{ background: r.hex }} />
            <span className="aw-pantone-ref">{r.ref}</span>
            <span className="aw-pantone-name">{r.name}</span>
          </button>
        ))}
      </div>
      {selected !== null && filtered[selected] && (
        <div className="aw-pantone-detail">
          <span className="aw-pantone-big-swatch" style={{ background: filtered[selected].hex }} />
          <div>
            <strong>{filtered[selected].ref}</strong>
            <span>{filtered[selected].name}</span>
            <small>Illustrative reference — not official Pantone data</small>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature F: Product Range Creation                                 */
/* ------------------------------------------------------------------ */
function ProductRangeDemo() {
  const variants = [
    { name: "Strawberry", accent: "#C92038", bg: "#fff0f0", circle: "#f7a6b0", label: "BERRY / 01" },
    { name: "Mango", accent: "#E09C1A", bg: "#fff8eb", circle: "#f5d675", label: "TROPI / 02" },
    { name: "Blueberry", accent: "#3B5FAD", bg: "#eef2ff", circle: "#93b4e8", label: "BERRY / 03" },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) return
    const timer = setInterval(() => setActive(a => (a + 1) % variants.length), 3200)
    return () => clearInterval(timer)
  }, [variants.length])

  return (
    <div className="aw-demo aw-range-demo">
      <div className="aw-range-tabs">
        {variants.map((v, i) => (
          <button
            key={v.name}
            className={`aw-range-tab ${active === i ? "is-active" : ""}`}
            style={{ "--tab-accent": v.accent } as React.CSSProperties}
            onClick={() => setActive(i)}
            type="button"
          >
            <span className="aw-range-tab-dot" style={{ background: v.accent }} />
            {v.name}
          </button>
        ))}
      </div>
      <div className="aw-range-preview">
        {variants.map((v, i) => (
          <div
            key={v.name}
            className={`aw-range-card ${active === i ? "is-active" : ""}`}
            style={{ "--range-accent": v.accent, "--range-bg": v.bg, "--range-circle": v.circle } as React.CSSProperties}
          >
            <span className="aw-range-label">{v.label}</span>
            <div className="aw-range-circle" />
            <strong>Made<br />to bloom.</strong>
            <small>{v.name} smoothie · Brand concept</small>
          </div>
        ))}
      </div>
      <p className="aw-range-note">Master design with consistent branding, variant colours and product-specific elements</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature G: Preflight Validation                                   */
/* ------------------------------------------------------------------ */
function PreflightDemo() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Array<{ status: "pass" | "warn" | "fail"; label: string }>>([])
  const checks = [
    { status: "pass" as const, label: "Bleed area meets 3mm minimum" },
    { status: "pass" as const, label: "All fonts outlined or embedded" },
    { status: "warn" as const, label: "Image resolution below 300dpi in zone 2" },
    { status: "pass" as const, label: "Colour profile: FOGRA39 CMYK" },
    { status: "fail" as const, label: "Barcode placement overlaps seal area" },
    { status: "pass" as const, label: "Safe zone clearance verified" },
  ]

  const runCheck = useCallback(() => {
    setRunning(true)
    setResults([])
    let i = 0
    const timer = setInterval(() => {
      if (i < checks.length) {
        setResults(r => [...r, checks[i]])
        i++
      } else {
        clearInterval(timer)
        setRunning(false)
      }
    }, 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="aw-demo aw-preflight-demo">
      <div className="aw-preflight-header">
        <div className="aw-demo-sidebar-title"><ScanLine size={14} /> Preflight validation</div>
        <button className="aw-run-btn" onClick={runCheck} disabled={running} type="button">
          {running ? "Checking..." : "Run preflight"}
        </button>
      </div>
      <div className="aw-preflight-results">
        {results.length === 0 && !running && (
          <div className="aw-preflight-empty">Click "Run preflight" to see an illustrative validation sequence</div>
        )}
        {results.map((r, i) => (
          <div key={i} className={`aw-check-row aw-check-${r.status}`}>
            {r.status === "pass" && <CheckCircle2 size={16} />}
            {r.status === "warn" && <AlertTriangle size={16} />}
            {r.status === "fail" && <X size={16} />}
            <span>{r.label}</span>
            <span className="aw-check-status">{r.status.toUpperCase()}</span>
          </div>
        ))}
        {running && <div className="aw-check-scanning"><div className="aw-scan-bar" /></div>}
      </div>
      <small className="aw-preflight-note">Illustrative validation — preflight checks are planned, not yet available</small>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature H: Artwork Generation & Export                            */
/* ------------------------------------------------------------------ */
function ArtworkExportDemo() {
  const [step, setStep] = useState(0)
  const steps = ["Layout ready", "Flatten layers", "Apply separations", "Generate PDF"]

  return (
    <div className="aw-demo aw-export-demo">
      <div className="aw-export-visual">
        <svg viewBox="0 0 200 260" aria-hidden="true" className="aw-export-svg">
          <rect x="10" y="10" width="180" height="240" rx="10" fill="var(--kyza-panel-raised)" stroke="var(--kyza-border-strong)" strokeWidth="1" />
          {/* Simplified artwork preview */}
          <rect x="24" y="24" width="152" height="50" rx="6" fill="var(--kyza-accent-text)" fillOpacity="0.12" />
          <text x="100" y="54" textAnchor="middle" fill="var(--kyza-accent-text)" fontSize="9" fontWeight="600">BRAND HEADER</text>
          <rect x="24" y="82" width="152" height="100" rx="6" fill="var(--kyza-cream)" fillOpacity="0.08" />
          <circle cx="100" cy="132" r="25" fill="var(--kyza-cream)" fillOpacity="0.15" stroke="var(--kyza-cream)" strokeWidth="1" />
          <rect x="24" y="190" width="152" height="34" rx="6" fill="var(--kyza-panel-soft)" />
          <rect x="34" y="198" width="60" height="6" rx="2" fill="var(--kyza-text-muted)" fillOpacity="0.4" />
          <rect x="34" y="208" width="90" height="4" rx="2" fill="var(--kyza-text-muted)" fillOpacity="0.25" />

          {/* Flatten overlay */}
          {step >= 1 && <rect x="10" y="10" width="180" height="240" rx="10" fill="var(--kyza-accent-text)" fillOpacity="0.04" />}
          {step >= 2 && <>
            <line x1="24" y1="75" x2="176" y2="75" stroke="var(--kyza-accent-text)" strokeWidth="0.5" strokeDasharray="3 2" />
            <line x1="24" y1="185" x2="176" y2="185" stroke="var(--kyza-accent-text)" strokeWidth="0.5" strokeDasharray="3 2" />
          </>}
          {step >= 3 && <>
            <rect x="7" y="7" width="186" height="246" rx="12" fill="none" stroke="var(--kyza-success)" strokeWidth="1.5" />
            <text x="100" y="252" textAnchor="middle" fill="var(--kyza-success)" fontSize="7" fontWeight="600">PDF EXPORT READY</text>
          </>}
        </svg>
      </div>
      <div className="aw-export-steps">
        <div className="aw-demo-sidebar-title"><FileOutput size={14} /> Export pipeline</div>
        {steps.map((s, i) => (
          <button
            key={s}
            className={`aw-export-step ${step === i ? "is-active" : ""} ${step > i ? "is-done" : ""}`}
            onClick={() => setStep(i)}
            type="button"
          >
            <span className="aw-step-num">{step > i ? "✓" : `0${i + 1}`}</span>
            <span>{s}</span>
            <ChevronRight size={14} />
          </button>
        ))}
        <small className="aw-export-note">Planned export workflow — not yet available</small>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section wrapper for each feature                                  */
/* ------------------------------------------------------------------ */
function FeatureSection({
  icon: Icon,
  number,
  title,
  description,
  children,
  kind,
}: {
  icon: typeof FolderOpen
  number: string
  title: string
  description: string
  children: ReactNode
  kind: string
}) {
  return (
    <RevealSection className={`aw-feature-section aw-feature-${kind}`}>
      <div className="aw-feature-header">
        <div className="aw-feature-icon"><Icon size={22} /></div>
        <div className="aw-feature-info">
          <span className="aw-feature-num">{number} / Planned</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </RevealSection>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */
function ArtworkPreview() {
  return (
    <div className="aw-page">
      <HeroSection />

      {/* Introduction */}
      <RevealSection className="aw-intro">
        <div className="kyza-eyebrow">What is being built</div>
        <h2>A connected workspace for packaging artwork.</h2>
        <p>Artwork Studio will bring together cutter geometry, brand assets, colour management, intelligent placement and production-ready output — all in one environment built for packaging professionals.</p>
      </RevealSection>

      {/* Feature showcase */}
      <div className="aw-showcase">
        <div className="kyza-section-heading">
          <div>
            <div className="kyza-eyebrow">A look ahead</div>
            <h2>Built around the whole picture.</h2>
          </div>
        </div>

        <FeatureSection
          icon={FolderOpen}
          number="01"
          title="Brand asset library"
          description="Import, organise and reuse artwork assets. Keep logos, graphics and brand references together — select and place them onto your packaging layout."
          kind="assets"
        >
          <AssetLibraryDemo />
        </FeatureSection>

        <FeatureSection
          icon={Layers3}
          number="02"
          title="Artwork meets engineering"
          description="Place artwork against your cutter guide with clear views of seal areas, folds, bleed and safe zones. Toggle guides to see how design and structure interact."
          kind="cutter"
        >
          <CutterIntegrationDemo />
        </FeatureSection>

        <FeatureSection
          icon={Sliders}
          number="03"
          title="AI design weighting"
          description="Influence how artwork generation balances brand prominence, creative freedom, technical precision, imagery and typography. You set the direction."
          kind="weights"
        >
          <DesignWeightingDemo />
        </FeatureSection>

        <FeatureSection
          icon={Palette}
          number="04"
          title="Colour palettes & CMYK builds"
          description="Select, create and save brand colour palettes. See illustrative CMYK builds for each colour, keeping brand colours and technical print builds distinct."
          kind="colour"
        >
          <ColourPaletteDemo />
        </FeatureSection>

        <FeatureSection
          icon={BookOpen}
          number="05"
          title="Pantone reference library"
          description="Browse a searchable collection of illustrative colour references. Select colours, compare against process builds and identify references for production."
          kind="pantone"
        >
          <PantoneLibraryDemo />
        </FeatureSection>

        <FeatureSection
          icon={Boxes}
          number="06"
          title="Product range creation"
          description="Develop multiple packaging variants from one master design. Maintain consistent branding while changing product colours, imagery and descriptions."
          kind="range"
        >
          <ProductRangeDemo />
        </FeatureSection>

        <FeatureSection
          icon={ScanLine}
          number="07"
          title="Intelligent preflight"
          description="Visual validation for artwork placement, print constraints, missing assets and potential production issues — illustrated here as a concept."
          kind="preflight"
        >
          <PreflightDemo />
        </FeatureSection>

        <FeatureSection
          icon={FileOutput}
          number="08"
          title="Flat 2D artwork & export"
          description="Preview future artwork proofing and export capabilities. Generate flat 2D packaging artwork PDFs with production information."
          kind="export"
        >
          <ArtworkExportDemo />
        </FeatureSection>
      </div>

      {/* Closing CTA */}
      <RevealSection className="aw-closing">
        <div className="aw-closing-content">
          <div className="kyza-eyebrow">Meanwhile</div>
          <h2>Start with what is ready.</h2>
          <p>Cutter Studio is live today — create packaging cutters, validate geometry and export production-ready files.</p>
          <a className="kyza-primary-action" href="/cutter">Open Cutter Studio <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </RevealSection>

      <p className="aw-disclaimer">This is a preview of planned features. Artwork import, automation, preflight and proof approval are not available here yet. Interactive demonstrations are illustrative concepts.</p>
    </div>
  )
}

const root = document.getElementById("artwork-app")
if (!root) throw new Error("Artwork Studio root was not found")
createRoot(root).render(
  <StrictMode>
    <KyzaThemeProvider>
      <KyzaRouteShell routeLabel="Artwork Studio" skipLabel="Skip to Artwork Studio">
        <ArtworkPreview />
      </KyzaRouteShell>
    </KyzaThemeProvider>
  </StrictMode>
)
