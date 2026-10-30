import { PARAMETER_CONSTRAINTS } from "../../../apps/web/src/core/model/parameterSchema"
import { resolveKSealPouchGeometry } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import { buildKSealEyeMarkRects } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import { buildEyeMarkRects } from "../../../apps/web/src/geometry/eyeMarks"
import { sidePouchEyemarkRects } from "../../../apps/web/src/geometry/sidePouchEyemarks"
import { liddingEyemarkRects, liddingSlitSize } from "../../../apps/web/src/constraints/lidding"
import { laserLaneSpacingAdvice } from "./laserLaneAdvice"
import { getPackModule } from "../../../apps/web/src/packs"
import {
  getKSealDualEyemarkTarget,
  getKSealEyemarkThresholds
} from "../../../apps/web/src/rules/kSealEyemarkRules"
import {
  getEyemarkElementRefs,
  saveKyzaProject,
  type KyzaProjectStorage,
  type KyzaProjectV1,
  type EyemarkElementRef
} from "../project"
import { validateForExport } from "./projectValidation"
import type {
  LegacyValidationSeverity,
  ValidationContext,
  ValidationIssue,
  ValidationMessage,
  ValidationRule,
  ValidationRun,
  ValidationSeverity,
  ValidationStatus,
  ValidationSummary,
  ValidationTrigger
} from "./validationTypes"

export const BETA_CUTTER_RULESET_VERSION = "beta-cutter-4"

const evidenceByContext = new WeakMap<ValidationContext, ValidationMessage[]>()

export const getValidationIssuePolicy = (severity: ValidationSeverity) => ({
  blocksExport: severity === "critical",
  acknowledgementAllowed: severity === "warning"
})

const severityFromLegacy = (severity: LegacyValidationSeverity): ValidationSeverity =>
  severity === "error" ? "critical" : severity === "warning" ? "warning" : "advisory"

const issueIdPart = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()

export const createValidationIssue = (input: Omit<ValidationIssue, "id" | "blocksExport" | "acknowledgementAllowed"> & {
  key?: string
}): ValidationIssue => ({
  id: [input.ruleId, input.affectedElementId, input.key]
    .filter((value): value is string => Boolean(value))
    .map(issueIdPart)
    .join(":"),
  ruleId: input.ruleId,
  severity: input.severity,
  title: input.title,
  message: input.message,
  ...(input.affectedElementId ? { affectedElementId: input.affectedElementId } : {}),
  ...(input.affectedElementType ? { affectedElementType: input.affectedElementType } : {}),
  ...(input.affectedArea ? { affectedArea: input.affectedArea } : {}),
  ...(input.currentValue !== undefined ? { currentValue: input.currentValue } : {}),
  ...(input.expectedValue !== undefined ? { expectedValue: input.expectedValue } : {}),
  ...(input.unit ? { unit: input.unit } : {}),
  ...(input.suggestedAction ? { suggestedAction: input.suggestedAction } : {}),
  ...(input.fixAction ? { fixAction: input.fixAction } : {}),
  ...getValidationIssuePolicy(input.severity)
})

const legacyEvidence = (context: ValidationContext) => evidenceByContext.get(context) ?? []

const elementTypeFor = (context: ValidationContext, elementId?: string) =>
  elementId
    ? context.cutterElements.find(element => element.id === elementId)?.type
    : undefined

const legacyIssue = (
  context: ValidationContext,
  message: ValidationMessage,
  ruleId = message.code,
  title = message.message
): ValidationIssue => {
  const affectedElementId = message.elementIds[0]
  return createValidationIssue({
    ruleId,
    key: `${message.code}-${message.fieldPath ?? "project"}`,
    severity: severityFromLegacy(message.severity),
    title,
    message: message.message,
    ...(affectedElementId ? { affectedElementId } : {}),
    ...(elementTypeFor(context, affectedElementId)
      ? { affectedElementType: elementTypeFor(context, affectedElementId) }
      : {}),
    ...(message.fieldPath ? { affectedArea: message.fieldPath } : {}),
    ...(message.suggestedFixId
      ? { suggestedAction: `Apply the supported ${message.suggestedFixId} correction and re-run validation.` }
      : {})
  })
}

const isWorkspaceSpecification = (
  value: ValidationContext["packSpecification"]
): value is NonNullable<ValidationContext["packSpecification"]> & { fields: Record<string, { value?: unknown }> } =>
  Boolean(value && "fields" in value)

