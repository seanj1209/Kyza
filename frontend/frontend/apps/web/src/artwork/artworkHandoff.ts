import {
  createCurrentProject,
  type CurrentProject
} from "../config/mvpDemoPack"

export type ArtworkStudioAvailabilityInput = {
  studioMode: boolean
  hasCutterSpec: boolean
  artboardStarted: boolean
  packTypeSelected: boolean
  packBuilderAvailable: boolean
  routeAvailable: boolean
}

export const getArtworkStudioAvailability = (
  input: ArtworkStudioAvailabilityInput
) => {
  if (!input.routeAvailable) {
    return { enabled: false, message: "Artwork Studio is not available yet for this workflow." }
  }
  if (!input.studioMode || !input.artboardStarted) {
    return { enabled: false, message: "Start a cutter project before continuing to Artwork Studio." }
  }
  if (!input.packTypeSelected || !input.packBuilderAvailable || !input.hasCutterSpec) {
    return { enabled: false, message: "A valid pack and cutter context is required before continuing." }
  }
  return {
    enabled: true,
    message: "Continue with this project and cutter context. Artwork can be uploaded later."
  }
}

export const createArtworkHandoffProject = (input: {
  storedProject: CurrentProject | null
  packType: string
  packLabel: string
  width: number
  height: number
}) => createCurrentProject({
  ...(input.storedProject ?? {}),
  packType: input.packType,
  packLabel: input.packLabel,
  width: input.width,
  height: input.height,
  source:
    input.storedProject?.projectDraft?.source ??
    input.storedProject?.source ??
    "cutter-studio",
  stage: "artwork"
})
