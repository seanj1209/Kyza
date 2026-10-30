import { packModules } from "../apps/web/src/packs"
import {
  EMPTY_NEW_PROJECT_DRAFT,
  NEW_PROJECT_FIELD_LIMITS,
  hasNewProjectDraftInput,
  newProjectReviewRows,
  validateNewProjectForm,
  type NewProjectFormDraft,
} from "../apps/web/src/kyza/projects/newProjectForm"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const packTypeIds = packModules.map(({ id }) => id)
const draft = (changes: Partial<NewProjectFormDraft> = {}): NewProjectFormDraft => ({
  ...EMPTY_NEW_PROJECT_DRAFT,
  ...changes,
})

const missingName = validateNewProjectForm(draft(), packTypeIds)
assert(missingName.ok === false && Boolean(missingName.errors.projectName), "Project Name must be required.")

const whitespaceName = validateNewProjectForm(draft({ projectName: "   " }), packTypeIds)
assert(whitespaceName.ok === false && Boolean(whitespaceName.errors.projectName), "Whitespace-only Project Name must fail.")

const trimmed = validateNewProjectForm(draft({
  projectName: "  Retail Launch  ",
  customerOrBrand: "  Kyza Foods  ",
}), packTypeIds)
assert(trimmed.ok === true, "A valid Pack Gen draft must pass without a pack type.")
if (trimmed.ok === true) {
  assert(trimmed.value.projectName === "Retail Launch", "Project Name must be trimmed.")
  assert(trimmed.value.customerOrBrand === "Kyza Foods", "Optional values must be trimmed.")
  assert(trimmed.value.startingRoute === "pack-gen", "Pack Gen must remain the default route.")
  assert(trimmed.value.packType === undefined, "Pack type must remain optional for Pack Gen.")
}

for (const [field, limit] of Object.entries(NEW_PROJECT_FIELD_LIMITS)) {
  const result = validateNewProjectForm(draft({ projectName: "Valid", [field]: "x".repeat(limit + 1) }), packTypeIds)
  assert(result.ok === false && Boolean(result.errors[field as keyof NewProjectFormDraft]), `${field} maximum length must be enforced.`)
}

const whitespaceOptional = validateNewProjectForm(draft({ projectName: "Valid", notes: "  " }), packTypeIds)
assert(whitespaceOptional.ok === false && Boolean(whitespaceOptional.errors.notes), "Whitespace-only optional text must fail.")

const cutterWithoutPack = validateNewProjectForm(draft({ projectName: "Direct Cutter", startingRoute: "cutter-studio" }), packTypeIds)
assert(cutterWithoutPack.ok === false && Boolean(cutterWithoutPack.errors.packType), "Cutter Studio must require pack type.")

const cutterWithPack = validateNewProjectForm(draft({
  projectName: "Direct Cutter",
  startingRoute: "cutter-studio",
  packType: packTypeIds[0],
}), packTypeIds)
assert(cutterWithPack.ok === true, "Cutter Studio must accept a registered pack type.")

const unknownPack = validateNewProjectForm(draft({ projectName: "Unknown", packType: "not-in-registry" }), packTypeIds)
assert(unknownPack.ok === false && Boolean(unknownPack.errors.packType), "Unknown pack type must fail.")

assert(!hasNewProjectDraftInput(draft()), "Untouched default form must not be dirty.")
assert(hasNewProjectDraftInput(draft({ productName: "Soup" })), "Entered information must mark the form dirty.")
assert(hasNewProjectDraftInput(draft({ startingRoute: "cutter-studio" })), "Changed route must mark the form dirty.")

const reviewRows = newProjectReviewRows({
  projectName: "Review Project",
  productName: "Soup",
  startingRoute: "pack-gen",
})
assert(reviewRows.length === 3, "Review must show only supplied values plus the required route.")
assert(reviewRows.some(([label]) => label === "Product Name"), "Supplied Product Name must appear in review.")
assert(!reviewRows.some(([label]) => label === "Customer or Brand"), "Missing optional values must not appear in review.")

console.log("Kyza New Project form validation and review contract verified")
