/**
 * hooks/useTheme.jsx
 * ───────────────────
 * Light / dark mode. Light is default.
 * Exports useColors() for inline-styled components.
 */
import { useState, useEffect, createContext, useContext } from 'react'

const ThemeContext = createContext(null)

export const LIGHT = {
  bgCanvas:'#F7F7F7', bgPrimary:'#FFFFFF', bgSecondary:'#F8F8F8', bgTertiary:'#F4F4F4',
  textPrimary:'#111111', textSecondary:'#555555', textMuted:'#888888', textFaint:'#AAAAAA', textInverse:'#FFFFFF',
  borderSubtle:'#EBEBEB', borderDefault:'#E0E0E0', borderStrong:'#CCCCCC',
  criticalPure:'#DC2626', criticalText:'#B91C1C', criticalBg:'#FEF2F2', criticalBorder:'#FECACA',
  warningPure:'#D97706',  warningText:'#92400E',  warningBg:'#FFFBEB',  warningBorder:'#FCD34D',
  stablePure:'#16A34A',   stableText:'#15803D',   stableBg:'#F0FDF4',   stableBorder:'#BBF7D0',
  aiBg:'#EFF6FF', aiBorder:'#BFDBFE', aiText:'#1D4ED8', aiVivid:'#2563EB',
  navBg:'rgba(255,255,255,0.97)', navBorder:'#EBEBEB',
  shadowSm:'0 1px 3px rgba(0,0,0,0.07)', shadowMd:'0 4px 12px rgba(0,0,0,0.08)',
  chartLine:'#2563EB', chartGrid:'#F4F4F4',
}

export const DARK = {
  bgCanvas:'#0D1117', bgPrimary:'#161B22', bgSecondary:'#1C2128', bgTertiary:'#21262D',
  textPrimary:'#E6EDF3', textSecondary:'#8B949E', textMuted:'#6E7681', textFaint:'#484F58', textInverse:'#0D1117',
  borderSubtle:'#21262D', borderDefault:'#30363D', borderStrong:'#484F58',
  criticalPure:'#FF4444', criticalText:'#FF6B6B', criticalBg:'#1A0808', criticalBorder:'#3D1515',
  warningPure:'#FF9F0A',  warningText:'#FFB340',  warningBg:'#1A0D00',  warningBorder:'#3A2500',
  stablePure:'#2EA043',   stableText:'#3FB950',   stableBg:'#071510',   stableBorder:'#0C3018',
  aiBg:'#0A1628', aiBorder:'#163456', aiText:'#58A6FF', aiVivid:'#3B82F6',
  navBg:'rgba(13,17,23,0.97)', navBorder:'#21262D',
  shadowSm:'0 1px 3px rgba(0,0,0,0.4)', shadowMd:'0 4px 12px rgba(0,0,0,0.5)',
  chartLine:'#388BFD', chartGrid:'#1C2128',
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('vw-theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vw-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  const colors = theme === 'dark' ? DARK : LIGHT

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark', colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function useColors() {
  return useTheme().colors
}
