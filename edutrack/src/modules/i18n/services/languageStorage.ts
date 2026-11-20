import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'

const LANGUAGE_STORAGE_KEY = 'edutrack-language'

export const readInterfaceLanguage = (): InterfaceLanguage =>
  typeof window !== 'undefined' && window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'EN'
    ? 'EN'
    : 'VI'

export const saveInterfaceLanguage = (language: InterfaceLanguage): void => {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}
