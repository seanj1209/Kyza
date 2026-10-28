/** Small, theme-aware symbols; decorative because their controls provide labels. */
export function createStudioIcon(name: string): SVGSVGElement | null {
  const shapes: Record<string, string> = {
    'label-fop': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/><circle cx="17" cy="18" r="1"/>',
    'label-bop': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M7 7h10M7 10h10M7 13h10M7 16h4m2 0h4M7 19h10"/>',
    'label-seal-area': '<rect x="3" y="3" width="18" height="18"/><rect x="7" y="7" width="10" height="10" stroke-dasharray="2 2"/><path d="m3 9 6-6m6 0 6 6m0 6-6 6m-6 0-6-6"/>',
    'label-side-seal': '<rect x="3" y="3" width="18" height="18"/><path d="M7 3v18m10-18v18" stroke-width="3"/>',
    'label-top-seal': '<rect x="3" y="3" width="18" height="18"/><path d="M3 7h18" stroke-width="3"/>',
    'label-bottom-seal': '<rect x="3" y="3" width="18" height="18"/><path d="M3 17h18" stroke-width="3"/>',
    'label-clear-window': '<rect x="3" y="3" width="18" height="18"/><rect x="7" y="8" width="10" height="8" rx="2"/><path d="m10 13 4-3" opacity=".6"/>',
    'label-text-this-way': '<text x="12" y="15" fill="currentColor" stroke="none" text-anchor="middle" font-family="system-ui" font-size="9">ABC</text>',
    'text-direction': '<text x="12" y="15" fill="currentColor" stroke="none" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="9">ABC</text>',
    linked: '<path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1" transform="translate(1 1) scale(.9)"/>',
    unlinked: '<path d="m8 16-1 1a4 4 0 0 1-6-6l3-3m12 0 1-1a4 4 0 0 1 6 6l-3 3M9 3v3M3 9h3m12 0h3m-6 9v3M9 15l6-6"/>',
    visible: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    hidden: '<path d="m3 3 18 18M10 5c7-1 12 7 12 7a19 19 0 0 1-4 5M6 6a18 18 0 0 0-4 6s3 7 10 7a12 12 0 0 0 4-1"/>',
    locked: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    unlocked: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0m-4 8v2"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    fold: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v3m0 3v4m0 3v3"/>',
    safe: '<rect x="2" y="3" width="20" height="18" rx="2"/><rect x="6" y="7" width="12" height="10" rx="1" stroke-dasharray="2 3"/>',
    'gusset-arch': '<path d="M3 4h18v16H3ZM3 15q9-14 18 0M3 15h18" />',
    'kseal-arch': '<path d="M4 3v18m16-18v18M4 7l8 5-8 5m16-10-8 5 8 5M4 3h16M4 21h16"/>',
    hanger: '<path d="M5 9h4a3 3 0 0 1 6 0h4a3 3 0 0 1 0 6H5a3 3 0 0 1 0-6Z"/>',
    'half-moon': '<path d="M3 10h18a9 9 0 0 1-18 0Z"/>',
    tear: '<path d="M4 3h16v18H4v-6l5-3-5-3Z"/>',
    'window-rectangle': '<rect x="3" y="5" width="18" height="14"/>',
    'window-rounded-rectangle': '<rect x="3" y="5" width="18" height="14" rx="4"/>',
    'window-circle': '<circle cx="12" cy="12" r="8"/>',
    'window-oval': '<ellipse cx="12" cy="12" rx="10" ry="7"/>',
    'window-triangle': '<path d="m12 3 10 18H2Z"/>',
    'window-rounded-triangle': '<path d="M10 5q2-4 4 0l7 12q2 4-2 4H5q-4 0-2-4Z"/>',
    'window-half-circle': '<path d="M3 16a9 9 0 0 1 18 0Z"/>',
    'clear-strip': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18m-12-6-3 6m8-6-3 6m8-6-3 6" opacity=".6"/>',
    zipper: '<path d="M3 8h18M3 16h18M6 8v4m4-4v4m4-4v4m4-4v4M8 12v4m4-4v4m4-4v4"/>',
    grip: '<path d="M3 7h18M3 11h18M3 15h18M3 19h18"/>',
    barcode: '<path d="M3 4v14m3-14v14m4-14v14m3-14v14m2-14v14m3-14v14m3-14v14M3 21h3m3 0h6m3 0h3"/>',
    'qr-code': '<path d="M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h3v3h3v3h-6Zm-3-9v6H6m6 3v6m9-9h-3"/>',
    bbe: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M7 2v4m10-4v4"/><text x="12" y="16" fill="currentColor" stroke="none" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="650" font-size="6">12/28</text>',
    labels: '<path d="M3 3h9l10 10-9 9L3 12Z"/><circle cx="8" cy="8" r="1.5"/>',
    'hole-punch': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/>',
    'hot-needle': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h.1m4 0h.1m4 0h.1M8 12h.1m4 0h.1m4 0h.1M8 16h.1m4 0h.1m4 0h.1" stroke-width="2.5"/>',
    scribe: '<path d="M3 6h18M3 12h3m3 0h3m3 0h3m3 0h1M3 18h18"/>'
  }
  if (!shapes[name]) return null
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "1.6")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.innerHTML = shapes[name]
  return svg
}
