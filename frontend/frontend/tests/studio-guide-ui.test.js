import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"

const source = await readFile("apps/web/src/ui/studioGuide.ts", "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

// A small DOM/clock harness tests scheduling without real-time waits or a browser.
function makeHarness(reduced = false, initialEntries = [{ isIntersecting: true }]) {
  let now = 0, timerId = 0, observer
  const timers = new Map()
  const motionListeners = new Map()
  const windowListeners = new Map()
  const documentListeners = new Map()
  const motion = { matches: reduced, addEventListener: (key, fn) => motionListeners.set(key, fn), removeEventListener: key => motionListeners.delete(key) }
  class Node {
    children = []
    attributes = new Map()
    events = new Map()
    dataset = {}
    classes = new Set()
    style = { setProperty: (key, value) => this.attributes.set(key, value) }
    classList = {
      add: key => this.classes.add(key), remove: key => this.classes.delete(key),
      toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key)
    }
    offsetWidth = 380
    setAttribute(key, value) { this.attributes.set(key, value) }
    removeAttribute(key) { this.attributes.delete(key) }
    addEventListener(key, fn) { this.events.set(key, fn) }
    appendChild(child) { this.children.push(child) }
    set innerHTML(html) {
      this.nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => ["#" + match[1], new Node()]))
      this.scenes = [...html.matchAll(/data-scene="([^"]+)"/g)].map(match => {
        const scene = new Node(); scene.dataset.scene = match[1]; return scene
      })
    }
    querySelector(selector) { return this.nodes.get(selector) }
    querySelectorAll(selector) { return selector === ".scene" ? this.scenes : [] }
  }
  const document = {
    hidden: false, createElement: () => new Node(),
    addEventListener: (key, fn) => documentListeners.set(key, fn), removeEventListener: key => documentListeners.delete(key)
  }
  const context = {
    exports: {}, require: () => ({}), document, performance: { now: () => now },
    window: {
      matchMedia: () => motion,
      setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, due: now + delay }); return id },
      clearTimeout: id => timers.delete(id), addEventListener: (key, fn) => windowListeners.set(key, fn)
    },
    IntersectionObserver: class {
      constructor(callback) { observer = callback }
      observe() { observer(initialEntries) }
      disconnect() {}
    }
  }
  vm.runInNewContext(compiled, context)
  const element = context.exports.createStudioGuide()
  const node = id => element.querySelector("#kyza-guide-" + id)
  const tick = duration => {
    const target = now + duration
    while (timers.size) {
      const [id, timer] = [...timers].sort((a, b) => a[1].due - b[1].due)[0]
      if (timer.due > target) break
      now = timer.due; timers.delete(id); timer.fn()
      assert.ok(timers.size <= 1, "Autoplay must have at most one timer")
    }
    now = target
  }
  return {
    node, element, tick, timers,
    click: id => node(id).events.get("click")(),
    visibility: hidden => { document.hidden = hidden; documentListeners.get("visibilitychange")() },
    reduced: value => { motion.matches = value; motionListeners.get("change")() },
    pagehide: () => windowListeners.get("pagehide")(),
    step: () => node("eyebrow").textContent
  }
}

const guide = makeHarness()
assert.equal(guide.step(), "Get started · 1 of 4")
guide.click("next")
assert.equal(guide.step(), "Inside the studio · 2 of 4")
guide.tick(9999)
assert.equal(guide.step(), "Inside the studio · 2 of 4", "Manual slide must stay for the full 10 seconds")
guide.tick(1)
assert.equal(guide.step(), "Inside the studio · 3 of 4", "Autoplay resumes at ten seconds, without requiring mouse leave")
guide.tick(5200)
assert.equal(guide.step(), "Inside the studio · 4 of 4", "Subsequent slides use normal autoplay timing")
guide.click("next")
assert.equal(guide.step(), "Get started · 1 of 4", "Next wraps around")
guide.tick(7000)
guide.click("prev")
guide.tick(9999)
assert.equal(guide.step(), "Inside the studio · 4 of 4", "Another click restarts the manual hold")
guide.tick(1)
assert.equal(guide.step(), "Get started · 1 of 4")
guide.tick(1000)
guide.visibility(true)
guide.tick(20000)
assert.equal(guide.step(), "Get started · 1 of 4", "Hidden documents do not advance")
guide.visibility(false)
guide.tick(4199)
assert.equal(guide.step(), "Get started · 1 of 4")
guide.tick(1)
assert.equal(guide.step(), "Inside the studio · 2 of 4", "Visibility resumes the remaining interval")
guide.pagehide()
assert.equal(guide.timers.size, 0, "Page teardown clears autoplay")

