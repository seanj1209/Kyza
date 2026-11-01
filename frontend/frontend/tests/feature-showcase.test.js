import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const read = path => readFile(path, "utf8")
const prefix = "apps/web/src/kyza/dashboard/"
const source = await read(prefix + "featureRotation.ts")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
runInNewContext(compiled, { exports })
const { createFeatureRotation } = exports
let now = 0, serial = 0, state
const timers = new Map()
const clock = {
  now: () => now,
  set: (callback, delay) => { const id = ++serial; timers.set(id, { at: now + delay, callback }); return id },
  clear: id => timers.delete(id),
}
const advance = delay => {
  const target = now + delay
  while (true) {
    const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
    if (!next) break
    now = next[1].at
    timers.delete(next[0])
    next[1].callback()
  }
  now = target
}
const rotation = createFeatureRotation(4, value => { state = value }, clock)
assert.equal(timers.size, 0, "Offscreen showcase must not start a timer")
rotation.pause("offscreen", false)
assert.equal(state.index, 0)
advance(6999)
assert.equal(state.index, 0)
advance(1)
assert.equal(state.index, 1)
rotation.select(2)
advance(9999)
assert.equal(state.index, 2, "Manual selection must hold for ten seconds")
advance(1)
assert.equal(state.index, 3)
advance(7000)
assert.equal(state.index, 0, "Autoplay wraps and returns to seven-second cadence")
rotation.step(-1)
assert.equal(state.index, 3)
advance(2500)
rotation.pause("pointer", true)
advance(20000)
assert.equal(state.index, 3)
rotation.pause("focus", true)
rotation.pause("pointer", false)
advance(20000)
assert.equal(state.index, 3, "Leaving pointer must not override focused reading")
rotation.pause("focus", false)
advance(7499)
assert.equal(state.index, 3)
advance(1)
assert.equal(state.index, 0, "Resume uses time remaining, not a fresh timer")
rotation.pause("hidden", true)
rotation.pause("offscreen", true)
rotation.pause("hidden", false)
advance(20000)
assert.equal(state.index, 0)
rotation.pause("offscreen", false)
rotation.pause("motion", true)
rotation.select(1)
advance(60000)
assert.equal(state.index, 1, "Reduced motion is manual only")
rotation.pause("motion", false)
rotation.pause("user", true)
advance(60000)
assert.equal(state.index, 1, "Explicit pause must persist")
rotation.pause("user", false)
advance(10000)
assert.equal(state.index, 2)
rotation.dispose()
assert.equal(timers.size, 0)
rotation.select(0)
rotation.pause("offscreen", false)
advance(60000)
assert.equal(state.index, 2, "Disposed rotation must not update React")

const [component, art, css, pageCss, dashboard, quickLinks, cutter, carouselCss, artworkHtml] = await Promise.all([
  read(prefix + "FeatureShowcase.tsx"), read(prefix + "featureShowcaseArt.ts"), read(prefix + "featureShowcase.css"),
  read("apps/web/src/kyza/styles/pageSurface.css"), read(prefix + "DashboardPage.tsx"), read(prefix + "QuickLinks.tsx"),
  read("apps/web/src/main.ts"), read("apps/web/src/ui/studioPackCarousel.css"), read("artwork.html"),
])
assert.match(dashboard, /<FeatureShowcase \/>/)
assert.doesNotMatch(dashboard, /kyza-fold-scene|KyzaMark/)
assert.doesNotMatch(quickLinks, /Common destinations/)
assert.equal((component.match(/status: "planned"/g) ?? []).length, 3, "Amends v12: Legends, Artwork and Roadmap are planned")
assert.equal((component.match(/status: "available"/g) ?? []).length, 2, "Amends v12: Workflow and Sandbox Mode are available now")
assert.doesNotMatch(component, /kyza-feature-pause|Pause feature slideshow/)
for (const id of ["workflow", "sandbox", "legends", "artwork", "upcoming"]) assert.match(component, new RegExp(`id: "${id}"`))
assert.match(component, /<KyzaMark \/>/)
assert.match(component, /onFocusCapture/)
assert.match(component, /onBlurCapture/)
assert.match(component, /visibilitychange/)
assert.match(component, /motion.removeEventListener/)
assert.match(component, /observer.disconnect/)
assert.match(component, /key=\{feature.id\}/, "Keep navigation button identity/focus across slide changes")
assert.match(component, /prefers-reduced-motion: reduce/)
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
assert.match(css,/data-playing="false"[^}]*kyza-feature-art \*[^}]*animation-play-state: paused/s)
assert.match(component,/controller\.pause\("scroll",true\)/)
assert.match(component,/removeEventListener\("scroll",onScroll\)/)
assert.doesNotMatch(css,/@keyframes kf-word-in[^\n]*filter: blur/)
assert.equal((art.match(/<svg /g) ?? []).length, 5)
assert.doesNotMatch(art, /<script|https?:|onload=/)
assert.match(art, /Legend builder/)
assert.match(art, /One path, four stages/)
assert.match(art, /Sandbox Mode/)
assert.match(art, /On the roadmap/)
assert.match(art, /Print proof/)
assert.doesNotMatch(cutter, /start-sidebar-intro|Choose a pack, create manually/, "Amends v11 removes the subtitle under the Cutter Studio heading")
assert.match(carouselCss, /\.start-body\s*\{[^}]*overflow-y: auto/s)
assert.match(carouselCss, /\.start-sidebar\s*\{[^}]*overflow: visible/s)
assert.match(pageCss, /#quick-links:is\(:hover, :focus-within\)/)
assert.match(pageCss, /repeating-linear-gradient/)
assert.match(pageCss, /\.kyza-navigation\s*\{[^}]*position: fixed/s)
assert.match(pageCss, /\.kyza-navigation.is-mobile-open\s*\{[^}]*visibility: visible/s)
assert.doesNotMatch(pageCss, /#preview-frame|\.artwork-canvas|svg\s*\{/)
assert.match(artworkHtml, /kyza\/artwork\/main\.tsx/)
console.log("Feature showcase timing, pause/resume, reduced motion, lifecycle and amendment contracts verified")
