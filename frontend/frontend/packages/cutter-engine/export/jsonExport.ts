import type { KyzaProjectV1 } from "../project"
import type { ValidationResult } from "../validation"
import {
  buildExportLayerManifest,
  type ExportLayerManifest
} from "./exportLayerManifest"
import type { ExportPackage } from "./exportPackage"

export const KYZA_JSON_EXPORT_SCHEMA_VERSION = "kyza-json-export-1" as const

export type KyzaJsonExport = {
  schemaVersion: typeof KYZA_JSON_EXPORT_SCHEMA_VERSION
  exportedAt: string
  exportPackage: ExportPackage
  project: {
    id: string
    name: string
    revision: number
    status?: string
    source: string
    originalPrompt?: string
    createdAt: string
    updatedAt: string
  }
  packSpecification: {
    packTypeId: string
    displayPackType: string
    enginePackTypeId: string
    confidence?: string
    assumptions: string[]
    starterDefaults?: unknown
  }
  cutterSpecification: {
    packTypeId: string
    units: string
    coordinateSpace: string
    dimensions: {
      widthMm: number
      heightMm: number
    }
    starterSpecification: KyzaProjectV1["cutter"]["legacySpec"]
    elements: KyzaProjectV1["cutter"]["identityMap"]["elements"]
  }
  artwork: {
    status: ExportPackage["artworkStatus"]
    notes: string[]
  }
  validation: {
    readiness: ExportPackage["readiness"]
    summary: ExportPackage["validationSummary"]
    issues: ValidationResult["messages"]
    advisories: string[]
    validationRunId?: string
    rulesetVersion?: string
    acknowledgementId?: string
    acknowledgedWarningIssueIds: string[]
    overriddenCriticalIssueIds: string[]
    advisoryIssueIds: string[]
  }
  layerManifest: ExportLayerManifest
  metadata: {
    source: "save_export"
    generatedBy: "Kyza"
    reviewRequired: true
  }
}

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const buildKyzaJsonExport = (input: {
  exportPackage: ExportPackage
  project: KyzaProjectV1
  validation: ValidationResult
  exportedAt?: string
}): KyzaJsonExport => {
  const { project, validation, exportPackage } = input
  const draft = project.projectDraft
  const packSpecification = draft?.packSpecification
  const exportedAt = input.exportedAt ?? exportPackage.createdAt
  const artworkNotes = exportPackage.artworkStatus === "not_uploaded"
    ? exportPackage.advisories.filter(note => note.toLowerCase().includes("artwork"))
    : []
  return {
    schemaVersion: KYZA_JSON_EXPORT_SCHEMA_VERSION,
    exportedAt,
    exportPackage: cloneJson(exportPackage),
    project: {
      id: project.id,
      name: project.name,
      revision: project.revision,
      ...(draft?.status ? { status: draft.status } : {}),
      source: draft?.source ?? "cutter-studio",
      ...(draft?.productPrompt ? { originalPrompt: draft.productPrompt } : {}),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    packSpecification: {
      packTypeId: packSpecification?.packTypeId ?? project.cutter.packType,
      displayPackType: packSpecification?.displayName ?? project.name,
      enginePackTypeId:
        packSpecification?.enginePackTypeId ?? project.cutter.packType,
      ...(packSpecification?.confidence
        ? { confidence: packSpecification.confidence }
        : {}),
      assumptions: [...(packSpecification?.assumptions ?? [])],
      ...(packSpecification?.starterDefaults
        ? { starterDefaults: cloneJson(packSpecification.starterDefaults) }
        : {})
    },
    cutterSpecification: {
      packTypeId: project.cutter.packType,
      units: project.cutter.units,
      coordinateSpace: project.cutter.coordinateSpace,
      dimensions: {
        widthMm: project.cutter.legacySpec.width,
        heightMm: project.cutter.legacySpec.height
      },
      starterSpecification: cloneJson(project.cutter.legacySpec),
      elements: cloneJson(project.cutter.identityMap.elements)
    },
    artwork: {
      status: exportPackage.artworkStatus,
      notes: artworkNotes
    },
    validation: {
      readiness: exportPackage.readiness,
      summary: { ...exportPackage.validationSummary },
      issues: cloneJson(validation.messages),
      advisories: [...exportPackage.advisories],
      ...(exportPackage.exportAudit
        ? {
            validationRunId: exportPackage.exportAudit.validationRunId,
            rulesetVersion: exportPackage.exportAudit.rulesetVersion,
            ...(exportPackage.exportAudit.acknowledgementId
              ? { acknowledgementId: exportPackage.exportAudit.acknowledgementId }
              : {})
          }
        : {}),
      acknowledgedWarningIssueIds: [
        ...(exportPackage.exportAudit?.acknowledgedWarningIssueIds ?? [])
      ],
      overriddenCriticalIssueIds: [
        ...(exportPackage.exportAudit?.overriddenCriticalIssueIds ?? [])
      ],
      advisoryIssueIds: [...(exportPackage.exportAudit?.advisoryIssueIds ?? [])]
    },
    layerManifest: buildExportLayerManifest({
      project,
      validation,
      exportPackage,
      createdAt: exportedAt
    }),
    metadata: {
      source: "save_export",
      generatedBy: "Kyza",
      reviewRequired: true
    }
  }
}

export const serializeKyzaJsonExport = (payload: KyzaJsonExport) =>
  `${JSON.stringify(payload, null, 2)}\n`

const sanitizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project"

export const createKyzaJsonExportFilename = (payload: KyzaJsonExport) =>
  `kyza-export-${sanitizeSlug(payload.packSpecification.packTypeId)}-${payload.exportedAt.slice(0, 10)}.json`
