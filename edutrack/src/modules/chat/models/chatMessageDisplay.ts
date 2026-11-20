import type { InterfaceLanguage } from '@/modules/i18n/models/i18n.types'
import { interfaceLocale, translate } from '@/modules/i18n/services/translator'

interface DisplayMessage {
  sender: { id: string }
  createdAt: string
}

const dateParts = (value: string): { year: number; month: number; day: number } | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() }
}

export const isSameMessageDate = (first: string, second: string): boolean => {
  const firstParts = dateParts(first)
  const secondParts = dateParts(second)
  return Boolean(
    firstParts
    && secondParts
    && firstParts.year === secondParts.year
    && firstParts.month === secondParts.month
    && firstParts.day === secondParts.day,
  )
}

export const startsMessageDate = (
  messages: readonly DisplayMessage[],
  index: number,
): boolean => index === 0 || !isSameMessageDate(messages[index - 1]!.createdAt, messages[index]!.createdAt)

export const startsMessageRun = (
  messages: readonly DisplayMessage[],
  index: number,
): boolean => index === 0
  || messages[index - 1]!.sender.id !== messages[index]!.sender.id
  || !isSameMessageDate(messages[index - 1]!.createdAt, messages[index]!.createdAt)

export const endsMessageRun = (
  messages: readonly DisplayMessage[],
  index: number,
): boolean => index === messages.length - 1
  || messages[index + 1]!.sender.id !== messages[index]!.sender.id
  || !isSameMessageDate(messages[index + 1]!.createdAt, messages[index]!.createdAt)

export const formatMessageDate = (value: string, language: InterfaceLanguage): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const locale = interfaceLocale(language)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  return translate(language, 'chat.message.dateHeading', {
    weekday,
    day: date.getDate(),
    month: date.getMonth() + 1,
    monthName,
    year: date.getFullYear(),
  })
}

export const formatMessageTime = (value: string, language: InterfaceLanguage = 'VI'): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(interfaceLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
