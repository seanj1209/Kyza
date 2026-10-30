import { liddingAroundUsage, liddingContourChanges, liddingContourHeight, liddingContourWidths, liddingMinimumSlitSize, liddingOverallRepeat, liddingPullTabAngle, liddingRepeatRows, liddingSafeAreaMaximum, liddingSlitSize, liddingUniformRepeat, setLiddingOverallRepeat, setLiddingOverallSize, updateLiddingSpec, validateLiddingSpec } from "../constraints/lidding"
import { activateLiddingLane, liddingActiveLane, liddingSynced, setLiddingSync } from "../constraints/liddingSteps"
import { loadLiddingGrowthBehavior, saveLiddingGrowthBehavior } from "../kyza/account/preferenceService"
import type { FlowwrapSpec, LiddingSpec } from "../types/flowwrap"
import "./liddingStudio.css"
import "./packDockSync.css"

type ChangeHandler = (next: FlowwrapSpec) => void
const field = (label: string, value: number, onChange: (value: number) => boolean | void, step = .5) => {
  const row = document.createElement("label")
  row.textContent = label
  const input = document.createElement("input")
  input.type = "number"; input.min = "0"; input.step = String(step); input.value = String(value)
  input.setAttribute("aria-label", label)
  input.addEventListener("change", () => {
    if (!Number.isFinite(input.valueAsNumber) || onChange(input.valueAsNumber) === false) input.value = String(value)
  })
  row.append(input)
  return row
}

/** UI shows absolute contour sizes; the lidding model owns their stored offsets. */
function contourFields(container: HTMLElement, lid: LiddingSpec, update: (changes: Partial<LiddingSpec>) => boolean | void, suffix = "") {
  const widths = liddingContourWidths(lid)
  const unit = lid.style === "round" ? "diameter" : "width"
  const add = (label: string, width: number, key: "outerBleed" | "sealOuter" | "sealInner", outer: number) => {
    const row = field(`${label} ${unit}${suffix}`, width, value => update(liddingContourChanges(lid, key, value)))
    row.querySelector("input")!.max = String(outer)
    if (lid.style !== "round") {
      const height = document.createElement("small")
      height.textContent = `Overall height ${liddingContourHeight(lid, width)} mm`
      row.append(height)
    }
    container.append(row)
  }
  add("Outer bleed", widths.outerBleed, "outerBleed", lid.outerCutWidth)
  add("Outer seal", widths.outerSeal, "sealOuter", widths.outerBleed)
  add("Inner bleed", widths.innerBleed, "sealInner", widths.outerSeal)
}

