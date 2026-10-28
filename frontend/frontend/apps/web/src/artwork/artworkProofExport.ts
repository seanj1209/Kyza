const SVG_NS = "http://www.w3.org/2000/svg"

export type ArtworkProofExportOptions = {
  includeCutterGuide: boolean
  includeDimensions: boolean
  includeSafeZones: boolean
  includeSealZones: boolean
  includeEyemarkTrack: boolean
  includeFloodPreview: boolean
  includePreflightSummary: boolean
  includeWarnings: boolean
}

export const DEFAULT_ARTWORK_PROOF_EXPORT_OPTIONS: ArtworkProofExportOptions = {
  includeCutterGuide: true,
  includeDimensions: true,
  includeSafeZones: true,
  includeSealZones: true,
  includeEyemarkTrack: true,
  includeFloodPreview: true,
  includePreflightSummary: true,
  includeWarnings: true
}

export type ArtworkProofExportMetadata = {
  jobName: string
  packLabel: string
  packType: string
  widthMm: number
  heightMm: number
  exportedAt: Date
}

export type ArtworkProofSummary = {
  summaryLines: string[]
  warningLines: string[]
}

type SaveFilePickerOptionsLike = {
  suggestedName?: string
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
}

const A4_LANDSCAPE_WIDTH_MM = 297
const A4_LANDSCAPE_HEIGHT_MM = 210
const PROOF_MARGIN_MM = 10
const PROOF_HEADER_HEIGHT_MM = 21
const PROOF_FOOTER_HEIGHT_MM = 11
const PROOF_SUMMARY_WIDTH_MM = 79
const PROOF_GAP_MM = 8
const PROOF_PANEL_STROKE = "#d9e0e7"
const PROOF_PANEL_FILL = "#ffffff"
const PROOF_TITLE = "Artwork Proof - MVP"

const sanitizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

const wrapText = (value: string, maxChars: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (!words.length) {
    return [""]
  }
  const lines: string[] = []
  let current = words[0]
  for (const word of words.slice(1)) {
    if ((current + " " + word).length > maxChars) {
      lines.push(current)
      current = word
      continue
    }
    current += ` ${word}`
  }
  lines.push(current)
  return lines
}

const addTextBlock = (
  parent: SVGElement,
  lines: string[],
  x: number,
  y: number,
  widthMm: number,
  fontSizeMm: number,
  fill: string,
  options: {
    weight?: number
    anchor?: "start" | "middle" | "end"
    lineGap?: number
  } = {}
) => {
  const maxChars = Math.max(12, Math.floor(widthMm / Math.max(0.4, fontSizeMm * 0.54)))
  let cursorY = y
  const lineGap = options.lineGap ?? fontSizeMm * 1.28
  for (const line of lines) {
    const wrapped = wrapText(line, maxChars)
    for (const segment of wrapped) {
      const text = document.createElementNS(SVG_NS, "text")
      text.setAttribute("x", x.toString())
      text.setAttribute("y", cursorY.toString())
      text.setAttribute("fill", fill)
      text.setAttribute("font-size", fontSizeMm.toString())
      text.setAttribute("font-family", "Arial, Helvetica, sans-serif")
      text.setAttribute("font-weight", String(options.weight ?? 400))
      text.setAttribute("text-anchor", options.anchor ?? "start")
      text.setAttribute("dominant-baseline", "hanging")
      text.textContent = segment
      parent.appendChild(text)
      cursorY += lineGap
    }
    cursorY += fontSizeMm * 0.18
  }
}

const setLayerDisplay = (svg: SVGSVGElement, selectors: string[], visible: boolean) => {
  selectors.forEach(selector => {
    svg.querySelectorAll<SVGElement>(selector).forEach(node => {
      if (visible) {
        node.removeAttribute("display")
        return
      }
      node.setAttribute("display", "none")
    })
  })
}

