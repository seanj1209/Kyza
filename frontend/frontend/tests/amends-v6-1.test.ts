import {
  outlinePathData,
  resolveKSealGussetOutline,
  resolveKSealGussetPieces,
  type OutlinePoint
} from "../apps/web/src/geometry/kSealGussetOutline"
import { resolveKSealPouchGeometry } from "../apps/web/src/geometry/kSealPouchGeometry"
import {
  createBaseSpecDefaults,
  createDoyPouchDefaults,
  createKSealDefaults
} from "../apps/web/src/core/model/parameterSchema"
import {
  KSEAL_GUSSET_FILL_DEFAULTS,
  KSEAL_GUSSET_OUTLINE_DEFAULTS,
  KSEAL_SIDE_SEAL_DEFAULTS,
  LINE_STYLE_DASH,
  appearanceTargetsFor,
  availableAppearanceTargets
} from "../apps/web/src/renderers/elementAppearance"
import { resolveBaseCustomisation } from "../apps/web/src/renderers/baseLayerCustomisation"
import {
  DEFAULT_PREFERENCES,
  KYZA_PREFERENCES_KEY,
  loadMoveIncrementMm,
  loadPreferences,
  savePreferences
} from "../apps/web/src/kyza/account/preferenceService"
import {
  isOnMoveGrid,
  snapMoveCoordinate,
  snapMoveWithin,
  snapMovedElement
} from "../apps/web/src/ui/movementSnap"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

function kSealSpec(overrides: Record<string, unknown> = {}): FlowwrapSpec {
  return {
    ...createBaseSpecDefaults({ width: 480, height: 190, seal: 7.5 }, { includeBleed: false, includeSealClearance: false }),
    kSealPouch: createKSealDefaults({ trimEnabled: false, ...overrides } as never)
  } as FlowwrapSpec
}

// ── Geometry helpers ──────────────────────────────────────────
type Poly = OutlinePoint[]
const area = (p: Poly) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a.x * b.y - b.x * a.y }, 0) / 2
const inside = (pt: OutlinePoint, poly: Poly) => {
  const p = area(poly) < 0 ? [...poly].reverse() : poly
  return p.every((a, i) => {
    const b = p[(i + 1) % p.length]
    return (b.x - a.x) * (pt.y - a.y) - (b.y - a.y) * (pt.x - a.x) >= -1e-7
  })
}
const segments = (points: OutlinePoint[]) => points.slice(1).map((p, i) => [points[i], p] as const)
function properCross(a: OutlinePoint, b: OutlinePoint, c: OutlinePoint, d: OutlinePoint) {
  const o = (p: OutlinePoint, q: OutlinePoint, r: OutlinePoint) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d)
  return d1 * d2 < -1e-9 && d3 * d4 < -1e-9
}

/** Every outline invariant the brief asks for, for any parameter set. */
function checkOutline(spec: FlowwrapSpec, label: string) {
  const geometry = resolveKSealPouchGeometry(spec)
  const outline = resolveKSealGussetOutline(geometry)
  const pieces = resolveKSealGussetPieces(geometry)
  assert(outline.paths.length > 0, `${label}: an outline is drawn`)
  assert(close(outline.liveTop, geometry.sideSeal) && close(outline.liveBottom, geometry.height - geometry.sideSeal), `${label}: live band is between the side seals`)
  outline.paths.forEach((path, index) => {
    assert(path.points.length >= 2, `${label}: path ${index} has at least one segment`)
    path.points.forEach(p => {
      assert(p.y >= outline.liveTop - 1e-6 && p.y <= outline.liveBottom + 1e-6, `${label}: outline point ${p.x},${p.y} stays out of the side seals`)
      assert(p.x >= -1e-6 && p.x <= geometry.width + 1e-6, `${label}: outline stays inside the cutter`)
    })
    segments(path.points).forEach(([a, b]) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const n = { x: (b.y - a.y) / len, y: -(b.x - a.x) / len }
      const sideA = pieces.some(poly => inside({ x: mid.x + n.x * 1e-3, y: mid.y + n.y * 1e-3 }, poly))
      const sideB = pieces.some(poly => inside({ x: mid.x - n.x * 1e-3, y: mid.y - n.y * 1e-3 }, poly))
      assert(sideA !== sideB, `${label}: segment ${a.x},${a.y} → ${b.x},${b.y} lies on the gusset fill edge`)
    })
  })
  // Outline paths never cross one another (the chevron must not form an X).
  outline.paths.forEach((p, i) => outline.paths.forEach((q, j) => {
    if (j <= i) return
    segments(p.points).forEach(([a, b]) => segments(q.points).forEach(([c, d]) => {
      assert(!properCross(a, b, c, d), `${label}: outline paths ${i} and ${j} do not cross`)
    }))
  }))
  assert(outlinePathData(outline.paths[0], 80, 80).startsWith("M "), `${label}: path data is emitted`)
  return { geometry, outline }
}

