import type { PackGenRecommendation } from "../../../../packages/ai-engine"
import type { KyzaProjectDraftV1 } from "../../../../packages/cutter-engine/project"
import type { FlowwrapSpec } from "../types/flowwrap"
import { getPackModule } from "../packs"
import { createCutterSpecFromConfirmedPackValues } from "./packGenHandoff"
import {
  applyRecommendationToPackGenDraft,
  getPackGenCutterReadiness,
} from "./packGenProjectService"

export type PackGenSubstratePresentation = {
  value: string
  source: "User selected" | "Flow suggested" | "Engine default" | "Not selected"
}

const substrateLabel = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "Not selected"
  const normalized = value.trim().toLowerCase()
  if (normalized === "white") return "White"
  if (normalized === "clear") return "Clear"
  if (normalized === "paper") return "Paper"
  return value.trim()
}

export function getPackGenSubstratePresentation(
  draft: Pick<KyzaProjectDraftV1, "workspace">,
): PackGenSubstratePresentation {
  const entry = draft.workspace?.fields.materialNotes
  if (!entry || entry.value === undefined || entry.value === "") {
    return { value: "Not selected", source: "Not selected" }
  }
  const source = entry.source === "user"
    ? "User selected"
    : entry.source === "flowai"
      ? "Flow suggested"
      : "Engine default"
  return { value: substrateLabel(entry.value), source }
}

export type PackGenSuggestionPreviewModel = {
  draft: KyzaProjectDraftV1
  substrate: PackGenSubstratePresentation
  keyFeatures: string[]
  available: boolean
  packType?: string
  render: () => SVGSVGElement | null
}

const getKeyFeatures = (spec: FlowwrapSpec) => [
  spec.doyPouch?.showZipper !== false && spec.doyPouch?.zipper ? "Grip seal (zip)" : "",
  (spec.doyPouch?.showTearNotch !== false && spec.doyPouch?.tearNotch)
    || spec.sachet?.tearNotch?.enabled
    ? "Tear notch"
    : "",
].filter((feature): feature is string => Boolean(feature))

const stripEditorUi = (svg: SVGSVGElement) => {
  svg.querySelectorAll(
    "#selection_overlay, #issue_flash_overlay, [data-role*='hit'], [data-role*='handle'], [data-role*='rotate'], [data-role*='move']",
  ).forEach((node) => node.remove())
  svg.removeAttribute("width")
  svg.removeAttribute("height")
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.style.width = "100%"
  svg.style.height = "100%"
  svg.style.pointerEvents = "none"
}

export function createPackGenSuggestionPreviewModel(
  baseDraft: KyzaProjectDraftV1,
  recommendation: PackGenRecommendation,
  prompt: string,
): PackGenSuggestionPreviewModel {
  const previewDraft = applyRecommendationToPackGenDraft(baseDraft, recommendation, prompt)
  const substrate = getPackGenSubstratePresentation(previewDraft)
  const readiness = getPackGenCutterReadiness(previewDraft)
  if (readiness.ready === false) return { draft: previewDraft, substrate, keyFeatures: [], available: false, render: () => null }
  const generated = createCutterSpecFromConfirmedPackValues(
    readiness.values,
    `pack-gen-preview-${recommendation.id}`,
  )
  if (generated.ok === false) return { draft: previewDraft, substrate, keyFeatures: [], available: false, render: () => null }
  const packModule = getPackModule(generated.packType)
  if (!packModule) return { draft: previewDraft, substrate, keyFeatures: [], available: false, render: () => null }

  return {
    draft: previewDraft,
    substrate,
    keyFeatures: getKeyFeatures(generated.spec),
    available: true,
    packType: generated.packType,
    render: () => {
      try {
        const svg = packModule.render(generated.spec, { renderMode: "artwork" })
        stripEditorUi(svg)
        return svg
      } catch (error) {
        console.error("[Pack Gen] Cutter preview rendering failed", error)
        return null
      }
    },
  }
}

export function fitPackGenSuggestionPreview(svg: SVGSVGElement) {
  // Keep the pack renderer's complete viewBox. Cropping to the cutter outline
  // can clip trim bands, seals, and dimension/registration geometry that
  // intentionally sits outside the cut line.
  if (!svg.getAttribute("viewBox")) return
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
}
