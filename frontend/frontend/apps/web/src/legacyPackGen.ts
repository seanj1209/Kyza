import "./brandBootstrap"

// Preserve saved draft URLs and query parameters while consolidating entry in Cutter.
const destination = new URL("/cutter", window.location.origin)
destination.search = window.location.search
destination.searchParams.set("choose", "1")
destination.searchParams.set("studio", "start")
destination.hash = window.location.hash
window.location.replace(destination.href)
