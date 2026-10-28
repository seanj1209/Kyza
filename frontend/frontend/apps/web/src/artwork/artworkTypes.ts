import type { ArtworkCategory } from "./artworkRules.types"

export const ARTWORK_UPLOAD_TYPES = ["logo", "image", "badge", "text"] as const

export type ArtworkUploadType = (typeof ARTWORK_UPLOAD_TYPES)[number]

export const ARTWORK_UPLOAD_TYPE_LABELS: Record<ArtworkUploadType, string> = {
  logo: "Logo",
  image: "Image",
  badge: "Badge",
  text: "Text"
}

export type ArtworkOrientation = "landscape" | "portrait"
export type ArtworkFlipMode = "horizontal" | "vertical"

export const ARTWORK_FILE_ACCEPT =
  "image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"

export const PX_TO_MM = 25.4 / 96

export type ArtworkBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type ArtworkItem = {
  id: string
  uploadType: ArtworkUploadType
  filename: string
  mimeType: string
  sourceDataUrl: string
  baseWidthMm: number
  baseHeightMm: number
  category: ArtworkCategory
  canEnterSafeZone: boolean
  canEnterSealZoneWhenFlood: boolean
  canEnterEyemarkTrack: boolean
  orientation: ArtworkOrientation
  rotation: number
  flipped: boolean
  flipMode: ArtworkFlipMode | null
  x: number
  y: number
  scale: number
  opacity: number
  locked: boolean
  visible: boolean
  initialX: number
  initialY: number
  initialScale: number
  createdAt: string
}

export type ArtworkCollection = {
  items: ArtworkItem[]
  selectedId: string | null
}