// ── 1. Outline geometry: the yellow edges, outside the side seals ──
{
  const { geometry, outline } = checkOutline(kSealSpec(), "default")
  assert(outline.paths.length === 4, "Default K Seal draws four outline paths (outer + inner per side)")
  const find = (side: string, edge: string) => outline.paths.find(p => p.side === side && p.edge === edge)!
  ;(["left", "right"] as const).forEach(side => (["outer", "inner"] as const).forEach(edge => {
    assert(Boolean(find(side, edge)), `Default outline has a ${side} ${edge} path`)
    assert(!find(side, edge).closed, `${side} ${edge} path is open (it stops at both side seals)`)
  }))
  const fold = geometry.leftFoldX, bs = geometry.bottomSeal
  const leftOuter = find("left", "outer"), leftInner = find("left", "inner")
  assert(leftOuter.points.some(p => close(p.x, fold - bs)), "Left outer edge follows the bottom-seal outer edge")
  assert(leftInner.points.some(p => close(p.x, fold + bs)), "Left inner edge follows the bottom-seal inner edge")
  ;[leftOuter, leftInner].forEach(path => {
    const ys = path.points.map(p => p.y)
    assert(close(Math.min(...ys), geometry.sideSeal) && close(Math.max(...ys), geometry.height - geometry.sideSeal),
      "Each edge runs from the top side seal to the bottom side seal and no further")
  })
  // Outer edge starts on the outer K-arm's outer boundary at the seal line.
  const arm = geometry.armLines.find(a => a.side === "top-left" && a.position === "outer")!
  const len = Math.hypot(arm.endX - arm.startX, arm.endY - arm.startY)
  const start = leftOuter.points[0].y < leftOuter.points[leftOuter.points.length - 1].y ? leftOuter.points[0] : leftOuter.points[leftOuter.points.length - 1]
  const distance = Math.abs((arm.endY - arm.startY) * (start.x - arm.startX) - (arm.endX - arm.startX) * (start.y - arm.startY)) / len
  assert(close(distance, geometry.armWidth / 2, 1e-4), "Outer outline sits on the arm's outer edge, half an arm width from its centreline")
  // Inner edges start either side of the centre fold at the seal line (as in the PDF).
  const innerTop = leftInner.points.reduce((a, b) => (b.y < a.y ? b : a))
  assert(innerTop.x < geometry.centerX && close(innerTop.y, geometry.sideSeal), "Inner chevron edge meets the side seal just left of the centre fold")
}

// Wide arms push the chevron apex below the side seal: the inner edges must meet, not cross.
{
  const { outline } = checkOutline(kSealSpec({ armWidth: 20, sideSeal: 5 }), "apex below seal")
  assert(outline.paths.some(p => p.edge === "inner" && p.side === "both"), "Inner edges join at the chevron apex when it lies below the side seal")
}

// Parameter sweep — invariants must hold across the editable ranges.
let sweep = 0
for (const armDegree of [30, 45, 60])
  for (const armWidth of [5, 7.5, 12, 20])
    for (const bottomSeal of [2, 7.5, 12])
      for (const sideSeal of [5, 7.5, 20])
        for (const gussetSize of [25, 40, 60])
          for (const trimEnabled of [false, true]) {
            checkOutline(kSealSpec({ armDegree, customArmDegreeEnabled: true, armWidth, bottomSeal, sideSeal, gussetSize, trimEnabled }),
              `deg ${armDegree} arm ${armWidth} bottom ${bottomSeal} side ${sideSeal} gusset ${gussetSize} trim ${trimEnabled}`)
            sweep += 1
          }
assert(sweep === 648, "Parameter sweep covered every combination")

// ── 2. Styling ownership ──────────────────────────────────────
{
  const kSeal = kSealSpec()
  const targets = appearanceTargetsFor(kSeal)
  const outline = targets.find(t => t.id === "gusset")!
  const fill = targets.find(t => t.id === "gusset-seals")!
  assert(outline.feature?.id === "gusset" && outline.feature.part === "Outline", "K Seal outline belongs to the Gusset feature")
  assert(fill.feature?.id === "gusset" && fill.feature.part === "Fill", "K Seal fill belongs to the Gusset feature")
  assert(fill.defaults.color.toLowerCase() === "#2e8b57" && fill.defaults.opacity === .32 && fill.defaults.fill === "solid", "Gusset fill default: #2E8B57, 32%, solid")
  assert(outline.defaults.color === "#188b54" && outline.defaults.opacity === .7 && outline.defaults.lineStyle === "dotted", "Gusset outline default: #188b54, 70%, dotted")
  assert(outline.defaults === KSEAL_GUSSET_OUTLINE_DEFAULTS && fill.defaults === KSEAL_GUSSET_FILL_DEFAULTS, "Customise and renderer share one source of defaults")
  assert(LINE_STYLE_DASH[outline.defaults.lineStyle] === ".5 1.5", "Dotted maps to the shared dash pattern")
  assert(outline.selector.includes("kseal-gusset-outline") && !outline.selector.includes("seal-visual") && !outline.selector.includes("kseal-inner-arm-guide"),
    "Outline styles only outline geometry (no fills, no removed inner-arm guides)")
  assert(fill.selector === '[data-role="kseal-gusset-seal-visual"]', "Fill styles only the gusset seal visual")
  assert(!outline.selector.includes("kseal-side-seal") && !fill.selector.includes("kseal-side-seal"), "Gusset never styles the side seals")
  const available = availableAppearanceTargets(kSeal).map(t => t.id)
  assert(available.includes("gusset") && available.includes("gusset-seals"), "Both gusset parts are available on K Seal")
  const seals = resolveBaseCustomisation(kSeal).seals
  assert(seals.color === KSEAL_SIDE_SEAL_DEFAULTS.color && seals.color === "#2eb774" && seals.opacity === .32 && seals.style === "default",
    "K Seal side seals belong to Seals customise: #2eb774, 32%, solid")

  const doy = { ...createBaseSpecDefaults({ width: 300, height: 250, seal: 7.5 }), doyPouch: createDoyPouchDefaults({}) } as FlowwrapSpec
  const doyTargets = appearanceTargetsFor(doy)
  assert(doyTargets.find(t => t.id === "gusset")!.name === "Gusset guides" && !doyTargets.find(t => t.id === "gusset")!.feature,
    "DOY keeps its separate Gusset guides target")
  assert(doyTargets.find(t => t.id === "gusset-seals")!.name === "Gusset Seals" && !doyTargets.find(t => t.id === "gusset-seals")!.feature,
    "DOY keeps its separate Gusset Seals target")
  assert(resolveBaseCustomisation(doy).seals.color === "#2e8b57", "DOY seal default is unchanged")
}

