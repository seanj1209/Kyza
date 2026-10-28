import type { CutNFlowProjectV1, CutterElementRef } from "../project"
import type { ValidationResult } from "../validation"
import type { ExportPackage } from "./exportPackage"

export const CUTNFLOW_EXPORT_LAYER_MANIFEST_SCHEMA_VERSION =
  "cutnflow-export-layer-manifest-1" as const

export type ExportLayerGroup =
  | "base"
  | "attributes"
  | "validation"
  | "metadata"

export type ExportLayerTargetFormat =
  | "json"
  | "svg"
  | "ai-compatible-svg"
  | "raster-preview-pdf"
  | "pdf-vector"
  | "dxf"
  | "native-ai"
  | "repro-pack"

export type ExportLayer = {
  id: string
  name: string
  group: ExportLayerGroup
  exportable: boolean
  visible: boolean
  locked: boolean
  elementIds?: string[]
  intendedFormats?: ExportLayerTargetFormat[]
  description?: string
}

export type ExportLayerManifestFormatNotes = {
  json: string
  svg: string
  pdf: string
  dxf: string
  nativeAi: string
  reproPack: string
}

export type ExportLayerManifest = {
  schemaVersion: typeof CUTNFLOW_EXPORT_LAYER_MANIFEST_SCHEMA_VERSION
  source: "project-state"
  packTypeId: string
  displayPackType: string
  enginePackTypeId: string
  createdAt: string
  formatNotes: ExportLayerManifestFormatNotes
  layers: ExportLayer[]
}

const LAYER_FORMATS: ExportLayerTargetFormat[] = [
  "json",
  "svg",
  "ai-compatible-svg",
  "pdf-vector",
  "dxf",
  "native-ai",
  "repro-pack"
]

const PROOF_FORMATS: ExportLayerTargetFormat[] = [
  "json",
  "raster-preview-pdf"
]

const activeElementIds = (
  elements: CutterElementRef[],
  types: CutterElementRef["type"][]
) =>
  elements
    .filter(element => types.includes(element.type) && element.status !== "inactive")
    .map(element => element.id)

const withElementIds = (
  layer: Omit<ExportLayer, "visible" | "locked"> &
    Partial<Pick<ExportLayer, "visible" | "locked">>
): ExportLayer => {
  const elementIds = layer.elementIds?.filter(Boolean) ?? []
  const { elementIds: _elementIds, ...rest } = layer
  return {
    ...rest,
    visible: layer.visible ?? true,
    locked: layer.locked ?? false,
    ...(elementIds.length ? { elementIds } : {})
  }
}

const hasEnabledItems = (items?: readonly object[]) =>
  Boolean(items?.some(item =>
    !("enabled" in item) || (item as { enabled?: boolean }).enabled !== false
  ))

const buildBaseLayers = (
  project: CutNFlowProjectV1,
  elements: CutterElementRef[]
): ExportLayer[] => {
  const spec = project.cutter.legacySpec
  const layers: ExportLayer[] = [
    withElementIds({
      id: "cutter-outline",
      name: "Cutter Outline",
      group: "base",
      exportable: true,
      locked: true,
      intendedFormats: LAYER_FORMATS,
      description: "Primary cutter outline and trim boundary."
    }),
    withElementIds({
      id: "seal-areas",
      name: "Seal Areas",
      group: "base",
      exportable: true,
      visible: true,
      locked: true,
      intendedFormats: LAYER_FORMATS,
      description: "Heat-seal regions and seal clearance context."
    })
  ]

  if (hasEnabledItems(spec.foldLines)) {
    layers.push(withElementIds({
      id: "fold-lines",
      name: "Fold Lines",
      group: "base",
      exportable: true,
      elementIds: activeElementIds(elements, ["fold-line"]),
      intendedFormats: LAYER_FORMATS,
      description: "Folds, creases and construction references."
    }))
  }

  if (spec.kSealPouch) {
    layers.push(
      withElementIds({ id: "gusset-fold-line", name: "Centre Fold", group: "base", exportable: true, intendedFormats: LAYER_FORMATS }),
      withElementIds({ id: "kseal-bottom-seals", name: "Bottom Seals", group: "base", exportable: true, intendedFormats: LAYER_FORMATS }),
      withElementIds({ id: "kseal-arms", name: "K Arms", group: "base", exportable: true, intendedFormats: LAYER_FORMATS })
    )
  } else if (spec.doyPouch?.showGusset || project.cutter.packType.includes("doy")) {
    layers.push(withElementIds({
      id: "gusset-folds",
      name: "Gusset Folds",
      group: "base",
      exportable: true,
      intendedFormats: LAYER_FORMATS,
      description: "Gusset construction folds and related references."
    }))
  }

  if ((spec.eyeMarks?.count ?? 0) > 0) {
    layers.push(withElementIds({
      id: "eyemarks",
      name: "Eyemarks",
      group: "base",
      exportable: true,
      elementIds: activeElementIds(elements, ["eyemark"]),
      intendedFormats: LAYER_FORMATS,
      description: "Optical register marks and their editable references."
    }))
  }

  if (elements.some(element => element.type === "tear-notch" && element.status !== "inactive")) {
    layers.push(withElementIds({
      id: "tear-notches",
      name: "Tear Notches",
      group: "base",
      exportable: true,
      elementIds: activeElementIds(elements, ["tear-notch"]),
      intendedFormats: LAYER_FORMATS,
      description: "Opening notches or tear starts."
    }))
  }

  return layers
}

