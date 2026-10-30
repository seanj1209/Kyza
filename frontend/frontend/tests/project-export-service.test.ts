import { createBetaReviewSnapshot, buildBetaReviewPackage, betaReviewAudit } from "../packages/cutter-engine/export/betaReviewSnapshot"
import { authorizeProjectExport } from "../packages/cutter-engine/export/preExportValidation"
import { getPackModule } from "../apps/web/src/packs"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  loadKyzaProject,
  parseKyzaProject,
  projectFromLegacySpec,
  saveKyzaProject,
  type KyzaProjectStorage,
  type KyzaProjectV1,
  type ParseResult
} from "../packages/cutter-engine/project"
import {
  validateProjectCutter,
  type ValidationRule,
  type ValidationRun
} from "../packages/cutter-engine/validation"
import {
  deliverProjectExportLocally,
  executeProjectExport,
  type GeneratedProjectExport,
  type ProjectExportCancellation,
  type ProjectExportDelivery,
  type ProjectExportRequest
} from "../packages/cutter-engine/export/projectExportService"
import { createValidationAcknowledgement } from "../packages/cutter-engine/export/preExportValidation"
import {
  getExportResultPresentation,
  listExportReleaseActions
} from "../packages/cutter-engine/export/exportReleasePresentation"
import {
  getExportCapability,
  listExportCapabilities
} from "../packages/cutter-engine/export/exportTiers"

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

class MemoryStorage implements KyzaProjectStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const timestamp = "2026-08-02T10:00:00.000Z"
const defaults = getPackModule("flowwrap")?.getDefaults()
if (!defaults) throw new Error("Flow-wrap fixture unavailable.")

const project = projectFromLegacySpec("flowwrap", "Export service", defaults as FlowwrapSpec, {
  id: "export-service-project",
  revision: 4,
  createdAt: timestamp,
  updatedAt: timestamp
})
const validationRun = validateProjectCutter(project, {
  trigger: "pre_export",
  now: () => timestamp,
  rules: []
})
const svgSource = [
  '<svg data-origin-x="0" data-origin-y="0" data-cutter-width="460" data-cutter-height="200">',
  '<g data-layer-id="cutter-outline"><path d="M0 0H460V200H0Z"/></g>',
  '<g data-layer-id="seal-areas"><rect x="0" y="0" width="460" height="10"/></g>',
  '<g data-layer-id="fold-lines"><line x1="230" y1="0" x2="230" y2="200"/></g>',
  '<g data-layer-id="eyemarks"><rect x="5" y="5" width="8" height="4"/></g>',
  '<g id="selection_overlay"><rect data-role="selection-handle" width="5" height="5"/></g>',
  '<image id="ui-preview" href="data:image/png;base64,AAA"/>',
  '</svg>'
].join("")

const executeSvg = (
  holder: { project: KyzaProjectV1 },
  exportId: string,
  overrides: {
    run?: ValidationRun
    deliver?: (artifact: GeneratedProjectExport) =>
      ProjectExportDelivery | ProjectExportCancellation |
      Promise<ProjectExportDelivery | ProjectExportCancellation>
    persist?: (project: KyzaProjectV1, expectedRevision: number) => ParseResult<KyzaProjectV1>
    getLatest?: () => KyzaProjectV1 | null
  } = {}
) => executeProjectExport({
  getLatestProject: overrides.getLatest ?? (() => holder.project),
  persistProject: overrides.persist ?? ((next, expectedRevision) => {
    assert(expectedRevision === holder.project.revision, "Persistence must receive the prepared expected revision.")
    holder.project = next
    return { ok: true, value: next }
  }),
  validationRun: overrides.run ?? validationRun,
  request: {
    format: "ai-compatible-svg",
    tierId: "illustrator-ready",
    source: svgSource,
    options: { includeLayers: true, preserveVector: true, includeValidationReport: true, marginMm: 0 }
  },
  exportId,
  exportedAt: timestamp,
  deliver: overrides.deliver ?? (() => ({ status: "saved", method: "file_system_access" }))
})

