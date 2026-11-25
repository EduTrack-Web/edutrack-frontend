import { describe, expect, it } from 'vitest'
import type { CalendarPreferences, VietnameseHolidayItem } from './calendar.types'
import {
  DEFAULT_CALENDAR_PREFERENCES,
  filterHolidaysByPreferences,
  formatHolidayTooltip,
  groupHolidaysByDate,
} from './vietnameseHolidays'

const sampleHolidays: VietnameseHolidayItem[] = [
  {
    id: '2026-04-26:hung_kings',
    solarDate: '2026-04-26',
    name: 'Giỗ Tổ Hùng Vương',
    category: 'public_holiday',
    calendarType: 'lunar',
    isDayOff: true,
    lunarDateLabel: '10/3 Âm lịch',
  },
  {
    id: '2026-11-20:teachers_day',
    solarDate: '2026-11-20',
    name: 'Ngày Nhà giáo Việt Nam',
    category: 'observance',
    calendarType: 'solar',
    isDayOff: false,
  },
]

describe('vietnamese holidays view helpers', () => {
  it('filters holidays according to master and category toggles', () => {
    expect(filterHolidaysByPreferences(sampleHolidays, DEFAULT_CALENDAR_PREFERENCES)).toHaveLength(2)

    const disabledAll: CalendarPreferences = {
      ...DEFAULT_CALENDAR_PREFERENCES,
      showVietnameseHolidays: false,
    }
    expect(filterHolidaysByPreferences(sampleHolidays, disabledAll)).toEqual([])

    const onlyPublic: CalendarPreferences = {
      ...DEFAULT_CALENDAR_PREFERENCES,
      showObservanceHolidays: false,
    }
    expect(filterHolidaysByPreferences(sampleHolidays, onlyPublic).map((h) => h.id)).toEqual([
      '2026-04-26:hung_kings',
    ])

    const onlyObservances: CalendarPreferences = {
      ...DEFAULT_CALENDAR_PREFERENCES,
      showPublicHolidays: false,
    }
    expect(filterHolidaysByPreferences(sampleHolidays, onlyObservances).map((h) => h.id)).toEqual([
      '2026-11-20:teachers_day',
    ])
  })

  it('groups visible holidays by solar date and builds descriptive tooltips', () => {
    const grouped = groupHolidaysByDate(
      {
        '2026-04-26': [sampleHolidays[0]!],
        '2026-11-20': [sampleHolidays[1]!],
      },
      { ...DEFAULT_CALENDAR_PREFERENCES, showObservanceHolidays: false },
    )

    expect(Object.keys(grouped)).toEqual(['2026-04-26'])
    expect(formatHolidayTooltip(sampleHolidays[0]!)).toBe('Ngày nghỉ lễ: Giỗ Tổ Hùng Vương (10/3 Âm lịch)')
    expect(formatHolidayTooltip(sampleHolidays[1]!)).toBe('Ngày lễ / Kỷ niệm: Ngày Nhà giáo Việt Nam')
  })
})
