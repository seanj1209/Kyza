/** Beta release policy. QA/Dev lives in its own private repository.
 * Deliberately no query-string, browser-storage or client role override.
 * This defines shipped product scope; deployment authentication is separate.
 */
export const BETA_PACK_IDS = [
  "plain-film", "flowwrap", "pillow-pack", "doy-pouch", "k-seal-pouch",
  "sachet-3-side-seal", "sachet-4-side-seal", "paper-strip",
] as const

export const BETA_FEATURES = Object.freeze({ sandbox: false, artwork: false })
export const BETA_RESTRICTION_MESSAGE = "This pack type or feature is not included in the current Kyza beta. Your saved work has not been changed."

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const isBetaPackEnabled = (value: unknown): boolean =>
  typeof value === "string" && (BETA_PACK_IDS as readonly string[]).includes(value)

/** Inspect a legacy specification without modifying it. */
export const betaSpecRestriction = (spec: unknown, packId?: unknown): string | null => {
  if (!record(spec)) return null // Structural validation owns malformed values.
  if (spec.sandbox || spec.customPackDefinition || spec.customDefinition || spec.lidding || spec.sideSealPouch || (spec.plainWeb && packId !== "plain-film")) {
    return BETA_RESTRICTION_MESSAGE
  }
  for (const key of ["packId", "packType"] as const) {
    if (spec[key] !== undefined && !isBetaPackEnabled(spec[key])) return BETA_RESTRICTION_MESSAGE
  }
  return null
}

/** Canonical or legacy project admission, including unfinished Flow drafts. */
export const betaProjectRestriction = (value: unknown): string | null => {
  if (!record(value)) return null
  if (value.sandbox || value.customDefinition || value.customPackDefinition) return BETA_RESTRICTION_MESSAGE
  if (record(value.cutter)) {
    if (!isBetaPackEnabled(value.cutter.packType)) return BETA_RESTRICTION_MESSAGE
    const restriction = betaSpecRestriction(value.cutter.legacySpec, value.cutter.packType)
    if (restriction) return restriction
  }
  if (value.packId !== undefined && !isBetaPackEnabled(value.packId)) return BETA_RESTRICTION_MESSAGE
  if (record(value.spec)) {
    const restriction = betaSpecRestriction(value.spec, value.packId)
    if (restriction) return restriction
  }
  const draft = record(value.projectDraft) ? value.projectDraft : null
  const pack = draft && record(draft.packSpecification) ? draft.packSpecification : null
  if (pack) {
    const id = pack.enginePackTypeId ?? pack.packTypeId
    if (id !== undefined && id !== "flow_wrap" && !isBetaPackEnabled(id)) return BETA_RESTRICTION_MESSAGE
  }
  const workspace = draft && record(draft.workspace) ? draft.workspace : null
  const fields = workspace && record(workspace.fields) ? workspace.fields : null
  const field = fields && record(fields.packType) ? fields.packType : null
  if (field?.value !== undefined && field.value !== "" && field.value !== "flow_wrap" && !isBetaPackEnabled(field.value)) return BETA_RESTRICTION_MESSAGE
  return null
}
