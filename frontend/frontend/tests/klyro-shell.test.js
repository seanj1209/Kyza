import assert from "node:assert/strict"
import "./studio-amends-v2.test.js"
import "./studio-amends-v3.test.js"
import "./studio-amends-v4.test.js"
import "./studio-amends-v5.test.js"
import "./studio-docks.test.js"
import { readFile, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"

const root = resolve(".")
const shellRoot = join(root, "apps", "web", "src", "klyro")

async function read(path) {
  return readFile(join(root, path), "utf8")
}

async function readTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const contents = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? readTree(path) : readFile(path, "utf8")
  }))
  return contents.flat(Infinity).join("\n")
}

const [indexHtml, cutterHtml, validationHtml, validationSource, validationAdapterSource, viteConfig, appSource, dashboardSource, quickLinksSource, projectSearchSource, recentProjectsSource, adapterSource, modalSource, formSource, reviewSource, formContractSource, navigationSource, themeSource, cutterSource, projectNavigationSource, projectOpenSource, projectCreationSource, shellSource] = await Promise.all([
  read("index.html"),
  read("cutter.html"),
  read("validation.html"),
  read("apps/web/src/klyro/validation/main.tsx"),
  read("apps/web/src/klyro/validation/validationAdapter.ts"),
  read("vite.config.ts"),
  read("apps/web/src/klyro/KlyroApp.tsx"),
  read("apps/web/src/klyro/dashboard/DashboardPage.tsx"),
  read("apps/web/src/klyro/dashboard/QuickLinks.tsx"),
  read("apps/web/src/klyro/dashboard/ProjectSearch.tsx"),
  read("apps/web/src/klyro/dashboard/RecentProjects.tsx"),
  read("apps/web/src/klyro/dashboard/projectAdapter.ts"),
  read("apps/web/src/klyro/projects/NewProjectModal.tsx"),
  read("apps/web/src/klyro/projects/NewProjectDetailsForm.tsx"),
  read("apps/web/src/klyro/projects/NewProjectReview.tsx"),
  read("apps/web/src/klyro/projects/newProjectForm.ts"),
  read("apps/web/src/klyro/shell/KlyroNavigation.tsx"),
  read("apps/web/src/klyro/shell/KlyroThemeProvider.tsx"),
  read("apps/web/src/main.ts"),
  read("apps/web/src/project/projectNavigation.ts"),
  read("apps/web/src/project/projectOpenService.ts"),
  read("apps/web/src/project/projectCreationService.ts"),
  readTree(shellRoot),
])
const [packGenSource, packGenCss, builderModelSource, builderComponentSource, previewSource, routeShellSource, headerSource, controlsSource, cutterCss] = await Promise.all([
  read("apps/web/src/packGen.ts"),
  read("apps/web/src/packGen.css"),
  read("apps/web/src/packGen/packSpecBuilderModel.ts"),
  read("apps/web/src/packGen/PackSpecBuilderModal.tsx"),
  read("apps/web/src/packGen/packGenSuggestionPreview.ts"),
  read("apps/web/src/klyro/shell/KlyroRouteShell.tsx"),
  read("apps/web/src/klyro/shell/KlyroHeader.tsx"),
  read("apps/web/src/ui/controls.ts"),
  read("apps/web/src/style.css"),
])