export const applyArtworkProofLayerVisibility = (
  svg: SVGSVGElement,
  options: ArtworkProofExportOptions,
  includeFloodPreview: boolean
) => {
  const stripChromeSelectors = [
    "#selection_overlay",
    "#issue_flash_overlay",
    "[data-role*='hit']",
    "[data-role*='handle']",
    "[data-role*='rotate']",
    "[data-role*='move']"
  ]
  stripChromeSelectors.forEach(selector => {
    svg.querySelectorAll(selector).forEach(node => node.remove())
  })

  setLayerDisplay(svg, ["[data-layer-id='cutter-outline']"], options.includeCutterGuide)
  setLayerDisplay(svg, ["#cutter_outline", "#cut_line", "#cut_lines"], options.includeCutterGuide)
  setLayerDisplay(
    svg,
    ["[data-layer-id='measurement-guides']", "#measurement_annotations", "#measurement_guides"],
    options.includeDimensions
  )
  setLayerDisplay(svg, ["[data-layer-id='safe-zones']", "#safe_zones"], options.includeSafeZones)
  setLayerDisplay(svg, ["[data-layer-id='seal-areas']", "#seal_areas"], options.includeSealZones)
  setLayerDisplay(svg, ["[data-layer-id='eyemarks']", "#eyemark_track"], options.includeEyemarkTrack)
  setLayerDisplay(
    svg,
    ["[data-layer-id='artwork-flood-preview']", "#artwork-flood-preview-layer"],
    includeFloodPreview
  )
}

