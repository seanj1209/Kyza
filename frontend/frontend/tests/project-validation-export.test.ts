import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { getPackModule } from "../apps/web/src/packs"
import {
  getStructuredValidationState,
  getSvgFallbackValidationIssues
} from "../apps/web/src/validation/activeValidation"
import {
  buildValidationCentreSummary,
  buildProjectValidationWorkflowState,
  getValidationIssuePresentation
} from "../apps/web/src/validation/validationCentre"
import { runPackGenerateRequest } from "../packages/engine-api/runPackGenerateRequest"
import {
  exportKyzaProject,
  exportProjectAiCompatibleSvg,
  exportProjectPdfVector,
  exportProjectSvg
} from "../packages/cutter-engine/export/cutterExportService"
import {
  RASTER_PREVIEW_PDF_DESCRIPTION,
  RASTER_PREVIEW_PDF_FORMAT
} from "../packages/cutter-engine/export/rasterPreviewPdf"
import {
  createCutterExportMetadata,
  getExportTier
} from "../packages/cutter-engine/export/exportTiers"
import { resolveExportReadiness } from "../packages/cutter-engine/export/exportReadiness"
import {
  createExportPackageDraft,
  EXPORT_PACKAGE_OUTPUTS
} from "../packages/cutter-engine/export/exportPackage"
import {
  buildKyzaJsonExport,
  createKyzaJsonExportFilename,
  KYZA_JSON_EXPORT_SCHEMA_VERSION,
  serializeKyzaJsonExport
} from "../packages/cutter-engine/export/jsonExport"
import {
  buildExportLayerManifest,
  KYZA_EXPORT_LAYER_MANIFEST_SCHEMA_VERSION
} from "../packages/cutter-engine/export/exportLayerManifest"
import {
  canExportProject,
  getValidationDebugSnapshot,
  getBlockingValidationMessages,
  validateKyzaProject,
  validateForExport,
  validateProjectCutter
} from "../packages/cutter-engine/validation"
import { projectFromLegacySpec } from "../packages/cutter-engine/project"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function hasCode(
  result: ReturnType<typeof validateKyzaProject>,
  code: string
) {
  return result.messages.some(message => message.code === code)
}

const timestamp = "2026-07-02T16:00:00.000Z"
const validSpec: FlowwrapSpec = {
  width: 100,
  height: 100,
  seal: 20,
  sealClearance: 5,
  bleed: 3
}

const makeProject = (spec: FlowwrapSpec, id: string) =>
  projectFromLegacySpec("flowwrap", "Validation Export", spec, {
    id,
    createdAt: timestamp,
    updatedAt: timestamp
  })

const makePackProject = (packType: string, id: string, spec?: FlowwrapSpec) => {
  const pack = getPackModule(packType)
  if (!pack) {
    throw new Error(`Missing test pack module: ${packType}`)
  }
  return projectFromLegacySpec(packType, "Validation Export", spec ?? pack.getDefaults(), {
    id,
    createdAt: timestamp,
    updatedAt: timestamp
  })
}

const validProject = makeProject(validSpec, "validation-valid")
const valid = validateKyzaProject(validProject)
assert(valid.valid, "A simple valid pack must return valid true.")
assert(valid.projectId === validProject.id, "Validation must include project ID.")
assert(valid.revision === String(validProject.revision), "Validation must include revision.")

const invalidDimensions = validateKyzaProject(
  makeProject({ ...validSpec, width: 0 }, "validation-dimensions")
)
assert(hasCode(invalidDimensions, "CUTTER_DIMENSIONS_INVALID"), "Invalid dimensions need stable code.")

const invalidLiveArea = validateKyzaProject(
  makeProject({ ...validSpec, width: 30, seal: 20 }, "validation-live-area")
)
assert(
  hasCode(invalidLiveArea, "SEAL_LIVE_AREA_IMPOSSIBLE"),
  "Impossible live area needs stable code."
)

const unsupportedEyemarks = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      eyeMarks: {
        count: 3,
        position: "top",
        width: 5,
        height: 5,
        color: "black"
      }
    },
    "validation-eyemark-count"
  )
)
assert(
  hasCode(unsupportedEyemarks, "EYEMARK_COUNT_UNSUPPORTED"),
  "Unsupported eyemark count needs stable code."
)
assert(!unsupportedEyemarks.valid, "Unsupported eyemark count must block export readiness.")

const oneEyemarkProject = makeProject(
  {
    ...validSpec,
    eyeMarks: {
      count: 1,
      position: "top-left",
      width: 5,
      height: 5,
      color: "black"
    }
  },
  "validation-one-eyemark"
)
assert(validateKyzaProject(oneEyemarkProject).valid, "One eyemark must validate.")
assert(canExportProject(oneEyemarkProject), "One valid flowwrap eyemark must export.")

const centredEyemark = validateForExport(
  makeProject(
    {
      ...validSpec,
      eyeMarks: {
        count: 1,
        position: "centre",
        width: 5,
        height: 5,
        color: "black"
      }
    },
    "validation-centred-eyemark"
  )
)
assert(
  hasCode(centredEyemark, "EYEMARK_ALLOWED_ZONE_UNRESOLVED"),
  "A centred mark without an explicit track must warn instead of using the top seal."
)
assert(centredEyemark.valid, "An unresolved centred-mark track must not block export.")

const twoEyemarkProject = makeProject(
  {
    ...validSpec,
    eyeMarks: {
      count: 2,
      position: "top",
      width: 5,
      height: 5,
      width2: 6,
      height2: 5,
      color: "black"
    }
  },
  "validation-two-eyemarks"
)
assert(validateKyzaProject(twoEyemarkProject).valid, "Two eyemarks must validate.")
assert(canExportProject(twoEyemarkProject), "Two valid flowwrap eyemarks must export.")

const defaultPackProjects = [
  makePackProject("flowwrap", "validation-default-flowwrap"),
  makePackProject("pillow-pack", "validation-default-pillow"),
  makePackProject("doy-pouch", "validation-default-doy"),
  makePackProject("k-seal-pouch", "validation-default-kseal"),
  makePackProject("plain-web", "validation-default-plain")
]
defaultPackProjects.forEach(project => {
  assert(
    canExportProject(project),
    `${project.cutter.packType} defaults must not be blocked from export.`
  )
})

