import type { CalendarPreferences, VietnameseHolidayItem } from './calendar.types'
import { getVisibleLunarDateRange, type DateOnlyRange, type LunarCalendarViewMode } from './lunarCalendar'

export const VIETNAM_HOLIDAY_CALENDAR_COLOR = '#16a34a'

export const VIETNAM_HOLIDAY_BADGE_CLASSES =
  'border-green-300/90 bg-green-50 text-green-800 dark:border-green-700/60 dark:bg-green-950/50 dark:text-green-200'

export const VIETNAM_HOLIDAY_DOT_CLASS = 'bg-green-600'

export const HOLIDAY_LOAD_ERROR_MESSAGE = 'Không thể tải dữ liệu ngày lễ'
export const HOLIDAY_OUT_OF_RANGE_MESSAGE = 'Chưa có dữ liệu ngày lễ cho giai đoạn này'

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

export const formatHolidaySolarDate = (solarDate: string): string => {
  const [yearStr, monthStr, dayStr] = solarDate.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return solarDate
  }
  const date = new Date(year, month - 1, day)
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' })
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalizedWeekday}, ${day} tháng ${month}, ${year}`
}

export const formatHolidayLunarSubtitle = (holiday: VietnameseHolidayItem): string | null => {
  if (holiday.lunarDate) {
    const leapText = holiday.lunarDate.isLeapMonth ? ' nhuận' : ''
    return `Nhằm ngày ${holiday.lunarDate.day} tháng ${holiday.lunarDate.month}${leapText} Âm lịch, năm ${holiday.lunarDate.yearCanChi}`
  }
  if (holiday.lunarDateLabel?.trim()) {
    return `Nhằm ngày ${holiday.lunarDateLabel.trim()}`
  }
  return null
}

export interface HolidayNoteLabels {
  typePublic?: string
  typeCompensatory?: string
  typeObservance?: string
}

export const getHolidayNote = (
  holiday: VietnameseHolidayItem,
  labels: HolidayNoteLabels = {},
): string => {
  if (holiday.notes?.trim()) return holiday.notes.trim()
  if (holiday.calendarType === 'compensatory') {
    return labels.typeCompensatory ?? 'Ngày nghỉ bù / hoán đổi'
  }
  if (holiday.isDayOff) {
    return labels.typePublic ?? 'Ngày nghỉ lễ'
  }
  return labels.typeObservance ?? 'Ngày lễ / Kỷ niệm'
}

export const getVisibleHolidayDateRange = (
  viewMode: LunarCalendarViewMode,
  currentDate: Date,
): DateOnlyRange => {
  if (viewMode === 'list') {
    const year = currentDate.getFullYear()
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }
  return getVisibleLunarDateRange(viewMode, currentDate) ?? {
    from: `${currentDate.getFullYear()}-01-01`,
    to: `${currentDate.getFullYear()}-12-31`,
  }
}
