import type {
  KyzaCutterProjectV1,
  KyzaProjectV1,
  ParseResult
} from "../project"
import { toPackSpecificationPackTypeId } from "../project"
import {
  KYZA_EXPORT_RECORD_VERSION,
  validationRunToLegacyResult,
  type CutterExportAuthorizationAudit,
  type CutterExportRecordV1,
  type ValidationAcknowledgement,
  type ValidationRun
} from "../validation"
import {
  buildExportSvgDocument,
  exportKyzaProject,
  type CutterExportFormat,
  type CutterExportOptions,
  type CutterExportSvgSource
} from "./cutterExportService"
import {
  createExportPackageDraft
} from "./exportPackage"
import {
  buildKyzaJsonExport,
  createKyzaJsonExportFilename,
  serializeKyzaJsonExport
} from "./jsonExport"
import { createRasterPreviewPdfFromSvg } from "./rasterPreviewPdf"
import {
  authorizeProjectExport,
  withCompletedExportEvidence,
  type ExportAuthorizationErrorCode
} from "./preExportValidation"
import {
  createCutterExportMetadata,
  getExportCapability,
  getExportTier,
  type ExportCapability,
  type ExportTierId
} from "./exportTiers"

export type ProjectExportRequest = {
  format: CutterExportFormat
  tierId?: ExportTierId
  source?: CutterExportSvgSource
  options?: Partial<Omit<CutterExportOptions, "format" | "tierId">>
}

export type PreparedProjectExport = {
  project: KyzaCutterProjectV1
  validationRun: ValidationRun
  acknowledgement?: ValidationAcknowledgement
  capability: ExportCapability
  request: ProjectExportRequest
  exportId: string
  exportedAt: string
  authorizationAudit: CutterExportAuthorizationAudit
}

export type GeneratedProjectExport = {
  prepared: PreparedProjectExport
  filename: string
  mimeType: string
  blob: Blob
  page: { widthMm: number; heightMm: number }
  layers: { count: number; ids: string[]; names: string[] }
}

export type ProjectExportDelivery = {
  status: "saved" | "download_initiated"
  method: "file_system_access" | "browser_download"
  fileHandle?: FileSystemFileHandle
}

export type ProjectExportCancellation = {
  status: "cancelled"
}

export type ProjectExportServiceErrorCode =
  | ExportAuthorizationErrorCode
  | "project_unavailable"
  | "project_revision_changed"
  | "cutter_unavailable"
  | "tier_unavailable"
  | "format_unavailable"
  | "source_required"
  | "generator_unavailable"
  | "generation_failed"
  | "delivery_failed"
  | "cancelled"
  | "duplicate_export_id"
  | "history_persistence_failed"
  | "vector_pdf_unavailable"
  | "raster_service_mismatch"
  | "export_build_failed"

export type ProjectExportServiceResult =
  | {
      ok: true
      project: KyzaProjectV1
      artifact: GeneratedProjectExport
      record: CutterExportRecordV1
      delivery: ProjectExportDelivery
    }
  | {
      ok: false
      code: ProjectExportServiceErrorCode
      errors: string[]
      artifact?: GeneratedProjectExport
      delivery?: ProjectExportDelivery
    }

type ProjectExportFailure = Extract<ProjectExportServiceResult, { ok: false }>
type PrepareProjectExportResult = ProjectExportFailure | { ok: true; prepared: PreparedProjectExport }
type GenerateProjectExportResult = ProjectExportFailure | { ok: true; artifact: GeneratedProjectExport }

const defaultOptions = (request: ProjectExportRequest): CutterExportOptions => ({
  format: request.format,
  tierId: request.tierId ?? getExportCapability(request.format)?.tierId,
  includeLayers: request.options?.includeLayers ?? true,
  preserveVector: request.options?.preserveVector ?? request.format !== "raster-preview-pdf",
  includeValidationReport: request.options?.includeValidationReport ?? true,
  ...(request.options?.marginMm !== undefined ? { marginMm: request.options.marginMm } : {})
})

const safeFilename = (value: string) =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_") || "CutterGuide"

const svgLayers = (markup: string) => {
  const entries = [...markup.matchAll(/<g\b[^>]*\bdata-layer-id=["']([^"']+)["'][^>]*>/gi)]
  const ids = [...new Set(entries.map(match => match[1]).filter((id): id is string => Boolean(id)))]
  const names = ids.map(id => {
    const entry = entries.find(match => match[1] === id)?.[0] ?? ""
    return entry.match(/\bdata-layer-name=["']([^"']+)["']/i)?.[1] ?? id
  })
  return { count: ids.length, ids, names }
}

const projectDimensions = (project: KyzaCutterProjectV1) => ({
  widthMm: project.cutter.legacySpec.width,
  heightMm: project.cutter.legacySpec.height
})

