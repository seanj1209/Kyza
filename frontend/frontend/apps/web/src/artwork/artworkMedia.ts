import { PX_TO_MM, type ArtworkUploadType } from "./artworkTypes"
import type { ArtworkCategory } from "./artworkRules.types"

export type ArtworkImportedFile = {
  filename: string
  mimeType: string
  sourceDataUrl: string
  baseWidthMm: number
  baseHeightMm: number
}

type SvgSize = {
  widthPx: number
  heightPx: number
}

const isSupportedSvg = (file: File) =>
  file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")

const parseSvgLength = (value: string | null) => {
  if (!value) {
    return null
  }
  const next = Number.parseFloat(value)
  return Number.isFinite(next) && next > 0 ? next : null
}

const extractSvgSize = (svgText: string): SvgSize => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, "image/svg+xml")
    const root = doc.documentElement
    const width = parseSvgLength(root.getAttribute("width"))
    const height = parseSvgLength(root.getAttribute("height"))
    if (width && height) {
      return { widthPx: width, heightPx: height }
    }

    const viewBox = root.getAttribute("viewBox")
    if (viewBox) {
      const parts = viewBox
        .trim()
        .split(/[\s,]+/)
        .map(part => Number.parseFloat(part))
      if (parts.length === 4 && parts.every(part => Number.isFinite(part))) {
        return {
          widthPx: Math.max(1, parts[2]),
          heightPx: Math.max(1, parts[3])
        }
      }
    }
  } catch {
    // Fall through to a safe default size.
  }

  return { widthPx: 100, heightPx: 100 }
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsDataURL(file)
  })

const loadImageSize = (sourceDataUrl: string) =>
  new Promise<{ widthPx: number; heightPx: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve({
        widthPx: Math.max(1, image.naturalWidth || image.width || 1),
        heightPx: Math.max(1, image.naturalHeight || image.height || 1)
      })
    }
    image.onerror = () => reject(new Error("Unable to determine artwork size."))
    image.src = sourceDataUrl
  })

const svgTextToDataUrl = (svgText: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`

export const isSupportedArtworkFile = (file: File) =>
  file.type === "image/png" ||
  file.type === "image/jpeg" ||
  file.type === "image/jpg" ||
  isSupportedSvg(file)

export const buildArtworkLabel = (
  uploadType: ArtworkUploadType,
  filename: string
) => {
  const typeLabel =
    uploadType === "logo"
      ? "Logo"
      : uploadType === "image"
        ? "Image"
        : uploadType === "badge"
          ? "Badge"
          : "Text"
  return `${typeLabel} - ${filename}`
}

export const ARTWORK_CATEGORY_LABELS: Record<ArtworkCategory, string> = {
  Critical: "Critical",
  Background: "Background"
}

export const getDefaultArtworkCategory = (uploadType: ArtworkUploadType): ArtworkCategory =>
  uploadType === "image" ? "Background" : "Critical"

export const getArtworkCapabilityFlags = (
  category: ArtworkCategory,
  uploadType: ArtworkUploadType
) => ({
  canEnterSafeZone: category === "Background",
  canEnterSealZoneWhenFlood: category === "Background",
  canEnterEyemarkTrack: false,
  isImage: uploadType === "image"
})

export const readArtworkFile = async (
  file: File
): Promise<ArtworkImportedFile> => {
  if (!isSupportedArtworkFile(file)) {
    throw new Error("Unsupported artwork file type.")
  }

  if (isSupportedSvg(file)) {
    const svgText = await file.text()
    const { widthPx, heightPx } = extractSvgSize(svgText)
    return {
      filename: file.name,
      mimeType: "image/svg+xml",
      sourceDataUrl: svgTextToDataUrl(svgText),
      baseWidthMm: widthPx * PX_TO_MM,
      baseHeightMm: heightPx * PX_TO_MM
    }
  }

  const sourceDataUrl = await readFileAsDataUrl(file)
  const { widthPx, heightPx } = await loadImageSize(sourceDataUrl)
  return {
    filename: file.name,
    mimeType: file.type || "image/png",
    sourceDataUrl,
    baseWidthMm: widthPx * PX_TO_MM,
    baseHeightMm: heightPx * PX_TO_MM
  }
}
