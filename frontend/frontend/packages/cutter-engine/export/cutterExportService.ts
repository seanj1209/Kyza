import type { CutNFlowProjectV1 } from "../project"
import {
  getPreExportValidationRun,
  getBlockingValidationMessages,
  validationRunToLegacyResult
} from "../validation"
import type { ValidationResult, ValidationRun } from "../validation"
import type { CutterExportAuditRecord, ValidationAcknowledgement } from "../validation"
import {
  authorizeProjectExport,
  type ExportAuthorizationErrorCode
} from "./preExportValidation"
import {
  createCutterExportMetadata,
  getDefaultExportTierId,
  getExportTier,
  type CutterExportMetadata,
  type ExportTierId
} from "./exportTiers"

export type CutterExportFormat =
  | "svg"
  | "pdf-vector"
  | "ai-compatible-svg"
  | "raster-preview-pdf"
  | "json"
  | "dxf"
  | "ai"
  | "repro-pack"

export type CutterExportOptions = {
  format: CutterExportFormat
  includeLayers: boolean
  preserveVector: boolean
  includeValidationReport?: boolean
  marginMm?: number
  tierId?: ExportTierId
}

export type CutterExportAuthorization = {
  validationRun: ValidationRun
  acknowledgement?: ValidationAcknowledgement
  exportId?: string
  exportedAt?: string
  userId?: string
}

export type CutterExportErrorCode =
  | ExportAuthorizationErrorCode
  | "vector_pdf_unavailable"
  | "raster_service_mismatch"
  | "tier_unavailable"
  | "format_unavailable"
  | "source_required"
  | "export_build_failed"

export type CutterValidationReportExport = {
  projectId: string
  projectName: string
  revision: string
  exportedAt: string
  blocking: boolean
  validationRunId: string
  validationStatus: ValidationRun["status"]
  validationRulesetVersion: string
  metadata: CutterExportMetadata
  messages: ValidationResult["messages"]
}

export type CutterExportResult =
  | {
      ok: true
      filename: string
      mimeType: string
      blob: Blob
      validation: ValidationResult
      validationRun: ValidationRun
      validationReport?: CutterValidationReportExport
      metadata: CutterExportMetadata
      exportAudit: CutterExportAuditRecord
      svgMarkup: string
    }
  | {
      ok: false
      code: CutterExportErrorCode
      errors: string[]
      validation?: ValidationResult
      validationRun?: ValidationRun
    }

export type CutterExportSvgSource = SVGSVGElement | string

type ExportFrame = {
  x: number
  y: number
  widthMm: number
  heightMm: number
}

const SVG_NS = "http://www.w3.org/2000/svg"
const INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"
const UI_ONLY_SELECTOR = [
  "#selection_overlay",
  "#issue_flash_overlay",
  ".issue-flash-marker",
  "[data-export-ui='true']",
  "[data-role*='hit']",
  "[data-role*='handle']",
  "[data-role*='rotate']",
  "[data-role*='move']",
  "foreignObject",
  "script",
  "image:not([data-export-include-raster='true'])"
].join(", ")

const LAYER_NAMES: Record<string, string> = {
  "cutter-outline": "Cutter",
  "seal-areas": "Seal Area",
  "kseal-bottom-seals": "Bottom Seals",
  "kseal-arms": "K Arms",
  "gusset-fold-line": "Centre Fold",
  "fold-lines": "Fold Lines",
  eyemarks: "Eyemarks",
  "safe-zones": "Safe Zones",
  "cutter-legend": "Cutter Legend",
  dimensions: "Dimensions",
  annotations: "Annotations"
}

const sanitizeFileName = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "CutterGuide"

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const readNumberAttribute = (markup: string, name: string) => {
  const match = markup.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))
  const value = Number(match?.[1])
  return Number.isFinite(value) ? value : undefined
}

const getLayerName = (layerId: string) =>
  LAYER_NAMES[layerId] ?? layerId
    .split("-")
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ")