export const prepareProjectExport = (input: {
  project: KyzaProjectV1
  validationRun: ValidationRun
  acknowledgement?: ValidationAcknowledgement
  request: ProjectExportRequest
  exportId?: string
  exportedAt?: string
  userId?: string
}): PrepareProjectExportResult => {
  if (!input.project.cutter) {
    return { ok: false, code: "cutter_unavailable", errors: ["The Project has no Cutter Specification to export."] }
  }
  const capability = getExportCapability(input.request.format)
  if (!capability?.available || !capability.generator) {
    return { ok: false, code: "format_unavailable", errors: [`Export format "${input.request.format}" is not available in the beta.`] }
  }
  const tierId = input.request.tierId ?? capability.tierId
  const tier = getExportTier(tierId)
  if (!tier?.available || tierId !== capability.tierId || !tier.exportFormats.includes(input.request.format)) {
    return { ok: false, code: "tier_unavailable", errors: [`Export tier "${tierId}" does not provide "${input.request.format}".`] }
  }
  if (capability.sourceRequired && !input.request.source) {
    return { ok: false, code: "source_required", errors: ["A rendered Cutter SVG source is required for this export format."] }
  }
  const authorized = authorizeProjectExport({
    project: input.project,
    validationRun: input.validationRun,
    ...(input.acknowledgement ? { acknowledgement: input.acknowledgement } : {}),
    exportFormat: input.request.format,
    ...(input.exportId ? { exportId: input.exportId } : {}),
    ...(input.exportedAt ? { exportedAt: input.exportedAt } : {}),
    ...(input.userId ? { userId: input.userId } : {})
  })
  if (authorized.ok === false) return authorized
  if ((input.project.exportAuditRecords ?? []).some(record => record.id === authorized.audit.id)) {
    return { ok: false, code: "duplicate_export_id", errors: [`Duplicate export record ID "${authorized.audit.id}" is not allowed.`] }
  }
  return {
    ok: true,
    prepared: {
      project: input.project as KyzaCutterProjectV1,
      validationRun: input.validationRun,
      ...(input.acknowledgement ? { acknowledgement: input.acknowledgement } : {}),
      capability,
      request: { ...input.request, tierId },
      exportId: authorized.audit.id,
      exportedAt: authorized.audit.exportedAt,
      authorizationAudit: authorized.audit
    }
  }
}

export const generatePreparedProjectExport = async (
  prepared: PreparedProjectExport,
  overrides: {
    pdfGenerator?: typeof createRasterPreviewPdfFromSvg
  } = {}
): Promise<GenerateProjectExportResult> => {
  const { project, request, capability } = prepared
  const options = defaultOptions(request)
  try {
    if (capability.generator === "editable-svg") {
      const result = exportKyzaProject(project, options, request.source, {
        validationRun: prepared.validationRun,
        ...(prepared.acknowledgement ? { acknowledgement: prepared.acknowledgement } : {}),
        exportId: prepared.exportId,
        exportedAt: prepared.exportedAt,
        userId: prepared.authorizationAudit.userId
      })
      if (result.ok === false) return { ok: false, code: result.code, errors: result.errors }
      const frame = buildExportSvgDocument(project, options, request.source!, result.metadata).frame
      return {
        ok: true,
        artifact: {
          prepared,
          filename: result.filename,
          mimeType: result.mimeType,
          blob: result.blob,
          page: { widthMm: frame.widthMm, heightMm: frame.heightMm },
          layers: svgLayers(result.svgMarkup)
        }
      }
    }
    if (capability.generator === "raster-proof-pdf") {
      const validation = validationRunToLegacyResult(prepared.validationRun)
      const metadata = createCutterExportMetadata(
        project,
        validation,
        request.format,
        capability.tierId,
        prepared.exportedAt,
        prepared.authorizationAudit
      )
      const built = buildExportSvgDocument(project, options, request.source!, metadata)
      const generator = overrides.pdfGenerator ?? createRasterPreviewPdfFromSvg
      const blob = await generator(built.svgMarkup, built.frame.widthMm, built.frame.heightMm, metadata)
      return {
        ok: true,
        artifact: {
          prepared,
          filename: `${safeFilename(project.name)}.preview.pdf`,
          mimeType: capability.mimeType,
          blob,
          page: { widthMm: built.frame.widthMm, heightMm: built.frame.heightMm },
          layers: svgLayers(built.svgMarkup)
        }
      }
    }
    if (capability.generator === "project-json") {
      const validation = validationRunToLegacyResult(prepared.validationRun)
      const exportPackage = createExportPackageDraft({
        project,
        validation,
        source: "save_export",
        supported: true,
        createdAt: prepared.exportedAt,
        exportAudit: prepared.authorizationAudit
      })
      const payload = buildKyzaJsonExport({ project, validation, exportPackage, exportedAt: prepared.exportedAt })
      const blob = new Blob([serializeKyzaJsonExport(payload)], { type: capability.mimeType })
      const layers = payload.layerManifest.layers.filter(layer => layer.exportable)
      return {
        ok: true,
        artifact: {
          prepared,
          filename: createKyzaJsonExportFilename(payload),
          mimeType: capability.mimeType,
          blob,
          page: projectDimensions(project),
          layers: { count: layers.length, ids: layers.map(layer => layer.id), names: layers.map(layer => layer.name) }
        }
      }
    }
    return { ok: false, code: "generator_unavailable", errors: [`No generator is registered for "${request.format}".`] }
  } catch (error) {
    return {
      ok: false,
      code: "generation_failed",
      errors: [error instanceof Error ? error.message : "Export generation failed."]
    }
  }
}

