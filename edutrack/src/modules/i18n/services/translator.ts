import { enTranslations } from '@/modules/i18n/locales/en'
import { viTranslations } from '@/modules/i18n/locales/vi'
import type {
  InterfaceLanguage,
  TranslationParameters,
} from '@/modules/i18n/models/i18n.types'

export type TranslationKey = keyof typeof viTranslations

const dictionaries: Record<InterfaceLanguage, Record<TranslationKey, string>> = {
  VI: viTranslations,
  EN: enTranslations,
}

export const interfaceLocale = (language: InterfaceLanguage): 'vi-VN' | 'en-US' =>
  language === 'EN' ? 'en-US' : 'vi-VN'

export const translate = (
  language: InterfaceLanguage,
  key: TranslationKey,
  parameters: TranslationParameters = {},
): string => {
  const template = dictionaries[language][key]
  return template.replace(/\{([a-zA-Z0-9_]+)\}/gu, (placeholder, parameterName: string) => {
    const value = parameters[parameterName]
    return value === undefined ? placeholder : String(value)
  })
}
