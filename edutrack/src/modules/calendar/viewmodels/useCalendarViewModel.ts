import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarPreferences,
  EntryType,
  VietnameseHolidayItem,
  VietnameseLunarDate,
  RecurringUpdateMode,
} from '@/modules/calendar/models/calendar.types'
import {
  DEFAULT_CALENDAR_PREFERENCES,
  groupHolidaysByDate,
} from '@/modules/calendar/models/vietnameseHolidays'
import {
  clipRangeToSupportedLunarYears,
  enumerateDateKeys,
  getVisibleLunarDateRange,
  groupMissingDateRanges,
  isRangeInsideSupportedLunarYears,
  LUNAR_OUT_OF_RANGE_CODE,
  LUNAR_OUT_OF_RANGE_MESSAGE,
  LUNAR_RATE_LIMITED_MESSAGE,
} from '@/modules/calendar/models/lunarCalendar'
import { calendarApi } from '@/modules/calendar/services/calendarApi'
import { expandAllRecurringEvents } from '@/modules/calendar/utils/recurrenceExpander'
import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import { useRecurringConfirmation } from './useRecurringConfirmation'

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'list'

export interface CalendarUndoAction {
  id: number
  label: string
  undo: () => Promise<void>
}

const LUNAR_FETCH_DEBOUNCE_MS = 300

