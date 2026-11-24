import { describe, expect, it } from 'vitest'
import {
  clipRangeToSupportedLunarYears,
  enumerateDateKeys,
  formatLunarDateLabel,
  getLunarDateTooltip,
  getVisibleLunarDateRange,
  groupMissingDateRanges,
  isFirstOrLastDayOfSolarMonth,
  isRangeInsideSupportedLunarYears,
  toLocalDateKey,
} from './lunarCalendar'

describe('lunar calendar view helpers', () => {
  it('formats local date keys without converting through UTC', () => {
    expect(toLocalDateKey(new Date(2026, 1, 17, 0, 30))).toBe('2026-02-17')
  })

  it('builds the complete month grid range from Sunday through Saturday', () => {
    expect(getVisibleLunarDateRange('month', new Date(2026, 1, 15))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
    expect(getVisibleLunarDateRange('month', new Date(2026, 10, 15))).toEqual({
      from: '2026-11-01',
      to: '2026-12-05',
    })
  })

  it('supports day, cross-month week and leap-year ranges', () => {
    expect(getVisibleLunarDateRange('day', new Date(2026, 10, 24))).toEqual({
      from: '2026-11-24',
      to: '2026-11-24',
    })
    expect(getVisibleLunarDateRange('week', new Date(2026, 10, 1))).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    })
    expect(getVisibleLunarDateRange('year', new Date(2028, 5, 1))).toEqual({
      from: '2028-01-01',
      to: '2028-12-31',
    })
    expect(enumerateDateKeys({ from: '2028-01-01', to: '2028-12-31' })).toHaveLength(366)
    expect(getVisibleLunarDateRange('list', new Date())).toBeNull()
  })

  it('requests only missing contiguous cache segments', () => {
    expect(groupMissingDateRanges(
      { from: '2026-02-15', to: '2026-02-21' },
      new Set(['2026-02-15', '2026-02-18', '2026-02-21']),
    )).toEqual([
      { from: '2026-02-16', to: '2026-02-17' },
      { from: '2026-02-19', to: '2026-02-20' },
    ])
  })

  it('shows the lunar month only on its first day and marks leap months in tooltip', () => {
    const firstDay = {
      solarDate: '2025-08-23',
      lunarDay: 1,
      lunarMonth: 7,
      lunarYear: 2025,
      isLeapMonth: true,
    }
    expect(formatLunarDateLabel(firstDay)).toBe('1/7')
    expect(getLunarDateTooltip(firstDay)).toContain('7 nhuận')
    expect(formatLunarDateLabel({ ...firstDay, lunarDay: 2 })).toBe('2')
  })

  it('appends the lunar month for boundary days when requested', () => {
    const regularDay = {
      solarDate: '2026-11-24',
      lunarDay: 16,
      lunarMonth: 10,
      lunarYear: 2026,
      isLeapMonth: false,
    }
    expect(formatLunarDateLabel(regularDay)).toBe('16')
    expect(formatLunarDateLabel(regularDay, true)).toBe('16/10')
    expect(formatLunarDateLabel({ ...regularDay, lunarDay: 1 }, true)).toBe('1/10')
  })

  it('detects the first and last day of each solar month including leap February', () => {
    expect(isFirstOrLastDayOfSolarMonth(new Date(2026, 10, 1))).toBe(true)
    expect(isFirstOrLastDayOfSolarMonth(new Date(2026, 10, 30))).toBe(true)
    expect(isFirstOrLastDayOfSolarMonth(new Date(2026, 10, 24))).toBe(false)
    expect(isFirstOrLastDayOfSolarMonth(new Date(2028, 1, 29))).toBe(true)
    expect(isFirstOrLastDayOfSolarMonth(new Date(2027, 1, 28))).toBe(true)
    expect(isFirstOrLastDayOfSolarMonth(new Date(2027, 1, 27))).toBe(false)
  })

  it('clips visible ranges to the supported lunar years', () => {
    expect(clipRangeToSupportedLunarYears({ from: '2026-11-01', to: '2026-12-05' })).toEqual({
      from: '2026-11-01',
      to: '2026-12-05',
    })
    expect(clipRangeToSupportedLunarYears({ from: '2199-12-27', to: '2200-01-02' })).toEqual({
      from: '2199-12-27',
      to: '2199-12-31',
    })
    expect(clipRangeToSupportedLunarYears({ from: '1899-12-28', to: '1900-01-03' })).toEqual({
      from: '1900-01-01',
      to: '1900-01-03',
    })
    expect(clipRangeToSupportedLunarYears({ from: '2300-01-01', to: '2300-12-31' })).toBeNull()
    expect(clipRangeToSupportedLunarYears({ from: '1800-01-01', to: '1800-12-31' })).toBeNull()
  })

  it('reports whether the whole visible range is supported', () => {
    expect(isRangeInsideSupportedLunarYears({ from: '1950-01-01', to: '1950-12-31' })).toBe(true)
    expect(isRangeInsideSupportedLunarYears({ from: '2116-01-01', to: '2116-12-31' })).toBe(true)
    expect(isRangeInsideSupportedLunarYears({ from: '2199-12-27', to: '2200-01-02' })).toBe(false)
    expect(isRangeInsideSupportedLunarYears({ from: '1899-12-28', to: '1900-01-03' })).toBe(false)
  })

  it('includes alternate historical region lunar date in tooltip when present', () => {
    const tooltip = getLunarDateTooltip({
      solarDate: '1968-01-29',
      lunarDay: 1,
      lunarMonth: 1,
      lunarYear: 1968,
      isLeapMonth: false,
      alternateLunar: {
        label: 'Miền Nam',
        lunarDay: 30,
        lunarMonth: 12,
        lunarYear: 1967,
        isLeapMonth: false,
      },
    })
    expect(tooltip).toBe('Âm lịch: 1/1/1968 (Miền Nam: 30/12/1967)')
  })
})