defaultPackProjects.forEach(project => {
  const activeState = getStructuredValidationState(project)
  assert(
    activeState.debug.issuePanelSource === "structured",
    `${project.cutter.packType} issue panel state must identify structured validation as its source.`
  )
  assert(
    activeState.debug.exportGateSource === "structured",
    `${project.cutter.packType} export state must identify structured validation as its source.`
  )
  assert(
    activeState.exportValidation.valid,
    `${project.cutter.packType} active structured export state must allow valid defaults.`
  )
  assert(
    !activeState.issues.some(issue =>
      issue.message === "Seal clearance must be at least 5mm." && issue.severity === "error"
    ),
    `${project.cutter.packType} must not present the generic 5mm fallback as an error.`
  )
})

const doyActiveState = getStructuredValidationState(defaultPackProjects[2])
assert(
  !doyActiveState.issues.some(issue =>
    issue.code === "EYEMARK_ALLOWED_ZONE_UNRESOLVED" && issue.severity === "warning"
  ),
  "A valid centre-gusset DOY eyemark must not produce an unresolved-zone warning."
)
assert(
  doyActiveState.debug.messages.every(
    message => message.blocksExport === (message.severity === "error")
  ),
  "Active validation debug output must expose the actual export-blocking decision."
)

const svgFallbackIssues = getSvgFallbackValidationIssues(
  "Seal clearance must be at least 5mm.",
  "Eyemark allowed-zone geometry unresolved."
)
assert(
  svgFallbackIssues[0]?.source === "svg-fallback" &&
    svgFallbackIssues[0]?.severity === "error" &&
    svgFallbackIssues[1]?.severity === "warning",
  "SVG fallback mapping must retain attribute severity without replacing structured state."
)
assert(
  doyActiveState.debug.issuePanelSource === "structured" && doyActiveState.exportValidation.valid,
  "A stale SVG fallback error must not override active structured validation or export readiness."
)

for (const packId of ["flowwrap", "pillow-pack", "doy-pouch", "k-seal-pouch", "plain-web"]) {
  const response = runPackGenerateRequest({
    requestId: `validation-bridge-${packId}`,
    engine: "pack-generator",
    action: "generatePack",
    payload: { packId }
  })
  assert(response.success, `${packId} pack-generation bridge request must succeed.`)
  assert(
    !response.errors.some(error =>
      error.code === "PACK_VALIDATION_ERROR" ||
      error.message === "Seal clearance must be at least 5mm."
    ),
    `${packId} bridge output must not blanket-wrap generic clearance as PACK_VALIDATION_ERROR.`
  )
  if (packId === "pillow-pack") {
    assert(
      !response.warnings.some(warning => warning.code === "SEAL_CLEARANCE_UNRESOLVED"),
      `${packId} bridge output must accept the approved 3mm clearance.`
    )
  }
}

const pillowDefaults = getPackModule("pillow-pack")!.getDefaults()
const pillowTwoEyemarks = makePackProject(
  "pillow-pack",
  "validation-pillow-two-eyemarks",
  {
    ...pillowDefaults,
    eyeMarks: {
      ...pillowDefaults.eyeMarks!,
      count: 2,
      position: "top",
      width2: pillowDefaults.eyeMarks!.width,
      height2: pillowDefaults.eyeMarks!.height
    }
  }
)
assert(canExportProject(pillowTwoEyemarks), "Pillow pack must export with two supported eyemarks.")

const doyDefaultValidation = validateForExport(defaultPackProjects[2])
assert(
  !hasCode(doyDefaultValidation, "EYEMARK_ALLOWED_ZONE_UNRESOLVED"),
  "DOY now exposes authoritative centre-gusset and trim placement geometry."
)
assert(doyDefaultValidation.valid, "An unresolved DOY eyemark zone must not block export.")
const kSealDefaultValidation = validateForExport(defaultPackProjects[3])
assert(
  !hasCode(kSealDefaultValidation, "EYEMARK_ALLOWED_ZONE_UNRESOLVED"),
  "K-seal must allow its deterministic centre eyemark placement inside the cutter."
)
assert(kSealDefaultValidation.valid, "The default K-seal eyemark must not block export.")
assert(
  !hasCode(kSealDefaultValidation, "KSEAL_EYEMARK_READABILITY"),
  "The accepted 15x5mm K-seal single eyemark must not trigger readability warning."
)

const kSealDefaults = getPackModule("k-seal-pouch")!.getDefaults()
const kSealSmallMarkProject = makePackProject(
  "k-seal-pouch",
  "validation-kseal-small-mark",
  {
    ...kSealDefaults,
    eyeMarks: { ...kSealDefaults.eyeMarks!, width: 9, height: 10 }
  }
)
const kSealSmallMarkValidation = validateForExport(kSealSmallMarkProject)
const smallMarkMessage = kSealSmallMarkValidation.messages.find(
  message => message.code === "KSEAL_EYEMARK_SIZE_ADVISORY"
)
assert(
  smallMarkMessage?.message === "Eyemark 1 is below the K-Seal production minimum." &&
    smallMarkMessage.severity === "info" &&
    smallMarkMessage.fixable === true &&
    smallMarkMessage.suggestedFixId === "kseal-eyemark-size" &&
    kSealSmallMarkValidation.valid,
  "K-seal single-mark production minimum must be a non-blocking, fixable Advisory."
)
const mappedSmallMarkIssue = validateProjectCutter(kSealSmallMarkProject).issues.find(
  issue => issue.ruleId === "EYEMARK_MINIMUM_SIZE"
)

const kSealWideDualProject = makePackProject(
  "k-seal-pouch",
  "validation-kseal-wide-dual",
  {
    ...kSealDefaults,
    kSealPouch: { ...kSealDefaults.kSealPouch!, trimEnabled: true },
    eyeMarks: {
      count: 2,
      position: "centre",
      width: 13,
      height: 7,
      width2: 13,
      height2: 7,
      color: "black"
    }
  }
)
assert(
  validateForExport(kSealWideDualProject).messages.some(
    message =>
      message.message === "Fit dual eyemarks to the 12mm width available within trim." &&
      message.severity === "warning" &&
      message.suggestedFixId === "kseal-fit-dual-eyemarks-to-trim"
  ),
  "Wide dual K-seal eyemarks must report the exact soft size warning."
)

