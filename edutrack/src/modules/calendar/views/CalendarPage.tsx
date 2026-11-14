import { useState } from 'react'
import { Icon } from '../../../shared/components/Icon'
import type { CalendarEvent } from '../models/calendar.types'
import { useCalendarViewModel, type CalendarViewMode } from '../viewmodels/useCalendarViewModel'
import { CalendarSidebar } from './components/CalendarSidebar'
import { CategoryModal } from './components/CategoryModal'
import { EventModal } from './components/EventModal'

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const SHORT_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

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
  const [hoveredDateCell, setHoveredDateCell] = useState<string | null>(null)

  const currentYear = vm.currentDate.getFullYear()
  const currentMonth = vm.currentDate.getMonth()
  const today = new Date()

  // Lập bản đồ sự kiện theo ngày YYYY-MM-DD
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const event of vm.events) {
    const rawKey = event.startDate.includes('T') ? event.startDate.split('T')[0] : event.startDate
    const dateKey = rawKey || 'Chưa xác định'
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
    eventsByDate[dateKey]?.push(event)
  }

  // =================== DỮ LIỆU TÍNH TOÁN CHO TỪNG VIEW ===================

  // 1. Dữ liệu cho Month View
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  let startOffset = firstDayOfMonth.getDay() - 1
  if (startOffset === -1) startOffset = 6
  const daysInCurrentMonth = lastDayOfMonth.getDate()
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
  const totalGridCells = Math.ceil((startOffset + daysInCurrentMonth) / 7) * 7

  // 2. Dữ liệu cho Week View (7 ngày của tuần đang chọn)
  const currentDayOfWeek = vm.currentDate.getDay()
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
  const weekStartMonday = new Date(
    vm.currentDate.getFullYear(),
    vm.currentDate.getMonth(),
    vm.currentDate.getDate() + diffToMonday,
  )
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(weekStartMonday.getFullYear(), weekStartMonday.getMonth(), weekStartMonday.getDate() + idx)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const dayNum = d.getDate()
    const dateKey = `${y}-${m < 10 ? `0${m}` : m}-${dayNum < 10 ? `0${dayNum}` : dayNum}`
    return { date: d, dateKey, dayNum, weekdayLabel: WEEKDAYS[idx] }
  })

  // 3. Dữ liệu cho Day View (ngày đang chọn)
  const selectedDayKey = `${vm.currentDate.getFullYear()}-${vm.currentDate.getMonth() + 1 < 10 ? `0${vm.currentDate.getMonth() + 1}` : vm.currentDate.getMonth() + 1}-${vm.currentDate.getDate() < 10 ? `0${vm.currentDate.getDate()}` : vm.currentDate.getDate()}`
  const selectedDayEvents = eventsByDate[selectedDayKey] ?? []

  // 4. Dữ liệu cho List View
  const sortedListDates = Object.keys(eventsByDate).sort()

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) space-y-4">
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Sidebar bên trái: Tạo mới + Mini Calendar + Lịch của tôi */}
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

        {/* Khung Lịch chính */}
        <main className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-white/10 dark:bg-white/5">
          {/* Header Toolbar: Điều hướng + 5 View Modes + Tabs lọc */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-center dark:border-white/10">
            {/* Cụm điều hướng */}
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

            {/* View Mode Switcher (Ngày, Tuần, Tháng, Năm, Danh sách) & Tabs lọc */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 5 View Modes */}
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

              {/* Lọc: Tất cả / Sự kiện / Nhiệm vụ */}
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

          {/* ======================= VÙNG HIỂN THỊ CHÍNH ======================= */}
          {vm.isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Icon className="size-8 animate-spin text-blue-600" name="clock" />
              <p className="mt-3 text-xs font-semibold text-slate-400">Đang đồng bộ dữ liệu lịch...</p>
            </div>
          ) : vm.viewMode === 'day' ? (
            /* 1. CHẾ ĐỘ NGÀY (DAY VIEW) */
            <div className="mt-3 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  Lịch trình ngày {vm.currentDate.toLocaleDateString('vi-VN')} ({selectedDayEvents.length} mục)
                </span>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                  onClick={() => vm.handleOpenCreateEvent(vm.currentDate)}
                  type="button"
                >
                  + Thêm mục vào ngày này
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                    <Icon className="size-6" name="calendar" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Ngày này hiện không có lịch trình nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => {
                    const isTask = event.entryType === 'task'
                    const eventColor = event.color || event.calendar?.color || '#2563EB'

                    return (
                      <div
                        className={`group flex items-start justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-slate-300 hover:bg-white dark:border-white/5 dark:bg-white/5 dark:hover:border-white/15 dark:hover:bg-white/10 ${
                          event.isCompleted ? 'opacity-50' : ''
                        }`}
                        key={event.id}
                        style={{ borderLeftWidth: '5px', borderLeftColor: eventColor }}
                      >
                        <div className="flex flex-1 items-start gap-3.5">
                          {isTask ? (
                            <button
                              aria-label={event.isCompleted ? 'Mở lại' : 'Hoàn thành'}
                              className={`mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-md border transition-all ${
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
                              className="mt-1 size-3.5 shrink-0 rounded-full"
                              style={{ backgroundColor: eventColor }}
                            />
                          )}

                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`text-base font-bold text-slate-900 dark:text-white ${
                                  event.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                }`}
                              >
                                {event.title}
                              </h4>
                              {event.calendar && (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                                  style={{ backgroundColor: event.calendar.color }}
                                >
                                  {event.calendar.name}
                                </span>
                              )}
                              {isTask && (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  {event.priority === 'urgent' && '🔥 Khẩn cấp'}
                                  {event.priority === 'high' && '⚠️ Ưu tiên cao'}
                                  {event.priority === 'medium' && '📘 Trung bình'}
                                  {event.priority === 'low' && '⚪ Thấp'}
                                </span>
                              )}
                              {event.availability === 'free' && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  🟢 Rảnh
                                </span>
                              )}
                              {event.recurrence && event.recurrence.frequency !== 'none' && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300" title="Sự kiện lặp lại">
                                  🔄 Lặp lại
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Icon className="size-3.5 text-slate-400" name="clock" />
                                {formatEventTime(event.startDate, event.endDate, event.isAllDay)}
                              </span>

                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <Icon className="size-3.5 text-slate-400" name="mapPin" />
                                  {event.location}
                                </span>
                              )}

                              {event.onlineMeetingUrl && (
                                <a
                                  className="flex items-center gap-1 font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                                  href={event.onlineMeetingUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  <Icon className="size-3.5" name="link" />
                                  Họp trực tuyến
                                </a>
                              )}

                              {event.submissionUrl && (
                                <a
                                  className="flex items-center gap-1 font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400"
                                  href={event.submissionUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  <Icon className="size-3.5" name="link" />
                                  Link nộp bài / tài liệu
                                </a>
                              )}
                            </div>

                            {/* Checklist con của Task */}
                            {event.checklist && event.checklist.length > 0 && (
                              <div className="mt-2 space-y-1 rounded-xl bg-white p-2.5 shadow-2xs dark:bg-white/5">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">
                                  Checklist ({event.checklist.filter((i) => i.isCompleted).length}/{event.checklist.length})
                                </span>
                                {event.checklist.map((item) => (
                                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300" key={item.id}>
                                    <span className={item.isCompleted ? 'text-emerald-500' : 'text-slate-300'}>
                                      {item.isCompleted ? '✓' : '○'}
                                    </span>
                                    <span className={item.isCompleted ? 'line-through text-slate-400' : ''}>
                                      {item.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {event.description && (
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            aria-label="Sửa"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                            onClick={() => vm.handleOpenEditEvent(event)}
                            type="button"
                          >
                            <Icon className="size-4" name="edit" />
                          </button>
                          <button
                            aria-label="Xóa"
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
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
              )}
            </div>
          ) : vm.viewMode === 'week' ? (
            /* 2. CHẾ ĐỘ TUẦN (WEEK VIEW) */
            <div className="mt-3">
              <div className="grid grid-cols-7 divide-x divide-slate-100 border-b border-slate-200 pb-2 text-center text-xs dark:divide-white/5 dark:border-white/10">
                {weekDays.map((wd) => {
                  const isCurrentDay =
                    today.getDate() === wd.dayNum &&
                    today.getMonth() === wd.date.getMonth() &&
                    today.getFullYear() === wd.date.getFullYear()

                  return (
                    <div className="px-1" key={wd.dateKey}>
                      <span className="block text-[11px] font-semibold text-slate-400">{wd.weekdayLabel}</span>
                      <span
                        className={`mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-xs font-bold ${
                          isCurrentDay
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {wd.dayNum}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 7 Cột sự kiện trong tuần */}
              <div className="grid min-h-[450px] grid-cols-7 divide-x divide-slate-100 border-b border-slate-100 dark:divide-white/5 dark:border-white/5">
                {weekDays.map((wd) => {
                  const dayEvents = eventsByDate[wd.dateKey] ?? []

                  return (
                    <div className="p-1.5 space-y-1.5" key={wd.dateKey}>
                      {dayEvents.map((event) => {
                        const eventColor = event.color || event.calendar?.color || '#2563EB'
                        const isTask = event.entryType === 'task'

                        return (
                          <button
                            className="group/chip flex w-full flex-col rounded-xl p-2 text-left text-xs font-semibold text-white shadow-2xs transition-transform hover:scale-[1.02]"
                            key={event.id}
                            onClick={() => vm.handleOpenEditEvent(event)}
                            style={{ backgroundColor: eventColor }}
                            type="button"
                          >
                            <span className="flex items-center justify-between text-[10px] opacity-85">
                              <span>{formatEventTime(event.startDate, event.endDate, event.isAllDay)}</span>
                              {isTask && <span>⏰</span>}
                            </span>
                            <span className="mt-0.5 line-clamp-2 font-bold">{event.title}</span>
                          </button>
                        )
                      })}

                      {dayEvents.length === 0 && (
                        <div
                          className="flex h-full min-h-[120px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-transparent hover:border-slate-200 dark:hover:border-white/10"
                          onClick={() => vm.handleOpenCreateEvent(wd.date)}
                        >
                          <span className="text-[11px] font-medium text-slate-300 opacity-0 hover:opacity-100 dark:text-slate-600">
                            + Thêm
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : vm.viewMode === 'month' ? (
            /* 3. CHẾ ĐỘ THÁNG (MONTH GRID VIEW) */
            <div className="mt-3">
              <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-400">
                {WEEKDAYS.map((wd) => (
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
            /* 4. CHẾ ĐỘ NĂM (YEAR VIEW - 12 THÁNG) */
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, mIdx) => {
                const monthDate = new Date(currentYear, mIdx, 1)
                const monthName = monthDate.toLocaleDateString('vi-VN', { month: 'long' })
                const mDays = new Date(currentYear, mIdx + 1, 0).getDate()
                let mOffset = monthDate.getDay() - 1
                if (mOffset === -1) mOffset = 6

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
                      {SHORT_WEEKDAYS.map((wd) => (
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
            /* 5. CHẾ ĐỘ DANH SÁCH (LIST VIEW) */
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

      {/* Modal Sự kiện / Nhiệm vụ */}
      <EventModal
        categories={vm.categories}
        initialDate={vm.selectedModalDate}
        initialEvent={vm.editingEvent}
        isOpen={vm.isEventModalOpen}
        onClose={vm.handleCloseEventModal}
        onOpenCreateCategory={vm.handleOpenCreateCategory}
        onSaved={vm.refreshData}
      />

      {/* Modal Tạo / Sửa Lịch */}
      <CategoryModal
        initialCategory={vm.editingCategory}
        isOpen={vm.isCategoryModalOpen}
        onClose={() => vm.setIsCategoryModalOpen(false)}
        onSaved={vm.refreshData}
      />
    </div>
  )
}
