import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'
import { interfaceLocale, translate } from '@/modules/i18n/services/translator'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const RELATIVE_STATUS_MAX_MS = 7 * DAY_MS

export const formatChatPresence = (
  isOnline: boolean,
  lastActiveAt: string | undefined,
  language: InterfaceLanguage,
  now: number,
): string => {
  if (isOnline) return translate(language, 'chat.presence.online')
  if (!lastActiveAt) return translate(language, 'chat.presence.offline')

  const lastActiveTime = new Date(lastActiveAt).getTime()
  if (Number.isNaN(lastActiveTime)) return translate(language, 'chat.presence.offline')
  const elapsed = Math.max(0, now - lastActiveTime)

  if (elapsed < MINUTE_MS) return translate(language, 'chat.presence.justNow')
  if (elapsed < HOUR_MS) {
    const minutes = Math.floor(elapsed / MINUTE_MS)
    return translate(language, `chat.presence.minutesAgo.${minutes === 1 ? 'one' : 'many'}`, { count: minutes })
  }
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS)
    return translate(language, `chat.presence.hoursAgo.${hours === 1 ? 'one' : 'many'}`, { count: hours })
  }
  if (elapsed <= RELATIVE_STATUS_MAX_MS) {
    const days = Math.floor(elapsed / DAY_MS)
    return translate(language, `chat.presence.daysAgo.${days === 1 ? 'one' : 'many'}`, { count: days })
  }

  const date = new Date(lastActiveTime).toLocaleDateString(interfaceLocale(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return translate(language, 'chat.presence.onDate', { date })
}