const requiredDimensions = (context: ValidationContext) => {
  const packSpecification = context.packSpecification
  if (isWorkspaceSpecification(packSpecification)) {
    return {
      width: packSpecification.fields.finishedWidthMm?.value,
      height: packSpecification.fields.finishedHeightMm?.value,
      widthArea: "projectDraft.workspace.fields.finishedWidthMm",
      heightArea: "projectDraft.workspace.fields.finishedHeightMm"
    }
  }
  if (packSpecification && "starterDefaults" in packSpecification) {
    return {
      width: packSpecification.starterDefaults.widthMm,
      height: packSpecification.starterDefaults.heightMm,
      widthArea: "projectDraft.packSpecification.starterDefaults.widthMm",
      heightArea: "projectDraft.packSpecification.starterDefaults.heightMm"
    }
  }
  const spec = context.cutterSpecification?.legacySpec
  if (context.packTypeId === "k-seal-pouch") {
    return {
      width: spec?.kSealPouch?.pouchWidth,
      height: spec?.kSealPouch?.pouchHeight,
      widthArea: "cutter.legacySpec.kSealPouch.pouchWidth",
      heightArea: "cutter.legacySpec.kSealPouch.pouchHeight"
    }
  }
  return {
    width: spec?.width,
    height: spec?.height,
    widthArea: "cutter.legacySpec.width",
    heightArea: "cutter.legacySpec.height"
  }
}

const dimensionIssue = (
  axis: "width" | "height",
  value: unknown,
  affectedArea: string
) => createValidationIssue({
  ruleId: "CUTTER_REQUIRED_DIMENSIONS",
  key: axis,
  severity: "critical",
  title: `Missing or invalid finished ${axis}`,
  message: `Enter a valid finished ${axis} greater than 0 mm before creating or exporting this cutter.`,
  affectedArea,
  currentValue: value ?? null,
  expectedValue: { greaterThan: 0 },
  unit: "mm",
  suggestedAction: `Open Pack Specification and enter the finished ${axis}.`
})

export const requiredCutterDimensionsRule: ValidationRule = {
  id: "CUTTER_REQUIRED_DIMENSIONS",
  description: "Required composer dimensions must exist and be greater than zero.",
  appliesTo: () => true,
  evaluate: context => {
    const dimensions = requiredDimensions(context)
    return [
      ...(typeof dimensions.width !== "number" || !Number.isFinite(dimensions.width) || dimensions.width <= 0
        ? [dimensionIssue("width", dimensions.width, dimensions.widthArea)]
        : []),
      ...(typeof dimensions.height !== "number" || !Number.isFinite(dimensions.height) || dimensions.height <= 0
        ? [dimensionIssue("height", dimensions.height, dimensions.heightArea)]
        : [])
    ]
  }
}

const supportedEyemarkCounts = (packTypeId: string) => {
  const defaults = getPackModule(packTypeId)?.getDefaults()
  if (!defaults?.eyeMarks) return [0]
  const min = PARAMETER_CONSTRAINTS.eyeMarks.count.min
  const max = PARAMETER_CONSTRAINTS.eyeMarks.count.max
  return [0, ...Array.from({ length: max - min + 1 }, (_, index) => min + index)]
}

export const supportedEyemarkCountRule: ValidationRule = {
  id: "EYEMARK_SUPPORTED_COUNT",
  description: "Eyemark count must match the registered pack capability.",
  appliesTo: context => Boolean(context.cutterSpecification),
  evaluate: context => {
    const count = context.cutterSpecification?.legacySpec.eyeMarks?.count ?? 0
    const supported = supportedEyemarkCounts(context.packTypeId)
    if (Number.isInteger(count) && supported.includes(count)) return []
    return [createValidationIssue({
      ruleId: "EYEMARK_SUPPORTED_COUNT",
      key: "count",
      severity: "critical",
      title: "Unsupported eyemark count",
      message: `This ${context.packTypeId} cutter does not support ${count} eyemarks.`,
      affectedArea: "cutter.legacySpec.eyeMarks.count",
      currentValue: count,
      expectedValue: supported,
      suggestedAction: `Set the eyemark count to ${supported.join(", ")}.`
    })]
  }
}

const activeEyemarkRef = (
  refs: EyemarkElementRef[],
  index: number
) => refs.find(ref => ref.index === index && ref.status === "active")

