import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react"

export type KlyroTheme = "dark" | "light"

const KLYRO_THEME_STORAGE_KEY = "klyro.theme"

interface KlyroThemeContextValue {
  theme: KlyroTheme
  setTheme: (theme: KlyroTheme) => void
  toggleTheme: () => void
}

const KlyroThemeContext = createContext<KlyroThemeContextValue | undefined>(undefined)

function readInitialTheme(): KlyroTheme {
  try {
    const storedTheme = window.localStorage.getItem(KLYRO_THEME_STORAGE_KEY)
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return "dark"
}

export function KlyroThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<KlyroTheme>(readInitialTheme)

  useLayoutEffect(() => {
    const root = window.document.documentElement
    root.dataset.klyroTheme = theme
    root.style.colorScheme = theme

    try {
      window.localStorage.setItem(KLYRO_THEME_STORAGE_KEY, theme)
    } catch {
      // Theme remains active for this session if persistence is unavailable.
    }
  }, [theme])

  const contextValue = useMemo<KlyroThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
  }), [theme])

  return (
    <KlyroThemeContext.Provider value={contextValue}>
      {children}
    </KlyroThemeContext.Provider>
  )
}

export function useKlyroTheme() {
  const context = useContext(KlyroThemeContext)
  if (!context) {
    throw new Error("useKlyroTheme must be used within KlyroThemeProvider")
  }
  return context
}
