import { request } from '../../../shared/api/httpClient'
import type { ApiSuccess } from '../../auth/models/AuthUser'
import type {
  CalendarCategory,
  CalendarEvent,
  CreateCategoryInput,
  CreateEventInput,
  EventQueryFilters,
  UpdateCategoryInput,
  UpdateEventInput,
} from '../models/calendar.types'

export const calendarApi = {
  // CATEGORY APIS (LỊCH CỦA TÔI)
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

  // EVENT APIS
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

  deleteEvent: (eventId: string) =>
    request<ApiSuccess<null>>(`/calendar/events/${eventId}`, {
      method: 'DELETE',
    }),

  toggleTaskComplete: (eventId: string, isCompleted: boolean) =>
    request<ApiSuccess<{ event: CalendarEvent }>>(`/calendar/events/${eventId}/toggle-complete`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }),
}
