import type { FlowwrapSpec } from "../types/flowwrap"
import type { EyeMarkColor } from "../types/eyeMarks"

export function paperStripEyeColor(spec: FlowwrapSpec): EyeMarkColor {
  return spec.substrate === "black-paper" ? "white" : "black"
}

/** Update only automatic ink when stock changes. Geometry and custom ink survive. */
export function updatePaperStripContrast(previous: FlowwrapSpec | undefined, next: FlowwrapSpec): FlowwrapSpec {
  if (!previous?.paperStrip || !next.paperStrip || previous.substrate === next.substrate) return next
  const before = paperStripEyeColor(previous)
  const after = paperStripEyeColor(next)
  if (before === after) return next
  const oldHex = before === "white" ? "#ffffff" : "#000000"
  const newHex = after === "white" ? "#ffffff" : "#000000"
  const custom = next.baseCustomisation
  return {
    ...next,
    ...(next.eyeMarks && next.eyeMarks.color === before
      ? { eyeMarks: { ...next.eyeMarks, color: after } } : {}),
    ...(custom?.eyemark?.color?.toLowerCase() === oldHex && previous.baseCustomisation?.eyemark?.color?.toLowerCase() === oldHex
      ? { baseCustomisation: { ...custom, eyemark: { ...custom.eyemark, color: newHex } } } : {}),
    paperStrip: {
      ...next.paperStrip,
      stepping: next.paperStrip.stepping && {
        ...next.paperStrip.stepping,
        elementsByStep: next.paperStrip.stepping.elementsByStep && Object.fromEntries(
          Object.entries(next.paperStrip.stepping.elementsByStep).map(([id, elements]) => [id, {
            ...elements,
            ...(elements.eyeMarks?.color === before ? { eyeMarks: { ...elements.eyeMarks, color: after } } : {})
          }])
        )
      }
    }
  }
}
