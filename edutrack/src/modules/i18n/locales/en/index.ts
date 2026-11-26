import { calendarEn } from '@/modules/i18n/locales/en/calendar'
import { chatEn } from '@/modules/i18n/locales/en/chat'
import { commonEn } from '@/modules/i18n/locales/en/common'
import type { viTranslations } from '@/modules/i18n/locales/vi'

export const enTranslations = {
  ...commonEn,
  ...chatEn,
  ...calendarEn,
} as const satisfies Record<keyof typeof viTranslations, string>