export const buildArtworkProofPageSvg = ({
  proofSvg,
  metadata,
  summary,
  options
}: {
  proofSvg: SVGSVGElement
  metadata: ArtworkProofExportMetadata
  summary: ArtworkProofSummary
  options: ArtworkProofExportOptions
}) => {
  const page = document.createElementNS(SVG_NS, "svg")
  page.setAttribute("xmlns", SVG_NS)
  page.setAttribute("viewBox", `0 0 ${A4_LANDSCAPE_WIDTH_MM} ${A4_LANDSCAPE_HEIGHT_MM}`)
  page.setAttribute("width", `${A4_LANDSCAPE_WIDTH_MM}mm`)
  page.setAttribute("height", `${A4_LANDSCAPE_HEIGHT_MM}mm`)
  page.setAttribute("preserveAspectRatio", "xMidYMid meet")
  page.setAttribute("font-family", "Arial, Helvetica, sans-serif")

  const background = document.createElementNS(SVG_NS, "rect")
  background.setAttribute("x", "0")
  background.setAttribute("y", "0")
  background.setAttribute("width", A4_LANDSCAPE_WIDTH_MM.toString())
  background.setAttribute("height", A4_LANDSCAPE_HEIGHT_MM.toString())
  background.setAttribute("fill", PROOF_PANEL_FILL)
  page.appendChild(background)

  const header = document.createElementNS(SVG_NS, "g")
  header.setAttribute("id", "proof-header")
  page.appendChild(header)

  addTextBlock(
    header,
    [PROOF_TITLE],
    PROOF_MARGIN_MM,
    8.5,
    A4_LANDSCAPE_WIDTH_MM - PROOF_MARGIN_MM * 2,
    7.2,
    "#14202f",
    { weight: 700, lineGap: 7.8 }
  )
  addTextBlock(
    header,
    [`Job name: ${metadata.jobName || "Artwork Proof"}`],
    PROOF_MARGIN_MM,
    17.5,
    175,
    3.8,
    "#425164"
  )
  addTextBlock(
    header,
    [`Pack type: ${metadata.packType}`, `Pack label: ${metadata.packLabel}`],
    PROOF_MARGIN_MM,
    22.2,
    175,
    3.6,
    "#425164"
  )
  addTextBlock(
    header,
    [
      `Cutter size: ${Math.round(metadata.widthMm)}mm x ${Math.round(metadata.heightMm)}mm`,
      `Exported: ${metadata.exportedAt.toLocaleString()}`
    ],
    A4_LANDSCAPE_WIDTH_MM - PROOF_MARGIN_MM,
    17.4,
    90,
    3.6,
    "#425164",
    { anchor: "end" }
  )

  const proofPanelX = PROOF_MARGIN_MM
  const proofPanelY = PROOF_MARGIN_MM + PROOF_HEADER_HEIGHT_MM
  const proofPanelWidth =
    A4_LANDSCAPE_WIDTH_MM - PROOF_MARGIN_MM * 2 - PROOF_SUMMARY_WIDTH_MM - PROOF_GAP_MM
  const proofPanelHeight =
    A4_LANDSCAPE_HEIGHT_MM - proofPanelY - PROOF_FOOTER_HEIGHT_MM - PROOF_MARGIN_MM

  const proofPanel = document.createElementNS(SVG_NS, "rect")
  proofPanel.setAttribute("x", proofPanelX.toString())
  proofPanel.setAttribute("y", proofPanelY.toString())
  proofPanel.setAttribute("width", proofPanelWidth.toString())
  proofPanel.setAttribute("height", proofPanelHeight.toString())
  proofPanel.setAttribute("rx", "4")
  proofPanel.setAttribute("ry", "4")
  proofPanel.setAttribute("fill", "#f7f9fb")
  proofPanel.setAttribute("stroke", PROOF_PANEL_STROKE)
  proofPanel.setAttribute("stroke-width", "0.6")
  page.appendChild(proofPanel)

  const nestedProof = proofSvg.cloneNode(true) as SVGSVGElement
  nestedProof.setAttribute("x", (proofPanelX + 1.6).toString())
  nestedProof.setAttribute("y", (proofPanelY + 1.6).toString())
  nestedProof.setAttribute("width", (proofPanelWidth - 3.2).toString())
  nestedProof.setAttribute("height", (proofPanelHeight - 3.2).toString())
  nestedProof.setAttribute("preserveAspectRatio", "xMidYMid meet")
  page.appendChild(nestedProof)

  const summaryPanelX = proofPanelX + proofPanelWidth + PROOF_GAP_MM
  const summaryPanelY = proofPanelY
  const summaryPanelWidth = PROOF_SUMMARY_WIDTH_MM
  const summaryPanelHeight = proofPanelHeight

  const summaryPanel = document.createElementNS(SVG_NS, "rect")
  summaryPanel.setAttribute("x", summaryPanelX.toString())
  summaryPanel.setAttribute("y", summaryPanelY.toString())
  summaryPanel.setAttribute("width", summaryPanelWidth.toString())
  summaryPanel.setAttribute("height", summaryPanelHeight.toString())
  summaryPanel.setAttribute("rx", "4")
  summaryPanel.setAttribute("ry", "4")
  summaryPanel.setAttribute("fill", "#fbfcfe")
  summaryPanel.setAttribute("stroke", PROOF_PANEL_STROKE)
  summaryPanel.setAttribute("stroke-width", "0.6")
  page.appendChild(summaryPanel)

  const summaryGroup = document.createElementNS(SVG_NS, "g")
  summaryGroup.setAttribute("id", "proof-summary")
  page.appendChild(summaryGroup)

  addTextBlock(
    summaryGroup,
    ["Preflight Summary"],
    summaryPanelX + 4,
    summaryPanelY + 4.5,
    summaryPanelWidth - 8,
    4.2,
    "#162334",
    { weight: 700 }
  )

  if (options.includePreflightSummary) {
    addTextBlock(
      summaryGroup,
      summary.summaryLines,
      summaryPanelX + 4,
      summaryPanelY + 12,
      summaryPanelWidth - 8,
      3.4,
      "#334155"
    )
  }

  const warningsStartY = summaryPanelY + 52
  addTextBlock(
    summaryGroup,
    [options.includeWarnings ? "Active Warnings" : "Warnings excluded"],
    summaryPanelX + 4,
    warningsStartY,
    summaryPanelWidth - 8,
    4.0,
    options.includeWarnings ? "#9f2f2f" : "#52616f",
    { weight: 700 }
  )

  if (options.includeWarnings && summary.warningLines.length) {
    addTextBlock(
      summaryGroup,
      summary.warningLines,
      summaryPanelX + 4,
      warningsStartY + 6,
      summaryPanelWidth - 8,
      3.15,
      "#7f1d1d"
    )
  } else {
    addTextBlock(
      summaryGroup,
      [
        options.includeWarnings
          ? "Preflight status: No active warnings."
          : "Warnings are hidden by the export option."
      ],
      summaryPanelX + 4,
      warningsStartY + 6,
      summaryPanelWidth - 8,
      3.15,
      "#52616f"
    )
  }

  const footer = document.createElementNS(SVG_NS, "g")
  footer.setAttribute("id", "proof-footer")
  page.appendChild(footer)

  addTextBlock(
    footer,
    ["Generated by CutNFlow"],
    PROOF_MARGIN_MM,
    A4_LANDSCAPE_HEIGHT_MM - 9.2,
    A4_LANDSCAPE_WIDTH_MM - PROOF_MARGIN_MM * 2,
    3.7,
    "#263244",
    { weight: 700 }
  )
  addTextBlock(
    footer,
    [
      "Proof for artwork placement and technical review. Final production output must be checked against printer/repro specifications."
    ],
    PROOF_MARGIN_MM,
    A4_LANDSCAPE_HEIGHT_MM - 4.8,
    A4_LANDSCAPE_WIDTH_MM - PROOF_MARGIN_MM * 2,
    2.7,
    "#5f6c7b"
  )

  return page
}