const kSealEdgeDualProject = makePackProject(
  "k-seal-pouch",
  "validation-kseal-edge-dual",
  {
    ...kSealDefaults,
    kSealPouch: { ...kSealDefaults.kSealPouch!, trimEnabled: true },
    eyeMarks: {
      count: 2,
      position: "centre",
      width: 12,
      height: 7,
      width2: 12,
      height2: 7,
      offsetX: 1,
      color: "black"
    }
  }
)
assert(
  validateForExport(kSealEdgeDualProject).messages.some(
    message =>
      message.message === "Consider moving eyemark away from edge to allow for conversion tolerances" &&
      message.severity === "warning" &&
      message.suggestedFixId === "kseal-eyemark-centre"
  ),
  "A dual K-seal eyemark near trim edge must report the exact soft movement warning."
)
assert(
  mappedSmallMarkIssue?.fixAction?.id === "kseal-eyemark-size" &&
    mappedSmallMarkIssue.fixAction.actionType === "SET_KSEAL_EYEMARK_TO_PRODUCTION_MINIMUM",
  "Beta validation issues must preserve structured Quick Fix metadata."
)

const kSealNoMarkProject = makePackProject(
  "k-seal-pouch",
  "validation-kseal-no-mark",
  { ...kSealDefaults, eyeMarks: undefined }
)
assert(
  validateForExport(kSealNoMarkProject).messages.some(
    message => message.message === "If design is to printed, consider adding an eyemark or two" &&
      message.severity === "info"
  ),
  "A K-seal with no eyemarks must report the requested advisory without blocking export."
)

const kSealTacProject = makePackProject(
  "k-seal-pouch",
  "validation-kseal-tac",
  {
    ...kSealDefaults,
    hangerSlots: [{
      id: "tac-validation",
      type: "hanger-slot",
      subtype: "round-hole",
      purpose: "tac-hole",
      diameter: 6,
      centerX: 0,
      centerY: 20,
      mirrored: true
    }]
  }
)
assert(
  validateForExport(kSealTacProject).messages.some(
    message => message.message === "Consider moving TAC Hole Central" &&
      message.suggestedFixId === "kseal-tac-centre" &&
      message.severity === "warning"
  ),
  "An off-centre TAC hole must report the exact non-blocking quick-fix warning."
)

const invalidEyemarkSize = validateForExport(
  makeProject(
    {
      ...validSpec,
      eyeMarks: {
        count: 1,
        position: "top-left",
        width: 0,
        height: 5,
        color: "black"
      }
    },
    "validation-eyemark-size"
  )
)
assert(hasCode(invalidEyemarkSize, "EYEMARK_SIZE_INVALID"), "Invalid size must block export.")
assert(!invalidEyemarkSize.valid, "An eyemark with zero width must not export.")

const outsideCutter = validateForExport(
  makeProject(
    {
      ...validSpec,
      eyeMarks: {
        count: 1,
        position: "top-left",
        width: 5,
        height: 5,
        offsetX: -10,
        color: "black"
      }
    },
    "validation-eyemark-outside-cutter"
  )
)
assert(
  hasCode(outsideCutter, "EYEMARK_OUTSIDE_CUTTER"),
  "A definitely out-of-bounds eyemark needs a blocking code."
)
assert(!outsideCutter.valid, "A definitely out-of-bounds eyemark must not export.")

const outsideKnownZoneProject = makeProject(
  {
    ...validSpec,
    eyeMarks: {
      count: 1,
      position: "top-left",
      width: 5,
      height: 5,
      offsetY: 20,
      color: "black"
    }
  },
  "validation-eyemark-outside-known-zone"
)
const outsideKnownZone = validateForExport(outsideKnownZoneProject)
assert(
  hasCode(outsideKnownZone, "EYEMARK_ALLOWED_ZONE_VIOLATION"),
  "A definitely invalid known-zone placement needs a blocking code."
)
assert(!outsideKnownZone.valid, "A known mandatory-zone violation must not export.")
const outsideKnownZoneState = getStructuredValidationState(outsideKnownZoneProject)
const actionableEyemarkIssue = outsideKnownZoneState.issues.find(
  issue => issue.code === "EYEMARK_TRACK_PLACEMENT"
)
assert(Boolean(actionableEyemarkIssue), "The critical eyemark issue must reach Validation Centre.")
if (actionableEyemarkIssue) {
  assert(
    actionableEyemarkIssue.elementIds.some(id => id.includes(":eyemark:")),
    "The critical issue must preserve its affected eyemark element ID."
  )
  const presentation = getValidationIssuePresentation(actionableEyemarkIssue)
  assert(
    presentation.affectedElement === "Eyemark 1",
    "The affected element must be shown as Eyemark 1."
  )
  assert(
    presentation.suggestedFix?.includes("Move Eyemark 1 back") === true,
    "The critical issue must include an actionable eyemark fix."
  )
}
const blockedValidationSummary = buildValidationCentreSummary(outsideKnownZoneProject, false)
assert(blockedValidationSummary.counts.critical === 1, "The invalid cutter must show one critical issue.")
const blockedWorkflowState = buildProjectValidationWorkflowState(outsideKnownZoneProject, false)
assert(
  blockedWorkflowState.exportReadiness.state === "blocked",
  "Shared project readiness must remain blocked when Artwork Studio reads an invalid cutter."
)
assert(
  blockedWorkflowState.cutterCriticalIssues[0]?.code === "EYEMARK_TRACK_PLACEMENT",
  "Shared workflow state must preserve the cutter issue category and code."
)
const clearedValidationSummary = buildValidationCentreSummary(validProject, false)
assert(clearedValidationSummary.counts.critical === 0, "A corrected cutter must clear critical state.")
assert(clearedValidationSummary.counts.pass === 1, "A corrected cutter must restore pass state.")
const clearedWorkflowState = buildProjectValidationWorkflowState(validProject, false)
assert(
  clearedWorkflowState.exportReadiness.state === "ready_with_advisories",
  "Missing artwork must remain advisory-only after cutter criticals are cleared."
)

