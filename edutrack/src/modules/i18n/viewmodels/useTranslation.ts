import { useCallback } from 'react'

import type { TranslationParameters } from '@/modules/i18n/models/i18n.types'
import { translate, type TranslationKey } from '@/modules/i18n/services/translator'
import { useLanguage } from '@/modules/i18n/viewmodels/useLanguage'

export const useTranslation = () => {
  const { language } = useLanguage()
  const t = useCallback(
    (key: TranslationKey, parameters?: TranslationParameters) =>
      translate(language, key, parameters),
    [language],
  )
  return { language, t }
}