export const minimumEyemarkSizeRule: ValidationRule = {
  id: "EYEMARK_MINIMUM_SIZE",
  description: "Every eyemark must satisfy pack-authoritative production and critical size thresholds.",
  appliesTo: context => (context.cutterSpecification?.legacySpec.eyeMarks?.count ?? 0) > 0,
  evaluate: context => {
    const eyeMarks = context.cutterSpecification?.legacySpec.eyeMarks
    if (!eyeMarks || (eyeMarks.count !== 1 && eyeMarks.count !== 2)) return []
    const refs = context.cutterElements.filter(
      (element): element is EyemarkElementRef => element.type === "eyemark"
    )
    if (context.packTypeId === "k-seal-pouch") {
      const count = eyeMarks.count
      const thresholds = getKSealEyemarkThresholds(count)
      const trimWidth = context.cutterSpecification
        ? resolveKSealPouchGeometry(context.cutterSpecification.legacySpec).trimWidth
        : 0
      const trimTarget = getKSealDualEyemarkTarget(trimWidth)
      return Array.from({ length: count }, (_, index) => {
        const ref = activeEyemarkRef(refs, index)
        const width = index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width
        const height = index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
        const critical =
          width < thresholds.criticalMinimum.width ||
          height < thresholds.criticalMinimum.height
        const advisory = !critical && (
          width < thresholds.productionMinimum.width ||
          height < thresholds.productionMinimum.height
        )
        if (!critical && !advisory) return []
        const severity = critical ? "critical" as const : "advisory" as const
        const expectedValue = critical
          ? thresholds.criticalMinimum
          : thresholds.productionMinimum
        const dual = count === 2
        const prefix = dual ? `Eyemark ${index + 1}` : "The eyemark"
        const supportedSubject = dual ? "Each of two eyemarks" : "A single eyemark"
        const productionSubject = dual
          ? "The production minimum for two eyemarks"
          : "The production minimum for a single eyemark"
        const canFitDualFix = dual && trimTarget >= thresholds.criticalMinimum.width
        return [createValidationIssue({
          ruleId: "EYEMARK_MINIMUM_SIZE",
          key: "size-threshold",
          severity,
          title: critical
            ? dual
              ? "Dual eyemarks are below the supported minimum"
              : "Eyemark is below the supported minimum"
            : dual
              ? "Dual eyemarks are below the production minimum"
              : "Eyemark is below the production minimum",
          message: critical
            ? `${prefix} is currently ${width} × ${height} mm. ${supportedSubject} must be at least ${expectedValue.width} × ${expectedValue.height} mm.`
            : `${prefix} is currently ${width} × ${height} mm. ${productionSubject} is ${expectedValue.width} × ${expectedValue.height} mm.`,
          ...(ref ? { affectedElementId: ref.id, affectedElementType: ref.type } : {}),
          affectedArea: "cutter.legacySpec.eyeMarks",
          currentValue: { width, height },
          expectedValue,
          unit: "mm",
          suggestedAction: critical
            ? "Increase the eyemark size before export."
            : "Increase the eyemark size where the available trim allows.",
          ...(
            dual && canFitDualFix
              ? {
                  fixAction: {
                    id: "kseal-fit-dual-eyemarks-to-trim",
                    label: "Fit eyemarks to trim",
                    actionType: "FIT_DUAL_EYEMARKS_TO_TRIM",
                    affectedElementIds: refs
                      .filter(candidate => candidate.status === "active")
                      .map(candidate => candidate.id),
                    parameters: {
                      trimWidth,
                      targetWidth: trimTarget,
                      targetHeight: thresholds.productionMinimum.height
                    }
                  }
                }
              : !dual && ref
                ? {
                    fixAction: {
                      id: "kseal-eyemark-size",
                      label: "Use production minimum",
                      actionType: "SET_KSEAL_EYEMARK_TO_PRODUCTION_MINIMUM",
                      affectedElementIds: [ref.id],
                      parameters: {
                        targetWidth: thresholds.productionMinimum.width,
                        targetHeight: thresholds.productionMinimum.height
                      }
                    }
                  }
                : {}
          )
        })]
      }).flat()
    }

    const minimumWidth = PARAMETER_CONSTRAINTS.eyeMarks.width.min
    const minimumHeight = PARAMETER_CONSTRAINTS.eyeMarks.height.min
    return Array.from({ length: eyeMarks.count }, (_, index) => {
      const ref = activeEyemarkRef(refs, index)
      const width = index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width
      const height = index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
      return [
        ...(width < minimumWidth
          ? [createValidationIssue({
              ruleId: "EYEMARK_MINIMUM_SIZE",
              key: `eyemark-${index + 1}-width`,
              severity: "critical",
              title: "Eyemark width is below the supported minimum",
              message: `The eyemark is ${width} mm wide. The supported minimum is ${minimumWidth} mm.`,
              ...(ref ? { affectedElementId: ref.id, affectedElementType: ref.type } : {}),
              affectedArea: "cutter.legacySpec.eyeMarks",
              currentValue: width,
              expectedValue: minimumWidth,
              unit: "mm",
              suggestedAction: `Resize the eyemark to at least ${minimumWidth} mm wide.`
            })]
          : []),
        ...(height < minimumHeight
          ? [createValidationIssue({
              ruleId: "EYEMARK_MINIMUM_SIZE",
              key: `eyemark-${index + 1}-height`,
              severity: "critical",
              title: "Eyemark height is below the supported minimum",
              message: `The eyemark is ${height} mm high. The supported minimum is ${minimumHeight} mm.`,
              ...(ref ? { affectedElementId: ref.id, affectedElementType: ref.type } : {}),
              affectedArea: "cutter.legacySpec.eyeMarks",
              currentValue: height,
              expectedValue: minimumHeight,
              unit: "mm",
              suggestedAction: `Resize the eyemark to at least ${minimumHeight} mm high.`
            })]
          : [])
      ]
    }).flat()
  }
}