const stableIdProject = makePackProject("doy-pouch", "validation-stable-eyemark-id")
const stableIdsBefore = stableIdProject.cutter.identityMap.elements.map(element => element.id)
const stableIdInvalid = structuredClone(stableIdProject)
stableIdInvalid.cutter.legacySpec.eyeMarks!.offsetX = 10000
const stableIdValidation = validateForExport(stableIdInvalid)
const stableIdsAfter = stableIdProject.cutter.identityMap.elements.map(element => element.id)
assert(
  JSON.stringify(stableIdsBefore) === JSON.stringify(stableIdsAfter),
  "Validation must not regenerate persisted element IDs."
)
assert(
  stableIdValidation.messages.some(message =>
    message.code === "EYEMARK_OUTSIDE_CUTTER" &&
    message.elementIds.includes(`${stableIdProject.id}:eyemark:primary`)
  ),
  "Eyemark validation messages must reference the stable eyemark ID."
)

const duplicateIdentity = JSON.parse(JSON.stringify(twoEyemarkProject))
const duplicateRefs = duplicateIdentity.cutter.identityMap.elements.filter(
  (element: { type: string }) => element.type === "eyemark"
)
duplicateRefs[1].id = duplicateRefs[0].id
assert(
  hasCode(validateKyzaProject(duplicateIdentity), "ELEMENT_ID_DUPLICATE"),
  "Duplicate eyemark IDs need stable error code."
)

const invalidSafeZone = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      safeZones: [
        { id: "safe-outside", label: "Outside", x: 65, y: 10, width: 20, height: 20 }
      ]
    },
    "validation-safe-zone"
  )
)
assert(
  hasCode(invalidSafeZone, "SAFE_ZONE_OUTSIDE_CUTTER"),
  "A safe zone outside the cutter needs a stable blocking code."
)
const unsafeSafeZoneClearance = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      safeZones: [
        { id: "safe-clearance", label: "Clearance", x: 1, y: 10, width: 20, height: 20 }
      ]
    },
    "validation-safe-zone-clearance"
  )
)
assert(
  hasCode(unsafeSafeZoneClearance, "SAFE_ZONE_SEAL_OVERLAP"),
  "Safe-zone seal clearance needs stable code."
)
assert(
  unsafeSafeZoneClearance.valid,
  "Safe-zone seal overlap must remain advisory and must not block the project."
)

const safeZoneInSeal = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      safeZones: [
        { id: "safe-in-seal", label: "In Seal", x: -10, y: 10, width: 20, height: 20 }
      ]
    },
    "validation-safe-zone-in-seal"
  )
)
assert(
  hasCode(safeZoneInSeal, "SAFE_ZONE_SEAL_OVERLAP") && safeZoneInSeal.valid,
  "A safe zone inside the cutter seal must produce a non-blocking warning."
)

const safeZoneInLiveArea = validateForExport(
  makeProject(
    {
      ...validSpec,
      safeZones: [
        { id: "safe-valid", label: "Valid", x: 10, y: 10, width: 20, height: 20 }
      ]
    },
    "validation-safe-zone-valid"
  )
)
assert(
  !hasCode(safeZoneInLiveArea, "SAFE_ZONE_SEAL_OVERLAP"),
  "A safe zone inside the resolved live area must not produce a seal overlap."
)

const zeroSeal = validateForExport(
  makePackProject("pillow-pack", "validation-zero-seal", {
    ...pillowDefaults,
    seal: 0,
    seals: { top: 0, bottom: 0, left: 0, right: 0 }
  })
)
assert(hasCode(zeroSeal, "SEAL_INVALID_DIMENSION"), "A required zero seal needs stable code.")
assert(!zeroSeal.valid, "A required zero seal must block export.")

const pillowClearance = validateForExport(
  makePackProject("pillow-pack", "validation-pillow-clearance")
)
assert(
  !hasCode(pillowClearance, "SEAL_CLEARANCE_UNRESOLVED"),
  "The approved 3mm Pillow clearance must not raise a generic warning."
)
assert(pillowClearance.valid, "Approved Pillow clearance must not block export.")
const pillowBelowMinimum=validateForExport(makePackProject("pillow-pack","validation-pillow-low-clearance",{...pillowDefaults,sealClearance:2}))
assert(hasCode(pillowBelowMinimum,"SEAL_CLEARANCE_UNRESOLVED"),"Pillow clearance below 3mm must still be reported.")

const futurePack = JSON.parse(JSON.stringify(validProject))
futurePack.cutter.packType = "future-pack"
const unresolvedSealGeometry = validateForExport(futurePack)
assert(
  hasCode(unresolvedSealGeometry, "SEAL_GEOMETRY_UNRESOLVED"),
  "Unknown pack-specific seal geometry must return a warning."
)
assert(
  unresolvedSealGeometry.messages.find(message => message.code === "SEAL_GEOMETRY_UNRESOLVED")
    ?.severity === "warning",
  "Unresolved seal geometry must remain warning-only."
)
assert(unresolvedSealGeometry.valid, "Unresolved seal geometry alone must not block export.")

const debugSnapshot = getValidationDebugSnapshot(stableIdProject)
assert(debugSnapshot.packType === "doy-pouch", "Debug output must include pack type.")
assert(debugSnapshot.eyemarks.length === 1, "Debug output must include the resolved eyemark.")
assert(
  debugSnapshot.eyemarks[0]?.resolvedAllowedZone !== null &&
    debugSnapshot.eyemarks[0]?.definite === true,
  "Debug output must expose resolved pouch eyemark allowed-zone geometry."
)
assert(Boolean(debugSnapshot.seal?.resolvedLiveArea), "Debug output must include resolved seal geometry.")

const negativeBleed = validateKyzaProject(
  makeProject({ ...validSpec, bleed: -1 }, "validation-bleed")
)
assert(hasCode(negativeBleed, "BLEED_NEGATIVE"), "Negative bleed needs stable code.")
assert(
  hasCode(
    validateKyzaProject(makeProject({ ...validSpec, bleed: 4 }, "validation-bleed-mismatch")),
    "BLEED_RENDERER_VALUE_MISMATCH"
  ),
  "Renderer/project bleed mismatch must be explicit."
)
assert(
  canExportProject(makeProject({ ...validSpec, bleed: 4 }, "validation-bleed-warning-only")),
  "A renderer bleed mismatch must remain warning-only when geometry is possible."
)

