import { createFlowMarkIcon } from "../klyro/shell/flowMark"
import "./flowAssistantDock.css"

export type FlowValidationCounts = { critical: number; warning: number; advisory: number; pass: number }
export type FlowAssistantDock = {
  element: HTMLElement
  setValidation: (counts: FlowValidationCounts | null) => void
  openIssues: () => void
  collapse: () => void
}

/** Beta guidance only. This does not generate or execute cutter commands. */
function answerHelp(question: string): string {
  const q = question.toLowerCase()
  if (/valid|error|warning|advis|qc|issue/.test(q)) return "Open Advisories to review the current engine checks. Use View to locate an affected element or re-run validation after changes."
  if (/\b(rotat\w*|turn|spin)\b/.test(q)) return "Select an editable element, then press Shift+L to rotate left or Shift+R to rotate right. You can also drag its corner rotation control where available."
  if (/(eyemark|eye mark|registration mark)/.test(q) && /(number|count|many|add|remove|change|set|more|fewer)/.test(q)) return "Open Base and use Eyemark Settings to change the number of eyemarks."
  if (/(hide|show|visible|visibility|toggle|turn off|turn on)/.test(q) && /(element|layer|feature|object)/.test(q)) return "Open Layers and use the visibility icon beside the element or layer to show or hide it."
  if (/measur|dimension/.test(q)) return "Use the Measure tool in the floating canvas dock, or adjust exact dimensions in Base settings."
  if (/export|pdf|svg/.test(q)) return "Choose Export in the top bar, review the format and validation checks, then follow the export steps."
  if (/hanger|slot|hole/.test(q)) return "Use Elements to add a hanger slot, then adjust its dimensions and review Advisories."
  return "This beta currently offers built-in help only. Ask about rotation, measurement, hanger slots, validation or export. No cutter changes were made."
}

export function createFlowAssistantDock(issuesPanel: HTMLElement): FlowAssistantDock {
  const element = document.createElement("section")
  element.id = "flow-assistant-dock"
  element.className = "flow-assistant-dock"
  element.dataset.state = "collapsed"
  element.setAttribute("aria-label", "Flow assistant and quality checks")
  const top = document.createElement("div")
  top.className = "flow-assistant-top"
  top.setAttribute("role", "tablist")
  top.setAttribute("aria-label", "Flow views")
  const chatTab = document.createElement("button")
  chatTab.type = "button"
  chatTab.id = "flow-chat-tab"
  chatTab.className = "flow-assistant-chat-tab"
  chatTab.textContent = "Chat"
  chatTab.setAttribute("role", "tab")
  chatTab.setAttribute("aria-controls", "flow-chat-content")
  const brand = document.createElement("button")
  brand.type = "button"
  brand.className = "flow-assistant-brand"
  brand.append(createFlowMarkIcon(), document.createTextNode("Flow"))
  const status = document.createElement("button")
  status.type = "button"
  status.className = "flow-assistant-status"
  status.id = "flow-issues-tab"
  status.setAttribute("role", "tab")
  status.setAttribute("aria-controls", "studio-errors-panel")
  status.textContent = "QC · Start a cutter"
  const toggle = document.createElement("button")
  toggle.type = "button"
  toggle.className = "flow-assistant-toggle"
  top.append(chatTab, brand, status, toggle)
  const body = document.createElement("div")
  body.className = "flow-assistant-body"
  const chat = document.createElement("div")
  chat.id = "flow-chat-content"
  chat.className = "flow-assistant-chat"
  chat.setAttribute("role", "tabpanel")
  chat.setAttribute("aria-labelledby", "flow-chat-tab")
  const response = document.createElement("div")
  response.className = "flow-assistant-response"
  response.setAttribute("role", "status")
  response.setAttribute("aria-live", "polite")
  response.textContent = "Ask Flow how to use the studio, or switch to Advisories for live cutter checks."
  chat.append(response)
  issuesPanel.classList.add("flow-assistant-issues")
  issuesPanel.setAttribute("role", "tabpanel")
  issuesPanel.setAttribute("aria-label", "Advisories")
  body.append(chat, issuesPanel)
  const form = document.createElement("form")
  form.className = "flow-assistant-form"
  const input = document.createElement("input")
  input.type = "text"
  input.maxLength = 500
  input.placeholder = "Ask Flow about your cutter…"
  input.setAttribute("aria-label", "Ask Flow a question")
  const send = document.createElement("button")
  send.type = "submit"
  send.setAttribute("aria-label", "Send message")
  send.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  form.append(input, send)
  element.append(top, body, form)
  const setState = (state: "collapsed" | "chat" | "issues") => {
    element.dataset.state = state
    brand.setAttribute("aria-expanded", String(state !== "collapsed"))
    toggle.textContent = state === "collapsed" ? "⌃" : "⌄"
    toggle.setAttribute("aria-label", state === "collapsed" ? "Expand Flow" : "Collapse Flow")
    chat.hidden = state !== "chat"
    issuesPanel.hidden = state !== "issues"
    chatTab.setAttribute("aria-selected", String(state === "chat"))
    status.setAttribute("aria-selected", String(state === "issues"))
    chatTab.tabIndex = 0
    status.tabIndex = 0
  }
  brand.addEventListener("click", () => setState(element.dataset.state === "collapsed" ? "chat" : "collapsed"))
  toggle.addEventListener("click", () => setState(element.dataset.state === "collapsed" ? "chat" : "collapsed"))
  status.addEventListener("click", () => setState("issues"))
  chatTab.addEventListener("click", () => setState("chat"))
  form.addEventListener("submit", event => {
    event.preventDefault()
    const question = input.value.trim()
    if (!question) return
    if (!response.querySelector("p")) response.replaceChildren()
    const asked = document.createElement("p")
    asked.className = "flow-assistant-question"
    asked.textContent = question
    const reply = document.createElement("p")
    reply.textContent = answerHelp(question)
    response.append(asked, reply)
    input.value = ""
    setState("chat")
    chat.scrollTop = chat.scrollHeight
    input.focus()
  })
  window.addEventListener("klyro:flow-prompt", event => {
    const detail = (event as CustomEvent<{message: string; actionLabel: string; action: () => void}>).detail
    if (!detail) return
    response.replaceChildren()
    const prompt = document.createElement("p")
    prompt.textContent = detail.message
    const action = document.createElement("button")
    action.type = "button"
    action.textContent = detail.actionLabel
    action.addEventListener("click", () => { detail.action(); action.remove() }, { once: true })
    response.append(prompt, action)
    setState("chat")
  })
  element.addEventListener("keydown", event => {
    if (event.key === "Escape" && element.dataset.state !== "collapsed") setState("collapsed")
  })
  setState("collapsed")
  return {
    element,
    setValidation: counts => {
      if (!counts) {
        status.textContent = "QC · Start a cutter"
        status.dataset.severity = "idle"
        status.setAttribute("aria-label", "Start a cutter to view quality checks.")
        return
      }
      const attention = counts.critical + counts.warning
      const findings = attention + counts.advisory
      status.dataset.severity = counts.critical ? "critical" : findings ? "warning" : "clear"
      status.textContent = counts.critical ? `QC · ${counts.critical} critical`
        : attention ? `QC · ${attention} to review`
        : counts.advisory ? `QC · ${counts.advisory} advisory` : "QC · No issues"
      status.setAttribute("aria-label", `${counts.critical} critical, ${counts.warning} warnings, ${counts.advisory} advisories. Open quality checks.`)
    },
    openIssues: () => setState("issues"),
    collapse: () => setState("collapsed")
  }
}

