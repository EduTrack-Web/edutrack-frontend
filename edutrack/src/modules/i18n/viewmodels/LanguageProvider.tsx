import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'
import {
  readInterfaceLanguage,
  saveInterfaceLanguage,
} from '@/modules/i18n/services/languageStorage'
import { LanguageContext } from '@/modules/i18n/viewmodels/languageContext'

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<InterfaceLanguage>(readInterfaceLanguage)

  useEffect(() => {
    saveInterfaceLanguage(language)
    document.documentElement.lang = language === 'EN' ? 'en' : 'vi'
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage((current) => current === 'VI' ? 'EN' : 'VI'),
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
