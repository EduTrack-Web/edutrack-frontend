import { API_BASE_URL, request } from '@/shared/api/httpClient'
import type { ApiSuccess } from '@/modules/auth/models/AuthUser'
import type {
  CalendarCategory,
  CalendarEvent,
  CalendarPreferences,
  CreateCategoryInput,
  CreateEventInput,
  EventQueryFilters,
  GoogleCalendarConflictItem,
  GoogleIntegrationsPayload,
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

  deleteEvent: (
    eventId: string,
    mode?: 'this' | 'following' | 'all',
    date?: string,
    googleDeleteScope?: 'local_only' | 'both',
  ) => {
    const params = new URLSearchParams()
    if (mode) params.set('mode', mode)
    if (date) params.set('date', date)
    if (googleDeleteScope) params.set('googleDeleteScope', googleDeleteScope)
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

  resolveGuest: (identifier: string) =>
    request<ApiSuccess<{ email: string; fullName: string }>>('/calendar/guests/resolve', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  leaveEvent: (eventId: string) =>
    request<ApiSuccess<null>>(`/calendar/events/${eventId}/attendees/me`, {
      method: 'DELETE',
    }),

  getGoogleSyncStreamUrl: () => `${API_BASE_URL}/calendar/google/stream`,

  createGoogleAuthorization: (options?: { mode?: 'add' | 'reconnect'; integrationId?: string }) =>
    request<ApiSuccess<{ authorizationUrl: string }>>('/calendar/google/authorizations', {
      method: 'POST',
      body: JSON.stringify(options ?? { mode: 'add' }),
    }),

  getGoogleIntegrations: () =>
    request<ApiSuccess<GoogleIntegrationsPayload>>('/calendar/google/integrations'),

  updateGoogleIntegrationSettings: (
    integrationId: string,
    payload: {
      isPrimarySyncAccount?: boolean
      syncToGoogleEnabled?: boolean
      syncFromGoogleEnabled?: boolean
    },
  ) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(
      `/calendar/google/integrations/${integrationId}/settings`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  refreshGoogleCalendars: (integrationId: string) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(
      `/calendar/google/integrations/${integrationId}/calendars/refresh`,
      {
        method: 'POST',
      },
    ),

  updateGoogleCalendarSelection: (
    integrationId: string,
    payload: {
      selectedCalendarIds: string[]
      removedActions?: Array<{ calendarConnectionId: string; action: 'keep' | 'delete' }>
    },
  ) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(
      `/calendar/google/integrations/${integrationId}/calendars/selection`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),

  syncGoogleIntegration: (integrationId: string) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(
      `/calendar/google/integrations/${integrationId}/sync`,
      {
        method: 'POST',
      },
    ),

  unlinkGoogleIntegration: (integrationId: string) =>
    request<
      ApiSuccess<GoogleIntegrationsPayload & { revocation?: 'confirmed' | 'legacy_local_only' }>
    >(`/calendar/google/integrations/${integrationId}`, {
      method: 'DELETE',
    }),

  toggleGoogleCalendarVisibility: (calendarConnectionId: string, isVisible: boolean) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(
      `/calendar/google/calendars/${calendarConnectionId}/visibility`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isVisible }),
      },
    ),

  syncSingleGoogleCalendar: (calendarConnectionId: string) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(
      `/calendar/google/calendars/${calendarConnectionId}/sync`,
      {
        method: 'POST',
      },
    ),

  retryGoogleSyncJob: (jobId: string) =>
    request<ApiSuccess<GoogleIntegrationsPayload>>(`/calendar/google/jobs/${jobId}/retry`, {
      method: 'POST',
    }),

  getGoogleConflicts: () =>
    request<ApiSuccess<{ conflicts: GoogleCalendarConflictItem[] }>>('/calendar/google/conflicts'),

  resolveGoogleConflict: (
    conflictId: string,
    payload: {
      choice?: 'local' | 'google'
      fieldChoices?: Record<string, 'local' | 'google'>
    },
  ) =>
    request<
      ApiSuccess<GoogleIntegrationsPayload & { conflicts: GoogleCalendarConflictItem[] }>
    >(`/calendar/google/conflicts/${conflictId}/resolution`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  leaveCategory: (categoryId: string) =>
    request<ApiSuccess<null>>(`/calendar/categories/${categoryId}/members/me`, {
      method: 'DELETE',
    }),

  enableEventShare: (eventId: string, regenerate = false) =>
    request<ApiSuccess<{ shareToken: string; isShareEnabled: boolean }>>(`/calendar/events/${eventId}/share`, {
      method: 'POST',
      body: JSON.stringify({ regenerate }),
    }),

  revokeEventShare: (eventId: string) =>
    request<ApiSuccess<null>>(`/calendar/events/${eventId}/share`, {
      method: 'DELETE',
    }),

  getSharedEvent: (shareToken: string) =>
    request<ApiSuccess<{ event: import('../models/calendar.types').SharedEventPreview }>>(
      `/calendar/shared/${encodeURIComponent(shareToken)}`,
    ),

  requestJoinSharedEvent: (shareToken: string, message = '') =>
    request<ApiSuccess<{ requestId: string }>>(
      `/calendar/shared/${encodeURIComponent(shareToken)}/join-requests`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      },
    ),

  cancelJoinRequest: (shareToken: string) =>
    request<ApiSuccess<null>>(`/calendar/shared/${encodeURIComponent(shareToken)}/join-requests/me`, {
      method: 'DELETE',
    }),

  respondJoinRequest: (eventId: string, requestId: string, decision: 'approved' | 'rejected') =>
    request<ApiSuccess<{ event: CalendarEvent }>>(
      `/calendar/events/${eventId}/join-requests/${requestId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      },
    ),

  regeneratePublicToken: (categoryId: string) =>
    request<ApiSuccess<{ publicToken: string }>>(`/calendar/categories/${categoryId}/public-token`, {
      method: 'POST',
    }),

  getPublicCalendar: (publicToken: string) =>
    request<
      ApiSuccess<{
        category: {
          id: string
          name: string
          color: string
          description: string
          timeZone: string
          ownerName: string
        }
        events: Array<{
          id: string
          title: string
          description: string
          startDate: string
          endDate: string
          isAllDay: boolean
          location: string
          onlineMeetingUrl: string
          color: string
          timeZone?: string
          recurrence?: import('../models/calendar.types').RecurrenceConfig
          exceptionDates: string[]
          isMaskedBusy: boolean
        }>
      }>
    >(`/calendar/public/${encodeURIComponent(publicToken)}`),

  exportPublicCalendarIcs: async (publicToken: string) => {
    const res = await fetch(`${API_BASE_URL}/calendar/public/${encodeURIComponent(publicToken)}/export-file`)
    if (!res.ok) throw new Error('Không thể xuất file .ics')
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    const filename = match?.[1] ?? 'public-calendar.ics'
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  subscribePublicCalendar: (publicToken: string) =>
    request<ApiSuccess<null>>(`/calendar/public/${encodeURIComponent(publicToken)}/subscribe`, {
      method: 'POST',
    }),

  unsubscribePublicCalendar: (categoryId: string) =>
    request<ApiSuccess<null>>(`/calendar/categories/${categoryId}/subscription`, {
      method: 'DELETE',
    }),
}