const stripUiOnlyMarkup = (markup: string) => {
  let next = markup
  const pairedPatterns = [
    /<([a-z][\w:-]*)\b(?=[^>]*\bid=["'](?:selection_overlay|issue_flash_overlay)["'])[^>]*>[\s\S]*?<\/\1\s*>/gi,
    /<([a-z][\w:-]*)\b(?=[^>]*\bclass=["'][^"']*\bissue-flash-marker\b[^"']*["'])[^>]*>[\s\S]*?<\/\1\s*>/gi,
    /<([a-z][\w:-]*)\b(?=[^>]*\bdata-export-ui=["']true["'])[^>]*>[\s\S]*?<\/\1\s*>/gi,
    /<([a-z][\w:-]*)\b(?=[^>]*\bdata-role=["'][^"']*(?:hit|handle|rotate|move)[^"']*["'])[^>]*>[\s\S]*?<\/\1\s*>/gi,
    /<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi,
    /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi
  ]
  pairedPatterns.forEach(pattern => {
    next = next.replace(pattern, "")
  })
  next = next.replace(
    /<image\b(?![^>]*\bdata-export-include-raster=["']true["'])[^>]*(?:\/>|>[\s\S]*?<\/image\s*>)/gi,
    ""
  )
  next = next.replace(
    /<([a-z][\w:-]*)\b(?=[^>]*(?:\bid=["'](?:selection_overlay|issue_flash_overlay)["']|\bdata-export-ui=["']true["']|\bdata-role=["'][^"']*(?:hit|handle|rotate|move)[^"']*["']))[^>]*\/>/gi,
    ""
  )
  return next
}

const applyStringLayerMetadata = (markup: string, illustratorCompatible: boolean) =>
  markup.replace(
    /<g\b([^>]*\bdata-layer-id=(["'])([^"']+)\2[^>]*)>/gi,
    (_match, rawAttributes: string, _quote: string, layerId: string) => {
      const layerName = getLayerName(layerId)
      const selfClosing = /\/\s*$/.test(rawAttributes)
      let attributes = rawAttributes.replace(/\/\s*$/, "")
        .replace(/\sdata-layer-name=["'][^"']*["']/gi, "")
        .replace(/\sinkscape:groupmode=["'][^"']*["']/gi, "")
        .replace(/\sinkscape:label=["'][^"']*["']/gi, "")
      attributes += ` data-layer-name="${layerName}"`
      if (illustratorCompatible) {
        attributes += ` inkscape:groupmode="layer" inkscape:label="${layerName}"`
      }
      return `<g${attributes}${selfClosing ? "/" : ""}>`
    }
  )

const resolveFrame = (markup: string, marginMm: number): ExportFrame => {
  const originX = readNumberAttribute(markup, "data-origin-x")
  const originY = readNumberAttribute(markup, "data-origin-y")
  const cutterWidth = readNumberAttribute(markup, "data-cutter-width")
  const cutterHeight = readNumberAttribute(markup, "data-cutter-height")
  if (
    originX !== undefined &&
    originY !== undefined &&
    cutterWidth !== undefined &&
    cutterHeight !== undefined &&
    cutterWidth > 0 &&
    cutterHeight > 0
  ) {
    return {
      x: Math.min(originX, readNumberAttribute(markup, "data-legend-left") ?? originX) - marginMm,
      y: Math.min(originY, readNumberAttribute(markup, "data-legend-top") ?? originY) - marginMm,
      widthMm: Math.max(originX+cutterWidth, readNumberAttribute(markup, "data-legend-right") ?? 0) - Math.min(originX, readNumberAttribute(markup, "data-legend-left") ?? originX) + marginMm * 2,
      heightMm: Math.max(originY+cutterHeight, readNumberAttribute(markup, "data-legend-bottom") ?? 0) - Math.min(originY, readNumberAttribute(markup, "data-legend-top") ?? originY) + marginMm * 2
    }
  }
  const viewBox = markup
    .match(/\bviewBox=["']([^"']+)["']/i)?.[1]
    ?.trim()
    .split(/\s+/)
    .map(Number) ?? [0, 0, 1000, 1000]
  const x = Number.isFinite(viewBox[0]) ? viewBox[0]! : 0
  const y = Number.isFinite(viewBox[1]) ? viewBox[1]! : 0
  const width = Number.isFinite(viewBox[2]) && viewBox[2]! > 0 ? viewBox[2]! : 1000
  const height = Number.isFinite(viewBox[3]) && viewBox[3]! > 0 ? viewBox[3]! : 1000
  return {
    x: x - marginMm,
    y: y - marginMm,
    widthMm: width + marginMm * 2,
    heightMm: height + marginMm * 2
  }
}

const serializeSource = (
  source: CutterExportSvgSource,
  includeLayers: boolean,
  illustratorCompatible: boolean
) => {
  if (typeof source === "string") {
    const clean = stripUiOnlyMarkup(source)
    return includeLayers
      ? applyStringLayerMetadata(clean, illustratorCompatible)
      : clean
  }
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll(UI_ONLY_SELECTOR).forEach(node => node.remove())
  if (!includeLayers) {
    clone.querySelectorAll<SVGGElement>("[data-layer-id]").forEach(group => {
      group.removeAttribute("inkscape:groupmode")
      group.removeAttribute("inkscape:label")
    })
  } else {
    clone.querySelectorAll<SVGGElement>("[data-layer-id]").forEach(group => {
      const layerId = group.getAttribute("data-layer-id") ?? group.id ?? "layer"
      const layerName = getLayerName(layerId)
      group.setAttribute("data-layer-name", layerName)
      if (illustratorCompatible) {
        group.setAttribute("inkscape:groupmode", "layer")
        group.setAttribute("inkscape:label", layerName)
      }
    })
  }
  return new XMLSerializer().serializeToString(clone)
}

const applyRootExportMetadata = (
  markup: string,
  project: CutNFlowProjectV1,
  frame: ExportFrame,
  illustratorCompatible: boolean,
  metadata: CutterExportMetadata
) => {
  const rootMatch = markup.match(/<svg\b([^>]*)>/i)
  if (!rootMatch) {
    throw new Error("Rendered cutter output is not an SVG document.")
  }
  let attributes = rootMatch[1] ?? ""
  for (const name of [
    "viewBox",
    "width",
    "height",
    "data-cutnflow-project-id",
    "data-cutnflow-revision",
    "data-cutnflow-export-tier",
    "data-cutnflow-export-format"
  ]) {
    attributes = attributes.replace(
      new RegExp(`\\s${name}=["'][^"']*["']`, "gi"),
      ""
    )
  }
  if (!/\sxmlns=/.test(attributes)) {
    attributes += ` xmlns="${SVG_NS}"`
  }
  if (illustratorCompatible && !/xmlns:inkscape=/.test(attributes)) {
    attributes += ` xmlns:inkscape="${INKSCAPE_NS}"`
  }
  attributes += ` viewBox="${frame.x} ${frame.y} ${frame.widthMm} ${frame.heightMm}"`
  attributes += ` width="${frame.widthMm}mm" height="${frame.heightMm}mm"`
  attributes += ` preserveAspectRatio="xMidYMid meet"`
  attributes += ` data-cutnflow-project-id="${project.id}" data-cutnflow-revision="${project.revision}"`
  attributes += ` data-cutnflow-export-tier="${metadata.exportTier}" data-cutnflow-export-format="${metadata.exportFormat}"`
  const root = `<svg${attributes}>`
  const metadataNode = `<metadata id="cutnflow-export-metadata">${escapeXml(JSON.stringify(metadata))}</metadata>`
  // SVG artboards are transparent in Illustrator and other vector editors.
  // The white backing belongs only to raster/PDF proofs, not editable artwork.
  return markup.replace(rootMatch[0], `${root}${metadataNode}`)
}

export const buildExportSvgDocument = (
  project: CutNFlowProjectV1,
  options: CutterExportOptions,
  source: CutterExportSvgSource,
  metadata = createCutterExportMetadata(
    project,
    validationRunToLegacyResult(getPreExportValidationRun(project).run),
    options.format,
    options.tierId ?? getDefaultExportTierId(options.format)
  )
) => {
  const illustratorCompatible = options.format === "ai-compatible-svg"
  const sourceMarkup = serializeSource(
    source,
    options.includeLayers,
    illustratorCompatible
  )
  const frame = resolveFrame(sourceMarkup, options.marginMm ?? 80)
  return {
    svgMarkup: applyRootExportMetadata(
      sourceMarkup,
      project,
      frame,
      illustratorCompatible,
      metadata
    ),
    frame
  }
}

const buildValidationReport = (
  project: CutNFlowProjectV1,
  validation: ValidationResult,
  validationRun: ValidationRun,
  metadata: CutterExportMetadata
): CutterValidationReportExport => ({
  projectId: project.id,
  projectName: project.name,
  revision: String(project.revision),
  exportedAt: metadata.createdAt,
  blocking: !validation.valid,
  validationRunId: validationRun.id,
  validationStatus: validationRun.status,
  validationRulesetVersion: validationRun.rulesetVersion,
  metadata,
  messages: validation.messages
})

export const exportCutNFlowProject = (
  project: CutNFlowProjectV1,
  options: CutterExportOptions,
  source?: CutterExportSvgSource,
  authorization?: CutterExportAuthorization
): CutterExportResult => {
  const validationRun = authorization?.validationRun ?? getPreExportValidationRun(project).run
  const validation = validationRunToLegacyResult(validationRun)
  const authorized = authorizeProjectExport({
    project,
    validationRun,
    ...(authorization?.acknowledgement ? { acknowledgement: authorization.acknowledgement } : {}),
    exportFormat: options.format,
    ...(authorization?.exportId ? { exportId: authorization.exportId } : {}),
    ...(authorization?.exportedAt ? { exportedAt: authorization.exportedAt } : {}),
    ...(authorization?.userId ? { userId: authorization.userId } : {})
  })
  if (authorized.ok === false) {
    const blockingMessages = getBlockingValidationMessages(validation).map(message => message.message)
    return {
      ok: false,
      code: authorized.code,
      errors: blockingMessages.length > 0 && authorized.code === "critical_issues"
        ? blockingMessages
        : authorized.errors,
      validation,
      validationRun
    }
  }
  if (options.format === "pdf-vector") {
    return {
      ok: false,
      code: "vector_pdf_unavailable",
      errors: [
        "Vector PDF export is not implemented. CutNFlow will not silently rasterise cutter lines for the pdf-vector format."
      ],
      validation,
      validationRun
    }
  }
  if (options.format === "raster-preview-pdf") {
    return {
      ok: false,
      code: "raster_service_mismatch",
      errors: [
        "Raster preview PDF is generated by createRasterPreviewPdfFromSvg, not the editable SVG export service."
      ],
      validation,
      validationRun
    }
  }
  if (!["svg", "ai-compatible-svg"].includes(options.format)) {
    return {
      ok: false,
      code: "format_unavailable",
      errors: [`Export format "${options.format}" is not generated by the editable SVG builder.`],
      validation,
      validationRun
    }
  }
  const tierId = options.tierId ?? getDefaultExportTierId(options.format)
  const tier = getExportTier(tierId)
  if (!tier?.available) {
    return {
      ok: false,
      code: "tier_unavailable",
      errors: [`Export tier "${tierId}" is not available yet.`],
      validation,
      validationRun
    }
  }
  if (!tier.exportFormats.includes(options.format)) {
    return {
      ok: false,
      code: "format_unavailable",
      errors: [`Export format "${options.format}" is not available in tier "${tierId}".`],
      validation,
      validationRun
    }
  }
  if (!source) {
    return {
      ok: false,
      code: "source_required",
      errors: ["A rendered SVG source is required for cutter export."],
      validation,
      validationRun
    }
  }
  try {
    const metadata = createCutterExportMetadata(
      project,
      validation,
      options.format,
      tierId,
      authorization?.exportedAt ?? authorized.audit.exportedAt,
      authorized.audit
    )
    const built = buildExportSvgDocument(project, options, source, metadata)
    const aiCompatible = options.format === "ai-compatible-svg"
    const filename = `${sanitizeFileName(project.name)}${
      aiCompatible ? ".illustrator.svg" : ".svg"
    }`
    return {
      ok: true,
      filename,
      mimeType: "image/svg+xml",
      blob: new Blob(
        [`<?xml version="1.0" encoding="UTF-8"?>\n${built.svgMarkup}`],
        { type: "image/svg+xml" }
      ),
      validation,
      validationRun,
      metadata,
      exportAudit: authorized.audit,
      ...(options.includeValidationReport
        ? { validationReport: buildValidationReport(project, validation, validationRun, metadata) }
        : {}),
      svgMarkup: built.svgMarkup
    }
  } catch (error) {
    return {
      ok: false,
      code: "export_build_failed",
      errors: [error instanceof Error ? error.message : "Unable to build cutter SVG export."],
      validation,
      validationRun
    }
  }
}

export const exportProjectSvg = (
  project: CutNFlowProjectV1,
  source: CutterExportSvgSource,
  options: Omit<CutterExportOptions, "format"> = {
    includeLayers: true,
    preserveVector: true
  }
) => exportCutNFlowProject(project, { ...options, format: "svg" }, source)

export const exportProjectAiCompatibleSvg = (
  project: CutNFlowProjectV1,
  source: CutterExportSvgSource,
  options: Omit<CutterExportOptions, "format"> = {
    includeLayers: true,
    preserveVector: true
  }
) =>
  exportCutNFlowProject(
    project,
    { ...options, format: "ai-compatible-svg" },
    source
  )

export const exportProjectPdfVector = (
  project: CutNFlowProjectV1,
  options: Omit<CutterExportOptions, "format"> = {
    includeLayers: true,
    preserveVector: true
  }
) => exportCutNFlowProject(project, { ...options, format: "pdf-vector" })
