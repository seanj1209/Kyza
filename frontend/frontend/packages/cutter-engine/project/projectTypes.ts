import type { FlowwrapSpec } from "../types"
import type {
  CutterExportAuditRecord,
  ValidationAcknowledgement,
  ValidationRun
} from "../validation/validationTypes"

export const CUTNFLOW_PROJECT_SCHEMA_VERSION = 1 as const
export const CUTNFLOW_PROJECT_UNITS = "mm" as const
export const CUTNFLOW_PROJECT_COORDINATE_SPACE = "legacy-flowwrap" as const

export type ParseResult<T> =
  | { ok: true; value: T; warnings?: string[] }
  | { ok: false; errors: string[] }

export type CutterElementType =
  | "eyemark"
  | "perf-lane"
  | "tear-notch"
  | "safe-zone"
  | "fold-line"
  | "hanger-slot"
  | "window"
  | "attribute-box"
  | "half-moon"
  | "plain-web-guide"

export type CutterElementCoordinateSpace =
  | "cutter-origin-mm"
  | "live-area-mm"
  | "anchor-relative-mm"
  | "legacy-flowwrap"

export type CutterElementRef = {
  id: string
  type: CutterElementType
  legacyPath: string
  coordinateSpace: CutterElementCoordinateSpace
  status: "active" | "inactive" | "legacy-derived"
}

export type EyemarkElementRef = CutterElementRef & {
  type: "eyemark"
  index: 0 | 1
  side?: "left" | "right" | "top" | "bottom"
  widthMm: number
  heightMm: number
  offsetXMm?: number
  offsetYMm?: number
}

export type PerfLaneElementRef = CutterElementRef & {
  type: "perf-lane"
  index: number
  mode: "continuous" | "regulated"
  originXMm: number
  originYMm?: number
  diameterMm: number
}

export type TearNotchElementRef = CutterElementRef & {
  type: "tear-notch"
  construction: "doy" | "sachet"
  widthMm: number
  depthMm: number
  offsetXMm?: number
  offsetYMm?: number
}

export type CutterIdentityMapV1 = {
  elements: CutterElementRef[]
}

export type ExportSettingsV1 = {
  format?: "pdf" | "svg" | "ai"
  preserveVector?: boolean
  includeLayers?: boolean
}

export type CutterDocumentV1 = {
  units: typeof CUTNFLOW_PROJECT_UNITS
  coordinateSpace: typeof CUTNFLOW_PROJECT_COORDINATE_SPACE
  packType: string
  legacySpec: FlowwrapSpec
  identityMap: CutterIdentityMapV1
}

export type ProjectMetadataV1 = {
  customerOrBrand?: string
  productName?: string
  jobReference?: string
  description?: string
  notes?: string
  requestedPackType?: string
}

export type ProjectDraftStatusV1 = "draft"
export type ProjectDraftSourceV1 = "pack_generator"
export type PackSpecificationSourceV1 = "pack_generator"
export type PackSpecificationConfidenceV1 =
  | "high"
  | "medium"
  | "low"
  | "needs_review"

export type PackSpecificationStarterDefaultsV1 = {
  widthMm?: number
  heightMm?: number
  sealsMm: {
    top: number
    bottom: number
    left: number
    right: number
  }
  bleedMm: number
  minimumSafeZoneMm: number
  eyemarkCount: 0 | 1 | 2
  substrate?: string
  dimensionsRequireConfirmation: boolean
}

export type PackSpecificationDraftV1 = {
  packTypeId: string
  displayName: string
  enginePackTypeId?: string
  source: PackSpecificationSourceV1
  confidence: PackSpecificationConfidenceV1
  assumptions: string[]
  starterDefaults: PackSpecificationStarterDefaultsV1
}

export type PackSpecificationValueStateV1 = "missing" | "proposed" | "confirmed"
export type PackSpecificationValueSourceV1 =
  | "user"
  | "flowai"
  | "import"
  | "cnf-tech"
  | "preset"

export type PackSpecificationValueV1<T> = {
  value?: T
  state: PackSpecificationValueStateV1
  source: PackSpecificationValueSourceV1
  confidence?: "low" | "medium" | "high"
  note?: string
}