const reducedGuide = makeHarness(true)
reducedGuide.tick(60000)
assert.equal(reducedGuide.step(), "Get started · 1 of 4")
reducedGuide.click("next")
reducedGuide.tick(60000)
assert.equal(reducedGuide.step(), "Inside the studio · 2 of 4", "Reduced motion allows manual steps but prevents autoplay")
reducedGuide.reduced(false)
reducedGuide.tick(5200)
assert.equal(reducedGuide.step(), "Inside the studio · 3 of 4")
reducedGuide.pagehide()

// Browsers can batch the detached and attached states into one callback on load.
const batched = makeHarness(false, [{ isIntersecting: false }, { isIntersecting: true }])
assert.equal(batched.element.classes.has("is-paused"), false, "The latest intersection entry decides visibility")
batched.tick(5200)
assert.equal(batched.step(), "Inside the studio · 2 of 4", "Autoplay starts without needing a scroll")
batched.pagehide()

// Amends v11: the guide is the Cutter Studio tour — entry routes first, then studio capabilities.
const tour = makeHarness()
const slide = () => ({ eyebrow: tour.node("eyebrow").textContent, title: tour.node("title").textContent, brief: tour.node("brief").textContent })
assert.match(source, /id="kyza-guide-guide-title">Studio tour</)
let current = slide()
assert.equal(current.title, "Choose how to start")
for (const route of [/pack type/i, /Sandbox Mode/, /import a saved cutter/i, /tell Kyza what you need/]) assert.match(current.brief, route)
tour.click("next")
current = slide()
assert.equal(current.eyebrow, "Inside the studio · 2 of 4")
assert.equal(current.title, "Design with precision")
assert.match(current.brief, /exact millimetres/)
assert.match(current.brief, /Measure tool/)
assert.match(current.brief, /600 ppi/, "Describe 600 as the measure tool's reference grid tier")
assert.doesNotMatch(source, /600 ?dpi|600DPI/i, "Do not claim a 600 DPI artwork resolution the studio does not provide")
tour.click("next")
assert.equal(slide().title, "Add and position elements")
assert.match(slide().brief, /snapping/)
tour.click("next")
assert.equal(slide().title, "Customise your cutter")
assert.match(slide().brief, /Customise/)
tour.click("prev")
assert.equal(slide().title, "Add and position elements", "Previous control steps back")
const dotsNode = tour.node("dots")
assert.equal(dotsNode.children.length, 4)
dotsNode.children[0].events.get("click")()
assert.equal(slide().title, "Choose how to start", "Dots jump directly to a slide")
assert.equal(dotsNode.children[0].attributes.get("aria-current"), "step")
assert.equal(dotsNode.children[1].attributes.has("aria-current"), false)
assert.match(dotsNode.children[1].attributes.get("aria-label"), /Inside the studio, slide 2: Design with precision/)
tour.pagehide()
for (const scene of ["start", "precision", "elements", "customise"]) assert.match(source, new RegExp(`data-scene="${scene}"`))
const guideCss = await readFile("apps/web/src/ui/studioGuide.css", "utf8")
assert.match(guideCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: \.01ms/)
assert.doesNotMatch(guideCss, /kg-(snap|knob|ring|lens|seal-grow)[^{]*\{[^}]*infinite/, "Tour scene motion plays once per slide")

const artworkSource = await readFile("apps/web/src/ui/studioPackIllustrations.ts", "utf8")
const artworkContext = { exports: {} }
vm.runInNewContext(ts.transpileModule(artworkSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, artworkContext)
const art = artworkContext.exports.PACK_ILLUSTRATIONS
assert.equal((art.side4.match(/class="sl"/g) ?? []).length, 4)
assert.equal((art.side3.match(/class="sl"/g) ?? []).length, 3)
assert.equal((art.paperstrip.match(/class="sl"/g) ?? []).length, 2)
assert.equal((art.paperstrip.match(/--seal-width:18/g) ?? []).length, 2)
assert.doesNotMatch(art.paperstrip, /y="58"/)
for (const key of ["side4", "side3"]) {
  assert.match(art[key], /class="film-sheet"/)
  assert.doesNotMatch(art[key], /L154|stroke-dasharray="4 4"/)
}
console.log("Studio guide timing, reduced motion, cleanup and v4 packaging illustrations verified")
