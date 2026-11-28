import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Settings } from 'lucide-react'
import { Icon } from '@/shared/components/Icon'
import { getCalendarEventCardColors } from '@/modules/calendar/utils/calendarEventColors'
import type {
  CalendarCategory,
  CalendarEvent,
  VietnameseHolidayItem,
} from '@/modules/calendar/models/calendar.types'
import {
  formatLunarDateLabel,
  getLunarDateTooltip,
  isFirstOrLastDayOfSolarMonth,
  toLocalDateKey,
} from '@/modules/calendar/models/lunarCalendar'
import {
  formatHolidayLunarSubtitle,
  formatHolidayTooltip,
  getHolidayNote,
  VIETNAM_HOLIDAY_BADGE_CLASSES,
  VIETNAM_HOLIDAY_DOT_CLASS,
} from '@/modules/calendar/models/vietnameseHolidays'
import { CALENDAR_KEYS } from '@/modules/calendar/models/calendarI18nKeys'
import { useCalendarViewModel, type CalendarViewMode } from '@/modules/calendar/viewmodels/useCalendarViewModel'
import { interfaceLocale, type TranslationKey } from '@/modules/i18n/services/translator'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
import { CalendarSidebar } from './components/CalendarSidebar'
import { CalendarDateLabel } from './components/CalendarDateLabel'
import { CalendarSettingsModal } from './components/CalendarSettingsModal'
import { CalendarIcsModal } from './components/CalendarIcsModal'
import { CategoryModal } from './components/CategoryModal'
import { ConfirmDeleteGoogleEventModal } from './components/ConfirmDeleteGoogleEventModal'
import { ConfirmUnlinkGoogleCalendarModal } from './components/ConfirmUnlinkGoogleCalendarModal'
import { EventModal } from './components/EventModal'
import { GoogleCalendarSelectModal } from './components/GoogleCalendarSelectModal'
import { HolidayDetailModal } from './components/HolidayDetailModal'
import { GoogleSyncConflictModal } from './components/GoogleSyncConflictModal'
import { TaskTickButton } from './components/TaskTickButton'
import { RecurringConfirmationDialog } from './components/RecurringConfirmationDialog'
import { RecurrenceScopeModal, type RecurrenceScopeMode } from './components/RecurrenceScopeModal'
import '../styles/calendarScrollbar.css'
import {
  buildEventsByDateMap,
  buildTimedSegmentsForDate,
  formatDateKey,
  isFirstOccurrenceInSeries,
  layoutDayTimedSegments,
  unifyMultiDaySegmentWidths,
} from '../utils/calendarLayout'

const WEEKDAY_KEYS = [
  CALENDAR_KEYS.WEEKDAY_SUN,
  CALENDAR_KEYS.WEEKDAY_MON,
  CALENDAR_KEYS.WEEKDAY_TUE,
  CALENDAR_KEYS.WEEKDAY_WED,
  CALENDAR_KEYS.WEEKDAY_THU,
  CALENDAR_KEYS.WEEKDAY_FRI,
  CALENDAR_KEYS.WEEKDAY_SAT,
] as const

const SHORT_WEEKDAY_KEYS = [
  CALENDAR_KEYS.WEEKDAY_SHORT_SUN,
  CALENDAR_KEYS.WEEKDAY_SHORT_MON,
  CALENDAR_KEYS.WEEKDAY_SHORT_TUE,
  CALENDAR_KEYS.WEEKDAY_SHORT_WED,
  CALENDAR_KEYS.WEEKDAY_SHORT_THU,
  CALENDAR_KEYS.WEEKDAY_SHORT_FRI,
  CALENDAR_KEYS.WEEKDAY_SHORT_SAT,
] as const

const HOUR_HEIGHT = 48
const HOURS_24 = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}))

const VIEW_OPTIONS: ReadonlyArray<{ mode: CalendarViewMode; labelKey: TranslationKey }> = [
  { mode: 'day', labelKey: CALENDAR_KEYS.VIEW_DAY },
  { mode: 'week', labelKey: CALENDAR_KEYS.VIEW_WEEK },
  { mode: 'month', labelKey: CALENDAR_KEYS.VIEW_MONTH },
  { mode: 'year', labelKey: CALENDAR_KEYS.VIEW_YEAR },
  { mode: 'list', labelKey: CALENDAR_KEYS.VIEW_LIST },
]

function formatMinutesToHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440
  const hh = Math.floor(wrapped / 60)
  const mm = wrapped % 60
  return `${hh < 10 ? `0${hh}` : hh}:${mm < 10 ? `0${mm}` : mm}`
}

