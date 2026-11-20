import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'
import { interfaceLocale } from '@/modules/i18n/services/translator'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const MONTH_MS = 30 * DAY_MS
const YEAR_MS = 365 * DAY_MS

export const formatFriendRequestElapsed = (
  createdAt: string,
  language: InterfaceLanguage,
  now: number,
): string => {
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return language === 'VI' ? 'Không rõ thời gian' : 'Unknown time'

  const elapsed = Math.max(0, now - createdTime)
  const formatter = new Intl.RelativeTimeFormat(interfaceLocale(language), { numeric: 'auto' })

  if (elapsed < MINUTE_MS) return language === 'VI' ? 'vừa xong' : 'just now'
  if (elapsed < HOUR_MS) return formatter.format(-Math.floor(elapsed / MINUTE_MS), 'minute')
  if (elapsed < DAY_MS) return formatter.format(-Math.floor(elapsed / HOUR_MS), 'hour')
  if (elapsed < MONTH_MS) return formatter.format(-Math.floor(elapsed / DAY_MS), 'day')
  if (elapsed < YEAR_MS) return formatter.format(-Math.floor(elapsed / MONTH_MS), 'month')
  return formatter.format(-Math.floor(elapsed / YEAR_MS), 'year')
}
