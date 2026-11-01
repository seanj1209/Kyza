import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react"

export type KyzaTheme = "dark" | "light"

const KYZA_THEME_STORAGE_KEY = "kyza.theme"

interface KyzaThemeContextValue {
  theme: KyzaTheme
  setTheme: (theme: KyzaTheme) => void
  toggleTheme: () => void
}

const KyzaThemeContext = createContext<KyzaThemeContextValue | undefined>(undefined)

function readInitialTheme(): KyzaTheme {
  try {
    const storedTheme = window.localStorage.getItem(KYZA_THEME_STORAGE_KEY)
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return "dark"
}

export function KyzaThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<KyzaTheme>(readInitialTheme)

  useLayoutEffect(() => {
    const root = window.document.documentElement
    root.dataset.kyzaTheme = theme
    root.style.colorScheme = theme

    try {
      window.localStorage.setItem(KYZA_THEME_STORAGE_KEY, theme)
    } catch {
      // Theme remains active for this session if persistence is unavailable.
    }
  }, [theme])

  const contextValue = useMemo<KyzaThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
  }), [theme])

  return (
    <KyzaThemeContext.Provider value={contextValue}>
      {children}
    </KyzaThemeContext.Provider>
  )
}

export function useKyzaTheme() {
  const context = useContext(KyzaThemeContext)
  if (!context) {
    throw new Error("useKyzaTheme must be used within KyzaThemeProvider")
  }
  return context
}
