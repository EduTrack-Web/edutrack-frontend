import { useEffect } from 'react'
import { AlignLeft, Calendar as CalendarIcon, X } from 'lucide-react'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import type { VietnameseHolidayItem } from '../../models/calendar.types'
import {
  formatHolidayLunarSubtitle,
  formatHolidaySolarDate,
  getHolidayNote,
  VIETNAM_HOLIDAY_CALENDAR_COLOR,
} from '../../models/vietnameseHolidays'

interface HolidayDetailModalProps {
  holiday: VietnameseHolidayItem | null
  onClose: () => void
}

export function HolidayDetailModal({ holiday, onClose }: HolidayDetailModalProps) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!holiday) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [holiday, onClose])

  if (!holiday) return null

  const lunarSubtitle = formatHolidayLunarSubtitle(holiday)
  const holidayNote = getHolidayNote(holiday, {
    typePublic: t('calendar.holiday.typePublic'),
    typeCompensatory: t('calendar.holiday.typeCompensatory'),
    typeObservance: t('calendar.holiday.typeObservance'),
  })

  return (
    <div
      aria-labelledby="holiday-detail-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-2xs"
      onMouseDown={onClose}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            aria-label={t('calendar.holiday.closeAria')}
            className="grid min-h-11 min-w-11 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </div>

        <div className="mt-1 flex items-start gap-3.5 px-1">
          <span
            aria-hidden="true"
            className="mt-1.5 size-3.5 shrink-0 rounded-sm"
            style={{ backgroundColor: VIETNAM_HOLIDAY_CALENDAR_COLOR }}
          />
          <div className="min-w-0">
            <h2
              className="break-words text-xl font-semibold leading-snug text-slate-900 dark:text-white"
              id="holiday-detail-modal-title"
            >
              {holiday.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {formatHolidaySolarDate(holiday.solarDate)}
            </p>
            {lunarSubtitle && (
              <p className="mt-0.5 text-sm font-medium text-[#548383] dark:text-[#C1E8FF]">
                {lunarSubtitle}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3 px-1 pb-1 text-sm text-slate-700 dark:text-slate-200">
          <div className="flex items-start gap-3.5">
            <AlignLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>{holidayNote}</span>
          </div>

          <div className="flex items-start gap-3.5">
            <CalendarIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>{t('calendar.holiday.calendarName')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