function formatEventTime(
  startStr: string,
  endStr: string,
  isAllDay: boolean,
  allDayText = 'All day',
): string {
  try {
    const start = new Date(startStr)
    const end = new Date(endStr)
    if (isAllDay) return allDayText
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

function formatDayHeader(dateStr: string, locale = 'vi-VN'): string {
  try {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
    const d = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(dateStr)
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function CalendarPage() {
  const vm = useCalendarViewModel()
  const { language, t } = useTranslation()
  const locale = interfaceLocale(language)
  const allDayLabel = t(CALENDAR_KEYS.ALL_DAY)
  const timeGridRef = useRef<HTMLDivElement>(null)
  const dayGridRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const listAnchorRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollListRef = useRef(true)
  const isProgrammaticListScrollRef = useRef(false)
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
  const [pendingListGoogleDeleteScope, setPendingListGoogleDeleteScope] = useState<
    'local_only' | 'both' | null
  >(null)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [pendingToggleTask, setPendingToggleTask] = useState<CalendarEvent | null>(null)
  const [isTogglingTask, setIsTogglingTask] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [icsCategory, setIcsCategory] = useState<CalendarCategory | null>(null)

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
    previewEndDate: string
  } | null>(null)

  useEffect(() => {
    const timers = new WeakMap<HTMLElement, number>()
    const activeElements = new Set<HTMLElement>()

    const handleScrollCapture = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.classList.contains('gcal-scrollbar')) return

      target.dataset.scrolling = 'true'
      activeElements.add(target)

      const existingTimer = timers.get(target)
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer)
      }

      const nextTimer = window.setTimeout(() => {
        delete target.dataset.scrolling
        activeElements.delete(target)
        timers.delete(target)
      }, 850)
      timers.set(target, nextTimer)
    }

    document.addEventListener('scroll', handleScrollCapture, { capture: true, passive: true })
    return () => {
      document.removeEventListener('scroll', handleScrollCapture, { capture: true })
      for (const el of activeElements) {
        const timerId = timers.get(el)
        if (timerId !== undefined) window.clearTimeout(timerId)
        delete el.dataset.scrolling
      }
      activeElements.clear()
    }
  }, [])

  useEffect(() => {
    if (!resizingEvent) return

    const handlePointerMove = (e: PointerEvent) => {
      isSuppressClickRef.current = true
      const deltaY = e.clientY - resizingEvent.initialY
      const snappedDelta = Math.round(deltaY / 12) * 12
      const newHeight = Math.max(12, resizingEvent.initialHeight + snappedDelta)
      const addedMinutes = Math.round(snappedDelta / 12) * 15
      const origStart = new Date(resizingEvent.event.startDate)
      const origEnd = new Date(resizingEvent.event.endDate)
      const origDurationMs = Math.max(15 * 60000, origEnd.getTime() - origStart.getTime())
      const newDurationMs = Math.max(15 * 60000, origDurationMs + addedMinutes * 60000)
      const previewEnd = new Date(origStart.getTime() + newDurationMs).toISOString()
      setResizingEvent((prev) =>
        prev ? { ...prev, currentHeight: newHeight, previewEndDate: previewEnd } : null,
      )
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
    if (event.isGoogleReadOnly) return
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
      previewEndDate: event.endDate,
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (
        vm.isEventModalOpen ||
        vm.isCategoryModalOpen ||
        eventToDelete ||
        pendingRecurringAction ||
        pendingToggleTask ||
        !vm.undoAction
      ) {
        return
      }
      e.preventDefault()
      void vm.handleUndo()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    eventToDelete,
    pendingRecurringAction,
    pendingToggleTask,
    vm,
  ])

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
    if (event.isGoogleReadOnly) {
      e.preventDefault()
      return
    }
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

  const handleTimedColumnDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    columnKey: string,
  ) => {
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
      if (prev && prev.columnKey === columnKey && prev.startMin === startMin && prev.endMin === endMin && prev.label === label) {
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

    if (newStart.getTime() === origStart.getTime() && newEnd.getTime() === origEnd.getTime()) {
      setDraggedEvent(null)
      return
    }

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

    if (newStart.getTime() === origStart.getTime() && newEnd.getTime() === origEnd.getTime()) {
      setDraggedEvent(null)
      return
    }

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

    if (
      draggedEvent.isAllDay &&
      origStart.getFullYear() === newStart.getFullYear() &&
      origStart.getMonth() === newStart.getMonth() &&
      origStart.getDate() === newStart.getDate()
    ) {
      setDraggedEvent(null)
      return
    }

    const isRecurring = Boolean(
      (draggedEvent.recurrence && draggedEvent.recurrence.frequency !== 'none') ||
      (draggedEvent as unknown as { _isOccurrence?: boolean })?._isOccurrence,
    )

    const isSameDay =
      origStart.getFullYear() === newStart.getFullYear() &&
      origStart.getMonth() === newStart.getMonth() &&
      origStart.getDate() === newStart.getDate()

    if (newStart.getTime() === origStart.getTime() && newEnd.getTime() === origEnd.getTime()) {
      setDraggedEvent(null)
      return
    }

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
  const [isReturnToSettingsOnSelectClose, setIsReturnToSettingsOnSelectClose] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<VietnameseHolidayItem | null>(null)
  const currentYear = vm.currentDate.getFullYear()
  const currentMonth = vm.currentDate.getMonth()
  const today = new Date()
  const [selectedCalendarId] = vm.selectedCategoryIds
  const selectedSettings = vm.selectedCategoryIds.length === 1
    ? vm.categories.find((category) => category.id === selectedCalendarId)?.settings
    : undefined

  const weekStartsOn = 0
  const weekdays = WEEKDAY_KEYS.map((key) => t(key))
  const shortWeekdays = SHORT_WEEKDAY_KEYS.map((key) => t(key))
  const timeZoneHeaderLabel = getTimeZoneOffsetLabel(selectedSettings?.timeZone)

  const listAnchorKey = toLocalDateKey(vm.currentDate)
  const todayKey = toLocalDateKey(today)

  useEffect(() => {
    shouldAutoScrollListRef.current = true
  }, [vm.viewMode, listAnchorKey])

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

  const userCategoryIds = new Set(vm.categories.map((c) => c.id))
  const visibleEvents = vm.events.filter(
    (event) =>
      Boolean(event.googleSource) ||
      !event.calendarId ||
      !userCategoryIds.has(event.calendarId) ||
      vm.selectedCategoryIds.includes(event.calendarId),
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
  const selectedDayHolidays = vm.activeFilterTab === 'task' ? [] : (vm.holidaysBySolarDate[selectedDayKey] ?? [])
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

  const hasAnyWeekAllDay = weekDays.some(
    (wd) =>
      (eventsByDate[wd.dateKey] ?? []).some((e) => e.isAllDay) ||
      (vm.activeFilterTab !== 'task' && (vm.holidaysBySolarDate[wd.dateKey] ?? []).length > 0),
  )

  const listDateSet = new Set<string>(Object.keys(eventsByDate))
  listDateSet.add(listAnchorKey)
  if (vm.activeFilterTab !== 'task') {
    const yearPrefix = `${currentYear}-`
    for (const dateKey of Object.keys(vm.holidaysBySolarDate)) {
      if (dateKey.startsWith(yearPrefix) && (vm.holidaysBySolarDate[dateKey]?.length ?? 0) > 0) {
        listDateSet.add(dateKey)
      }
    }
  }
  const sortedListDates = Array.from(listDateSet).sort()
  const listScrollTargetKey =
    sortedListDates.find((dateKey) => dateKey >= listAnchorKey) ??
    sortedListDates[sortedListDates.length - 1] ??
    null
  const holidayCacheCount = Object.keys(vm.holidaysBySolarDate).length

  useEffect(() => {
    if (vm.viewMode !== 'list' || vm.isLoading || !shouldAutoScrollListRef.current) return
    const container = listContainerRef.current
    const anchorEl = listAnchorRef.current
    if (!container || !anchorEl) return

    const frameId = window.requestAnimationFrame(() => {
      isProgrammaticListScrollRef.current = true
      container.scrollTop = Math.max(0, anchorEl.offsetTop - 8)
      window.setTimeout(() => {
        isProgrammaticListScrollRef.current = false
      }, 50)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [vm.viewMode, vm.isLoading, listAnchorKey, listScrollTargetKey, holidayCacheCount])

  return (
    <div className="mx-auto w-full max-w-[1920px] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div className="flex flex-col gap-3 sm:gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-4">
        <CalendarSidebar
          categories={vm.categories}
          currentDate={vm.currentDate}
          googleIntegrations={vm.googleIntegrations}
          googleSyncJobs={vm.googleSyncJobs}
          isGoogleConfigured={vm.isGoogleConfigured}
          isSavingPreferences={vm.isSavingPreferences}
          onDeleteCategory={(catId) => setCategoryToDelete(catId)}
          onOpenCalendarSettings={() => setIsCalendarSettingsOpen(true)}
          onOpenCreateCategory={vm.handleOpenCreateCategory}
          onOpenCreateEvent={() => vm.handleOpenCreateEvent()}
          onOpenEditCategory={vm.handleOpenEditCategory}
          onOpenGoogleConflicts={() => vm.setIsConflictModalOpen(true)}
          onOpenIcsModal={(cat) => setIcsCategory(cat)}
          onOpenSelectGoogleCalendars={(integration) => {
            setIsReturnToSettingsOnSelectClose(false)
            vm.setSelectingCalendarsIntegrationId(integration.id)
          }}
          onOpenUnlinkGoogleModal={(integration) => vm.setUnlinkingIntegration(integration)}
          onQuickChangeColor={vm.handleQuickChangeColor}
          onReconnectGoogleAccount={(integrationId) =>
            vm.handleStartGoogleSyncLink({ mode: 'reconnect', integrationId })
          }
          onRetryGoogleJob={(jobId) => void vm.handleRetryGoogleSyncJob(jobId)}
          onSelectDate={vm.handleSelectDate}
          onShowAllCategories={vm.handleShowAllCategories}
          onShowOnlyCategory={vm.handleShowOnlyCategory}
          onStartGoogleSyncLink={() => vm.handleStartGoogleSyncLink({ mode: 'add' })}
          onSyncGoogleIntegration={(integrationId) =>
            void vm.handleSyncGoogleIntegration(integrationId)
          }
          onToggleCategoryVisibility={vm.handleToggleCategoryVisibility}
          onToggleGoogleCalendarVisibility={(calendarConnectionId, isVisible) =>
            void vm.handleToggleGoogleCalendarVisibility(calendarConnectionId, isVisible)
          }
          onUpdatePreferences={vm.handleUpdateCalendarPreferences}
          preferences={vm.calendarPreferences}
          selectedCategoryIds={vm.selectedCategoryIds}
          syncingGoogleIntegrationId={vm.syncingGoogleIntegrationId}
        />

        <main className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs sm:p-3.5 lg:min-h-0 lg:overflow-hidden lg:p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 sm:pb-3 dark:border-white/10">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 2xl:gap-2.5">
              <button
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold whitespace-nowrap text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 2xl:px-3.5 2xl:py-1.5 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                onClick={vm.handleToday}
                type="button"
              >
                {t(CALENDAR_KEYS.TODAY)}
              </button>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  aria-label={t(CALENDAR_KEYS.PREV_ARIA)}
                  className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100 2xl:size-8 dark:text-slate-400 dark:hover:bg-white/10"
                  onClick={vm.handlePrev}
                  type="button"
                >
                  <Icon className="size-4" name="arrowLeft" />
                </button>
                <button
                  aria-label={t(CALENDAR_KEYS.NEXT_ARIA)}
                  className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100 2xl:size-8 dark:text-slate-400 dark:hover:bg-white/10"
                  onClick={vm.handleNext}
                  type="button"
                >
                  <Icon className="size-4" name="arrowRight" />
                </button>
              </div>

              <h2 className="min-w-0 truncate text-sm font-bold whitespace-nowrap capitalize text-slate-900 sm:text-base 2xl:text-lg dark:text-white">
                {vm.dateTitleLabel}
              </h2>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-1.5 sm:w-auto sm:justify-end 2xl:gap-2">
              <div className="flex items-center gap-1.5 xl:hidden">
                <select
                  aria-label={t(CALENDAR_KEYS.VIEW_SELECT_ARIA)}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-2 text-xs font-bold text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  onChange={(event) => vm.setViewMode(event.target.value as CalendarViewMode)}
                  value={vm.viewMode}
                >
                  {VIEW_OPTIONS.map((opt) => (
                    <option key={opt.mode} value={opt.mode}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>

                <select
                  aria-label={t(CALENDAR_KEYS.FILTER_SELECT_ARIA)}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-2 text-xs font-semibold text-slate-700 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  onChange={(event) => vm.setActiveFilterTab(event.target.value as 'all' | 'event' | 'task')}
                  value={vm.activeFilterTab}
                >
                  <option value="all">{t(CALENDAR_KEYS.FILTER_ALL)}</option>
                  <option value="event">{t(CALENDAR_KEYS.FILTER_EVENT)}</option>
                  <option value="task">{t(CALENDAR_KEYS.FILTER_TASK)}</option>
                </select>
              </div>

              <div className="hidden items-center gap-1.5 xl:flex 2xl:gap-2">
                <div className="flex rounded-xl bg-slate-100 p-0.5 2xl:p-1 dark:bg-white/10">
                  {VIEW_OPTIONS.map((opt) => (
                    <button
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap transition-all 2xl:px-2.5 ${vm.viewMode === opt.mode
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      key={opt.mode}
                      onClick={() => vm.setViewMode(opt.mode)}
                      type="button"
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>

                <div className="flex rounded-xl bg-slate-100 p-0.5 2xl:p-1 dark:bg-white/10">
                  <button
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap transition-all ${vm.activeFilterTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    onClick={() => vm.setActiveFilterTab('all')}
                    type="button"
                  >
                    {t(CALENDAR_KEYS.FILTER_ALL)}
                  </button>
                  <button
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap transition-all ${vm.activeFilterTab === 'event'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    onClick={() => vm.setActiveFilterTab('event')}
                    type="button"
                  >
                    {t(CALENDAR_KEYS.FILTER_EVENT)}
                  </button>
                  <button
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap transition-all ${vm.activeFilterTab === 'task'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    onClick={() => vm.setActiveFilterTab('task')}
                    type="button"
                  >
                    {t(CALENDAR_KEYS.FILTER_TASK)}
                  </button>
                </div>
              </div>

              {vm.googleConflicts.length > 0 && (
                <button
                  aria-label={t('calendar.google.resolveConflicts')}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold whitespace-nowrap text-amber-800 shadow-2xs transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200"
                  onClick={() => vm.setIsConflictModalOpen(true)}
                  type="button"
                >
                  <Icon className="size-3.5 shrink-0" name="warning" />
                  <span className="hidden sm:inline">{t(CALENDAR_KEYS.CONFLICTS_BADGE)}</span>
                  <span>({vm.googleConflicts.length})</span>
                </button>
              )}

              {(() => {
                const connectedIntegrations = vm.googleIntegrations.filter(
                  (acc) => acc.status === 'connected',
                )
                const reconnectAccount = vm.googleIntegrations.find(
                  (acc) => acc.status === 'reconnect_required',
                )
                const primaryOrFirst = connectedIntegrations[0]
                const isSyncingAny =
                  vm.isSyncingAllGoogle || Boolean(vm.syncingGoogleIntegrationId)
                const syncButtonTitle =
                  connectedIntegrations.length > 1
                    ? t(CALENDAR_KEYS.SYNC_ALL_TITLE, { count: connectedIntegrations.length })
                    : primaryOrFirst
                      ? t(CALENDAR_KEYS.SYNC_ONE_TITLE, { email: primaryOrFirst.googleEmail })
                      : t('calendar.google.syncNow')

                return (
                  <>
                    {primaryOrFirst && (
                      <button
                        aria-label={syncButtonTitle}
                        className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2 text-xs font-bold whitespace-nowrap text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 2xl:px-3 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        disabled={isSyncingAny}
                        onClick={() => void vm.handleSyncAllGoogleIntegrations()}
                        title={syncButtonTitle}
                        type="button"
                      >
                        <RefreshCw
                          aria-hidden="true"
                          className={`size-3.5 shrink-0 ${isSyncingAny ? 'animate-spin text-blue-600' : ''}`}
                        />
                        <span className="hidden 2xl:inline">
                          {isSyncingAny ? t(CALENDAR_KEYS.SYNCING_BUTTON) : t(CALENDAR_KEYS.SYNC_BUTTON)}
                        </span>
                      </button>
                    )}

                    {reconnectAccount && (
                      <button
                        aria-label={t('calendar.google.reauthorize')}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-2.5 text-xs font-bold whitespace-nowrap text-rose-700 shadow-2xs transition-colors hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200"
                        disabled={!vm.isGoogleConfigured}
                        onClick={() =>
                          vm.handleStartGoogleSyncLink({
                            mode: 'reconnect',
                            integrationId: reconnectAccount.id,
                          })
                        }
                        type="button"
                      >
                        <span>{t(CALENDAR_KEYS.RECONNECT_BUTTON)}</span>
                      </button>
                    )}
                  </>
                )
              })()}

              <button
                aria-label={t('calendar.settings.openAria')}
                className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2 text-xs font-bold whitespace-nowrap text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:h-8 lg:min-h-8 lg:min-w-8 2xl:px-3 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                onClick={() => setIsCalendarSettingsOpen(true)}
                title={t('calendar.settings.openAria')}
                type="button"
              >
                <Settings aria-hidden="true" className="size-4 shrink-0" />
                <span className="hidden 2xl:inline">{t('calendar.settings.button')}</span>
              </button>

            </div>
          </div>

          {vm.isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <Icon className="size-8 animate-spin text-blue-600" name="clock" />
              <p className="mt-3 text-xs font-semibold text-slate-400">{t(CALENDAR_KEYS.LOADING)}</p>
            </div>
          ) : vm.viewMode === 'day' ? (
            <div className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-transparent">

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 p-2.5 sm:px-4 dark:border-white/10 dark:bg-white/5">
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
                    {vm.currentDate.toLocaleDateString(locale, { weekday: 'long' })}
                  </h3>
                  {isSelectedDateToday && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {t(CALENDAR_KEYS.TODAY)}
                    </span>
                  )}
                  <span className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {t(CALENDAR_KEYS.ITEMS_COUNT, {
                      count: selectedDayEvents.length + selectedDayHolidays.length,
                    })}
                  </span>
                </div>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-2xs transition-colors hover:bg-blue-700"
                  onClick={() => vm.handleOpenCreateEvent(vm.currentDate)}
                  type="button"
                >
                  {t(CALENDAR_KEYS.ADD_ITEM_TO_DAY)}
                </button>
              </div>


              {(selectedDayAllDayEvents.length > 0 || selectedDayHolidays.length > 0 || Boolean(draggedEvent)) && (
                <div
                  className={`flex items-center border-b border-slate-200 bg-slate-50/30 p-2 sm:px-3 transition-colors dark:border-white/10 dark:bg-white/2 ${dragOverTarget === 'day-allday'
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
                  <span className="w-11 sm:w-16 shrink-0 pr-1.5 sm:pr-2 text-right text-[10px] font-semibold whitespace-nowrap text-slate-400">
                    {allDayLabel}
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5 min-h-[28px]">
                    {selectedDayHolidays.map((holiday) => (
                      <button
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shadow-2xs transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-600 ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                        key={holiday.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedHoliday(holiday)
                        }}
                        title={formatHolidayTooltip(holiday, vm.calendarPreferences.showLunarCalendar)}
                        type="button"
                      >
                        <span className={`size-1.5 shrink-0 rounded-full ${VIETNAM_HOLIDAY_DOT_CLASS}`} />
                        <span className="min-w-0 truncate text-left">{holiday.name}</span>
                      </button>
                    ))}
                    {selectedDayAllDayEvents.map((event) => {
                      const cardColors = getCalendarEventCardColors(event.color || event.calendar?.color)
                      const isTaskItem = event.entryType === 'task'
                      const isBeingDragged = draggedEvent?.id === event.id
                      return (
                        <div
                          className={`flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold shadow-2xs transition-all hover:scale-[1.01] ${isBeingDragged
                            ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                            : event.isGoogleReadOnly
                              ? 'cursor-pointer'
                              : 'cursor-grab active:cursor-grabbing'
                            }`}
                          draggable={!event.isGoogleReadOnly}
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                            vm.handleOpenEditEvent(event)
                          }}
                          onDragEnd={handleDragEnd}
                          onDragStart={(e) => handleDragStart(e, event)}
                          style={cardColors}
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
                className="gcal-scrollbar relative flex max-h-[560px] flex-1 select-none overflow-y-auto lg:max-h-none lg:min-h-0"
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
                    const isResizingThis = resizingEvent?.segmentId === segmentId
                    const cardHeight = isResizingThis ? resizingEvent.currentHeight : height
                    const eventColor = event.color || event.calendar?.color || '#2563EB'
                    const cardColors = getCalendarEventCardColors(event.color || event.calendar?.color)
                    const isTask = event.entryType === 'task'
                    const isBeingDragged = draggedEvent?.id === event.id
                    const effectiveEndIso = isResizingThis ? resizingEvent.previewEndDate : event.endDate
                    const segmentTimeLabel = formatEventTime(event.startDate, effectiveEndIso, false)
                    const resizeEndD = isResizingThis ? new Date(resizingEvent.previewEndDate) : null
                    const resizePreviewLabel = resizeEndD
                      ? formatMinutesToHHMM(resizeEndD.getHours() * 60 + resizeEndD.getMinutes())
                      : ''
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
                        className={`group/item absolute overflow-hidden border-[1.5px] border-white dark:border-[#021024] px-2.5 py-1 shadow-sm transition-all hover:z-30! hover:shadow-md ${roundedClass} ${event.isCompleted ? 'line-through' : ''
                          } ${isBeingDragged
                            ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                            : event.isGoogleReadOnly
                              ? 'cursor-pointer'
                              : 'cursor-grab active:cursor-grabbing'
                          }`}
                        draggable={!event.isGoogleReadOnly}
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
                          ...cardColors,
                        }}
                        title={`${event.title} (${formatEventTime(event.startDate, event.endDate, false)})`}
                      >
                        <div className="flex h-full items-center justify-between text-xs font-semibold leading-tight">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {isTask && (
                              <TaskTickButton
                                isCompleted={event.isCompleted}
                                onToggle={() => handleRequestToggleTask(event)}
                              />
                            )}
                            <Icon className="size-3 shrink-0" name="clock" />
                            <span className="font-bold shrink-0">
                              {segmentTimeLabel}
                            </span>
                            <span className="truncate">{event.title}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {widthPct >= 50 && event.calendar ? (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-current/30 ring-inset">
                                {event.calendar.name}
                              </span>
                            ) : widthPct >= 50 && isTask ? (
                              <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-current/30 ring-inset">
                                Độc lập
                              </span>
                            ) : null}
                            {widthPct >= 50 && isTask && event.calendar && (
                              <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-current/30 ring-inset">
                                Nhiệm vụ
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 truncate text-sm font-bold leading-snug sm:text-base">
                          {event.title}
                        </div>

                        {height >= 70 && event.location && (
                          <div className="mt-1 flex items-center gap-1 truncate text-xs">
                            <Icon className="size-3 shrink-0" name="mapPin" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {height >= 95 && event.description && (
                          <p className="mt-1 line-clamp-2 text-xs">
                            {event.description}
                          </p>
                        )}

                        {isEndSegment && !event.isGoogleReadOnly && (
                          <div
                            aria-label="Kéo đổi thời lượng"
                            className={`absolute bottom-0 inset-x-0 h-2.5 cursor-ns-resize transition-opacity bg-black/20 flex items-center justify-center z-30 ${
                              isResizingThis ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                            onPointerDown={(e) => handleResizeStart(e, event, segmentId, height)}
                            title="Kéo cạnh dưới để tăng hoặc giảm thời lượng"
                          >
                            {isResizingThis ? (
                              <span className="pointer-events-none -translate-y-3 rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                → {resizePreviewLabel}
                              </span>
                            ) : (
                              <div className="h-0.5 w-6 rounded-full bg-current pointer-events-none" />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : vm.viewMode === 'week' ? (
            <div className="gcal-scrollbar mt-2.5 flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-transparent">
              <div className="flex min-h-0 min-w-[520px] flex-1 flex-col sm:min-w-0">

                <div className="flex shrink-0 border-b border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">

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
                            className={`block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${isCurrentDay
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
                        </div>
                      )
                    })}
                  </div>
                </div>


                {(hasAnyWeekAllDay || Boolean(draggedEvent)) && (
                  <div className="flex shrink-0 border-b border-slate-200 bg-slate-50/30 py-1 dark:border-white/10 dark:bg-white/2">
                    <div className="flex w-11 sm:w-16 shrink-0 items-center justify-end border-r border-slate-200/70 pr-1.5 sm:pr-2 text-[10px] font-medium whitespace-nowrap text-slate-400 dark:border-white/10">
                      {allDayLabel}
                    </div>
                    <div className="grid flex-1 grid-cols-7 divide-x divide-slate-200/70 px-0.5 dark:divide-white/10">
                      {weekDays.map((wd) => {
                        const dayAllDays = (eventsByDate[wd.dateKey] ?? []).filter((e) => e.isAllDay)
                        const dayHolidays = vm.activeFilterTab === 'task' ? [] : (vm.holidaysBySolarDate[wd.dateKey] ?? [])
                        const allDayKey = `week-allday-${wd.dateKey}`
                        const isOver = dragOverTarget === allDayKey
                        return (
                          <div
                            className={`min-h-[26px] space-y-1 rounded px-1 transition-colors ${isOver ? 'bg-blue-100/70 ring-1 ring-blue-500 dark:bg-blue-900/40' : ''
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
                            {dayHolidays.map((holiday) => (
                              <button
                                className={`flex w-full cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-left text-[11px] font-semibold shadow-2xs transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-600 ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                                key={holiday.id}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedHoliday(holiday)
                                }}
                                title={formatHolidayTooltip(holiday, vm.calendarPreferences.showLunarCalendar)}
                                type="button"
                              >
                                <span className={`size-1.5 shrink-0 rounded-full ${VIETNAM_HOLIDAY_DOT_CLASS}`} />
                                <span className="min-w-0 flex-1 truncate">{holiday.name}</span>
                              </button>
                            ))}
                            {dayAllDays.map((event) => {
                              const cardColors = getCalendarEventCardColors(event.color || event.calendar?.color)
                              const isTaskItem = event.entryType === 'task'
                              const isBeingDragged = draggedEvent?.id === event.id
                              return (
                                <div
                                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold shadow-2xs hover:shadow-md ${isBeingDragged
                                    ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                                    : event.isGoogleReadOnly
                                      ? 'cursor-pointer'
                                      : 'cursor-grab active:cursor-grabbing'
                                    }`}
                                  draggable={!event.isGoogleReadOnly}
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                                    vm.handleOpenEditEvent(event)
                                  }}
                                  onDragEnd={handleDragEnd}
                                  onDragStart={(e) => handleDragStart(e, event)}
                                  style={cardColors}
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
                  className="gcal-scrollbar relative flex max-h-[560px] flex-1 select-none overflow-y-auto lg:max-h-none lg:min-h-0"
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
                            const cardColors = getCalendarEventCardColors(event.color || event.calendar?.color)
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
                                className={`group/item absolute overflow-hidden border-[1.5px] border-white dark:border-[#021024] px-1.5 py-0.5 shadow-sm transition-all hover:z-30! hover:shadow-md ${roundedClass} ${event.isCompleted ? 'line-through' : ''
                                  } ${isBeingDragged
                                    ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                                    : event.isGoogleReadOnly
                                      ? 'cursor-pointer'
                                      : 'cursor-grab active:cursor-grabbing'
                                  }`}
                                draggable={!event.isGoogleReadOnly}
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
                                  ...cardColors,
                                }}
                                title={`${event.title} (${formatEventTime(event.startDate, event.endDate, event.isAllDay, allDayLabel)})`}
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
                            {timeRangeText}
                          </span>
                          <span className="truncate font-medium">{event.title}</span>
                        </span>
                        {isTask && (
                          <span
                            className={`ml-1 size-1.5 shrink-0 rounded-xs ${
                              event.deadline ? 'bg-amber-300' : 'bg-white/90'
                            }`}
                          />
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
                                      <span className="font-bold shrink-0">
                                        {startTimeText}
                                      </span>
                                      <span className="truncate font-medium">{event.title}</span>
                                    </span>
                                    {isTask && (
                                      <span className={`ml-1 size-1.5 shrink-0 rounded-xs ${event.deadline ? 'bg-amber-300' : 'bg-current'}`} />
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between text-[10px] font-semibold leading-tight">
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
                                        <span className={`ml-1 size-1.5 shrink-0 rounded-xs ${event.deadline ? 'bg-amber-300' : 'bg-current'}`} />
                                      )}
                                    </div>
                                    <div className="mt-0.5 truncate text-xs font-bold leading-tight">
                                      {event.title}
                                    </div>
                                  </>
                                )}
                                {isEndSegment && !event.isGoogleReadOnly && (
                        <div
                          aria-label="Kéo đổi thời lượng"
                          className={`absolute bottom-0 inset-x-0 h-2 cursor-ns-resize transition-opacity bg-black/20 flex items-center justify-center z-30 ${
                            isResizingThis ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                          onPointerDown={(e) => handleResizeStart(e, event, segmentId, height)}
                          title="Kéo cạnh dưới để tăng hoặc giảm thời lượng"
                        >
                          {isResizingThis ? (
                            <span className="pointer-events-none -translate-y-3 rounded bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                              → {resizePreviewLabel}
                            </span>
                          ) : (
                            <div className="h-0.5 w-4 rounded-full bg-white/80 pointer-events-none" />
                          )}
                        </div>
                      )}  
                </div>
              </div>
            </div>
          ) : vm.viewMode === 'month' ? (
            <div className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="grid shrink-0 grid-cols-7 border-b border-slate-200 pb-2 text-center text-[11px] font-bold text-slate-600 sm:text-xs dark:border-white/10 dark:text-slate-400">
                {weekdays.map((wd, idx) => (
                  <div key={`${wd}-${idx}`}>
                    <span className="sm:hidden">{shortWeekdays[idx]}</span>
                    <span className="hidden sm:inline">{wd}</span>
                  </div>
                ))}
              </div>

              <div className="gcal-scrollbar min-h-0 flex-1 overflow-y-auto">
                <div className="grid min-h-full grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-100 dark:divide-white/5 dark:border-white/5">
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
                        className={`group relative flex min-h-[68px] min-w-0 flex-col p-1 transition-colors sm:min-h-[78px] sm:p-1.5 2xl:min-h-[96px] 2xl:p-2 ${isDragTarget
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
                        <div className="relative flex items-center justify-center pb-0.5">
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
                              {t(CALENDAR_KEYS.DROP_HERE)}
                            </span>
                          )}

                          {isHovered && isCurrentMonth && !isDragTarget && (
                            <button
                              aria-label={t(CALENDAR_KEYS.ADD_EVENT_ON_DAY, { day: d })}
                              className="absolute top-0 right-0 grid size-5 place-items-center rounded-full bg-slate-200/80 text-slate-700 hover:bg-blue-600 hover:text-white dark:bg-white/10 dark:text-white dark:hover:bg-blue-600"
                              onClick={() => vm.handleOpenCreateEvent(cellDate)}
                              title={t(CALENDAR_KEYS.ADD_EVENT_ON_DAY, { day: d })}
                              type="button"
                            >
                              <Icon className="size-3" name="plus" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {(vm.activeFilterTab === 'task' ? [] : (vm.holidaysBySolarDate[dateKey] ?? [])).slice(0, 2).map((holiday) => (
                            <button
                              className={`flex w-full cursor-pointer items-center gap-1 rounded-md border px-1 py-0.5 text-left text-[10px] font-semibold transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-600 sm:gap-1.5 sm:px-1.5 sm:text-[11px] ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                              key={holiday.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedHoliday(holiday)
                              }}
                              title={formatHolidayTooltip(holiday, vm.calendarPreferences.showLunarCalendar)}
                              type="button"
                            >
                              <span className={`size-1.5 shrink-0 rounded-full ${VIETNAM_HOLIDAY_DOT_CLASS}`} />
                              <span className="min-w-0 flex-1 truncate">{holiday.name}</span>
                            </button>
                          ))}
                          {dayEvents.slice(0, 3).map((event) => {
                            const cardColors = getCalendarEventCardColors(event.color || event.calendar?.color)
                            const isTask = event.entryType === 'task'
                            const isBeingDragged = draggedEvent?.id === event.id

                            return (
                              <div
                                className={`group/chip flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-[10px] font-semibold shadow-2xs transition-all hover:scale-[1.02] sm:gap-1.5 sm:px-1.5 sm:text-[11px] ${isBeingDragged
                                  ? 'opacity-40 ring-2 ring-blue-500 scale-[0.98]'
                                  : event.isGoogleReadOnly
                                    ? 'cursor-pointer'
                                    : 'cursor-grab active:cursor-grabbing'
                                  }`}
                                draggable={!event.isGoogleReadOnly}
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isSuppressClickRef.current || resizingEvent || draggedEvent || pendingRecurringAction) return
                                  vm.handleOpenEditEvent(event)
                                }}
                                onDragEnd={handleDragEnd}
                                onDragStart={(e) => handleDragStart(e, event)}
                                style={cardColors}
                              >
                                {isTask ? (
                                  <TaskTickButton
                                    isCompleted={event.isCompleted}
                                    onToggle={() => handleRequestToggleTask(event)}
                                    size="sm"
                                  />
                                ) : (
                                  <span className="size-1.5 shrink-0 rounded-full bg-current" />
                                )}
                                <span className={`min-w-0 flex-1 truncate text-left ${event.isCompleted ? 'line-through' : ''}`}>
                                  {!event.isAllDay && (
                                    <span className="mr-1">
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
                              {t(CALENDAR_KEYS.MORE_ITEMS, { count: dayEvents.length - 3 })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : vm.viewMode === 'year' ? (
            <div className="gcal-scrollbar mt-2.5 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, mIdx) => {
                const monthDate = new Date(currentYear, mIdx, 1)
                const monthName = monthDate.toLocaleDateString(locale, { month: 'long' })
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
                      {shortWeekdays.map((wd, wIdx) => (
                        <div key={`${wd}-${wIdx}`}>{wd}</div>
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
                        const isCurrentDay =
                          today.getDate() === dNum && today.getMonth() === mIdx && today.getFullYear() === currentYear
                        const dayHolidays = vm.calendarPreferences.showVietnameseHolidays
                          ? (vm.holidaysBySolarDate[key] ?? [])
                          : []
                        const yearCellTooltip =
                          dayHolidays
                            .map((holiday) => formatHolidayTooltip(holiday, vm.calendarPreferences.showLunarCalendar))
                            .join(' • ') || undefined

                        return (
                          <div
                            className="relative mx-auto inline-flex min-h-5 items-center justify-center font-medium"
                            key={dNum}
                            title={yearCellTooltip}
                          >
                            <CalendarDateLabel
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
            <div
              className="gcal-scrollbar relative mt-2 max-h-[560px] flex-1 divide-y divide-slate-100 overflow-y-auto pt-1 pr-1 lg:max-h-none lg:min-h-0 dark:divide-white/5"
              onScroll={() => {
                if (!isProgrammaticListScrollRef.current) {
                  shouldAutoScrollListRef.current = false
                }
              }}
              ref={listContainerRef}
            >
              {sortedListDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                    <Icon className="size-6" name="calendar" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{t(CALENDAR_KEYS.EMPTY_EVENTS)}</p>
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
                  const dayHolidays = vm.activeFilterTab === 'task' ? [] : (vm.holidaysBySolarDate[dateKey] ?? [])
                  const isTodayRow = dateKey === todayKey
                  const isAnchorRow = dateKey === listScrollTargetKey
                  const hasAnyItems = dayHolidays.length > 0 || dayEvents.length > 0

                  return (
                    <div
                      className="py-4 first:pt-2"
                      key={dateKey}
                      ref={isAnchorRow ? listAnchorRef : undefined}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span className={isTodayRow ? 'text-blue-600 dark:text-blue-400' : undefined}>
                          {formatDayHeader(dateKey, locale)}
                        </span>
                        {isTodayRow && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {t(CALENDAR_KEYS.TODAY)}
                          </span>
                        )}
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

                      {!hasAnyItems ? (
                        <p className="rounded-xl border border-dashed border-slate-200/80 px-3 py-2.5 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                          {t('calendar.holiday.emptyToday')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {dayHolidays.map((holiday) => {
                            const lunarSubtitle = formatHolidayLunarSubtitle(
                              holiday,
                              vm.calendarPreferences.showLunarCalendar,
                            )
                            const noteText = getHolidayNote(holiday, {
                              typePublic: t('calendar.holiday.typePublic'),
                              typeCompensatory: t('calendar.holiday.typeCompensatory'),
                              typeObservance: t('calendar.holiday.typeObservance'),
                            })
                            return (
                              <button
                                className={`group flex w-full min-w-0 cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all hover:opacity-90 sm:px-4 ${VIETNAM_HOLIDAY_BADGE_CLASSES}`}
                                key={holiday.id}
                                onClick={() => setSelectedHoliday(holiday)}
                                type="button"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                  <span className={`size-3 shrink-0 rounded-full ${VIETNAM_HOLIDAY_DOT_CLASS}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="break-words text-sm font-semibold">
                                        {holiday.name}
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-full border border-current/25 bg-white/70 px-2 py-0.5 text-[11px] font-semibold dark:bg-black/20">
                                        {t('calendar.holiday.calendarName')}
                                      </span>
                                      <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-bold dark:bg-black/20">
                                        {noteText}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-85">
                                      <span>{t('calendar.holiday.allDay')}</span>
                                      {lunarSubtitle && <span>• {lunarSubtitle}</span>}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                          {dayEvents.map((event) => {
                            const isTask = event.entryType === 'task'
                            const eventColor = event.color || event.calendar?.color || '#2563EB'

                            return (
                              <div
                                className={`group flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-slate-300 hover:bg-white sm:px-4 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/15 dark:hover:bg-white/10 ${event.isCompleted ? 'opacity-50' : ''
                                  }`}
                                key={event.id}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                  {isTask ? (
                                    <button
                                      aria-label={event.isCompleted ? 'Mở lại nhiệm vụ' : 'Đánh dấu hoàn thành'}
                                      className={`grid size-5 shrink-0 place-items-center rounded-md border transition-all ${event.isCompleted
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

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`break-words text-sm font-semibold text-slate-900 dark:text-white ${event.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
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
                                      <span>{formatEventTime(event.startDate, event.endDate, event.isAllDay, allDayLabel)}</span>
                                      {event.location && (
                                        <span className="flex min-w-0 items-center gap-1 break-words">
                                          <Icon className="size-3 shrink-0 text-slate-400" name="mapPin" />
                                          <span className="break-words">{event.location}</span>
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

                                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
                      )}
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
        isFirstOccurrence={
          vm.editingEvent
            ? isFirstOccurrenceInSeries(vm.allExpandedEvents, vm.editingEvent, vm.selectedModalDate)
            : true
        }
        isOpen={vm.isEventModalOpen}
        onClose={vm.handleCloseEventModal}
        onOpenCreateCategory={vm.handleOpenCreateCategory}
        onSaved={() => void vm.refreshData(true)}
      />

      <CategoryModal
        initialCategory={vm.editingCategory}
        isOpen={vm.isCategoryModalOpen}
        onClose={() => vm.setIsCategoryModalOpen(false)}
        onSaved={() => void vm.refreshData(true)}
      />

      <CalendarIcsModal
        category={icsCategory}
        isOpen={Boolean(icsCategory)}
        onClose={() => setIcsCategory(null)}
        onImported={() => vm.refreshData(true)}
      />

      {categoryToDelete && (() => {
        const deletingCategory = vm.categories.find((c) => c.id === categoryToDelete)
        return (
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
                  Xóa vĩnh viễn lịch?
                </h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bạn sẽ xóa vĩnh viễn &quot;{deletingCategory?.name || 'lịch này'}&quot; đối với tất cả những người sử dụng lịch này. Bạn có muốn tiếp tục không?
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Toàn bộ sự kiện và nhiệm vụ thuộc lịch này cũng sẽ bị xóa vĩnh viễn.
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
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {eventToDelete && (() => {
        const isEventToDeleteRecurring = Boolean(
          (eventToDelete.recurrence && eventToDelete.recurrence.frequency !== 'none') ||
          (eventToDelete as unknown as { _isOccurrence?: boolean })?._isOccurrence,
        )
        const isGoogleLinked = Boolean(
          eventToDelete.syncOrigin === 'google' ||
          eventToDelete.hasGoogleMappings ||
          eventToDelete.googleSource,
        )

        if (isGoogleLinked && !pendingListGoogleDeleteScope) {
          return (
            <ConfirmDeleteGoogleEventModal
              isDeleting={isDeletingEvent}
              isOpen={true}
              isReadOnly={Boolean(eventToDelete.isGoogleReadOnly)}
              onClose={() => {
                setPendingListGoogleDeleteScope(null)
                setEventToDelete(null)
              }}
              onConfirm={async (scope) => {
                if (!isEventToDeleteRecurring) {
                  setIsDeletingEvent(true)
                  await vm.handleDeleteEvent(
                    eventToDelete.id,
                    undefined,
                    eventToDelete.startDate,
                    scope,
                  )
                  setIsDeletingEvent(false)
                  setPendingListGoogleDeleteScope(null)
                  setEventToDelete(null)
                  return
                }
                setPendingListGoogleDeleteScope(scope)
              }}
              title={eventToDelete.title}
            />
          )
        }

        if (isEventToDeleteRecurring) {
          return (
            <RecurrenceScopeModal
              action="delete"
              entryType={eventToDelete.entryType}
              isFirstOccurrence={isFirstOccurrenceInSeries(vm.allExpandedEvents, eventToDelete)}
              isOpen={true}
              isSubmitting={isDeletingEvent}
              onCancel={() => {
                setPendingListGoogleDeleteScope(null)
                setEventToDelete(null)
              }}
              onConfirm={async (mode) => {
                setIsDeletingEvent(true)
                await vm.handleDeleteEvent(
                  eventToDelete.id,
                  mode,
                  eventToDelete.startDate,
                  pendingListGoogleDeleteScope ?? undefined,
                )
                setIsDeletingEvent(false)
                setPendingListGoogleDeleteScope(null)
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
          isFirstOccurrence={isFirstOccurrenceInSeries(vm.allExpandedEvents, pendingRecurringAction.event)}
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
          isFirstOccurrence={isFirstOccurrenceInSeries(vm.allExpandedEvents, pendingToggleTask)}
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
        googleIntegrations={vm.googleIntegrations}
        isGoogleConfigured={vm.isGoogleConfigured}
        isOpen={isCalendarSettingsOpen}
        isSaving={vm.isSavingPreferences}
        isUpdatingGoogleIntegrationId={vm.isUpdatingGoogleIntegrationId}
        onClose={() => setIsCalendarSettingsOpen(false)}
        onOpenSelectGoogleCalendars={(integration) => {
          setIsReturnToSettingsOnSelectClose(true)
          vm.setSelectingCalendarsIntegrationId(integration.id)
        }}
        onSetPrimaryGoogleAccount={vm.handleSetPrimaryGoogleAccount}
        onStartAddGoogleAccount={() => vm.handleStartGoogleSyncLink({ mode: 'add' })}
        onToggleSyncFromGoogle={vm.handleToggleSyncFromGoogle}
        onToggleSyncToGoogle={vm.handleToggleSyncToGoogle}
        onUpdatePreferences={vm.handleUpdateCalendarPreferences}
        preferences={vm.calendarPreferences}
      />

      <GoogleCalendarSelectModal
        integration={vm.selectingCalendarsIntegration}
        isOpen={Boolean(vm.selectingCalendarsIntegration)}
        isRefreshing={vm.isRefreshingGoogleCalendars}
        isSaving={vm.isSavingGoogleCalendarSelection}
        onBack={
          isReturnToSettingsOnSelectClose
            ? () => {
                setIsReturnToSettingsOnSelectClose(false)
                vm.setSelectingCalendarsIntegrationId(null)
                setIsCalendarSettingsOpen(true)
              }
            : undefined
        }
        onClose={() => {
          setIsReturnToSettingsOnSelectClose(false)
          vm.setSelectingCalendarsIntegrationId(null)
        }}
        onRefreshList={(integrationId) => void vm.handleRefreshGoogleCalendars(integrationId)}
        onSaveSelection={async (integrationId, selectedIds, removedActions) => {
          const saved = await vm.handleSaveGoogleCalendarSelection(
            integrationId,
            selectedIds,
            removedActions,
          )
          if (saved && isReturnToSettingsOnSelectClose) {
            setIsReturnToSettingsOnSelectClose(false)
            setIsCalendarSettingsOpen(true)
          }
        }}
      />

      {vm.undoAction && (
        <div
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-60 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl dark:border-white/15 dark:bg-slate-800"
          role="status"
        >
          <span className="max-w-[240px] truncate">{vm.undoAction.label}</span>
          <button
            className="rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
            disabled={vm.isUndoing}
            onClick={() => void vm.handleUndo()}
            type="button"
          >
            {vm.isUndoing ? 'Đang hoàn tác...' : 'Hoàn tác'}
          </button>
          <button
            aria-label="Đóng thông báo hoàn tác"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            onClick={vm.dismissUndo}
            type="button"
          >
            <Icon className="size-3.5" name="close" />
          </button>
        </div>
      )}
      <HolidayDetailModal
        holiday={selectedHoliday}
        onClose={() => setSelectedHoliday(null)}
        showLunarCalendar={vm.calendarPreferences.showLunarCalendar}
      />

      <GoogleSyncConflictModal
        conflicts={vm.googleConflicts}
        isOpen={vm.isConflictModalOpen}
        onClose={() => vm.setIsConflictModalOpen(false)}
        onResolve={(conflictId, payload) =>
          void vm.handleResolveGoogleConflict(conflictId, payload)
        }
        resolvingConflictId={vm.resolvingConflictId}
      />

      <ConfirmUnlinkGoogleCalendarModal
        googleEmail={vm.unlinkingIntegration?.googleEmail ?? ''}
        isOpen={Boolean(vm.unlinkingIntegration)}
        isUnlinking={vm.isUnlinkingGoogle}
        onClose={() => vm.setUnlinkingIntegration(null)}
        onConfirm={() => void vm.handleConfirmUnlinkGoogle()}
      />

    </div>
  )
}
