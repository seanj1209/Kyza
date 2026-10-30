import type { FlowwrapSpec, PerfLane } from "../types"
import type {
  CutterElementRef,
  CutterElementType,
  CutterIdentityMapV1,
  KyzaProjectV1,
  EyemarkElementRef,
  PerfLaneElementRef,
  TearNotchElementRef
} from "./projectTypes"

const EYEMARK_LEGACY_PATH = "cutter.legacySpec.eyeMarks"
const PERF_LANE_LEGACY_PATH = "cutter.legacySpec.perfs.lanes"
const DOY_TEAR_NOTCH_LEGACY_PATH = "cutter.legacySpec.doyPouch.tearNotch"
const SACHET_TEAR_NOTCH_LEGACY_PATH = "cutter.legacySpec.sachet.tearNotch"
const ELEMENT_TYPES = new Set<CutterElementType>([
  "eyemark",
  "perf-lane",
  "tear-notch",
  "safe-zone",
  "fold-line",
  "hanger-slot",
  "window",
  "attribute-box",
  "half-moon",
  "plain-web-guide"
])

type IdentityNormalisationResult = {
  identityMap: CutterIdentityMapV1
  warnings: string[]
  errors: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isCutterElementRef = (value: unknown): value is CutterElementRef =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.id.trim().length > 0 &&
  typeof value.type === "string" &&
  ELEMENT_TYPES.has(value.type as CutterElementType) &&
  typeof value.legacyPath === "string" &&
  value.legacyPath.trim().length > 0 &&
  (value.coordinateSpace === "cutter-origin-mm" ||
    value.coordinateSpace === "live-area-mm" ||
    value.coordinateSpace === "anchor-relative-mm" ||
    value.coordinateSpace === "legacy-flowwrap") &&
  (value.status === "active" ||
    value.status === "inactive" ||
    value.status === "legacy-derived")

const isEyemarkElementRef = (value: unknown): value is EyemarkElementRef => {
  if (!isCutterElementRef(value) || value.type !== "eyemark") {
    return false
  }
  const candidate = value as CutterElementRef & Record<string, unknown>
  return (
    (candidate.index === 0 || candidate.index === 1) &&
    isFiniteNumber(candidate.widthMm) &&
    isFiniteNumber(candidate.heightMm) &&
    (candidate.offsetXMm === undefined || isFiniteNumber(candidate.offsetXMm)) &&
    (candidate.offsetYMm === undefined || isFiniteNumber(candidate.offsetYMm))
  )
}

const isPerfLaneElementRef = (value: unknown): value is PerfLaneElementRef => {
  if (!isCutterElementRef(value) || value.type !== "perf-lane") {
    return false
  }
  const candidate = value as CutterElementRef & Record<string, unknown>
  return (
    Number.isInteger(candidate.index) &&
    (candidate.index as number) >= 0 &&
    (candidate.mode === "continuous" || candidate.mode === "regulated") &&
    isFiniteNumber(candidate.originXMm) &&
    (candidate.originYMm === undefined || isFiniteNumber(candidate.originYMm)) &&
    isFiniteNumber(candidate.diameterMm)
  )
}

const isTearNotchElementRef = (value: unknown): value is TearNotchElementRef => {
  if (!isCutterElementRef(value) || value.type !== "tear-notch") {
    return false
  }
  const candidate = value as CutterElementRef & Record<string, unknown>
  return (
    (candidate.construction === "doy" || candidate.construction === "sachet") &&
    isFiniteNumber(candidate.widthMm) &&
    isFiniteNumber(candidate.depthMm) &&
    (candidate.offsetXMm === undefined || isFiniteNumber(candidate.offsetXMm)) &&
    (candidate.offsetYMm === undefined || isFiniteNumber(candidate.offsetYMm))
  )
}

export const createCutterElementId = (type: CutterElementType) => {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) {
    return `kyza-element-${type}-${randomUuid}`
  }
  return `kyza-element-${type}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`
}

export const createIndependentCutterIdentityMap = (
  source: CutterIdentityMapV1,
  projectId: string
): CutterIdentityMapV1 => ({
  elements: source.elements.map((element, index) => {
    const role = isEyemarkElementRef(element)
      ? element.index === 0 ? "primary" : "secondary"
      : isPerfLaneElementRef(element)
        ? String(element.index + 1)
        : isTearNotchElementRef(element)
          ? element.construction
          : String(index + 1)
    return {
      ...cloneJson(element),
      id: `${projectId}:${element.type}:${role}`
    }
  })
})

