import { request } from '@/shared/api/httpClient'
import type { ApiSuccess } from '@/modules/auth/models/AuthUser'
import type {
  CalendarCategory,
  CalendarEvent,
  CreateCategoryInput,
  CreateEventInput,
  EventQueryFilters,
  UpdateCategoryInput,
  UpdateEventInput,
} from '@/modules/calendar/models/calendar.types'

export const calendarApi = {
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
    request<ApiSuccess<{ categories: CalendarCategory[] }>>(`/calendar/categories/${categoryId}/only`, {
      method: 'PATCH',
    }),

  setAllCategoriesVisibility: (isVisible = true) =>
    request<ApiSuccess<{ categories: CalendarCategory[] }>>('/calendar/categories/visibility/all', {
      method: 'PATCH',
      body: JSON.stringify({ isVisible }),
    }),

  deleteCategory: (categoryId: string) =>
    request<ApiSuccess<null>>(`/calendar/categories/${categoryId}`, {
      method: 'DELETE',
    }),

  exportCategoryIcs: async (categoryId: string) => {
    const res = await fetch(`/v1/api/calendar/categories/${categoryId}/export`, {
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
    request<ApiSuccess<{ importedCount: number }>>(`/calendar/categories/${categoryId}/import`, {
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

  updateEvent: (eventId: string, payload: UpdateEventInput) =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteEvent: (eventId: string, mode?: 'this' | 'following' | 'all', date?: string) => {
    const params = new URLSearchParams()
    if (mode) params.set('mode', mode)
    if (date) params.set('date', date)
    const suffix = params.size > 0 ? `?${params.toString()}` : ''
    return request<ApiSuccess<null>>(`/calendar/events/${eventId}${suffix}`, {
      method: 'DELETE',
    })
  },

  toggleTaskComplete: (eventId: string, isCompleted: boolean) =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}/toggle-complete`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }),

  respondInvite: (eventId: string, status: 'accepted' | 'declined') =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}/respond-invite`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  leaveEvent: (eventId: string) =>
    request<ApiSuccess<null>>(`/calendar/events/${eventId}/leave`, {
      method: 'POST',
    }),
}
