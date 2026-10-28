import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { defineConfig, type Plugin } from "vite"

const cleanRouteEntries: Record<string, string> = {
  "/cutter": "/cutter.html",
  "/ai-studio": "/ai-studio.html",
  "/artwork": "/artwork.html",
  "/validation": "/validation.html",
  "/account": "/account.html",
}

function cleanRouteEntryPlugin(): Plugin {
  const installRewrites = (middlewares: { use: (handler: (request: { url?: string }, response: unknown, next: () => void) => void) => void }) => {
    middlewares.use((request, _response, next) => {
      const [pathname, query] = (request.url ?? "").split("?", 2)
      const entry = cleanRouteEntries[pathname]

      if (entry) {
        request.url = query ? `${entry}?${query}` : entry
      }

      next()
    })
  }

  return {
    name: "klyro-clean-route-entries",
    configureServer(server) {
      installRewrites(server.middlewares)
    },
    configurePreviewServer(server) {
      installRewrites(server.middlewares)
    },
  }
}

export default defineConfig({
  base: "./",
  plugins: [cleanRouteEntryPlugin(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        cutter: resolve(__dirname, "cutter.html"),
        aiStudio: resolve(__dirname, "ai-studio.html"),
        artwork: resolve(__dirname, "artwork.html"),
        validation: resolve(__dirname, "validation.html"),
        account: resolve(__dirname, "account.html"),
      },
    },
  },
})
