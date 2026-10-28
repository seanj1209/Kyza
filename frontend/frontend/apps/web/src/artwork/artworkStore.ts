import type { CurrentProject } from "../config/mvpDemoPack"
import type {
  ArtworkCollection,
  ArtworkItem,
  ArtworkOrientation
} from "./artworkTypes"
import type { ArtworkCategory } from "./artworkRules.types"
import {
  getArtworkCapabilityFlags,
  getDefaultArtworkCategory
} from "./artworkMedia"

const ARTWORK_STORAGE_VERSION = "artwork-mvp-001"

const DEFAULT_COLLECTION: ArtworkCollection = {
  items: [],
  selectedId: null
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const normalizeText = (value: string | undefined) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const buildProjectSignature = (project: CurrentProject) => {
  const prompt = normalizeText(project.prompt || project.displayName || project.productName)
  return [
    "cutnflow.artworkAssets",
    ARTWORK_STORAGE_VERSION,
    normalizeText(project.packType),
    `${Math.round(project.width)}x${Math.round(project.height)}`,
    prompt || "default"
  ].join(".")
}

const hasWindow = () => typeof window !== "undefined"

const coerceNumber = (value: unknown, fallback: number) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const isArtworkUploadType = (value: unknown): value is ArtworkItem["uploadType"] =>
  value === "logo" || value === "image" || value === "badge" || value === "text"

const isArtworkOrientation = (value: unknown): value is ArtworkOrientation =>
  value === "landscape" || value === "portrait"

const normalizeArtworkItem = (item: Partial<ArtworkItem>): ArtworkItem | null => {
  if (
    !item.id ||
    !isArtworkUploadType(item.uploadType) ||
    typeof item.filename !== "string" ||
    typeof item.mimeType !== "string" ||
    typeof item.sourceDataUrl !== "string"
  ) {
    return null
  }

  const baseWidthMm = coerceNumber(item.baseWidthMm, 0)
  const baseHeightMm = coerceNumber(item.baseHeightMm, 0)
  if (!(baseWidthMm > 0) || !(baseHeightMm > 0)) {
    return null
  }

  const scale = clamp(coerceNumber(item.scale, 1), 0.01, 20)
  const opacity = clamp(coerceNumber(item.opacity, 1), 0, 1)
  const x = coerceNumber(item.x, 0)
  const y = coerceNumber(item.y, 0)
  const category: ArtworkCategory =
    item.category === "Critical" || item.category === "Background"
      ? item.category
      : getDefaultArtworkCategory(item.uploadType)
  const rotation = coerceNumber(item.rotation, isArtworkOrientation(item.orientation) && item.orientation === "portrait" ? 90 : 0)
  const orientation = isArtworkOrientation(item.orientation)
    ? item.orientation
    : Math.abs(rotation) >= 45 && Math.abs(rotation) < 135
      ? "portrait"
      : "landscape"
  const capabilityFlags = getArtworkCapabilityFlags(category, item.uploadType)

  return {
    id: item.id,
    uploadType: item.uploadType,
    filename: item.filename,
    mimeType: item.mimeType,
    sourceDataUrl: item.sourceDataUrl,
    baseWidthMm,
    baseHeightMm,
    category,
    canEnterSafeZone: capabilityFlags.canEnterSafeZone,
    canEnterSealZoneWhenFlood: capabilityFlags.canEnterSealZoneWhenFlood,
    canEnterEyemarkTrack: capabilityFlags.canEnterEyemarkTrack,
    orientation,
    rotation: orientation === "portrait" ? 90 : 0,
    flipped: Boolean(item.flipped),
    flipMode: Boolean(item.flipped) ? (item.flipMode === "vertical" ? "vertical" : "horizontal") : null,
    x,
    y,
    scale,
    opacity,
    locked: Boolean(item.locked),
    visible: item.visible !== false,
    initialX: coerceNumber(item.initialX, x),
    initialY: coerceNumber(item.initialY, y),
    initialScale: clamp(coerceNumber(item.initialScale, scale), 0.01, 20),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
  }
}

export const createEmptyArtworkCollection = (): ArtworkCollection => ({
  ...DEFAULT_COLLECTION
})

export const buildArtworkStorageKey = (project: CurrentProject) =>
  `${buildProjectSignature(project)}.collection`

export const loadArtworkCollection = (
  project: CurrentProject
): ArtworkCollection => {
  if (!hasWindow()) {
    return createEmptyArtworkCollection()
  }

  const raw = window.localStorage.getItem(buildArtworkStorageKey(project))
  if (!raw) {
    return createEmptyArtworkCollection()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ArtworkCollection> & {
      schemaVersion?: string
    }
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map(item => normalizeArtworkItem(item as Partial<ArtworkItem>))
          .filter((item): item is ArtworkItem => Boolean(item))
      : []
    const selectedId =
      typeof parsed.selectedId === "string" &&
      items.some(item => item.id === parsed.selectedId)
        ? parsed.selectedId
        : items[0]?.id ?? null
    return {
      items,
      selectedId
    }
  } catch {
    return createEmptyArtworkCollection()
  }
}

export const saveArtworkCollection = (
  project: CurrentProject,
  collection: ArtworkCollection
) => {
  if (!hasWindow()) {
    return
  }
  window.localStorage.setItem(
    buildArtworkStorageKey(project),
    JSON.stringify({
      schemaVersion: ARTWORK_STORAGE_VERSION,
      ...collection
    })
  )
}

export const selectArtworkItem = (
  collection: ArtworkCollection,
  selectedId: string | null
) => ({
  ...collection,
  selectedId:
    selectedId === null
      ? null
      : selectedId && collection.items.some(item => item.id === selectedId)
      ? selectedId
      : collection.items[0]?.id ?? null
})

export const upsertArtworkItem = (
  collection: ArtworkCollection,
  item: ArtworkItem
) => ({
  ...collection,
  items: [item, ...collection.items.filter(existing => existing.id !== item.id)],
  selectedId: item.id
})

export const removeArtworkItem = (
  collection: ArtworkCollection,
  itemId: string
) => {
  const items = collection.items.filter(item => item.id !== itemId)
  return {
    items,
    selectedId:
      collection.selectedId === itemId ? items[0]?.id ?? null : collection.selectedId
  }
}

export const updateArtworkItem = (
  collection: ArtworkCollection,
  itemId: string,
  update: (item: ArtworkItem) => ArtworkItem
) => ({
  ...collection,
  items: collection.items.map(item => (item.id === itemId ? update(item) : item))
})