export const createCompletedExportRecord = (
  artifact: GeneratedProjectExport,
  delivery: ProjectExportDelivery
): CutterExportRecordV1 => {
  const { prepared } = artifact
  const { project, authorizationAudit } = prepared
  const options = defaultOptions(prepared.request)
  return {
    ...authorizationAudit,
    recordVersion: KYZA_EXPORT_RECORD_VERSION,
    exportTier: prepared.capability.tierId,
    filename: artifact.filename,
    mimeType: artifact.mimeType,
    options: {
      includeLayers: options.includeLayers,
      preserveVector: options.preserveVector,
      includeValidationReport: options.includeValidationReport ?? false,
      ...(options.marginMm !== undefined ? { marginMm: options.marginMm } : {})
    },
    packReference: {
      packTypeId: project.projectDraft?.packSpecification?.packTypeId ?? toPackSpecificationPackTypeId(project.cutter.packType),
      enginePackTypeId: project.projectDraft?.packSpecification?.enginePackTypeId ?? project.cutter.packType
    },
    cutterReference: {
      packTypeId: project.cutter.packType,
      units: "mm",
      coordinateSpace: project.cutter.coordinateSpace,
      elementIds: project.cutter.identityMap.elements.map(element => element.id)
    },
    dimensions: { ...projectDimensions(project), units: "mm" },
    page: { ...artifact.page },
    layers: {
      count: artifact.layers.count,
      ids: [...artifact.layers.ids],
      names: [...artifact.layers.names]
    },
    sizeBytes: artifact.blob.size,
    generatorResult: "generated",
    deliveryStatus: delivery.status,
    deliveryMethod: delivery.method,
    snapshot: {
      projectName: project.name,
      packType: project.cutter.packType,
      cutterSpec: JSON.parse(JSON.stringify(project.cutter.legacySpec)),
      validationRun: JSON.parse(JSON.stringify(prepared.validationRun))
    }
  }
}

export const completePreparedProjectExport = async (input: {
  artifact: GeneratedProjectExport
  delivery: ProjectExportDelivery
  latestProject: KyzaProjectV1
  persistProject: (project: KyzaProjectV1, expectedRevision: number) => ParseResult<KyzaProjectV1> | Promise<ParseResult<KyzaProjectV1>>
}): Promise<ProjectExportServiceResult> => {
  const { prepared } = input.artifact
  if (input.latestProject.id !== prepared.project.id || input.latestProject.revision !== prepared.project.revision) {
    return {
      ok: false,
      code: "history_persistence_failed",
      errors: ["The file was delivered, but the Project changed before export history could be saved."],
      artifact: input.artifact,
      delivery: input.delivery
    }
  }
  const record = createCompletedExportRecord(input.artifact, input.delivery)
  const evidenced = withCompletedExportEvidence(input.latestProject, record, prepared.acknowledgement)
  if (evidenced.ok === false) {
    return { ok: false, code: evidenced.errors.some(error => error.includes("Duplicate")) ? "duplicate_export_id" : "history_persistence_failed", errors: evidenced.errors, artifact: input.artifact, delivery: input.delivery }
  }
  const persisted = await input.persistProject(evidenced.value, prepared.project.revision)
  if (persisted.ok === false) {
    return {
      ok: false,
      code: "history_persistence_failed",
      errors: ["The file was delivered, but export history could not be saved.", ...persisted.errors],
      artifact: input.artifact,
      delivery: input.delivery
    }
  }
  return { ok: true, project: persisted.value, artifact: input.artifact, record, delivery: input.delivery }
}

