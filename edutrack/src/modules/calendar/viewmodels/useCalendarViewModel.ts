import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarPreferences,
  EntryType,
  GoogleCalendarConflictItem,
  GoogleCalendarIntegrationStatus,
  GoogleSyncJobItem,
  VietnameseHolidayItem,
  VietnameseLunarDate,
  RecurringUpdateMode,
} from '@/modules/calendar/models/calendar.types'
import { CALENDAR_KEYS } from '@/modules/calendar/models/calendarI18nKeys'
import { resolveGoogleSyncRedirectFeedback } from '@/modules/calendar/models/googleCalendarSync'
import {
  DEFAULT_CALENDAR_PREFERENCES,
  getVisibleHolidayDateRange,
  groupHolidaysByDate,
} from '@/modules/calendar/models/vietnameseHolidays'
import {
  chunkDateRange,
  clipRangeToSupportedLunarYears,
  enumerateDateKeys,
  getRangeForDateKeys,
  getVisibleLunarDateRange,
  groupMissingDateRanges,
  isRangeInsideSupportedLunarYears,
  LUNAR_OUT_OF_RANGE_CODE,
  toLocalDateKey,
} from '@/modules/calendar/models/lunarCalendar'
import { calendarApi } from '@/modules/calendar/services/calendarApi'
import { expandAllRecurringEvents } from '@/modules/calendar/utils/recurrenceExpander'
import { interfaceLocale } from '@/modules/i18n/services/translator'
import { useTranslation } from '@/modules/i18n/viewmodels/useTranslation'
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
  const { language, t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<CalendarCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(true)
  const [googleIntegrations, setGoogleIntegrations] = useState<GoogleCalendarIntegrationStatus[]>([])
  const [googleSyncJobs, setGoogleSyncJobs] = useState<GoogleSyncJobItem[]>([])
  const [googleConflicts, setGoogleConflicts] = useState<GoogleCalendarConflictItem[]>([])
  const [syncingGoogleIntegrationId, setSyncingGoogleIntegrationId] = useState<string | null>(null)
  const [isSyncingAllGoogle, setIsSyncingAllGoogle] = useState(false)
  const [isUpdatingGoogleIntegrationId, setIsUpdatingGoogleIntegrationId] = useState<string | null>(null)
  const [isRefreshingGoogleCalendars, setIsRefreshingGoogleCalendars] = useState(false)
  const [isSavingGoogleCalendarSelection, setIsSavingGoogleCalendarSelection] = useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false)
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null)
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false)
  const [selectingCalendarsIntegrationId, setSelectingCalendarsIntegrationId] = useState<string | null>(null)
  const [unlinkingIntegration, setUnlinkingIntegration] = useState<GoogleCalendarIntegrationStatus | null>(null)
  const lastAutoSyncTriggerRef = useRef(0)
  const [calendarPreferences, setCalendarPreferences] = useState<CalendarPreferences>(
    DEFAULT_CALENDAR_PREFERENCES,
  )
  const calendarPreferencesRef = useRef<CalendarPreferences>(DEFAULT_CALENDAR_PREFERENCES)
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
  const isHolidayOutOfRangeNoticeShownRef = useRef(false)

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | EntryType>('all')

  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CalendarCategory | null>(null)

  useEffect(() => {
    calendarPreferencesRef.current = calendarPreferences
  }, [calendarPreferences])

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setIsLoading(true)
      }
      let preferencesLoadFailed = false
      const preferenceRequest = calendarApi.getPreferences().catch((error: unknown) => {
        preferencesLoadFailed = true
        console.error('Không thể tải cài đặt hiển thị lịch:', error)
        return null
      })
      const googleIntegrationsRequest = calendarApi.getGoogleIntegrations().catch(() => null)
      const [catRes, evRes, preferenceRes, googleRes] = await Promise.all([
        calendarApi.getCategories(),
        calendarApi.getEvents(),
        preferenceRequest,
        googleIntegrationsRequest,
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
      } else if (preferencesLoadFailed && !isSilent) {
        showToast(t('calendar.settings.loadError'), 'error')
      }
      if (googleRes?.data) {
        const nextIntegrations = googleRes.data.integrations ?? []
        setIsGoogleConfigured(googleRes.data.isConfigured)
        setGoogleIntegrations(nextIntegrations)
        setGoogleSyncJobs(googleRes.data.jobs ?? [])
        const totalPendingConflicts = nextIntegrations.reduce(
          (sum, item) => sum + (item.pendingConflictsCount || 0),
          0,
        )
        if (totalPendingConflicts > 0) {
          void calendarApi
            .getGoogleConflicts()
            .then((res) => {
              if (res.data?.conflicts) {
                setGoogleConflicts(res.data.conflicts)
              }
            })
            .catch(() => { })
        } else {
          setGoogleConflicts([])
        }
      }
      setIsPreferencesLoaded(true)
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu lịch:', err)
    } finally {
      if (!isSilent) {
        setIsLoading(false)
      }
    }
  }, [showToast, t])

  const holidayVisibleRange = getVisibleHolidayDateRange(viewMode, currentDate)
  const holidayRangeFrom = holidayVisibleRange.from
  const holidayRangeTo = holidayVisibleRange.to

  useEffect(() => {
    if (!isPreferencesLoaded || !calendarPreferences.showVietnameseHolidays) return
    if (!holidayRangeFrom || !holidayRangeTo) return

    const visibleRange = { from: holidayRangeFrom, to: holidayRangeTo }

    const timer = window.setTimeout(() => {
      if (isRangeInsideSupportedLunarYears(visibleRange)) {
        isHolidayOutOfRangeNoticeShownRef.current = false
      } else if (!isHolidayOutOfRangeNoticeShownRef.current) {
        isHolidayOutOfRangeNoticeShownRef.current = true
        showToast(t('calendar.holiday.outOfRange'), 'info')
      }

      const supportedRange = clipRangeToSupportedLunarYears(visibleRange)
      if (!supportedRange) return

      const unavailableKeys = new Set<string>([
        ...holidayCacheRef.current.keys(),
        ...inFlightHolidayKeysRef.current,
      ])
      const missingRanges = groupMissingDateRanges(supportedRange, unavailableKeys)

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
            showToast(t('calendar.holiday.loadError'), 'error')
          })
          .finally(() => {
            requestedKeys.forEach((dateKey) => inFlightHolidayKeysRef.current.delete(dateKey))
          })
      }
    }, LUNAR_FETCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    calendarPreferences.showVietnameseHolidays,
    holidayRangeFrom,
    holidayRangeTo,
    isPreferencesLoaded,
    showToast,
    t,
  ])

  const handleUpdateCalendarPreferences = async (
    preferences: Partial<CalendarPreferences>,
    options?: { silent?: boolean },
  ): Promise<boolean> => {
    const isOptimistic = Boolean(options?.silent)
    const rollbackValues: Partial<CalendarPreferences> = {}
    if (isOptimistic) {
      const currentSnapshot = calendarPreferencesRef.current
      for (const key of Object.keys(preferences) as (keyof CalendarPreferences)[]) {
        rollbackValues[key] = currentSnapshot[key]
      }
      setCalendarPreferences((prev) => ({
        ...prev,
        ...preferences,
      }))
    }
    try {
      setIsSavingPreferences(true)
      const response = await calendarApi.updatePreferences(preferences)
      setCalendarPreferences((prev) => ({
        ...prev,
        ...preferences,
        ...(response.data?.preferences ?? {}),
      }))
      if (!options?.silent) {
        showToast(t('calendar.settings.saveSuccess'), 'success')
      }
      return true
    } catch {
      if (isOptimistic) {
        setCalendarPreferences((prev) => ({
          ...prev,
          ...rollbackValues,
        }))
      }
      showToast(t('calendar.settings.saveError'), 'error')
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
    }).catch(() => { })

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
    googleDeleteScope?: 'local_only' | 'both',
  ) => {
    const baseId = resolveBaseEventId(eventId)
    const targetEvent = events.find((e) => e.id === baseId)
    const prevExceptions = [...(targetEvent?.exceptionDates ?? [])]
    try {
      if (mode && mode !== 'all') {
        await calendarApi.deleteEvent(baseId, mode, date, googleDeleteScope)
        await fetchData(true)
        if (mode === 'this' && targetEvent) {
          pushUndoAction(`Đã xóa lần diễn ra “${targetEvent.title}”`, async () => {
            await calendarApi.updateEvent(baseId, { exceptionDates: prevExceptions })
            await fetchData(true)
          })
        }
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== baseId))

        await calendarApi.deleteEvent(baseId, mode, date, googleDeleteScope)
        if (googleDeleteScope === 'both') {
          await fetchData(true)
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
    } catch (err: unknown) {
      console.error('Lỗi khi xóa sự kiện:', err)
      showToast(err instanceof ApiError ? err.message : 'Không thể xóa sự kiện.', 'error')
      await fetchData(true)
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
    } catch (err: unknown) {
      console.error('Lỗi khi di chuyển sự kiện:', err)
      setEvents(prevEvents)
      showToast(
        err instanceof ApiError ? err.message : 'Không thể cập nhật thời gian sự kiện.',
        'error',
      )
    }
  }

  const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1)
  const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 31, 23, 59, 59)
  const expandedEvents = expandAllRecurringEvents(events, windowStart, windowEnd)

  const archivedIds = new Set(categories.filter((category) => category.settings?.archived).map((category) => category.id))
  const userCategoryIds = new Set(categories.map((category) => category.id))
  const hiddenGoogleCalendarIds = new Set<string>()
  for (const integration of googleIntegrations) {
    for (const cal of integration.calendars) {
      if (cal.isVisible === false) {
        hiddenGoogleCalendarIds.add(cal.id)
      }
    }
  }

  const displayedEvents = expandedEvents.filter((e) => {
    if (e.googleSource?.calendarConnectionId && hiddenGoogleCalendarIds.has(e.googleSource.calendarConnectionId)) {
      return false
    }
    if (e.calendarId && archivedIds.has(e.calendarId)) return false
    if (e.calendarId && userCategoryIds.has(e.calendarId) && !selectedCategoryIds.includes(e.calendarId)) {
      return false
    }
    if (activeFilterTab !== 'all' && e.entryType !== activeFilterTab) {
      return false
    }
    return true
  })

  const lunarVisibleRange = viewMode === 'list'
    ? getRangeForDateKeys(displayedEvents.map((event) => toLocalDateKey(new Date(event.startDate))))
    : getVisibleLunarDateRange(viewMode, currentDate)
  const lunarRangeFrom = lunarVisibleRange?.from ?? null
  const lunarRangeTo = lunarVisibleRange?.to ?? null

  useEffect(() => {
    if (!isPreferencesLoaded || !calendarPreferences.showLunarCalendar) return
    if (!lunarRangeFrom || !lunarRangeTo) return

    const visibleRange = { from: lunarRangeFrom, to: lunarRangeTo }

    // Gộp các lần chuyển ngày/tháng/năm liên tiếp thành một lần tải để không vượt giới hạn request.
    const timer = window.setTimeout(() => {
      if (isRangeInsideSupportedLunarYears(visibleRange)) {
        isLunarOutOfRangeNoticeShownRef.current = false
      } else if (!isLunarOutOfRangeNoticeShownRef.current) {
        isLunarOutOfRangeNoticeShownRef.current = true
        showToast(t('calendar.lunar.outOfRange'), 'info')
      }

      const supportedRange = clipRangeToSupportedLunarYears(visibleRange)
      if (!supportedRange) return

      const unavailableKeys = new Set<string>([
        ...lunarDateCacheRef.current.keys(),
        ...inFlightLunarDateKeysRef.current,
      ])
      const missingRanges = groupMissingDateRanges(supportedRange, unavailableKeys).flatMap((range) =>
        chunkDateRange(range),
      )

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
              showToast(t('calendar.lunar.outOfRange'), 'info')
            } else if (error instanceof ApiError && error.status === 429) {
              showToast(t('calendar.lunar.rateLimited'), 'info')
            } else {
              showToast(t('calendar.lunar.loadError'), 'error')
            }
          })
          .finally(() => {
            requestedKeys.forEach((dateKey) => inFlightLunarDateKeysRef.current.delete(dateKey))
          })
      }
    }, LUNAR_FETCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    calendarPreferences.showLunarCalendar,
    isPreferencesLoaded,
    lunarRangeFrom,
    lunarRangeTo,
    showToast,
    t,
  ])

  const getDateTitleLabel = (): string => {
    const locale = interfaceLocale(language)
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    if (viewMode === 'week') {
      const day = currentDate.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const monday = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + diffToMonday,
      )
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
      return `${monday.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })} – ${sunday.toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: 'numeric' })}`
    }
    if (viewMode === 'year') {
      return t(CALENDAR_KEYS.YEAR_TITLE, { year: currentDate.getFullYear() })
    }
    return currentDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })
  }

  const applyGoogleIntegrationsPayload = useCallback(
    (payload?: {
      isConfigured: boolean
      integrations: GoogleCalendarIntegrationStatus[]
      jobs: GoogleSyncJobItem[]
    }) => {
      if (!payload) return
      setIsGoogleConfigured(payload.isConfigured)
      setGoogleIntegrations(payload.integrations ?? [])
      setGoogleSyncJobs(payload.jobs ?? [])
    },
    [],
  )

  const handleStartGoogleSyncLink = (options?: {
    mode?: 'add' | 'reconnect'
    integrationId?: string
  }) => {
    void (async () => {
      try {
        const result = await calendarApi.createGoogleAuthorization(options)
        if (!result.data?.authorizationUrl) throw new Error('Missing OAuth authorization URL')
        window.location.assign(result.data.authorizationUrl)
      } catch (err: unknown) {
        showToast(
          err instanceof ApiError
            ? err.message
            : 'Không thể kết nối Google, vui lòng thử lại',
          'error',
        )
      }
    })()
  }

  const handleSyncGoogleIntegration = useCallback(
    async (integrationId: string, options?: { silent?: boolean }): Promise<void> => {
      if (syncingGoogleIntegrationId || isSyncingAllGoogle) return
      lastAutoSyncTriggerRef.current = Date.now()
      try {
        setSyncingGoogleIntegrationId(integrationId)
        const res = await calendarApi.syncGoogleIntegration(integrationId)
        applyGoogleIntegrationsPayload(res.data)
        const target = res.data?.integrations.find((item) => item.id === integrationId)
        await fetchData(true)

        if (target && target.pendingConflictsCount > 0) {
          const conflictRes = await calendarApi.getGoogleConflicts().catch(() => null)
          if (conflictRes?.data?.conflicts) {
            setGoogleConflicts(conflictRes.data.conflicts)
          }
          if (!options?.silent) {
            showToast(
              'Đã đồng bộ nhưng có xung đột dữ liệu cần bạn chọn.',
              'warning',
            )
            setIsConflictModalOpen(true)
          }
        } else if (!options?.silent) {
          const hasRunningInitialSync = Boolean(
            target?.calendars.some(
              (cal) =>
                cal.isSelected &&
                (cal.syncStatus === 'initial_sync_pending' ||
                  cal.syncStatus === 'initial_sync_running'),
            ),
          )
          showToast(
            hasRunningInitialSync
              ? 'Đã cập nhật lịch hiện có và đang đồng bộ ban đầu cho lịch mới.'
              : 'Đã đồng bộ xong Google Lịch.',
            'success',
          )
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === 'GOOGLE_CALENDAR_REAUTH_REQUIRED') {
          await fetchData(true)
          showToast(err.message, 'error')
        } else if (!options?.silent) {
          const msg =
            err instanceof ApiError
              ? err.message
              : 'Lỗi kết nối Google Lịch trong lúc đồng bộ. Vui lòng thử lại.'
          showToast(msg, 'error')
        }
      } finally {
        setSyncingGoogleIntegrationId(null)
      }
    },
    [
      applyGoogleIntegrationsPayload,
      fetchData,
      isSyncingAllGoogle,
      showToast,
      syncingGoogleIntegrationId,
    ],
  )

  const handleSyncAllGoogleIntegrations = useCallback(async (): Promise<void> => {
    const connected = googleIntegrations.filter((acc) => acc.status === 'connected')
    if (syncingGoogleIntegrationId || isSyncingAllGoogle || connected.length === 0) return
    lastAutoSyncTriggerRef.current = Date.now()
    try {
      setIsSyncingAllGoogle(true)
      const results = await Promise.allSettled(
        connected.map((acc) => calendarApi.syncGoogleIntegration(acc.id)),
      )
      await fetchData(true)

      const rejectedErrors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason as unknown)
      const reauthError = rejectedErrors.find(
        (err): err is ApiError =>
          err instanceof ApiError && err.code === 'GOOGLE_CALENDAR_REAUTH_REQUIRED',
      )

      if (reauthError) {
        showToast(reauthError.message, 'error')
        return
      }
      if (rejectedErrors.length === connected.length) {
        const firstErr = rejectedErrors[0]
        showToast(
          firstErr instanceof ApiError
            ? firstErr.message
            : 'Lỗi kết nối Google Lịch trong lúc đồng bộ. Vui lòng thử lại.',
          'error',
        )
        return
      }

      const latestIntegrations = results
        .filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof calendarApi.syncGoogleIntegration>>> =>
            r.status === 'fulfilled',
        )
        .at(-1)?.value.data?.integrations
      const totalConflicts = (latestIntegrations ?? []).reduce(
        (sum, item) => sum + (item.pendingConflictsCount || 0),
        0,
      )
      if (totalConflicts > 0) {
        const conflictRes = await calendarApi.getGoogleConflicts().catch(() => null)
        if (conflictRes?.data?.conflicts) {
          setGoogleConflicts(conflictRes.data.conflicts)
        }
        showToast('Đã đồng bộ nhưng có xung đột dữ liệu cần bạn chọn.', 'warning')
        setIsConflictModalOpen(true)
      } else {
        const hasInitialSync = Boolean(
          latestIntegrations?.some((acc) =>
            acc.calendars.some(
              (cal) =>
                cal.isSelected &&
                (cal.syncStatus === 'initial_sync_pending' ||
                  cal.syncStatus === 'initial_sync_running'),
            ),
          ),
        )
        showToast(
          hasInitialSync
            ? 'Đã cập nhật lịch hiện có và đang đồng bộ ban đầu cho lịch mới.'
            : 'Đã đồng bộ xong Google Lịch.',
          'success',
        )
      }
    } finally {
      setIsSyncingAllGoogle(false)
    }
  }, [
    fetchData,
    googleIntegrations,
    isSyncingAllGoogle,
    showToast,
    syncingGoogleIntegrationId,
  ])

  const handleSetPrimaryGoogleAccount = async (integrationId: string): Promise<void> => {
    try {
      setIsUpdatingGoogleIntegrationId(integrationId)
      const res = await calendarApi.updateGoogleIntegrationSettings(integrationId, {
        isPrimarySyncAccount: true,
      })
      applyGoogleIntegrationsPayload(res.data)
      showToast('Đã đặt Gmail làm tài khoản đồng bộ chính.', 'success')
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError ? err.message : 'Không thể cập nhật Gmail đồng bộ chính.',
        'error',
      )
    } finally {
      setIsUpdatingGoogleIntegrationId(null)
    }
  }

  const handleToggleSyncToGoogle = async (
    integrationId: string,
    enabled: boolean,
  ): Promise<void> => {
    try {
      setIsUpdatingGoogleIntegrationId(integrationId)
      const res = await calendarApi.updateGoogleIntegrationSettings(integrationId, {
        syncToGoogleEnabled: enabled,
      })
      applyGoogleIntegrationsPayload(res.data)
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError
          ? err.message
          : 'Không thể cập nhật đồng bộ EduTrack lên Google.',
        'error',
      )
    } finally {
      setIsUpdatingGoogleIntegrationId(null)
    }
  }

  const handleToggleSyncFromGoogle = async (
    integrationId: string,
    enabled: boolean,
  ): Promise<void> => {
    try {
      setIsUpdatingGoogleIntegrationId(integrationId)
      const res = await calendarApi.updateGoogleIntegrationSettings(integrationId, {
        syncFromGoogleEnabled: enabled,
      })
      applyGoogleIntegrationsPayload(res.data)
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError
          ? err.message
          : 'Không thể cập nhật đồng bộ Google về EduTrack.',
        'error',
      )
    } finally {
      setIsUpdatingGoogleIntegrationId(null)
    }
  }

  const handleRefreshGoogleCalendars = async (integrationId: string): Promise<void> => {
    try {
      setIsRefreshingGoogleCalendars(true)
      const res = await calendarApi.refreshGoogleCalendars(integrationId)
      applyGoogleIntegrationsPayload(res.data)
      showToast('Đã tải lại danh sách lịch từ Google.', 'success')
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError ? err.message : 'Không thể tải danh sách lịch từ Google.',
        'error',
      )
    } finally {
      setIsRefreshingGoogleCalendars(false)
    }
  }

  const handleSaveGoogleCalendarSelection = async (
    integrationId: string,
    selectedCalendarIds: string[],
    removedActions: Array<{ calendarConnectionId: string; action: 'keep' | 'delete' }>,
  ): Promise<boolean> => {
    try {
      setIsSavingGoogleCalendarSelection(true)
      const res = await calendarApi.updateGoogleCalendarSelection(integrationId, {
        selectedCalendarIds,
        removedActions,
      })
      applyGoogleIntegrationsPayload(res.data)
      setSelectingCalendarsIntegrationId(null)
      showToast(
        'Đã lưu danh sách Google Calendar đồng bộ. Hệ thống đang đồng bộ nền cho các lịch mới.',
        'success',
      )
      await fetchData(true)
      return true
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError ? err.message : 'Không thể lưu lựa chọn Google Calendar.',
        'error',
      )
      return false
    } finally {
      setIsSavingGoogleCalendarSelection(false)
    }
  }

  const handleToggleGoogleCalendarVisibility = async (
    calendarConnectionId: string,
    isVisible: boolean,
  ) => {
    try {
      const res = await calendarApi.toggleGoogleCalendarVisibility(calendarConnectionId, isVisible)
      applyGoogleIntegrationsPayload(res.data)
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError ? err.message : t('calendar.google.visibilityError'),
        'error',
      )
    }
  }

  const handleRetryGoogleSyncJob = async (jobId: string) => {
    try {
      const res = await calendarApi.retryGoogleSyncJob(jobId)
      applyGoogleIntegrationsPayload(res.data)
      showToast('Đã đưa tác vụ vào hàng đợi chạy lại.', 'info')
      await fetchData(true)
    } catch (err: unknown) {
      showToast(
        err instanceof ApiError ? err.message : 'Không thể thử lại tác vụ đồng bộ.',
        'error',
      )
    }
  }

  const handleConfirmUnlinkGoogle = async () => {
    if (!unlinkingIntegration) return
    try {
      setIsUnlinkingGoogle(true)
      const res = await calendarApi.unlinkGoogleIntegration(unlinkingIntegration.id)
      applyGoogleIntegrationsPayload(res.data)
      setSelectingCalendarsIntegrationId((current) =>
        current === unlinkingIntegration.id ? null : current,
      )
      setUnlinkingIntegration(null)
      const conflictRes = await calendarApi.getGoogleConflicts().catch(() => null)
      setGoogleConflicts(conflictRes?.data?.conflicts ?? [])
      const legacy = res.data?.revocation === 'legacy_local_only'
      showToast(
        res.message || t(legacy ? 'calendar.google.legacyUnlink' : 'calendar.google.unlinked'),
        legacy ? 'warning' : 'success',
      )
      await fetchData(true)
    } catch (err: unknown) {
      await fetchData(true)
      showToast(
        err instanceof ApiError ? err.message : 'Không thể hủy liên kết tài khoản Google.',
        'error',
      )
    } finally {
      setIsUnlinkingGoogle(false)
    }
  }

  const handleResolveGoogleConflict = async (
    conflictId: string,
    payload: { choice?: 'local' | 'google'; fieldChoices?: Record<string, 'local' | 'google'> },
  ) => {
    const targetConflict = googleConflicts.find((item) => item.id === conflictId)
    if (!targetConflict) return
    try {
      setResolvingConflictId(conflictId)
      const res = await calendarApi.resolveGoogleConflict(conflictId, payload)
      const remaining = res.data?.conflicts ?? []
      setGoogleConflicts(remaining)
      applyGoogleIntegrationsPayload(res.data)
      await fetchData(true)
      showToast('Đã xử lý xung đột dữ liệu thành công.', 'success')
      if (remaining.length === 0) {
        setIsConflictModalOpen(false)
      }
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        (err.code === 'CONFLICT_VERSION_CHANGED' || err.code === 'GOOGLE_CALENDAR_CONFLICT_STALE')
      ) {
        const latest = await calendarApi.getGoogleConflicts().catch(() => null)
        if (latest?.data) setGoogleConflicts(latest.data.conflicts)
      } else if (err instanceof ApiError && err.code === 'GOOGLE_CALENDAR_RETRY_REQUIRED') {
        await fetchData(true)
      } else if (err instanceof ApiError && err.code === 'GOOGLE_CALENDAR_REAUTH_REQUIRED') {
        setIsConflictModalOpen(false)
        await fetchData(true)
      }
      showToast(
        err instanceof ApiError ? err.message : 'Không thể xử lý xung đột dữ liệu.',
        'error',
      )
    } finally {
      setResolvingConflictId(null)
    }
  }

  useEffect(() => {
    const googleSyncSuccess = searchParams.get('googleSyncSuccess')
    const googleSyncError = searchParams.get('googleSyncError')
    const integrationId = searchParams.get('integrationId')
    const feedback = resolveGoogleSyncRedirectFeedback({
      googleSyncSuccess,
      googleSyncError,
      integrationId,
    })
    if (!feedback) return

    const timer = window.setTimeout(() => {
      showToast(feedback.message, feedback.type)
      if (feedback.openConflicts) {
        setIsConflictModalOpen(true)
      }
      if (feedback.openCalendarSelectionIntegrationId) {
        setSelectingCalendarsIntegrationId(feedback.openCalendarSelectionIntegrationId)
      }
      void fetchData(true)

      const next = new URLSearchParams(searchParams)
      next.delete('googleSyncSuccess')
      next.delete('googleSyncError')
      next.delete('integrationId')
      setSearchParams(next, { replace: true })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchData, searchParams, setSearchParams, showToast])

  const hasActiveSyncJobs =
    googleIntegrations.some((acc) =>
      acc.calendars.some(
        (cal) =>
          cal.syncStatus === 'initial_sync_pending' || cal.syncStatus === 'initial_sync_running',
      ),
    ) ||
    googleSyncJobs.some(
      (job) => job.status === 'pending' || job.status === 'running' || job.status === 'retry_wait',
    )

  useEffect(() => {
    if (!hasActiveSyncJobs) return
    const pollTimer = window.setInterval(() => {
      void fetchData(true)
    }, 2000)
    return () => window.clearInterval(pollTimer)
  }, [fetchData, hasActiveSyncJobs])

  const hasConnectedGooglePull = googleIntegrations.some(
    (acc) => acc.status === 'connected' && acc.syncFromGoogleEnabled,
  )

  useEffect(() => {
    if (!hasConnectedGooglePull) return

    let debounceTimer: number | undefined
    const scheduleSilentRefresh = () => {
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer)
      }
      debounceTimer = window.setTimeout(() => {
        lastAutoSyncTriggerRef.current = Date.now()
        void fetchData(true)
      }, 350)
    }

    const stream =
      typeof window !== 'undefined' && 'EventSource' in window
        ? new EventSource(calendarApi.getGoogleSyncStreamUrl(), { withCredentials: true })
        : null

    stream?.addEventListener('google-calendar-synced', scheduleSilentRefresh)

    const handleFocus = () => {
      if (Date.now() - lastAutoSyncTriggerRef.current > 90_000) {
        lastAutoSyncTriggerRef.current = Date.now()
        void fetchData(true)
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer)
      }
      stream?.removeEventListener('google-calendar-synced', scheduleSilentRefresh)
      stream?.close()
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchData, hasConnectedGooglePull])

  const selectingCalendarsIntegration =
    googleIntegrations.find((item) => item.id === selectingCalendarsIntegrationId) ?? null

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
    isGoogleConfigured,
    googleIntegrations,
    googleSyncJobs,
    googleConflicts,
    syncingGoogleIntegrationId,
    isSyncingAllGoogle,
    isUpdatingGoogleIntegrationId,
    isRefreshingGoogleCalendars,
    isSavingGoogleCalendarSelection,
    isUnlinkingGoogle,
    resolvingConflictId,
    isConflictModalOpen,
    setIsConflictModalOpen,
    selectingCalendarsIntegration,
    setSelectingCalendarsIntegrationId,
    unlinkingIntegration,
    setUnlinkingIntegration,
    handleStartGoogleSyncLink,
    handleSyncGoogleIntegration,
    handleSyncAllGoogleIntegrations,
    handleSetPrimaryGoogleAccount,
    handleToggleSyncToGoogle,
    handleToggleSyncFromGoogle,
    handleRefreshGoogleCalendars,
    handleSaveGoogleCalendarSelection,
    handleToggleGoogleCalendarVisibility,
    handleRetryGoogleSyncJob,
    handleConfirmUnlinkGoogle,
    handleResolveGoogleConflict,
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
