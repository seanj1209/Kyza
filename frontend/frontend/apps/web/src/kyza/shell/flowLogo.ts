/** Exact owner-supplied Flow artwork, using the same lossless crop as the flagship. */
export function createFlowLogo(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg"
  const logo = document.createElementNS(ns, "svg")
  logo.setAttribute("viewBox", "0 0 1032 392")
  logo.setAttribute("role", "img")
  logo.setAttribute("aria-label", "Flow")
  logo.setAttribute("focusable", "false")
  logo.classList.add("flow-assistant-logo")
  const asset = document.createElementNS(ns, "image")
  asset.setAttribute("href", "/branding/flow-assist-light.png")
  asset.setAttribute("width", "1032")
  asset.setAttribute("height", "392")
  logo.appendChild(asset)
  return logo
}
