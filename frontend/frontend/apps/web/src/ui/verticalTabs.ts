export function createVerticalTabs(id: string, label: string) {
  const root = document.createElement("div")
  root.className = "studio-vertical-tabs"
  const rail = document.createElement("div")
  rail.className = "studio-vertical-tablist"
  rail.setAttribute("role", "tablist")
  rail.setAttribute("aria-label", label)
  rail.setAttribute("aria-orientation", "vertical")
  const navigation = document.createElement("div")
  navigation.className = "studio-vertical-navigation"
  const makeScrollButton = (direction: number) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "studio-tab-scroll"
    button.textContent = direction < 0 ? "⌃" : "⌄"
    button.setAttribute("aria-label", `Scroll ${label.toLowerCase()} ${direction < 0 ? "up" : "down"}`)
    button.addEventListener("click", () => rail.scrollBy({ top: direction * Math.max(80, rail.clientHeight * .6), behavior: "auto" }))
    return button
  }
  const scrollUp = makeScrollButton(-1)
  const scrollDown = makeScrollButton(1)
  navigation.append(scrollUp, rail, scrollDown)
  const content = document.createElement("div")
  content.className = "studio-vertical-content"
  root.append(navigation, content)
  const updateScroll = () => {
    scrollUp.disabled = rail.scrollTop <= 1
    scrollDown.disabled = rail.scrollTop + rail.clientHeight >= rail.scrollHeight - 1
  }
  rail.addEventListener("scroll", updateScroll, { passive: true })
  const resize = new ResizeObserver(updateScroll)
  resize.observe(rail)
  const reveal = (button: HTMLButtonElement) => {
    if (button === rail.firstElementChild) {
      rail.scrollTop = 0
      updateScroll()
      return
    }
    const railRect = rail.getBoundingClientRect()
    const tabRect = button.getBoundingClientRect()
    if (tabRect.top < railRect.top) rail.scrollTop -= railRect.top - tabRect.top
    else if (tabRect.bottom > railRect.bottom) rail.scrollTop += tabRect.bottom - railRect.bottom
    updateScroll()
  }
  const tabs = new Map<string, { button: HTMLButtonElement; panel: HTMLElement }>()
  const select = (key: string, focus = false) => {
    if (!tabs.has(key)) return
    tabs.forEach((tab, tabKey) => {
      const active = tabKey === key
      tab.button.classList.toggle("is-active", active)
      tab.button.setAttribute("aria-selected", String(active))
      tab.button.tabIndex = active ? 0 : -1
      tab.panel.hidden = !active
    })
    const button = tabs.get(key)!.button
    if (focus) button.focus()
    if (rail.clientHeight) reveal(button)
  }
  const add = (key: string, title: string, panel: HTMLElement, onSelect?: () => void) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "studio-vertical-tab"
    button.id = `${id}-tab-${key}`
    button.textContent = title
    button.setAttribute("role", "tab")
    button.setAttribute("aria-controls", `${id}-panel-${key}`)
    panel.id = `${id}-panel-${key}`
    panel.classList.add("studio-vertical-panel")
    panel.setAttribute("role", "tabpanel")
    panel.setAttribute("aria-labelledby", button.id)
    panel.tabIndex = 0
    tabs.set(key, { button, panel })
    button.addEventListener("click", () => { select(key); onSelect?.() })
    rail.appendChild(button)
    resize.observe(button)
    content.appendChild(panel)
    select(tabs.keys().next().value!)
    return button
  }
  rail.addEventListener("keydown", event => {
    const keys = [...tabs.keys()]
    const index = keys.findIndex(key => tabs.get(key)?.button === document.activeElement)
    if (index < 0) return
    const target = event.key === "ArrowDown" ? (index + 1) % keys.length
      : event.key === "ArrowUp" ? (index - 1 + keys.length) % keys.length
      : event.key === "Home" ? 0 : event.key === "End" ? keys.length - 1 : -1
    if (target < 0) return
    event.preventDefault()
    tabs.get(keys[target])?.button.click()
    tabs.get(keys[target])?.button.focus()
    reveal(tabs.get(keys[target])!.button)
  })
  window.addEventListener("pagehide", () => resize.disconnect(), { once: true })
  return { root, rail, content, add, select }
}
