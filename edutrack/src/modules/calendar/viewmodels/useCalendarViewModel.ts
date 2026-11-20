import { useCallback, useEffect, useState } from 'react'
import type { CalendarCategory, CalendarEvent, EntryType } from '@/modules/calendar/models/calendar.types'
import { calendarApi } from '@/modules/calendar/services/calendarApi'
import { expandAllRecurringEvents } from '@/modules/calendar/utils/recurrenceExpander'

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'list'

export function useCalendarViewModel() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<CalendarCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | EntryType>('all')

  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CalendarCategory | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [catRes, evRes] = await Promise.all([
        calendarApi.getCategories(),
        calendarApi.getEvents(),
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
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu lịch:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (active) void fetchData()
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
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
      fetchData()
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
            ? { ...e, calendar: e.calendar ? { ...e.calendar, color } : null }
            : e,
        ),
      )
      await calendarApi.updateCategory(categoryId, { color })
    } catch (err) {
      console.error('Lỗi khi đổi màu lịch:', err)
      fetchData()
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch này? Các sự kiện sẽ được tách ra.')) return
    try {
      await calendarApi.deleteCategory(categoryId)
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId))
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      fetchData()
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
    if (eventWithMeta._isOccurrence && eventWithMeta._baseEventId) {
      const baseEvent = events.find((e) => e.id === eventWithMeta._baseEventId)
      if (baseEvent) {
        setEditingEvent(baseEvent)
        setSelectedModalDate(null)
        setIsEventModalOpen(true)
        return
      }
    }
    setEditingEvent(event)
    setSelectedModalDate(null)
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

  const handleToggleComplete = async (eventId: string, currentStatus: boolean) => {
    const baseId = resolveBaseEventId(eventId)
    try {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === baseId
            ? { ...e, isCompleted: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : null }
            : e,
        ),
      )
      await calendarApi.toggleTaskComplete(baseId, !currentStatus)
    } catch (err) {
      console.error('Lỗi khi toggle task:', err)
      fetchData()
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const baseId = resolveBaseEventId(eventId)
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này?')) return
    try {
      setEvents((prev) => prev.filter((e) => e.id !== baseId))
      await calendarApi.deleteEvent(baseId)
    } catch (err) {
      console.error('Lỗi khi xóa sự kiện:', err)
      fetchData()
    }
  }

  const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1)
  const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 31, 23, 59, 59)
  const expandedEvents = expandAllRecurringEvents(events, windowStart, windowEnd)

  const archivedIds = new Set(categories.filter((category) => category.settings?.archived).map((category) => category.id))
  const displayedEvents = expandedEvents.filter((e) => {
    if (e.calendarId && archivedIds.has(e.calendarId)) return false
    if (e.calendarId && !selectedCategoryIds.includes(e.calendarId)) {
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
        weekday: 'long',
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

  return {
    categories,
    selectedCategoryIds,
    events: displayedEvents,
    allEventsCount: events.length,
    isLoading,
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
    refreshData: fetchData,
  }
}