const resolveEyemarkSide = (
  spec: FlowwrapSpec,
  index: 0 | 1
): EyemarkElementRef["side"] => {
  const position = spec.eyeMarks?.position
  if (!position) {
    return undefined
  }
  if (position.startsWith("top")) {
    return "top"
  }
  if (position.startsWith("bottom")) {
    return "bottom"
  }
  if (position === "centre-left") {
    return "left"
  }
  if (position === "centre-right") {
    return "right"
  }
  if (position === "centre" && (spec.eyeMarks?.count ?? 0) > 1) {
    return index === 0 ? "left" : "right"
  }
  return undefined
}

const activeEyemarkCount = (spec: FlowwrapSpec): 0 | 1 | 2 => {
  const count = spec.eyeMarks?.count ?? 0
  return count >= 2 ? 2 : count >= 1 ? 1 : 0
}

const createOrUpdateEyemarkRef = (
  spec: FlowwrapSpec,
  index: 0 | 1,
  existing: EyemarkElementRef | undefined,
  activeCount: 0 | 1 | 2,
  projectId?: string
): EyemarkElementRef => {
  const eyeMarks = spec.eyeMarks
  const isSecondary = index === 1
  const widthMm = isSecondary
    ? eyeMarks?.width2 ?? existing?.widthMm ?? eyeMarks?.width ?? 0
    : eyeMarks?.width ?? existing?.widthMm ?? 0
  const heightMm = isSecondary
    ? eyeMarks?.height2 ?? existing?.heightMm ?? eyeMarks?.height ?? 0
    : eyeMarks?.height ?? existing?.heightMm ?? 0
  const offsetXMm = isSecondary
    ? eyeMarks?.offsetX2 ?? existing?.offsetXMm
    : eyeMarks?.offsetX ?? existing?.offsetXMm
  const offsetYMm = isSecondary
    ? eyeMarks?.offsetY2 ?? existing?.offsetYMm
    : eyeMarks?.offsetY ?? existing?.offsetYMm
  const side = resolveEyemarkSide(spec, index)

  // TODO(coordinate normalisation): convert resolved anchor-relative offsets to cutter-origin mm
  // only after renderer-parity fixtures define the exact anchor conversion.
  return {
    id:
      existing?.id ??
      (projectId
        ? `${projectId}:eyemark:${index === 0 ? "primary" : "secondary"}`
        : createCutterElementId("eyemark")),
    type: "eyemark",
    index,
    legacyPath: EYEMARK_LEGACY_PATH,
    coordinateSpace: "anchor-relative-mm",
    status: index < activeCount ? "active" : "inactive",
    widthMm,
    heightMm,
    ...(side ? { side } : {}),
    ...(offsetXMm !== undefined ? { offsetXMm } : {}),
    ...(offsetYMm !== undefined ? { offsetYMm } : {})
  }
}

const resolvePerfLanes = (spec: FlowwrapSpec): PerfLane[] => {
  const perfs = spec.perfs
  if (!perfs) {
    return []
  }
  return perfs.lanes?.length
    ? perfs.lanes.map(cloneJson)
    : [{ originX: perfs.originX, originY: perfs.originY, diameter: perfs.diameter }]
}

const perfLaneMatchesRef = (
  lane: PerfLane,
  ref: PerfLaneElementRef,
  fallbackDiameter: number
) =>
  lane.originX === ref.originXMm &&
  lane.originY === ref.originYMm &&
  (lane.diameter ?? fallbackDiameter) === ref.diameterMm

const createOrUpdatePerfLaneRef = (
  spec: FlowwrapSpec,
  lane: PerfLane,
  index: number,
  existing: PerfLaneElementRef | undefined,
  projectId?: string
): PerfLaneElementRef => ({
  id:
    existing?.id ??
    (typeof lane.id === "string" && lane.id.trim()
      ? lane.id
      : projectId
        ? `${projectId}:perf-lane:${index + 1}`
        : createCutterElementId("perf-lane")),
  type: "perf-lane",
  index,
  legacyPath: PERF_LANE_LEGACY_PATH,
  coordinateSpace: "live-area-mm",
  status: "active",
  mode: spec.perfs?.mode ?? existing?.mode ?? "continuous",
  originXMm: lane.originX,
  ...(lane.originY !== undefined ? { originYMm: lane.originY } : {}),
  diameterMm: lane.diameter ?? spec.perfs?.diameter ?? existing?.diameterMm ?? 0
})