export const dualEyemarkTrimFitRule: ValidationRule = {
  id: "EYEMARK_TRIM_FIT",
  description: "Dual K-Seal eyemarks must fit the trim with the established 1.5 mm edge buffers.",
  appliesTo: context =>
    context.packTypeId === "k-seal-pouch" &&
    context.cutterSpecification?.legacySpec.eyeMarks?.count === 2,
  evaluate: context => {
    const cutter = context.cutterSpecification
    const eyeMarks = cutter?.legacySpec.eyeMarks
    if (!cutter || !eyeMarks || eyeMarks.count !== 2) return []
    const geometry = resolveKSealPouchGeometry(cutter.legacySpec)
    const maximumWidth = getKSealDualEyemarkTarget(geometry.trimWidth)
    const widths = [eyeMarks.width, eyeMarks.width2 ?? eyeMarks.width]
    if (widths.every(width => width <= maximumWidth)) return []
    const refs = context.cutterElements.filter(
      (element): element is EyemarkElementRef =>
        element.type === "eyemark" && element.status === "active"
    )
    return [createValidationIssue({
      ruleId: "EYEMARK_TRIM_FIT",
      key: "dual-configuration",
      severity: widths.some(width => width > geometry.trimWidth)
        ? "critical"
        : "warning",
      title: "Dual eyemarks exceed the available trim width",
      message: `The dual eyemark widths are ${widths[0]} mm and ${widths[1]} mm. The maximum width for ${geometry.trimWidth} mm trim is ${maximumWidth} mm.`,
      affectedArea: "cutter.legacySpec.eyeMarks",
      currentValue: { widths },
      expectedValue: { maximumWidth },
      unit: "mm",
      suggestedAction: "Fit both eyemarks to the available trim width.",
      fixAction: {
        id: "kseal-fit-dual-eyemarks-to-trim",
        label: "Fit eyemarks to trim",
        actionType: "FIT_DUAL_EYEMARKS_TO_TRIM",
        affectedElementIds: refs.map(ref => ref.id),
        parameters: {
          trimWidth: geometry.trimWidth,
          targetWidth: maximumWidth,
          targetHeight: getKSealEyemarkThresholds(2).productionMinimum.height
        }
      }
    })]
  }
}

export const eyemarkCutterBoundsRule: ValidationRule = {
  id: "EYEMARK_CUTTER_BOUNDS",
  description: "Eyemarks must remain inside authoritative cutter bounds.",
  appliesTo: context => (context.cutterSpecification?.legacySpec.eyeMarks?.count ?? 0) > 0,
  evaluate: context => legacyEvidence(context)
    .filter(message => message.code === "EYEMARK_OUTSIDE_CUTTER")
    .map(message => legacyIssue(
      context,
      message,
      "EYEMARK_CUTTER_BOUNDS",
      "Eyemark is outside the cutter boundary"
    ))
    .map(issue => ({
      ...issue,
      suggestedAction: "Select the eyemark and move it inside the cutter boundary."
    }))
}

