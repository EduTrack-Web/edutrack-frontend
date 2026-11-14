import { useCallback, useEffect, useState } from 'react'
import type { CalendarCategory, CalendarEvent, EntryType } from '../models/calendar.types'
import { calendarApi } from '../services/calendarApi'

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'list'

export function useCalendarViewModel() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<CalendarCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 5 Chế độ xem: Ngày, Tuần, Tháng, Năm, Danh sách
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')

  // Filter Tabs: 'all' | 'event' | 'task'
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | EntryType>('all')

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CalendarCategory | null>(null)

  // Fetch Categories & Events
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [catRes, evRes] = await Promise.all([
        calendarApi.getCategories(),
        calendarApi.getEvents(),
      ])

      const fetchedCats = catRes.data?.categories ?? []
      setCategories(fetchedCats)

      // Mặc định chọn các category đang có `isVisible !== false`
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

  // Toggle ẩn / hiện Lịch
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

  // Chỉ hiển thị duy nhất 1 lịch
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

  // Hiển thị tất cả các lịch
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

  // Đổi màu nhanh cho Lịch
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

  // Delete Category
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

  // Điều hướng thông minh theo từng chế độ Ngày, Tuần, Tháng, Năm
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
      // month & list
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
      // month & list
      return new Date(d.getFullYear(), d.getMonth() + 1, 1)
    })
  }

  const handleSelectDate = (date: Date) => {
    setCurrentDate(date)
  }

  // Open modals
  const handleOpenCreateEvent = (forDate?: Date) => {
    setEditingEvent(null)
    setSelectedModalDate(forDate ?? currentDate)
    setIsEventModalOpen(true)
  }

  const handleOpenEditEvent = (event: CalendarEvent) => {
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

  // Toggle complete task
  const handleToggleComplete = async (eventId: string, currentStatus: boolean) => {
    try {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, isCompleted: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : null }
            : e,
        ),
      )
      await calendarApi.toggleTaskComplete(eventId, !currentStatus)
    } catch (err) {
      console.error('Lỗi khi toggle task:', err)
      fetchData()
    }
  }

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này?')) return
    try {
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      await calendarApi.deleteEvent(eventId)
    } catch (err) {
      console.error('Lỗi khi xóa sự kiện:', err)
      fetchData()
    }
  }

  // Filter events based on selected categories (Checkbox Ẩn / Hiện) & active tab
  const displayedEvents = events.filter((e) => {
    if (e.calendarId && !selectedCategoryIds.includes(e.calendarId)) {
      return false
    }
    if (activeFilterTab !== 'all' && e.entryType !== activeFilterTab) {
      return false
    }
    return true
  })

  // Format tiêu đề ngày/tuần/tháng/năm
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
    // Modals
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
