import { createContext } from 'react'

import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'

export interface LanguageContextValue {
  language: InterfaceLanguage
  setLanguage: (language: InterfaceLanguage) => void
  toggleLanguage: () => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