const executePdfWithMockBrowser = async (exportId: string) => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => "data:image/jpeg;base64,/9j/2Q=="
  }
  const context = {
    fillStyle: "",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    fillRect: () => undefined,
    drawImageCalls: 0,
    drawImage: () => { context.drawImageCalls += 1 }
  }
  const svgNode = { setAttribute: () => undefined }
  class MockDomParser {
    parseFromString() { return { documentElement: svgNode } }
  }
  class MockXmlSerializer {
    serializeToString() { return svgSource }
  }
  class MockImage {
    onload?: () => void
    set src(_value: string) { this.onload?.() }
  }
  const replacements: Array<[string, PropertyDescriptor | undefined]> = []
  const replaceGlobal = (name: string, value: unknown) => {
    replacements.push([name, Object.getOwnPropertyDescriptor(globalThis, name)])
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  replaceGlobal("document", { createElement: () => canvas })
  replaceGlobal("DOMParser", MockDomParser)
  replaceGlobal("XMLSerializer", MockXmlSerializer)
  replaceGlobal("Image", MockImage)
  const holder: { project: KyzaProjectV1 } = { project }
  try {
    const result = await executeProjectExport({
      getLatestProject: () => holder.project,
      persistProject: next => {
        holder.project = next
        return { ok: true, value: next }
      },
      validationRun,
      request: {
        format: "raster-preview-pdf",
        tierId: "pdf-proof",
        source: svgSource,
        options: { includeLayers: true, preserveVector: false, includeValidationReport: true, marginMm: 0 }
      },
      exportId,
      exportedAt: timestamp,
      deliver: () => ({ status: "saved", method: "file_system_access" })
    })
    return { result, holder, canvas, context }
  } finally {
    replacements.reverse().forEach(([name, descriptor]) => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete (globalThis as Record<string, unknown>)[name]
    })
  }
}

