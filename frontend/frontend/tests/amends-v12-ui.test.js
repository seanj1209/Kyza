import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

// Amends v12 — visible naming, tagline, FlowAI mark, dashboard News/Updates and Place wiring.
const read = path => readFile(path, "utf8")
const [main, logo, flowMark, landingCss, controls, builder, carousel, showcase, art, showcaseCss, contextActions] = await Promise.all([
  read("apps/web/src/main.ts"), read("apps/web/src/klyro/shell/KlyroLogo.tsx"), read("apps/web/src/klyro/shell/flowMark.ts"),
  read("apps/web/src/ui/landingAmends.css"), read("apps/web/src/ui/controls.ts"), read("apps/web/src/ui/customProjectBuilder.ts"),
  read("apps/web/src/ui/studioPackCarousel.ts"), read("apps/web/src/klyro/dashboard/FeatureShowcase.tsx"),
  read("apps/web/src/klyro/dashboard/featureShowcaseArt.ts"), read("apps/web/src/klyro/dashboard/featureShowcase.css"),
  read("apps/web/src/ui/selectionContextActions.ts"),
])

// Tagline under Klyro, in both the React shell and the Cutter Studio shell.
for (const source of [main, logo]) {
  assert.match(source, /klyro-brand-product">Workflows built on Intelligence</)
  assert.doesNotMatch(source, /Packaging engineering/)
}

// Help Me Choose uses the supplied F mark, icon only.
assert.match(main, /decorateStartAction\(chooseButton, createFlowMarkIcon\(\), "Describe your product and explore Flow suggestions"\)/)
assert.doesNotMatch(main, /chooseButton, '<path d="m12 3 2\.5 6\.5/, "The old sparkle icon is replaced")
assert.equal((flowMark.match(/"M225 /g) ?? []).length, 2, "Two-part angular frame traced from the reference")
assert.match(flowMark, /FLOW_MARK_LETTER_PATH =\s*"M350 436H820A46 46/)
assert.doesNotMatch(flowMark, /<text|FLOW<|wordmark"/i, "No FLOW wordmark in the icon")
assert.match(landingCss, /svg\.flow-mark \.flow-mark-letter \{ fill: #fc0608; \}/)
assert.match(landingCss, /data-klyro-theme="dark"\] body #start-overlay \.start-entry-action > svg\.flow-mark \{ --flow-mark-frame: #fdf8f3; \}/)

// Strip Laminate remains named in setup surfaces, but no empty Base-menu section is shown.
assert.match(controls, /packSpecificSection\.section\.style\.display = "none"/)
assert.match(builder, /paperStripLabel\.textContent = "Strip Laminate Options"/)
assert.match(carousel, /"paper-strip": \{ illustration: "paperstrip", description: "A strip laminate guide/)

// News / Updates: available vs planned is explicit, and planned items never read as shipped.
const features = [...showcase.matchAll(/\{ id: "([a-z]+)", name: "([^"]+)", status: "(available|planned)", title: "[^"]+", accent: "[^"]+", text: "([^"]+)"/g)]
  .map(([, id, name, status, text]) => ({ id, name, status, text }))
assert.deepEqual(features.map(item => item.id), ["workflow", "sandbox", "legends", "artwork", "upcoming"])
assert.deepEqual(features.filter(item => item.status === "available").map(item => item.id), ["workflow", "sandbox"])
for (const item of features.filter(feature => feature.status === "planned")) {
  assert.match(item.text, /^Planned/, `${item.name} is introduced as planned`)
}
assert.match(features.find(item => item.id === "legends").text, /not available yet/)
assert.match(features.find(item => item.id === "upcoming").text, /None of these are released yet/)
assert.match(features.find(item => item.id === "sandbox").text, /Sandbox Mode/)
assert.match(showcase, /STATUS_LABEL: Record<FeatureStatus, string> = \{ available: "Available now", planned: "Coming soon" \}/)
assert.match(showcase, /klyro-feature-status is-\$\{feature\.status\}/)
assert.match(showcase, /aria-label=\{`\$\{feature\.name\} \(\$\{STATUS_LABEL\[feature\.status\]\}\)`\}/, "Tabs announce availability")
assert.match(showcase, /tabIndex=\{state\.index === position \? undefined : -1\}/, "Links on hidden slides are not focusable")
assert.equal((art.match(/<svg /g) ?? []).length, 5)
for (const id of features.map(item => item.id)) assert.match(art, new RegExp(`  ${id}: \``))
assert.match(art, /aria-label="Roadmap: [^"]*None of these are available yet"/)
assert.match(showcaseCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.klyro-feature-art \.travel/)

// Place reuses the shared context-action delay and shows visible feedback.
assert.match(contextActions, /export const SELECTION_ACTION_DELAY_MS=1500/)
assert.match(contextActions, /timer=setTimeout\(\(\)=>\{timer=null;show\(\)\},SELECTION_ACTION_DELAY_MS\)/)
assert.match(contextActions, /isPlaceableLabel/)
assert.match(contextActions, /note\.setAttribute\("role","status"\)/, "Unmoved labels get a visible status note")

console.log("Amends v12 UI: tagline, FlowAI mark, Strip Laminate naming, News/Updates availability and Place wiring verified")
