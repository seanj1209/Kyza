import { createPackValidator } from "../apps/web/src/engines/validation-engine/createPackValidator"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { plainFilmPack } from "../apps/web/src/packs/amends7Packs"
import { projectFromLegacySpec } from "../packages/cutter-engine/project"
import { validateForExport, validateProjectCutter, getValidationDebugSnapshot } from "../packages/cutter-engine/validation"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const validate = createPackValidator("plain-web")

function expectError(spec: FlowwrapSpec, contains: string) {
  const result = validate(spec)
  assert(
    result.errors.some(error => error.includes(contains)),
    `Expected error containing "${contains}", got: ${result.errors.join("; ")}`
  )
}

function expectNoErrors(spec: FlowwrapSpec) {
  const result = validate(spec)
  assert(result.errors.length === 0, result.errors.join("; "))
}

const baseSpec: FlowwrapSpec = {
  width: 460,
  height: 160,
  seal: 0,
  sealClearance: 0,
  bleed: 3,
  seals: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  plainWeb: {
    guideLines: []
  }
}

expectNoErrors(baseSpec)
expectNoErrors({
  ...baseSpec,
  plainWeb: {
    guideLines: [
      {
        id: "slit-left",
        kind: "slit",
        orientation: "vertical",
        offset: 110
      }
    ]
  }
})

expectError({ ...baseSpec, width: -1 }, "Width must be greater than 0mm")
expectError(
  {
    ...baseSpec,
    plainWeb: {
      guideLines: [
        {
          id: "bad-slit",
          kind: "slit",
          orientation: "vertical",
          offset: 1000
        }
      ]
    }
  },
  "offset must be inside the live area"
)

console.log("Plain web validation tests passed.")

// PDF item 1: Plain Film permits optional seals and unrestricted in-cutter eyemarks.
const film = plainFilmPack.getDefaults()
const exportResult = (packType: string, spec: FlowwrapSpec) => validateForExport(projectFromLegacySpec(packType, "PDF item 1", spec))
for (const seals of [
  { top: 0, bottom: 0, left: 0, right: 0 },
  { top: 8, bottom: 0, left: 5, right: 0 },
  { top: 8, bottom: 8, left: 8, right: 8 },
]) {
  for (const seal of [0, 8]) {
    const spec = { ...film, seal, seals }
    assert(plainFilmPack.validate(spec).errors.length === 0, `Film module rejected optional seals: ${JSON.stringify(spec)}`)
    assert(exportResult("plain-film", spec).valid, "Valid film seals must not block export")
  }
}
for (const position of ["top-left", "top-right", "bottom-left", "bottom-right", "centre-left", "centre-right", "centre"] as const) {
  const spec: FlowwrapSpec = { ...film, eyeMarks: { ...film.eyeMarks!, count: 1, position } }
  const result = exportResult("plain-film", spec)
  assert(result.valid, `${position} must be valid: ${JSON.stringify(result.messages)}`)
  assert(!result.messages.some(message => message.code.endsWith("UNRESOLVED") && message.code.startsWith("EYEMARK")), "Film eyemark geometry is fully resolved")
  const debug = getValidationDebugSnapshot(projectFromLegacySpec("plain-film", "Film debug", spec))
  assert(debug.eyemarks[0].definite && debug.eyemarks[0].resolvedAllowedZone?.width === film.width, "Debug must expose the whole cutter as the allowed zone")
}
for (const position of ["top", "bottom", "centre"] as const) {
  const spec: FlowwrapSpec = { ...film, seal: 5, seals: { top: 5, bottom: 5, left: 5, right: 5 }, eyeMarks: { ...film.eyeMarks!, count: 2, position, offsetX: 30, offsetY: position === "bottom" ? -30 : 30, offsetX2: -40, offsetY2: position === "bottom" ? -40 : 40 } }
  assert(exportResult("plain-film", spec).valid, "Both marks may sit outside seals, inside the cutter")
  const run = validateProjectCutter(projectFromLegacySpec("plain-film", "Film pre-export", spec))
  assert(!run.summary.blocksExport, `Production validation rejected film: ${JSON.stringify(run.issues)}`)
}
for (const [spec, code] of [
  [{ ...film, width: 0 }, "CUTTER_DIMENSIONS_INVALID"],
  [{ ...film, seals: { ...film.seals!, left: -1 } }, "SEAL_INVALID_DIMENSION"],
  [{ ...film, seals: { ...film.seals!, left: film.width } }, "SEAL_LIVE_AREA_IMPOSSIBLE"],
  [{ ...film, eyeMarks: { ...film.eyeMarks!, count: 1 as const, width: 0 } }, "EYEMARK_SIZE_INVALID"],
  [{ ...film, eyeMarks: { ...film.eyeMarks!, count: 2 as const, position: "top" as const, width2: 0 } }, "EYEMARK_SIZE_INVALID"],
  [{ ...film, eyeMarks: { ...film.eyeMarks!, count: 1 as const, offsetX: film.width } }, "EYEMARK_OUTSIDE_CUTTER"],
] as const) {
  const result = exportResult("plain-film", spec)
  assert(!result.valid && result.messages.some(message => message.code === code), `Invalid film must still report ${code}`)
}
const plainFilmInvalidSeal = { ...film, seal: -1 }
assert(plainFilmPack.validate(plainFilmInvalidSeal).errors.length > 0, "Invalid base seals must not be normalized away")
for (const seals of [undefined, { top: 0, bottom: 0, left: 0, right: 0 }, { top: 5, bottom: 0, left: 0, right: 0 }]) {
  const spec: FlowwrapSpec = { ...film, seals, plainWeb: undefined, paperStrip: { stepping: { stepCount: 1, gap: 0 } }, eyeMarks: { ...film.eyeMarks!, count: 0 } }
  const result = exportResult("paper-strip", spec)
  assert(result.valid, `Paper Strip without required seals/eyemarks must export: ${JSON.stringify(result.messages)}`)
  assert(!validateProjectCutter(projectFromLegacySpec("paper-strip", "Unsealed strip", spec)).summary.blocksExport, "Production validation must permit unsealed, unmarked Paper Strip")
  assert(exportResult("paper-strip", { ...spec, eyeMarks: undefined }).valid, "An absent eyemark configuration is also valid for Paper Strip")
}
assert(exportResult("flowwrap", film).messages.some(message => message.code === "SEAL_INVALID_DIMENSION"), "Flowwrap still requires seals")
console.log("PDF Plain Film and Paper Strip optional seal/eyemark export regression tests passed.")

// Horizontal folds now use millimetres from cutter top, matching the renderer.
for (const offset of [0, film.height / 2, film.height]) {
  const spec = { ...film, foldLines: [{ id: "horizontal-qa", orientation: "horizontal" as const, offset }] }
  const result = validateProjectCutter(projectFromLegacySpec("plain-film", "Horizontal fold QA", spec))
  assert(!result.issues.some(issue => issue.ruleId.startsWith("FOLD_")), "Valid horizontal offsets must not produce obsolete warnings")
}
for (const offset of [-1, film.height + 1, Number.NaN]) {
  const spec = { ...film, foldLines: [{ id: "horizontal-qa", orientation: "horizontal" as const, offset }] }
  const result = validateProjectCutter(projectFromLegacySpec("plain-film", "Horizontal fold bounds", spec))
  assert(result.issues.some(issue => issue.ruleId === "FOLD_OFFSET_INVALID"), "Invalid horizontal offsets must retain real bounds validation")
}
