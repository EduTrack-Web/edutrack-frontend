import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'
import { interfaceLocale } from '@/modules/i18n/services/translator'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const isYesterday = (date: Date, now: Date): boolean => {
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  return date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate()
}

export const formatConversationListTime = (
  value: string,
  language: InterfaceLanguage,
  nowValue = Date.now(),
): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const elapsed = Math.max(0, nowValue - date.getTime())
  if (elapsed < MINUTE_MS) return language === 'VI' ? 'Vừa xong' : 'Now'
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} ${language === 'VI' ? 'phút' : 'min'}`
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} ${language === 'VI' ? 'giờ' : 'hr'}`

  const now = new Date(nowValue)
  if (isYesterday(date, now)) return language === 'VI' ? 'Hôm qua' : 'Yesterday'

  return new Intl.DateTimeFormat(interfaceLocale(language), {
    day: '2-digit',
    month: '2-digit',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: '2-digit' as const }),
  }).format(date).replace(/[.-]/gu, '/')
}
