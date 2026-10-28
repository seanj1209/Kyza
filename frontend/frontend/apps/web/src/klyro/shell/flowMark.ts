/**
 * Flow "F" mark, traced from the supplied F logo reference (1254 px artwork, Amends v12).
 * Icon only, no FLOW wordmark. Coordinates are the reference pixel grid, cropped by the viewBox.
 * The frame takes --flow-mark-frame (supplied cream on dark; Dark Charcoal on light so it stays
 * visible on cream surfaces) and the F keeps the supplied red.
 */
export const FLOW_MARK_VIEWBOX = "212 212 850 856"
export const FLOW_MARK_FRAME_PATHS = [
  "M225 224H825L1049 448V595H955V507L769 321H325V416H225Z",
  "M225 544H325V964H834L942 856H1049V876L869 1056H225Z"
] as const
export const FLOW_MARK_LETTER_PATH =
  "M350 436H820A46 46 0 0 1 866 482V531H540A15 15 0 0 0 525 546V654H778A35 35 0 0 1 813 689V742H540A15 15 0 0 0 525 757V922H424V543A15 15 0 0 0 409 528H350Z"

export const FLOW_MARK_SVG = `<svg class="flow-mark" viewBox="${FLOW_MARK_VIEWBOX}" aria-hidden="true" focusable="false">${FLOW_MARK_FRAME_PATHS.map(d => `<path class="flow-mark-frame" d="${d}"/>`).join("")}<path class="flow-mark-letter" d="${FLOW_MARK_LETTER_PATH}"/></svg>`

export function createFlowMarkIcon(): SVGSVGElement {
  const template = document.createElement("template")
  template.innerHTML = FLOW_MARK_SVG
  return template.content.firstElementChild as SVGSVGElement
}
