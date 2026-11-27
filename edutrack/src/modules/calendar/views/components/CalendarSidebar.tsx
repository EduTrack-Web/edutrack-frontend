import { useState } from 'react'
import { Icon } from '../../../../shared/components/Icon'
import type { CalendarCategory, CalendarPreferences } from '../../models/calendar.types'
import { VIETNAM_HOLIDAY_CALENDAR_COLOR } from '../../models/vietnameseHolidays'
import { EXTENDED_CALENDAR_COLORS } from '../../viewmodels/useEventModalViewModel'

interface CalendarSidebarProps {
  categories: CalendarCategory[]
  selectedCategoryIds: string[]
  currentDate: Date
  preferences: CalendarPreferences
  isSavingPreferences: boolean
  onSelectDate: (date: Date) => void
  onToggleCategoryVisibility: (categoryId: string) => void
  onShowOnlyCategory: (categoryId: string) => void
  onShowAllCategories: () => void
  onOpenCreateEvent: () => void
  onOpenCreateCategory: () => void
  onOpenEditCategory: (category: CalendarCategory) => void
  onOpenIcsModal: (category: CalendarCategory) => void
  onQuickChangeColor: (categoryId: string, color: string) => void
  onDeleteCategory: (categoryId: string) => void
  onUpdatePreferences: (
    preferences: Partial<CalendarPreferences>,
    options?: { silent?: boolean },
  ) => Promise<boolean>
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function CalendarSidebar({
  categories,
  selectedCategoryIds,
  currentDate,
  preferences,
  isSavingPreferences,
  onSelectDate,
  onToggleCategoryVisibility,
  onShowOnlyCategory,
  onShowAllCategories,
  onOpenCreateEvent,
  onOpenCreateCategory,
  onOpenEditCategory,
  onOpenIcsModal,
  onQuickChangeColor,
  onDeleteCategory,
  onUpdatePreferences,
}: CalendarSidebarProps) {
  const activeCategories = categories.filter((category) => !category.settings?.archived)
  const archivedCategories = categories.filter((category) => category.settings?.archived)
  const [activeMenuCatId, setActiveMenuCatId] = useState<string | null>(null)
  const [isHolidayMenuOpen, setIsHolidayMenuOpen] = useState(false)
  const [isMyCalendarsExpanded, setIsMyCalendarsExpanded] = useState(true)
  const [isOtherCalendarsExpanded, setIsOtherCalendarsExpanded] = useState(true)
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
    <aside className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start lg:flex lg:w-48 lg:flex-col lg:items-stretch lg:gap-4 xl:w-52 2xl:w-64">
      {(activeMenuCatId || isHolidayMenuOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setActiveMenuCatId(null)
            setIsHolidayMenuOpen(false)
          }}
        />
      )}

      <div className="space-y-3 lg:space-y-4">
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-md transition-all hover:bg-slate-50 hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 active:scale-[0.99] sm:py-3 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          onClick={onOpenCreateEvent}
          type="button"
        >
          <span className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-blue-400">
            <Icon className="size-4" name="plus" />
          </span>
          <span>Tạo mới sự kiện</span>
        </button>

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs sm:p-3.5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-800 capitalize dark:text-white">
              {miniCalMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Tháng trước"
                className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                onClick={() => setMiniCalMonth(new Date(year, month - 1, 1))}
                type="button"
              >
                <Icon className="size-3.5" name="arrowLeft" />
              </button>
              <button
                aria-label="Tháng sau"
                className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                onClick={() => setMiniCalMonth(new Date(year, month + 1, 1))}
                type="button"
              >
                <Icon className="size-3.5" name="arrowRight" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {WEEKDAYS.map((wd) => (
              <div key={wd}>{wd}</div>
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
                  className={`mx-auto grid size-7 place-items-center rounded-full text-xs font-medium transition-colors ${
                    todayActive
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

      <div className="space-y-3 lg:space-y-4">
        <div
          className={`rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs sm:p-3.5 dark:border-white/10 dark:bg-white/5 ${
            activeMenuCatId ? 'relative z-20' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex min-w-0 items-center gap-2">
              <button
                aria-expanded={isMyCalendarsExpanded}
                className="flex min-h-8 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:text-white"
                onClick={() => setIsMyCalendarsExpanded((prev) => !prev)}
                type="button"
              >
                <Icon
                  className={`size-3.5 transition-transform motion-reduce:transition-none ${
                    isMyCalendarsExpanded ? 'rotate-180' : ''
                  }`}
                  name="chevronDown"
                />
                <span>Lịch của tôi</span>
              </button>
              {selectedCategoryIds.length < activeCategories.length && (
                <button
                  className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                  onClick={onShowAllCategories}
                  title="Hiển thị tất cả các lịch"
                  type="button"
                >
                  Hiện tất cả
                </button>
              )}
            </div>
            <button
              aria-label="Thêm lịch mới"
              className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={onOpenCreateCategory}
              title="Tạo lịch mới"
              type="button"
            >
              <Icon className="size-4" name="plus" />
            </button>
          </div>

          {isMyCalendarsExpanded && (
            <>
              <div className="mt-1.5 space-y-1">
                {activeCategories.length === 0 ? (
                  <p className="py-2 text-xs text-slate-400">Chưa có lịch nào.</p>
                ) : (
                  activeCategories.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(cat.id)
                    const isMenuOpen = activeMenuCatId === cat.id

                    return (
                      <div className="relative" key={cat.id}>
                        <div className="group flex items-center justify-between rounded-xl px-2 py-1 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5">
                          <label
                            className="flex min-h-9 flex-1 cursor-pointer items-center gap-2.5 select-none"
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
                              className={`grid size-4.5 shrink-0 place-items-center rounded-sm transition-all ${
                                isChecked ? 'text-white' : 'border-2 border-slate-300 bg-transparent dark:border-white/20'
                              }`}
                              style={{
                                backgroundColor: isChecked ? cat.color : 'transparent',
                                borderColor: isChecked ? cat.color : undefined,
                              }}
                            >
                              {isChecked && <Icon className="size-3" name="check" />}
                            </span>

                            <span
                              className={`truncate text-xs font-semibold ${
                                isChecked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'
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
                              setActiveMenuCatId(isMenuOpen ? null : cat.id)
                            }}
                            type="button"
                          >
                            <Icon className="size-3.5" name="moreVertical" />
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div
                            className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#021024]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-1 border-b border-slate-100 pb-2 dark:border-white/10">
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                onClick={() => {
                                  setActiveMenuCatId(null)
                                  onShowOnlyCategory(cat.id)
                                }}
                                type="button"
                              >
                                <Icon className="size-3.5" name="eye" />
                                Chỉ hiện lịch này
                              </button>

                              {selectedCategoryIds.length < activeCategories.length && (
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                  onClick={() => {
                                    setActiveMenuCatId(null)
                                    onShowAllCategories()
                                  }}
                                  type="button"
                                >
                                  <Icon className="size-3.5" name="checkCircle" />
                                  Hiện tất cả các lịch
                                </button>
                              )}

                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                onClick={() => {
                                  setActiveMenuCatId(null)
                                  onOpenEditCategory(cat)
                                }}
                                type="button"
                              >
                                <Icon className="size-3.5" name="edit" />
                                {!cat.isShared || cat.myRole === 'admin' ? 'Chỉnh sửa lịch' : 'Xem thông tin lịch'}
                              </button>

                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
                                onClick={() => {
                                  setActiveMenuCatId(null)
                                  onOpenIcsModal(cat)
                                }}
                                type="button"
                              >
                                <Icon className="size-3.5" name="calendar" />
                                Nhập / Xuất .ics
                              </button>

                              {!cat.isShared && (
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                  onClick={() => {
                                    setActiveMenuCatId(null)
                                    onDeleteCategory(cat.id)
                                  }}
                                  type="button"
                                >
                                  <Icon className="size-3.5" name="trash" />
                                  Xóa lịch
                                </button>
                              )}
                            </div>

                            {(!cat.isShared || cat.myRole === 'admin') && (
                              <div className="pt-2">
                                <span className="block px-2 text-[10px] font-bold text-slate-400 uppercase">
                                  Đổi màu nhanh
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
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {archivedCategories.length > 0 && (
                <details className="mt-3 border-t border-slate-100 pt-2 dark:border-white/10">
                  <summary className="cursor-pointer px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    Lịch đã lưu trữ ({archivedCategories.length})
                  </summary>
                  <div className="mt-1 space-y-1">
                    {archivedCategories.map((category) => (
                      <button
                        className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2 py-1 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                        key={category.id}
                        onClick={() => onOpenEditCategory(category)}
                        title={category.name}
                        type="button"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full opacity-75"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        <div
          className={`rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-2xs backdrop-blur-xs sm:p-3.5 dark:border-white/10 dark:bg-white/5 ${
            isHolidayMenuOpen ? 'relative z-20' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-1">
            <button
              aria-expanded={isOtherCalendarsExpanded}
              className="flex min-h-8 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:text-white"
              onClick={() => setIsOtherCalendarsExpanded((prev) => !prev)}
              type="button"
            >
              <Icon
                className={`size-3.5 transition-transform motion-reduce:transition-none ${
                  isOtherCalendarsExpanded ? 'rotate-180' : ''
                }`}
                name="chevronDown"
              />
              <span>Lịch khác</span>
            </button>
          </div>

          {isOtherCalendarsExpanded && (
            <div className="relative mt-1.5">
              <div className="group flex items-center justify-between rounded-xl px-2 py-1 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5">
                <label
                  className="flex min-h-9 flex-1 cursor-pointer items-center gap-2.5 select-none"
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
                    className={`grid size-4.5 shrink-0 place-items-center rounded-sm transition-all ${
                      preferences.showVietnameseHolidays
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
                    className={`truncate text-xs font-semibold ${
                      preferences.showVietnameseHolidays
                        ? 'text-slate-800 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    title="Ngày lễ ở Việt Nam"
                  >
                    Ngày lễ ở Việt Nam
                  </span>
                </label>

                <button
                  aria-expanded={isHolidayMenuOpen}
                  aria-label="Tùy chọn Ngày lễ ở Việt Nam"
                  className="grid size-7 place-items-center rounded-md text-slate-400 opacity-70 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => {
                    setActiveMenuCatId(null)
                    setIsHolidayMenuOpen((prev) => !prev)
                  }}
                  type="button"
                >
                  <Icon className="size-3.5" name="moreVertical" />
                </button>
              </div>

              {isHolidayMenuOpen && (
                <div
                  className="absolute right-0 z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#021024]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hiển thị trong lịch này
                  </p>
                  <div className="space-y-1">
                    <button
                      aria-pressed={preferences.showPublicHolidays}
                      className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/10"
                      disabled={isSavingPreferences}
                      onClick={() => handleToggleHolidaySubCategory('showPublicHolidays')}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full bg-green-600" />
                        <span>Ngày nghỉ lễ chính thức</span>
                      </span>
                      {preferences.showPublicHolidays && <Icon className="size-3.5 text-blue-600 dark:text-blue-400" name="check" />}
                    </button>

                    <button
                      aria-pressed={preferences.showObservanceHolidays}
                      className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/10"
                      disabled={isSavingPreferences}
                      onClick={() => handleToggleHolidaySubCategory('showObservanceHolidays')}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full border border-green-600 bg-green-100 dark:bg-green-950/60" />
                        <span>Ngày lễ &amp; Kỷ niệm</span>
                      </span>
                      {preferences.showObservanceHolidays && <Icon className="size-3.5 text-blue-600 dark:text-blue-400" name="check" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
