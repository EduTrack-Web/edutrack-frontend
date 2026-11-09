import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { ThemeContext, type Theme } from './themeContext'

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem('edutrack-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('edutrack-theme', theme)
  }, [theme])
  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light') }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