const unsafeTearNotch = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      doyPouch: {
        panelWidths: { left: 30, center: 40, right: 30 },
        sideBleed: 3,
        gripSeal: 10,
        gussetDepth: 20,
        zipper: { offsetY: 10, height: 3, stopWidth: 5, jawGap: 2 },
        tearNotch: { offsetX: -1, width: 6, depth: 3 },
        showTearNotch: true
      }
    },
    "validation-tear-notch"
  )
)
assert(
  hasCode(unsafeTearNotch, "TEAR_NOTCH_OFFSET_INVALID"),
  "Unsafe legacy tear-notch offset needs stable code."
)

const invalidFold = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      foldLines: [{ id: "fold-invalid", orientation: "vertical", offset: 100 }]
    },
    "validation-fold"
  )
)
assert(hasCode(invalidFold, "FOLD_OFFSET_INVALID"), "Invalid fold offset needs stable code.")
const horizontalFold = validateKyzaProject(
  makeProject(
    {
      ...validSpec,
      foldLines: [{ id: "fold-horizontal", orientation: "horizontal", offset: 12 }]
    },
    "validation-horizontal-fold"
  )
)
assert(
  hasCode(horizontalFold, "FOLD_HORIZONTAL_OFFSET_UNSUPPORTED"),
  "Incomplete horizontal fold semantics must be a structured warning."
)

const malformed = validateKyzaProject({ schemaVersion: 1, id: "broken" })
assert(!malformed.valid, "Malformed project must fail without throwing.")
assert(hasCode(malformed, "PROJECT_SCHEMA_INVALID"), "Malformed project needs schema code.")

const missingIdentity = JSON.parse(JSON.stringify(validProject))
delete missingIdentity.cutter.identityMap
const exportMissingIdentity = validateForExport(missingIdentity)
assert(!exportMissingIdentity.valid, "Export must block missing critical identity metadata.")
assert(
  getBlockingValidationMessages(exportMissingIdentity).some(
    message => message.code === "ELEMENT_ID_MISSING"
  ),
  "Export block must retain missing-ID code."
)

const invalidExport = exportKyzaProject(
  makeProject({ ...validSpec, width: 0 }, "export-invalid"),
  { format: "svg", includeLayers: true, preserveVector: true },
  "<svg viewBox=\"0 0 100 100\"></svg>"
)
assert(!invalidExport.ok, "Invalid project must be blocked from export.")
assert(Boolean(invalidExport.validation), "Blocked export must include validation.")

const sourceSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">',
  '<g id="seal_areas" data-layer-id="seal-areas" data-origin-x="10" data-origin-y="10" data-cutter-width="100" data-cutter-height="80">',
  '<path id="cutter-vector" d="M 10 10 L 110 10 L 110 90 Z"/>',
  '<line id="fold-vector" x1="20" y1="20" x2="100" y2="20"/>',
  '<rect id="seal-vector" x="10" y="10" width="100" height="10"/>',
  '<text id="dimension-vector" x="20" y="30">100mm</text>',
  "</g>",
  '<g id="selection_overlay"><rect data-role="selection-handle" x="0" y="0" width="5" height="5"/></g>',
  '<foreignObject x="0" y="0" width="20" height="20"><button>UI</button></foreignObject>',
  '<image id="preview-raster" href="data:image/png;base64,AAA"/>',
  "</svg>"
].join("")

const pdfProofTier = getExportTier("pdf-proof")
const illustratorTier = getExportTier("illustrator-ready")
const reproTier = getExportTier("repro-ready-pack")
assert(pdfProofTier?.editableVector === false, "PDF Proof must not claim editable vectors.")
assert(pdfProofTier?.productionReady === false, "PDF Proof must not claim production readiness.")
assert(
  pdfProofTier?.exportFormats.includes("raster-preview-pdf") === true,
  "PDF Proof must use the labelled raster preview format."
)
assert(illustratorTier?.editableVector === true, "Illustrator Ready must be editable vector.")
assert(
  illustratorTier?.exportFormats.includes("svg") === true &&
    illustratorTier.exportFormats.includes("ai-compatible-svg") === true,
  "Illustrator Ready must offer both working SVG formats."
)
assert(
  reproTier?.available === false && reproTier.exportFormats.length === 0,
  "GMG/Repro Ready Pack must remain disabled until implemented."
)

const notCheckedReadiness = resolveExportReadiness({
  project: validProject,
  supported: true,
  createdAt: timestamp
})
assert(notCheckedReadiness.state === "not_checked", "Unchecked export state must be explicit.")
assert(!notCheckedReadiness.validationRun, "Unchecked export state must not claim validation ran.")

const blockedReadiness = resolveExportReadiness({
  project: outsideKnownZoneProject,
  validation: outsideKnownZone,
  supported: true,
  createdAt: timestamp
})
assert(blockedReadiness.state === "blocked", "Critical validation must block export.")
assert(blockedReadiness.counts.critical > 0, "Blocked readiness must expose critical counts.")
assert(
  blockedReadiness.message.toLowerCase().includes("eyemark"),
  "Eyemark blockers must provide a specific corrective message."
)

const advisoryReadiness = resolveExportReadiness({
  project: validProject,
  validation: validateForExport(validProject),
  supported: true,
  createdAt: timestamp
})
assert(
  advisoryReadiness.state === "ready_with_advisories",
  "A valid cutter without artwork must export with an artwork advisory."
)
assert(
  advisoryReadiness.advisoryNotes.some(note => note.includes("no artwork")),
  "Missing artwork checks must be disclosed without blocking export."
)

const readyProject = { ...validProject, artwork: { items: [] } }
const readyReadiness = resolveExportReadiness({
  project: readyProject,
  validation: validateForExport(readyProject),
  supported: true,
  createdAt: timestamp
})
assert(
  readyReadiness.state === "ready_with_advisories",
  "A supported project without eyemarks must remain exportable with the eyemark advisory."
)

const unsupportedReadiness = resolveExportReadiness({
  project: validProject,
  validation: validateForExport(validProject),
  supported: false,
  createdAt: timestamp
})
assert(unsupportedReadiness.state === "unsupported", "Unsupported exports must be explicit.")

