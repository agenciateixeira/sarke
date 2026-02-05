'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Inicializar com o tema do localStorage se disponível
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sarke-theme') as Theme | null
      if (savedTheme) return savedTheme

      // Caso contrário, usar preferência do sistema
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    // Remover classes antigas
    root.classList.remove('light', 'dark')

    // Adicionar nova classe
    root.classList.add(theme)

    // Salvar no localStorage
    localStorage.setItem('sarke-theme', theme)

    // Atualizar meta theme-color para melhor experiência mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1a1d23' : '#ffffff'
      )
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = theme === 'dark' ? '#1a1d23' : '#ffffff'
      document.head.appendChild(meta)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const value = {
    theme,
    toggleTheme,
    setTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