const TRACK_CODES = new Set([
  "EYEMARK_ALLOWED_ZONE_VIOLATION",
  "KSEAL_EYEMARK_TRIM_BOUNDS",
  "KSEAL_EYEMARK_EDGE_TOLERANCE"
])

export const eyemarkTrackPlacementRule: ValidationRule = {
  id: "EYEMARK_TRACK_PLACEMENT",
  description: "Eyemarks must remain in a pack-defined permitted track where one is authoritative.",
  appliesTo: context => (context.cutterSpecification?.legacySpec.eyeMarks?.count ?? 0) > 0,
  evaluate: context => {
    const evidence = legacyEvidence(context)
    const outsideCutterIds = new Set(
      evidence
        .filter(message => message.code === "EYEMARK_OUTSIDE_CUTTER")
        .flatMap(message => message.elementIds)
    )
    return evidence
    .filter(message =>
      TRACK_CODES.has(message.code) &&
      !(
        message.code === "KSEAL_EYEMARK_TRIM_BOUNDS" &&
        message.elementIds.some(elementId => outsideCutterIds.has(elementId))
      )
    )
    .map(message => legacyIssue(
      context,
      message,
      "EYEMARK_TRACK_PLACEMENT",
      "Eyemark is outside its permitted track"
    ))
    .map(issue => ({
      ...issue,
      suggestedAction: "Select the eyemark and return it to the permitted track."
    }))
  }
}

const CLAIMED_LEGACY_CODES = new Set([
  "CUTTER_DIMENSIONS_INVALID",
  "EYEMARK_COUNT_UNSUPPORTED",
  "EYEMARK_SIZE_INVALID",
  "EYEMARK_OUTSIDE_CUTTER",
  "KSEAL_EYEMARK_READABILITY",
  "KSEAL_EYEMARK_SIZE_ADVISORY",
  "KSEAL_EYEMARK_SIZE_CRITICAL",
  "KSEAL_EYEMARK_HARD_BOUNDS",
  "KSEAL_EYEMARK_TRIM_TOLERANCE",
  ...TRACK_CODES
])

const CUTTER_ONLY_EXCLUDED_MESSAGES = new Set([
  "No artwork uploaded yet. Artwork checks have not been run.",
  "Artwork checks have not been run because no artwork has been uploaded."
])

export const existingCutterSafetyCompatibilityRule: ValidationRule = {
  id: "EXISTING_CUTTER_SAFETY",
  description: "Preserve existing deterministic cutter checks outside the new beta vertical slice.",
  appliesTo: () => true,
  evaluate: context => legacyEvidence(context)
    .filter(message =>
      !CLAIMED_LEGACY_CODES.has(message.code) &&
      !CUTTER_ONLY_EXCLUDED_MESSAGES.has(message.message) &&
      !message.message.startsWith("Your laser perforation lanes are")
    )
    .map(message => legacyIssue(context, message))
}