const packGeneratorProject = projectFromLegacySpec("flowwrap", "Pack Generator Draft", validSpec, {
  id: "pack-generator-export-context",
  createdAt: timestamp,
  updatedAt: timestamp,
  projectDraft: {
    id: "pack-generator-export-context",
    name: "Pack Generator Draft",
    status: "draft",
    source: "pack_generator",
    createdAt: timestamp,
    updatedAt: timestamp,
    productPrompt: "A snack pouch",
    packSpecification: {
      packTypeId: "flow-wrap",
      displayName: "Flow Wrap",
      enginePackTypeId: "flowwrap",
      source: "pack_generator",
      confidence: "medium",
      assumptions: ["Starter dimensions used"],
      starterDefaults: {
        widthMm: validSpec.width,
        heightMm: validSpec.height,
        sealsMm: { top: 20, bottom: 20, left: 0, right: 0 },
        bleedMm: validSpec.bleed,
        minimumSafeZoneMm: validSpec.sealClearance,
        eyemarkCount: 0,
        dimensionsRequireConfirmation: true
      }
    },
    history: []
  }
})

const tierMetadata = createCutterExportMetadata(
  validProject,
  validateForExport(validProject),
  "ai-compatible-svg",
  "illustrator-ready",
  timestamp
)
assert(tierMetadata.exportTier === "illustrator-ready", "Metadata must include tier ID.")
assert(tierMetadata.projectName === validProject.name, "Metadata must include project name.")
assert(tierMetadata.packType === "flowwrap", "Metadata must include pack type.")
assert(
  tierMetadata.dimensions.widthMm === validSpec.width &&
    tierMetadata.dimensions.heightMm === validSpec.height,
  "Metadata must include cutter dimensions."
)
assert(tierMetadata.createdAt === timestamp, "Metadata must include the created date/time.")
assert(tierMetadata.validationStatus === "valid", "Metadata must include validation status.")
assert(tierMetadata.warningsCount === 0, "Metadata must include the warning count.")
assert(tierMetadata.errorsCount === 0, "Metadata must include the error count.")
assert(
  tierMetadata.exportReadiness === "ready_with_advisories",
  "Metadata must include the resolved readiness state."
)
assert(tierMetadata.validationSummary.advisory > 0, "Metadata must include advisory counts.")

const packGeneratorMetadata = createCutterExportMetadata(
  packGeneratorProject,
  validateForExport(packGeneratorProject),
  "svg",
  "illustrator-ready",
  timestamp
)
assert(packGeneratorMetadata.projectId === packGeneratorProject.id, "Metadata must keep project ID.")
assert(packGeneratorMetadata.packTypeId === "flow-wrap", "Metadata must keep domain pack ID.")
assert(packGeneratorMetadata.displayPackType === "Flow Wrap", "Metadata must keep display pack type.")
assert(packGeneratorMetadata.enginePackTypeId === "flowwrap", "Metadata must keep engine pack ID.")
assert(packGeneratorMetadata.source === "pack_generator", "Metadata must keep project source.")
assert(
  packGeneratorMetadata.advisoryNotes.some(note => note.includes("production dimensions")),
  "Pack Generator metadata must disclose dimension confirmation requirements."
)

const exportPackageDraft = createExportPackageDraft({
  project: packGeneratorProject,
  validation: validateForExport(packGeneratorProject),
  source: "save_export",
  createdAt: timestamp
})
assert(exportPackageDraft.projectId === packGeneratorProject.id, "Export Package needs project ID.")
assert(exportPackageDraft.originalPrompt === "A snack pouch", "Export Package needs source prompt.")
assert(exportPackageDraft.packTypeId === "flow-wrap", "Export Package needs domain pack ID.")
assert(exportPackageDraft.enginePackTypeId === "flowwrap", "Export Package needs engine pack ID.")
assert(
  exportPackageDraft.readiness === "ready_with_advisories",
  "No-artwork Export Package must remain ready with advisories."
)
assert(exportPackageDraft.artworkStatus === "not_uploaded", "Artwork status must be explicit.")
assert(exportPackageDraft.validationSummary.critical === 0, "Validation summary must be included.")
assert(
  exportPackageDraft.advisories.some(note => note.includes("no artwork")),
  "Export Package must include the no-artwork advisory."
)
assert(
  EXPORT_PACKAGE_OUTPUTS.find(output => output.id === "pdf-proof")?.status === "available" &&
    EXPORT_PACKAGE_OUTPUTS.find(output => output.id === "editable-svg")?.status === "available" &&
    EXPORT_PACKAGE_OUTPUTS.find(output => output.id === "native-ai")?.status === "future" &&
    EXPORT_PACKAGE_OUTPUTS.find(output => output.id === "dxf")?.status === "planned",
  "Export Package output readiness labels must remain honest."
)
assert(
  EXPORT_PACKAGE_OUTPUTS.find(output => output.id === "project-json")?.description?.includes("layer manifest"),
  "JSON output label must disclose layer manifest support."
)

const blockedExportPackage = createExportPackageDraft({
  project: outsideKnownZoneProject,
  validation: outsideKnownZone,
  source: "save_export",
  createdAt: timestamp
})
assert(blockedExportPackage.readiness === "blocked", "Critical validation must block packages.")

const uncheckedExportPackage = createExportPackageDraft({
  project: validProject,
  source: "validation_centre",
  createdAt: timestamp
})
assert(uncheckedExportPackage.readiness === "not_checked", "Unchecked packages must stay explicit.")

const unsupportedExportPackage = createExportPackageDraft({
  project: validProject,
  validation: validateForExport(validProject),
  source: "save_export",
  supported: false,
  createdAt: timestamp
})
assert(unsupportedExportPackage.readiness === "unsupported", "Unsupported packages must stay explicit.")

const artworkExportPackage = createExportPackageDraft({
  project: readyProject,
  validation: validateForExport(readyProject),
  source: "save_export",
  createdAt: timestamp
})
assert(artworkExportPackage.artworkStatus === "uploaded", "Uploaded artwork status must be preserved.")

