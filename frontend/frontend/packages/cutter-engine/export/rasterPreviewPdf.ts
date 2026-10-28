import type { CutterExportMetadata } from "./exportTiers"

export const RASTER_PREVIEW_PDF_FORMAT = "raster-preview-pdf" as const
export const RASTER_PREVIEW_PDF_DESCRIPTION = "Raster Preview PDF" as const

const escapePdfString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")

const toPdfDate = (isoDate: string) =>
  `D:${isoDate.replace(/[-:T]/g, "").replace(/\.\d{3}Z$/, "Z")}`

export const createRasterPreviewPdfFromSvg = async (
  svgMarkup: string,
  widthMm: number,
  heightMm: number,
  metadata?: CutterExportMetadata
) => {
  const safeMmW = Math.max(1, widthMm || 1000)
  const safeMmH = Math.max(1, heightMm || 1000)
  const pageW = (safeMmW * 72) / 25.4
  const pageH = (safeMmH * 72) / 25.4
  const dpi = 600
  const targetPxW = Math.max(1, Math.round((safeMmW / 25.4) * dpi))
  const targetPxH = Math.max(1, Math.round((safeMmH / 25.4) * dpi))

  const canvas = document.createElement("canvas")
  canvas.width = targetPxW
  canvas.height = targetPxH
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas unavailable for raster preview PDF export.")
  }

  const parser = new DOMParser()
  const parsed = parser.parseFromString(svgMarkup, "image/svg+xml")
  const svgNode = parsed.documentElement
  svgNode.setAttribute("width", String(targetPxW))
  svgNode.setAttribute("height", String(targetPxH))
  const renderSvgMarkup = new XMLSerializer().serializeToString(svgNode)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const node = new Image()
    node.onload = () => resolve(node)
    node.onerror = () => reject(new Error("Unable to rasterise SVG for preview PDF export."))
    node.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSvgMarkup)}`
  })

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 1)
  const base64 = jpegDataUrl.split(",")[1] ?? ""
  const binary = atob(base64)
  const imageBytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    imageBytes[index] = binary.charCodeAt(index)
  }

  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let total = 0
  const pushText = (text: string) => {
    const bytes = encoder.encode(text)
    chunks.push(bytes)
    total += bytes.length
  }
  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes)
    total += bytes.length
  }
  const addObject = (index: number, content: string, binaryContent?: Uint8Array) => {
    offsets[index] = total
    pushText(`${index} 0 obj\n`)
    pushText(content)
    if (binaryContent) {
      pushText("stream\n")
      pushBytes(binaryContent)
      pushText("\nendstream\n")
    }
    pushText("endobj\n")
  }

  pushText("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n")
  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>\n")
  addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n")
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`
  )
  addObject(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\n`,
    imageBytes
  )
  const contentBytes = encoder.encode(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`)
  addObject(5, `<< /Length ${contentBytes.length} >>\n`, contentBytes)
  if (metadata) {
    addObject(
      6,
      `<< /Title (${escapePdfString(metadata.projectName)} - PDF Proof) /Subject (CutNFlow raster proof; not editable vector) /Creator (CutNFlow) /CreationDate (${toPdfDate(metadata.createdAt)}) /CutNFlowExportTier (${metadata.exportTier}) /CutNFlowExportFormat (${metadata.exportFormat}) /CutNFlowPackType (${escapePdfString(metadata.packType)}) /CutNFlowWidthMm (${metadata.dimensions.widthMm}) /CutNFlowHeightMm (${metadata.dimensions.heightMm}) /CutNFlowValidationStatus (${metadata.validationStatus}) /CutNFlowWarnings (${metadata.warningsCount}) /CutNFlowErrors (${metadata.errorsCount}) >>\n`
    )
  }
  const xrefStart = total
  const objectCount = metadata ? 6 : 5
  pushText(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`)
  for (let index = 1; index <= objectCount; index += 1) {
    pushText(`${(offsets[index] ?? 0).toString().padStart(10, "0")} 00000 n \n`)
  }
  pushText(
    `trailer << /Size ${objectCount + 1} /Root 1 0 R${metadata ? " /Info 6 0 R" : ""} >>\nstartxref\n${xrefStart}\n%%EOF`
  )

  return new Blob(chunks.map(chunk => new Uint8Array(chunk)), {
    type: "application/pdf"
  })
}
