import type { CutNFlowProjectV1 } from "../project"
import type {
  CutterExportAuditRecord,
  ValidationResult
} from "../validation"
import {
  resolveExportReadiness,
  type ExportReadinessCounts,
  type ExportReadinessState
} from "./exportReadiness"
import { listExportCapabilities, type ExportCapability } from "./exportTiers"

export type ExportPackageSource =
  | "save_export"
  | "pack_generator"
  | "validation_centre"

export type ExportOutputStatus =
  | "available"
  | "planned"
  | "future"
  | "unsupported"

export type ExportOutput = {
  id: string
  label: string
  format: string
  status: ExportOutputStatus
  description?: string
}

export type ExportPackage = {
  id: string
  projectId?: string
  source: ExportPackageSource
  originalPrompt?: string
  packTypeId?: string
  displayPackType?: string
  enginePackTypeId?: string
  readiness: ExportReadinessState
  validationSummary: ExportReadinessCounts
  advisories: string[]
  artworkStatus: "not_uploaded" | "uploaded" | "not_checked"
  outputs: ExportOutput[]
  createdAt: string
  exportAudit?: CutterExportAuditRecord
}

const outputIdByFormat: Record<ExportCapability["format"], string> = {
  "raster-preview-pdf": "pdf-proof",
  svg: "editable-svg",
  "ai-compatible-svg": "illustrator-compatible-svg",
  json: "project-json",
  "pdf-vector": "vector-pdf",
  dxf: "dxf",
  ai: "native-ai",
  "repro-pack": "repro-ready-pack"
}

export const EXPORT_PACKAGE_OUTPUTS: ExportOutput[] = listExportCapabilities().map(capability => ({
  id: outputIdByFormat[capability.format],
  label: capability.label,
  format: capability.format,
  status: capability.status,
  description: capability.format === "json"
    ? `${capability.description} Includes a layer manifest.`
    : capability.description
}))

const createPackageId = (projectId: string | undefined, createdAt: string) =>
  `export-package-${projectId ?? "unassigned"}-${createdAt.replace(/[^0-9]/g, "")}`

export const createExportPackageDraft = (input: {
  project?: CutNFlowProjectV1 | null
  validation?: ValidationResult
  source: ExportPackageSource
  supported?: boolean
  createdAt?: string
  id?: string
  exportAudit?: CutterExportAuditRecord
}): ExportPackage => {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const project = input.project ?? undefined
  const readiness = resolveExportReadiness({
    project,
    validation: input.validation,
    supported: input.supported,
    createdAt
  })
  return {
    id: input.id ?? createPackageId(project?.id, createdAt),
    ...(readiness.projectId ? { projectId: readiness.projectId } : {}),
    source: input.source,
    ...(project?.projectDraft?.productPrompt
      ? { originalPrompt: project.projectDraft.productPrompt }
      : {}),
    ...(readiness.packTypeId ? { packTypeId: readiness.packTypeId } : {}),
    ...(readiness.displayPackType
      ? { displayPackType: readiness.displayPackType }
      : {}),
    ...(readiness.enginePackTypeId
      ? { enginePackTypeId: readiness.enginePackTypeId }
      : {}),
    readiness: readiness.state,
    validationSummary: { ...readiness.counts },
    advisories: [...readiness.advisoryNotes],
    artworkStatus: !project
      ? "not_checked"
      : project.artwork
        ? "uploaded"
        : "not_uploaded",
    outputs: EXPORT_PACKAGE_OUTPUTS.map(output => ({ ...output })),
    createdAt,
    ...(input.exportAudit
      ? { exportAudit: JSON.parse(JSON.stringify(input.exportAudit)) as CutterExportAuditRecord }
      : {})
  }
}
