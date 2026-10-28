export type NewProjectStartingRoute = "pack-gen" | "cutter-studio"

export type NewProjectFormValues = {
  projectName: string
  customerOrBrand?: string
  productName?: string
  jobReference?: string
  description?: string
  notes?: string
  startingRoute: NewProjectStartingRoute
  packType?: string
}

export type NewProjectFormDraft = {
  projectName: string
  customerOrBrand: string
  productName: string
  jobReference: string
  description: string
  notes: string
  startingRoute: NewProjectStartingRoute
  packType: string
}

export type NewProjectFormErrors = Partial<Record<keyof NewProjectFormDraft, string>>

export const NEW_PROJECT_FIELD_LIMITS = {
  projectName: 120,
  customerOrBrand: 120,
  productName: 120,
  jobReference: 80,
  description: 600,
  notes: 1000,
} as const

export const EMPTY_NEW_PROJECT_DRAFT: NewProjectFormDraft = {
  projectName: "",
  customerOrBrand: "",
  productName: "",
  jobReference: "",
  description: "",
  notes: "",
  startingRoute: "pack-gen",
  packType: "",
}

type ValidationResult =
  | { ok: true; value: NewProjectFormValues }
  | { ok: false; errors: NewProjectFormErrors }

const optionalValue = (value: string) => value.trim() || undefined

export function validateNewProjectForm(
  draft: NewProjectFormDraft,
  allowedPackTypes: readonly string[],
): ValidationResult {
  const errors: NewProjectFormErrors = {}
  const projectName = draft.projectName.trim()

  if (!projectName) errors.projectName = "Enter a Project Name."

  for (const field of Object.keys(NEW_PROJECT_FIELD_LIMITS) as Array<keyof typeof NEW_PROJECT_FIELD_LIMITS>) {
    const value = draft[field]
    const limit = NEW_PROJECT_FIELD_LIMITS[field]
    if (value.length > limit) errors[field] = `Use ${limit} characters or fewer.`
    if (field !== "projectName" && value.length > 0 && !value.trim()) {
      errors[field] = "Enter text or leave this field blank."
    }
  }

  if (draft.startingRoute === "cutter-studio" && !draft.packType) {
    errors.packType = "Select a pack type to start directly in Cutter Studio."
  } else if (draft.packType && !allowedPackTypes.includes(draft.packType)) {
    errors.packType = "Select an available pack type."
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      projectName,
      customerOrBrand: optionalValue(draft.customerOrBrand),
      productName: optionalValue(draft.productName),
      jobReference: optionalValue(draft.jobReference),
      description: optionalValue(draft.description),
      notes: optionalValue(draft.notes),
      startingRoute: draft.startingRoute,
      packType: optionalValue(draft.packType),
    },
  }
}

export function hasNewProjectDraftInput(draft: NewProjectFormDraft) {
  return Object.entries(draft).some(([field, value]) => (
    field === "startingRoute" ? value !== EMPTY_NEW_PROJECT_DRAFT.startingRoute : Boolean(value)
  ))
}

export function newProjectReviewRows(values: NewProjectFormValues) {
  return [
    ["Project Name", values.projectName],
    ["Customer or Brand", values.customerOrBrand],
    ["Product Name", values.productName],
    ["Starting Route", values.startingRoute === "pack-gen" ? "Pack Gen" : "Cutter Studio"],
    ["Pack Type", values.packType],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}
