const ICON = "/Icons/UI Icons/Colour Circle_STATIC.png"

/** One visible wheel control for every Customise colour field. */
export function createColourWheelControl(label: string) {
  const picker = document.createElement("input")
  picker.type = "color"
  picker.className = "customisation-color-native"
  picker.setAttribute("aria-label", `${label} colour picker`)
  const button = document.createElement("button")
  button.type = "button"
  button.className = "customisation-color-button"
  button.setAttribute("aria-label", `${label} colours`)
  const icon = document.createElement("img")
  icon.src = ICON
  icon.alt = ""
  button.append(icon)
  button.addEventListener("click", () => picker.click())
  const sync = (value: string) => {
    picker.value = value
    if (/^#[0-9a-f]{6}$/i.test(value)) button.style.setProperty("--picker-colour", value)
  }
  return { button, picker, sync }
}