export const createArtworkProofFilename = (
  jobName: string,
  widthMm: number,
  heightMm: number
) => {
  const slug = sanitizeSlug(jobName) || "artwork-proof"
  return `cutnflow-proof-${slug}-${Math.round(widthMm)}x${Math.round(heightMm)}.pdf`
}

export const createRasterProofPdfBlobFromSvg = async (
  svgMarkup: string,
  widthMm: number,
  heightMm: number
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
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas unavailable")
  }

  const parser = new DOMParser()
  const parsed = parser.parseFromString(svgMarkup, "image/svg+xml")
  const svgNode = parsed.documentElement
  svgNode.setAttribute("width", `${targetPxW}`)
  svgNode.setAttribute("height", `${targetPxH}`)
  const renderSvgMarkup = new XMLSerializer().serializeToString(svgNode)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const node = new Image()
    node.onload = () => resolve(node)
    node.onerror = () => reject(new Error("Unable to render SVG for PDF export"))
    node.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSvgMarkup)}`
  })

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 1)
  const base64 = jpegDataUrl.split(",")[1] ?? ""
  const binary = atob(base64)
  const imageBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    imageBytes[i] = binary.charCodeAt(i)
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
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`
  const contentBytes = encoder.encode(contentStream)
  addObject(5, `<< /Length ${contentBytes.length} >>\n`, contentBytes)
  const xrefStart = total
  pushText("xref\n")
  pushText("0 6\n")
  pushText("0000000000 65535 f \n")
  for (let i = 1; i <= 5; i += 1) {
    const off = offsets[i] ?? 0
    pushText(`${off.toString().padStart(10, "0")} 00000 n \n`)
  }
  pushText(`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)

  return new Blob(
    chunks.map(chunk => new Uint8Array(chunk)),
    { type: "application/pdf" }
  )
}

export const openProofSavePicker = async (
  suggestedName: string,
  blob: Blob
) => {
  if (!("showSaveFilePicker" in window)) {
    return null
  }
  const handle = await (window as unknown as {
    showSaveFilePicker: (
      options: SaveFilePickerOptionsLike
    ) => Promise<FileSystemFileHandle>
  }).showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: "PDF File",
        accept: { "application/pdf": [".pdf"] }
      }
    ]
  })
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
  return handle
}

export const downloadProofBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