const createOrUpdateTearNotchRef = (
  spec: FlowwrapSpec,
  construction: "doy" | "sachet",
  existing: TearNotchElementRef | undefined,
  projectId?: string
): TearNotchElementRef | undefined => {
  const notch =
    construction === "doy"
      ? spec.doyPouch?.tearNotch
      : spec.sachet?.tearNotch
  if (!notch && !existing) {
    return undefined
  }
  const isDoy = construction === "doy"
  const active = isDoy
    ? Boolean(notch) && spec.doyPouch?.showTearNotch !== false
    : Boolean(notch) && spec.sachet?.tearNotch?.enabled === true
  return {
    id:
      existing?.id ??
      (projectId
        ? `${projectId}:tear-notch:${construction}`
        : createCutterElementId("tear-notch")),
    type: "tear-notch",
    construction,
    legacyPath: isDoy
      ? DOY_TEAR_NOTCH_LEGACY_PATH
      : SACHET_TEAR_NOTCH_LEGACY_PATH,
    coordinateSpace: "legacy-flowwrap",
    status: active ? "active" : "inactive",
    widthMm: notch?.width ?? existing?.widthMm ?? 6,
    depthMm: notch?.depth ?? existing?.depthMm ?? 3,
    ...(notch?.offsetX !== undefined
      ? { offsetXMm: notch.offsetX }
      : existing?.offsetXMm !== undefined
        ? { offsetXMm: existing.offsetXMm }
        : {}),
    ...(isDoy && notch && "offsetY" in notch && notch.offsetY !== undefined
      ? { offsetYMm: notch.offsetY }
      : existing?.offsetYMm !== undefined
        ? { offsetYMm: existing.offsetYMm }
        : {})
  }
}