export const laserLaneSpacingRule: ValidationRule = {
  id:"LASER_LANE_SPACING_ADVISORY",
  description:"Closely spaced laser lanes may require another pass; converter capability is not assumed.",
  appliesTo:context=>!!context.cutterSpecification?.legacySpec.perfs,
  evaluate:context=>{
    const message=laserLaneSpacingAdvice(context.cutterSpecification?.legacySpec.perfs)
    return message?[createValidationIssue({ruleId:"LASER_LANE_SPACING_ADVISORY",key:"lane-spacing",severity:"advisory",title:"Check laser lane spacing with your converter",message,affectedArea:"cutter.legacySpec.perfs",suggestedAction:"Confirm the converter's minimum head spacing and number of passes."})]:[]
  }
}
export const eyemarkCutterEdgeAdvisoryRule: ValidationRule = {
  id: "EYEMARK_CUTTER_EDGE_ADVISORY",
  description: "Advise when an eyemark sits within 1.5mm of an outer cutter edge.",
  appliesTo: context => (context.cutterSpecification?.legacySpec.eyeMarks?.count ?? 0) > 0,
  evaluate: context => {
    const spec = context.cutterSpecification?.legacySpec
    if (!spec?.eyeMarks) return []
    const marks = spec.lidding
      ? liddingEyemarkRects(spec).slice(0, spec.eyeMarks.count)
      : spec.sideSealPouch
        ? sidePouchEyemarkRects(spec)
        : context.packTypeId === "k-seal-pouch"
          ? buildKSealEyeMarkRects(spec, resolveKSealPouchGeometry(spec), 0, 0)
          : buildEyeMarkRects(spec.eyeMarks, 0, 0, spec.width, spec.height)
    const bounds = spec.lidding ? liddingSlitSize(spec.lidding, spec.eyeMarks)
      : spec.sideSealPouch ? { width: 2 * spec.height + 2 * (spec.sideSealPouch.trimEnabled ? spec.sideSealPouch.trimWidth : 0), height: spec.width }
      : context.packTypeId === "k-seal-pouch" ? { width: resolveKSealPouchGeometry(spec).width, height: resolveKSealPouchGeometry(spec).height }
      : { width: spec.width, height: spec.height }
    const inset = spec.sideSealPouch ? 38 : 0
    const refs = context.cutterElements.filter((element): element is EyemarkElementRef => element.type === "eyemark")
    return marks.flatMap((mark, index) => {
      const gap = Math.min(mark.x - inset, mark.y - inset, inset + bounds.width - mark.x - mark.width, inset + bounds.height - mark.y - mark.height)
      if (gap >= 1.5 - 1e-6) return []
      return [createValidationIssue({
        ruleId: "EYEMARK_CUTTER_EDGE_ADVISORY", key: `mark-${index + 1}`, severity: "advisory",
        title: `Eyemark ${index + 1} is close to the cutter edge`,
        message: `${spec.eyeMarks!.count > 1 ? `Eyemark ${index + 1}: ` : ""}Consider moving eyemark from edge of cutter to 1.5mm, to allow for conversion tolerances`,
        ...(refs[index] ? { affectedElementId: refs[index].id } : {}),
        affectedArea: "cutter.legacySpec.eyeMarks",
        suggestedAction: "Move the eyemark at least 1.5mm inside the outer cutter edge.",
      })]
    })
  }
}
export const BETA_CUTTER_VALIDATION_RULES: readonly ValidationRule[] = [
  laserLaneSpacingRule,
  eyemarkCutterEdgeAdvisoryRule,
  requiredCutterDimensionsRule,
  supportedEyemarkCountRule,
  minimumEyemarkSizeRule,
  dualEyemarkTrimFitRule,
  eyemarkCutterBoundsRule,
  eyemarkTrackPlacementRule,
  existingCutterSafetyCompatibilityRule
]

export const summarizeValidationIssues = (
  issues: readonly ValidationIssue[]
): ValidationSummary => ({
  criticalCount: issues.filter(issue => issue.severity === "critical").length,
  warningCount: issues.filter(issue => issue.severity === "warning").length,
  advisoryCount: issues.filter(issue => issue.severity === "advisory").length,
  issueCount: issues.length,
  blocksExport: issues.some(issue => issue.blocksExport)
})

const createRunId = (projectId: string, revision: string | number, startedAt: string) =>
  `validation-${issueIdPart(projectId)}-${issueIdPart(String(revision))}-${Date.parse(startedAt)}`

export type ValidateProjectCutterOptions = {
  trigger?: ValidationTrigger
  now?: () => string
  createRunId?: (projectId: string, revision: string | number, startedAt: string) => string
  rules?: readonly ValidationRule[]
}

export const createValidationContext = (
  project: KyzaProjectV1,
  trigger: ValidationTrigger = "manual",
  requestedAt = new Date().toISOString()
): ValidationContext => ({
  projectId: project.id,
  projectRevision: project.revision,
  packTypeId: project.cutter?.packType ?? project.metadata?.requestedPackType ?? "unknown",
  packSpecification: project.projectDraft?.workspace ?? project.projectDraft?.packSpecification ?? null,
  cutterSpecification: project.cutter ?? null,
  cutterElements: project.cutter?.identityMap.elements ?? [],
  trigger,
  requestedAt
})

const dedupeIssues = (issues: ValidationIssue[]) => {
  const byId = new Map<string, ValidationIssue>()
  issues.forEach(issue => {
    if (!byId.has(issue.id)) byId.set(issue.id, issue)
  })
  return [...byId.values()]
}

