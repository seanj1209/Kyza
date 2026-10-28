import "./studioPackCarousel.css"
import { PACK_GRADIENTS, PACK_ILLUSTRATIONS } from "./studioPackIllustrations"

type StudioPack = { id: string; name: string }
type CarouselOptions = {
  packs: readonly StudioPack[]
  initialPackId: string
  createButton: HTMLButtonElement
  onSelect: (packId: string) => void
}

const presentation: Record<string, { illustration: string; description: string }> = {
  flowwrap: { illustration: "flowwrap", description: "A continuous web wrapped and sealed around the pack." },
  "paper-strip": { illustration: "paperstrip", description: "A strip laminate guide with a paper strip." },
  "pillow-pack": { illustration: "pillow", description: "A classic pillow-shaped flexible pack." },
  "k-seal-pouch": { illustration: "kseal", description: "A stand-up pouch with K-seal base panels." },
  "doy-pouch": { illustration: "doy", description: "A stand-up pouch with a folded base gusset." },
  "sachet-4-side-seal": { illustration: "side4", description: "A sachet sealed along all four edges." },
  "sachet-3-side-seal": { illustration: "side3", description: "A sachet sealed along three edges." },
  "2-side-seal-pouch": { illustration: "pouch3", description: "A folded pouch with two side seals." },
  "3-side-seal-pouch": { illustration: "pouch3", description: "A pouch with side and bottom seals." },
  "plain-film": { illustration: "plainFilm", description: "An unsealed clear film starting sheet." },
  lidding: { illustration: "lidding", description: "Plain, square or round lidding cutter guides." }
}

const PACK_ORDER = ["plain-film", "flowwrap", "pillow-pack", "doy-pouch", "k-seal-pouch", "3-side-seal-pouch", "2-side-seal-pouch", "sachet-3-side-seal", "sachet-4-side-seal", "paper-strip", "lidding"]
const displayNames: Record<string, string> = { flowwrap: "Flow Wrap", "paper-strip": "Strip Film/Laminate" }

export function createStudioPackCarousel(options: CarouselOptions) {
  const entries = [
    ...[...options.packs].sort((a, b) => PACK_ORDER.indexOf(a.id) - PACK_ORDER.indexOf(b.id)).map(pack => ({
      ...pack, name: displayNames[pack.id] ?? pack.name, available: true,
      ...presentation[pack.id],
      description: presentation[pack.id]?.description ?? `Create a ${pack.name} cutter guide.`
    })),
  ]
  const element = document.createElement("div")
  element.className = "studio-pack-carousel"
  element.setAttribute("role", "region")
  element.setAttribute("aria-roledescription", "carousel")
  element.setAttribute("aria-label", "Pack types")
  element.innerHTML = `
    ${PACK_GRADIENTS}
    <div class="carousel">
      <button class="nav prev" type="button" aria-label="Previous pack type">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6 L9 12 L15 18"/></svg>
      </button>
      <div class="viewport"><div class="track"></div></div>
      <button class="nav next" type="button" aria-label="Next pack type">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6 L15 12 L9 18"/></svg>
      </button>
    </div>
    <div class="rail"><div class="dots" aria-hidden="true"></div></div>
    <span class="pack-announcement" role="status" aria-live="polite" aria-atomic="true"></span>
  `
  const track = element.querySelector<HTMLElement>(".track")!
  const dots = element.querySelector<HTMLElement>(".dots")!
  const announcement = element.querySelector<HTMLElement>(".pack-announcement")!
  const previous = element.querySelector<HTMLButtonElement>(".prev")!
  const next = element.querySelector<HTMLButtonElement>(".next")!
  const slides = entries.map((entry, position) => {
    const slide = document.createElement("article")
    slide.className = `slide${entry.available ? "" : " is-locked"}`
    slide.dataset.packId = entry.id
    slide.hidden = true
    slide.setAttribute("role", "group")
    slide.setAttribute("aria-roledescription", "slide")
    slide.setAttribute("aria-label", `${position + 1} of ${entries.length}: ${entry.name}`)
    const well = document.createElement("div")
    well.className = "well"
    well.setAttribute("aria-hidden", "true")
    well.innerHTML = `<div class="pic">${PACK_ILLUSTRATIONS[entry.illustration] ?? PACK_ILLUSTRATIONS.flowwrap}</div>`
    const meta = document.createElement("div")
    meta.className = "meta"
    const name = document.createElement("h3")
    name.textContent = entry.name
    const description = document.createElement("p")
    description.textContent = entry.description
    meta.append(name, description)
    const foot = document.createElement("div")
    foot.className = "foot"
    if (!entry.available) {
      foot.innerHTML = '<span class="soon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7"/></svg>Coming soon</span>'
    }
    slide.append(well, meta, foot)
    track.appendChild(slide)
    const dot = document.createElement("span")
    dot.className = "dot"
    dots.appendChild(dot)
    return { slide, foot, dot }
  })
  let index = -1
  const show = (position: number, notify = false) => {
    const nextIndex = (position + entries.length) % entries.length
    if (nextIndex === index) return
    // Exactly one slide is exposed; no clones, neighbouring peeks or auto-cycle.
    if (index >= 0) {
      slides[index].slide.hidden = true
      slides[index].slide.classList.remove("is-active")
      slides[index].dot.removeAttribute("aria-current")
    }
    index = nextIndex
    const entry = entries[index]
    const active = slides[index]
    if (entry.available) active.foot.appendChild(options.createButton)
    else options.createButton.remove()
    active.slide.hidden = false
    active.slide.classList.add("is-active")
    active.dot.setAttribute("aria-current", "true")
    if (notify) {
      announcement.textContent = `${index + 1} of ${entries.length}: ${entry.name}${entry.available ? "" : ". Coming soon"}`
      if (entry.available) options.onSelect(entry.id)
    }
  }
  previous.addEventListener("click", () => show(index - 1, true))
  next.addEventListener("click", () => show(index + 1, true))
  element.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      // Keep keyboard focus on a persistent control, never a newly hidden action.
      const direction = event.key === "ArrowRight" ? 1 : -1
      show(index + direction, true)
      ;(direction > 0 ? next : previous).focus()
    }
  })
  const select = (packId: string) => {
    const position = entries.findIndex(entry => entry.id === packId && entry.available)
    if (position >= 0) show(position)
  }
  select(options.initialPackId)
  if (index < 0) show(0)
  return { element, select }
}