export const normaliseElementIdentityMap = (
  spec: FlowwrapSpec,
  value: unknown,
  projectId?: string
): IdentityNormalisationResult => {
  const warnings: string[] = []
  const errors: string[] = []
  const rawElements = isRecord(value) && Array.isArray(value.elements)
    ? value.elements
    : []
  if (!isRecord(value) || !Array.isArray(value.elements)) {
    warnings.push("cutter.identityMap was missing and has been generated from legacySpec.")
  }

  const retained: CutterElementRef[] = []
  const eyemarksByIndex = new Map<0 | 1, EyemarkElementRef>()
  const perfLaneRefs: PerfLaneElementRef[] = []
  const tearNotchesByConstruction = new Map<
    "doy" | "sachet",
    TearNotchElementRef
  >()
  const usedIds = new Set<string>()

  rawElements.forEach((element, elementIndex) => {
    if (isRecord(element) && element.type === "eyemark") {
      if (!isEyemarkElementRef(element)) {
        warnings.push(`Invalid eyemark ref ${elementIndex + 1} was regenerated.`)
        return
      }
      if (eyemarksByIndex.has(element.index)) {
        warnings.push(`Duplicate eyemark slot ${element.index} was removed.`)
        return
      }
      let next = cloneJson(element)
      if (usedIds.has(next.id)) {
        next = { ...next, id: createCutterElementId("eyemark") }
        warnings.push("A duplicate eyemark ID was replaced.")
      }
      usedIds.add(next.id)
      eyemarksByIndex.set(next.index, next)
      return
    }

    if (isRecord(element) && element.type === "perf-lane") {
      if (!isPerfLaneElementRef(element)) {
        warnings.push(`Invalid perf-lane ref ${elementIndex + 1} was regenerated.`)
        return
      }
      let next = cloneJson(element)
      if (usedIds.has(next.id)) {
        next = { ...next, id: createCutterElementId("perf-lane") }
        warnings.push("A duplicate perf-lane ID was replaced.")
      }
      usedIds.add(next.id)
      perfLaneRefs.push(next)
      return
    }

    if (isRecord(element) && element.type === "tear-notch") {
      if (!isTearNotchElementRef(element)) {
        warnings.push(`Invalid tear-notch ref ${elementIndex + 1} was regenerated.`)
        return
      }
      if (tearNotchesByConstruction.has(element.construction)) {
        warnings.push(`Duplicate ${element.construction} tear-notch ref was removed.`)
        return
      }
      let next = cloneJson(element)
      if (usedIds.has(next.id)) {
        next = { ...next, id: createCutterElementId("tear-notch") }
        warnings.push("A duplicate tear-notch ID was replaced.")
      }
      usedIds.add(next.id)
      tearNotchesByConstruction.set(next.construction, next)
      return
    }

    if (!isCutterElementRef(element)) {
      errors.push(`cutter.identityMap.elements[${elementIndex}] is not a valid element ref.`)
      return
    }
    if (
      element.legacyPath === EYEMARK_LEGACY_PATH ||
      element.legacyPath === PERF_LANE_LEGACY_PATH ||
      element.legacyPath === DOY_TEAR_NOTCH_LEGACY_PATH ||
      element.legacyPath === SACHET_TEAR_NOTCH_LEGACY_PATH
    ) {
      errors.push(
        `cutter.identityMap.elements[${elementIndex}] has a mismatched legacy type "${element.type}".`
      )
      return
    }
    if (usedIds.has(element.id)) {
      errors.push(`Duplicate cutter element ID: ${element.id}.`)
      return
    }
    usedIds.add(element.id)
    retained.push(cloneJson(element))
  })

  const activeCount = activeEyemarkCount(spec)
  const requiredSlots: (0 | 1)[] = activeCount === 2
    ? [0, 1]
    : activeCount === 1
      ? [0]
      : []
  const preservedSlots = [...eyemarksByIndex.keys()]
  const slots = Array.from(new Set<0 | 1>([...requiredSlots, ...preservedSlots])).sort()
  slots.forEach(index => {
    const existing = eyemarksByIndex.get(index)
    if (!existing && index < activeCount) {
      warnings.push(`Missing active eyemark ref ${index} was generated.`)
    }
    const expectedStatus = index < activeCount ? "active" : "inactive"
    if (existing && existing.status !== expectedStatus) {
      warnings.push(
        `Eyemark ref ${index} status was normalised to ${expectedStatus}.`
      )
    }
    if (
      existing &&
      (existing.legacyPath !== EYEMARK_LEGACY_PATH ||
        existing.coordinateSpace !== "anchor-relative-mm")
    ) {
      warnings.push(`Eyemark ref ${index} legacy coordinate metadata was normalised.`)
    }
    const next = createOrUpdateEyemarkRef(
      spec,
      index,
      existing,
      activeCount,
      projectId
    )
    if (usedIds.has(next.id) && existing?.id !== next.id) {
      next.id = createCutterElementId("eyemark")
      warnings.push("A duplicate eyemark ID was replaced.")
    }
    usedIds.add(next.id)
    retained.push(next)
  })

  const lanes = resolvePerfLanes(spec)
  const claimedPerfIds = new Set<string>()
  const lanesCarryIds = lanes.some(
    lane => typeof lane.id === "string" && lane.id.trim().length > 0
  )
  lanes.forEach((lane, index) => {
    const laneId = typeof lane.id === "string" ? lane.id.trim() : ""
    let existing = laneId
      ? perfLaneRefs.find(ref => ref.id === laneId && !claimedPerfIds.has(ref.id))
      : undefined
    existing ??= perfLaneRefs.find(
      ref =>
        !claimedPerfIds.has(ref.id) &&
        ref.status === "active" &&
        perfLaneMatchesRef(lane, ref, spec.perfs?.diameter ?? 0)
    )
    existing ??= perfLaneRefs.find(
      ref =>
        !claimedPerfIds.has(ref.id) &&
        perfLaneMatchesRef(lane, ref, spec.perfs?.diameter ?? 0)
    )
    if (!existing && !lanesCarryIds) {
      existing = perfLaneRefs.find(
        ref => !claimedPerfIds.has(ref.id) && ref.index === index
      )
    }
    if (!existing) {
      warnings.push(`Missing active perf-lane ref ${index} was generated.`)
    } else {
      claimedPerfIds.add(existing.id)
      if (existing.status !== "active") {
        warnings.push(`Perf-lane ref ${existing.id} was reactivated.`)
      }
      if (
        existing.legacyPath !== PERF_LANE_LEGACY_PATH ||
        existing.coordinateSpace !== "live-area-mm"
      ) {
        warnings.push(`Perf-lane ref ${existing.id} coordinate metadata was normalised.`)
      }
    }
    const next = createOrUpdatePerfLaneRef(
      spec,
      lane,
      index,
      existing,
      projectId
    )
    if (usedIds.has(next.id) && existing?.id !== next.id) {
      next.id = createCutterElementId("perf-lane")
      warnings.push("A duplicate perf-lane ID was replaced.")
    }
    usedIds.add(next.id)
    claimedPerfIds.add(next.id)
    retained.push(next)
  })
  perfLaneRefs
    .filter(ref => !claimedPerfIds.has(ref.id))
    .forEach(ref => {
      if (ref.status !== "inactive") {
        warnings.push(`Perf-lane ref ${ref.id} was marked inactive.`)
      }
      retained.push({ ...ref, status: "inactive" })
    })

  const tearNotchConstructions = ["doy", "sachet"] as const
  tearNotchConstructions.forEach(construction => {
    const existing = tearNotchesByConstruction.get(construction)
    const next = createOrUpdateTearNotchRef(
      spec,
      construction,
      existing,
      projectId
    )
    if (!next) {
      return
    }
    if (!existing && next.status === "active") {
      warnings.push(`Missing active ${construction} tear-notch ref was generated.`)
    }
    if (existing && existing.status !== next.status) {
      warnings.push(
        `${construction.toUpperCase()} tear-notch ref status was normalised to ${next.status}.`
      )
    }
    if (
      existing &&
      (existing.legacyPath !== next.legacyPath ||
        existing.coordinateSpace !== "legacy-flowwrap")
    ) {
      warnings.push(`${construction.toUpperCase()} tear-notch metadata was normalised.`)
    }
    if (usedIds.has(next.id) && existing?.id !== next.id) {
      next.id = createCutterElementId("tear-notch")
      warnings.push("A duplicate tear-notch ID was replaced.")
    }
    usedIds.add(next.id)
    retained.push(next)
  })

  return {
    identityMap: { elements: retained },
    warnings,
    errors
  }
}

