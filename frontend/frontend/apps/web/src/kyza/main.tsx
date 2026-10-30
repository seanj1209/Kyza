import "../brandBootstrap"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { KyzaApp } from "./KyzaApp"
import "./styles/kyza.css"

const rootElement = document.getElementById("app")

if (!rootElement) {
  throw new Error("Kyza root element was not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <KyzaApp />
  </StrictMode>,
)