const jsonPayload = buildKyzaJsonExport({
  exportPackage: exportPackageDraft,
  project: packGeneratorProject,
  validation: validateForExport(packGeneratorProject),
  exportedAt: timestamp
})
assert(
  jsonPayload.schemaVersion === KYZA_JSON_EXPORT_SCHEMA_VERSION,
  "JSON export needs a stable schema version."
)
assert(jsonPayload.exportedAt === timestamp, "JSON export needs its export timestamp.")
assert(jsonPayload.project.originalPrompt === "A snack pouch", "JSON must preserve the source prompt.")
assert(jsonPayload.packSpecification.packTypeId === "flow-wrap", "JSON needs the domain pack ID.")
assert(jsonPayload.packSpecification.enginePackTypeId === "flowwrap", "JSON needs the engine pack ID.")
assert(jsonPayload.cutterSpecification.dimensions.widthMm === validSpec.width, "JSON needs cutter width.")
assert(
  Array.isArray(jsonPayload.cutterSpecification.elements),
  "JSON needs the cutter element identity collection, including an empty collection when applicable."
)
assert(jsonPayload.validation.summary.critical === 0, "JSON needs validation counts.")
assert(jsonPayload.validation.advisories.length > 0, "JSON needs advisory notes.")
assert(jsonPayload.artwork.status === "not_uploaded", "JSON needs no-artwork status.")

const layeredFlowWrapProject = makeProject(
  {
    ...validSpec,
    eyeMarks: {
      count: 1,
      position: "top-left",
      width: 5,
      height: 5,
      color: "black"
    },
    safeZones: [
      {
        id: "safe-zone-primary",
        label: "Primary Safe Zone",
        x: 30,
        y: 30,
        width: 20,
        height: 20
      }
    ]
  },
  "json-layered-flowwrap"
)
const layeredFlowWrapValidation = validateForExport(layeredFlowWrapProject)
const layeredFlowWrapPackage = createExportPackageDraft({
  project: layeredFlowWrapProject,
  validation: layeredFlowWrapValidation,
  source: "save_export",
  createdAt: timestamp
})
const layeredFlowWrapPayload = buildKyzaJsonExport({
  exportPackage: layeredFlowWrapPackage,
  project: layeredFlowWrapProject,
  validation: layeredFlowWrapValidation,
  exportedAt: timestamp
})
const flowWrapLayerIds = layeredFlowWrapPayload.layerManifest.layers.map(layer => layer.id)
assert(
  layeredFlowWrapPayload.layerManifest.schemaVersion === KYZA_EXPORT_LAYER_MANIFEST_SCHEMA_VERSION,
  "JSON export needs a stable layer manifest schema version."
)
const kSealLayerIds = buildExportLayerManifest({
  project: defaultPackProjects[3],
  validation: kSealDefaultValidation,
  createdAt: timestamp
}).layers.map(layer => layer.id)
assert(
  kSealLayerIds.includes("gusset-fold-line") &&
    kSealLayerIds.includes("kseal-bottom-seals") &&
    kSealLayerIds.includes("kseal-arms") &&
    !kSealLayerIds.includes("gusset-folds"),
  "K-seal export layers must expose centre fold, bottom seals and K arms independently."
)
assert(
  flowWrapLayerIds.includes("cutter-outline") &&
    flowWrapLayerIds.includes("seal-areas") &&
    flowWrapLayerIds.includes("safe-zones") &&
    flowWrapLayerIds.includes("eyemarks"),
  "Flow Wrap JSON needs cutter outline, seal, safe-zone and eyemark layers where available."
)
assert(
  layeredFlowWrapPayload.layerManifest.layers.some(
    layer => layer.id === "eyemarks" &&
      layer.group === "base" &&
      layer.exportable &&
      (layer.elementIds?.length ?? 0) > 0
  ),
  "Layer manifest needs available element references for active eyemarks."
)
assert(
  layeredFlowWrapPayload.layerManifest.layers.some(
    layer => layer.id === "validation-summary" &&
      layer.group === "metadata" &&
      layer.visible === false
  ),
  "Layer manifest needs metadata layers for validation/export summary data."
)
assert(
  layeredFlowWrapPayload.layerManifest.formatNotes.json.includes("Layer manifest included") &&
    layeredFlowWrapPayload.layerManifest.formatNotes.pdf.includes("flattened raster proof") &&
    layeredFlowWrapPayload.layerManifest.formatNotes.dxf.includes("planned") &&
    layeredFlowWrapPayload.layerManifest.formatNotes.nativeAi.includes("future"),
  "Layer manifest format notes must label implemented and future output honestly."
)
assert(jsonPayload.metadata.reviewRequired, "JSON must explicitly require review.")
assert(
  serializeKyzaJsonExport(jsonPayload).includes('"generatedBy": "Kyza"'),
  "JSON serialization must remain readable."
)
assert(
  serializeKyzaJsonExport(jsonPayload).includes('"layerManifest"'),
  "JSON serialization must include layerManifest."
)
assert(
  createKyzaJsonExportFilename(jsonPayload) === "kyza-export-flow-wrap-2026-07-02.json",
  "JSON filename must include pack type and export date."
)

const blockedJsonPayload = buildKyzaJsonExport({
  exportPackage: blockedExportPackage,
  project: outsideKnownZoneProject,
  validation: outsideKnownZone,
  exportedAt: timestamp
})
assert(blockedJsonPayload.validation.readiness === "blocked", "Blocked JSON state must be explicit.")
assert(blockedJsonPayload.validation.summary.critical > 0, "Blocked JSON must retain critical counts.")
assert(
  blockedJsonPayload.layerManifest.layers.some(
    layer => layer.id === "validation-issue-markers" && layer.exportable === false
  ),
  "Blocked JSON must keep validation issue markers as review-only, non-exportable layer metadata."
)

const directLayerManifest = buildExportLayerManifest({
  project: packGeneratorProject,
  validation: validateForExport(packGeneratorProject),
  exportPackage: exportPackageDraft,
  createdAt: timestamp
})
assert(
  directLayerManifest.layers.every(layer => typeof layer.locked === "boolean" && typeof layer.visible === "boolean"),
  "Layer manifest must make visibility and locked state explicit for every layer."
)

