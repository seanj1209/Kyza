import {
  getEyemarkElementRefs,
  getPerfLaneElementRefs,
  type CutNFlowProjectV1,
  type CutterElementRef,
} from "../../../../packages/cutter-engine/project"

export type CutterElementSelectionResolution =
  | {
      ok: true
      affectedElementId: string
      rendererSelectionId: string
      layerId: string
      element: CutterElementRef
    }
  | {
      ok: false
      affectedElementId: string
      reason: "missing" | "inactive" | "unsupported"
      message: string
    }

export const resolveCutterElementSelection = (
  project: CutNFlowProjectV1,
  affectedElementId: string,
): CutterElementSelectionResolution => {
  const element = project.cutter.identityMap.elements.find(
    candidate => candidate.id === affectedElementId,
  )
  if (!element) {
    return {
      ok: false,
      affectedElementId,
      reason: "missing",
      message: "The affected Cutter element is no longer available in this Project revision.",
    }
  }
  if (element.status !== "active") {
    return {
      ok: false,
      affectedElementId,
      reason: "inactive",
      message: "The affected Cutter element is no longer active in this Project revision.",
    }
  }

  if (element.type === "eyemark") {
    const eyemark = getEyemarkElementRefs(project).find(ref => ref.id === affectedElementId)
    if (eyemark) {
      return {
        ok: true,
        affectedElementId,
        rendererSelectionId: `eye-mark:${eyemark.index}`,
        layerId: "eyemarks",
        element,
      }
    }
  }

  if (element.type === "perf-lane") {
    const perfLane = getPerfLaneElementRefs(project).find(ref => ref.id === affectedElementId)
    if (perfLane) {
      return {
        ok: true,
        affectedElementId,
        rendererSelectionId: `perf-lane:${perfLane.index}`,
        layerId: "perf-lines",
        element,
      }
    }
  }

  return {
    ok: false,
    affectedElementId,
    reason: "unsupported",
    message: "This affected Cutter element cannot currently be selected in the renderer.",
  }
}