/** Compact clockwise position control; the model remains the source of truth. */
function pullTabPosition(angle: number, update: (angle: number) => boolean | void) {
  const control = document.createElement("div")
  control.className = "lidding-tab-position"
  const wheel = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  wheel.setAttribute("viewBox", "0 0 88 88")
  wheel.setAttribute("role", "slider")
  wheel.setAttribute("aria-label", "Pull tab angle")
  wheel.setAttribute("aria-valuemin", "0")
  wheel.setAttribute("aria-valuemax", "359")
  wheel.setAttribute("tabindex", "0")
  const circle = document.createElementNS(wheel.namespaceURI, "circle")
  circle.setAttribute("cx", "44"); circle.setAttribute("cy", "44"); circle.setAttribute("r", "30")
  const dot = document.createElementNS(wheel.namespaceURI, "circle")
  dot.setAttribute("r", "5"); dot.setAttribute("class", "lidding-tab-position-dot")
  const readout = document.createElementNS(wheel.namespaceURI, "text")
  readout.setAttribute("x", "44"); readout.setAttribute("y", "48")
  readout.setAttribute("text-anchor", "middle")
  wheel.append(circle, dot, readout)
  const number = field("Pull tab position (°)", angle, value => update(value), 1)
  const input = number.querySelector("input")!
  input.min = "0"; input.max = "359"
  const hint = document.createElement("small")
  hint.textContent = "0° top · clockwise"
  number.append(hint)
  const show = (value: number) => {
    const degrees = ((Math.round(value) % 360) + 360) % 360
    const radians = degrees * Math.PI / 180
    dot.setAttribute("cx", String(44 + 30 * Math.sin(radians)))
    dot.setAttribute("cy", String(44 - 30 * Math.cos(radians)))
    readout.textContent = `${degrees}°`
    wheel.setAttribute("aria-valuenow", String(degrees))
    input.value = String(degrees)
    return degrees
  }
  show(angle)
  const fromPointer = (event: PointerEvent) => {
    const rect = wheel.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    return show(Math.atan2(dx, -dy) * 180 / Math.PI)
  }
  let dragging = false, nextAngle = angle
  wheel.addEventListener("pointerdown", event => {
    dragging = true
    wheel.setPointerCapture(event.pointerId)
    nextAngle = fromPointer(event)
    event.preventDefault()
  })
  wheel.addEventListener("pointermove", event => { if (dragging) nextAngle = fromPointer(event) })
  wheel.addEventListener("pointerup", event => {
    if (!dragging) return
    dragging = false
    nextAngle = fromPointer(event)
    update(nextAngle)
  })
  wheel.addEventListener("pointercancel", () => { dragging = false; show(angle) })
  wheel.addEventListener("keydown", event => {
    const next = event.key === "Home" ? 0 : event.key === "End" ? 359
      : event.key === "ArrowRight" || event.key === "ArrowUp" ? angle + 1
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? angle - 1 : null
    if (next === null) return
    event.preventDefault()
    update(show(next))
  })
  control.append(wheel, number)
  return control
}

export function openLiddingSetup(host: HTMLElement, spec: FlowwrapSpec, apply: ChangeHandler) {
  if (!spec.lidding) return () => {}
  const overlay = document.createElement("div")
  overlay.className = "lidding-setup-overlay"
  const dialog = document.createElement("section")
  dialog.className = "lidding-setup"
  dialog.setAttribute("role", "dialog")
  dialog.setAttribute("aria-modal", "true")
  dialog.setAttribute("aria-label", "Lidding cutter setup")
  const title = document.createElement("h2")
  title.textContent = "Lidding Style"
  const styles = document.createElement("div")
  styles.className = "lidding-setup-choices"
  const styleIcons = {
    plain: '<rect x="4" y="4" width="36" height="36" rx="2"/>',
    square: '<rect x="4" y="4" width="36" height="36" rx="9"/>',
    round: '<circle cx="22" cy="22" r="18"/>',
  }
  for (const [style, label] of [["plain", "Plain lid"], ["square", "Square lid"], ["round", "Round lid"]] as const) {
    const button = document.createElement("button")
    button.type = "button"; button.className = "lidding-style-card"; button.setAttribute("aria-label", label); button.title = label
    button.innerHTML = `<svg viewBox="0 0 52 58" aria-hidden="true"><rect class="lidding-style-cutter" x="3" y="3" width="46" height="52" rx="3"/><g class="lidding-style-lid" transform="translate(4 8)" fill="none" stroke="currentColor" stroke-width="2.2">${styleIcons[style]}</g></svg><span>${label}</span>`
    button.addEventListener("click", () => {
      const next = updateLiddingSpec(spec, { style, mode: "auto", pullTab: style !== "plain" })
      overlay.remove()
      apply(next)
    })
    styles.append(button)
  }
  dialog.append(title, styles)
  overlay.append(dialog)
  host.append(overlay)
  styles.querySelector<HTMLButtonElement>("button")?.focus()
  return () => overlay.remove()
}