assert.match(indexHtml, /apps\/web\/src\/klyro\/main\.tsx/)
assert.doesNotMatch(indexHtml, /apps\/web\/src\/main\.ts/)
assert.match(cutterHtml, /apps\/web\/src\/main\.ts/)
assert.match(cutterSource, /id = "studio-project-name"/)
assert.match(cutterSource, /id = "studio-project-strip"/)
assert.match(cutterSource, /id = "studio-bottom-actions"/)
assert.match(cutterSource, /makeInspectorRailButton\("Base"\)/)
assert.match(cutterSource, /makeInspectorRailButton\("Elements"\)/)
assert.match(cutterSource, /makeInspectorRailButton\("Layers"\)/)
assert.match(cutterSource, /startButton\.textContent = "Create"/)
assert.match(cutterSource, /createStudioPackCarousel\(\{/)
assert.match(cutterSource, /packs: packModules/)
assert.match(cutterSource, /packCarousel\.select\(resolvedPackId\)/)
assert.match(cutterSource, /startPackCanvas\.append\(startPackSection, startFeatureRow\)/)
assert.doesNotMatch(cutterSource, /morePackList|packTrayToggle/)
const carouselSource = await read("apps/web/src/ui/studioPackCarousel.ts")
assert.match(carouselSource, /lidding: \{ illustration: "lidding"/)
assert.match(carouselSource, /"paper-strip", "lidding"\]/)
assert.match(carouselSource, /"3-side-seal-pouch": \{ illustration: "pouch3"/)
assert.match(carouselSource, /slides\[index\]\.slide\.hidden = true/)
assert.match(carouselSource, /active\.slide\.hidden = false/)
assert.match(carouselSource, /if \(entry\.available\) options\.onSelect\(entry\.id\)/)
assert.match(carouselSource, /else options\.createButton\.remove\(\)/)
assert.match(carouselSource, /Previous pack type/)
assert.match(carouselSource, /Next pack type/)
assert.match(carouselSource, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/)
assert.match(carouselSource, /\(position \+ entries\.length\) % entries\.length/)
assert.doesNotMatch(carouselSource, /setTimeout|setInterval|cloneNode|localStorage|runEngineRequest/)
const carouselCss = await read("apps/web/src/ui/studioPackCarousel.css")
assert.match(carouselCss, /\.slide\[hidden\] \{ display: none !important;/)
assert.match(carouselCss, /prefers-reduced-motion: reduce/)
assert.match(carouselCss, /data-klyro-theme="dark"/)
const illustrationSource = await read("apps/web/src/ui/studioPackIllustrations.ts")
for (const key of ["flowwrap", "paperstrip", "pillow", "kseal", "doy", "side4", "side3", "lidding", "pouch3"]) {
  assert.ok(illustrationSource.includes(key + ":"), "Missing reference pack artwork: " + key)
}
assert.equal((illustrationSource.match(/id="klyro-pack-g/g) ?? []).length, 7)
assert.match(cutterSource, /makeStudioBottomAction\("Import Assets"/)
const verticalTabsSource = await read("apps/web/src/ui/verticalTabs.ts")
assert.match(verticalTabsSource, /scrollDown\.disabled = rail\.scrollTop \+ rail\.clientHeight >= rail\.scrollHeight - 1/)
assert.match(verticalTabsSource, /rail\.scrollBy/)
assert.match(verticalTabsSource, /event\.key === "End"/)
const elementGroupOrder = [
  'createGroup("basic", "Basic"',
  'createGroup("barcodes", "Barcodes / BBEs"',
  'createGroup("other", "Labels"',
  'createGroup("perforation", "Perforations"',
  'createGroup("windows", "Windows"',
  'createGroup("die-cut", "Die Cut Outs"',
  'createGroup("openings", "Openings"'
].map(label => controlsSource.indexOf(label))
assert.ok(elementGroupOrder.every(position => position >= 0))
assert.deepEqual(elementGroupOrder, [...elementGroupOrder].sort((a, b) => a - b), "Elements menu order changed")
assert.doesNotMatch(controlsSource, /createMenuButton\("basic", "kseal-arch"/)
assert.match(controlsSource, /packSpecificSection\.section\.style\.display = "none"/)
const safeZoneAppearance = await read("apps/web/src/renderers/elementAppearance.ts")
assert.match(safeZoneAppearance, /defaults\("#ea0bba", \.6, \.6\)/)
assert.match(safeZoneAppearance, /kind === "clear-strip" \? "#f4fbff"/)
const studioGuideSource = await read("apps/web/src/ui/studioGuide.ts")
assert.doesNotMatch(studioGuideSource, /How to use the Studio|Set dimensions in Base/)
assert.match(studioGuideSource, /Place windows, hanger slots, perforations and attribute boxes\./)
assert.match(studioGuideSource, /<span class="chip" id="klyro-guide-guide-title">Studio tour<\/span>/)
assert.equal((studioGuideSource.match(/class="scene"/g) ?? []).length, 4)
assert.match(studioGuideSource, /prefers-reduced-motion: reduce/)
assert.match(studioGuideSource, /motion\.matches \|\| !visible \|\| document\.hidden/)
assert.match(studioGuideSource, /const MANUAL_RESUME_DELAY = 10000/)
assert.match(studioGuideSource, /remaining = manual \? MANUAL_RESUME_DELAY : DURATION/)
assert.doesNotMatch(studioGuideSource, /klyro-guide-play|klyro-guide-count|mouseenter|mouseleave/)
for (const route of ["Pack type", "Sandbox", "Import", "Flow"]) {
  assert.ok(studioGuideSource.includes(route), `Missing tour entry route: ${route}`)
}
const customisationSource = await read("apps/web/src/ui/customisationPanel.ts")
assert.match(customisationSource, /No Perforations Active/)
assert.match(customisationSource, /perfEmptyState\.hidden = Boolean\(perfs\)/)
assert.match(customisationSource, /perfDetails\.hidden = !perfs/)
assert.match(customisationSource, /perfEmptyAdd\.addEventListener\("click", \(\) => onShowPerforations\?\.\(\)\)/)
assert.match(cutterSource, /onShowPerforations: \(\) => \{\s*openInspectorPanel\("attributes"\)\s*controlsApi\?\.showPerforationsMenu\(\)/)
assert.match(controlsSource, /showPerforationsMenu: \(\) => selectElementCategory\?\.\("perforation"\)/)
assert.match(studioGuideSource, /Previous tour slide/)
assert.match(studioGuideSource, /Next tour slide/)
assert.match(studioGuideSource, /const DURATION = 5200/)
assert.match(studioGuideSource, /aria-current", "step"/)
for (const scene of ["start", "precision", "elements", "customise"]) {
  assert.ok(studioGuideSource.includes(`data-scene="${scene}"`), `Missing reference guide scene: ${scene}`)
}
const studioGuideCss = await read("apps/web/src/ui/studioGuide.css")
assert.match(studioGuideCss, /prefers-reduced-motion: reduce/)
assert.match(studioGuideCss, /\.is-paused/)
assert.match(studioGuideCss, /\.scene/)
await import("./studio-guide-ui.test.js")
await import("./feature-showcase.test.js")
await import("./precision-measure.test.js")
assert.match(cutterSource, /saveCurrentProjectAs\(\)/)
assert.match(cutterSource, /syncStudioWorkspaceHeader\(\)/)
assert.match(cutterSource, /aria-label", "Cutter inspector"/)
assert.match(cutterSource, /role", "tablist"/)
assert.match(cutterSource, /aria-controls", "base-model-panel"/)
assert.match(cutterSource, /aria-controls", "layers-panel"/)
assert.match(controlsSource, /aria-label", "Cutter canvas tools"/)
assert.match(controlsSource, /aria-label", "Canvas zoom"/)
assert.match(controlsSource, /Unpin canvas toolbar/)
assert.doesNotMatch(controlsSource, /Use the light canvas toolbar/)
assert.doesNotMatch(controlsSource, /dockModeButton/)
assert.match(controlsSource, /window\.addEventListener\("klyro-theme-change"/)
assert.match(cutterSource, /new CustomEvent\("klyro-theme-change"/)
assert.match(cutterSource, /button\.appendChild\(makeLucideIcon\(iconPaths, "studio-topbar-action-icon"\)\)/)
assert.doesNotMatch(cutterSource, /icon\.src = hovered \? iconHover : iconStatic/)
assert.match(cutterSource, /className = "cutter-tab-actions"/)
assert.match(cutterSource, /actionButton\.dataset\.actionId === "user"/)
assert.match(cutterSource, /actionButton\.dataset\.actionId === "product-spec"/)
assert.match(cutterSource, /cutterTabActions\.appendChild\(actionButton\)/)
assert.doesNotMatch(cutterSource, /preview\.appendChild\(studioProjectStrip\)/)
assert.match(cutterSource, /rightRailEl\.style\.right = "14px"/)
assert.match(cutterCss, /body\.studio-mode #preview-frame\s*\{[\s\S]*inset: 14px;[\s\S]*background: #ffffff;/)
assert.match(controlsSource, /Zoom out \$\{loadZoomStepPercent\(\)\} percent/)
assert.match(controlsSource, /Zoom in \$\{loadZoomStepPercent\(\)\} percent/)
assert.match(controlsSource, /window\.setInterval\(\(\) => updateZoom\(direction\), 80\)/)
assert.doesNotMatch(controlsSource, /className = "dock-zoom-select"/)
assert.match(controlsSource, /const clampDockPosition = \(left: number, top: number\)/)
assert.match(controlsSource, /rightRailRect\.left - margin/)
assert.match(controlsSource, /bottomActionsRect\.top - margin/)
assert.match(controlsSource, /let dockPinned = false/)
assert.doesNotMatch(controlsSource, /dockShell\.setAttribute\("data-user-position", "false"\)/)
assert.match(cutterCss, /body\.studio-mode #right-rail\s*\{[\s\S]*right: 14px/s)
assert.match(cutterSource, /const closeArtboardProject = \(artboard: Artboard\)/)
assert.match(cutterSource, /clearActiveCutterState\(\)/)
assert.match(cutterSource, /className = "artboard-tab-close"/)
assert.match(cutterSource, /id = "pack-spec-dialog"/)
for (const label of ["Project name", "Pack type", "Cutter size", "Eyemarks"]) {
  assert.ok(cutterSource.includes(`"${label}"`), `Missing Pack Spec summary field: ${label}`)
}
assert.match(cutterCss, /body\.studio-mode #preview-frame\s*\{[\s\S]*border-radius: 14px;[\s\S]*rgba\(158, 19, 22, 0\.16\)/s)
assert.match(cutterCss, /body\.studio-mode #preview svg\s*\{[\s\S]*width: 100%;[\s\S]*height: 100%;/s)
assert.match(cutterCss, /\.cutter-klyro-app \.cutter-primary-navigation\s*\{[\s\S]*border-radius: 18px;/s)
assert.match(cutterCss, /:root\[data-klyro-theme="light"\] body\.studio-mode \.artboard-tab[\s\S]*color: var\(--klyro-text\);/s)
assert.match(cutterCss, /:root\[data-klyro-theme="light"\] body\.studio-mode #preview\s*\{[\s\S]*background: var\(--klyro-canvas\);/s)
assert.match(cutterCss, /#side-panel,[\s\S]*\.customisation-panel\s*\{[\s\S]*z-index: 8;/s)
assert.match(cutterSource, /aria-controls", "attributes-panel"/)
assert.match(cutterSource, /openInspectorPanel/)
assert.match(cutterSource, /activeInspectorPanel === panel/)
assert.match(cutterSource, /closeInspectorPanels/)
assert.match(cutterSource, /CUTTER_PAGE_ZOOM_PERCENT = 100/)
assert.match(cutterSource, /customPanelApi\.showFile\(\)/)
assert.match(cutterSource, /customPanelApi\.showCustomise\(\)/)
assert.match(await read("apps/web/src/style.css"), /body\.studio-mode #app[\s\S]*height: 100dvh/)
assert.match(await read("apps/web/src/style.css"), /body\.studio-mode #preview[\s\S]*aspect-ratio: auto/)
assert.match(validationHtml, /apps\/web\/src\/klyro\/validation\/main\.tsx/)
assert.match(routeShellSource, /DEFAULT_NAVIGATION_EXPANDED = false/)
assert.match(appSource, /KlyroRouteShell routeLabel="Dashboard"/)
assert.match(routeShellSource, /<KlyroHeader/)
assert.match(routeShellSource, /<KlyroNavigation/)
assert.match(headerSource, /\{routeLabel\}/)

for (const rewrite of ['"/cutter": "/cutter.html"', '"/ai-studio": "/ai-studio.html"', '"/artwork": "/artwork.html"', '"/validation": "/validation.html"', '"/account": "/account.html"']) {
  assert.ok(viteConfig.includes(rewrite), `Missing local clean-route rewrite: ${rewrite}`)
}

for (const target of ['href: "/"', 'href: "/artwork"', 'href: "/cutter"', 'href: "/validation"', 'href: "/account"']) {
  assert.ok(navigationSource.includes(target), `Missing navigation target: ${target}`)
}

for (const label of ["Dashboard", "Cutter Studio", "Artwork Studio", "Validation Centre", "Export Release", "Account"]) {
  assert.ok(navigationSource.includes(label), `Missing navigation label: ${label}`)
}
assert.doesNotMatch(navigationSource, /label: "Projects"/)
assert.ok(navigationSource.includes('href: "/cutter#save-export"'), "Export Release must link to the existing Cutter Studio export surface.")
assert.ok(navigationSource.includes('disabled: !getExportCapability("ai-compatible-svg")?.available'), "Export Release availability must use the shared export capability contract.")
assert.match(validationSource, /KlyroRouteShell routeLabel="Validation Centre"/)
assert.match(validationSource, /Only a Passed result for the current Project revision is export-ready/)
assert.match(validationSource, /Review and re-run in Cutter Studio/)
assert.match(validationAdapterSource, /listCutNFlowProjects\(makeReadOnlyStorage\(storage\)\)/)
assert.match(validationAdapterSource, /getEffectiveValidationStatus\(run, project\.revision\)/)
assert.doesNotMatch(validationAdapterSource, /validateProjectCutter|saveCutNFlowProject|JSON\.parse|JSON\.stringify/)

assert.match(dashboardSource, />\s*Start Here\s*</)
assert.match(dashboardSource, /focusDashboardSection\("quick-links"\)/)
assert.doesNotMatch(dashboardSource, />\s*View Projects\s*</)
assert.doesNotMatch(dashboardSource, /<StartHere/)

const dashboardOrder = ["klyro-hero", "<QuickLinks", "<ProjectSearch", "<RecentProjects"].map((token) => dashboardSource.indexOf(token))
assert.ok(dashboardOrder.every((position) => position >= 0))
assert.deepEqual(dashboardOrder, [...dashboardOrder].sort((left, right) => left - right), "Dashboard section order changed.")

for (const [source, id] of [
  [quickLinksSource, "quick-links"],
  [projectSearchSource, "project-search"],
  [recentProjectsSource, "recent-projects"],
]) {
  assert.ok(source.includes(`id="${id}"`), `Missing stable Dashboard section ID: ${id}`)
  assert.match(source, /tabIndex=\{-1\}/)
}

const quickLinkLabels = ["Template Library", "Legend Config", "New Project", "Cutter Preferences", "Upload Assets"]
const quickLinkOrder = quickLinkLabels.map((label) => quickLinksSource.indexOf(`label: "${label}"`))
assert.ok(quickLinkOrder.every((position) => position >= 0))
assert.deepEqual(quickLinkOrder, [...quickLinkOrder].sort((left, right) => left - right), "Quick Link order changed.")
assert.match(quickLinksSource, /type="button"/)
assert.match(quickLinksSource, /const isNewProject = label === "New Project"/)
assert.match(quickLinksSource, /onClick=\{isNewProject \? onNewProject : isLegend \? \(\) => setLegendOpen\(true\)/)
assert.match(quickLinksSource, /isNewProject \? "Open Pack Spec Builder" : isLegend \|\| isCutterPreferences \? "Open" : "Coming Soon"/)
assert.doesNotMatch(quickLinksSource, /href=|Upload Items/)
assert.match(quickLinksSource, /window\.location\.href = "\/account#cutter"/)
for (const removedLabel of ["Pack Gen", "Cutter Studio", "Validation Centre", "Export Release"]) {
  assert.ok(!quickLinkLabels.includes(removedLabel))
  assert.ok(!quickLinksSource.includes(`label: "${removedLabel}"`), `Removed Quick Link remains: ${removedLabel}`)
}

assert.match(dashboardSource, /<QuickProjectModal/)
assert.match(dashboardSource, /onNewProject=\{openNewProjectBuilder\}/)
assert.doesNotMatch(dashboardSource, /ai-studio\?builder=manual|NewProjectModal/)
assert.match(modalSource, /role="dialog"/)
assert.match(modalSource, /aria-modal="true"/)
assert.match(modalSource, /aria-labelledby="new-project-title"/)
assert.match(modalSource, /aria-describedby="new-project-description"/)
assert.match(modalSource, /if \(!open\) return null/)
assert.match(modalSource, /event\.key === "Escape"/)
assert.match(modalSource, /event\.key !== "Tab"/)
assert.match(modalSource, /role="alertdialog"/)
assert.match(modalSource, /Continue Editing/)
assert.match(modalSource, /Discard/)
assert.match(modalSource, /const resetModal = \(\) =>/)
assert.match(modalSource, /setDraft\(\{ \.\.\.EMPTY_NEW_PROJECT_DRAFT \}\)/)
assert.match(modalSource, /onClick=\{closeAndReset\}>Discard/)
assert.doesNotMatch(modalSource, /Project creation is ready to connect\./)
assert.match(modalSource, /if \(!values \|\| creatingRef\.current\) return/)
assert.match(modalSource, /createCanonicalProject\(\{/)
assert.match(modalSource, /window\.location\.assign\(result\.destinationUrl\)/)
assert.match(modalSource, /setCreationError\(result\.errors\.join/)
const creationFailureBranch = modalSource.slice(
  modalSource.indexOf("if (result.ok === false)"),
  modalSource.indexOf("window.location.assign(result.destinationUrl)"),
)
assert.match(creationFailureBranch, /return/)
assert.match(modalSource, /onBack=\{\(\) => \{[\s\S]*setView\("edit"\)/)
assert.match(modalSource, /import \{ packModules \} from "\.\.\/\.\.\/packs"/)
assert.match(formSource, /Project Name/)
assert.match(formSource, /Start with Pack Gen/)
assert.match(formSource, /Start directly in Cutter Studio/)
assert.match(reviewSource, /Back to Edit/)
assert.match(reviewSource, /Creating Project…/)
assert.match(reviewSource, /disabled=\{creating\}/)
assert.match(reviewSource, /role="alert"/)
assert.match(formContractSource, /type NewProjectFormValues/)
assert.doesNotMatch([modalSource, formSource, reviewSource, formContractSource].join("\n"), /localStorage|sessionStorage|saveCutNFlowProject|CUTNFLOW_PROJECT_STORAGE_KEY|cutnflow\.projects|cutnflow_projects_v2/)
assert.match(projectCreationSource, /saveCutNFlowProject\(project, dependencies\.storage\)/)
assert.match(projectCreationSource, /loadCutNFlowProject\(project\.id, dependencies\.storage\)/)
assert.match(projectCreationSource, /runPackGenerateRequest\(\{/)
assert.doesNotMatch(projectCreationSource, /localStorage|sessionStorage|CUTNFLOW_PROJECT_STORAGE_KEY/)

assert.match(adapterSource, /listCutNFlowProjects\(makeReadOnlyStorage\(storage\)\)/)
assert.doesNotMatch(adapterSource, /JSON\.parse|JSON\.stringify/)
assert.doesNotMatch(adapterSource, /CUTNFLOW_PROJECT_STORAGE_KEY/)
assert.match(adapterSource, /project\.name/)
assert.match(adapterSource, /project\.cutter\.packType/)
assert.match(recentProjectsSource, /href=\{project\.destinationUrl\}/)
assert.match(recentProjectsSource, /aria-label=\{`Open \$\{project\.name\}`\}/)
assert.match(recentProjectsSource, /ProjectCutterPreview/)
assert.match(recentProjectsSource, /Version V\{project\.revision\}/)
assert.match(recentProjectsSource, /className="klyro-project-open"[^>]*>Open</)
assert.match(recentProjectsSource, />Move to</)
assert.match(recentProjectsSource, />Quick Export</)
assert.match(recentProjectsSource, />Rename</)
assert.match(recentProjectsSource, />Delete</)
assert.match(recentProjectsSource, /role="alertdialog"/)
assert.equal((recentProjectsSource.match(/role="menuitem" disabled/g) ?? []).length, 2)
assert.match(projectNavigationSource, /new URLSearchParams\(\{ projectId \}\)/)
assert.match(projectNavigationSource, /`\/ai-studio\?\$\{new URLSearchParams/)
assert.match(projectNavigationSource, /if \(requestedProject\.status !== "absent"\) return "requested-project"/)
assert.match(projectOpenSource, /loadCutNFlowProject\(projectId, source\)/)
assert.doesNotMatch(projectOpenSource, /makeReadOnlyStorage/)
assert.match(projectOpenSource, /card\.project\.id === project\.id/)
assert.doesNotMatch(projectOpenSource, /localStorage\.setItem|JSON\.stringify/)
assert.match(cutterSource, /hydrateRequestedProject\(requestedProject\)/)
assert.match(cutterSource, /prepareProjectPresentationCard/)
assert.match(cutterSource, /Open normal Cutter start screen/)
assert.match(cutterSource, /Return to Dashboard/)
assert.match(cutterSource, /className = "klyro-app cutter-klyro-app"/)
assert.match(cutterSource, /className = "cutter-project-tabs"/)
assert.match(cutterSource, /Dashboard[\s\S]*studioNavigationHref\(\)[\s\S]*Artwork Studio[\s\S]*\/validation[\s\S]*\/account/)
assert.match(cutterSource, /Resume Work/)
assert.match(cutterSource, /getStudioDestination\(\)/)
assert.match(cutterSource, /persistActiveCutterReturnState/)
assert.match(cutterSource, /window\.addEventListener\("pagehide", persistActiveCutterReturnState\)/)
assert.match(cutterSource, /packHeader\.textContent = "Get Started"/)
assert.doesNotMatch(cutterSource, /Choose a pack type/)
assert.match(cutterSource, /Create \$\{selectedPack\.name\}/)
assert.doesNotMatch(cutterSource, /Custom Project · Sandbox/)
assert.match(cutterSource, /Help Me Choose/)
assert.match(cutterSource, /sorted\.slice\(0, 3\)/)
assert.match(cutterSource, /Choose a pack, import a cutter, or tell Flow what you need\./)
assert.match(cutterSource, /customProjectButton\.textContent = "Sandbox Mode"/)
assert.match(cutterSource, /"For Trials and Bespoke Project Work"/)
assert.doesNotMatch(cutterSource, /Create Manually/)
assert.doesNotMatch(cutterSource, /projectList\.appendChild\(projectArchive\)/)
assert.doesNotMatch(cutterSource, /projectList\.appendChild\(projectNewFolder\)/)

assert.equal((navigationSource.match(/aria-label=\{accessibleLabel\}/g) ?? []).length, 2)
assert.equal((navigationSource.match(/title=\{accessibleLabel\}/g) ?? []).length, 2)
assert.match(navigationSource, /aria-disabled="true"/)
assert.doesNotMatch(navigationSource, /className="klyro-navigation-item"[\s\S]{0,100}\sdisabled/)

assert.match(themeSource, /klyro\.theme/)
assert.match(navigationSource, /window\.location\.pathname/)
assert.match(navigationSource, /aria-current=\{isActive \? "page" : undefined\}/)




assert.match(packGenSource, /pack-gen-flowai-presence", "Flow"/)
assert.doesNotMatch(packGenSource, /FlowAI ready/)
assert.match(packGenSource, /pack-gen-prompt-idea/)
assert.match(packGenSource, /}, 6200\)/)
assert.match(packGenSource, /promptPanel\.classList\.add\("is-generating"\)/)
assert.match(packGenSource, /promptPanel\.classList\.remove\("is-generating"\)/)
assert.match(packGenSource, /Build Specification/)
assert.match(packGenSource, /Open in Cutter Studio/)
assert.match(packGenSource, /Suggested Pack Types/)
assert.match(packGenSource, /Flow Score/)
assert.match(packGenSource, /type: "flow-score"/)
assert.match(packGenSource, /type SuggestionCarouselState/)
assert.match(packGenSource, /activeIndex: number/)
assert.match(packGenSource, /Previous suggestion/)
assert.match(packGenSource, /Next suggestion/)
assert.match(packGenSource, /Suggestion \$\{index \+ 1\} of \$\{count\}/)
assert.match(packGenSource, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/)
assert.match(packGenSource, /setActiveSuggestion\(result, index [+-] 1\)/)
assert.match(packGenSource, /appendSpecification\("Key features", previewModel\.keyFeatures\.join/)
assert.match(previewSource, /getKeyFeatures\(generated\.spec\)/)
assert.match(previewSource, /Grip seal \(zip\)/)
assert.match(previewSource, /Tear notch/)
assert.match(packGenSource, /Review the information currently affecting this pack starting point\./)
assert.doesNotMatch(packGenSource, /Further Details|viewModel\.assumptionsLabel|pack-gen-card-limitation/)
assert.doesNotMatch(packGenSource, /--pack-gen-overlay-width|--pack-gen-columns|pack-gen-card-grid/)
assert.doesNotMatch(packGenSource, /Build Manually|builder=manual/)
assert.match(packGenSource, /import "\.\/klyro\/styles\/klyro\.css"/)
assert.match(packGenCss, /var\(--klyro-brand\)/)
assert.match(packGenCss, /pack-gen-suggestion-backdrop/)
assert.doesNotMatch(packGenCss, /body::before/)
assert.doesNotMatch(packGenCss, /body\s*\{[^}]*overflow:\s*hidden/s)
assert.doesNotMatch(packGenCss, /transform:\s*scale/)
assert.match(packGenCss, /\.pack-gen-prompt-panel:focus-within/)
assert.match(packGenCss, /\.pack-gen-prompt-panel\.is-generating::before/)
assert.match(packGenCss, /@media \(prefers-reduced-motion: reduce\)/)
assert.match(packGenCss, /width:\s*min\(1100px, calc\(100vw - 48px\)\)/)
assert.match(packGenCss, /height:\s*min\(680px, calc\(100dvh - 40px\)\)/)
assert.match(packGenCss, /data-view="suggestions"[^}]*overflow:\s*hidden/s)
assert.match(packGenCss, /data-view="flow-score"[^}]*overflow:\s*auto/s)
assert.match(packGenCss, /\.pack-gen-carousel-card[^}]*grid-template-columns/s)
assert.match(packGenCss, /\.pack-gen-suggestion-footer/)
assert.match(packGenCss, /z-index:\s*var\(--klyro-layer-modal\)/)
assert.match(shellSource, /--klyro-layer-header/)
assert.doesNotMatch(packGenCss, /pack-gen-card-grid|data-columns/)
for (const tab of ["Details", "Size", "Pack Setup", "Product", "Review"]) {
  assert.ok(builderModelSource.includes(`label: "${tab}"`), `Pack Spec Builder is missing the ${tab} tab.`)
}
assert.match(builderComponentSource, /Advanced Settings \{advancedSettings \? "On" : "Off"\}/)
assert.doesNotMatch(builderComponentSource, /advancedAppliedCount|Accept suggested values|Create Project and Open Cutter Studio/)
assert.doesNotMatch(builderComponentSource, /Structured Pack Specification|\["Assumptions"|\["Engine defaults"|suggested values await confirmation/)
assert.match(builderComponentSource, /\["Seal setup", sealSetup\]/)
assert.equal((builderComponentSource.match(/>Pack Spec Builder</g) ?? []).length, 1)
assert.match(builderComponentSource, />\s*Open in Cutter Studio\s*</)
assert.match(builderComponentSource, /role="alertdialog"/)
assert.match(builderComponentSource, /Discard Changes/)
assert.match(builderComponentSource, /createOrUpdateCutterFromPackGen/)
assert.match(builderComponentSource, /connectStandalonePackGenToProject/)
assert.match(builderComponentSource, /aria-label="Reclosable zip"/)
assert.match(builderComponentSource, /\["Reclosable zip", fields\.zipEnabled\.value \? "On" : "Off"\]/)
assert.match(builderComponentSource, /The Cutter could not be created:/)
assert.match(previewSource, /createCutterSpecFromConfirmedPackValues/)
assert.match(previewSource, /packModule\.render\(generated\.spec, \{ renderMode: "artwork" \}\)/)
assert.match(previewSource, /getPackGenSubstratePresentation/)
assert.doesNotMatch(packGenCss, /pack-gen-provenance\.is-(proposed|confirmed)/)
assert.match(packGenCss, /\.pack-gen-actions\s*\{[^}]*gap:\s*10px/s)
assert.doesNotMatch(builderModelSource, /featuresNotes|openingRequirements|notch|spout|valve/)
assert.match(builderModelSource, /field: "zipEnabled", label: "Reclosable zip"/)
assert.doesNotMatch(shellSource, /cutnflow_theme|cutnflow_projects_v2/)
assert.doesNotMatch(shellSource, /Alpha_Retail|Omega|Pharma|generateDieline|ManualPackGenModal|@google\/genai|Sean J\. \(Pro\)|EUW2-PROD-01/)

await import("./customise-amends.test.js")
await import("./dynamic-element-measures.test.js")
await import("./paper-strip-amends-v13.test.js")
await import("./sachet-steps.test.js")
console.log("Klyro Dashboard order, Project adapter, routes, navigation, and isolation verified")

assert.match(packGenSource, /export function mountPackGen/)
assert.doesNotMatch(navigationSource, /label: "Pack Gen"/)
const legacyEntry = await read("apps/web/src/legacyPackGen.ts")
assert.match(legacyEntry, /destination.search = window.location.search/)
assert.match(legacyEntry, /window.location.replace/)
