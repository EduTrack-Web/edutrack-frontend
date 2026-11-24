import type { VietnameseLunarDate } from '../../models/calendar.types'
import { formatLunarDateLabel, getLunarDateTooltip } from '../../models/lunarCalendar'

interface CalendarDateLabelProps {
  solarDay: number
  lunarDate?: VietnameseLunarDate
  showLunarCalendar: boolean
  /** Hiển thị thêm "/tháng Âm" sau ngày Âm (ngày đầu tuần, đầu/cuối tháng Dương, chế độ Ngày). */
  showLunarMonth?: boolean
  isToday?: boolean
  isMuted?: boolean
  hasEvents?: boolean
  variant?: 'day' | 'week' | 'month' | 'year'
}

export function CalendarDateLabel({
  solarDay,
  lunarDate,
  showLunarCalendar,
  showLunarMonth = false,
  isToday = false,
  isMuted = false,
  hasEvents = false,
  variant = 'month',
}: CalendarDateLabelProps) {
  const isDay = variant === 'day'
  const isWeek = variant === 'week'
  const isYear = variant === 'year'
  const isMonth = variant === 'month'
  const isAlwaysStacked = isDay || isYear

  const solarSize = isWeek
    ? 'size-6 text-xs sm:size-8 sm:text-lg lg:size-9 lg:text-xl'
    : isDay
      ? 'size-9 text-base'
      : isYear
        ? 'size-5 text-[10px]'
        : 'size-5 text-[11px] sm:size-6 sm:text-xs'

  const lunarSize = isYear
    ? 'text-[8px] leading-none'
    : isDay
      ? 'text-xs leading-tight'
      : 'text-[9px] leading-tight sm:text-[11px]'

  const solarStyle = isToday
    ? 'bg-blue-600 font-bold text-white shadow-xs'
    : isDay
      ? 'border border-slate-300 bg-transparent text-slate-800 dark:border-white/25 dark:text-slate-100'
      : isYear && hasEvents
        ? 'bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        : isMuted
          ? 'text-slate-400 dark:text-slate-600'
          : 'text-slate-800 dark:text-slate-200'

  const formattedLunar = lunarDate ? formatLunarDateLabel(lunarDate, showLunarMonth) : ''
  const displayLunar = isMonth && formattedLunar ? `(${formattedLunar})` : formattedLunar

  // Ở mobile (< sm), Tháng & Tuần xếp dọc để không tràn ô; từ sm trở lên xếp ngang gọn.
  const layoutClass = isAlwaysStacked
    ? 'flex-col gap-0.5'
    : 'flex-col gap-0 sm:flex-row sm:gap-1'

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center ${layoutClass}`}>
      <span
        className={`grid shrink-0 place-items-center rounded-full font-semibold ${solarSize} ${solarStyle}`}
      >
        {solarDay}
      </span>
      {showLunarCalendar && lunarDate && (
        <span
          aria-label={getLunarDateTooltip(lunarDate)}
          className={`${lunarSize} max-w-full truncate font-semibold ${
            isMuted ? 'text-[#548383]/60 dark:text-[#C1E8FF]/50' : 'text-[#548383] dark:text-[#C1E8FF]'
          }`}
          title={getLunarDateTooltip(lunarDate)}
        >
          {displayLunar}
          {lunarDate.isLeapMonth && <span className="sr-only"> (tháng nhuận)</span>}
        </span>
      )}
    </span>
  )
}
