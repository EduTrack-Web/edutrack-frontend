import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { Icon } from '@/shared/components/Icon'
import type { CalendarEvent } from '@/modules/calendar/models/calendar.types'
import {
  formatLunarDateLabel,
  getLunarDateTooltip,
  isFirstOrLastDayOfSolarMonth,
} from '@/modules/calendar/models/lunarCalendar'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import {
  formatHolidayTooltip,
  VIETNAM_HOLIDAY_BADGE_CLASSES,
  VIETNAM_HOLIDAY_DOT_CLASS,
} from '@/modules/calendar/models/vietnameseHolidays'
import { useCalendarViewModel, type CalendarViewMode } from '@/modules/calendar/viewmodels/useCalendarViewModel'
import { CalendarSidebar } from './components/CalendarSidebar'
import { CalendarDateLabel } from './components/CalendarDateLabel'
import { CalendarSettingsModal } from './components/CalendarSettingsModal'
import { CategoryModal } from './components/CategoryModal'
import { EventModal } from './components/EventModal'
import { TaskTickButton } from './components/TaskTickButton'
import { RecurringConfirmationDialog } from './components/RecurringConfirmationDialog'
import { RecurrenceScopeModal, type RecurrenceScopeMode } from './components/RecurrenceScopeModal'
import {
  buildEventsByDateMap,
  buildTimedSegmentsForDate,
  formatDateKey,
  layoutDayTimedSegments,
  unifyMultiDaySegmentWidths,
} from '../utils/calendarLayout'

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

function formatMinutesToHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440
  const hh = Math.floor(wrapped / 60)
  const mm = wrapped % 60
  return `${hh < 10 ? `0${hh}` : hh}:${mm < 10 ? `0${mm}` : mm}`
}

