import { API_BASE_URL, request } from '@/shared/api/httpClient'
import type { ApiSuccess } from '@/modules/auth/models/AuthUser'
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarPreferences,
  CreateCategoryInput,
  CreateEventInput,
  EventQueryFilters,
  UpdateCategoryInput,
  UpdateEventInput,
  VietnameseHolidayItem,
  VietnameseLunarDate,
} from '@/modules/calendar/models/calendar.types'

export const calendarApi = {
  getPreferences: () =>
    request<ApiSuccess<{ preferences: CalendarPreferences }>>('/calendar/preferences'),

  updatePreferences: (payload: Partial<CalendarPreferences>) =>
    request<ApiSuccess<{ preferences: CalendarPreferences }>>('/calendar/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getLunarDates: (from: string, to: string) => {
    const search = new URLSearchParams({ from, to })
    return request<ApiSuccess<{
      dates: VietnameseLunarDate[]
      timeZone: 'Asia/Ho_Chi_Minh'
      timeZoneOffset: 7 | 8
    }>>(`/calendar/lunar-dates?${search.toString()}`)
  },

  getHolidays: (from: string, to: string) => {
    const search = new URLSearchParams({ from, to })
    return request<ApiSuccess<{
      holidays: VietnameseHolidayItem[]
    }>>(`/calendar/holidays?${search.toString()}`)
  },

  getCategories: () => request<ApiSuccess<{ categories: CalendarCategory[] }>>('/calendar/categories'),

  createCategory: (payload: CreateCategoryInput) =>
    request<ApiSuccess<{ category: CalendarCategory }>>('/calendar/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (categoryId: string, payload: UpdateCategoryInput) =>
    request<ApiSuccess<{ category: CalendarCategory }>>(`/calendar/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  toggleCategoryVisibility: (categoryId: string, isVisible: boolean) =>
    request<ApiSuccess<{ category: CalendarCategory }>>(`/calendar/categories/${categoryId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isVisible }),
    }),

  setOnlyCategoryVisible: (categoryId: string) =>
    request<ApiSuccess<{ categories: CalendarCategory[] }>>(`/calendar/categories/${categoryId}/visibility-selection`, {
      method: 'PUT',
    }),

  setAllCategoriesVisibility: (isVisible = true) =>
    request<ApiSuccess<{ categories: CalendarCategory[] }>>('/calendar/category-visibility', {
      method: 'PUT',
      body: JSON.stringify({ isVisible }),
    }),

  deleteCategory: (categoryId: string) =>
    request<ApiSuccess<null>>(`/calendar/categories/${categoryId}`, {
      method: 'DELETE',
    }),

  exportCategoryIcs: async (categoryId: string) => {
    const res = await fetch(`${API_BASE_URL}/calendar/categories/${categoryId}/export-file`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Không thể xuất file lịch')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calendar-${categoryId}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },

  importCategoryIcs: (categoryId: string, icsContent: string) =>
    request<ApiSuccess<{ importedCount: number }>>(`/calendar/categories/${categoryId}/imports`, {
      method: 'POST',
      body: JSON.stringify({ icsContent }),
    }),

  getEvents: (filters: EventQueryFilters = {}) => {
    const search = new URLSearchParams()
    if (filters.from) search.set('from', filters.from)
    if (filters.to) search.set('to', filters.to)
    if (filters.entryType) search.set('entryType', filters.entryType)
    if (filters.calendarId) search.set('calendarId', filters.calendarId)
    if (filters.calendarIds && filters.calendarIds.length > 0) {
      search.set('calendarIds', filters.calendarIds.join(','))
    }
    if (typeof filters.isCompleted === 'boolean') search.set('isCompleted', String(filters.isCompleted))
    if (filters.q?.trim()) search.set('q', filters.q.trim())

    const suffix = search.size > 0 ? `?${search.toString()}` : ''
    return request<ApiSuccess<{ events: CalendarEvent[] }>>(`/calendar/events${suffix}`)
  },

  getEventById: (eventId: string) =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}`),

  createEvent: (payload: CreateEventInput) =>
    request<ApiSuccess<{ event: CalendarEvent }>>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEvent: (eventId: string, payload: UpdateEventInput) => {
    const search = new URLSearchParams()
    if (payload.mode) search.set('mode', payload.mode)
    if (payload.targetDate) search.set('targetDate', payload.targetDate)
    const suffix = search.size > 0 ? `?${search.toString()}` : ''
    return request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}${suffix}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deleteEvent: (eventId: string, mode?: 'this' | 'following' | 'all', date?: string) => {
    const params = new URLSearchParams()
    if (mode) params.set('mode', mode)
    if (date) params.set('date', date)
    const suffix = params.size > 0 ? `?${params.toString()}` : ''
    return request<ApiSuccess<null>>(`/calendar/events/${eventId}${suffix}`, {
      method: 'DELETE',
    })
  },

  toggleTaskComplete: (
    eventId: string,
    isCompleted: boolean,
    mode?: 'this' | 'following' | 'all',
    targetDate?: string,
  ) =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}/completion`, {
      method: 'PATCH',
      body: JSON.stringify({
        isCompleted,
        ...(mode ? { mode } : {}),
        ...(targetDate ? { targetDate } : {}),
      }),
    }),

  respondInvite: (eventId: string, status: 'accepted' | 'declined') =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}/invitations/me`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  leaveEvent: (eventId: string) =>
    request<ApiSuccess<null>>(`/calendar/events/${eventId}/attendees/me`, {
      method: 'DELETE',
    }),
}
