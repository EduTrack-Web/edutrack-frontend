import { request } from '../../../shared/api/httpClient'
import type { ApiSuccess } from '../../auth/models/AuthUser'
import type { CalendarEvent, CreateEventInput } from '../models/calendar.types'

export const calendarApi = {
  getEvents: () => request<ApiSuccess<{ events: CalendarEvent[] }>>('/calendar/events'),
  createEvent: (payload: CreateEventInput) =>
    request<ApiSuccess<{ event: CalendarEvent }>>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

