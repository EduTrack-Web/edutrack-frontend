import { useState } from 'react'
import { Settings } from 'lucide-react'
import { interfaceLocale } from '@/modules/i18n/services/translator'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { Icon } from '../../../../shared/components/Icon'
import { CALENDAR_KEYS } from '../../models/calendarI18nKeys'
import type {
  CalendarCategory,
  CalendarPreferences,
  GoogleCalendarIntegrationStatus,
  GoogleSyncJobItem,
} from '../../models/calendar.types'
import {
  getGoogleCalendarSyncStatusLabel,
  sortGoogleIntegrations,
} from '../../models/googleCalendarSync'
import { VIETNAM_HOLIDAY_CALENDAR_COLOR } from '../../models/vietnameseHolidays'
import { EXTENDED_CALENDAR_COLORS } from '../../viewmodels/useEventModalViewModel'
import '../../styles/calendarScrollbar.css'

interface CalendarSidebarProps {
  categories: CalendarCategory[]
  selectedCategoryIds: string[]
  currentDate: Date
  preferences: CalendarPreferences
  isSavingPreferences: boolean
  isGoogleConfigured: boolean
  googleIntegrations: GoogleCalendarIntegrationStatus[]
  googleSyncJobs: GoogleSyncJobItem[]
  syncingGoogleIntegrationId: string | null
  onSelectDate: (date: Date) => void
  onToggleCategoryVisibility: (categoryId: string) => void
  onShowOnlyCategory: (categoryId: string) => void
  onShowAllCategories: () => void
  onOpenCreateEvent: () => void
  onOpenCreateCategory: () => void
  onOpenEditCategory: (category: CalendarCategory) => void
  onQuickChangeColor: (categoryId: string, color: string) => void
  onDeleteCategory: (categoryId: string) => void
  onUpdatePreferences: (
    preferences: Partial<CalendarPreferences>,
    options?: { silent?: boolean },
  ) => Promise<boolean>
  onOpenCalendarSettings: () => void
  onStartGoogleSyncLink: () => void
  onReconnectGoogleAccount: (integrationId: string) => void
  onSyncGoogleIntegration: (integrationId: string) => void
  onToggleGoogleCalendarVisibility: (calendarConnectionId: string, isVisible: boolean) => void
  onOpenSelectGoogleCalendars: (integration: GoogleCalendarIntegrationStatus) => void
  onRetryGoogleJob: (jobId: string) => void
  onOpenGoogleConflicts: () => void
  onOpenUnlinkGoogleModal: (integration: GoogleCalendarIntegrationStatus) => void
}

const MINI_CAL_WEEKDAY_KEYS = [
  CALENDAR_KEYS.WEEKDAY_SHORT_MON,
  CALENDAR_KEYS.WEEKDAY_SHORT_TUE,
  CALENDAR_KEYS.WEEKDAY_SHORT_WED,
  CALENDAR_KEYS.WEEKDAY_SHORT_THU,
  CALENDAR_KEYS.WEEKDAY_SHORT_FRI,
  CALENDAR_KEYS.WEEKDAY_SHORT_SAT,
  CALENDAR_KEYS.WEEKDAY_SHORT_SUN,
] as const

