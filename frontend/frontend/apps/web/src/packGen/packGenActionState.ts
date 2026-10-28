export type PackGenProjectDetailsIntent = "create-cutter" | "save-draft"

export type PackGenActionState = {
  specificationReady: boolean
  projectReady: boolean
  badgeLabel: string
  primaryLabel: string
  primaryDisabled: boolean
  primaryAction: "create-cutter" | "open-project-details"
  saveAction: "save-draft" | "open-project-details"
}

export function getPackGenActionState(input: {
  specificationReady: boolean
  hasProject: boolean
  hasCutter: boolean
  incompleteBadgeLabel: string
}): PackGenActionState {
  const { specificationReady, hasProject, hasCutter, incompleteBadgeLabel } = input
  return {
    specificationReady,
    projectReady: hasProject,
    badgeLabel: specificationReady ? "Starting Specification Ready" : incompleteBadgeLabel,
    primaryLabel: hasProject
      ? hasCutter
        ? "Update Cutter from Specification"
        : "Create in Cutter Studio"
      : "Continue to Project Details",
    primaryDisabled: !specificationReady,
    primaryAction: hasProject ? "create-cutter" : "open-project-details",
    saveAction: hasProject ? "save-draft" : "open-project-details",
  }
}