const sachetProject = makePackProject("sachet-3-side-seal", "json-sachet")
const sachetValidation = validateForExport(sachetProject)
const sachetPackage = createExportPackageDraft({
  project: sachetProject,
  validation: sachetValidation,
  source: "save_export",
  createdAt: timestamp
})
const sachetJsonPayload = buildKyzaJsonExport({
  exportPackage: sachetPackage,
  project: sachetProject,
  validation: sachetValidation,
  exportedAt: timestamp
})
assert(
  sachetJsonPayload.packSpecification.packTypeId === "sachet-3-side-seal" &&
    sachetJsonPayload.packSpecification.enginePackTypeId === "sachet-3-side-seal",
  "Sachet JSON must preserve the registered pack and engine IDs."
)
assert(
  sachetJsonPayload.layerManifest.layers.some(
    layer => layer.id === "seal-areas" && layer.group === "base"
  ) &&
    sachetJsonPayload.layerManifest.layers.some(
      layer => layer.id === "measurement-guides" && layer.group === "attributes"
    ),
  "Sachet JSON needs sensible base and attribute layer structure."
)

const svgExport = exportProjectSvg(validProject, sourceSvg, {
  includeLayers: true,
  preserveVector: true,
  includeValidationReport: true,
  marginMm: 10
})
assert(svgExport.ok, "Valid project must export SVG.")
if (svgExport.ok) {
  assert(svgExport.svgMarkup.includes('width="120mm"'), "SVG width must preserve mm scale.")
  assert(svgExport.svgMarkup.includes('height="100mm"'), "SVG height must preserve mm scale.")
  assert(svgExport.svgMarkup.includes('viewBox="0 0 120 100"'), "SVG viewBox must be preserved.")
  assert(svgExport.svgMarkup.includes("<path"), "SVG export must preserve vector paths.")
  assert(svgExport.svgMarkup.includes("<line"), "SVG export must preserve vector lines.")
  assert(svgExport.svgMarkup.includes("<rect"), "SVG export must preserve vector rectangles.")
  assert(svgExport.svgMarkup.includes("<text"), "SVG export must preserve editable text.")
  assert(svgExport.svgMarkup.includes('data-layer-id="seal-areas"'), "Layer groups must survive.")
  assert(svgExport.svgMarkup.includes('data-layer-name="Seal Area"'), "Named layer metadata must survive.")
  assert(!svgExport.svgMarkup.includes("selection_overlay"), "Selection UI must be stripped.")
  assert(!svgExport.svgMarkup.includes("selection-handle"), "Interaction handles must be stripped.")
  assert(!svgExport.svgMarkup.includes("foreignObject"), "HTML overlays must be stripped.")
  assert(!svgExport.svgMarkup.includes("<image"), "Unintentional raster images must be stripped.")
  assert(svgExport.mimeType === "image/svg+xml", "SVG MIME type must be correct.")
  assert(Boolean(svgExport.validationReport), "Optional validation report must be attached.")
  assert(svgExport.metadata.exportTier === "illustrator-ready", "SVG metadata needs tier ID.")
  assert(
    svgExport.svgMarkup.includes('data-kyza-export-tier="illustrator-ready"') &&
      svgExport.svgMarkup.includes('data-kyza-export-format="svg"'),
    "Generated SVG must embed export tier and format metadata."
  )
  assert(
    svgExport.svgMarkup.includes(`data-kyza-project-id="${validProject.id}"`) &&
      svgExport.svgMarkup.includes(`data-kyza-revision="${validProject.revision}"`),
    "SVG must carry the current project and revision identity."
  )
}

const intentionalRasterSource = sourceSvg.replace(
  '<image id="preview-raster"',
  '<image data-export-include-raster="true" id="preview-raster"'
)
const intentionalRasterExport = exportProjectSvg(validProject, intentionalRasterSource)
assert(intentionalRasterExport.ok, "Explicitly included artwork raster should export.")
if (intentionalRasterExport.ok) {
  assert(
    intentionalRasterExport.svgMarkup.includes('data-export-include-raster="true"'),
    "Raster artwork must only survive when explicitly marked for export."
  )
}

const aiCompatible = exportProjectAiCompatibleSvg(validProject, sourceSvg)
assert(aiCompatible.ok, "Illustrator-compatible SVG must export.")
if (aiCompatible.ok) {
  assert(aiCompatible.filename.endsWith(".illustrator.svg"), "AI-compatible output must be honest.")
  assert(aiCompatible.mimeType === "image/svg+xml", "AI-compatible output is SVG, not PostScript.")
  assert(!aiCompatible.filename.endsWith(".ai"), "Output must not claim native AI format.")
  assert(
    aiCompatible.metadata.exportTier === "illustrator-ready" &&
      aiCompatible.metadata.exportFormat === "ai-compatible-svg",
    "Illustrator-compatible SVG must carry honest tier/format metadata."
  )
  assert(
    aiCompatible.svgMarkup.includes('inkscape:label="Seal Area"'),
    "Illustrator-compatible SVG must preserve named layer metadata."
  )
  assert(
    aiCompatible.svgMarkup.includes(`data-kyza-project-id="${validProject.id}"`) &&
      aiCompatible.svgMarkup.includes(`data-kyza-revision="${validProject.revision}"`),
    "Saved/current vector paths must use the same project and revision identity."
  )
}

assert(
  RASTER_PREVIEW_PDF_FORMAT === "raster-preview-pdf" &&
    RASTER_PREVIEW_PDF_DESCRIPTION === "Raster Preview PDF",
  "The raster PDF path must be labelled honestly in code."
)

const unavailableReproExport = exportKyzaProject(
  validProject,
  {
    format: "ai-compatible-svg",
    tierId: "repro-ready-pack",
    includeLayers: true,
    preserveVector: true
  },
  sourceSvg
)
assert(!unavailableReproExport.ok, "Unavailable GMG/Repro tier must not export.")
if (unavailableReproExport.ok === false) {
  assert(
    unavailableReproExport.errors.some(error => error.includes("not available")),
    "Unavailable GMG/Repro tier needs an honest error."
  )
}

const vectorPdf = exportProjectPdfVector(validProject)
assert(!vectorPdf.ok, "Unimplemented vector PDF must return an explicit failure.")
if (vectorPdf.ok === false) {
  assert(
    vectorPdf.errors.some(error => error.includes("not implemented")),
    "Vector PDF must not silently fall back to JPEG."
  )
}

console.log("Kyza structured validation and export tests passed.")
