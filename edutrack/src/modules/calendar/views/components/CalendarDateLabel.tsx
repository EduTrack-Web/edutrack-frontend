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
  const isYear = variant === 'year'
  const isMonth = variant === 'month'
  const isStacked = isDay || isYear

  const solarSize = variant === 'week'
    ? 'size-8 text-xl sm:size-9 sm:text-2xl'
    : isDay
      ? 'size-9 text-base'
      : isYear
        ? 'size-5 text-[10px]'
        : 'size-6 text-xs'

  const lunarSize = isYear
    ? 'text-[8px] leading-none'
    : isDay
      ? 'text-xs leading-tight'
      : 'text-[10px] sm:text-[11px]'

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

  return (
    <span
      className={`inline-flex min-w-0 items-center ${
        isStacked ? 'flex-col gap-0.5' : 'gap-1'
      }`}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-full font-semibold ${solarSize} ${solarStyle}`}
      >
        {solarDay}
      </span>
      {showLunarCalendar && lunarDate && (
        <span
          aria-label={getLunarDateTooltip(lunarDate)}
          className={`${lunarSize} shrink-0 font-semibold ${
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
