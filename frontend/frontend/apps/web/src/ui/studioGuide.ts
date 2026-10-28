import "./studioGuide.css"

// Amends v11: the guide is the Cutter Studio tour — how to start, then what the studio offers.
// Presentation only; every capability named here exists in the current studio.
const guideSteps = [
  { scene: "start", chapter: "Get started", title: "Choose how to start", text: "Pick a pack type, open Sandbox Mode for trials and bespoke work, import a saved cutter, or tell Flow what you need." },
  { scene: "precision", chapter: "Inside the studio", title: "Design with precision", text: "Geometry is held in exact millimetres. Snap the Measure tool to edges for a live readout; its reference grid refines to 600 ppi as you zoom." },
  { scene: "elements", chapter: "Inside the studio", title: "Add and position elements", text: "Place windows, hanger slots, perforations and attribute boxes. Centre and edge snapping and safe-zone fit keep them aligned." },
  { scene: "customise", chapter: "Inside the studio", title: "Customise your cutter", text: "Tune seals, folds, perforations and colours in Customise, then validate and export when it’s ready for production." }
] as const
const DURATION = 5200
const MANUAL_RESUME_DELAY = 10000

export function createStudioGuide() {
  const element = document.createElement("section")
  element.className = "studio-guide"
  element.setAttribute("aria-labelledby", "klyro-guide-guide-title")
  element.setAttribute("aria-roledescription", "carousel")
  element.innerHTML = `
  <div class="progress-fill" aria-hidden="true"></div>

  <header class="head">
    <span class="chip" id="klyro-guide-guide-title">Studio tour</span>
  </header>

  <div class="stage" aria-hidden="true">
    <!-- Scene 1: the four ways into Cutter Studio -->
    <div class="scene" data-scene="start" aria-hidden="true">
      <svg viewBox="0 0 240 160">
        <circle class="redfill origin" cx="24" cy="80" r="7"/>
        <path class="ink dr" pathLength="1" d="M31 80 C82 80 96 26 142 26"/>
        <path class="ink dr" pathLength="1" d="M31 80 C82 80 96 62 142 62" style="--d:.12s"/>
        <path class="ink dr" pathLength="1" d="M31 80 C82 80 96 98 142 98" style="--d:.24s"/>
        <path class="ink dr" pathLength="1" d="M31 80 C82 80 96 134 142 134" style="--d:.36s"/>
        <g class="route fade" style="--d:.5s" transform="translate(142 12)">
          <rect class="tile" width="90" height="28" rx="9"/><rect class="route-ring" width="90" height="28" rx="9" style="--r:1.5s"/>
          <path class="accent" d="M11 8 H21 L23 21 Q16 24 9 21 Z" style="stroke-width:1.6"/>
          <text class="scene-label" x="32" y="14.5">Pack type</text>
        </g>
        <g class="route fade" style="--d:.66s" transform="translate(142 48)">
          <rect class="tile" width="90" height="28" rx="9"/><rect class="route-ring" width="90" height="28" rx="9" style="--r:2.2s"/>
          <rect class="accent sandbox-dash" x="8" y="7" width="16" height="14" rx="2" style="stroke-width:1.6"/>
          <text class="scene-label" x="32" y="14.5">Sandbox</text>
        </g>
        <g class="route fade" style="--d:.82s" transform="translate(142 84)">
          <rect class="tile" width="90" height="28" rx="9"/><rect class="route-ring" width="90" height="28" rx="9" style="--r:2.9s"/>
          <path class="accent" d="M16 6 V17 M11.5 13 L16 17.5 L20.5 13 M9 18 V22 H23 V18" style="stroke-width:1.6"/>
          <text class="scene-label" x="32" y="14.5">Import</text>
        </g>
        <g class="route fade" style="--d:.98s" transform="translate(142 120)">
          <rect class="tile" width="90" height="28" rx="9"/><rect class="route-ring" width="90" height="28" rx="9" style="--r:3.6s"/>
          <path class="accent" d="M16 5 L18.2 11.8 L25 14 L18.2 16.2 L16 23 L13.8 16.2 L7 14 L13.8 11.8 Z" style="stroke-width:1.5"/>
          <text class="scene-label" x="32" y="14.5">Ask Flow</text>
        </g>
      </svg>
    </div>

    <!-- Scene 2: exact measurement and the 600 ppi reference grid -->
    <div class="scene" data-scene="precision" aria-hidden="true">
      <svg viewBox="0 0 240 160">
        <defs>
          <pattern id="klyro-guide-ppi-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0 H0 V5" fill="none" stroke="var(--ink-muted)" stroke-width=".5" opacity=".55"/>
          </pattern>
          <clipPath id="klyro-guide-lens"><circle cx="194" cy="60" r="29"/></clipPath>
        </defs>
        <rect class="ink dr" pathLength="1" x="26" y="34" width="124" height="82" rx="6"/>
        <path class="ink fade" d="M26 128 V138 M150 128 V138" style="--d:.5s;stroke-width:1.4"/>
        <path class="accent dr" pathLength="1" d="M26 133 H150" style="--d:.7s;stroke-width:2"/>
        <circle class="snapdot fade" cx="26" cy="133" r="3.6" style="--d:.6s"/>
        <circle class="snapdot fade" cx="150" cy="133" r="3.6" style="--d:1.4s"/>
        <g class="fade" style="--d:1.5s">
          <rect class="tile" x="55" y="64" width="66" height="22" rx="11"/>
          <text class="scene-label readout" x="88" y="75.5">124.00 mm</text>
        </g>
        <path class="ink fade" d="M150 34 L170 44" style="--d:1.8s;stroke-width:1.2;stroke-dasharray:3 3"/>
        <g class="lens fade" style="--d:1.9s">
          <circle cx="194" cy="60" r="29" class="tile"/>
          <rect x="165" y="31" width="58" height="58" fill="url(#klyro-guide-ppi-grid)" clip-path="url(#klyro-guide-lens)"/>
          <path class="accent" d="M174 60 H214" clip-path="url(#klyro-guide-lens)" style="stroke-width:2"/>
          <circle cx="194" cy="60" r="29" class="ink" style="stroke-width:1.6"/>
        </g>
        <text class="scene-label ppi fade" x="194" y="104" style="--d:2.1s">600 ppi grid</text>
      </svg>
    </div>

    <!-- Scene 3: adding elements with snapping -->
    <div class="scene" data-scene="elements" aria-hidden="true">
      <svg viewBox="0 0 240 160">
        <rect class="ink" x="36" y="26" width="168" height="108" rx="8"/>
        <rect class="safe-dash" x="52" y="40" width="136" height="80" rx="4"/>
        <rect class="soft fade" x="62" y="50" width="30" height="18" rx="3" style="--d:.2s"/>
        <rect class="ink fade" x="62" y="50" width="30" height="18" rx="3" style="--d:.2s;stroke-width:1.5"/>
        <rect class="ink fade" x="108" y="31" width="24" height="5" rx="2.5" style="--d:.35s;stroke-width:1.5"/>
        <path class="perf-line fade" d="M52 108 H188" style="--d:.5s"/>
        <path class="snap-guide fade" d="M120 40 V120 M52 80 H188" style="--d:1.5s"/>
        <rect class="redfill elem-snap" x="108" y="68" width="24" height="24" rx="5"/>
        <g class="fade" style="--d:.05s">
          <circle class="redfill" cx="218" cy="16" r="10"/>
          <path class="accent" d="M218 11 V21 M213 16 H223" style="stroke-width:2"/>
        </g>
      </svg>
    </div>

    <!-- Scene 4: customising seals, folds and perforations -->
    <div class="scene" data-scene="customise" aria-hidden="true">
      <svg viewBox="0 0 240 160">
        <rect class="ink" x="30" y="22" width="120" height="100" rx="6"/>
        <rect class="seal-band" x="30" y="22" width="14" height="100" rx="4"/>
        <rect class="seal-band right" x="136" y="22" width="14" height="100" rx="4"/>
        <path class="accent dr" pathLength="1" d="M72 22 V122" style="--d:.4s;stroke-width:1.6;stroke-dasharray:4 4"/>
        <path class="accent dr" pathLength="1" d="M108 22 V122" style="--d:.55s;stroke-width:1.6;stroke-dasharray:4 4"/>
        <path class="perf-line fade" d="M44 52 H136" style="--d:.9s"/>
        <g class="fade" style="--d:.2s">
          <rect class="tile" x="164" y="28" width="62" height="88" rx="10"/>
          <path class="ink" d="M174 50 H216 M174 72 H216 M174 94 H216" style="stroke-width:1.6"/>
          <circle class="knob" cx="186" cy="50" r="4.5" style="--d:.7s;--x:18px"/>
          <circle class="knob" cx="204" cy="72" r="4.5" style="--d:1s;--x:-14px"/>
          <circle class="knob" cx="182" cy="94" r="4.5" style="--d:1.3s;--x:22px"/>
        </g>
        <g class="fade" style="--d:2s">
          <rect class="cta-btn" x="36" y="134" width="108" height="20" rx="10" fill="var(--red)"/>
          <text class="cta-text" x="90" y="144.5">Validate · Export</text>
        </g>
      </svg>
    </div>
  </div>

  <section class="copy" id="klyro-guide-copy" aria-live="off">
    <p class="eyebrow" id="klyro-guide-eyebrow"></p>
    <h4 id="klyro-guide-title"></h4>
    <p id="klyro-guide-brief"></p>
  </section>

  <nav class="controls" aria-label="Studio tour slides">
    <button class="btn" id="klyro-guide-prev" type="button" aria-label="Previous tour slide">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3 L5 8 L10 13"/></svg>
    </button>
    <div class="dots" role="group" aria-label="Choose a slide" id="klyro-guide-dots"></div>
    <button class="btn primary" id="klyro-guide-next" type="button" aria-label="Next tour slide">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3 L11 8 L6 13"/></svg>
    </button>
  </nav>
`
  const query = <T extends HTMLElement>(id: string) => element.querySelector<T>(`#klyro-guide-${id}`)!
  const scenes = [...element.querySelectorAll<HTMLElement>(".scene")]
  const copy = query("copy")
  const eyebrow = query("eyebrow")
  const title = query("title")
  const brief = query("brief")
  const dots = query("dots")
  const previous = query<HTMLButtonElement>("prev")
  const next = query<HTMLButtonElement>("next")
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  let index = 0
  let visible = false
  let timer: number | undefined
  let startedAt: number | undefined
  let remaining = DURATION

  const stopTimer = () => {
    window.clearTimeout(timer)
    timer = undefined
    if (startedAt !== undefined) remaining = Math.max(0, remaining - (performance.now() - startedAt))
    startedAt = undefined
  }
  const schedule = () => {
    stopTimer()
    const suspended = motion.matches || !visible || document.hidden
    element.classList.toggle("is-paused", suspended)
    if (suspended) return
    startedAt = performance.now()
    timer = window.setTimeout(() => go(index + 1), remaining)
  }
  const render = (manual = false) => {
    const step = guideSteps[index]
    copy.setAttribute("aria-live", manual ? "polite" : "off")
    scenes.forEach(scene => scene.classList.toggle("is-active", scene.dataset.scene === step.scene))
    eyebrow.textContent = `${step.chapter} · ${index + 1} of ${guideSteps.length}`
    title.textContent = step.title
    brief.textContent = step.text
    ;[...dots.children].forEach((dot, position) => {
      if (position === index) dot.setAttribute("aria-current", "step")
      else dot.removeAttribute("aria-current")
    })
    // Restart the same scene/copy/progress choreography as the reference.
    copy.classList.remove("swap")
    element.classList.remove("is-playing")
    element.style.setProperty("--dur", `${remaining}ms`)
    void element.offsetWidth
    copy.classList.add("swap")
    if (!motion.matches) element.classList.add("is-playing")
  }
  const go = (position: number, manual = false) => {
    stopTimer()
    index = (position + guideSteps.length) % guideSteps.length
    remaining = manual ? MANUAL_RESUME_DELAY : DURATION
    render(manual)
    schedule()
  }
  guideSteps.forEach((step, position) => {
    const dot = document.createElement("button")
    dot.type = "button"
    dot.className = "dot"
    dot.setAttribute("aria-label", `${step.chapter}, slide ${position + 1}: ${step.title}`)
    dot.addEventListener("click", () => go(position, true))
    dots.appendChild(dot)
  })
  previous.addEventListener("click", () => go(index - 1, true))
  next.addEventListener("click", () => go(index + 1, true))
  element.addEventListener("keydown", event => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault()
      go(index + (event.key === "ArrowRight" ? 1 : -1), true)
    }
  })
  const observer = new IntersectionObserver(entries => {
    // Entries are queued oldest-first; on load one callback can carry [hidden, visible].
    visible = entries[entries.length - 1]?.isIntersecting ?? false
    schedule()
  }, { threshold: .25 })
  observer.observe(element)
  document.addEventListener("visibilitychange", schedule)
  const onMotionChange = () => {
    stopTimer()
    remaining = DURATION
    render()
    schedule()
  }
  motion.addEventListener("change", onMotionChange)
  window.addEventListener("pagehide", () => {
    stopTimer()
    observer.disconnect()
    document.removeEventListener("visibilitychange", schedule)
    motion.removeEventListener("change", onMotionChange)
  }, { once: true })
  render()
  schedule()
  return element
}
