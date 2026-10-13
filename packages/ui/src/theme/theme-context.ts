import { createContext, useContext } from 'react'

export const themeNames = ['foundation-red', 'neutral'] as const
export type ThemeName = (typeof themeNames)[number]
export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeName
  mode: ThemeMode
  /** The mode actually applied after resolving `system`. */
  resolvedMode: 'light' | 'dark'
  setTheme: (theme: ThemeName) => void
  setMode: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
