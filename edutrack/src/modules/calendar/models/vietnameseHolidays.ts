import type { CalendarPreferences, VietnameseHolidayItem } from './calendar.types'

export const VIETNAM_HOLIDAY_CALENDAR_COLOR = '#16a34a'

export const VIETNAM_HOLIDAY_BADGE_CLASSES =
  'border-green-300/90 bg-green-50 text-green-800 dark:border-green-700/60 dark:bg-green-950/50 dark:text-green-200'

export const VIETNAM_HOLIDAY_DOT_CLASS = 'bg-green-600'

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  showLunarCalendar: false,
  showVietnameseHolidays: true,
  showPublicHolidays: true,
  showObservanceHolidays: true,
}

export const filterHolidaysByPreferences = (
  holidays: readonly VietnameseHolidayItem[],
  preferences: CalendarPreferences,
): VietnameseHolidayItem[] => {
  if (!preferences.showVietnameseHolidays) return []

  return holidays.filter((item) => {
    if (item.category === 'public_holiday') return preferences.showPublicHolidays
    return preferences.showObservanceHolidays
  })
}

export const groupHolidaysByDate = (
  holidaysByDate: Readonly<Record<string, VietnameseHolidayItem[]>>,
  preferences: CalendarPreferences,
): Readonly<Record<string, VietnameseHolidayItem[]>> => {
  if (!preferences.showVietnameseHolidays) return {}

  const result: Record<string, VietnameseHolidayItem[]> = {}
  for (const [dateKey, items] of Object.entries(holidaysByDate)) {
    const visible = filterHolidaysByPreferences(items, preferences)
    if (visible.length > 0) {
      result[dateKey] = visible
    }
  }
  return result
}

export const formatHolidayTooltip = (holiday: VietnameseHolidayItem): string => {
  const categoryLabel = holiday.category === 'public_holiday' ? 'Ngày nghỉ lễ' : 'Ngày lễ / Kỷ niệm'
  return holiday.lunarDateLabel
    ? `${categoryLabel}: ${holiday.name} (${holiday.lunarDateLabel})`
    : `${categoryLabel}: ${holiday.name}`
}
