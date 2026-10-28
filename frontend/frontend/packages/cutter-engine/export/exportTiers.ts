import type { CutNFlowProjectV1 } from "../project"
import type { CutterExportAuditRecord, ValidationResult } from "../validation"
import type { CutterExportFormat } from "./cutterExportService"
import {
  resolveExportReadiness,
  type ExportReadinessCounts,
  type ExportReadinessState
} from "./exportReadiness"

export type ExportTierId =
  | "pdf-proof"
  | "illustrator-ready"
  | "repro-ready-pack"

export type ExportTier = {
  id: ExportTierId
  label: string
  description: string
  productionReady: boolean
  editableVector: boolean
  includesValidationReport: boolean
  available: boolean
  exportFormats: CutterExportFormat[]
}

export type ExportGeneratorId = "editable-svg" | "raster-proof-pdf" | "project-json"

export type ExportCapability = {
  format: CutterExportFormat
  tierId: ExportTierId
  label: string
  description: string
  available: boolean
  status: "available" | "planned" | "future"
  mimeType: string
  extensions: string[]
  sourceRequired: boolean
  generator?: ExportGeneratorId
}

const EXPORT_CAPABILITIES: ExportCapability[] = [
  {
    format: "raster-preview-pdf",
    tierId: "pdf-proof",
    label: "PDF Proof",
    description: "Flattened raster proof for review only.",
    available: true,
    status: "available",
    mimeType: "application/pdf",
    extensions: [".pdf"],
    sourceRequired: true,
    generator: "raster-proof-pdf"
  },
  {
    format: "svg",
    tierId: "illustrator-ready",
    label: "Editable SVG",
    description: "Editable vector cutter output.",
    available: true,
    status: "available",
    mimeType: "image/svg+xml",
    extensions: [".svg"],
    sourceRequired: true,
    generator: "editable-svg"
  },
  {
    format: "ai-compatible-svg",
    tierId: "illustrator-ready",
    label: "Illustrator-Compatible SVG",
    description: "Editable SVG for Illustrator; not native AI.",
    available: true,
    status: "available",
    mimeType: "image/svg+xml",
    extensions: [".svg"],
    sourceRequired: true,
    generator: "editable-svg"
  },
  {
    format: "json",
    tierId: "illustrator-ready",
    label: "JSON Project/Cutter Data",
    description: "Structured Project, cutter, validation and layer data.",
    available: true,
    status: "available",
    mimeType: "application/json;charset=utf-8",
    extensions: [".json"],
    sourceRequired: false,
    generator: "project-json"
  },
  {
    format: "pdf-vector",
    tierId: "repro-ready-pack",
    label: "Vector PDF",
    description: "Planned; the current PDF Proof is raster only.",
    available: false,
    status: "planned",
    mimeType: "application/pdf",
    extensions: [".pdf"],
    sourceRequired: true
  },
  {
    format: "dxf",
    tierId: "repro-ready-pack",
    label: "DXF",
    description: "Planned layered cutter exchange output.",
    available: false,
    status: "planned",
    mimeType: "application/dxf",
    extensions: [".dxf"],
    sourceRequired: true
  },
  {
    format: "ai",
    tierId: "repro-ready-pack",
    label: "Native Adobe Illustrator",
    description: "Future native AI output; not the Illustrator-compatible SVG.",
    available: false,
    status: "future",
    mimeType: "application/postscript",
    extensions: [".ai"],
    sourceRequired: true
  },
  {
    format: "repro-pack",
    tierId: "repro-ready-pack",
    label: "GMG/Repro Ready Pack",
    description: "Future premium production handoff package.",
    available: false,
    status: "future",
    mimeType: "application/zip",
    extensions: [".zip"],
    sourceRequired: false
  }
]

export const getExportCapability = (format: CutterExportFormat) =>
  EXPORT_CAPABILITIES.find(capability => capability.format === format)

export const listExportCapabilities = () =>
  EXPORT_CAPABILITIES.map(capability => ({ ...capability, extensions: [...capability.extensions] }))

export const EXPORT_TIERS: ExportTier[] = [
  {
    id: "pdf-proof",
    label: "PDF Proof",
    description: "Flattened raster proof for review only.",
    productionReady: false,
    editableVector: false,
    includesValidationReport: false,
    available: true,
    exportFormats: ["raster-preview-pdf"]
  },
  {
    id: "illustrator-ready",
    label: "AI Ready File",
    description: "Editable vector SVG for Adobe Illustrator.",
    productionReady: true,
    editableVector: true,
    includesValidationReport: true,
    available: true,
    exportFormats: ["svg", "ai-compatible-svg", "json"]
  },
  {
    id: "repro-ready-pack",
    label: "GMG/Repro Ready Pack",
    description: "Coming soon - production handoff package.",
    productionReady: false,
    editableVector: true,
    includesValidationReport: true,
    available: false,
    exportFormats: []
  }
]

export type CutterExportMetadata = {
  projectId: string
  projectName: string
  packTypeId: string
  displayPackType: string
  enginePackTypeId: string
  packType: string
  source: string
  dimensions: {
    widthMm: number
    heightMm: number
  }
  exportTier: ExportTierId
  exportFormat: CutterExportFormat
  createdAt: string
  validationStatus: "valid" | "invalid"
  warningsCount: number
  errorsCount: number
  exportReadiness: ExportReadinessState
  validationSummary: ExportReadinessCounts
  advisoryNotes: string[]
  validationAudit?: CutterExportAuditRecord
}

export const getExportTier = (id: ExportTierId) =>
  EXPORT_TIERS.find(tier => tier.id === id)

export const getDefaultExportTierId = (
  format: CutterExportFormat
): ExportTierId =>
  format === "raster-preview-pdf" ? "pdf-proof" : "illustrator-ready"

export const createCutterExportMetadata = (
  project: CutNFlowProjectV1,
  validation: ValidationResult,
  exportFormat: CutterExportFormat,
  exportTier: ExportTierId = getDefaultExportTierId(exportFormat),
  createdAt = new Date().toISOString(),
  validationAudit?: CutterExportAuditRecord
): CutterExportMetadata => {
  const readiness = resolveExportReadiness({
    project,
    validation,
    supported: getExportTier(exportTier)?.available ?? false,
    createdAt
  })
  return {
    projectId: project.id,
    projectName: project.name,
    packTypeId: readiness.packTypeId ?? project.cutter.packType,
    displayPackType: readiness.displayPackType ?? project.name,
    enginePackTypeId: readiness.enginePackTypeId ?? project.cutter.packType,
    packType: project.cutter.packType,
    source: readiness.source ?? "cutter-studio",
    dimensions: {
      widthMm: project.cutter.legacySpec.width,
      heightMm: project.cutter.legacySpec.height
    },
    exportTier,
    exportFormat,
    createdAt,
    validationStatus: validation.valid ? "valid" : "invalid",
    warningsCount: validation.messages.filter(message => message.severity === "warning").length,
    errorsCount: validation.messages.filter(message => message.severity === "error").length,
    exportReadiness: readiness.state,
    validationSummary: readiness.counts,
    advisoryNotes: readiness.advisoryNotes,
    ...(validationAudit ? { validationAudit: JSON.parse(JSON.stringify(validationAudit)) } : {})
  }
}
