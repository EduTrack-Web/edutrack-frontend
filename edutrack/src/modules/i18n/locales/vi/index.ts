import { calendarVi } from '@/modules/i18n/locales/vi/calendar'
import { chatVi } from '@/modules/i18n/locales/vi/chat'
import { commonVi } from '@/modules/i18n/locales/vi/common'

export const viTranslations = {
  ...commonVi,
  ...chatVi,
  ...calendarVi,
} as const