export const getEyemarkElementRefs = (
  project: KyzaProjectV1
): EyemarkElementRef[] =>
  project.cutter.identityMap.elements
    .filter(isEyemarkElementRef)
    .sort((left, right) => left.index - right.index)
    .map(cloneJson)

export const normaliseEyemarkElementRefs = (
  project: KyzaProjectV1
): KyzaProjectV1 => {
  const normalised = normaliseElementIdentityMap(
    project.cutter.legacySpec,
    project.cutter.identityMap,
    project.id
  )
  return {
    ...project,
    cutter: {
      ...project.cutter,
      identityMap: normalised.identityMap
    }
  }
}

export const normaliseCutterElementRefs = normaliseEyemarkElementRefs
export const ensureEyemarkElementRefs = normaliseEyemarkElementRefs
export const syncEyemarkRefsFromLegacySpec = normaliseEyemarkElementRefs
export const syncElementRefsFromLegacySpec = normaliseCutterElementRefs

export const resolveEyemarkById = (
  project: KyzaProjectV1,
  elementId: string
): EyemarkElementRef | undefined =>
  getEyemarkElementRefs(project).find(element => element.id === elementId)

export const getPerfLaneElementRefs = (
  project: KyzaProjectV1
): PerfLaneElementRef[] =>
  project.cutter.identityMap.elements
    .filter(isPerfLaneElementRef)
    .sort((left, right) => left.index - right.index)
    .map(cloneJson)

export const resolvePerfLaneById = (
  project: KyzaProjectV1,
  elementId: string
): PerfLaneElementRef | undefined =>
  getPerfLaneElementRefs(project).find(element => element.id === elementId)

export const getTearNotchElementRefs = (
  project: KyzaProjectV1
): TearNotchElementRef[] =>
  project.cutter.identityMap.elements
    .filter(isTearNotchElementRef)
    .sort((left, right) => left.construction.localeCompare(right.construction))
    .map(cloneJson)

export const resolveTearNotchById = (
  project: KyzaProjectV1,
  elementId: string
): TearNotchElementRef | undefined =>
  getTearNotchElementRefs(project).find(element => element.id === elementId)

