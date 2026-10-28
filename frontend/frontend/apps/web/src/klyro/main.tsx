import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { KlyroApp } from "./KlyroApp"
import "./styles/klyro.css"

const rootElement = document.getElementById("app")

if (!rootElement) {
  throw new Error("Klyro root element was not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <KlyroApp />
  </StrictMode>,
)
