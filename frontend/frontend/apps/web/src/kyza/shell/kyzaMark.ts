// Exact owner-supplied PNGs. SVG viewports only trim the surrounding whitespace;
// no lettering, geometry, proportions or colours are recreated or filtered.
const assetImage = (file: string, width: number, height: number) => `<image href="/branding/${file}" width="${width}" height="${height}"/>`
export const KYZA_MARK_VIEWBOX = "0 0 100 100"
export const KYZA_MARK_SVG = `<svg viewBox="${KYZA_MARK_VIEWBOX}" aria-hidden="true" focusable="false"><svg class="kyza-brand-asset--light" viewBox="210 245 850 830" width="100" height="100">${assetImage("kyza-symbol.png", 1254, 1254)}</svg><svg class="kyza-brand-asset--dark" viewBox="285 270 710 700" width="100" height="100">${assetImage("kyza-symbol-dark.png", 1254, 1254)}</svg></svg>`
export const KYZA_WORDMARK_SVG = `<svg class="kyza-wordmark kyza-brand-asset--light" viewBox="280 260 1220 395" aria-hidden="true" focusable="false">${assetImage("kyza-horizontal-light.png", 1774, 887)}</svg><svg class="kyza-wordmark kyza-brand-asset--dark" viewBox="310 255 1160 375" aria-hidden="true" focusable="false">${assetImage("kyza-horizontal-dark.png", 1774, 887)}</svg>`
export const KYZA_LOGO_HTML = `<span class="kyza-brand-copy"><span class="kyza-brand-name">${KYZA_WORDMARK_SVG}</span><span class="kyza-brand-product">Workflows built on Intelligence</span></span>`

export function createKyzaMarkIcon(): SVGSVGElement {
  const template = document.createElement("template")
  template.innerHTML = KYZA_MARK_SVG
  const icon = template.content.firstElementChild as SVGSVGElement
  icon.classList.add("kyza-assistant-mark")
  return icon
}