const main = async () => {
  const available = listExportCapabilities().filter(capability => capability.available).map(capability => capability.format)
  assert(JSON.stringify(available) === JSON.stringify(["raster-preview-pdf", "svg", "ai-compatible-svg", "json"]), "Only working beta formats may be active.")
  assert(getExportCapability("pdf-vector")?.available === false, "Vector PDF must remain unavailable.")
  assert(getExportCapability("dxf")?.available === false, "DXF must remain unavailable.")
  assert(getExportCapability("ai")?.available === false, "Native AI must remain unavailable.")
  assert(getExportCapability("repro-pack")?.available === false, "Repro pack must remain unavailable.")
  assert(
    JSON.stringify(listExportReleaseActions().map(action => [action.label, action.available])) ===
      JSON.stringify([
        ["PDF Proof", true],
        ["Editable SVG", true],
        ["Illustrator-Compatible SVG", true],
        ["JSON Project/Cutter Data", true],
        ["GMG/Repro Ready Pack", false]
      ]),
    "Both UI surfaces must receive the same honest Export Release action labels and availability."
  )

  const missingSource = await executeProjectExport({
    getLatestProject: () => project,
    persistProject: next => ({ ok: true, value: next }),
    validationRun,
    request: { format: "svg", tierId: "illustrator-ready" },
    deliver: () => ({ status: "saved", method: "file_system_access" })
  })
  assert(missingSource.ok === false && missingSource.code === "source_required", "A source-dependent generator must fail closed without SVG input.")

  const unavailable = await executeProjectExport({
    getLatestProject: () => project,
    persistProject: next => ({ ok: true, value: next }),
    validationRun,
    request: { format: "pdf-vector", tierId: "repro-ready-pack", source: svgSource },
    deliver: () => ({ status: "saved", method: "file_system_access" })
  })
  assert(unavailable.ok === false && unavailable.code === "format_unavailable", "Unavailable formats must be rejected before generation.")

  const supportedRouteRequests: ProjectExportRequest[] = [
    { format: "raster-preview-pdf", tierId: "pdf-proof", source: svgSource, options: { marginMm: 0 } },
    { format: "svg", tierId: "illustrator-ready", source: svgSource, options: { marginMm: 0 } },
    { format: "json", tierId: "illustrator-ready" }
  ]
  const criticalRule: ValidationRule = {
    id: "QA_EXPORT_CRITICAL",
    description: "Deterministic Export Release blocking fixture.",
    appliesTo: () => true,
    evaluate: () => [{
      id: "qa-export-critical-issue",
      ruleId: "QA_EXPORT_CRITICAL",
      severity: "critical",
      title: "QA export blocker",
      message: "QA export blocker",
      blocksExport: true,
      acknowledgementAllowed: false
    }]
  }
  const criticalValidationRun = validateProjectCutter(project, {
    trigger: "pre_export",
    now: () => timestamp,
    rules: [criticalRule]
  })
  for (const request of supportedRouteRequests) {
    let routeDelivered = false
    const blocked = await executeProjectExport({
      getLatestProject: () => project,
      persistProject: next => ({ ok: true, value: next }),
      validationRun: criticalValidationRun,
      request,
      exportId: `blocked-${request.format}`,
      exportedAt: timestamp,
      ...(request.format === "raster-preview-pdf"
        ? { pdfGenerator: async () => new Blob(["unused"], { type: "application/pdf" }) }
        : {}),
      deliver: () => {
        routeDelivered = true
        return { status: "saved", method: "file_system_access" }
      }
    })
    assert(blocked.ok === false && blocked.code === "critical_issues" && !routeDelivered, `${request.format} must apply the shared blocking validation gate before delivery.`)
  }

  for (const request of supportedRouteRequests) {
    const exportId = `overridden-${request.format}`
    const override = createValidationAcknowledgement({
      project,
      validationRun: criticalValidationRun,
      acknowledgedIssueIds: criticalValidationRun.issues.map(issue => issue.id),
      acknowledgedAt: timestamp,
      exportRequestId: exportId,
      overrideCriticalErrors: true
    })
    assert(override.ok, `${request.format} must create an exact Critical override.`)
    if (!override.ok) return
    let persisted: KyzaProjectV1 | undefined
    const exported = await executeProjectExport({
      getLatestProject: () => project,
      persistProject: next => {
        persisted = next
        return { ok: true, value: next }
      },
      validationRun: criticalValidationRun,
      acknowledgement: override.value,
      request,
      exportId,
      exportedAt: timestamp,
      ...(request.format === "raster-preview-pdf"
        ? { pdfGenerator: async () => new Blob(["pdf"], { type: "application/pdf" }) }
        : {}),
      deliver: () => ({ status: "saved", method: "file_system_access" })
    })
    assert(exported.ok, `${request.format} must export after the explicit Critical override.`)
    if (!exported.ok) return
    assert(
      JSON.stringify(exported.record.overriddenCriticalIssueIds) === JSON.stringify(["qa-export-critical-issue"]),
      "Completed export records must retain overridden Critical IDs."
    )
    assert(exported.record.snapshot?.projectName === project.name, "Completed export records must retain the project snapshot.")
    assert(exported.record.snapshot?.validationRun.id === criticalValidationRun.id, "Completed export records must retain the exact failed validation run.")
    assert(exported.record.snapshot?.cutterSpec.width === project.cutter.legacySpec.width, "Completed export records must retain the cutter specification snapshot.")
    assert(persisted?.exportAuditRecords?.some(record => record.id === exportId), "Every completed overridden export must be captured in Project history.")
  }

  const holder: { project: KyzaProjectV1 } = { project }
  const first = await executeSvg(holder, "export-record-one")
  assert(first.ok, "A policy-authorized generated and saved SVG must complete.")
  if (!first.ok) return
  assert(first.record.filename.endsWith(".illustrator.svg"), "The record must retain the delivered filename.")
  assert(first.record.mimeType === "image/svg+xml", "The record must retain MIME type.")
  assert(first.record.packReference.enginePackTypeId === "flowwrap", "The record must retain the engine pack reference.")
  assert(first.record.cutterReference.elementIds.length === project.cutter?.identityMap.elements.length, "The record must retain stable Cutter element references.")
  assert(first.record.dimensions.units === "mm" && first.record.page.widthMm === 460, "The record must retain cutter and page dimensions.")
  assert(first.record.layers.ids.includes("cutter-outline"), "The record must retain generated layer metadata.")
  assert(
    ["seal-areas", "fold-lines", "eyemarks"].every(layerId => first.record.layers.ids.includes(layerId)),
    "The generated record must retain seal, fold and eyemark Cutter groups."
  )
  assert(first.record.sizeBytes === first.artifact.blob.size && first.record.generatorResult === "generated", "The record must retain generator result and byte size without Blob bytes.")
  assert(first.record.deliveryStatus === "saved", "File System Access completion must be recorded only after delivery succeeds.")
  assert(first.record.projectId === project.id && first.record.projectRevision === project.revision, "Export history must be associated with the exact Project revision.")
  const firstRecordSnapshot = JSON.stringify(first.record)
  const firstSvgMarkup = await first.artifact.blob.text()
  assert(firstSvgMarkup.startsWith("<?xml") && firstSvgMarkup.includes("<path"), "Delivered SVG must be parseable vector markup.")
  assert(firstSvgMarkup.includes('width="460mm"') && firstSvgMarkup.includes('height="200mm"'), "Delivered SVG must preserve 1:1 mm dimensions.")
  assert(firstSvgMarkup.includes(`data-kyza-project-id="${project.id}"`) && firstSvgMarkup.includes(`data-kyza-revision="${project.revision}"`), "Delivered SVG metadata must identify the exact Project revision.")
  assert(["seal-areas", "fold-lines", "eyemarks"].every(layerId => firstSvgMarkup.includes(`data-layer-id="${layerId}"`)), "Delivered SVG must preserve technical Cutter groups.")
  assert(!firstSvgMarkup.includes("selection_overlay") && !firstSvgMarkup.includes("selection-handle") && !firstSvgMarkup.includes("<image"), "Delivered SVG must exclude Cutter Studio overlays and unintended rasters.")

  // Native picker resolves to saved only after write and close, then appends once.
  const nativeEvents: string[] = []
  let pickerOptions: { suggestedName?: string; types?: Array<{ description?: string; accept: Record<string, string[]> }> } | undefined
  let releaseClose: (() => void) | undefined
  let notifyCloseStarted: (() => void) | undefined
  const closeGate = new Promise<void>(resolve => { releaseClose = resolve })
  const closeStarted = new Promise<void>(resolve => { notifyCloseStarted = resolve })
  const nativeHandle = {
    createWritable: async () => ({
      write: async () => { nativeEvents.push("write") },
      close: async () => {
        nativeEvents.push("close_started")
        notifyCloseStarted?.()
        await closeGate
        nativeEvents.push("close_completed")
      }
    })
  } as unknown as FileSystemFileHandle
  const nativeHolder: { project: KyzaProjectV1 } = { project }
  let nativeSettled = false
  const nativeExecution = executeSvg(nativeHolder, "export-native-picker", {
    deliver: artifact => deliverProjectExportLocally(artifact, {
      showSaveFilePicker: async options => {
        pickerOptions = options
        nativeEvents.push("picker")
        return nativeHandle
      }
    })
  }).then(result => {
    nativeSettled = true
    return result
  })
  await closeStarted
  assert(nativeEvents.includes("close_started") && !nativeSettled, "Native delivery must not report saved before writable.close resolves.")
  releaseClose?.()
  const nativeResult = await nativeExecution
  assert(nativeResult.ok && nativeResult.delivery.status === "saved", "Native picker completion must be classified as saved.")
  assert(JSON.stringify(nativeEvents) === JSON.stringify(["picker", "write", "close_started", "close_completed"]), "Native picker must write and close in order.")
  assert(pickerOptions?.suggestedName?.endsWith(".illustrator.svg"), "Native picker must receive the generated suggested filename.")
  assert(pickerOptions?.types?.[0]?.accept["image/svg+xml"]?.[0] === ".svg", "Native picker must receive MIME and extension metadata.")
  assert(nativeHolder.project.exportAuditRecords?.length === 1, "Native picker success must append exactly one Export Record.")

  // Picker cancellation is a typed neutral outcome with no fallback or history.
  const cancelledHolder: { project: KyzaProjectV1 } = { project }
  let cancellationFallbackClicks = 0
  const cancelled = await executeSvg(cancelledHolder, "export-cancelled", {
    deliver: artifact => deliverProjectExportLocally(artifact, {
      showSaveFilePicker: async () => {
        const error = new Error("cancelled")
        error.name = "AbortError"
        throw error
      },
      document: {
        createElement: () => ({ click: () => { cancellationFallbackClicks += 1 } })
      } as unknown as Document
    })
  })
  assert(cancelled.ok === false && cancelled.code === "cancelled", "Native picker cancellation must be represented by the typed cancelled code.")
  assert(cancellationFallbackClicks === 0, "Picker cancellation must not silently fall back to an anchor download.")
  assert(!cancelledHolder.project.exportAuditRecords?.length, "Picker cancellation must not append successful history.")
  const cancelledPresentation = getExportResultPresentation(cancelled, listExportReleaseActions()[2]!)
  assert(cancelledPresentation.state === "cancelled" && !cancelledPresentation.announceAsError, "Cancellation must not be presented as an application error.")

  // Picker-unavailable fallback initiates one download and records that weaker truth.
  const fallbackHolder: { project: KyzaProjectV1 } = { project }
  let fallbackClicks = 0
  let createdUrl = ""
  let revokedUrl = ""
  const fallback = await executeSvg(fallbackHolder, "export-browser-fallback", {
    deliver: artifact => deliverProjectExportLocally(artifact, {
      document: {
        createElement: () => ({
          href: "",
          download: "",
          click: () => { fallbackClicks += 1 }
        })
      } as unknown as Document,
      urlApi: {
        createObjectURL: () => {
          createdUrl = "blob:test-export"
          return createdUrl
        },
        revokeObjectURL: url => { revokedUrl = url }
      }
    })
  })
  assert(fallback.ok && fallback.delivery.status === "download_initiated", "Picker-unavailable fallback must be classified as download_initiated.")
  assert(fallbackClicks === 1 && createdUrl === revokedUrl, "Fallback must click one anchor and revoke its Blob URL.")
  assert(fallbackHolder.project.exportAuditRecords?.length === 1, "Fallback must append exactly one corresponding Export Record.")
  assert(
    fallback.artifact.mimeType === nativeResult.artifact.mimeType &&
      JSON.stringify(fallback.artifact.page) === JSON.stringify(nativeResult.artifact.page) &&
      JSON.stringify(fallback.artifact.layers) === JSON.stringify(nativeResult.artifact.layers),
    "Native picker and browser fallback must deliver equivalent valid export structures."
  )
  const fallbackPresentation = getExportResultPresentation(fallback, listExportReleaseActions()[2]!)
  assert(fallbackPresentation.state === "download_initiated" && fallbackPresentation.message.includes("filesystem completion is not confirmed"), "Fallback UI must not claim filesystem completion.")

  // Native write and close failures remain delivery failures with no history.
  for (const failureStage of ["write", "close"] as const) {
    const failedNativeHolder: { project: KyzaProjectV1 } = { project }
    const failedNative = await executeSvg(failedNativeHolder, `export-native-${failureStage}-failure`, {
      deliver: artifact => deliverProjectExportLocally(artifact, {
        showSaveFilePicker: async () => ({
          createWritable: async () => ({
            write: async () => {
              if (failureStage === "write") throw new Error("native write failed")
            },
            close: async () => {
              if (failureStage === "close") throw new Error("native close failed")
            }
          })
        } as unknown as FileSystemFileHandle)
      })
    })
    assert(failedNative.ok === false && failedNative.code === "delivery_failed", `Native ${failureStage} failure must be an accurate delivery failure.`)
    assert(!failedNativeHolder.project.exportAuditRecords?.length, `Native ${failureStage} failure must not append successful history.`)
  }

  const second = await executeSvg(holder, "export-record-two")
  assert(second.ok && holder.project.exportAuditRecords?.length === 2, "Repeated intentional exports must append immutable history.")
  assert(JSON.stringify(holder.project.exportAuditRecords?.[0]) === firstRecordSnapshot, "Appending export history must not alter prior records.")
  const duplicateProjectRecord = parseKyzaProject({
    ...holder.project,
    exportAuditRecords: [first.record, first.record]
  })
  assert(duplicateProjectRecord.ok === false && duplicateProjectRecord.errors.some(error => error.includes("duplicate ID")), "Project parsing must reject duplicate export record IDs.")
  const duplicate = await executeSvg(holder, "export-record-two")
  assert(duplicate.ok === false && duplicate.code === "duplicate_export_id", "A duplicate export ID must reject rather than replace history.")
  assert(holder.project.exportAuditRecords?.length === 2, "Duplicate rejection must not mutate history.")

  let delivered = false
  const writeFailureHolder: { project: KyzaProjectV1 } = { project }
  const writeFailure = await executeSvg(writeFailureHolder, "export-write-failure", {
    deliver: () => {
      delivered = true
      throw new Error("disk write failed")
    }
  })
  assert(delivered && writeFailure.ok === false && writeFailure.code === "delivery_failed", "A Blob/write failure must be reported as delivery failure.")
  assert(!writeFailureHolder.project.exportAuditRecords?.length, "A delivery failure must not create successful history.")

  for (const request of supportedRouteRequests) {
    const failedRouteHolder: { project: KyzaProjectV1 } = { project }
    const failedRoute = await executeProjectExport({
      getLatestProject: () => failedRouteHolder.project,
      persistProject: next => {
        failedRouteHolder.project = next
        return { ok: true, value: next }
      },
      validationRun,
      request,
      exportId: `delivery-failure-${request.format}`,
      exportedAt: timestamp,
      ...(request.format === "raster-preview-pdf"
        ? { pdfGenerator: async () => new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }) }
        : {}),
      deliver: () => { throw new Error(`${request.format} delivery failed`) }
    })
    assert(failedRoute.ok === false && failedRoute.code === "delivery_failed", `${request.format} must expose delivery failure without claiming export success.`)
    assert(!failedRouteHolder.project.exportAuditRecords?.length, `${request.format} delivery failure must not append history.`)
  }

  const persistenceHolder: { project: KyzaProjectV1 } = { project }
  const persistenceFailure = await executeSvg(persistenceHolder, "export-history-failure", {
    persist: () => ({ ok: false, errors: ["storage unavailable"] })
  })
  assert(persistenceFailure.ok === false && persistenceFailure.code === "history_persistence_failed" && persistenceFailure.delivery?.status === "saved", "A delivered-file/history-failed result must be explicit.")
  assert(!persistenceHolder.project.exportAuditRecords?.length, "Failed persistence must not claim saved history.")
  const historyFailurePresentation = getExportResultPresentation(persistenceFailure, listExportReleaseActions()[2]!)
  assert(
    historyFailurePresentation.state === "history_persistence_failed" &&
      historyFailurePresentation.message.startsWith("File delivered, but export history failed:") &&
      historyFailurePresentation.announceAsError,
    "Post-delivery persistence failure must preserve delivery truth through a typed presentation state and required message."
  )

  let latestCalls = 0
  let raceDelivered = false
  const revisionRace = await executeSvg({ project }, "export-revision-race", {
    getLatest: () => {
      latestCalls += 1
      return latestCalls === 1 ? project : { ...project, revision: project.revision + 1 }
    },
    deliver: () => {
      raceDelivered = true
      return { status: "saved", method: "file_system_access" }
    }
  })
  assert(revisionRace.ok === false && revisionRace.code === "project_revision_changed" && !raceDelivered, "A revision change during preparation must prevent file delivery and evidence.")

  for (const request of supportedRouteRequests.filter(candidate => candidate.format !== "svg")) {
    let routeLatestCalls = 0
    let routeDelivered = false
    const revisionChanged = await executeProjectExport({
      getLatestProject: () => {
        routeLatestCalls += 1
        return routeLatestCalls === 1 ? project : { ...project, revision: project.revision + 1 }
      },
      persistProject: next => ({ ok: true, value: next }),
      validationRun,
      request,
      exportId: `revision-race-${request.format}`,
      exportedAt: timestamp,
      ...(request.format === "raster-preview-pdf"
        ? { pdfGenerator: async () => new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }) }
        : {}),
      deliver: () => {
        routeDelivered = true
        return { status: "saved", method: "file_system_access" }
      }
    })
    assert(revisionChanged.ok === false && revisionChanged.code === "project_revision_changed" && !routeDelivered, `${request.format} must reject a Project revision change before delivery.`)
  }

  const pdfExecution = await executePdfWithMockBrowser("export-pdf-proof")
  assert(pdfExecution.result.ok, "The supported PDF Proof route must generate, deliver and persist evidence.")
  if (!pdfExecution.result.ok) return
  const pdfText = new TextDecoder("latin1").decode(await pdfExecution.result.artifact.blob.arrayBuffer())
  const expectedPdfWidth = (460 * 72) / 25.4
  const expectedPdfHeight = (200 * 72) / 25.4
  assert(pdfText.startsWith("%PDF-1.4") && pdfText.endsWith("%%EOF"), "PDF Proof must have a complete PDF header and trailer.")
  assert(pdfText.includes(`/MediaBox [0 0 ${expectedPdfWidth} ${expectedPdfHeight}]`), "PDF page bounds must preserve the 1:1 millimetre cutter frame.")
  assert(
    pdfExecution.canvas.width === Math.round((460 / 25.4) * 600) &&
      pdfExecution.canvas.height === Math.round((200 / 25.4) * 600) &&
      pdfExecution.context.imageSmoothingQuality === "high" &&
      pdfExecution.context.drawImageCalls === 1,
    "PDF Proof must rasterise once at the documented 600 dpi for readable technical lines."
  )
  assert(
    (pdfText.match(/\/Subtype \/Image/g) ?? []).length === 1 &&
      pdfText.includes("/Filter /DCTDecode") &&
      pdfText.includes("/Subject (Kyza raster proof; not editable vector)"),
    "PDF rasterisation and flattened-layer limitations must be intentional and recorded."
  )
  const xrefOffset = pdfText.indexOf("xref\n")
  const xrefLines = pdfText.slice(xrefOffset).split("\n")
  assert(xrefOffset > 0 && xrefLines[1] === "0 7", "PDF Proof must contain a complete cross-reference table.")
  for (let objectIndex = 1; objectIndex <= 6; objectIndex += 1) {
    const objectOffset = Number(xrefLines[objectIndex + 2]?.slice(0, 10))
    assert(pdfText.slice(objectOffset).startsWith(`${objectIndex} 0 obj`), `PDF object ${objectIndex} must have a valid cross-reference offset.`)
  }
  assert(pdfExecution.result.record.projectRevision === project.revision, "PDF history must retain the exported Project revision.")
  assert(pdfExecution.holder.project.exportAuditRecords?.length === 1, "PDF delivery must append exactly one immutable history record.")

  const generationFailure = await executeProjectExport({
    getLatestProject: () => project,
    persistProject: next => ({ ok: true, value: next }),
    validationRun,
    request: { format: "raster-preview-pdf", tierId: "pdf-proof", source: svgSource },
    exportId: "export-generator-failure",
    pdfGenerator: async () => { throw new Error("generator exploded") },
    deliver: () => ({ status: "saved", method: "file_system_access" })
  })
  assert(generationFailure.ok === false && generationFailure.code === "generation_failed", "Generator exceptions must fail without delivery or evidence.")

  const jsonHolder: { project: KyzaProjectV1 } = { project }
  const json = await executeProjectExport({
    getLatestProject: () => jsonHolder.project,
    persistProject: next => {
      jsonHolder.project = next
      return { ok: true, value: next }
    },
    validationRun,
    request: { format: "json", tierId: "illustrator-ready" },
    exportId: "export-json",
    deliver: () => ({ status: "download_initiated", method: "browser_download" })
  })
  assert(json.ok && json.record.deliveryStatus === "download_initiated", "Browser download fallback must remain distinct from a confirmed saved file.")
  if (!json.ok) return
  const jsonPayload = JSON.parse(await json.artifact.blob.text()) as {
    project: { id: string; revision: number; name: string }
    cutterSpecification: {
      dimensions: { widthMm: number; heightMm: number }
      starterSpecification: FlowwrapSpec
      elements: Array<{ id: string }>
    }
    validation: { validationRunId?: string }
  }
  assert(
    jsonPayload.project.id === project.id &&
      jsonPayload.project.revision === project.revision &&
      jsonPayload.project.name === project.name,
    "JSON output must represent the exact Project identity and revision."
  )
  assert(
    jsonPayload.cutterSpecification.dimensions.widthMm === project.cutter?.legacySpec.width &&
      jsonPayload.cutterSpecification.dimensions.heightMm === project.cutter?.legacySpec.height &&
      JSON.stringify(jsonPayload.cutterSpecification.starterSpecification) === JSON.stringify(project.cutter?.legacySpec),
    "JSON output must preserve the exact technical dimensions and Cutter state without stale values."
  )
  assert(
    JSON.stringify(jsonPayload.cutterSpecification.elements.map(element => element.id)) ===
      JSON.stringify(project.cutter?.identityMap.elements.map(element => element.id)) &&
      jsonPayload.validation.validationRunId === validationRun.id,
    "JSON output must remain technically inspectable and retain element and validation identity."
  )
  assert(json.record.projectId === project.id && json.record.projectRevision === project.revision, "JSON history must retain the exact exported Project revision.")

  const storage = new MemoryStorage()
  assert(saveKyzaProject(holder.project, storage).ok, "Complete export records must save through canonical Project storage.")
  const reopened = loadKyzaProject(project.id, storage)
  assert(reopened.ok && reopened.value.exportAuditRecords?.length === 2, "Complete append-only history must survive reopen.")
  const legacyRecord = {
    id: "legacy-export-record",
    projectId: project.id,
    projectRevision: project.revision,
    validationRunId: validationRun.id,
    rulesetVersion: validationRun.rulesetVersion,
    validationStatus: validationRun.status,
    criticalCount: 0,
    warningCount: 0,
    advisoryCount: 0,
    criticalIssueIds: [],
    warningIssueIds: [],
    advisoryIssueIds: [],
    acknowledgedWarningIssueIds: [],
    exportedAt: timestamp,
    exportFormat: "svg"
  }
  assert(parseKyzaProject({ ...project, exportAuditRecords: [legacyRecord] }).ok, "Saved V1 validation-only export audit records must remain readable without rewrite.")

  let unavailableDeliveryFailed = false
  try {
    await deliverProjectExportLocally(first.artifact)
  } catch {
    unavailableDeliveryFailed = true
  }
  assert(unavailableDeliveryFailed, "Unavailable browser delivery APIs must fail safely.")

  const criticalRun: ValidationRun = {
    ...validationRun, status: "failed", issues: [{ id: "critical-test", ruleId: "TEST_CRITICAL", severity: "critical",
      title: "Critical review fixture", message: "Review this failed design", blocksExport: true, acknowledgementAllowed: false }],
    summary: { criticalCount: 1, warningCount: 0, advisoryCount: 0, issueCount: 1, blocksExport: true }
  }
  const reviewInput = { project, run: criticalRun, reviewer: "Beta reviewer", reason: "Investigate this rule against the press specification", acknowledgedIssueIds: ["critical-test"], now: timestamp }
  const unchanged = JSON.stringify(project)
  const snapshot = createBetaReviewSnapshot(reviewInput)
  assert(snapshot.productionApproved === false && snapshot.decision.criticalOverride, "Critical review must remain explicitly unapproved.")
  assert(snapshot.validationRun.status === "failed", "A beta override must never convert failed validation into a pass.")
  assert(JSON.stringify(project) === unchanged, "Snapshot capture must not mutate its source Project.")
  const audit = betaReviewAudit(snapshot)
  const restoredReview = parseKyzaProject({ ...project, exportAuditRecords: [audit] })
  assert(restoredReview.ok && restoredReview.value.exportAuditRecords?.[0]?.betaReview?.reason === reviewInput.reason, "Reviewer decision must round-trip through Project storage.")
  assert(!parseKyzaProject({ ...project, exportAuditRecords: [{ ...audit, betaReview: { ...audit.betaReview, productionApproved: true } }] }).ok, "Beta review evidence cannot claim production approval.")
  assert(!authorizeProjectExport({ project, validationRun: criticalRun, exportFormat: "svg" }).ok, "Normal release remains blocked by critical validation; only explicit beta review output is permitted.")
  for (const invalid of [
    { ...reviewInput, reason: " " }, { ...reviewInput, reviewer: " " }, { ...reviewInput, acknowledgedIssueIds: [] },
    { ...reviewInput, project: { ...project, revision: project.revision + 1 } },
    { ...reviewInput, run: { ...criticalRun, rulesetVersion: "obsolete" } },
    { ...reviewInput, run: { ...criticalRun, status: "error" as const } }
  ]) {
    let rejected = false
    try { createBetaReviewSnapshot(invalid) } catch { rejected = true }
    assert(rejected, "Invalid or unreviewed beta override must be rejected.")
  }
  const bundle = await buildBetaReviewPackage(snapshot, svgSource.replace("</svg>", '<g data-layer-id="safe-zones"/></svg>'), async () => new Blob(["%PDF-test"]))
  assert(bundle.manifest.visualAvailable && bundle.manifest.pdfAvailable, "Beta bundle must include marked visual and PDF proof when available.")
  const bytes = new Uint8Array(await bundle.blob.arrayBuffer())
  const view = new DataView(bytes.buffer), decoder = new TextDecoder(), entries = new Map<string, string>()
  let offset = 0
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true), nameSize = view.getUint16(offset + 26, true)
    const start = offset + 30, data = start + nameSize
    entries.set(decoder.decode(bytes.slice(start, data)), decoder.decode(bytes.slice(data, data + size)))
    offset = data + size
  }
  assert(entries.size === 4 && entries.has("review.pdf") && entries.has("snapshot.json") && entries.has("report.html") && entries.has("review.svg"), "Review ZIP entries must be independently readable.")
  assert(entries.get("review.svg")!.includes("UNAPPROVED BETA REVIEW - NOT FOR PRODUCTION"), "Visual proof must carry the unapproved notice.")
  assert(!entries.get("review.svg")!.includes('/ data-layer-name'), "Empty SVG layers must remain well-formed after metadata is attached.")
  assert(JSON.parse(entries.get("snapshot.json")!).validationRun.issues[0].id === "critical-test", "Full failed-rule evidence must be retained.")
  const failedPdf = await buildBetaReviewPackage(snapshot, svgSource, async () => { throw new Error("Test PDF failure") })
  assert(failedPdf.manifest.visualAvailable && !failedPdf.manifest.pdfAvailable && failedPdf.manifest.errors.includes("Test PDF failure"), "PDF failure must retain and accurately describe available evidence.")
  const diagnosticBundle = await buildBetaReviewPackage(snapshot)
  assert(!diagnosticBundle.manifest.visualAvailable && !diagnosticBundle.manifest.pdfAvailable, "Unrenderable designs must still provide diagnostic snapshots.")
  console.log("Beta review snapshot: critical override, required decision, stale rejection, audit persistence, ZIP and preview failure checks passed.")
  console.log("Project export service tests passed.")
}

main().catch(error => { throw error })