export function CalendarSidebar({
  categories,
  selectedCategoryIds,
  currentDate,
  preferences,
  isSavingPreferences,
  isGoogleConfigured,
  googleIntegrations,
  googleSyncJobs,
  syncingGoogleIntegrationId,
  onSelectDate,
  onToggleCategoryVisibility,
  onShowOnlyCategory,
  onShowAllCategories,
  onOpenCreateEvent,
  onOpenCreateCategory,
  onOpenEditCategory,
  onQuickChangeColor,
  onDeleteCategory,
  onUpdatePreferences,
  onOpenCalendarSettings,
  onStartGoogleSyncLink,
  onReconnectGoogleAccount,
  onSyncGoogleIntegration,
  onToggleGoogleCalendarVisibility,
  onOpenSelectGoogleCalendars,
  onRetryGoogleJob,
  onOpenGoogleConflicts,
  onOpenUnlinkGoogleModal,
}: CalendarSidebarProps) {
  const { language, t } = useTranslation()
  const locale = interfaceLocale(language)
  const activeCategories = categories.filter((category) => !category.settings?.archived)
  const archivedCategories = categories.filter((category) => category.settings?.archived)
  const sortedGoogleIntegrations = sortGoogleIntegrations(googleIntegrations)
  const [activeMenuCatId, setActiveMenuCatId] = useState<string | null>(null)
  const [isHolidayMenuOpen, setIsHolidayMenuOpen] = useState(false)
  const [activeGoogleMenuId, setActiveGoogleMenuId] = useState<string | null>(null)
  const [isMyCalendarsExpanded, setIsMyCalendarsExpanded] = useState(true)
  const [isOtherCalendarsExpanded, setIsOtherCalendarsExpanded] = useState(true)
  const [isGoogleSyncExpanded, setIsGoogleSyncExpanded] = useState(true)
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))

  const year = miniCalMonth.getFullYear()
  const month = miniCalMonth.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek === -1) startDayOfWeek = 6

  const daysInMonth = lastDayOfMonth.getDate()
  const totalSlots = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7

  const today = new Date()
  const isToday = (d: number) =>
    today.getDate() === d && today.getMonth() === month && today.getFullYear() === year

  const isSelected = (d: number) =>
    currentDate.getDate() === d && currentDate.getMonth() === month && currentDate.getFullYear() === year

  const handleToggleVietnameseHolidayCalendar = () => {
    const nextEnabled = !preferences.showVietnameseHolidays
    if (nextEnabled && !preferences.showPublicHolidays && !preferences.showObservanceHolidays) {
      void onUpdatePreferences(
        {
          showVietnameseHolidays: true,
          showPublicHolidays: true,
          showObservanceHolidays: true,
        },
        { silent: true },
      )
      return
    }
    void onUpdatePreferences({ showVietnameseHolidays: nextEnabled }, { silent: true })
  }

  const handleToggleHolidaySubCategory = (key: 'showPublicHolidays' | 'showObservanceHolidays') => {
    const nextValue = !preferences[key]
    const payload: Partial<CalendarPreferences> = { [key]: nextValue }
    if (nextValue && !preferences.showVietnameseHolidays) {
      payload.showVietnameseHolidays = true
    }
    void onUpdatePreferences(payload, { silent: true })
  }

  return (
    <aside className="gcal-scrollbar grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start lg:flex lg:h-full lg:min-h-0 lg:w-60 lg:flex-col lg:items-stretch lg:gap-3 lg:overflow-y-auto lg:pr-1 xl:w-64">
      {(activeMenuCatId || isHolidayMenuOpen || activeGoogleMenuId) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setActiveMenuCatId(null)
            setIsHolidayMenuOpen(false)
            setActiveGoogleMenuId(null)
          }}
        />
      )}

      <div className="space-y-3">
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-bold whitespace-nowrap text-slate-800 shadow-md transition-all hover:bg-slate-50 hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 active:scale-[0.99] dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          onClick={onOpenCreateEvent}
          type="button"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-blue-400">
            <Icon className="size-4" name="plus" />
          </span>
          <span className="truncate">{t(CALENDAR_KEYS.CREATE_EVENT)}</span>
        </button>

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-1 pb-2">
            <span className="truncate text-xs font-bold text-slate-800 capitalize dark:text-white">
              {miniCalMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                aria-label={t(CALENDAR_KEYS.SIDEBAR_PREV_MONTH)}
                className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                onClick={() => setMiniCalMonth(new Date(year, month - 1, 1))}
                type="button"
              >
                <Icon className="size-3.5" name="arrowLeft" />
              </button>
              <button
                aria-label={t(CALENDAR_KEYS.SIDEBAR_NEXT_MONTH)}
                className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                onClick={() => setMiniCalMonth(new Date(year, month + 1, 1))}
                type="button"
              >
                <Icon className="size-3.5" name="arrowRight" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-slate-400">
            {MINI_CAL_WEEKDAY_KEYS.map((wdKey) => (
              <div key={wdKey}>{t(wdKey)}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: totalSlots }).map((_, idx) => {
              const dayNum = idx - startDayOfWeek + 1
              const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth

              if (!isCurrentMonth) {
                return <div className="mx-auto size-7" key={idx} />
              }

              const todayActive = isToday(dayNum)
              const selectedActive = isSelected(dayNum)

              return (
                <button
                  className={`mx-auto grid size-7 place-items-center rounded-full text-xs font-medium transition-colors ${todayActive
                    ? 'bg-blue-600 font-bold text-white shadow-xs'
                    : selectedActive
                      ? 'border border-blue-600 bg-blue-50 font-bold text-blue-700 dark:bg-white/15 dark:text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  key={idx}
                  onClick={() => onSelectDate(new Date(year, month, dayNum))}
                  type="button"
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div
          className={`rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5 ${activeMenuCatId ? 'relative z-20' : ''
            }`}
        >
          <div className="flex items-center justify-between gap-1.5 pb-1">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <button
                aria-expanded={isMyCalendarsExpanded}
                className="flex min-h-8 min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:text-white"
                onClick={() => setIsMyCalendarsExpanded((prev) => !prev)}
                type="button"
              >
                <Icon
                  className={`size-3.5 shrink-0 transition-transform motion-reduce:transition-none ${isMyCalendarsExpanded ? 'rotate-180' : ''
                    }`}
                  name="chevronDown"
                />
                <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_MY_CALENDARS)}</span>
              </button>
              {selectedCategoryIds.length < activeCategories.length && (
                <button
                  className="shrink-0 text-[11px] font-bold whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
                  onClick={onShowAllCategories}
                  type="button"
                >
                  {t(CALENDAR_KEYS.SIDEBAR_SHOW_ALL)}
                </button>
              )}
            </div>
            <button
              aria-label={t(CALENDAR_KEYS.SIDEBAR_ADD_CATEGORY)}
              className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={onOpenCreateCategory}
              title={t(CALENDAR_KEYS.SIDEBAR_ADD_CATEGORY)}
              type="button"
            >
              <Icon className="size-4" name="plus" />
            </button>
          </div>

          {isMyCalendarsExpanded && (
            <>
              <div className="mt-1.5 space-y-1">
                {activeCategories.length === 0 ? (
                  <p className="py-2 text-xs text-slate-400">{t(CALENDAR_KEYS.SIDEBAR_EMPTY_CATEGORIES)}</p>
                ) : (
                  activeCategories.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(cat.id)
                    const isMenuOpen = activeMenuCatId === cat.id

                    return (
                      <div className="relative" key={cat.id}>
                        <div className="group flex min-w-0 items-center justify-between gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5">
                          <label
                            className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5 select-none"
                            htmlFor={`cat-${cat.id}`}
                          >
                            <input
                              checked={isChecked}
                              className="sr-only"
                              id={`cat-${cat.id}`}
                              onChange={() => onToggleCategoryVisibility(cat.id)}
                              type="checkbox"
                            />
                            <span
                              className={`grid size-4.5 shrink-0 place-items-center rounded-sm transition-all ${isChecked ? 'text-white' : 'border-2 border-slate-300 bg-transparent dark:border-white/20'
                                }`}
                              style={{
                                backgroundColor: isChecked ? cat.color : 'transparent',
                                borderColor: isChecked ? cat.color : undefined,
                              }}
                            >
                              {isChecked && <Icon className="size-3" name="check" />}
                            </span>

                            <span
                              className={`truncate text-xs font-semibold ${isChecked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                                }`}
                              title={cat.name}
                            >
                              {cat.name}
                            </span>
                          </label>

                          <button
                            aria-label={`Tùy chọn lịch ${cat.name}`}
                            className="grid size-7 place-items-center rounded-md text-slate-400 opacity-70 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
                            onClick={() => {
                              setIsHolidayMenuOpen(false)
                              setActiveGoogleMenuId(null)
                              setActiveMenuCatId(isMenuOpen ? null : cat.id)
                            }}
                            type="button"
                          >
                            <Icon className="size-3.5" name="moreVertical" />
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div
                            className="absolute left-0 z-20 mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:right-0 sm:left-auto lg:right-0 lg:left-0 lg:w-auto dark:border-white/10 dark:bg-[#021024]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-1 border-b border-slate-100 pb-2 dark:border-white/10">
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                onClick={() => {
                                  setActiveMenuCatId(null)
                                  onShowOnlyCategory(cat.id)
                                }}
                                type="button"
                              >
                                <Icon className="size-3.5 shrink-0" name="eye" />
                                <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_SHOW_ONLY_THIS)}</span>
                              </button>

                              {selectedCategoryIds.length < activeCategories.length && (
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                  onClick={() => {
                                    setActiveMenuCatId(null)
                                    onShowAllCategories()
                                  }}
                                  type="button"
                                >
                                  <Icon className="size-3.5 shrink-0" name="checkCircle" />
                                  <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_SHOW_ALL_CALENDARS)}</span>
                                </button>
                              )}

                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                onClick={() => {
                                  setActiveMenuCatId(null)
                                  onOpenEditCategory(cat)
                                }}
                                type="button"
                              >
                                <Icon className="size-3.5 shrink-0" name="edit" />
                                <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_EDIT_CALENDAR)}</span>
                              </button>

                              {!cat.isDefault && (
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                  onClick={() => {
                                    setActiveMenuCatId(null)
                                    onDeleteCategory(cat.id)
                                  }}
                                  type="button"
                                >
                                  <Icon className="size-3.5 shrink-0" name="trash" />
                                  <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_DELETE_CALENDAR)}</span>
                                </button>
                              )}
                            </div>

                            <div className="pt-2">
                              <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase">
                                {t(CALENDAR_KEYS.SIDEBAR_QUICK_COLOR)}
                              </span>
                              <div className="mt-1.5 grid grid-cols-6 gap-1 px-1">
                                {EXTENDED_CALENDAR_COLORS.slice(0, 12).map((c) => (
                                  <button
                                    aria-label={`Đổi màu ${c}`}
                                    className="size-4.5 rounded-full transition-transform hover:scale-120"
                                    key={c}
                                    onClick={() => {
                                      onQuickChangeColor(cat.id, c)
                                      setActiveMenuCatId(null)
                                    }}
                                    style={{ backgroundColor: c }}
                                    type="button"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {archivedCategories.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold">
                    {t(CALENDAR_KEYS.SIDEBAR_ARCHIVED)}
                  </summary>
                  {archivedCategories.map((category) => (
                    <button
                      className="block min-h-11 w-full break-words text-left text-sm"
                      key={category.id}
                      onClick={() => onOpenEditCategory(category)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  ))}
                </details>
              )}
            </>
          )}
        </div>

        <div
          className={`rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5 ${isHolidayMenuOpen ? 'relative z-20' : ''
            }`}
        >
          <div className="flex items-center justify-between gap-2 pb-1">
            <button
              aria-expanded={isOtherCalendarsExpanded}
              className="flex min-h-8 min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:text-white"
              onClick={() => setIsOtherCalendarsExpanded((prev) => !prev)}
              type="button"
            >
              <Icon
                className={`size-3.5 shrink-0 transition-transform motion-reduce:transition-none ${isOtherCalendarsExpanded ? 'rotate-180' : ''
                  }`}
                name="chevronDown"
              />
              <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_OTHER_CALENDARS)}</span>
            </button>
          </div>

          {isOtherCalendarsExpanded && (
            <div className="relative mt-1.5">
              <div className="group flex min-w-0 items-center justify-between gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5">
                <label
                  className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5 select-none"
                  htmlFor="other-calendar-vn-holidays"
                >
                  <input
                    checked={preferences.showVietnameseHolidays}
                    className="sr-only"
                    disabled={isSavingPreferences}
                    id="other-calendar-vn-holidays"
                    onChange={handleToggleVietnameseHolidayCalendar}
                    type="checkbox"
                  />
                  <span
                    className={`grid size-4.5 shrink-0 place-items-center rounded-sm transition-all ${preferences.showVietnameseHolidays
                      ? 'text-white'
                      : 'border-2 border-slate-300 bg-transparent dark:border-white/20'
                      }`}
                    style={{
                      backgroundColor: preferences.showVietnameseHolidays ? VIETNAM_HOLIDAY_CALENDAR_COLOR : 'transparent',
                      borderColor: preferences.showVietnameseHolidays ? VIETNAM_HOLIDAY_CALENDAR_COLOR : undefined,
                    }}
                  >
                    {preferences.showVietnameseHolidays && <Icon className="size-3" name="check" />}
                  </span>

                  <span
                    className={`truncate text-xs font-semibold ${preferences.showVietnameseHolidays
                      ? 'text-slate-800 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                      }`}
                    title={t('calendar.holiday.calendarName')}
                  >
                    {t('calendar.holiday.calendarName')}
                  </span>
                </label>

                <button
                  aria-expanded={isHolidayMenuOpen}
                  aria-label={t('calendar.holiday.calendarName')}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 opacity-70 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => {
                    setActiveMenuCatId(null)
                    setActiveGoogleMenuId(null)
                    setIsHolidayMenuOpen((prev) => !prev)
                  }}
                  type="button"
                >
                  <Icon className="size-3.5" name="moreVertical" />
                </button>
              </div>

              {isHolidayMenuOpen && (
                <div
                  className="absolute left-0 z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:right-0 sm:left-auto lg:right-0 lg:left-0 lg:w-auto dark:border-white/10 dark:bg-[#021024]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t(CALENDAR_KEYS.SIDEBAR_SHOW_IN_CALENDAR)}
                  </p>
                  <div className="space-y-1">
                    <button
                      aria-pressed={preferences.showPublicHolidays}
                      className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/10"
                      disabled={isSavingPreferences}
                      onClick={() => handleToggleHolidaySubCategory('showPublicHolidays')}
                      type="button"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full bg-green-600" />
                        <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_PUBLIC_HOLIDAYS)}</span>
                      </span>
                      {preferences.showPublicHolidays && <Icon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" name="check" />}
                    </button>

                    <button
                      aria-pressed={preferences.showObservanceHolidays}
                      className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/10"
                      disabled={isSavingPreferences}
                      onClick={() => handleToggleHolidaySubCategory('showObservanceHolidays')}
                      type="button"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full border border-green-600 bg-green-100 dark:bg-green-950/60" />
                        <span className="truncate">{t(CALENDAR_KEYS.SIDEBAR_OBSERVANCE_HOLIDAYS)}</span>
                      </span>
                      {preferences.showObservanceHolidays && <Icon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" name="check" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-white/5 ${activeGoogleMenuId ? 'relative z-20' : ''
            }`}
        >
          <div className="flex items-center justify-between gap-1.5 pb-1">
            <button
              aria-expanded={isGoogleSyncExpanded}
              className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:text-white"
              onClick={() => setIsGoogleSyncExpanded((prev) => !prev)}
              type="button"
            >
              <Icon
                className={`size-3.5 shrink-0 transition-transform motion-reduce:transition-none ${isGoogleSyncExpanded ? 'rotate-180' : ''
                  }`}
                name="chevronDown"
              />
              <span className="truncate">{t('calendar.google.sectionTitle')}</span>
            </button>

            <button
              aria-label={t('calendar.google.addAccount')}
              className="grid min-h-11 min-w-11 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 lg:min-h-7 lg:min-w-7 dark:hover:bg-white/10 dark:hover:text-white"
              disabled={!isGoogleConfigured}
              onClick={onStartGoogleSyncLink}
              title={t('calendar.google.addAccount')}
              type="button"
            >
              <Icon className="size-4" name="plus" />
            </button>
          </div>

          {isGoogleSyncExpanded && (
            <div className="mt-2 space-y-2.5">
              {sortedGoogleIntegrations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-3 text-center dark:border-white/10 dark:bg-white/5">
                  <div className="mx-auto flex size-7 items-center justify-center">
                    <img alt="" className="size-4.5" src="/google-g-logo.png" />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {isGoogleConfigured
                      ? t('calendar.google.unlinkedEmpty')
                      : t('calendar.google.notConfigured')}
                  </p>
                  <button
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 lg:min-h-8 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    disabled={!isGoogleConfigured}
                    onClick={onStartGoogleSyncLink}
                    type="button"
                  >
                    {t('calendar.google.connectButton')}
                  </button>
                </div>
              ) : (
                sortedGoogleIntegrations.map((integration) => {
                  const selectedCalendars = integration.calendars.filter((c) => c.isSelected)
                  const isMenuOpen = activeGoogleMenuId === integration.id
                  const isSyncingThisAccount = syncingGoogleIntegrationId === integration.id

                  return (
                    <div
                      className="relative rounded-xl border border-slate-200/80 bg-white/75 p-2 dark:border-white/10 dark:bg-white/5"
                      key={integration.id}
                    >
                      <div className="group flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <img alt="" className="size-3.5 shrink-0" src="/google-g-logo.png" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span
                                className="truncate text-xs font-bold text-slate-800 dark:text-white"
                                title={integration.googleEmail}
                              >
                                {integration.googleEmail}
                              </span>
                              <span
                                className={`size-2 shrink-0 rounded-full ${integration.status === 'reconnect_required'
                                  ? 'bg-rose-500'
                                  : integration.pendingConflictsCount > 0
                                    ? 'bg-amber-500'
                                    : integration.lastError
                                      ? 'bg-rose-500'
                                      : 'bg-emerald-500'
                                  }`}
                                title={
                                  integration.status === 'reconnect_required'
                                    ? 'Cần liên kết lại tài khoản Google'
                                    : integration.pendingConflictsCount > 0
                                      ? 'Có xung đột cần xử lý'
                                      : integration.lastError || 'Đã kết nối'
                                }
                              />
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                              {integration.isPrimarySyncAccount && (
                                <span className="rounded-sm bg-blue-50 px-1 py-0.2 font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                  {t('calendar.google.primaryShortBadge')}
                                </span>
                              )}
                              {integration.syncToGoogleEnabled && (
                                <span className="rounded-sm bg-slate-100 px-1 py-0.2 font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                  ET➔GG
                                </span>
                              )}
                              {integration.status === 'reconnect_required' && (
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                  Cần liên kết lại
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {integration.status === 'reconnect_required' ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-amber-800 hover:bg-amber-100 lg:min-h-7 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
                              disabled={!isGoogleConfigured}
                              onClick={() => onReconnectGoogleAccount(integration.id)}
                              type="button"
                            >
                              {t(CALENDAR_KEYS.SIDEBAR_RECONNECT_SHORT)}
                            </button>
                            <button
                              aria-label={t('calendar.google.disconnect')}
                              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md text-rose-600 hover:bg-rose-50 lg:min-h-7 lg:min-w-7 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              onClick={() => onOpenUnlinkGoogleModal(integration)}
                              title={t('calendar.google.disconnect')}
                              type="button"
                            >
                              <Icon className="size-3.5" name="trash" />
                            </button>
                          </div>
                        ) : (
                          <button
                            aria-expanded={isMenuOpen}
                            aria-label={`Tùy chọn tài khoản ${integration.googleEmail}`}
                            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md text-slate-400 opacity-75 hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-600 lg:min-h-7 lg:min-w-7 dark:hover:bg-white/10 dark:hover:text-white"
                            onClick={() => {
                              setActiveMenuCatId(null)
                              setIsHolidayMenuOpen(false)
                              setActiveGoogleMenuId(isMenuOpen ? null : integration.id)
                            }}
                            type="button"
                          >
                            <Icon className="size-3.5" name="moreVertical" />
                          </button>
                        )}
                      </div>

                      {isMenuOpen && (
                        <div
                          className="absolute left-0 z-30 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:right-0 sm:left-auto lg:right-0 lg:left-0 lg:w-auto dark:border-white/10 dark:bg-[#021024]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="border-b border-slate-100 px-2 pb-2 dark:border-white/10">
                            <p className="truncate text-[11px] font-bold text-slate-800 dark:text-white">
                              {integration.googleEmail}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              {integration.lastSyncedAt
                                ? t(CALENDAR_KEYS.SIDEBAR_SYNCED_AT, {
                                  time: new Date(integration.lastSyncedAt).toLocaleTimeString(locale, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  }),
                                })
                                : t(CALENDAR_KEYS.SIDEBAR_NEVER_SYNCED)}
                            </p>
                          </div>

                          <div className="mt-1.5 space-y-1 border-b border-slate-100 pb-2 dark:border-white/10">
                            <button
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 lg:min-h-8 dark:text-slate-200 dark:hover:bg-white/10"
                              onClick={() => {
                                setActiveGoogleMenuId(null)
                                onOpenSelectGoogleCalendars(integration)
                              }}
                              type="button"
                            >
                              <Icon className="size-3.5" name="edit" />
                              <span>{t('calendar.google.editCalendarsCount', { count: String(selectedCalendars.length) })}</span>
                            </button>

                            <button
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 lg:min-h-8 dark:text-slate-200 dark:hover:bg-white/10"
                              disabled={isSyncingThisAccount}
                              onClick={() => {
                                setActiveGoogleMenuId(null)
                                onSyncGoogleIntegration(integration.id)
                              }}
                              type="button"
                            >
                              <Icon
                                className={`size-3.5 ${isSyncingThisAccount ? 'animate-spin' : ''}`}
                                name="clock"
                              />
                              <span>{isSyncingThisAccount ? t('calendar.google.syncing') : t('calendar.google.syncNow')}</span>
                            </button>

                            <button
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 lg:min-h-8 dark:text-slate-200 dark:hover:bg-white/10"
                              onClick={() => {
                                setActiveGoogleMenuId(null)
                                onOpenCalendarSettings()
                              }}
                              type="button"
                            >
                              <Settings aria-hidden="true" className="size-3.5" />
                              <span>{t('calendar.google.syncDirectionSettings')}</span>
                            </button>

                            {integration.pendingConflictsCount > 0 && (
                              <button
                                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-left text-xs font-bold text-amber-800 hover:bg-amber-100 lg:min-h-8 dark:bg-amber-950/40 dark:text-amber-200"
                                onClick={() => {
                                  setActiveGoogleMenuId(null)
                                  onOpenGoogleConflicts()
                                }}
                                type="button"
                              >
                                <span>{t('calendar.google.resolveConflicts')}</span>
                                <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] text-white">
                                  {integration.pendingConflictsCount}
                                </span>
                              </button>
                            )}
                          </div>

                          <div className="pt-1.5">
                            <button
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 lg:min-h-8 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              onClick={() => {
                                setActiveGoogleMenuId(null)
                                onOpenUnlinkGoogleModal(integration)
                              }}
                              type="button"
                            >
                              <Icon className="size-3.5" name="trash" />
                              <span>{t('calendar.google.disconnect')}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5 dark:border-white/10">
                        {selectedCalendars.length === 0 ? (
                          <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                            <span className="truncate text-[11px] text-slate-400">
                              {t(CALENDAR_KEYS.SIDEBAR_NO_SUB_CALENDARS)}
                            </span>
                            <button
                              className="shrink-0 text-[11px] font-bold whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
                              onClick={() => onOpenSelectGoogleCalendars(integration)}
                              type="button"
                            >
                              {t(CALENDAR_KEYS.SIDEBAR_SELECT_LINK)}
                            </button>
                          </div>
                        ) : (
                          selectedCalendars.map((cal) => {
                            const failedJob = googleSyncJobs.find(
                              (j) =>
                                j.calendarConnectionId === cal.id &&
                                j.status === 'failed',
                            )
                            const isReadOnly =
                              cal.accessRole === 'reader' || cal.accessRole === 'freeBusyReader'

                            return (
                              <div className="rounded-lg px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-white/5" key={cal.id}>
                                <label
                                  className="flex min-h-7 cursor-pointer items-center gap-2 select-none"
                                  htmlFor={`gg-cal-${cal.id}`}
                                >
                                  <input
                                    checked={cal.isVisible}
                                    className="sr-only"
                                    id={`gg-cal-${cal.id}`}
                                    onChange={() => onToggleGoogleCalendarVisibility(cal.id, !cal.isVisible)}
                                    type="checkbox"
                                  />
                                  <span
                                    className={`grid size-4 shrink-0 place-items-center rounded-sm transition-all ${cal.isVisible
                                      ? 'text-white'
                                      : 'border-2 border-slate-300 bg-transparent dark:border-white/20'
                                      }`}
                                    style={{
                                      backgroundColor: cal.isVisible
                                        ? cal.backgroundColor || '#1A73E8'
                                        : 'transparent',
                                      borderColor: cal.isVisible
                                        ? cal.backgroundColor || '#1A73E8'
                                        : undefined,
                                    }}
                                  >
                                    {cal.isVisible && <Icon className="size-2.5" name="check" />}
                                  </span>

                                  <span
                                    className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${cal.isVisible
                                      ? 'text-slate-700 dark:text-slate-200'
                                      : 'text-slate-400 dark:text-slate-500'
                                      }`}
                                    title={cal.summary}
                                  >
                                    {cal.summary}
                                  </span>

                                  {isReadOnly && (
                                    <span className="shrink-0 text-[9px] font-bold whitespace-nowrap text-slate-400 uppercase">
                                      {t(CALENDAR_KEYS.SIDEBAR_READ_ONLY)}
                                    </span>
                                  )}
                                </label>

                                {(cal.syncStatus === 'initial_sync_pending' ||
                                  cal.syncStatus === 'initial_sync_running' ||
                                  cal.syncStatus === 'initial_sync_failed' ||
                                  failedJob) && (
                                    <div className="mt-0.5 flex items-center justify-between gap-2 pl-6 text-[10px]">
                                      <span
                                        className={`truncate ${cal.syncStatus === 'initial_sync_failed' || failedJob
                                          ? 'font-semibold text-rose-600 dark:text-rose-400'
                                          : 'text-blue-600 dark:text-blue-400'
                                          }`}
                                        title={failedJob?.lastErrorMessage || cal.lastSyncError}
                                      >
                                        {getGoogleCalendarSyncStatusLabel(cal)}
                                      </span>
                                      {failedJob && (
                                        <button
                                          className="shrink-0 font-bold whitespace-nowrap text-rose-700 underline hover:text-rose-800 dark:text-rose-300"
                                          onClick={() => onRetryGoogleJob(failedJob.id)}
                                          type="button"
                                        >
                                          {t(CALENDAR_KEYS.SIDEBAR_RETRY)}
                                        </button>
                                      )}
                                    </div>
                                  )}
                              </div>
                            )
                          })
                        )}

                        {googleSyncJobs
                          .filter(
                            (j) =>
                              j.integrationId === integration.id &&
                              j.status === 'failed' &&
                              !j.calendarConnectionId,
                          )
                          .slice(0, 2)
                          .map((job) => (
                            <div
                              className="flex items-center justify-between gap-2 rounded-md bg-rose-50 px-2 py-1 text-[10px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              key={job.id}
                            >
                              <span className="truncate" title={job.lastErrorMessage}>
                                {t(CALENDAR_KEYS.SIDEBAR_PUSH_ERROR, {
                                  message: job.lastErrorMessage || 'Error',
                                })}
                              </span>
                              <button
                                className="shrink-0 font-bold whitespace-nowrap underline"
                                onClick={() => onRetryGoogleJob(job.id)}
                                type="button"
                              >
                                {t(CALENDAR_KEYS.SIDEBAR_RETRY)}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