const buildAttributeLayers = (
  project: CutNFlowProjectV1,
  elements: CutterElementRef[]
): ExportLayer[] => {
  const spec = project.cutter.legacySpec
  const layers: ExportLayer[] = []

  if (spec.cutterLegend) layers.push(withElementIds({id:"cutter-legend",name:"Cutter Legend",group:"attributes",exportable:true,intendedFormats:["svg","ai-compatible-svg","raster-preview-pdf"],description:"Editable Klyro vector legend and technical key."}))

  if (hasEnabledItems(spec.safeZones)) {
    layers.push(withElementIds({
      id: "safe-zones",
      name: "Safe Zones",
      group: "attributes",
      exportable: true,
      elementIds: activeElementIds(elements, ["safe-zone"]),
      intendedFormats: LAYER_FORMATS,
      description: "Important-content clearance zones."
    }))
  }

  if (spec.perfs) {
    layers.push(withElementIds({
      id: "perf-lines",
      name: "Perf Lines",
      group: "attributes",
      exportable: true,
      elementIds: activeElementIds(elements, ["perf-lane"]),
      intendedFormats: LAYER_FORMATS,
      description: "Perforation lanes and regulated perf references."
    }))
  }

  if (spec.doyPouch?.showZipper !== false && spec.doyPouch?.zipper) {
    layers.push(withElementIds({
      id: "zips",
      name: "Grip Seal (Zip)",
      group: "attributes",
      exportable: true,
      intendedFormats: LAYER_FORMATS,
      description: "Grip seal zip construction references."
    }))
  }

  if (hasEnabledItems(spec.hangerSlots)) {
    layers.push(withElementIds({
      id: "hanger-slots",
      name: "Hanger Slots",
      group: "attributes",
      exportable: true,
      elementIds: activeElementIds(elements, ["hanger-slot"]),
      intendedFormats: LAYER_FORMATS,
      description: "Euro slots, round holes and hanger features."
    }))
  }

  if (hasEnabledItems(spec.attributeBoxes) || hasEnabledItems(spec.windows)) {
    layers.push(withElementIds({
      id: "notes",
      name: "Notes / Annotations",
      group: "attributes",
      exportable: true,
      elementIds: activeElementIds(elements, ["attribute-box", "window", "half-moon"]),
      intendedFormats: LAYER_FORMATS,
      description: "Artwork placeholders, windows, callouts and annotation boxes."
    }))
  }

  layers.push(withElementIds({
    id: "measurement-guides",
    name: "Measurement Guides",
    group: "attributes",
    exportable: true,
    visible: true,
    locked: true,
    intendedFormats: ["json", "svg", "ai-compatible-svg", "repro-pack"],
    description: "Dimension guides and cutter measurements."
  }))

  return layers
}

const buildValidationLayers = (
  validation: ValidationResult | undefined
): ExportLayer[] => {
  if (!validation?.messages.length) {
    return []
  }
  const hasBlocking = validation.messages.some(message => message.severity === "error")
  return [
    withElementIds({
      id: "validation-issue-markers",
      name: hasBlocking ? "Validation Blocking Errors" : "Validation Warnings",
      group: "validation",
      exportable: false,
      visible: true,
      locked: true,
      intendedFormats: PROOF_FORMATS,
      description: "Review-only validation markers. These are not production cutter geometry."
    })
  ]
}

const buildMetadataLayers = (
  exportPackage: ExportPackage | undefined
): ExportLayer[] => [
  withElementIds({
    id: "project-metadata",
    name: "Project Metadata",
    group: "metadata",
    exportable: true,
    visible: false,
    locked: true,
    intendedFormats: ["json", "repro-pack"],
    description: "Project, pack type, dimensions and export package metadata."
  }),
  withElementIds({
    id: "validation-summary",
    name: "Validation Summary",
    group: "metadata",
    exportable: true,
    visible: false,
    locked: true,
    intendedFormats: ["json", "repro-pack"],
    description: exportPackage
      ? `Export readiness: ${exportPackage.readiness}.`
      : "Validation status and advisory summary."
  })
]

export const buildExportLayerManifest = (input: {
  project: CutNFlowProjectV1
  validation?: ValidationResult
  exportPackage?: ExportPackage
  createdAt?: string
}): ExportLayerManifest => {
  const { project, validation, exportPackage } = input
  const draft = project.projectDraft
  const packSpecification = draft?.packSpecification
  const elements = project.cutter.identityMap.elements
  return {
    schemaVersion: CUTNFLOW_EXPORT_LAYER_MANIFEST_SCHEMA_VERSION,
    source: "project-state",
    packTypeId: packSpecification?.packTypeId ?? project.cutter.packType,
    displayPackType: packSpecification?.displayName ?? project.name,
    enginePackTypeId:
      packSpecification?.enginePackTypeId ?? project.cutter.packType,
    createdAt: input.createdAt ?? exportPackage?.createdAt ?? new Date().toISOString(),
    formatNotes: {
      json: "Layer manifest included in JSON export.",
      svg: "SVG and Illustrator-compatible SVG use current prototype layer groups where present.",
      pdf: "PDF Proof remains a flattened raster proof/preview, not production vector output.",
      dxf: "DXF layered export is planned.",
      nativeAi: "Native Adobe Illustrator export is future; current AI-ready output is Illustrator-compatible SVG.",
      reproPack: "GMG/Repro Ready Pack is future premium handoff output."
    },
    layers: [
      ...buildBaseLayers(project, elements),
      ...buildAttributeLayers(project, elements),
      ...buildValidationLayers(validation),
      ...buildMetadataLayers(exportPackage)
    ]
  }
}