export const syncLegacySpecFromEyemarkRefs = (
  project: KyzaProjectV1
): KyzaProjectV1 => {
  const eyeMarks = project.cutter.legacySpec.eyeMarks
  if (!eyeMarks) {
    return project
  }
  const refs = getEyemarkElementRefs(project)
  const primary = refs.find(ref => ref.index === 0)
  const secondary = refs.find(ref => ref.index === 1)
  const nextEyeMarks = {
    ...eyeMarks,
    ...(primary
      ? {
          width: primary.widthMm,
          height: primary.heightMm,
          ...(primary.offsetXMm !== undefined ? { offsetX: primary.offsetXMm } : {}),
          ...(primary.offsetYMm !== undefined ? { offsetY: primary.offsetYMm } : {})
        }
      : {}),
    ...(secondary
      ? {
          width2: secondary.widthMm,
          height2: secondary.heightMm,
          ...(secondary.offsetXMm !== undefined ? { offsetX2: secondary.offsetXMm } : {}),
          ...(secondary.offsetYMm !== undefined ? { offsetY2: secondary.offsetYMm } : {})
        }
      : {})
  }
  return {
    ...project,
    cutter: {
      ...project.cutter,
      legacySpec: {
        ...project.cutter.legacySpec,
        eyeMarks: nextEyeMarks
      }
    }
  }
}

export const syncLegacySpecFromPerfLaneRefs = (
  project: KyzaProjectV1
): KyzaProjectV1 => {
  const perfs = project.cutter.legacySpec.perfs
  if (!perfs) {
    return project
  }
  const activeRefs = getPerfLaneElementRefs(project).filter(
    ref => ref.status === "active"
  )
  if (activeRefs.length === 0) {
    return project
  }
  const first = activeRefs[0]!
  const nextPerfs = perfs.lanes?.length
    ? {
        ...perfs,
        originX: first.originXMm,
        ...(first.originYMm !== undefined ? { originY: first.originYMm } : {}),
        lanes: activeRefs.map((ref, index) => ({
          ...(perfs.lanes?.find(lane => lane.id === ref.id) ?? perfs.lanes?.[index] ?? {}),
          id: ref.id,
          originX: ref.originXMm,
          ...(ref.originYMm !== undefined ? { originY: ref.originYMm } : {}),
          diameter: ref.diameterMm
        }))
      }
    : {
        ...perfs,
        originX: first.originXMm,
        ...(first.originYMm !== undefined ? { originY: first.originYMm } : {}),
        diameter: first.diameterMm
      }
  return {
    ...project,
    cutter: {
      ...project.cutter,
      legacySpec: { ...project.cutter.legacySpec, perfs: nextPerfs }
    }
  }
}

export const syncLegacySpecFromTearNotchRefs = (
  project: KyzaProjectV1
): KyzaProjectV1 => {
  const refs = getTearNotchElementRefs(project)
  const doy = refs.find(ref => ref.construction === "doy")
  const sachet = refs.find(ref => ref.construction === "sachet")
  let legacySpec = project.cutter.legacySpec
  if (doy && legacySpec.doyPouch?.tearNotch) {
    legacySpec = {
      ...legacySpec,
      doyPouch: {
        ...legacySpec.doyPouch,
        tearNotch: {
          ...legacySpec.doyPouch.tearNotch,
          width: doy.widthMm,
          depth: doy.depthMm,
          ...(doy.offsetXMm !== undefined ? { offsetX: doy.offsetXMm } : {}),
          ...(doy.offsetYMm !== undefined ? { offsetY: doy.offsetYMm } : {})
        }
      }
    }
  }
  if (sachet && legacySpec.sachet?.tearNotch) {
    legacySpec = {
      ...legacySpec,
      sachet: {
        ...legacySpec.sachet,
        tearNotch: {
          ...legacySpec.sachet.tearNotch,
          width: sachet.widthMm,
          depth: sachet.depthMm,
          ...(sachet.offsetXMm !== undefined ? { offsetX: sachet.offsetXMm } : {})
        }
      }
    }
  }
  return {
    ...project,
    cutter: { ...project.cutter, legacySpec }
  }
}

export const syncLegacySpecFromElementRefs = (
  project: KyzaProjectV1
): KyzaProjectV1 =>
  syncLegacySpecFromTearNotchRefs(
    syncLegacySpecFromPerfLaneRefs(syncLegacySpecFromEyemarkRefs(project))
  )
