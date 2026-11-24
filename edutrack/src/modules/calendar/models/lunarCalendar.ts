import type { VietnameseLunarDate } from './calendar.types'

export type LunarCalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'list'

export interface DateOnlyRange {
  from: string
  to: string
}

const DAY_IN_MILLISECONDS = 86_400_000

// Phải khớp với LUNAR_SUPPORTED_MIN_YEAR / LUNAR_SUPPORTED_MAX_YEAR của backend.
export const LUNAR_SUPPORTED_MIN_YEAR = 1900
export const LUNAR_SUPPORTED_MAX_YEAR = 2199
export const LUNAR_OUT_OF_RANGE_MESSAGE =
  'Thời gian lịch quá xa so với hiện tại nên chưa thể hiển thị lịch Âm.'
export const LUNAR_OUT_OF_RANGE_CODE = 'LUNAR_DATE_OUT_OF_RANGE'
export const LUNAR_RATE_LIMITED_MESSAGE =
  'Bạn đang chuyển lịch quá nhanh nên lịch Âm chưa kịp tải. Hãy chuyển lại sau vài giây.'

const yearOfDateKey = (dateKey: string): number => Number(dateKey.split('-')[0])

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateFromLocalKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12)
}

export const getVisibleLunarDateRange = (
  viewMode: LunarCalendarViewMode,
  currentDate: Date,
): DateOnlyRange | null => {
  if (viewMode === 'list') return null

  if (viewMode === 'day') {
    const dateKey = toLocalDateKey(currentDate)
    return { from: dateKey, to: dateKey }
  }

  if (viewMode === 'week') {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { from: toLocalDateKey(start), to: toLocalDateKey(end) }
  }

  if (viewMode === 'year') {
    const year = currentDate.getFullYear()
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const start = new Date(firstDay)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(lastDay)
  end.setDate(end.getDate() + (6 - end.getDay()))
  return { from: toLocalDateKey(start), to: toLocalDateKey(end) }
}

export const enumerateDateKeys = ({ from, to }: DateOnlyRange): string[] => {
  const current = dateFromLocalKey(from)
  const end = dateFromLocalKey(to)
  const keys: string[] = []

  while (current.getTime() <= end.getTime()) {
    keys.push(toLocalDateKey(current))
    current.setDate(current.getDate() + 1)
  }

  return keys
}

export const groupMissingDateRanges = (
  range: DateOnlyRange,
  cachedDateKeys: ReadonlySet<string>,
): DateOnlyRange[] => {
  const ranges: DateOnlyRange[] = []
  let rangeStart: string | null = null
  let previousKey: string | null = null

  for (const dateKey of enumerateDateKeys(range)) {
    if (cachedDateKeys.has(dateKey)) {
      if (rangeStart && previousKey) ranges.push({ from: rangeStart, to: previousKey })
      rangeStart = null
    } else if (!rangeStart) {
      rangeStart = dateKey
    }
    previousKey = dateKey
  }

  if (rangeStart && previousKey) ranges.push({ from: rangeStart, to: previousKey })
  return ranges
}

export const isRangeInsideSupportedLunarYears = ({ from, to }: DateOnlyRange): boolean =>
  yearOfDateKey(from) >= LUNAR_SUPPORTED_MIN_YEAR && yearOfDateKey(to) <= LUNAR_SUPPORTED_MAX_YEAR

export const clipRangeToSupportedLunarYears = (range: DateOnlyRange): DateOnlyRange | null => {
  if (yearOfDateKey(range.to) < LUNAR_SUPPORTED_MIN_YEAR) return null
  if (yearOfDateKey(range.from) > LUNAR_SUPPORTED_MAX_YEAR) return null

  return {
    from: yearOfDateKey(range.from) < LUNAR_SUPPORTED_MIN_YEAR
      ? `${LUNAR_SUPPORTED_MIN_YEAR}-01-01`
      : range.from,
    to: yearOfDateKey(range.to) > LUNAR_SUPPORTED_MAX_YEAR
      ? `${LUNAR_SUPPORTED_MAX_YEAR}-12-31`
      : range.to,
  }
}

export const isFirstOrLastDayOfSolarMonth = (date: Date): boolean => {
  const day = date.getDate()
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return day === 1 || day === lastDay
}

// Ngày mùng 1 Âm luôn kèm tháng; các ngày khác chỉ kèm tháng khi `showMonth` bật.
export const formatLunarDateLabel = (lunarDate: VietnameseLunarDate, showMonth = false): string =>
  showMonth || lunarDate.lunarDay === 1
    ? `${lunarDate.lunarDay}/${lunarDate.lunarMonth}`
    : lunarDate.lunarDay.toString()

export const getLunarDateTooltip = (lunarDate: VietnameseLunarDate): string => {
  const leapLabel = lunarDate.isLeapMonth ? ' nhuận' : ''
  const primary = `Âm lịch: ${lunarDate.lunarDay}/${lunarDate.lunarMonth}${leapLabel}/${lunarDate.lunarYear}`
  if (!lunarDate.alternateLunar) return primary

  const alt = lunarDate.alternateLunar
  const altLeap = alt.isLeapMonth ? ' nhuận' : ''
  return `${primary} (${alt.label}: ${alt.lunarDay}/${alt.lunarMonth}${altLeap}/${alt.lunarYear})`
}

export const dateKeysAreConsecutive = (first: string, second: string): boolean =>
  dateFromLocalKey(second).getTime() - dateFromLocalKey(first).getTime() === DAY_IN_MILLISECONDS
