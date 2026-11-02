import type { RenderOptions } from "../types/flowwrap"

/** View state belongs to the canvas, never the saved cutter specification. */
export function createPreSlitView(onChange: () => void) {
  const views = new Map<string, boolean>()
  let activeId = ""
  let supported = false
  const button = document.createElement("button")
  button.type = "button"
  button.className = "dock-menu-item"
  button.setAttribute("role", "menuitemcheckbox")
  button.setAttribute("data-pre-slit-toggle", "true")
  button.innerHTML = '<span class="dock-menu-icon" aria-hidden="true">▣</span><span>Pre-Slit View</span><span class="dock-menu-check" aria-hidden="true">✓</span>'
  const refresh = () => {
    button.hidden = !supported
    button.disabled = !supported
    const enabled = supported && views.get(activeId) === true
    button.classList.toggle("is-active", enabled)
    button.setAttribute("aria-checked", String(enabled))
  }
  button.addEventListener("click", () => {
    if (!supported) return
    views.set(activeId, !views.get(activeId))
    refresh()
    button.closest(".dock-more-menu")?.classList.remove("is-open")
    document.querySelector('#dock-shell [aria-expanded="true"]')?.setAttribute("aria-expanded", "false")
    onChange()
  })
  return {
    sync(artboardId: string, packId: string) {
      activeId = artboardId
      supported = packId === "paper-strip"
      const menu = document.querySelector(".dock-more-menu")
      if (menu && button.parentElement !== menu) menu.appendChild(button)
      refresh()
    },
    renderOptions(artboardId: string, packId: string): RenderOptions {
      return { paperStripView: packId === "paper-strip" && views.get(artboardId) ? "pre-slit" : "normal" }
    }
  }
}