export function attachLiddingDock(host: HTMLElement, spec: FlowwrapSpec, apply: ChangeHandler, baseHost?: HTMLElement) {
  if (!spec.lidding) return () => {}
  const lid = spec.lidding
  const dock = document.createElement("section")
  dock.className = "lidding-dock"
  dock.setAttribute("aria-label", "Lid dock")
  const heading = document.createElement("h2")
  heading.textContent = "Lid dock"
  const sync = document.createElement("button")
  sync.type = "button"
  sync.className = "lidding-sync pack-dock-sync"
  sync.textContent = liddingSynced(spec) ? "SYNC ON" : "SYNC OFF"
  sync.setAttribute("aria-label", "Sync lidding cutter elements")
  sync.setAttribute("aria-pressed", String(liddingSynced(spec)))
  sync.title = "Mirror 1A elements across; sizes always stay linked"
  sync.addEventListener("click", () => apply(setLiddingSync(spec, !liddingSynced(spec))))
  const toggle = document.createElement("button")
  toggle.type = "button"
  toggle.className = "lidding-dock-toggle"
  const tray = document.createElement("div")
  tray.className = "lidding-dock-tray"
  let open = true
  try { open = sessionStorage.getItem("kyza.lidding-dock-open") !== "false" } catch {}
  const refresh = () => {
    tray.hidden = !open
    toggle.textContent = open ? "⌃" : "⌄"
    toggle.setAttribute("aria-expanded", String(open))
    toggle.setAttribute("aria-label", open ? "Collapse Lid dock" : "Expand Lid dock")
  }
  toggle.addEventListener("click", () => {
    open = !open
    try { sessionStorage.setItem("kyza.lidding-dock-open", String(open)) } catch {}
    refresh()
  })
  refresh()
  const feedback = document.createElement("p")
  feedback.className = "lidding-dock-feedback"
  feedback.setAttribute("role", "status")
  const update = (changes: Partial<LiddingSpec>) => {
    const source = changes.across !== undefined && changes.across <= liddingActiveLane(spec)
      ? activateLiddingLane(spec, 0) : spec
    const next = updateLiddingSpec(source, changes)
    const errors = validateLiddingSpec(next).errors
    if (errors.length) { feedback.textContent = `Flow · ${errors.join(" ")}`; return false }
    apply(next)
    return true
  }
  const dimensions = document.createElement("div")
  dimensions.className = "lidding-dock-fields"
  dimensions.append(field(lid.style === "round" ? "Outer cutter diameter" : "Outer cutter width", lid.outerCutWidth, value => update({ outerCutWidth: value })))
  if (lid.style !== "round") dimensions.append(field("Outer cutter height", lid.outerCutHeight, value => update({ outerCutHeight: value })))
  contourFields(dimensions, lid, update)
  const safeArea = field("Artwork safe area", lid.artworkSafeArea, value => update({ artworkSafeArea: value }))
  safeArea.querySelector("input")!.max = String(liddingSafeAreaMaximum(lid))
  dimensions.append(safeArea)
  const addCheck = (container: HTMLElement, label: string, checked: boolean, action: (checked: boolean) => void) => {
    const row = document.createElement("label")
    row.className = "lidding-check"
    const input = document.createElement("input")
    input.type = "checkbox"; input.checked = checked
    input.addEventListener("change", () => action(input.checked))
    row.append(input, document.createTextNode(label))
    container.append(row)
  }
  if (lid.style !== "plain") {
    addCheck(dimensions, "Pull Tab", lid.pullTab, value => update({ pullTab: value }))
    if (lid.pullTab) dimensions.append(pullTabPosition(liddingPullTabAngle(lid), value => update({ pullTabAngle: value })))
  }
  const size = liddingSlitSize(lid, spec.eyeMarks)
  const stepping = document.createElement("div")
  stepping.className = "lidding-dock-fields lidding-dock-stepping"
  stepping.append(field("Across", lid.across, value => update({ across: value }), 1))
  stepping.append(field("Around", lid.around, value => update({ around: value }), 1))
  if (lid.style !== "plain") addCheck(stepping, "Inner Lines", lid.innerLines, value => update({ innerLines: value }))
  const repeatModes = document.createElement("div")
  repeatModes.className = "lidding-repeat-modes"
  repeatModes.setAttribute("role", "group")
  repeatModes.setAttribute("aria-label", "Repeat type")
  for (const [mode, label] of [["uniform", "Uniformed"], ["compensated", "Compensated Repeat"]] as const) {
    const button = document.createElement("button")
    button.type = "button"; button.textContent = label
    button.setAttribute("aria-pressed", String((lid.repeatMode ?? "uniform") === mode))
    button.addEventListener("click", () => update({ repeatMode: mode }))
    repeatModes.append(button)
  }
  stepping.append(repeatModes)
  if (lid.repeatMode === "compensated") {
    const baseRepeat = liddingUniformRepeat(lid, spec.eyeMarks)
    const total = field("Overall repeat (mm)", liddingOverallRepeat(lid, spec.eyeMarks), value => {
      const next = setLiddingOverallRepeat(spec, value)
      const errors = validateLiddingSpec(next).errors
      if (errors.length) { feedback.textContent = `Flow · ${errors.join(" ")}`; return false }
      apply(next)
      return true
    })
    total.querySelector("input")!.min = String(baseRepeat)
    stepping.append(total)
    const choice = document.createElement("label")
    choice.textContent = "Larger repeat (top = 1)"
    const select = document.createElement("select")
    select.setAttribute("aria-label", "Larger repeat")
    for (let row = 1; row <= lid.around; row++) {
      const option = document.createElement("option")
      option.value = String(row); option.textContent = row === 1 ? "1 · top" : String(row)
      select.append(option)
    }
    select.value = String(lid.compensatedRow ?? 1)
    select.addEventListener("change", () => update({ compensatedRow: Number(select.value) }))
    choice.append(select)
    stepping.append(choice)
    const note = document.createElement("small")
    note.className = "lidding-repeat-note"
    note.textContent = `${lid.around - 1} × ${size.height} mm + 1 × ${liddingRepeatRows(lid, spec.eyeMarks)[(lid.compensatedRow ?? 1) - 1]?.height ?? size.height} mm`
    stepping.append(note)
  }
  // Overall slit/cutter size is its own dimension: changing it never resizes
  // the lid's outer cut; extra space sits between the eyemarks and the lid.
  const least = liddingMinimumSlitSize(lid, spec.eyeMarks)
  const overall = document.createElement("div")
  overall.className = "lidding-dock-fields lidding-base-overall"
  overall.setAttribute("aria-label", "Overall cutter (slit)")
  const overallHeading = document.createElement("h3")
  overallHeading.textContent = "Overall cutter (slit)"
  const setOverall = (changes: { width?: number; height?: number }) => {
    const commit = (scale: boolean, remember = false) => {
      const next = setLiddingOverallSize(spec, changes, scale)
      const errors = validateLiddingSpec(next).errors
      if (errors.length) { feedback.textContent = `Flow · ${errors.join(" ")}`; return false }
      if (remember) saveLiddingGrowthBehavior(scale ? "scale" : "keep")
      apply(next)
      return true
    }
    const current = changes.width !== undefined ? size.width : size.height
    const requested = changes.width ?? changes.height ?? current
    if (requested <= current) return commit(false)
    const savedChoice = loadLiddingGrowthBehavior()
    if (savedChoice !== "ask") return commit(savedChoice === "scale")
    const existing = host.querySelector(".lidding-resize-overlay")
    existing?.remove()
    const overlay = document.createElement("div")
    overlay.className = "lidding-setup-overlay lidding-resize-overlay"
    const dialog = document.createElement("section")
    dialog.className = "lidding-setup lidding-resize-dialog"
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    dialog.setAttribute("aria-label", "Resize lidding cutter")
    const heading = document.createElement("h2")
    heading.innerHTML = '<span class="lidding-resize-symbol" aria-hidden="true">↗</span> Larger cutter'
    const note = document.createElement("p")
    note.textContent = `Increase ${changes.width !== undefined ? "width" : "height"} from ${current} to ${requested} mm. Choose how the lid responds.`
    const remember = document.createElement("label")
    remember.className = "lidding-resize-remember"
    const rememberCheck = document.createElement("input")
    rememberCheck.type = "checkbox"
    remember.append(rememberCheck, document.createTextNode("Remember this choice"))
    const choices = document.createElement("div")
    choices.className = "lidding-setup-choices"
    for (const [label, scale] of [["Keep lid config", false], ["Scale lid config", true]] as const) {
      const button = document.createElement("button")
      button.type = "button"; button.textContent = label
      button.addEventListener("click", () => { if (commit(scale, rememberCheck.checked)) overlay.remove() })
      choices.append(button)
    }
    const cancel = document.createElement("button")
    cancel.type = "button"; cancel.innerHTML = '<span aria-hidden="true">×</span> Cancel'
    cancel.addEventListener("click", () => overlay.remove())
    choices.append(cancel)
    dialog.append(heading, note, choices, remember)
    overlay.append(dialog)
    host.append(overlay)
    choices.querySelector("button")?.focus()
    return false
  }
  const overallWidth = field("Overall cutter width", size.width, value => setOverall({ width: value }))
  const overallHeight = field("Overall cutter height", size.height, value => setOverall({ height: value }))
  const bands = liddingMinimumSlitSize({ ...lid, outerCutWidth: 0, outerCutHeight: 0 }, spec.eyeMarks)
  overallWidth.querySelector("input")!.min = String(bands.width + .1)
  overallHeight.querySelector("input")!.min = String(bands.height + .1)
  overall.append(overallHeading, overallWidth, overallHeight)
  const minimum = document.createElement("p")
  minimum.textContent = `Min cutter width ${least.width} mm · Min cutter height ${least.height} mm · Around ${liddingAroundUsage(lid)} mm / 790 mm · Overall repeat ${liddingOverallRepeat(lid, spec.eyeMarks)} mm`
  minimum.className = "lidding-dock-minimum"
  overall.append(minimum)
  baseHost?.prepend(overall)
  const tabs = document.createElement("div")
  tabs.className = "lidding-dock-tabs"
  tabs.setAttribute("aria-label", "Lid steps")
  for (let column = 0; column < lid.across; column++) {
    const id = `${column + 1}A`
    const button = document.createElement("button")
    button.type = "button"; button.textContent = id
    button.setAttribute("aria-pressed", String((lid.activeStep ?? "1A") === id))
    button.disabled = liddingSynced(spec) && column > 0
    button.title = button.disabled ? "Mirrors 1A while Sync is on" : `Edit cutter ${id}; repeats below follow it`
    button.addEventListener("click", () => apply(activateLiddingLane(spec, column)))
    tabs.append(button)
  }
  stepping.append(tabs)
  const navigation = document.createElement("div")
  navigation.className = "lidding-dock-navigation"
  navigation.setAttribute("role", "tablist")
  navigation.setAttribute("aria-label", "Lid dock sections")
  let activeTab: "config" | "stepping" = "config"
  try { activeTab = sessionStorage.getItem("kyza.lidding-dock-tab") === "stepping" ? "stepping" : "config" } catch {}
  const selectTab = (tab: "config" | "stepping") => {
    activeTab = tab
    dimensions.hidden = tab !== "config"
    stepping.hidden = tab !== "stepping"
    navigation.querySelectorAll<HTMLButtonElement>("button").forEach(button => button.setAttribute("aria-selected", String(button.dataset.tab === tab)))
    try { sessionStorage.setItem("kyza.lidding-dock-tab", tab) } catch {}
  }
  for (const [tab, label] of [["config", "Lid Config"], ["stepping", "Stepping"]] as const) {
    const button = document.createElement("button")
    button.type = "button"; button.textContent = label; button.dataset.tab = tab
    button.setAttribute("role", "tab")
    button.addEventListener("click", () => selectTab(tab))
    navigation.append(button)
  }
  selectTab(activeTab)
  const header = document.createElement("div")
  header.className = "lidding-dock-header"
  header.append(heading, sync, toggle)
  tray.append(navigation, dimensions, stepping, feedback)
  dock.append(header, tray)
  host.append(dock)
  return () => { dock.remove(); overall.remove() }
}
