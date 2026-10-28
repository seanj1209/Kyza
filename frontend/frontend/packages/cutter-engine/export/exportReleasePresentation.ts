import type { CutterExportFormat } from "./cutterExportService"
import type { ProjectExportServiceResult } from "./projectExportService"
import {
  getExportCapability,
  type ExportCapability,
  type ExportTierId
} from "./exportTiers"

export type ExportReleaseAction = {
  format: CutterExportFormat
  tierId: ExportTierId
  label: string
  description: string
  available: boolean
  disabledReason?: string
  mimeType: string
  extensions: string[]
  sourceRequired: boolean
}

const EXPORT_RELEASE_FORMAT_ORDER: CutterExportFormat[] = [
  "raster-preview-pdf",
  "svg",
  "ai-compatible-svg",
  "json",
  "repro-pack"
]

const toReleaseAction = (capability: ExportCapability): ExportReleaseAction => ({
  format: capability.format,
  tierId: capability.tierId,
  label: capability.label,
  description: capability.description,
  available: capability.available,
  ...(!capability.available
    ? { disabledReason: `${capability.label} is ${capability.status} and is not available in the beta.` }
    : {}),
  mimeType: capability.mimeType,
  extensions: [...capability.extensions],
  sourceRequired: capability.sourceRequired
})

export const listExportReleaseActions = (): ExportReleaseAction[] =>
  EXPORT_RELEASE_FORMAT_ORDER
    .map(format => getExportCapability(format))
    .filter((capability): capability is ExportCapability => Boolean(capability))
    .map(toReleaseAction)

export const getExportReleaseAction = (format: CutterExportFormat) => {
  const capability = getExportCapability(format)
  return capability ? toReleaseAction(capability) : undefined
}

export type ExportResultPresentation = {
  state: "saved" | "download_initiated" | "cancelled" | "delivery_failed" | "history_persistence_failed" | "failed"
  message: string
  announceAsError: boolean
}

export const getExportResultPresentation = (
  result: ProjectExportServiceResult,
  action: Pick<ExportReleaseAction, "label">
): ExportResultPresentation => {
  if (result.ok === true) {
    return result.delivery.status === "saved"
      ? {
          state: "saved",
          message: `${action.label} saved. Export history recorded.`,
          announceAsError: false
        }
      : {
          state: "download_initiated",
          message: `${action.label} download initiated. Export history recorded; filesystem completion is not confirmed.`,
          announceAsError: false
        }
  }
  if (result.code === "cancelled") {
    return {
      state: "cancelled",
      message: `${action.label} export cancelled. No export history was created.`,
      announceAsError: false
    }
  }
  if (result.code === "history_persistence_failed") {
    return {
      state: "history_persistence_failed",
      message: `File delivered, but export history failed: ${result.errors.join(" ")}`,
      announceAsError: true
    }
  }
  if (result.code === "delivery_failed") {
    return {
      state: "delivery_failed",
      message: `${action.label} delivery failed: ${result.errors.join(" ")}`,
      announceAsError: true
    }
  }
  return {
    state: "failed",
    message: `${action.label} export failed: ${result.errors.join(" ")}`,
    announceAsError: true
  }
}