export type PackSpecificationFieldsV1 = {
  packType: PackSpecificationValueV1<string>
  finishedWidthMm: PackSpecificationValueV1<number>
  finishedHeightMm: PackSpecificationValueV1<number>
  gussetMm: PackSpecificationValueV1<number>
  trimMm: PackSpecificationValueV1<number>
  productDescription: PackSpecificationValueV1<string>
  fillWeightG: PackSpecificationValueV1<number>
  fillVolumeMl: PackSpecificationValueV1<number>
  orientation: PackSpecificationValueV1<string>
  materialNotes: PackSpecificationValueV1<string>
  machineConstraints: PackSpecificationValueV1<string>
  openingRequirements: PackSpecificationValueV1<string>
  sealTopMm: PackSpecificationValueV1<number>
  sealBottomMm: PackSpecificationValueV1<number>
  sealLeftMm: PackSpecificationValueV1<number>
  sealRightMm: PackSpecificationValueV1<number>
  eyemarkCount: PackSpecificationValueV1<0 | 1 | 2>
  eyemarkPosition?: PackSpecificationValueV1<string>
  zipEnabled: PackSpecificationValueV1<boolean>
  minimumSafeZoneMm: PackSpecificationValueV1<number>
  bleedMm: PackSpecificationValueV1<number>
  foldsOrGussetNotes: PackSpecificationValueV1<string>
  featuresNotes: PackSpecificationValueV1<string>
}

export type PackSpecificationCompletionStatusV1 =
  | "Empty"
  | "Draft"
  | "Needs Information"
  | "Ready for Cutter Review"

export type PackSpecificationCompletionV1 = {
  status: PackSpecificationCompletionStatusV1
  requiredCompleted: string[]
  requiredMissing: string[]
  proposedAwaitingConfirmation: string[]
  assumptionsAwaitingReview: number
}

export type PackSpecificationWorkspaceV1 = {
  schemaVersion: 1
  fields: PackSpecificationFieldsV1
  assumptions: string[]
  assumptionsReviewed: boolean
  unresolvedQuestions: string[]
  selectedRecommendationId?: string
  completion: PackSpecificationCompletionV1
  lastSavedAt?: string
}

export type ProjectDraftHistoryEntryV1 = {
  id: string
  action:
    | "pack_recommendation_accepted"
    | "pack_draft_saved"
    | "cutter_created"
    | "cutter_updated"
  createdAt: string
}

export type CutNFlowProjectDraftV1 = {
  id: string
  name: string
  status: ProjectDraftStatusV1
  source: ProjectDraftSourceV1
  createdAt: string
  updatedAt: string
  productPrompt: string
  packSpecification?: PackSpecificationDraftV1
  workspace?: PackSpecificationWorkspaceV1
  history: ProjectDraftHistoryEntryV1[]
}

export type CutNFlowProjectV1 = {
  schemaVersion: typeof CUTNFLOW_PROJECT_SCHEMA_VERSION
  id: string
  revision: number
  name: string
  createdAt: string
  updatedAt: string
  metadata?: ProjectMetadataV1
  cutter?: CutterDocumentV1
  projectDraft?: CutNFlowProjectDraftV1
  artwork?: unknown
  exportSettings?: ExportSettingsV1
  latestValidationRun?: ValidationRun
  validationRuns?: ValidationRun[]
  validationAcknowledgements?: ValidationAcknowledgement[]
  exportAuditRecords?: CutterExportAuditRecord[]
}

export type CutNFlowCutterProjectV1 = CutNFlowProjectV1 & {
  cutter: CutterDocumentV1
}

export type CreateCutNFlowProjectV1Input = {
  id?: string
  revision?: number
  name: string
  packType?: string
  legacySpec?: FlowwrapSpec
  identityMap?: CutterIdentityMapV1
  metadata?: ProjectMetadataV1
  projectDraft?: CutNFlowProjectDraftV1
  createdAt?: string
  updatedAt?: string
  artwork?: unknown
  exportSettings?: ExportSettingsV1
  latestValidationRun?: ValidationRun
  validationRuns?: ValidationRun[]
  validationAcknowledgements?: ValidationAcknowledgement[]
  exportAuditRecords?: CutterExportAuditRecord[]
}