export const validateProjectCutter = (
  project: KyzaProjectV1,
  options: ValidateProjectCutterOptions = {}
): ValidationRun => {
  const startedAt = (options.now ?? (() => new Date().toISOString()))()
  const context = createValidationContext(project, options.trigger ?? "manual", startedAt)
  const id = (options.createRunId ?? createRunId)(project.id, project.revision, startedAt)
  try {
    evidenceByContext.set(context, validateForExport(project).messages)
    const issues = dedupeIssues((options.rules ?? BETA_CUTTER_VALIDATION_RULES)
      .filter(rule => rule.appliesTo(context))
      .flatMap(rule => rule.evaluate(context))
      .map(issue => ({ ...issue, ...getValidationIssuePolicy(issue.severity) })))
    const summary = summarizeValidationIssues(issues)
    return {
      id,
      projectId: project.id,
      projectRevision: project.revision,
      status: summary.blocksExport ? "failed" : "passed",
      trigger: context.trigger,
      startedAt,
      completedAt: (options.now ?? (() => new Date().toISOString()))(),
      issues,
      summary,
      rulesetVersion: BETA_CUTTER_RULESET_VERSION
    }
  } catch {
    return {
      id,
      projectId: project.id,
      projectRevision: project.revision,
      status: "error",
      trigger: context.trigger,
      startedAt,
      completedAt: (options.now ?? (() => new Date().toISOString()))(),
      issues: [],
      summary: summarizeValidationIssues([]),
      rulesetVersion: BETA_CUTTER_RULESET_VERSION
    }
  } finally {
    evidenceByContext.delete(context)
  }
}

export const getEffectiveValidationStatus = (
  run: ValidationRun | undefined,
  currentProjectRevision: string | number,
  currentRulesetVersion = BETA_CUTTER_RULESET_VERSION
): ValidationStatus => {
  if (!run) return "not_run"
  if (run.status === "running") return "running"
  if (
    String(run.projectRevision) !== String(currentProjectRevision) ||
    run.rulesetVersion !== currentRulesetVersion
  ) return "stale"
  if (run.status === "error") return "error"
  if (run.status === "not_run" || run.status === "stale") return run.status
  return run.summary.blocksExport ? "failed" : "passed"
}

export const withLatestValidationRun = (
  project: KyzaProjectV1,
  run: ValidationRun
): KyzaProjectV1 => ({
  ...project,
  latestValidationRun: run,
  validationRuns: [
    ...(
      project.validationRuns ?? (project.latestValidationRun ? [project.latestValidationRun] : [])
    ).filter(candidate => candidate.id !== run.id),
    run
  ]
})

export type PersistValidationRunResult =
  | { ok: true; project: KyzaProjectV1; run: ValidationRun }
  | { ok: false; project: KyzaProjectV1; run: ValidationRun; errors: string[] }

export const validateAndPersistProjectCutter = (
  project: KyzaProjectV1,
  options: ValidateProjectCutterOptions & { storage?: KyzaProjectStorage } = {}
): PersistValidationRunResult => {
  const run = validateProjectCutter(project, options)
  const nextProject = withLatestValidationRun(project, run)
  const saved = saveKyzaProject(
    nextProject,
    options.storage,
    { expectedRevision: project.revision }
  )
  if (saved.ok) return { ok: true, project: saved.value, run }
  return { ok: false, project, run, errors: "errors" in saved ? saved.errors : ["Unable to persist validation run."] }
}

export const getPreExportValidationRun = (
  project: KyzaProjectV1,
  options: Omit<ValidateProjectCutterOptions, "trigger"> = {}
): { run: ValidationRun; reused: boolean } => {
  const current = project.latestValidationRun
  const effectiveStatus = getEffectiveValidationStatus(current, project.revision)
  if (
    current?.trigger === "pre_export" &&
    (effectiveStatus === "passed" || effectiveStatus === "failed")
  ) {
    return { run: current, reused: true }
  }
  return {
    run: validateProjectCutter(project, { ...options, trigger: "pre_export" }),
    reused: false
  }
}

export const validationRunToLegacyResult = (run: ValidationRun) => ({
  projectId: run.projectId,
  revision: String(run.projectRevision),
  valid: run.status !== "error" && !run.summary.blocksExport,
  messages: run.issues.map(issue => ({
    code: issue.ruleId,
    severity: issue.severity === "critical" ? "error" as const : issue.severity === "warning" ? "warning" as const : "info" as const,
    message: issue.message,
    elementIds: issue.affectedElementId ? [issue.affectedElementId] : [],
    ...(issue.affectedArea ? { fieldPath: issue.affectedArea } : {})
  }))
})
