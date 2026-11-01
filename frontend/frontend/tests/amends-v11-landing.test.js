import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

// Amends v11: Cutter Studio entry page copy, pack indicator alignment and stepped-cutter selection.
const read = path => readFile(path, "utf8")
const main = await read("apps/web/src/main.ts")
const landingCss = await read("apps/web/src/ui/landingAmends.css")
const carouselCss = await read("apps/web/src/ui/studioPackCarousel.css")
const stepNav = await read("apps/web/src/ui/stepNavigation.ts")
const stepCss = await read("apps/web/src/ui/stepNavigation.css")

// Header and entry options
assert.match(main, /projectTitle\.className = "start-studio-title"\s*\n\s*projectTitle\.textContent = "Cutter Studio"/)
assert.match(landingCss, /\.start-sidebar \.start-studio-title \{[^}]*font-size: clamp\(28px, 2\.4vw, 34px\)/s, "Heading is promoted to page-title scale")
assert.doesNotMatch(main, /sidebarIntro|start-sidebar-intro/, "The subtitle under Cutter Studio is removed")
assert.match(main, /packHeader\.textContent = "Get Started"/)
assert.doesNotMatch(main, /Choose a pack type/)
assert.match(main, /startPackIntro\.textContent = "Choose a pack, import a cutter, or tell Kyza what you need\."/)
assert.match(main, /customProjectButton\.textContent = "Sandbox Mode"/)
assert.match(main, /decorateStartAction\(customProjectButton, cutterIcons\.box, "For Trials and Bespoke Project Work"\)/)
assert.doesNotMatch(main, /Create Manually/)
for (const action of ["Resume Work", "Import Cutter", "Help Me Choose"]) assert.match(main, new RegExp(`textContent ?= ?"${action}"`), `${action} remains an entry option`)
assert.match(main, /startFeatureRow\.append\(resumeWorkButton, customProjectButton, importCutterButton, chooseButton, choosePanel\)/, "Entry options keep their order and wiring")
assert.match(main, /importCutterButton\.addEventListener\("click", \(\) => customProjectBuilderApi\.importCutter\(\)\)/)

// Pack-type indicator: centred on the rail, and the rail's centre is the card's centre because the
// carousel insets are symmetric. Guard both halves so a future asymmetric inset is caught.
assert.match(landingCss, /\.studio-pack-carousel \.rail \{ justify-content: center; \}/)
assert.match(carouselCss, /\.nav\.prev \{ left: 2px; \}/)
assert.match(carouselCss, /\.nav\.next \{ right: 2px; \}/)
assert.match(carouselCss, /\.studio-pack-carousel \.viewport \{ padding: 14px 42px;/, "Viewport padding is symmetric")
assert.match(carouselCss, /\.studio-pack-carousel \.track \{ display: grid; justify-items: center;/, "The single slide is centred in the viewport")

// Stepped cutters: no keyline around any step; the active tab/tag carries selection.
assert.doesNotMatch(stepNav, /step-active-outline/, "No outline rect is drawn around the active cutter")
assert.doesNotMatch(stepCss, /step-active-outline/)
assert.match(stepNav, /button\.className=active\?"is-active":""/, "The active step tab is marked")
assert.match(stepNav, /step-canvas-tag\$\{active\?" is-active":""\}/, "The tag below the cutter is marked")
assert.match(stepCss, /\.step-canvas-tag\.is-active rect \{ fill:var\(--kyza-brand,#b4151b\)/, "The active tag below the cutter is red")
assert.match(stepCss, /\.step-navigation button\.is-active \{ color:var\(--kyza-brand,#b4151b\)/, "The active tray tab is red")

console.log("Amends v11: landing copy, centred pack indicator and tab-only stepped-cutter selection verified")
