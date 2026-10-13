import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeMode, type ThemeName } from './theme-context.ts'

const storageKey = 'ws-theme'

function readStored(): { theme?: ThemeName; mode?: ThemeMode } {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}')
  } catch {
    return {}
  }
}

function systemMode(): 'light' | 'dark' {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeName
  defaultMode?: ThemeMode
}

/** Applies data-theme / data-mode to <html> and remembers the user's choice. */
export function ThemeProvider({ children, defaultTheme = 'foundation-red', defaultMode = 'light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(() => readStored().theme ?? defaultTheme)
  const [mode, setModeState] = useState<ThemeMode>(() => readStored().mode ?? defaultMode)
  const [system, setSystem] = useState(systemMode)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedMode = mode === 'system' ? system : mode

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.mode = resolvedMode
    localStorage.setItem(storageKey, JSON.stringify({ theme, mode }))
  }, [theme, mode, resolvedMode])

  const setTheme = useCallback((value: ThemeName) => setThemeState(value), [])
  const setMode = useCallback((value: ThemeMode) => setModeState(value), [])

  const value = useMemo(
    () => ({ theme, mode, resolvedMode, setTheme, setMode }),
    [theme, mode, resolvedMode, setTheme, setMode],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