// ── 3. Quarter-millimetre movement ────────────────────────────
{
  const q = (v: number) => snapMoveCoordinate(v, .25)
  assert(q(9.4) === 9.5 && q(9.65) === 9.75 && q(9.9) === 10 && q(10.15) === 10.25, "Coordinates round to the nearest quarter millimetre")
  assert(q(9.25) === 9.25 && q(9.5) === 9.5 && q(9.75) === 9.75 && q(10) === 10, "Quarter values are kept")
  // The rejected 6.1 attempt snapped the delta, so 9.4 + 0.25 became 9.65.
  assert(q(9.4 + .25) === 9.75 && isOnMoveGrid(q(9.4 + .25)), "An off-grid start plus a quarter step still lands on the grid")
  assert(Object.is(q(-.1), 0), "No negative zero")
  for (let origin = 0; origin < 3; origin += .07)
    for (let delta = -2; delta < 2; delta += .13)
      assert(isOnMoveGrid(q(origin + delta)), `Drag from ${origin} by ${delta} lands on the grid`)
  assert(snapMoveCoordinate(9.4, .5) === 9.5 && snapMoveCoordinate(9.4, 1) === 9, "Coarser preference steps snap to their own grid")
  assert(snapMoveWithin(130, 0, 123.4, 100, .25) === 123.25, "Bounds that are off-grid stop on the nearest quarter inside")
  assert(snapMoveWithin(-3, .1, 50, 10, .25) === .25, "Lower bound steps inwards to the grid")
  assert(snapMoveWithin(5.2, 5.1, 5.2, 5.15, .25) === 5.2, "When no grid point fits, the constraint still wins")
  const constrained = snapMovedElement({ x: 40.4, y: 12.1, keep: "label" }, ["x", "y"],
    p => ({ ...p, x: Math.min(p.x, 33.4) }), { x: 20, y: 12, keep: "label" }, .25)
  assert(constrained.x === 33.25 && constrained.y === 12 && constrained.keep === "label", "Element constraints and untouched fields are respected")
}

// ── 4. Cutter Preferences ─────────────────────────────────────
{
  const memory = (initial?: object) => {
    const data = new Map<string, string>(initial ? [[KYZA_PREFERENCES_KEY, JSON.stringify(initial)]] : [])
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
  }
  assert(DEFAULT_PREFERENCES.moveIncrementMm === .25, "Mouse movement defaults to 0.25 mm")
  assert(DEFAULT_PREFERENCES.nudgeIncrementMm === .5, "Arrow-key nudge default is unchanged")
  const legacy = loadPreferences(memory({ ...DEFAULT_PREFERENCES, moveIncrementMm: undefined, nudgeIncrementMm: 1 }))
  assert(legacy.ok && legacy.value.moveIncrementMm === .25 && legacy.value.nudgeIncrementMm === 1, "Saved preferences from before 6.1 gain the 0.25 mm default")
  assert(loadMoveIncrementMm(memory({ ...DEFAULT_PREFERENCES, moveIncrementMm: 1 })) === 1, "A chosen movement step is read back")
  assert(!loadPreferences(memory({ ...DEFAULT_PREFERENCES, moveIncrementMm: .4 })).ok, "Invalid movement steps are rejected on load")
  assert(!savePreferences({ ...DEFAULT_PREFERENCES, moveIncrementMm: .4 as never }, memory()).ok, "Invalid movement steps are rejected on save")
  assert(loadMoveIncrementMm(null) === .25, "Without storage the default applies")
}

console.log(`AMENDS 6.1 tests passed (${sweep} outline parameter sets).`)