function formatEventTime(startStr: string, endStr: string, isAllDay: boolean): string {
  try {
    const start = new Date(startStr)
    const end = new Date(endStr)
    if (isAllDay) return 'Cả ngày'
    const timeStart = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const timeEnd = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (timeStart === timeEnd && start.toDateString() === end.toDateString()) {
      return timeStart
    }
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
  const { t } = useTranslation()
  const timeGridRef = useRef<HTMLDivElement>(null)
  const dayGridRef = useRef<HTMLDivElement>(null)
  const [hoveredDateCell, setHoveredDateCell] = useState<string | null>(null)
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    columnKey: string
    startMin: number
    endMin: number
    label: string
  } | null>(null)
  const dragGrabOffsetYRef = useRef(0)
  const isSuppressClickRef = useRef(false)

  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [pendingToggleTask, setPendingToggleTask] = useState<CalendarEvent | null>(null)
  const [isTogglingTask, setIsTogglingTask] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  const [pendingRecurringAction, setPendingRecurringAction] = useState<{
    event: CalendarEvent
    newStartDate: string
    newEndDate: string
    isAllDay?: boolean
    isSameDay: boolean
    isResize: boolean
    targetDate: string
  } | null>(null)

  const [resizingEvent, setResizingEvent] = useState<{
    event: CalendarEvent
    segmentId: string
    initialY: number
    initialHeight: number
    currentHeight: number
  } | null>(null)

  useEffect(() => {
    if (!resizingEvent) return

    const handlePointerMove = (e: PointerEvent) => {
      isSuppressClickRef.current = true
      const deltaY = e.clientY - resizingEvent.initialY
      const snappedDelta = Math.round(deltaY / 12) * 12
      const newHeight = Math.max(12, resizingEvent.initialHeight + snappedDelta)
      setResizingEvent((prev) => (prev ? { ...prev, currentHeight: newHeight } : null))
    }

    const handlePointerUp = async (e: PointerEvent) => {
      isSuppressClickRef.current = true
      window.setTimeout(() => {
        isSuppressClickRef.current = false
      }, 350)

      const deltaY = e.clientY - resizingEvent.initialY
      const snappedDelta = Math.round(deltaY / 12) * 12
      const addedMinutes = Math.round(snappedDelta / 12) * 15

      const event = resizingEvent.event
      setResizingEvent(null)

      if (addedMinutes === 0) return

      const origStart = new Date(event.startDate)
      const origEnd = new Date(event.endDate)
      const origDurationMs = Math.max(15 * 60000, origEnd.getTime() - origStart.getTime())
      const newDurationMs = Math.max(15 * 60000, origDurationMs + addedMinutes * 60000)
      const newEnd = new Date(origStart.getTime() + newDurationMs)

      const isRecurring = Boolean(
        (event.recurrence && event.recurrence.frequency !== 'none') ||
        (event as unknown as { _isOccurrence?: boolean })?._isOccurrence,
      )

      if (isRecurring) {
        setPendingRecurringAction({
          event,
          newStartDate: event.startDate,
          newEndDate: newEnd.toISOString(),
          isAllDay: false,
          isSameDay: true,
          isResize: true,
          targetDate: event.startDate,
        })
      } else {
        await vm.handleMoveEvent(event.id, event.startDate, newEnd.toISOString(), false)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [resizingEvent, vm])

  const handleResizeStart = (
    e: React.PointerEvent,
    event: CalendarEvent,
    segmentId: string,
    segmentHeight?: number,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    isSuppressClickRef.current = true
    const startD = new Date(event.startDate)
    const endD = new Date(event.endDate)
    const rawDuration = (endD.getTime() - startD.getTime()) / 60000
    const durationMin = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 30
    const initialH = segmentHeight ?? Math.max(20, (durationMin / 60) * HOUR_HEIGHT)

    setResizingEvent({
      event,
      segmentId,
      initialY: e.clientY,
      initialHeight: initialH,
      currentHeight: initialH,
    })
  }

  const handleRequestToggleTask = (event: CalendarEvent) => {
    const isRecurring = Boolean(
      (event.recurrence && event.recurrence.frequency !== 'none') ||
      (event as unknown as { _isOccurrence?: boolean })?._isOccurrence,
    )
    if (isRecurring) {
      setPendingToggleTask(event)
      return
    }
    void vm.handleToggleComplete(event.id, event.isCompleted)
  }

  const handleConfirmRecurringMove = async (mode: RecurrenceScopeMode) => {
    if (!pendingRecurringAction) return
    const action = pendingRecurringAction
    setPendingRecurringAction(null)
    await vm.handleMoveEvent(
      action.event.id,
      action.newStartDate,
      action.newEndDate,
      action.isAllDay,
      mode,
      action.targetDate,
    )
  }

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.stopPropagation()
    isSuppressClickRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    dragGrabOffsetYRef.current = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
  }

  const handleDragEnd = () => {
    setDraggedEvent(null)
    setDragOverTarget(null)
    setDragPreview(null)
    dragGrabOffsetYRef.current = 0
    window.setTimeout(() => {
      isSuppressClickRef.current = false
    }, 350)
  }

  const getSnappedMinutesFromColumn = (columnEl: HTMLElement, clientY: number): number => {
    const rect = columnEl.getBoundingClientRect()
    const rawTopPx = Math.max(0, Math.min(24 * HOUR_HEIGHT - 12, clientY - rect.top - dragGrabOffsetYRef.current))
    const quarterIndex = Math.round(rawTopPx / (HOUR_HEIGHT / 4))
    return Math.max(0, Math.min(24 * 60 - 15, quarterIndex * 15))
  }

  const handleTimedColumnDragOver = (e: React.DragEvent<HTMLDivElement>, columnKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (!draggedEvent) return
    const startMin = getSnappedMinutesFromColumn(e.currentTarget, e.clientY)
    const rawDurationMin = Math.round(
      (new Date(draggedEvent.endDate).getTime() - new Date(draggedEvent.startDate).getTime()) / 60000,
    )
    const durationMin = draggedEvent.isAllDay ? 60 : Math.max(15, Number.isFinite(rawDurationMin) ? rawDurationMin : 30)
    const endMin = startMin + durationMin
    const label = `${formatMinutesToHHMM(startMin)} – ${formatMinutesToHHMM(endMin)}`

    setDragPreview((prev) => {
      if (prev && prev.columnKey === columnKey && prev.startMin === startMin && prev.endMin === endMin) {
        return prev
      }
      return { columnKey, startMin, endMin, label }
    })
  }

  const handleDropOnMonthDay = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(null)
    setDragPreview(null)
    if (!draggedEvent) return

    isSuppressClickRef.current = true
    window.setTimeout(() => {
      isSuppressClickRef.current = false
    }, 350)

    const origStart = new Date(draggedEvent.startDate)
    const origEnd = new Date(draggedEvent.endDate)
    const durationMs = Math.max(0, origEnd.getTime() - origStart.getTime())

    let newStart: Date
    let newEnd: Date

    if (draggedEvent.isAllDay) {
      newStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0)
      newEnd = new Date(newStart.getTime() + durationMs)
    } else {
      newStart = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        origStart.getHours(),
        origStart.getMinutes(),
        0,
      )
      newEnd = new Date(newStart.getTime() + durationMs)
    }

    const isRecurring = Boolean(
      (draggedEvent.recurrence && draggedEvent.recurrence.frequency !== 'none') ||
      (draggedEvent as unknown as { _isOccurrence?: boolean })?._isOccurrence,
    )

    const isSameDay =
      origStart.getFullYear() === newStart.getFullYear() &&
      origStart.getMonth() === newStart.getMonth() &&
      origStart.getDate() === newStart.getDate()

    if (isRecurring) {
      setPendingRecurringAction({
        event: draggedEvent,
        newStartDate: newStart.toISOString(),
        newEndDate: newEnd.toISOString(),
        isAllDay: draggedEvent.isAllDay,
        isSameDay,
        isResize: false,
        targetDate: draggedEvent.startDate,
      })
      setDraggedEvent(null)
    } else {
      const targetId = draggedEvent.id
      setDraggedEvent(null)
      await vm.handleMoveEvent(targetId, newStart.toISOString(), newEnd.toISOString(), draggedEvent.isAllDay)
    }
  }

  const handleDropOnTimedColumn = async (e: React.DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(null)
    setDragPreview(null)
    if (!draggedEvent) return

    isSuppressClickRef.current = true
    window.setTimeout(() => {
      isSuppressClickRef.current = false
    }, 350)

    const origStart = new Date(draggedEvent.startDate)
    const origEnd = new Date(draggedEvent.endDate)
    const durationMs = draggedEvent.isAllDay ? 60 * 60000 : Math.max(0, origEnd.getTime() - origStart.getTime())

    const snappedStartMin = getSnappedMinutesFromColumn(e.currentTarget, e.clientY)
    const hour = Math.floor(snappedStartMin / 60)
    const targetMinute = snappedStartMin % 60
    dragGrabOffsetYRef.current = 0

    const newStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      hour,
      targetMinute,
      0,
    )
    const newEnd = new Date(newStart.getTime() + durationMs)

    const isRecurring = Boolean(
      (draggedEvent.recurrence && draggedEvent.recurrence.frequency !== 'none') ||
      (draggedEvent as unknown as { _isOccurrence?: boolean })?._isOccurrence,
    )

    const isSameDay =
      origStart.getFullYear() === newStart.getFullYear() &&
      origStart.getMonth() === newStart.getMonth() &&
      origStart.getDate() === newStart.getDate()

    if (isRecurring) {
      setPendingRecurringAction({
        event: draggedEvent,
        newStartDate: newStart.toISOString(),
        newEndDate: newEnd.toISOString(),
        isAllDay: false,
        isSameDay,
        isResize: false,
        targetDate: draggedEvent.startDate,
      })
      setDraggedEvent(null)
    } else {
      const targetId = draggedEvent.id
      setDraggedEvent(null)
      await vm.handleMoveEvent(targetId, newStart.toISOString(), newEnd.toISOString(), false)
    }
  }

  const handleDropOnAllDaySlot = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(null)
    setDragPreview(null)
    if (!draggedEvent) return

    isSuppressClickRef.current = true
    window.setTimeout(() => {
      isSuppressClickRef.current = false
    }, 350)

    const origStart = new Date(draggedEvent.startDate)
    const origEnd = new Date(draggedEvent.endDate)
    const durationMs = Math.max(0, origEnd.getTime() - origStart.getTime())

    const newStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0)
    const newEnd = new Date(newStart.getTime() + durationMs)

    const isRecurring = Boolean(
      (draggedEvent.recurrence && draggedEvent.recurrence.frequency !== 'none') ||
      (draggedEvent as unknown as { _isOccurrence?: boolean })?._isOccurrence,
    )

    const isSameDay =
      origStart.getFullYear() === newStart.getFullYear() &&
      origStart.getMonth() === newStart.getMonth() &&
      origStart.getDate() === newStart.getDate()

    if (isRecurring) {
      setPendingRecurringAction({
        event: draggedEvent,
        newStartDate: newStart.toISOString(),
        newEndDate: newEnd.toISOString(),
        isAllDay: true,
        isSameDay,
        isResize: false,
        targetDate: draggedEvent.startDate,
      })
      setDraggedEvent(null)
    } else {
      const targetId = draggedEvent.id
      setDraggedEvent(null)
      await vm.handleMoveEvent(targetId, newStart.toISOString(), newEnd.toISOString(), true)
    }
  }
  const [isCalendarSettingsOpen, setIsCalendarSettingsOpen] = useState(false)
  const currentYear = vm.currentDate.getFullYear()
  const currentMonth = vm.currentDate.getMonth()
  const today = new Date()
  const [selectedCalendarId] = vm.selectedCategoryIds
  const selectedSettings = vm.selectedCategoryIds.length === 1
    ? vm.categories.find((category) => category.id === selectedCalendarId)?.settings
    : undefined

  const weekStartsOn = 0
  const weekdays = GOOGLE_WEEKDAYS
  const shortWeekdays = GOOGLE_SHORT_WEEKDAYS
  const timeZoneHeaderLabel = getTimeZoneOffsetLabel(selectedSettings?.timeZone)

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

  const visibleEvents = vm.events.filter(
    (event) => !event.calendarId || vm.selectedCategoryIds.includes(event.calendarId),
  )
  const eventsByDate = buildEventsByDateMap(visibleEvents)

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
  const selectedDayTimedSegments = (() => {
    const dayDateKeys = new Set<string>([selectedDayKey])
    for (const ev of selectedDayEvents) {
      if (ev.isAllDay) continue
      const startD = new Date(ev.startDate)
      const endD = new Date(ev.endDate)
      const cursor = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate())
      const endDay = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate())
      let guard = 0
      while (cursor <= endDay && guard < 31) {
        dayDateKeys.add(formatDateKey(cursor))
        cursor.setDate(cursor.getDate() + 1)
        guard++
      }
    }
    const rawByDate: Record<string, ReturnType<typeof layoutDayTimedSegments>> = {}
    for (const key of dayDateKeys) {
      const [y, m, d] = key.split('-').map(Number)
      if (y && m && d) {
        rawByDate[key] = layoutDayTimedSegments(
          buildTimedSegmentsForDate(eventsByDate[key] ?? [], new Date(y, m - 1, d)),
        )
      }
    }
    return unifyMultiDaySegmentWidths(rawByDate)[selectedDayKey] ?? []
  })()

  const weekTimedSegmentsByDate = (() => {
    const rawByDate: Record<string, ReturnType<typeof layoutDayTimedSegments>> = {}
    for (const wd of weekDays) {
      rawByDate[wd.dateKey] = layoutDayTimedSegments(
        buildTimedSegmentsForDate(eventsByDate[wd.dateKey] ?? [], wd.date),
      )
    }
    return unifyMultiDaySegmentWidths(rawByDate)
  })()

  const isSelectedDateToday =
    today.getDate() === vm.currentDate.getDate() &&
    today.getMonth() === vm.currentDate.getMonth() &&
    today.getFullYear() === vm.currentDate.getFullYear()

  const currentMinuteRatio = today.getHours() * 60 + today.getMinutes()
  const currentIndicatorTop = (currentMinuteRatio / 60) * HOUR_HEIGHT

  const hasAnyWeekAllDay = weekDays.some((wd) => (eventsByDate[wd.dateKey] ?? []).some((e) => e.isAllDay))

  const sortedListDates = Object.keys(eventsByDate).sort()

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:gap-5">
        <CalendarSidebar
          categories={vm.categories}
          currentDate={vm.currentDate}
          isSavingPreferences={vm.isSavingPreferences}
          onDeleteCategory={(catId) => setCategoryToDelete(catId)}
          onOpenCreateCategory={vm.handleOpenCreateCategory}
          onOpenCreateEvent={() => vm.handleOpenCreateEvent()}
          onOpenEditCategory={vm.handleOpenEditCategory}
          onQuickChangeColor={vm.handleQuickChangeColor}
          onSelectDate={vm.handleSelectDate}
          onShowAllCategories={vm.handleShowAllCategories}
          onShowOnlyCategory={vm.handleShowOnlyCategory}
          onToggleCategoryVisibility={vm.handleToggleCategoryVisibility}
          onUpdatePreferences={vm.handleUpdateCalendarPreferences}
          preferences={vm.calendarPreferences}
          selectedCategoryIds={vm.selectedCategoryIds}
        />

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xs sm:p-4 lg:p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:pb-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-1.5 2xl:gap-2.5">
              <button
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 2xl:px-3.5 2xl:py-1.5 2xl:text-xs dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                onClick={vm.handleToday}
                type="button"
              >
                Hôm nay
              </button>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  aria-label="Trước"
                  className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100 2xl:size-8 dark:text-slate-400 dark:hover:bg-white/10"
                  onClick={vm.handlePrev}
                  type="button"
                >
                  <Icon className="size-4" name="arrowLeft" />
                </button>
                <button
                  aria-label="Sau"
                  className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100 2xl:size-8 dark:text-slate-400 dark:hover:bg-white/10"
                  onClick={vm.handleNext}
                  type="button"
                >
                  <Icon className="size-4" name="arrowRight" />
                </button>
              </div>

              <h2 className="min-w-0 truncate text-sm font-bold capitalize text-slate-900 2xl:text-lg dark:text-white">
                {vm.dateTitleLabel}
              </h2>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-1.5 sm:justify-end 2xl:gap-2.5">
              {/* Mobile, foldable & iPad (< xl): dropdown gọn để giữ 1 dòng duy nhất */}
              <div className="flex items-center gap-1.5 xl:hidden">
                <select
                  aria-label="Chế độ xem lịch"
                  className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-2 text-xs font-bold text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  onChange={(event) => vm.setViewMode(event.target.value as CalendarViewMode)}
                  value={vm.viewMode}
                >
                  {VIEW_OPTIONS.map((opt) => (
                    <option key={opt.mode} value={opt.mode}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Lọc loại mục"
                  className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-2 text-xs font-semibold text-slate-700 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  onChange={(event) => vm.setActiveFilterTab(event.target.value as 'all' | 'event' | 'task')}
                  value={vm.activeFilterTab}
                >
                  <option value="all">Tất cả</option>
                  <option value="event">Sự kiện</option>
                  <option value="task">Nhiệm vụ</option>
                </select>
              </div>

              {/* Laptop & màn hình lớn (xl+): nhóm nút đầy đủ trên cùng 1 dòng */}
              <div className="hidden items-center gap-1.5 xl:flex 2xl:gap-2.5">
                <div className="flex rounded-xl bg-slate-100 p-0.5 2xl:p-1 dark:bg-white/10">
                  {VIEW_OPTIONS.map((opt) => (
                    <button
                      className={`shrink-0 rounded-lg px-1.5 py-1 text-[11px] font-bold transition-all 2xl:px-2.5 2xl:text-xs ${
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

                <div className="flex rounded-xl bg-slate-100 p-0.5 2xl:p-1 dark:bg-white/10">
                  <button
                    className={`shrink-0 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-all 2xl:px-2 2xl:text-xs ${
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
                    className={`shrink-0 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-all 2xl:px-2 2xl:text-xs ${
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
                    className={`shrink-0 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-all 2xl:px-2 2xl:text-xs ${
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

              <button
                aria-label={t('calendar.settings.openAria')}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:min-h-9 lg:min-w-9 2xl:w-auto 2xl:px-3 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                onClick={() => setIsCalendarSettingsOpen(true)}
                title={t('calendar.settings.openAria')}
                type="button"
              >
                <Settings aria-hidden="true" className="size-4" />
                <span className="hidden 2xl:inline">{t('calendar.settings.button')}</span>
              </button>

            </div>
          </div>

          {vm.isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Icon className="size-8 animate-spin text-blue-600" name="clock" />
              <p className="mt-3 text-xs font-semibold text-slate-400">Đang đồng bộ dữ liệu lịch...</p>
            </div>
          ) : vm.viewMode === 'day' ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-transparent">
              
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 p-2.5 sm:px-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarDateLabel
                    isToday={isSelectedDateToday}
                    lunarDate={vm.lunarDatesBySolarDate[selectedDayKey]}
                    showLunarCalendar={vm.calendarPreferences.showLunarCalendar}
                    showLunarMonth
                    solarDay={vm.currentDate.getDate()}
                    variant="day"
                  />
                  <h3 className="text-sm font-bold capitalize text-slate-900 sm:text-base dark:text-white">
                    {vm.currentDate.toLocaleDateString('vi-VN', { weekday: 'long' })}
                  </h3>
                  {isSelectedDateToday && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Hôm nay
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({selectedDayEvents.length} mục)
                  </span>
                  {(vm.holidaysBySolarDate[selectedDayKey] ?? []).map((holiday) => (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                      key={holiday.id}
                      title={formatHolidayTooltip(holiday)}
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${VIETNAM_HOLIDAY_DOT_CLASS}`} />
                      <span>{holiday.name}</span>
                    </span>
                  ))}
                </div>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700"
                  onClick={() => vm.handleOpenCreateEvent(vm.currentDate)}
                  type="button"
                >
                  + Thêm mục vào ngày này
                </button>
              </div>

              
              {(selectedDayAllDayEvents.length > 0 || Boolean(draggedEvent)) && (
                <div
                  className={`flex items-center border-b border-slate-200 bg-slate-50/30 p-2 sm:px-3 transition-colors dark:border-white/10 dark:bg-white/2 ${
                    dragOverTarget === 'day-allday'
                      ? 'bg-blue-100/60 ring-2 ring-inset ring-blue-500 dark:bg-blue-950/40'
                      : ''
                  }`}
                  onDragLeave={() => {
                    if (dragOverTarget === 'day-allday') setDragOverTarget(null)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverTarget('day-allday')
                  }}
                  onDrop={(e) => handleDropOnAllDaySlot(e, vm.currentDate)}
                >
                  <span className="w-11 sm:w-16 shrink-0 pr-1.5 sm:pr-2 text-right text-[10px] font-semibold text-slate-400">
                    Cả ngày
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5 min-h-[28px]">
                    {selectedDayAllDayEvents.map((event) => {
                      const eventColor = event.color || event.calendar?.color || '#2563EB'
                      const isTaskItem = event.entryType === 'task'
                      const isBeingDragged = draggedEvent?.id === event.id
                      return (
                        <div
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-white shadow-2xs transition-all hover:scale-[1.01] ${
                            event.isCompleted ? 'opacity-55' : ''
                          } ${
                            isBeingDragged
                              ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                              : 'cursor-grab active:cursor-grabbing'
                          }`}
                          draggable={true}
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                            vm.handleOpenEditEvent(event)
                          }}
                          onDragEnd={handleDragEnd}
                          onDragStart={(e) => handleDragStart(e, event)}
                          style={{ backgroundColor: eventColor }}
                        >
                          {isTaskItem && (
                            <TaskTickButton
                              isCompleted={event.isCompleted}
                              onToggle={() => handleRequestToggleTask(event)}
                              size="sm"
                            />
                          )}
                          <span className={`min-w-0 flex-1 truncate text-left ${event.isCompleted ? 'line-through' : ''}`}>
                            {event.title}
                          </span>
                        </div>
                      )
                    })}
                    {dragOverTarget === 'day-allday' && (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                        + Thả vào đây để chuyển thành Cả ngày
                      </span>
                    )}
                  </div>
                </div>
              )}

              
              <div
                className="relative flex max-h-[620px] select-none overflow-y-auto"
                ref={dayGridRef}
              >
                
                <div className="w-11 sm:w-16 shrink-0 border-r border-slate-200/70 bg-white dark:border-white/10 dark:bg-transparent">
                  {HOURS_24.map((h, i) => (
                    <div className="relative h-[48px]" key={h.hour}>
                      {i > 0 && (
                        <span className="absolute -top-2.5 right-1.5 sm:right-2 select-none text-[10px] font-medium text-slate-400">
                          {h.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                
                <div
                  className="relative flex-1"
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setDragPreview((prev) => (prev?.columnKey === 'day-column' ? null : prev))
                    }
                  }}
                  onDragOver={(e) => handleTimedColumnDragOver(e, 'day-column')}
                  onDrop={(e) => handleDropOnTimedColumn(e, vm.currentDate)}
                >
                  {HOURS_24.map((h) => (
                    <div
                      className="relative h-[48px] cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/20 dark:border-white/5 dark:hover:bg-white/5"
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

                  {dragPreview?.columnKey === 'day-column' && draggedEvent && (
                    <div
                      className="pointer-events-none absolute inset-x-2 z-30 flex items-center gap-1.5 rounded-xl border-2 border-dashed border-blue-500 bg-blue-600/20 px-2.5 text-[11px] font-bold text-blue-950 dark:text-blue-100 shadow-sm backdrop-blur-2xs"
                      style={{
                        top: `${(dragPreview.startMin / 60) * HOUR_HEIGHT}px`,
                        height: `${Math.max(24, ((dragPreview.endMin - dragPreview.startMin) / 60) * HOUR_HEIGHT)}px`,
                      }}
                    >
                      <span className="shrink-0 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        {dragPreview.label}
                      </span>
                      <span className="truncate">{draggedEvent.title}</span>
                    </div>
                  )}

                  
                  {isSelectedDateToday && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                      style={{ top: `${currentIndicatorTop}px` }}
                    >
                      <div className="-ml-1.5 size-2.5 rounded-full bg-red-500 shadow-xs" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}

                  
                  {selectedDayTimedSegments.map((seg) => {
                    const { event, segmentId, startMin, durationMin, isZeroDuration, isStartSegment, isEndSegment, leftPct, widthPct, zIndex } = seg
                    const top = (startMin / 60) * HOUR_HEIGHT
                    const height = isZeroDuration ? 26 : Math.max(26, (durationMin / 60) * HOUR_HEIGHT)
                    const cardHeight = resizingEvent?.segmentId === segmentId ? resizingEvent.currentHeight : height
                    const eventColor = event.color || event.calendar?.color || '#2563EB'
                    const isTask = event.entryType === 'task'
                    const isBeingDragged = draggedEvent?.id === event.id
                    const segmentTimeLabel = formatEventTime(event.startDate, event.endDate, false)
                    const roundedClass =
                      isStartSegment && isEndSegment
                        ? 'rounded-xl'
                        : isStartSegment
                          ? 'rounded-t-xl rounded-b-xs border-b-dashed'
                          : isEndSegment
                            ? 'rounded-b-xl rounded-t-xs border-t-dashed'
                            : 'rounded-xs border-y-dashed'

                    return (
                      <div
                        className={`group/item absolute overflow-hidden border-[1.5px] border-white dark:border-[#021024] px-2.5 py-1 text-white shadow-sm transition-all hover:z-30! hover:shadow-md ${roundedClass} ${
                          event.isCompleted ? 'line-through opacity-50' : ''
                        } ${
                          isBeingDragged
                            ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                            : 'cursor-grab active:cursor-grabbing'
                        }`}
                        draggable={true}
                        key={segmentId}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                          vm.handleOpenEditEvent(event)
                        }}
                        onDragEnd={handleDragEnd}
                        onDragStart={(e) => handleDragStart(e, event)}
                        style={{
                          top: `${top}px`,
                          height: `${cardHeight}px`,
                          left: `calc(${leftPct}% + 4px)`,
                          width: `calc(${widthPct}% - 8px)`,
                          zIndex,
                          backgroundColor: eventColor,
                        }}
                        title={`${event.title} (${formatEventTime(event.startDate, event.endDate, false)})`}
                      >
                        <div className="flex h-full items-center justify-between text-xs font-semibold leading-tight opacity-90">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {isTask && (
                              <TaskTickButton
                                isCompleted={event.isCompleted}
                                onToggle={() => handleRequestToggleTask(event)}
                              />
                            )}
                            <Icon className="size-3 text-white/80 shrink-0" name="clock" />
                            <span className="font-bold opacity-90 shrink-0">
                              {segmentTimeLabel}
                            </span>
                            <span className="truncate">{event.title}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {widthPct >= 50 && event.calendar ? (
                              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
                                {event.calendar.name}
                              </span>
                            ) : widthPct >= 50 && isTask ? (
                              <span className="rounded-sm bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                                Độc lập
                              </span>
                            ) : null}
                            {widthPct >= 50 && isTask && event.calendar && (
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

                        {isEndSegment && (
                          <div
                            aria-label="Kéo đổi thời lượng"
                            className="absolute bottom-0 inset-x-0 h-2 cursor-ns-resize opacity-0 group-hover/item:opacity-100 transition-opacity bg-black/20 flex items-center justify-center z-30"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                            onPointerDown={(e) => handleResizeStart(e, event, segmentId, height)}
                            title="Kéo cạnh dưới để tăng hoặc giảm thời lượng"
                          >
                            <div className="h-0.5 w-6 rounded-full bg-white/80 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : vm.viewMode === 'week' ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-transparent">
              <div className="min-w-[520px] sm:min-w-0">
              
              <div className="flex border-b border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                
                <div className="flex w-11 sm:w-16 shrink-0 select-none items-end justify-center border-r border-slate-200/70 pb-2 text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:border-white/10">
                  {timeZoneHeaderLabel}
                </div>

                
                <div className="grid flex-1 grid-cols-7 divide-x divide-slate-200/70 py-2 sm:py-2.5 text-center dark:divide-white/10">
                  {weekDays.map((wd, weekIndex) => {
                    const isCurrentDay =
                      today.getDate() === wd.dayNum &&
                      today.getMonth() === wd.date.getMonth() &&
                      today.getFullYear() === wd.date.getFullYear()

                    return (
                      <div className="px-0.5 sm:px-1" key={wd.dateKey}>
                        <span
                          className={`block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${
                            isCurrentDay
                              ? 'font-bold text-blue-600 dark:text-blue-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="sm:hidden">{shortWeekdays[weekIndex]}</span>
                          <span className="hidden sm:inline">{wd.weekdayLabel}</span>
                        </span>
                        <span className="mt-0.5 inline-flex justify-center">
                          <CalendarDateLabel
                            isToday={isCurrentDay}
                            lunarDate={vm.lunarDatesBySolarDate[wd.dateKey]}
                            showLunarCalendar={vm.calendarPreferences.showLunarCalendar}
                            showLunarMonth={weekIndex === 0}
                            solarDay={wd.dayNum}
                            variant="week"
                          />
                        </span>
                        {(vm.holidaysBySolarDate[wd.dateKey] ?? []).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {(vm.holidaysBySolarDate[wd.dateKey] ?? []).slice(0, 2).map((holiday) => (
                              <div
                                className={`truncate rounded border px-1 py-0.5 text-[10px] font-semibold ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                                key={holiday.id}
                                title={formatHolidayTooltip(holiday)}
                              >
                                {holiday.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              
              {(hasAnyWeekAllDay || Boolean(draggedEvent)) && (
                <div className="flex border-b border-slate-200 bg-slate-50/30 py-1 dark:border-white/10 dark:bg-white/2">
                  <div className="flex w-11 sm:w-16 shrink-0 items-center justify-end border-r border-slate-200/70 pr-1.5 sm:pr-2 text-[10px] font-medium text-slate-400 dark:border-white/10">
                    Cả ngày
                  </div>
                  <div className="grid flex-1 grid-cols-7 divide-x divide-slate-200/70 px-0.5 dark:divide-white/10">
                    {weekDays.map((wd) => {
                      const dayAllDays = (eventsByDate[wd.dateKey] ?? []).filter((e) => e.isAllDay)
                      const allDayKey = `week-allday-${wd.dateKey}`
                      const isOver = dragOverTarget === allDayKey
                      return (
                        <div
                          className={`min-h-[26px] space-y-1 rounded px-1 transition-colors ${
                            isOver ? 'bg-blue-100/70 ring-1 ring-blue-500 dark:bg-blue-900/40' : ''
                          }`}
                          key={`allday-${wd.dateKey}`}
                          onDragLeave={() => {
                            if (dragOverTarget === allDayKey) setDragOverTarget(null)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverTarget(allDayKey)
                          }}
                          onDrop={(e) => handleDropOnAllDaySlot(e, wd.date)}
                        >
                          {dayAllDays.map((event) => {
                            const eventColor = event.color || event.calendar?.color || '#2563EB'
                            const isTaskItem = event.entryType === 'task'
                            const isBeingDragged = draggedEvent?.id === event.id
                            return (
                              <div
                                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-2xs hover:brightness-105 ${
                                  event.isCompleted ? 'opacity-55' : ''
                                } ${
                                  isBeingDragged
                                    ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                                    : 'cursor-grab active:cursor-grabbing'
                                }`}
                                draggable={true}
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                                  vm.handleOpenEditEvent(event)
                                }}
                                onDragEnd={handleDragEnd}
                                onDragStart={(e) => handleDragStart(e, event)}
                                style={{ backgroundColor: eventColor }}
                              >
                                {isTaskItem && (
                                  <TaskTickButton
                                    isCompleted={event.isCompleted}
                                    onToggle={() => handleRequestToggleTask(event)}
                                    size="sm"
                                  />
                                )}
                                <span className={`min-w-0 flex-1 truncate text-left ${event.isCompleted ? 'line-through' : ''}`}>
                                  {event.title}
                                </span>
                              </div>
                            )
                          })}
                          {isOver && dayAllDays.length === 0 && (
                            <span className="block text-center text-[9px] font-bold text-blue-600 dark:text-blue-400">
                              + Cả ngày
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              
              <div
                className="relative flex max-h-[620px] select-none overflow-y-auto"
                ref={timeGridRef}
              >
                
                <div className="w-11 sm:w-16 shrink-0 border-r border-slate-200/70 bg-white dark:border-white/10 dark:bg-transparent">
                  {HOURS_24.map((h, i) => (
                    <div className="relative h-[48px]" key={h.hour}>
                      {i > 0 && (
                        <span className="absolute -top-2.5 right-1.5 sm:right-2 select-none text-[10px] font-medium text-slate-400">
                          {h.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                
                <div className="relative grid flex-1 grid-cols-7 divide-x divide-slate-100 dark:divide-white/5">
                  {weekDays.map((wd) => {
                    const isCurrentDay =
                      today.getDate() === wd.dayNum &&
                      today.getMonth() === wd.date.getMonth() &&
                      today.getFullYear() === wd.date.getFullYear()

                    const timedSegments = weekTimedSegmentsByDate[wd.dateKey] ?? []

                    const columnKey = `week-col-${wd.dateKey}`

                    return (
                      <div
                        className="relative"
                        key={wd.dateKey}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setDragPreview((prev) => (prev?.columnKey === columnKey ? null : prev))
                          }
                        }}
                        onDragOver={(e) => handleTimedColumnDragOver(e, columnKey)}
                        onDrop={(e) => handleDropOnTimedColumn(e, wd.date)}
                      >
                        {HOURS_24.map((h) => (
                          <div
                            className="relative h-[48px] cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/20 dark:border-white/5 dark:hover:bg-white/5"
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

                        {dragPreview?.columnKey === columnKey && draggedEvent && (
                          <div
                            className="pointer-events-none absolute inset-x-0.5 z-30 flex items-center gap-1 rounded border-2 border-dashed border-blue-500 bg-blue-600/20 px-1.5 text-[10px] font-bold text-blue-950 dark:text-blue-100 shadow-sm backdrop-blur-2xs"
                            style={{
                              top: `${(dragPreview.startMin / 60) * HOUR_HEIGHT}px`,
                              height: `${Math.max(20, ((dragPreview.endMin - dragPreview.startMin) / 60) * HOUR_HEIGHT)}px`,
                            }}
                          >
                            <span className="shrink-0 rounded bg-blue-600 px-1 py-0.5 text-[9px] font-extrabold text-white">
                              {dragPreview.label}
                            </span>
                            <span className="truncate">{draggedEvent.title}</span>
                          </div>
                        )}

                        
                        {isCurrentDay && (
                          <div
                            className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                            style={{ top: `${currentIndicatorTop}px` }}
                          >
                            <div className="-ml-1.5 size-2.5 rounded-full bg-red-500 shadow-xs" />
                            <div className="flex-1 border-t-2 border-red-500" />
                          </div>
                        )}

                        
                        {timedSegments.map((seg) => {
                          const { event, segmentId, startMin, durationMin, isZeroDuration, isStartSegment, isEndSegment, isMultiDay, leftPct, widthPct, zIndex } = seg
                          const top = (startMin / 60) * HOUR_HEIGHT
                          const height = isZeroDuration ? 20 : Math.max(20, (durationMin / 60) * HOUR_HEIGHT)
                          const cardHeight = resizingEvent?.segmentId === segmentId ? resizingEvent.currentHeight : height
                          const eventColor = event.color || event.calendar?.color || '#2563EB'
                          const isTask = event.entryType === 'task'
                          const isBeingDragged = draggedEvent?.id === event.id
                          const startTimeText = isMultiDay
                            ? formatEventTime(event.startDate, event.endDate, false)
                            : formatMinutesToHHMM(startMin)
                          const timeRangeText = isMultiDay
                            ? formatEventTime(event.startDate, event.endDate, false)
                            : startTimeText
                          const roundedClass =
                            isStartSegment && isEndSegment
                              ? 'rounded-md'
                              : isStartSegment
                                ? 'rounded-t-md rounded-b-xs'
                                : isEndSegment
                                  ? 'rounded-b-md rounded-t-xs'
                                  : 'rounded-xs'

                          return (
                            <div
                              className={`group/item absolute overflow-hidden border-[1.5px] border-white dark:border-[#021024] px-1.5 py-0.5 text-white shadow-sm transition-all hover:z-30! hover:shadow-md ${roundedClass} ${
                                event.isCompleted ? 'line-through opacity-50' : ''
                              } ${
                                isBeingDragged
                                  ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                                  : 'cursor-grab active:cursor-grabbing'
                              }`}
                              draggable={true}
                              key={segmentId}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                                vm.handleOpenEditEvent(event)
                              }}
                              onDragEnd={handleDragEnd}
                              onDragStart={(e) => handleDragStart(e, event)}
                              style={{
                                top: `${top}px`,
                                height: `${cardHeight}px`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                zIndex,
                                backgroundColor: eventColor,
                              }}
                              title={`${event.title} (${formatEventTime(event.startDate, event.endDate, event.isAllDay)})`}
                            >
                              {height < 32 ? (
                                <div className="flex h-full items-center justify-between text-[10px] font-semibold leading-tight opacity-90">
                                  <span className="flex min-w-0 items-center gap-1">
                                    {isTask && (
                                      <TaskTickButton
                                        isCompleted={event.isCompleted}
                                        onToggle={() => handleRequestToggleTask(event)}
                                        size="sm"
                                      />
                                    )}
                                    <span className="font-bold opacity-80 shrink-0">
                                      {startTimeText}
                                    </span>
                                    <span className="truncate font-medium">{event.title}</span>
                                  </span>
                                  {isTask && (
                                    <span className={`ml-1 size-1.5 shrink-0 rounded-xs ${event.deadline ? 'bg-amber-300' : 'bg-white/90'}`} />
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between text-[10px] font-semibold leading-tight opacity-90">
                                    <span className="flex min-w-0 items-center gap-1">
                                      {isTask && (
                                        <TaskTickButton
                                          isCompleted={event.isCompleted}
                                          onToggle={() => handleRequestToggleTask(event)}
                                          size="sm"
                                        />
                                      )}
                                      <span className="truncate">
                                        {timeRangeText}
                                      </span>
                                    </span>
                                    {isTask && (
                                      <span className={`ml-1 size-1.5 shrink-0 rounded-xs ${event.deadline ? 'bg-amber-300' : 'bg-white/90'}`} />
                                    )}
                                  </div>
                                  <div className="mt-0.5 truncate text-xs font-bold leading-tight">
                                    {event.title}
                                  </div>
                                </>
                              )}

                              {isEndSegment && (
                                <div
                                  aria-label="Kéo đổi thời lượng"
                                  className="absolute bottom-0 inset-x-0 h-2 cursor-ns-resize opacity-0 group-hover/item:opacity-100 transition-opacity bg-black/20 flex items-center justify-center z-30"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                  }}
                                  onPointerDown={(e) => handleResizeStart(e, event, segmentId, height)}
                                  title="Kéo cạnh dưới để tăng hoặc giảm thời lượng"
                                >
                                  <div className="h-0.5 w-4 rounded-full bg-white/80 pointer-events-none" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
              </div>
            </div>
          ) : vm.viewMode === 'month' ? (
            <div className="mt-3">
              <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-[11px] font-bold text-slate-600 sm:text-xs dark:border-white/10 dark:text-slate-400">
                {weekdays.map((wd, idx) => (
                  <div key={wd}>
                    <span className="sm:hidden">{shortWeekdays[idx]}</span>
                    <span className="hidden sm:inline">{wd}</span>
                  </div>
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

                  const isDragTarget = dragOverTarget === dateKey
                  return (
                    <div
                      className={`group relative flex min-h-[76px] min-w-0 flex-col p-1 transition-colors sm:min-h-[115px] sm:p-2 ${
                        isDragTarget
                          ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-500 dark:bg-blue-950/40'
                          : isCurrentMonth
                            ? 'bg-white hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-white/5'
                            : 'bg-slate-50/40 text-slate-300 dark:bg-white/2 dark:text-slate-600'
                      }`}
                      key={dateKey}
                      onDragLeave={() => {
                        if (dragOverTarget === dateKey) setDragOverTarget(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverTarget(dateKey)
                      }}
                      onDrop={(e) => handleDropOnMonthDay(e, cellDate)}
                      onMouseEnter={() => setHoveredDateCell(dateKey)}
                      onMouseLeave={() => setHoveredDateCell(null)}
                    >
                      <div className="relative flex items-center justify-center pb-1">
                        <CalendarDateLabel
                          isMuted={!isCurrentMonth}
                          isToday={isCurrentDay}
                          lunarDate={vm.lunarDatesBySolarDate[dateKey]}
                          showLunarCalendar={vm.calendarPreferences.showLunarCalendar}
                          showLunarMonth={isCurrentMonth && isFirstOrLastDayOfSolarMonth(cellDate)}
                          solarDay={d}
                          variant="month"
                        />

                        {isDragTarget && draggedEvent && (
                          <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                            Thả vào đây
                          </span>
                        )}

                        {isHovered && isCurrentMonth && !isDragTarget && (
                          <button
                            aria-label={`Thêm sự kiện ngày ${d}`}
                            className="absolute top-0 right-0 grid size-5 place-items-center rounded-full bg-slate-200/80 text-slate-700 hover:bg-blue-600 hover:text-white dark:bg-white/10 dark:text-white dark:hover:bg-blue-600"
                            onClick={() => vm.handleOpenCreateEvent(cellDate)}
                            title="Thêm sự kiện vào ngày này"
                            type="button"
                          >
                            <Icon className="size-3" name="plus" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 space-y-1 overflow-hidden">
                        {(vm.holidaysBySolarDate[dateKey] ?? []).slice(0, 2).map((holiday) => (
                          <div
                            className={`flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[9px] font-bold sm:px-1.5 sm:text-[10px] ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                            key={holiday.id}
                            title={formatHolidayTooltip(holiday)}
                          >
                            <span className={`size-1.5 shrink-0 rounded-full ${VIETNAM_HOLIDAY_DOT_CLASS}`} />
                            <span className="truncate">{holiday.name}</span>
                          </div>
                        ))}
                        {dayEvents.slice(0, 3).map((event) => {
                          const eventColor = event.color || event.calendar?.color || '#2563EB'
                          const isTask = event.entryType === 'task'
                          const isBeingDragged = draggedEvent?.id === event.id

                          return (
                            <div
                              className={`group/chip flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-[10px] font-semibold text-white shadow-2xs transition-all hover:scale-[1.02] sm:gap-1.5 sm:px-1.5 sm:text-[11px] ${
                                event.isCompleted ? 'opacity-55' : ''
                              } ${
                                isBeingDragged
                                  ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                                  : 'cursor-grab active:cursor-grabbing'
                              }`}
                              draggable={true}
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                                vm.handleOpenEditEvent(event)
                              }}
                              onDragEnd={handleDragEnd}
                              onDragStart={(e) => handleDragStart(e, event)}
                              style={{ backgroundColor: eventColor }}
                            >
                              {isTask ? (
                                <TaskTickButton
                                  isCompleted={event.isCompleted}
                                  onToggle={() => handleRequestToggleTask(event)}
                                  size="sm"
                                />
                              ) : (
                                <span className="size-1.5 shrink-0 rounded-full bg-white/90" />
                              )}
                              <span className={`min-w-0 flex-1 truncate text-left ${event.isCompleted ? 'line-through' : ''}`}>
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
                            </div>
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
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                        const dayItems = eventsByDate[key] ?? []
                        const hasEvents = dayItems.length > 0
                        const dayTasks = dayItems.filter((item) => item.entryType === 'task')
                        const allTasksDone = dayTasks.length > 0 && dayTasks.every((item) => item.isCompleted)
                        const isCurrentDay =
                          today.getDate() === dNum && today.getMonth() === mIdx && today.getFullYear() === currentYear
                        const dayHolidays = vm.holidaysBySolarDate[key] ?? []
                        const taskTooltip = dayTasks.length > 0
                          ? allTasksDone
                            ? 'Đã hoàn thành tất cả nhiệm vụ'
                            : 'Còn nhiệm vụ chưa hoàn thành'
                          : ''
                        const holidayTooltip = dayHolidays.map(formatHolidayTooltip).join(' • ')
                        const yearCellTooltip = [holidayTooltip, taskTooltip].filter(Boolean).join('\n') || undefined

                        return (
                        <div
                          className="relative mx-auto inline-flex min-h-5 items-center justify-center font-medium"
                          key={dNum}
                          title={yearCellTooltip}
                        >
                          <CalendarDateLabel
                            hasEvents={hasEvents}
                            isToday={isCurrentDay}
                            lunarDate={vm.lunarDatesBySolarDate[key]}
                            showLunarCalendar={vm.calendarPreferences.showLunarCalendar}
                            solarDay={dNum}
                            variant="year"
                          />
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
                  const listLunarDate = vm.lunarDatesBySolarDate[dateKey]
                  const listLunarTooltip = listLunarDate
                    ? getLunarDateTooltip(listLunarDate, {
                        prefix: t('calendar.lunar.tooltipPrefix'),
                        leapSuffix: t('calendar.lunar.leapSuffix'),
                      })
                    : ''

                  return (
                    <div className="py-4 first:pt-2" key={dateKey}>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span>{formatDayHeader(dateKey)}</span>
                        {vm.calendarPreferences.showLunarCalendar && listLunarDate && (
                          <span
                            aria-label={listLunarTooltip}
                            className="rounded-md bg-[#C1E8FF]/35 px-1.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-[#052659] dark:bg-[#548383]/25 dark:text-[#C1E8FF]"
                            title={listLunarTooltip}
                          >
                            {t('calendar.lunar.tooltipPrefix')}: {formatLunarDateLabel(listLunarDate, true)}
                            {listLunarDate.isLeapMonth && (
                              <span className="sr-only">{t('calendar.lunar.leapSrOnly')}</span>
                            )}
                          </span>
                        )}
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

                                    {event.calendar ? (
                                      <span
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                                        style={{ backgroundColor: event.calendar.color }}
                                      >
                                        {event.calendar.name}
                                      </span>
                                    ) : isTask ? (
                                      <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                        Nhiệm vụ độc lập
                                      </span>
                                    ) : null}

                                    {event.priority && (
                                      <span
                                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                                        style={{
                                          backgroundColor:
                                            event.priority === 'urgent'
                                              ? '#EF4444'
                                              : event.priority === 'high'
                                              ? '#F59E0B'
                                              : event.priority === 'medium'
                                              ? '#3B82F6'
                                              : '#64748B',
                                        }}
                                      >
                                        {event.priority === 'urgent'
                                          ? 'Khẩn cấp'
                                          : event.priority === 'high'
                                          ? 'Ưu tiên cao'
                                          : event.priority === 'medium'
                                          ? 'Trung bình'
                                          : 'Thấp'}
                                      </span>
                                    )}

                                    {event.deadline && (
                                      <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                        ⏳ Hạn chót: {new Date(event.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}{!event.isAllDay ? ` ${new Date(event.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
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
                                  onClick={() => {
                                    setEventToDelete(event)
                                  }}
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

      {vm.confirmation && <RecurringConfirmationDialog confirmation={vm.confirmation} />}
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

      {categoryToDelete && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
          role="dialog"
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-[#021024]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Icon className="size-5" name="trash" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Xóa danh mục lịch?
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa lịch này không? Các sự kiện thuộc lịch sẽ được tách ra độc lập.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = categoryToDelete
                  setCategoryToDelete(null)
                  await vm.handleDeleteCategory(id)
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {eventToDelete && (() => {
        const isEventToDeleteRecurring = Boolean(
          (eventToDelete.recurrence && eventToDelete.recurrence.frequency !== 'none') ||
          (eventToDelete as unknown as { _isOccurrence?: boolean })?._isOccurrence,
        )
        if (isEventToDeleteRecurring) {
          return (
            <RecurrenceScopeModal
              action="delete"
              entryType={eventToDelete.entryType}
              isOpen={true}
              isSubmitting={isDeletingEvent}
              onCancel={() => setEventToDelete(null)}
              onConfirm={async (mode) => {
                setIsDeletingEvent(true)
                await vm.handleDeleteEvent(eventToDelete.id, mode, eventToDelete.startDate)
                setIsDeletingEvent(false)
                setEventToDelete(null)
              }}
              targetDate={new Date(eventToDelete.startDate)}
              title={eventToDelete.title}
            />
          )
        }
        return (
          <div
            aria-modal="true"
            className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
            onClick={() => setEventToDelete(null)}
            role="dialog"
          >
            <div
              className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-[#021024]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Icon className="size-5" name="trash" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {eventToDelete.entryType === 'task' ? 'Xóa nhiệm vụ?' : 'Xóa sự kiện?'}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {`Bạn có chắc chắn muốn xóa "${eventToDelete.title}" không? Thao tác này không thể hoàn tác.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3 dark:border-white/10">
                <button
                  type="button"
                  disabled={isDeletingEvent}
                  onClick={() => setEventToDelete(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isDeletingEvent}
                  onClick={async () => {
                    if (!eventToDelete) return
                    setIsDeletingEvent(true)
                    await vm.handleDeleteEvent(eventToDelete.id, undefined, eventToDelete.startDate)
                    setIsDeletingEvent(false)
                    setEventToDelete(null)
                  }}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  {isDeletingEvent ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {pendingRecurringAction && (
        <RecurrenceScopeModal
          action="update"
          entryType={pendingRecurringAction.event.entryType}
          isOpen={true}
          onCancel={() => setPendingRecurringAction(null)}
          onConfirm={(mode) => void handleConfirmRecurringMove(mode)}
          targetDate={new Date(pendingRecurringAction.targetDate)}
          title={pendingRecurringAction.event.title}
        />
      )}

      {pendingToggleTask && (
        <RecurrenceScopeModal
          action={pendingToggleTask.isCompleted ? 'reopen' : 'complete'}
          entryType={pendingToggleTask.entryType}
          isOpen={true}
          isSubmitting={isTogglingTask}
          onCancel={() => setPendingToggleTask(null)}
          onConfirm={async (mode) => {
            setIsTogglingTask(true)
            await vm.handleToggleComplete(
              pendingToggleTask.id,
              pendingToggleTask.isCompleted,
              mode,
              pendingToggleTask.startDate,
            )
            setIsTogglingTask(false)
            setPendingToggleTask(null)
          }}
          targetDate={new Date(pendingToggleTask.startDate)}
          title={pendingToggleTask.title}
        />
      )}
      <CalendarSettingsModal
        isOpen={isCalendarSettingsOpen}
        isSaving={vm.isSavingPreferences}
        onClose={() => setIsCalendarSettingsOpen(false)}
        onUpdatePreferences={vm.handleUpdateCalendarPreferences}
        preferences={vm.calendarPreferences}
      />

    </div>
  )
}