export const executeProjectExport = async (input: {
  getLatestProject: () => KyzaProjectV1 | null | Promise<KyzaProjectV1 | null>
  persistProject: (project: KyzaProjectV1, expectedRevision: number) => ParseResult<KyzaProjectV1> | Promise<ParseResult<KyzaProjectV1>>
  validationRun: ValidationRun
  acknowledgement?: ValidationAcknowledgement
  request: ProjectExportRequest
  exportId?: string
  exportedAt?: string
  userId?: string
  deliver: (artifact: GeneratedProjectExport) => ProjectExportDelivery | ProjectExportCancellation | Promise<ProjectExportDelivery | ProjectExportCancellation>
  pdfGenerator?: typeof createRasterPreviewPdfFromSvg
}): Promise<ProjectExportServiceResult> => {
  const project = await input.getLatestProject()
  if (!project) return { ok: false, code: "project_unavailable", errors: ["The current Project could not be loaded for export."] }
  const prepared = prepareProjectExport({
    project,
    validationRun: input.validationRun,
    ...(input.acknowledgement ? { acknowledgement: input.acknowledgement } : {}),
    request: input.request,
    ...(input.exportId ? { exportId: input.exportId } : {}),
    ...(input.exportedAt ? { exportedAt: input.exportedAt } : {}),
    ...(input.userId ? { userId: input.userId } : {})
  })
  if (prepared.ok === false) return prepared
  const generated = await generatePreparedProjectExport(prepared.prepared, { ...(input.pdfGenerator ? { pdfGenerator: input.pdfGenerator } : {}) })
  if (generated.ok === false) return generated
  const currentBeforeDelivery = await input.getLatestProject()
  if (!currentBeforeDelivery || currentBeforeDelivery.id !== project.id || currentBeforeDelivery.revision !== project.revision) {
    return { ok: false, code: "project_revision_changed", errors: ["The Project changed while export was being prepared. No file was delivered."] }
  }
  let delivery: ProjectExportDelivery | ProjectExportCancellation
  try {
    delivery = await input.deliver(generated.artifact)
  } catch (error) {
    return { ok: false, code: "delivery_failed", errors: [error instanceof Error ? error.message : "File delivery failed."], artifact: generated.artifact }
  }
  if (delivery.status === "cancelled") {
    return { ok: false, code: "cancelled", errors: [], artifact: generated.artifact }
  }
  const latestProject = await input.getLatestProject()
  if (!latestProject) {
    return { ok: false, code: "history_persistence_failed", errors: ["The file was delivered, but the Project could not be loaded to save export history."], artifact: generated.artifact, delivery }
  }
  return completePreparedProjectExport({ artifact: generated.artifact, delivery, latestProject, persistProject: input.persistProject })
}

export type SaveFilePickerLike = (options: {
  suggestedName: string
  types: Array<{ description: string; accept: Record<string, string[]> }>
}) => Promise<FileSystemFileHandle>

const isPickerCancellation = (error: unknown) =>
  typeof error === "object" && error !== null &&
  "name" in error && (error as { name?: unknown }).name === "AbortError"

export const deliverProjectExportLocally = async (
  artifact: Pick<GeneratedProjectExport, "filename" | "mimeType" | "blob"> & {
    prepared: { capability: Pick<ExportCapability, "label" | "extensions"> }
  },
  options: {
    existingHandle?: FileSystemFileHandle | null
    showSaveFilePicker?: SaveFilePickerLike
    document?: Document
    urlApi?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">
  } = {}
): Promise<ProjectExportDelivery | ProjectExportCancellation> => {
  let pickedHandle: FileSystemFileHandle | undefined
  if (!options.existingHandle && options.showSaveFilePicker) {
    try {
      pickedHandle = await options.showSaveFilePicker({
        suggestedName: artifact.filename,
        types: [{
          description: artifact.prepared.capability.label,
          accept: { [artifact.mimeType]: artifact.prepared.capability.extensions }
        }]
      })
    } catch (error) {
      if (isPickerCancellation(error)) return { status: "cancelled" }
      throw error
    }
  }
  const handle = options.existingHandle ?? pickedHandle
  if (handle) {
    const writable = await handle.createWritable()
    await writable.write(artifact.blob)
    await writable.close()
    return { status: "saved", method: "file_system_access", fileHandle: handle }
  }
  const documentRef = options.document ?? globalThis.document
  const urlApi = options.urlApi ?? globalThis.URL
  if (!documentRef || !urlApi?.createObjectURL) {
    throw new Error("No supported local file delivery API is available.")
  }
  const url = urlApi.createObjectURL(artifact.blob)
  try {
    const anchor = documentRef.createElement("a")
    anchor.href = url
    anchor.download = artifact.filename
    anchor.click()
  } finally {
    urlApi.revokeObjectURL(url)
  }
  return { status: "download_initiated", method: "browser_download" }
}