export function useCalendarViewModel() {
  const { confirmation, confirmRecurring } = useRecurringConfirmation()
  const { showToast } = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<CalendarCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [calendarPreferences, setCalendarPreferences] = useState<CalendarPreferences>(
    DEFAULT_CALENDAR_PREFERENCES,
  )
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [lunarDatesBySolarDate, setLunarDatesBySolarDate] = useState<
    Readonly<Record<string, VietnameseLunarDate>>
  >({})
  const [rawHolidaysBySolarDate, setRawHolidaysBySolarDate] = useState<
    Readonly<Record<string, VietnameseHolidayItem[]>>
  >({})
  const lunarDateCacheRef = useRef(new Map<string, VietnameseLunarDate>())
  const inFlightLunarDateKeysRef = useRef(new Set<string>())
  const holidayCacheRef = useRef(new Map<string, VietnameseHolidayItem[]>())
  const [undoAction, setUndoAction] = useState<CalendarUndoAction | null>(null)
  const [isUndoing, setIsUndoing] = useState(false)
  const undoTimerRef = useRef<number | null>(null)

  const dismissUndo = useCallback(() => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    setUndoAction(null)
  }, [])

  const pushUndoAction = useCallback((label: string, undo: () => Promise<void>) => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current)
    }
    setUndoAction({ id: Date.now(), label, undo })
    undoTimerRef.current = window.setTimeout(() => {
      setUndoAction(null)
      undoTimerRef.current = null
    }, 8000)
  }, [])

  const handleUndo = useCallback(async () => {
    if (!undoAction || isUndoing) return
    const actionToRun = undoAction
    try {
      setIsUndoing(true)
      await actionToRun.undo()
      dismissUndo()
      showToast('Đã hoàn tác thao tác.', 'success')
    } catch {
      showToast('Không thể hoàn tác thao tác này.', 'error')
    } finally {
      setIsUndoing(false)
    }
  }, [dismissUndo, isUndoing, showToast, undoAction])
  const inFlightHolidayKeysRef = useRef(new Set<string>())
  const isLunarOutOfRangeNoticeShownRef = useRef(false)

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | EntryType>('all')

  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CalendarCategory | null>(null)

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setIsLoading(true)
      }
      const preferenceRequest = calendarApi.getPreferences().catch((error: unknown) => {
        console.error('Không thể tải cài đặt hiển thị lịch:', error)
        return null
      })
      const [catRes, evRes, preferenceRes] = await Promise.all([
        calendarApi.getCategories(),
        calendarApi.getEvents(),
        preferenceRequest,
      ])

      const fetchedCats = catRes.data?.categories ?? []
      setCategories(fetchedCats)

      setSelectedCategoryIds((prev) => {
        if (prev.length === 0) {
          return fetchedCats.filter((c) => c.isVisible !== false).map((c) => c.id)
        }
        return prev
      })

      if (evRes.data?.events) {
        setEvents(evRes.data.events)
      }
      if (preferenceRes?.data?.preferences) {
        setCalendarPreferences({
          ...DEFAULT_CALENDAR_PREFERENCES,
          ...preferenceRes.data.preferences,
        })
      }
      setIsPreferencesLoaded(true)
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu lịch:', err)
    } finally {
      if (!isSilent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isPreferencesLoaded || !calendarPreferences.showLunarCalendar) return

    const visibleRange = getVisibleLunarDateRange(viewMode, currentDate)
    if (!visibleRange) return

    // Gộp các lần chuyển ngày/tháng/năm liên tiếp thành một lần tải để không vượt giới hạn request.
    const timer = window.setTimeout(() => {
      if (isRangeInsideSupportedLunarYears(visibleRange)) {
        isLunarOutOfRangeNoticeShownRef.current = false
      } else if (!isLunarOutOfRangeNoticeShownRef.current) {
        isLunarOutOfRangeNoticeShownRef.current = true
        showToast(LUNAR_OUT_OF_RANGE_MESSAGE, 'info')
      }

      const supportedRange = clipRangeToSupportedLunarYears(visibleRange)
      if (!supportedRange) return

      const unavailableKeys = new Set<string>([
        ...lunarDateCacheRef.current.keys(),
        ...inFlightLunarDateKeysRef.current,
      ])
      const missingRanges = groupMissingDateRanges(supportedRange, unavailableKeys)

      for (const missingRange of missingRanges) {
        const requestedKeys = enumerateDateKeys(missingRange)
        requestedKeys.forEach((dateKey) => inFlightLunarDateKeysRef.current.add(dateKey))

        void calendarApi.getLunarDates(missingRange.from, missingRange.to)
          .then((response) => {
            for (const lunarDate of response.data?.dates ?? []) {
              lunarDateCacheRef.current.set(lunarDate.solarDate, lunarDate)
            }
            setLunarDatesBySolarDate(Object.fromEntries(lunarDateCacheRef.current))
          })
          .catch((error: unknown) => {
            if (error instanceof ApiError && error.code === LUNAR_OUT_OF_RANGE_CODE) {
              showToast(LUNAR_OUT_OF_RANGE_MESSAGE, 'info')
            } else if (error instanceof ApiError && error.status === 429) {
              showToast(LUNAR_RATE_LIMITED_MESSAGE, 'info')
            } else {
              showToast('Không thể tải dữ liệu lịch Âm. Lịch Dương vẫn được hiển thị bình thường.', 'error')
            }
          })
          .finally(() => {
            requestedKeys.forEach((dateKey) => inFlightLunarDateKeysRef.current.delete(dateKey))
          })
      }
    }, LUNAR_FETCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [calendarPreferences.showLunarCalendar, currentDate, isPreferencesLoaded, showToast, viewMode])

  useEffect(() => {
    if (!isPreferencesLoaded || !calendarPreferences.showVietnameseHolidays) return

    const visibleRange = getVisibleLunarDateRange(viewMode, currentDate)
    if (!visibleRange) return

    const timer = window.setTimeout(() => {
      const unavailableKeys = new Set<string>([
        ...holidayCacheRef.current.keys(),
        ...inFlightHolidayKeysRef.current,
      ])
      const missingRanges = groupMissingDateRanges(visibleRange, unavailableKeys)

      for (const missingRange of missingRanges) {
        const requestedKeys = enumerateDateKeys(missingRange)
        requestedKeys.forEach((dateKey) => inFlightHolidayKeysRef.current.add(dateKey))

        void calendarApi.getHolidays(missingRange.from, missingRange.to)
          .then((response) => {
            const grouped = new Map<string, VietnameseHolidayItem[]>()
            for (const dateKey of requestedKeys) grouped.set(dateKey, [])
            for (const holiday of response.data?.holidays ?? []) {
              const existing = grouped.get(holiday.solarDate) ?? []
              existing.push(holiday)
              grouped.set(holiday.solarDate, existing)
            }
            for (const [dateKey, items] of grouped.entries()) {
              holidayCacheRef.current.set(dateKey, items)
            }
            setRawHolidaysBySolarDate(Object.fromEntries(holidayCacheRef.current))
          })
          .catch(() => {
            // Giữ lịch hoạt động bình thường nếu tải ngày lễ thất bại tạm thời
          })
          .finally(() => {
            requestedKeys.forEach((dateKey) => inFlightHolidayKeysRef.current.delete(dateKey))
          })
      }
    }, LUNAR_FETCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [calendarPreferences.showVietnameseHolidays, currentDate, isPreferencesLoaded, viewMode])

  const handleUpdateCalendarPreferences = async (
    preferences: Partial<CalendarPreferences>,
    options?: { silent?: boolean },
  ): Promise<boolean> => {
    const previous = calendarPreferences
    setCalendarPreferences((prev) => ({
      ...prev,
      ...preferences,
    }))
    try {
      setIsSavingPreferences(true)
      const response = await calendarApi.updatePreferences(preferences)
      setCalendarPreferences((prev) => ({
        ...prev,
        ...preferences,
        ...(response.data?.preferences ?? {}),
      }))
      if (!options?.silent) {
        showToast('Đã cập nhật cài đặt hiển thị lịch.', 'success')
      }
      return true
    } catch {
      setCalendarPreferences(previous)
      showToast('Không thể lưu cài đặt, vui lòng thử lại.', 'error')
      return false
    } finally {
      setIsSavingPreferences(false)
    }
  }

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (active) void fetchData(false)
    }, 0)

    const handleRefresh = () => {
      void fetchData(true)
    }
    window.addEventListener('edutrack-calendar-refresh', handleRefresh)

    return () => {
      active = false
      window.clearTimeout(timer)
      window.removeEventListener('edutrack-calendar-refresh', handleRefresh)
    }
  }, [fetchData])

  const handleToggleCategoryVisibility = async (categoryId: string) => {
    const isCurrentlyChecked = selectedCategoryIds.includes(categoryId)
    const nextChecked = isCurrentlyChecked
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId]

    setSelectedCategoryIds(nextChecked)

    try {
      await calendarApi.toggleCategoryVisibility(categoryId, !isCurrentlyChecked)
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái lịch:', err)
    }
  }

  const handleShowOnlyCategory = async (categoryId: string) => {
    setSelectedCategoryIds([categoryId])
    setCategories((prev) =>
      prev.map((c) => ({ ...c, isVisible: c.id === categoryId })),
    )
    try {
      await calendarApi.setOnlyCategoryVisible(categoryId)
    } catch (err) {
      console.error('Lỗi khi chỉ hiển thị lịch này:', err)
      fetchData()
    }
  }

  const handleShowAllCategories = async () => {
    const allIds = categories.map((c) => c.id)
    setSelectedCategoryIds(allIds)
    setCategories((prev) =>
      prev.map((c) => ({ ...c, isVisible: true })),
    )
    try {
      await calendarApi.setAllCategoriesVisibility(true)
    } catch (err) {
      console.error('Lỗi khi hiển thị tất cả các lịch:', err)
      fetchData(true)
    }
  }

  const handleQuickChangeColor = async (categoryId: string, color: string) => {
    try {
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, color } : c)),
      )
      setEvents((prev) =>
        prev.map((e) =>
          e.calendarId === categoryId
            ? { ...e, color: e.inheritsCalendarColor ? color : e.color, calendar: e.calendar ? { ...e.calendar, color } : null }
            : e,
        ),
      )
      await calendarApi.updateCategory(categoryId, { color })
    } catch (err) {
      console.error('Lỗi khi đổi màu lịch:', err)
      fetchData(true)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await calendarApi.deleteCategory(categoryId)
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId))
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      fetchData(true)
    } catch (err) {
      console.error('Lỗi khi xóa lịch:', err)
    }
  }

  const handleToday = () => setCurrentDate(new Date())

  const handlePrev = () => {
    setCurrentDate((d) => {
      if (viewMode === 'day') {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
      }
      if (viewMode === 'week') {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
      }
      if (viewMode === 'year') {
        return new Date(d.getFullYear() - 1, d.getMonth(), 1)
      }
      return new Date(d.getFullYear(), d.getMonth() - 1, 1)
    })
  }

  const handleNext = () => {
    setCurrentDate((d) => {
      if (viewMode === 'day') {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      }
      if (viewMode === 'week') {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
      }
      if (viewMode === 'year') {
        return new Date(d.getFullYear() + 1, d.getMonth(), 1)
      }
      return new Date(d.getFullYear(), d.getMonth() + 1, 1)
    })
  }

  const handleSelectDate = (date: Date) => {
    setCurrentDate(date)
  }

  const handleOpenCreateEvent = (forDate?: Date) => {
    setEditingEvent(null)
    setSelectedModalDate(forDate ?? currentDate)
    setIsEventModalOpen(true)
  }

  const handleOpenEditEvent = (event: CalendarEvent) => {
    const eventWithMeta = event as CalendarEvent & { _isOccurrence?: boolean; _baseEventId?: string }
    const baseId = eventWithMeta._baseEventId || event.id

    void calendarApi.getEventById(baseId).then((res) => {
      const fullEvent = res.data?.event
      if (fullEvent) {
        setEditingEvent((current) => current && resolveBaseEventId(current.id) === baseId ? fullEvent : current)
      }
    }).catch(() => {})

    setEditingEvent(events.find((item) => item.id === baseId) ?? event)
    setSelectedModalDate(new Date(event.startDate))
    setIsEventModalOpen(true)
  }

  const handleOpenCreateCategory = () => {
    setEditingCategory(null)
    setIsCategoryModalOpen(true)
  }

  const handleOpenEditCategory = (category: CalendarCategory) => {
    setEditingCategory(category)
    setIsCategoryModalOpen(true)
  }

  const resolveBaseEventId = (eventId: string): string => {
    if (eventId.includes('__occ_')) {
      return eventId.split('__occ_')[0] ?? eventId
    }
    return eventId
  }

  const handleToggleComplete = async (
    eventId: string,
    currentStatus: boolean,
    mode?: 'this' | 'following' | 'all',
    targetDate?: string,
  ) => {
    const baseId = resolveBaseEventId(eventId)
    const task = events.find((event) => event.id === baseId)
    if (!task) return
    if (!mode && task.recurrence && task.recurrence.frequency !== 'none') {
      if (!await confirmRecurring(currentStatus ? 'reopen' : 'complete', task.entryType, task.title)) return
    }
    const prevExceptions = [...(task.exceptionDates ?? [])]
    try {
      if (mode && mode !== 'all') {
        const res = await calendarApi.toggleTaskComplete(baseId, !currentStatus, mode, targetDate)
        await fetchData(true)
        const createdId = res.data?.event?.id
        if (mode === 'this' && createdId) {
          pushUndoAction(
            `${!currentStatus ? 'Đã hoàn thành' : 'Đã mở lại'} “${task.title}”`,
            async () => {
              await calendarApi.deleteEvent(createdId, 'all')
              await calendarApi.updateEvent(baseId, { exceptionDates: prevExceptions })
              await fetchData(true)
            },
          )
        }
      } else {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === baseId
              ? { ...e, isCompleted: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : null }
              : e,
          ),
        )
        await calendarApi.toggleTaskComplete(baseId, !currentStatus)
        pushUndoAction(
          `${!currentStatus ? 'Đã hoàn thành' : 'Đã mở lại'} “${task.title}”`,
          async () => {
            await calendarApi.toggleTaskComplete(baseId, currentStatus)
            await fetchData(true)
          },
        )
      }
    } catch (err) {
      console.error('Lỗi khi toggle task:', err)
      fetchData(true)
    }
  }

  const handleDeleteEvent = async (
    eventId: string,
    mode?: 'this' | 'following' | 'all',
    date?: string,
  ) => {
    const baseId = resolveBaseEventId(eventId)
    const targetEvent = events.find((e) => e.id === baseId)
    const prevExceptions = [...(targetEvent?.exceptionDates ?? [])]
    try {
      if (mode && mode !== 'all') {
        await calendarApi.deleteEvent(baseId, mode, date)
        await fetchData(true)
        if (mode === 'this' && targetEvent) {
          pushUndoAction(`Đã xóa lần diễn ra “${targetEvent.title}”`, async () => {
            await calendarApi.updateEvent(baseId, { exceptionDates: prevExceptions })
            await fetchData(true)
          })
        }
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== baseId))
        await calendarApi.deleteEvent(baseId, mode, date)
        if (targetEvent && (!targetEvent.recurrence || targetEvent.recurrence.frequency === 'none')) {
          pushUndoAction(`Đã xóa “${targetEvent.title}”`, async () => {
            await calendarApi.createEvent({
              calendarId: targetEvent.calendarId ?? null,
              entryType: targetEvent.entryType,
              title: targetEvent.title,
              description: targetEvent.description,
              priority: targetEvent.priority,
              startDate: targetEvent.startDate,
              endDate: targetEvent.endDate,
              deadline: targetEvent.deadline ?? null,
              isAllDay: targetEvent.isAllDay,
              location: targetEvent.location,
              onlineMeetingUrl: targetEvent.onlineMeetingUrl,
              submissionUrl: targetEvent.submissionUrl,
              color: targetEvent.inheritsCalendarColor ? '' : targetEvent.color,
              availability: targetEvent.availability,
              visibility: targetEvent.visibility,
              timeZone: targetEvent.timeZone,
              guests: targetEvent.guests,
              checklist: targetEvent.checklist,
              reminders: targetEvent.reminders,
              recurrence: targetEvent.recurrence,
            })
            await fetchData(true)
          })
        }
      }
    } catch (err) {
      console.error('Lỗi khi xóa sự kiện:', err)
      fetchData(true)
    }
  }

  const handleMoveEvent = async (
    eventId: string,
    newStartDateIso: string,
    newEndDateIso: string,
    isAllDay?: boolean,
    mode?: RecurringUpdateMode,
    targetDate?: string,
  ) => {
    const baseId = resolveBaseEventId(eventId)
    const prevEvents = [...events]
    const targetEvent = events.find((e) => e.id === baseId)
    if (!targetEvent) return

    const prevStartDate = targetEvent.startDate
    const prevEndDate = targetEvent.endDate
    const prevIsAllDay = targetEvent.isAllDay
    const prevDeadline = targetEvent.deadline ?? null
    const prevExceptions = [...(targetEvent.exceptionDates ?? [])]

    let nextDeadlineIso: string | null | undefined = undefined
    if (targetEvent.deadline) {
      const origStartMs = new Date(targetEvent.startDate).getTime()
      const origDeadlineMs = new Date(targetEvent.deadline).getTime()
      const offsetMs = origDeadlineMs - origStartMs
      const newStartMs = new Date(newStartDateIso).getTime()
      nextDeadlineIso = new Date(newStartMs + offsetMs).toISOString()
    }

    try {
      const res = await calendarApi.updateEvent(baseId, {
        startDate: newStartDateIso,
        endDate: newEndDateIso,
        isAllDay: typeof isAllDay === 'boolean' ? isAllDay : undefined,
        deadline: nextDeadlineIso,
        mode,
        targetDate,
      })

      if (mode && mode !== 'all') {
        await fetchData(true)
        const createdId = res.data?.event?.id
        if (mode === 'this' && createdId) {
          pushUndoAction(`Đã cập nhật “${targetEvent.title}”`, async () => {
            await calendarApi.deleteEvent(createdId, 'all')
            await calendarApi.updateEvent(baseId, { exceptionDates: prevExceptions })
            await fetchData(true)
          })
        }
      } else {
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === baseId) {
              return res.data?.event || {
                ...e,
                startDate: newStartDateIso,
                endDate: newEndDateIso,
                isAllDay: typeof isAllDay === 'boolean' ? isAllDay : e.isAllDay,
                deadline: nextDeadlineIso !== undefined ? nextDeadlineIso : e.deadline,
              }
            }
            return e
          }),
        )
        pushUndoAction(`Đã cập nhật “${targetEvent.title}”`, async () => {
          await calendarApi.updateEvent(baseId, {
            startDate: prevStartDate,
            endDate: prevEndDate,
            isAllDay: prevIsAllDay,
            deadline: prevDeadline,
          })
          await fetchData(true)
        })
      }
    } catch (err) {
      console.error('Lỗi khi di chuyển sự kiện:', err)
      setEvents(prevEvents)
    }
  }

  const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1)
  const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 31, 23, 59, 59)
  const expandedEvents = expandAllRecurringEvents(events, windowStart, windowEnd)

  const archivedIds = new Set(categories.filter((category) => category.settings?.archived).map((category) => category.id))
  const userCategoryIds = new Set(categories.map((category) => category.id))

  const displayedEvents = expandedEvents.filter((e) => {
    if (e.calendarId && archivedIds.has(e.calendarId)) return false
    if (e.calendarId && userCategoryIds.has(e.calendarId) && !selectedCategoryIds.includes(e.calendarId)) {
      return false
    }
    if (activeFilterTab !== 'all' && e.entryType !== activeFilterTab) {
      return false
    }
    return true
  })

  const getDateTitleLabel = (): string => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    if (viewMode === 'week') {
      const day = currentDate.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const monday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + diffToMonday)
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
      return `${monday.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })} – ${sunday.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}`
    }
    if (viewMode === 'year') {
      return `Năm ${currentDate.getFullYear()}`
    }
    return currentDate.toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    })
  }

  const dateTitleLabel = getDateTitleLabel()
  const holidaysBySolarDate = groupHolidaysByDate(rawHolidaysBySolarDate, calendarPreferences)

  return {
    confirmation,
    categories,
    selectedCategoryIds,
    events: displayedEvents,
    allExpandedEvents: expandedEvents,
    allEventsCount: events.length,
    undoAction,
    isUndoing,
    handleUndo,
    dismissUndo,
    isLoading,
    calendarPreferences,
    isSavingPreferences,
    lunarDatesBySolarDate,
    holidaysBySolarDate,
    viewMode,
    setViewMode,
    activeFilterTab,
    setActiveFilterTab,
    currentDate,
    dateTitleLabel,
    handleToday,
    handlePrev,
    handleNext,
    handleSelectDate,
    handleToggleCategoryVisibility,
    handleShowOnlyCategory,
    handleShowAllCategories,
    handleQuickChangeColor,
    handleDeleteCategory,
    isEventModalOpen,
    editingEvent,
    selectedModalDate,
    isCategoryModalOpen,
    editingCategory,
    setIsCategoryModalOpen,
    handleOpenCreateEvent,
    handleOpenEditEvent,
    handleCloseEventModal: () => setIsEventModalOpen(false),
    handleOpenCreateCategory,
    handleOpenEditCategory,
    handleToggleComplete,
    handleDeleteEvent,
    handleMoveEvent,
    handleUpdateCalendarPreferences,
    refreshData: fetchData,
  }
}
