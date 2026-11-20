import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/shared/components/Icon'
import type { CalendarEvent } from '@/modules/calendar/models/calendar.types'
import { useCalendarViewModel, type CalendarViewMode } from '@/modules/calendar/viewmodels/useCalendarViewModel'
import { CalendarSidebar } from './components/CalendarSidebar'
import { CategoryModal } from './components/CategoryModal'
import { EventModal } from './components/EventModal'

const GOOGLE_WEEKDAYS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const GOOGLE_SHORT_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const HOUR_HEIGHT = 48
const HOURS_24 = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}))

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string }[] = [
  { mode: 'day', label: 'Ngày' },
  { mode: 'week', label: 'Tuần' },
  { mode: 'month', label: 'Tháng' },
  { mode: 'year', label: 'Năm' },
  { mode: 'list', label: 'Danh sách' },
]

function formatEventTime(startStr: string, endStr: string, isAllDay: boolean): string {
  try {
    const start = new Date(startStr)
    const end = new Date(endStr)
    if (isAllDay) return 'Cả ngày'
    const timeStart = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const timeEnd = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${timeStart} – ${timeEnd}`
  } catch {
    return `${startStr} – ${endStr}`
  }
}

function getTimeZoneOffsetLabel(tz?: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz || 'Asia/Ho_Chi_Minh',
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(new Date())
    const tzPart = parts.find((p) => p.type === 'timeZoneName')
    return tzPart ? tzPart.value : 'GMT+7'
  } catch {
    return 'GMT+7'
  }
}

function formatDayHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
  } catch {
    return dateStr
  }
}

export function CalendarPage() {
  const vm = useCalendarViewModel()
  const timeGridRef = useRef<HTMLDivElement>(null)
  const dayGridRef = useRef<HTMLDivElement>(null)
  const [hoveredDateCell, setHoveredDateCell] = useState<string | null>(null)
  const currentYear = vm.currentDate.getFullYear()
  const currentMonth = vm.currentDate.getMonth()
  const today = new Date()
  const [selectedCalendarId] = vm.selectedCategoryIds
  const selectedSettings = vm.selectedCategoryIds.length === 1
    ? vm.categories.find((category) => category.id === selectedCalendarId)?.settings
    : undefined

  // Tuần bắt đầu từ Chủ Nhật (0) chuẩn theo ảnh Google Calendar
  const weekStartsOn = 0
  const weekdays = GOOGLE_WEEKDAYS
  const shortWeekdays = GOOGLE_SHORT_WEEKDAYS
  const timeZoneHeaderLabel = getTimeZoneOffsetLabel(selectedSettings?.timeZone)

  // Tự động cuộn đến 7:00 AM hoặc giờ hiện tại khi mở view Tuần/Ngày
  useEffect(() => {
    if (vm.viewMode === 'week' || vm.viewMode === 'day') {
      const scrollTimer = window.setTimeout(() => {
        const curH = new Date().getHours()
        const targetH = Math.max(0, Math.min(18, curH > 7 ? curH - 1 : 7))
        const targetScroll = targetH * HOUR_HEIGHT
        if (timeGridRef.current) timeGridRef.current.scrollTop = targetScroll
        if (dayGridRef.current) dayGridRef.current.scrollTop = targetScroll
      }, 50)
      return () => window.clearTimeout(scrollTimer)
    }
  }, [vm.viewMode])

  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const event of vm.events) {
    const start = new Date(event.startDate)
    const month = String(start.getMonth() + 1).padStart(2, '0')
    const day = String(start.getDate()).padStart(2, '0')
    const dateKey = [start.getFullYear(), month, day].join('-')
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
    eventsByDate[dateKey]?.push(event)
  }

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startOffset = (firstDayOfMonth.getDay() - weekStartsOn + 7) % 7
  const daysInCurrentMonth = lastDayOfMonth.getDate()
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
  const totalGridCells = Math.ceil((startOffset + daysInCurrentMonth) / 7) * 7

  const currentDayOfWeek = vm.currentDate.getDay()
  const weekOffset = (currentDayOfWeek - weekStartsOn + 7) % 7
  const weekStart = new Date(
    vm.currentDate.getFullYear(),
    vm.currentDate.getMonth(),
    vm.currentDate.getDate() - weekOffset,
  )
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + idx)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const dayNum = d.getDate()
    const dateKey = `${y}-${m < 10 ? `0${m}` : m}-${dayNum < 10 ? `0${dayNum}` : dayNum}`
    return { date: d, dateKey, dayNum, weekdayLabel: weekdays[idx] }
  })

  const selectedDayKey = `${vm.currentDate.getFullYear()}-${vm.currentDate.getMonth() + 1 < 10 ? `0${vm.currentDate.getMonth() + 1}` : vm.currentDate.getMonth() + 1}-${vm.currentDate.getDate() < 10 ? `0${vm.currentDate.getDate()}` : vm.currentDate.getDate()}`
  const selectedDayEvents = eventsByDate[selectedDayKey] ?? []
  const selectedDayAllDayEvents = selectedDayEvents.filter((e) => e.isAllDay)
  const selectedDayTimedEvents = selectedDayEvents.filter((e) => !e.isAllDay)

  const isSelectedDateToday =
    today.getDate() === vm.currentDate.getDate() &&
    today.getMonth() === vm.currentDate.getMonth() &&
    today.getFullYear() === vm.currentDate.getFullYear()

  const currentMinuteRatio = today.getHours() * 60 + today.getMinutes()
  const currentIndicatorTop = (currentMinuteRatio / 60) * HOUR_HEIGHT

  const hasAnyWeekAllDay = weekDays.some((wd) => (eventsByDate[wd.dateKey] ?? []).some((e) => e.isAllDay))

  const sortedListDates = Object.keys(eventsByDate).sort()

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) space-y-4">
      <div className="flex flex-col gap-5 lg:flex-row">
        <CalendarSidebar
          categories={vm.categories}
          currentDate={vm.currentDate}
          onDeleteCategory={vm.handleDeleteCategory}
          onOpenCreateCategory={vm.handleOpenCreateCategory}
          onOpenCreateEvent={() => vm.handleOpenCreateEvent()}
          onOpenEditCategory={vm.handleOpenEditCategory}
          onQuickChangeColor={vm.handleQuickChangeColor}
          onSelectDate={vm.handleSelectDate}
          onShowAllCategories={vm.handleShowAllCategories}
          onShowOnlyCategory={vm.handleShowOnlyCategory}
          onToggleCategoryVisibility={vm.handleToggleCategoryVisibility}
          selectedCategoryIds={vm.selectedCategoryIds}
        />

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-center dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                onClick={vm.handleToday}
                type="button"
              >
                Hôm nay
              </button>

              <div className="flex items-center gap-1">
                <button
                  aria-label="Trước"
                  className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                  onClick={vm.handlePrev}
                  type="button"
                >
                  <Icon className="size-4" name="arrowLeft" />
                </button>
                <button
                  aria-label="Sau"
                  className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                  onClick={vm.handleNext}
                  type="button"
                >
                  <Icon className="size-4" name="arrowRight" />
                </button>
              </div>

              <h2 className="text-base font-bold capitalize text-slate-900 sm:text-lg dark:text-white">
                {vm.dateTitleLabel}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">
                {VIEW_OPTIONS.map((opt) => (
                  <button
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      vm.viewMode === opt.mode
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    key={opt.mode}
                    onClick={() => vm.setViewMode(opt.mode)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">
                <button
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                    vm.activeFilterTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  onClick={() => vm.setActiveFilterTab('all')}
                  type="button"
                >
                  Tất cả
                </button>
                <button
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                    vm.activeFilterTab === 'event'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  onClick={() => vm.setActiveFilterTab('event')}
                  type="button"
                >
                  Sự kiện
                </button>
                <button
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                    vm.activeFilterTab === 'task'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  onClick={() => vm.setActiveFilterTab('task')}
                  type="button"
                >
                  Nhiệm vụ
                </button>
              </div>

            </div>
          </div>

          {vm.isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Icon className="size-8 animate-spin text-blue-600" name="clock" />
              <p className="mt-3 text-xs font-semibold text-slate-400">Đang đồng bộ dữ liệu lịch...</p>
            </div>
          ) : vm.viewMode === 'day' ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-transparent">
              {/* Header ngày */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 p-3 sm:px-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold capitalize text-slate-900 sm:text-base dark:text-white">
                    {vm.currentDate.toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  {isSelectedDateToday && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Hôm nay
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({selectedDayEvents.length} mục)
                  </span>
                </div>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700"
                  onClick={() => vm.handleOpenCreateEvent(vm.currentDate)}
                  type="button"
                >
                  + Thêm mục vào ngày này
                </button>
              </div>

              {/* Hàng sự kiện Cả ngày */}
              {selectedDayAllDayEvents.length > 0 && (
                <div className="flex items-center border-b border-slate-200 bg-slate-50/30 p-2 sm:px-3 dark:border-white/10 dark:bg-white/2">
                  <span className="w-14 sm:w-16 shrink-0 pr-2 text-right text-[10px] font-semibold text-slate-400">
                    Cả ngày
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {selectedDayAllDayEvents.map((event) => {
                      const eventColor = event.color || event.calendar?.color || '#2563EB'
                      return (
                        <button
                          className="rounded-md px-2.5 py-1 text-left text-xs font-semibold text-white shadow-2xs transition-transform hover:scale-[1.01]"
                          key={event.id}
                          onClick={() => vm.handleOpenEditEvent(event)}
                          style={{ backgroundColor: eventColor }}
                          type="button"
                        >
                          {event.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Lưới 24 giờ dọc */}
              <div
                className="relative flex max-h-[620px] select-none overflow-y-auto"
                ref={dayGridRef}
              >
                {/* Trục giờ dọc bên trái */}
                <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200/70 bg-white dark:border-white/10 dark:bg-transparent">
                  {HOURS_24.map((h, i) => (
                    <div className="relative h-[48px]" key={h.hour}>
                      {i > 0 && (
                        <span className="absolute -top-2.5 right-2 select-none text-[10px] font-medium text-slate-400">
                          {h.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cột nội dung ngày */}
                <div className="relative flex-1">
                  {/* Các ô giờ nền */}
                  {HOURS_24.map((h) => (
                    <div
                      className="h-[48px] cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/20 dark:border-white/5 dark:hover:bg-white/5"
                      key={h.hour}
                      onClick={() => {
                        const clickD = new Date(
                          vm.currentDate.getFullYear(),
                          vm.currentDate.getMonth(),
                          vm.currentDate.getDate(),
                          h.hour,
                          0,
                          0,
                        )
                        vm.handleOpenCreateEvent(clickD)
                      }}
                      title={`Thêm lịch trình lúc ${h.label}`}
                    />
                  ))}

                  {/* Vạch đỏ chỉ giờ thực tế */}
                  {isSelectedDateToday && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                      style={{ top: `${currentIndicatorTop}px` }}
                    >
                      <div className="-ml-1.5 size-2.5 rounded-full bg-red-500 shadow-xs" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}

                  {/* Danh sách sự kiện theo giờ */}
                  {selectedDayTimedEvents.map((event) => {
                    const startD = new Date(event.startDate)
                    const endD = new Date(event.endDate)
                    const startMin = startD.getHours() * 60 + startD.getMinutes()
                    const rawDuration = (endD.getTime() - startD.getTime()) / 60000
                    const durationMin = Math.max(
                      30,
                      Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 60,
                    )
                    const top = (startMin / 60) * HOUR_HEIGHT
                    const height = Math.max(34, (durationMin / 60) * HOUR_HEIGHT)
                    const eventColor = event.color || event.calendar?.color || '#2563EB'
                    const isTask = event.entryType === 'task'

                    return (
                      <div
                        className={`group/item absolute left-2 right-4 z-10 cursor-pointer overflow-hidden rounded-xl border border-white/20 p-2.5 text-white shadow-xs transition-all hover:z-20 hover:scale-[1.005] hover:shadow-md ${
                          event.isCompleted ? 'line-through opacity-50' : ''
                        }`}
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          vm.handleOpenEditEvent(event)
                        }}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: eventColor,
                        }}
                        title={`${event.title} (${formatEventTime(event.startDate, event.endDate, false)})`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold leading-tight opacity-90">
                          <span className="flex items-center gap-1.5">
                            <Icon className="size-3 text-white/80 shrink-0" name="clock" />
                            {formatEventTime(event.startDate, event.endDate, false)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {event.calendar && (
                              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
                                {event.calendar.name}
                              </span>
                            )}
                            {isTask && (
                              <span className="rounded-sm bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                                Nhiệm vụ
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 truncate text-sm font-bold leading-snug sm:text-base">
                          {event.title}
                        </div>

                        {height >= 70 && event.location && (
                          <div className="mt-1 flex items-center gap-1 truncate text-xs opacity-90">
                            <Icon className="size-3 shrink-0" name="mapPin" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {height >= 95 && event.description && (
                          <p className="mt-1 line-clamp-2 text-xs opacity-85">
                            {event.description}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : vm.viewMode === 'week' ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-transparent">
              {/* Header 7 cột ngày */}
              <div className="flex border-b border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                {/* Múi giờ bên trái */}
                <div className="flex w-14 sm:w-16 shrink-0 select-none items-end justify-center border-r border-slate-200/70 pb-2 text-[11px] font-semibold text-slate-400 dark:border-white/10">
                  {timeZoneHeaderLabel}
                </div>

                {/* 7 cột ngày */}
                <div className="grid flex-1 grid-cols-7 divide-x divide-slate-200/70 py-2.5 text-center dark:divide-white/10">
                  {weekDays.map((wd) => {
                    const isCurrentDay =
                      today.getDate() === wd.dayNum &&
                      today.getMonth() === wd.date.getMonth() &&
                      today.getFullYear() === wd.date.getFullYear()

                    return (
                      <div className="px-1" key={wd.dateKey}>
                        <span
                          className={`block text-[11px] font-semibold uppercase tracking-wider ${
                            isCurrentDay
                              ? 'font-bold text-blue-600 dark:text-blue-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {wd.weekdayLabel}
                        </span>
                        <span
                          className={`mx-auto mt-0.5 text-xl font-medium sm:text-2xl ${
                            isCurrentDay
                              ? 'grid size-8 sm:size-9 place-items-center rounded-full bg-blue-600 font-bold text-white shadow-xs'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {wd.dayNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Hàng sự kiện Cả ngày */}
              {hasAnyWeekAllDay && (
                <div className="flex border-b border-slate-200 bg-slate-50/30 py-1 dark:border-white/10 dark:bg-white/2">
                  <div className="flex w-14 sm:w-16 shrink-0 items-center justify-end border-r border-slate-200/70 pr-2 text-[10px] font-medium text-slate-400 dark:border-white/10">
                    Cả ngày
                  </div>
                  <div className="grid flex-1 grid-cols-7 divide-x divide-slate-200/70 px-0.5 dark:divide-white/10">
                    {weekDays.map((wd) => {
                      const dayAllDays = (eventsByDate[wd.dateKey] ?? []).filter((e) => e.isAllDay)
                      return (
                        <div className="space-y-1 px-1" key={`allday-${wd.dateKey}`}>
                          {dayAllDays.map((event) => {
                            const eventColor = event.color || event.calendar?.color || '#2563EB'
                            return (
                              <button
                                className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-white shadow-2xs hover:brightness-105"
                                key={event.id}
                                onClick={() => vm.handleOpenEditEvent(event)}
                                style={{ backgroundColor: eventColor }}
                                title={event.title}
                                type="button"
                              >
                                {event.title}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Lưới 24 giờ dọc */}
              <div
                className="relative flex max-h-[620px] select-none overflow-y-auto"
                ref={timeGridRef}
              >
                {/* Trục 24 giờ bên trái */}
                <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200/70 bg-white dark:border-white/10 dark:bg-transparent">
                  {HOURS_24.map((h, i) => (
                    <div className="relative h-[48px]" key={h.hour}>
                      {i > 0 && (
                        <span className="absolute -top-2.5 right-2 select-none text-[10px] font-medium text-slate-400">
                          {h.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 7 cột theo ngày */}
                <div className="relative grid flex-1 grid-cols-7 divide-x divide-slate-100 dark:divide-white/5">
                  {weekDays.map((wd) => {
                    const isCurrentDay =
                      today.getDate() === wd.dayNum &&
                      today.getMonth() === wd.date.getMonth() &&
                      today.getFullYear() === wd.date.getFullYear()

                    const timedEvents = (eventsByDate[wd.dateKey] ?? []).filter((e) => !e.isAllDay)

                    return (
                      <div className="relative" key={wd.dateKey}>
                        {/* 24 ô giờ nền */}
                        {HOURS_24.map((h) => (
                          <div
                            className="h-[48px] cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/20 dark:border-white/5 dark:hover:bg-white/5"
                            key={h.hour}
                            onClick={() => {
                              const clickD = new Date(
                                wd.date.getFullYear(),
                                wd.date.getMonth(),
                                wd.date.getDate(),
                                h.hour,
                                0,
                                0,
                              )
                              vm.handleOpenCreateEvent(clickD)
                            }}
                            title={`Thêm lịch trình lúc ${h.label}`}
                          />
                        ))}

                        {/* Vạch đỏ chỉ giờ thực tế */}
                        {isCurrentDay && (
                          <div
                            className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                            style={{ top: `${currentIndicatorTop}px` }}
                          >
                            <div className="-ml-1.5 size-2.5 rounded-full bg-red-500 shadow-xs" />
                            <div className="flex-1 border-t-2 border-red-500" />
                          </div>
                        )}

                        {/* Thẻ sự kiện có giờ */}
                        {timedEvents.map((event) => {
                          const startD = new Date(event.startDate)
                          const endD = new Date(event.endDate)
                          const startMin = startD.getHours() * 60 + startD.getMinutes()
                          const rawDuration = (endD.getTime() - startD.getTime()) / 60000
                          const durationMin = Math.max(
                            25,
                            Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 60,
                          )
                          const top = (startMin / 60) * HOUR_HEIGHT
                          const height = Math.max(22, (durationMin / 60) * HOUR_HEIGHT)
                          const eventColor = event.color || event.calendar?.color || '#2563EB'
                          const isTask = event.entryType === 'task'

                          return (
                            <div
                              className={`group/item absolute inset-x-0.5 z-10 cursor-pointer overflow-hidden rounded-md px-1.5 py-1 text-white shadow-2xs transition-all hover:z-20 hover:scale-[1.01] hover:shadow-md ${
                                event.isCompleted ? 'line-through opacity-50' : ''
                              }`}
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                vm.handleOpenEditEvent(event)
                              }}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                backgroundColor: eventColor,
                              }}
                              title={`${event.title} (${formatEventTime(event.startDate, event.endDate, event.isAllDay)})`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-semibold leading-tight opacity-90">
                                <span className="truncate">
                                  {startD.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })}
                                </span>
                                {isTask && (
                                  <span className="ml-1 size-1.5 shrink-0 rounded-xs bg-white/90" />
                                )}
                              </div>
                              <div className="mt-0.5 truncate text-xs font-bold leading-tight">
                                {event.title}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : vm.viewMode === 'month' ? (
            <div className="mt-3">
              <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-400">
                {weekdays.map((wd) => (
                  <div key={wd}>{wd}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-100 dark:divide-white/5 dark:border-white/5">
                {Array.from({ length: totalGridCells }).map((_, idx) => {
                  let cellDate: Date
                  let isCurrentMonth = true

                  if (idx < startOffset) {
                    const prevD = prevMonthLastDay - startOffset + idx + 1
                    cellDate = new Date(currentYear, currentMonth - 1, prevD)
                    isCurrentMonth = false
                  } else if (idx >= startOffset + daysInCurrentMonth) {
                    const nextD = idx - (startOffset + daysInCurrentMonth) + 1
                    cellDate = new Date(currentYear, currentMonth + 1, nextD)
                    isCurrentMonth = false
                  } else {
                    const dNum = idx - startOffset + 1
                    cellDate = new Date(currentYear, currentMonth, dNum)
                  }

                  const y = cellDate.getFullYear()
                  const m = cellDate.getMonth() + 1
                  const d = cellDate.getDate()
                  const dateKey = `${y}-${m < 10 ? `0${m}` : m}-${d < 10 ? `0${d}` : d}`

                  const isCurrentDay =
                    today.getDate() === d &&
                    today.getMonth() === cellDate.getMonth() &&
                    today.getFullYear() === cellDate.getFullYear()

                  const dayEvents = eventsByDate[dateKey] ?? []
                  const isHovered = hoveredDateCell === dateKey

                  return (
                    <div
                      className={`group relative flex min-h-[115px] flex-col p-1.5 transition-colors sm:p-2 ${
                        isCurrentMonth
                          ? 'bg-white hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-white/5'
                          : 'bg-slate-50/40 text-slate-300 dark:bg-white/2 dark:text-slate-600'
                      }`}
                      key={dateKey}
                      onMouseEnter={() => setHoveredDateCell(dateKey)}
                      onMouseLeave={() => setHoveredDateCell(null)}
                    >
                      <div className="flex items-center justify-between pb-1">
                        <span
                          className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                            isCurrentDay
                              ? 'bg-blue-600 font-bold text-white shadow-xs'
                              : isCurrentMonth
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {d}
                        </span>

                        {isHovered && isCurrentMonth && (
                          <button
                            aria-label={`Thêm sự kiện ngày ${d}`}
                            className="grid size-5 place-items-center rounded-full bg-slate-200/80 text-slate-700 hover:bg-blue-600 hover:text-white dark:bg-white/10 dark:text-white dark:hover:bg-blue-600"
                            onClick={() => vm.handleOpenCreateEvent(cellDate)}
                            title="Thêm sự kiện vào ngày này"
                            type="button"
                          >
                            <Icon className="size-3" name="plus" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event) => {
                          const eventColor = event.color || event.calendar?.color || '#2563EB'
                          const isTask = event.entryType === 'task'

                          return (
                            <button
                              className="group/chip flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-white shadow-2xs transition-transform hover:scale-[1.02]"
                              key={event.id}
                              onClick={() => vm.handleOpenEditEvent(event)}
                              style={{ backgroundColor: eventColor }}
                              title={`${event.title} (${formatEventTime(event.startDate, event.endDate, event.isAllDay)})`}
                              type="button"
                            >
                              {isTask ? (
                                <span className="size-1.5 shrink-0 rounded-xs bg-white/90" />
                              ) : (
                                <span className="size-1.5 shrink-0 rounded-full bg-white/90" />
                              )}
                              <span className="truncate">
                                {!event.isAllDay && (
                                  <span className="mr-1 opacity-80">
                                    {new Date(event.startDate).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                    })}
                                  </span>
                                )}
                                {event.title}
                              </span>
                            </button>
                          )
                        })}

                        {dayEvents.length > 3 && (
                          <div className="px-1 text-[10px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400">
                            + {dayEvents.length - 3} mục nữa
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : vm.viewMode === 'year' ? (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, mIdx) => {
                const monthDate = new Date(currentYear, mIdx, 1)
                const monthName = monthDate.toLocaleDateString('vi-VN', { month: 'long' })
                const mDays = new Date(currentYear, mIdx + 1, 0).getDate()
                const mOffset = (monthDate.getDay() - weekStartsOn + 7) % 7

                return (
                  <div
                    className="cursor-pointer rounded-xl border border-slate-200/80 p-3 transition-all hover:border-blue-500 hover:shadow-xs dark:border-white/10 dark:hover:border-blue-400"
                    key={mIdx}
                    onClick={() => {
                      vm.handleSelectDate(new Date(currentYear, mIdx, 1))
                      vm.setViewMode('month')
                    }}
                  >
                    <span className="block text-center text-xs font-bold capitalize text-slate-800 dark:text-white">
                      {monthName}
                    </span>

                    <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] text-slate-400">
                      {shortWeekdays.map((wd) => (
                        <div key={wd}>{wd}</div>
                      ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-[10px]">
                      {Array.from({ length: mOffset }).map((__, oIdx) => (
                        <div className="size-5" key={`offset-${oIdx}`} />
                      ))}
                      {Array.from({ length: mDays }).map((__, dIdx) => {
                        const dNum = dIdx + 1
                        const mStr = mIdx + 1 < 10 ? `0${mIdx + 1}` : mIdx + 1
                        const dStr = dNum < 10 ? `0${dNum}` : dNum
                        const key = `${currentYear}-${mStr}-${dStr}`
                        const hasEvents = (eventsByDate[key] ?? []).length > 0
                        const isCurrentDay =
                          today.getDate() === dNum && today.getMonth() === mIdx && today.getFullYear() === currentYear

                        return (
                          <div
                            className={`mx-auto grid size-5 place-items-center rounded-full font-medium ${
                              isCurrentDay
                                ? 'bg-blue-600 font-bold text-white'
                                : hasEvents
                                  ? 'bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  : 'text-slate-700 dark:text-slate-300'
                            }`}
                            key={dNum}
                          >
                            {dNum}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 pt-2 dark:divide-white/5">
              {sortedListDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                    <Icon className="size-6" name="calendar" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Chưa có sự kiện nào.</p>
                </div>
              ) : (
                sortedListDates.map((dateKey) => {
                  const dayEvents = eventsByDate[dateKey] ?? []

                  return (
                    <div className="py-4 first:pt-2" key={dateKey}>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {formatDayHeader(dateKey)}
                      </div>

                      <div className="space-y-2">
                        {dayEvents.map((event) => {
                          const isTask = event.entryType === 'task'
                          const eventColor = event.color || event.calendar?.color || '#2563EB'

                          return (
                            <div
                              className={`group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-slate-300 hover:bg-white sm:px-4 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/15 dark:hover:bg-white/10 ${
                                event.isCompleted ? 'opacity-50' : ''
                              }`}
                              key={event.id}
                            >
                              <div className="flex items-center gap-3.5">
                                {isTask ? (
                                  <button
                                    aria-label={event.isCompleted ? 'Mở lại nhiệm vụ' : 'Đánh dấu hoàn thành'}
                                    className={`grid size-5 shrink-0 place-items-center rounded-md border transition-all ${
                                      event.isCompleted
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-slate-300 hover:border-emerald-500 dark:border-white/20'
                                    }`}
                                    onClick={() => vm.handleToggleComplete(event.id, event.isCompleted)}
                                    type="button"
                                  >
                                    {event.isCompleted && <Icon className="size-3.5" name="check" />}
                                  </button>
                                ) : (
                                  <span
                                    className="size-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: eventColor }}
                                  />
                                )}

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-sm font-semibold text-slate-900 dark:text-white ${
                                        event.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                      }`}
                                    >
                                      {event.title}
                                    </span>

                                    {event.calendar && (
                                      <span
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                                        style={{ backgroundColor: event.calendar.color }}
                                      >
                                        {event.calendar.name}
                                      </span>
                                    )}

                                    {event.availability === 'free' && (
                                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                        🟢 Rảnh
                                      </span>
                                    )}

                                    {event.recurrence && event.recurrence.frequency !== 'none' && (
                                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                        🔄 Lặp lại
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span>{formatEventTime(event.startDate, event.endDate, event.isAllDay)}</span>
                                    {event.location && (
                                      <span className="flex items-center gap-1">
                                        <Icon className="size-3 text-slate-400" name="mapPin" />
                                        {event.location}
                                      </span>
                                    )}
                                    {event.onlineMeetingUrl && (
                                      <a
                                        className="flex items-center gap-1 text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                                        href={event.onlineMeetingUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        <Icon className="size-3" name="link" />
                                        Họp online
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  aria-label="Sửa"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                                  onClick={() => vm.handleOpenEditEvent(event)}
                                  type="button"
                                >
                                  <Icon className="size-4" name="edit" />
                                </button>
                                <button
                                  aria-label="Xóa"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                  onClick={() => vm.handleDeleteEvent(event.id)}
                                  type="button"
                                >
                                  <Icon className="size-4" name="trash" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </main>
      </div>

      <EventModal
        categories={vm.categories.filter((category) => !category.settings?.archived || category.id === vm.editingEvent?.calendarId)}
        initialDate={vm.selectedModalDate}
        initialEvent={vm.editingEvent}
        isOpen={vm.isEventModalOpen}
        onClose={vm.handleCloseEventModal}
        onOpenCreateCategory={vm.handleOpenCreateCategory}
        onSaved={vm.refreshData}
      />

      <CategoryModal
        initialCategory={vm.editingCategory}
        isOpen={vm.isCategoryModalOpen}
        onClose={() => vm.setIsCategoryModalOpen(false)}
        onSaved={vm.refreshData}
      />

    </div>
  )
}
